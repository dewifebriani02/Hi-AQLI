"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Heart,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  verse_number: number;
  words: { text_uthmani?: string; translation?: { text?: string } }[];
  translations?: { text?: string }[];
}

interface Question {
  type: 'word_translation' | 'sentence_translation' | 'verse_number';
  questionText: string;
  subText?: string;
  correctAnswer: string;
  options: string[];
  verseData: Verse;
}

const mockSimulationLeaderboard = [
  { name: "Abdullah Mansur", time: "1:45", accuracy: 100, rank: 1, avatar: "https://picsum.photos/seed/user1/100/100" },
  { name: "Siti Aminah", time: "2:10", accuracy: 100, rank: 2, avatar: "https://picsum.photos/seed/user2/100/100" },
  { name: "Yusuf Ibrahim", time: "2:05", accuracy: 90, rank: 3, avatar: "https://picsum.photos/seed/user3/100/100" },
];

function buildUniqueOptions(correct: string, pool: string[], fallbacks: string[]): string[] {
  const unique = new Set<string>([correct]);
  for (const candidate of [...pool, ...fallbacks]) {
    const cleaned = (candidate || "").trim();
    if (cleaned && cleaned !== correct) {
      unique.add(cleaned);
    }
    if (unique.size >= 4) break;
  }
  return Array.from(unique).sort(() => Math.random() - 0.5);
}

