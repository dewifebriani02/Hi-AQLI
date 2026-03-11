
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
  HelpCircle,
  Clock,
  Zap,
  Target,
  Languages,
  BookOpen,
  Heart,
  Star,
  Timer,
  User
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

    // 1. Word Translation (2 Questions)
    shuffled.slice(0, 2).forEach(v => {
      const validWords = v.words.filter(w => w.text_uthmani && w.translation?.text);
      if (validWords.length === 0) return;
      
      const word = validWords[Math.floor(Math.random() * validWords.length)];
      
      const options = [word.translation.text];
      while (options.length < 4) {
        const randomVerse = allVerses[Math.floor(Math.random() * allVerses.length)];
        const randomWord = randomVerse.words[Math.floor(Math.random() * randomVerse.words.length)];
        if (randomWord.translation?.text && !options.includes(randomWord.translation.text)) {
          options.push(randomWord.translation.text);
        }
      }

      qs.push({
        type: 'word_translation',
        questionText: word.text_uthmani,
        subText: "Apa arti kata ini?",
        correctAnswer: word.translation.text,
        options: options.sort(() => Math.random() - 0.5),
        verseData: v
      });
    });

    // 2. Sentence Translation (2 Questions)
    shuffled.slice(2, 4).forEach(v => {
      const translation = v.translations[0]?.text.replace(/<[^>]*>?/gm, '') || "";
      if (!translation) return;

      const options = [translation];
      while (options.length < 4) {
        const randomVerse = allVerses[Math.floor(Math.random() * allVerses.length)];
        const randTrans = randomVerse.translations[0]?.text.replace(/<[^>]*>?/gm, '') || "";
        if (randTrans && !options.includes(randTrans)) options.push(randTrans);
      }

      qs.push({
        type: 'sentence_translation',
        questionText: `Ayat ${v.verse_key.split(':')[1]}`,
        subText: "Apa arti ayat ini?",
        correctAnswer: translation,
        options: options.sort(() => Math.random() - 0.5),
        verseData: v
      });
    });

    // 3. Verse Number (2 Questions)
    shuffled.slice(4, 6).forEach(v => {
      const vNum = v.verse_key.split(':')[1];
      const options = [vNum];
      while (options.length < 4) {
        const rand = (Math.floor(Math.random() * 100) + 1).toString();
        if (!options.includes(rand)) options.push(rand);
      }

      qs.push({
        type: 'verse_number',
        questionText: v.text_uthmani,
        subText: "Ayat nomor berapa ini?",
        correctAnswer: vNum,
        options: options.sort(() => Math.random() - 0.5),
        verseData: v
      });
    });

    // 4. Fill in the blank (2 Questions)
    shuffled.slice(6, 8).forEach(v => {
      const wordsCount = v.words.length;
      if (wordsCount < 4) return;
      const targetIdx = Math.floor(Math.random() * (wordsCount - 2)) + 1;
      const targetWord = v.words[targetIdx].text_uthmani;
      
      const before = v.words.slice(0, targetIdx).map(w => w.text_uthmani).join(" ");
      const after = v.words.slice(targetIdx + 1).map(w => w.text_uthmani).join(" ");

      const options = [targetWord];
      while (options.length < 4) {
        const randV = allVerses[Math.floor(Math.random() * allVerses.length)];
        const randW = randV.words[Math.floor(Math.random() * randV.words.length)].text_uthmani;
        if (randW && !options.includes(randW)) options.push(randW);
      }

      qs.push({
        type: 'fill_blank',
        questionText: `${before} ... ${after}`,
        subText: "Lengkapi potongan ayat di atas:",
        correctAnswer: targetWord,
        options: options.sort(() => Math.random() - 0.5),
        verseData: v
      });
    });

    setQuestions(qs.sort(() => Math.random() - 0.5));
  };

  const fetchVerses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`
      );
      if (!res.ok) throw new Error("Gagal memuat ayat");
      const data = await res.json();
      setVerses(data.verses);
      generateQuestions(data.verses);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat data simulasi." });
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    fetchVerses();
  }, [fetchVerses]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    
    const correct = questions[currentIdx].correctAnswer;
    const isAnsCorrect = answer === correct;
    
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

  const handleReset = () => {
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAttempts(prev => prev + 1);
    setStartTime(Date.now());
    generateQuestions(verses);
  };

  const handleSendCongrats = (userName: string) => {
    if (sentCongrats.includes(userName)) return;
    setSentCongrats(prev => [...prev, userName]);
    toast({
      title: "Ucapan Terkirim!",
      description: `Masyallah, ucapan selamat terkirim ke ${userName}.`,
    });
  };

  if (loading) return <div className="flex flex-col items-center py-32 gap-4"><Loader2 className="animate-spin text-[#800000]" /><p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Membangun Soal Simulasi...</p></div>;

  if (isFinished) {
    const finalScore = Math.round((score / questions.length) * 100);
    const duration = Math.round((Date.now() - startTime) / 1000);
    const isPassed = finalScore >= 80;
    
    // Simulate personal rank
    const myRank = finalScore === 100 ? 4 : finalScore >= 80 ? 12 : 25;

    return (
      <div className="max-w-md mx-auto py-10 flex flex-col gap-10 pb-32 px-4">
        <Card className="text-center border-none shadow-2xl overflow-hidden animate-in zoom-in duration-500">
          <div className={cn(
            "p-10 flex flex-col items-center gap-4 text-white transition-colors duration-500",
            isPassed ? "bg-emerald-600" : "bg-amber-500"
          )}>
            <Trophy className={cn("w-20 h-20", isPassed && "animate-bounce")} />
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-headline uppercase tracking-widest">
                {isPassed ? "Masyallah! Lulus" : "Belum Maksimal"}
              </h2>
              <p className="text-xs opacity-80 font-bold uppercase tracking-wider">Skor Simulasi Halaman {page}</p>
            </div>
          </div>
          <CardContent className="pt-10 space-y-8">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 p-4 rounded-3xl border-2 border-dashed">
                <div className="text-2xl font-black text-foreground">{finalScore}%</div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Akurasi</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-3xl border-2 border-dashed">
                <div className="text-2xl font-black text-foreground">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Durasi</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-3xl border-2 border-dashed">
                <div className="text-2xl font-black text-foreground">{attempts}</div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Percobaan</p>
              </div>
            </div>
            
            <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-3xl text-left space-y-2">
              <div className="flex items-center gap-2 text-[#800000] font-black text-xs uppercase tracking-widest">
                <BrainCircuit className="w-4 h-4" /> Evaluasi Pemahaman
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                {isPassed 
                  ? "Pemahaman makna dan hafalan Anda untuk halaman ini sudah sangat kuat. Anda siap untuk mengajukan Ujian Lisan resmi kepada Admin HI AQLI."
                  : "Coba ulangi repetisi Blok yang masih sulit dan pahami kembali terjemahan per kata sebelum mencoba simulasi lagi agar hasil lebih maksimal."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0">
            <Button asChild className="w-full bg-black text-white font-black h-14 rounded-2xl shadow-xl uppercase tracking-widest">
              <Link href="/tajweed">KEMBALI KE DASBOR</Link>
            </Button>
            <Button variant="ghost" onClick={handleReset} className="w-full text-[#800000] font-black gap-2 uppercase tracking-widest text-xs">
              <RotateCcw className="w-4 h-4" /> Ulangi Simulasi (Percobaan ke-{attempts + 1})
            </Button>
          </CardFooter>
        </Card>

        {/* PERSONAL RANK SUMMARY */}
        <Card className="border-2 border-[#800000]/10 bg-white shadow-lg mx-1 animate-in slide-in-from-bottom-4 duration-500 delay-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#800000] text-white flex items-center justify-center font-black text-lg shadow-lg shadow-[#800000]/20">
                {myRank}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-foreground">Peringkat Anda</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Halaman {page}</span>
              </div>
            </div>
            <div className="text-right">
               <span className="text-xs font-black text-[#800000] block">Percobaan ke-{attempts}</span>
               <span className="text-[9px] text-muted-foreground font-medium italic">Update: Hari ini</span>
            </div>
          </CardContent>
        </Card>

        {/* LEADERBOARD SECTION */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-current" />
              <h3 className="text-sm font-black font-headline uppercase tracking-widest text-[#800000]">Papan Juara Halaman {page}</h3>
            </div>
            <Badge variant="outline" className="text-[8px] font-black border-amber-200 text-amber-600 bg-amber-50">GLOBAL</Badge>
          </div>
          
          <Card className="border-none shadow-lg bg-muted/20 overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {mockSimulationLeaderboard.map((u) => (
                  <div key={u.name} className="flex items-center justify-between p-4 hover:bg-white/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-[10px] font-black w-4 text-center",
                        u.rank === 1 ? "text-amber-500" : "text-muted-foreground"
                      )}>{u.rank}</span>
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="bg-[#800000]/10 text-[#800000] text-xs font-bold">{u.name[0]}</AvatarFallback>
                        </Avatar>
                        {u.rank === 1 && (
                          <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                            <Star className="w-2 h-2 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-foreground">{u.name}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                             <Timer className="w-2.5 h-2.5" /> {u.time}
                           </span>
                           <span className="text-[9px] text-muted-foreground">•</span>
                           <span className="text-[9px] font-black text-emerald-600 uppercase">{u.accuracy}% Akurasi</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleSendCongrats(u.name)}
                        className={cn(
                          "h-8 px-3 text-[10px] font-black gap-1.5 transition-all rounded-full",
                          sentCongrats.includes(u.name) ? "text-rose-500 bg-rose-50 border border-rose-100" : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        <Heart className={cn("w-3.5 h-3.5", sentCongrats.includes(u.name) && "fill-current")} />
                        {sentCongrats.includes(u.name) ? "Terkirim" : "Selamat"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <p className="text-[10px] text-center text-muted-foreground font-medium italic">
            "Berlomba-lombalah kamu dalam kebaikan." (QS. Al-Baqarah: 148)
          </p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 pb-32">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
          <Link href="/tajweed"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="text-center">
          <h1 className="text-sm font-black font-headline uppercase tracking-[0.2em] text-[#800000]">Simulasi Ujian</h1>
          <p className="text-[10px] text-muted-foreground font-bold">Halaman {page} • Juz {Math.floor(page/20) + 1}</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 h-8 px-3 font-black rounded-xl shadow-sm">
          {score} / {questions.length}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">
          <span>Progress Soal</span>
          <span>{currentIdx + 1} / {questions.length}</span>
        </div>
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2 bg-muted [&>div]:bg-[#800000] rounded-full" />
      </div>

      <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="text-center pb-10 pt-14 bg-muted/10 relative">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white shadow-md border-2 border-white flex items-center justify-center mb-6">
            {currentQ.type === 'word_translation' && <Languages className="w-7 h-7 text-rose-500" />}
            {currentQ.type === 'sentence_translation' && <BookOpen className="w-7 h-7 text-blue-500" />}
            {currentQ.type === 'verse_number' && <Target className="w-7 h-7 text-amber-500" />}
            {currentQ.type === 'fill_blank' && <Zap className="w-7 h-7 text-indigo-500" />}
            {currentQ.type === 'connect_verse' && <BrainCircuit className="w-7 h-7 text-emerald-500" />}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-4 opacity-70">
            {currentQ.subText}
          </div>
          <div className={cn(
            "leading-relaxed text-[#800000] font-black",
            currentQ.type === 'sentence_translation' ? "text-xl font-headline" : "text-4xl md:text-5xl font-arabic"
          )} dir={currentQ.type === 'sentence_translation' ? "ltr" : "rtl"}>
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
                "h-auto py-6 text-lg font-bold transition-all border-2 bg-white ring-0 shadow-sm rounded-2xl flex items-center justify-between px-6 gap-4 text-left whitespace-normal",
                selectedAnswer === option && isCorrect === true && "bg-emerald-50 border-emerald-500 text-emerald-700",
                selectedAnswer === option && isCorrect === false && "bg-rose-50 border-rose-500 text-rose-700",
                selectedAnswer && option === currentQ.correctAnswer && isCorrect === false && "bg-emerald-50 border-emerald-500 text-emerald-700",
                !selectedAnswer && "hover:border-[#800000] hover:bg-[#800000]/5"
              )}
            >
              <span className={cn(
                "flex-1",
                currentQ.type === 'fill_blank' || currentQ.type === 'connect_verse' ? "font-arabic text-2xl text-right" : "text-base"
              )} dir={currentQ.type === 'fill_blank' || currentQ.type === 'connect_verse' ? "rtl" : "ltr"}>
                {option}
              </span>
              {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {selectedAnswer === option && isCorrect === false && <XCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {selectedAnswer && option === currentQ.correctAnswer && isCorrect === false && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
            </Button>
          ))}
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center gap-2 text-muted-foreground/40">
        <HelpCircle className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Simulasi Ujian Itqan HI AQLI</span>
      </div>
    </div>
  );
}
