"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  ArrowRight,
  Trophy,
  BrainCircuit,
  Clock,
  Zap,
  Target,
  Languages,
  BookOpen,
  Heart,
  Star,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  verse_number: number;
  words: { text_uthmani: string; translation: { text: string } }[];
  translations: { text: string }[];
}

interface Question {
  type: 'word_translation' | 'sentence_translation' | 'verse_number' | 'fill_blank' | 'connect_verse';
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

export function PageExamSimulation({ page }: { page: number }) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [attempts, setAttempts] = useState(1);
  const [sentCongrats, setSentCongrats] = useState<string[]>([]);
  const { toast } = useToast();

  const generateQuestions = (allVerses: Verse[]) => {
    const qs: Question[] = [];
    const shuffled = [...allVerses].sort(() => Math.random() - 0.5);

    shuffled.slice(0, 8).forEach((v, idx) => {
      if (idx < 2) {
        const word = v.words[0];
        qs.push({ 
          type: 'word_translation', 
          questionText: word.text_uthmani, 
          subText: "Apa arti kata ini?", 
          correctAnswer: word.translation.text, 
          options: [word.translation.text, "Milik-Nya", "Sesungguhnya", "Dan Kami"].sort(() => Math.random() - 0.5), 
          verseData: v 
        });
      } else if (idx < 4) {
        const trans = v.translations[0].text.replace(/<[^>]*>?/gm, '');
        qs.push({ 
          type: 'sentence_translation', 
          questionText: `Ayat ${v.verse_key}`, 
          subText: "Apa arti ayat ini?", 
          correctAnswer: trans, 
          options: [trans, "Ini adalah terjemahan simulasi 1", "Ini adalah terjemahan simulasi 2", "Ini adalah terjemahan simulasi 3"].sort(() => Math.random() - 0.5), 
          verseData: v 
        });
      } else {
        const vNum = v.verse_key.split(':')[1];
        qs.push({ 
          type: 'verse_number', 
          questionText: v.text_uthmani, 
          subText: "Ayat nomor berapa ini?", 
          correctAnswer: vNum, 
          options: [vNum, "12", "45", "88"].sort(() => Math.random() - 0.5), 
          verseData: v 
        });
      }
    });
    setQuestions(qs.sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    async function fetchVerses() {
      setLoading(true);
      try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${page}?language=id&words=true&word_fields=text_uthmani&translations=33`);
        const data = await res.json();
        setVerses(data.verses);
        generateQuestions(data.verses);
      } catch (e) { 
        toast({ variant: "destructive", title: "Error Memuat Data" }); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchVerses();
  }, [page, toast]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
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

  if (loading) return (
    <div className="flex flex-col items-center py-32 gap-4">
      <Loader2 className="animate-spin text-[#800000] h-10 w-10" />
      <p className="text-sm font-black uppercase tracking-widest text-[#800000]">Membangun Soal...</p>
    </div>
  );

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
                <div className="text-2xl font-black text-[#800000]">{Math.floor(duration/60)}:{String(duration%60).padStart(2,'0')}</div>
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
                    <span className="text-sm font-black text-[#800000] uppercase">Peringkat Anda</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Halaman {page} • Percobaan {attempts}</span>
                  </div>
                </div>
                <Badge className="bg-[#800000] text-white text-[10px] font-black">ALIM</Badge>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0">
            <Button asChild className="w-full bg-[#800000] text-white font-black h-14 rounded-2xl shadow-xl hover:bg-[#800000]/90 uppercase">
              <Link href="/hafal">KEMBALI KE DASBOR</Link>
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
            <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" /> Papan Juara Halaman {page}
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
                  <Button size="sm" variant="ghost" onClick={() => toast({title: "Terkirim", description: `Selamat dikirim ke ${u.name}`})} className="h-8 px-3 text-[10px] font-black gap-1.5 rounded-full text-[#800000] hover:bg-[#800000]/10">
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
          <Link href="/hafal"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="text-center">
          <h1 className="text-sm font-black font-headline uppercase tracking-[0.2em] text-[#800000]">Simulasi Ujian</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Halaman {page}</p>
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
        "Barangsiapa yang menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju surga."
      </p>
    </div>
  );
}