export function PageExamSimulation({ page }: { page: number }) {
  const safePage = Number.isFinite(page) ? Math.min(604, Math.max(1, Math.floor(page))) : 1;
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [attempts, setAttempts] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function fetchVerses() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${safePage}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33`
        );
        if (!res.ok) throw new Error("Gagal memuat ayat halaman ini");
        const data = await res.json();
        const allVerses: Verse[] = Array.isArray(data?.verses) ? data.verses : [];

        const wordPool = allVerses
          .flatMap(v => v.words || [])
          .map(w => w.translation?.text || "")
          .filter(Boolean);

        const sentencePool = allVerses
          .map(v => (v.translations?.[0]?.text || "").replace(/<[^>]*>?/gm, "").trim())
          .filter(Boolean);

        const verseNumPool = allVerses
          .map(v => v.verse_key?.split(":")[1] || String(v.verse_number || ""))
          .filter(Boolean);

        const qs: Question[] = [];
        const shuffled = [...allVerses].sort(() => Math.random() - 0.5);

        shuffled.slice(0, 8).forEach((v, idx) => {
          const validWord = (v.words || []).find(w => w.text_uthmani && w.translation?.text);
          const cleanTrans = (v.translations?.[0]?.text || "").replace(/<[^>]*>?/gm, "").trim();
          const vNum = v.verse_key?.split(":")[1] || String(v.verse_number || "1");

          if (idx < 3 && validWord?.text_uthmani && validWord.translation?.text) {
            const ans = validWord.translation.text.trim();
            qs.push({
              type: "word_translation",
              questionText: validWord.text_uthmani,
              subText: "Apa arti kata ini?",
              correctAnswer: ans,
              options: buildUniqueOptions(ans, wordPool, ["Milik-Nya", "Sesungguhnya", "Dan Kami", "Petunjuk"]),
              verseData: v,
            });
          } else if (idx < 5 && cleanTrans) {
            qs.push({
              type: "sentence_translation",
              questionText: `Ayat ${v.verse_key}`,
              subText: "Apa arti ayat ini?",
              correctAnswer: cleanTrans,
              options: buildUniqueOptions(cleanTrans, sentencePool, [
                "Segala puji bagi Allah, Tuhan semesta alam.",
                "Tunjukilah kami jalan yang lurus.",
                "Hanya kepada Engkaulah kami menyembah dan memohon pertolongan.",
              ]),
              verseData: v,
            });
          } else if (v.text_uthmani) {
            qs.push({
              type: "verse_number",
              questionText: v.text_uthmani,
              subText: "Ayat nomor berapa ini?",
              correctAnswer: vNum,
              options: buildUniqueOptions(vNum, verseNumPool, ["3", "7", "12", "25"]),
              verseData: v,
            });
          }
        });

        if (!cancelled) {
          setQuestions(qs.sort(() => Math.random() - 0.5));
          setCurrentIdx(0);
          setScore(0);
          setIsFinished(false);
          setSelectedAnswer(null);
          setIsCorrect(null);
          setStartTime(Date.now());
        }
      } catch (e) {
        if (!cancelled) {
          toast({ variant: "destructive", title: "Error Memuat Data Simulasi" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVerses();
    return () => {
      cancelled = true;
    };
  }, [safePage, toast]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || !questions[currentIdx]) return;
    const isAnsCorrect = answer === questions[currentIdx].correctAnswer;
    setSelectedAnswer(answer);
    setIsCorrect(isAnsCorrect);
    if (isAnsCorrect) setScore(s => s + 1);

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setIsFinished(true);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-32 gap-4">
        <Loader2 className="animate-spin text-[#800000] h-10 w-10" />
        <p className="text-sm font-black uppercase tracking-widest text-[#800000]">Membangun Soal...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-6">
        <BookOpen className="w-14 h-14 mx-auto text-[#800000]/30" />
        <h2 className="text-xl font-black uppercase text-[#800000]">Soal Belum Tersedia</h2>
        <p className="text-sm text-muted-foreground">Data ayat untuk Halaman {safePage} tidak dapat dimuat saat ini.</p>
        <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black rounded-xl">
          <Link href="/tikrar">KEMBALI KE HI TIKRAR</Link>
        </Button>
      </div>
    );
  }

  if (isFinished) {
    const finalScore = Math.round((score / questions.length) * 100);
    const duration = Math.round((Date.now() - startTime) / 1000);
    return (
      <div className="max-w-md mx-auto py-10 flex flex-col gap-10 pb-32 px-4">
        <Card className="text-center border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-10 flex flex-col items-center gap-4 bg-[#800000] text-white border-b-4 border-[#D4AF37]">
            <Trophy className="w-20 h-20 text-[#D4AF37] animate-bounce" />
            <h2 className="text-2xl font-black font-headline uppercase tracking-widest">Hasil Simulasi</h2>
          </div>
          <CardContent className="pt-10 space-y-8">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted p-4 rounded-3xl border-2 border-dashed">
                <div className="text-2xl font-black text-[#800000]">{finalScore}%</div>
                <p className="text-[8px] font-black text-muted-foreground uppercase mt-1">Akurasi</p>
              </div>
              <div className="bg-muted p-4 rounded-3xl border-2 border-dashed">
                <div className="text-2xl font-black text-[#800000]">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</div>
                <p className="text-[8px] font-black text-muted-foreground uppercase mt-1">Durasi</p>
              </div>
              <div className="bg-muted p-4 rounded-3xl border-2 border-dashed">
                <div className="text-2xl font-black text-[#800000]">{attempts}</div>
                <p className="text-[8px] font-black text-muted-foreground uppercase mt-1">Percobaan</p>
              </div>
            </div>

            <Card className="border-2 border-[#800000]/10 bg-[#800000]/5 shadow-none overflow-hidden rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-black flex items-center justify-center font-black text-lg border-2 border-[#800000]">
                    {finalScore > 90 ? "1" : "12"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-[#800000] uppercase">Peringkat Ukhti</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Halaman {safePage} • Percobaan {attempts}</span>
                  </div>
                </div>
                <Badge className="bg-[#800000] text-white text-[10px] font-black">ALIM</Badge>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0">
            <Button asChild className="w-full bg-[#800000] text-white font-black h-14 rounded-2xl shadow-xl hover:bg-[#800000]/90 uppercase">
              <Link href="/tikrar">KEMBALI KE DASBOR TIKRAR</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setScore(0);
                setCurrentIdx(0);
                setIsFinished(false);
                setAttempts(a => a + 1);
                setStartTime(Date.now());
                setSelectedAnswer(null);
                setIsCorrect(null);
              }}
              className="w-full text-[#800000] font-black gap-2 uppercase text-xs hover:bg-[#800000]/5"
            >
              <RotateCcw className="w-4 h-4" /> ULANGI SIMULASI
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-4">
          <h3 className="text-sm font-black font-headline uppercase text-[#800000] flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" /> Papan Juara Halaman {safePage}
          </h3>
          <Card className="border-none shadow-lg bg-muted overflow-hidden">
            <div className="divide-y divide-[#800000]/5">
              {mockSimulationLeaderboard.map((u) => (
                <div key={u.name} className="flex items-center justify-between p-4 hover:bg-white transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={cn("text-[10px] font-black w-4 text-center", u.rank === 1 ? "text-[#D4AF37]" : "text-[#800000]")}>{u.rank}</span>
                    <Avatar className="h-10 w-10 border-2 border-white">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="bg-[#800000] text-white text-xs font-bold">{u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-black uppercase">{u.name}</span>
                      <span className="text-[9px] font-black text-[#800000] uppercase">{u.accuracy}% • {u.time}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toast({ title: "Terkirim", description: `Selamat dikirim ke ${u.name}` })} className="h-8 px-3 text-[10px] font-black gap-1.5 rounded-full text-[#800000] hover:bg-[#800000]/10">
                    <Heart className="w-3.5 h-3.5" /> Selamat
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 pb-32">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000] hover:bg-[#800000]/5">
          <Link href="/tikrar"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="text-center">
          <h1 className="text-sm font-black font-headline uppercase tracking-[0.2em] text-[#800000]">Simulasi Ujian</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Halaman {safePage}</p>
        </div>
        <Badge className="bg-[#800000] text-white h-8 px-3 font-black rounded-xl border-none">{score} / {questions.length}</Badge>
      </div>

      <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
        <CardHeader className="text-center pb-10 pt-14 bg-[#800000] text-white relative border-b-4 border-[#D4AF37]">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37] mb-4 opacity-70">{currentQ.subText}</div>
          <div className={cn("leading-relaxed font-black", currentQ.type === 'sentence_translation' ? "text-xl font-headline" : "text-4xl md:text-5xl font-arabic")} dir={currentQ.type === 'sentence_translation' ? "ltr" : "rtl"}>
            {currentQ.questionText}
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-10 grid grid-cols-1 gap-4">
          {currentQ.options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              disabled={!!selectedAnswer}
              onClick={() => handleAnswer(option)}
              className={cn(
                "h-auto py-6 text-lg font-bold transition-all border-2 bg-white rounded-2xl flex items-center justify-between px-6 gap-4 text-left whitespace-normal",
                selectedAnswer === option && isCorrect === true && "bg-[#D4AF37] border-[#D4AF37] text-black",
                selectedAnswer === option && isCorrect === false && "bg-[#800000] border-[#800000] text-white",
                selectedAnswer && option === currentQ.correctAnswer && isCorrect === false && "bg-[#D4AF37] border-[#D4AF37] text-black",
                !selectedAnswer && "hover:border-[#800000] hover:bg-muted"
              )}
            >
              <span className="flex-1 text-base">{option}</span>
              {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-6 h-6 text-black shrink-0" />}
              {selectedAnswer === option && isCorrect === false && <XCircle className="w-6 h-6 text-white shrink-0" />}
              {selectedAnswer && option === currentQ.correctAnswer && isCorrect === false && <CheckCircle2 className="w-6 h-6 text-black shrink-0" />}
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest italic">
        &ldquo;Barangsiapa yang menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju surga.&rdquo;
      </p>
    </div>
  );
}
