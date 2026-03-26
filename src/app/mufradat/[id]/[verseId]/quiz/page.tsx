'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Loader2, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Trophy,
  Star,
  Zap,
  Timer
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";

interface Question {
  arabic: string;
  correct: string;
  options: string[];
}

export default function MufradatQuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const verseId = params.verseId as string;
  const { user, isUserLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [totalTime, setTotalTime] = useState(0);

  const verseKey = `${id}:${verseId}`;

  // Auth Guard: Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    async function fetchQuestions() {
      if (!id || !verseId) return;
      try {
        setLoading(true);
        // Fetch verse words
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${id}:${verseId}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`
        );
        const data = await res.json();
        
        if (data && data.verse && data.verse.words) {
          const words = data.verse.words.filter((w: any) => w.char_type_name === 'word');
          
          // Simple "decoy" translations for multi-choice
          const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus"];
          
          const generated = words.map((w: any) => {
            const correct = w.translation?.text || "???";
            const filteredDecoys = decoys.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
            return {
              arabic: w.text_uthmani,
              correct: correct,
              options: [correct, ...filteredDecoys].sort(() => Math.random() - 0.5)
            };
          });
          
          setQuestions(generated);
        }
      } catch (err) {
        console.error("Quiz Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [id, verseId]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && user) {
      interval = setInterval(() => setTotalTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, user]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || isFinished) return;
    
    const currentQ = questions[currentIdx];
    const correct = answer === currentQ.correct;
    
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setIsFinished(true);
        saveAttempt(score + (correct ? 1 : 0));
      }
    }, 1000);
  };

  const saveAttempt = async (finalScore: number) => {
    if (!user) return;
    try {
      await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          quizId: `mufradat_${verseKey}`,
          surahId: id,
          verseId: verseId,
          score: finalScore,
          totalQuestions: questions.length,
          durationSeconds: totalTime,
          isPassed: finalScore === questions.length
        })
      });
    } catch (e) {
      console.error("Gagal simpan skor:", e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium text-sm uppercase tracking-widest">Menyiapkan Kuis...</p>
      </div>
    );
  }

  if (isFinished) {
    const isPerfect = score === questions.length;
    return (
      <div className="max-w-md mx-auto py-12 px-4 flex flex-col gap-6">
        <Card className="text-center border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className={cn(
            "p-10 flex flex-col items-center gap-4 text-white",
            isPerfect ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-800"
          )}>
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-black font-headline uppercase">{isPerfect ? "Masyallah!" : "Coba Lagi"}</h2>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Skor Akhir: {score} / {questions.length}</p>
          </div>
          <CardContent className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Waktu</p>
                 <p className="text-xl font-bold">{formatTime(totalTime)}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</p>
                 <p className="text-xl font-bold">{Math.round((score/questions.length)*100)}%</p>
               </div>
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-8 border-t">
            <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-6 rounded-xl shadow-lg">
              <Link href={`/mufradat/${id}`}>KEMBALI KE SURAH</Link>
            </Button>
            {!isPerfect && (
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full border-2 border-slate-200 font-bold py-6 rounded-xl hover:bg-slate-50">
                ULANGI LAGI
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 py-8 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/mufradat/${id}/${verseId}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Kuis Mufradat</h1>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Timer className="w-3 h-3" /> {formatTime(totalTime)}
          </div>
        </div>
        <div className="text-xs font-black text-[#800000]">{currentIdx + 1} / {questions.length}</div>
      </div>

      <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1.5 bg-slate-100 [&>div]:bg-[#D4AF37]" />

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
        <CardContent className="p-10 text-center bg-slate-50 flex flex-col items-center gap-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apa arti dari kata berikut?</p>
          <div className="text-5xl sm:text-6xl font-arabic text-[#800000]">{questions[currentIdx]?.arabic}</div>
        </CardContent>
        <CardContent className="p-6 sm:p-8 grid grid-cols-1 gap-3">
          {questions[currentIdx]?.options.map((opt, i) => (
            <Button
              key={i}
              variant="outline"
              disabled={!!selectedAnswer}
              onClick={() => handleAnswer(opt)}
              className={cn(
                "h-auto py-5 text-lg font-bold transition-all border-2 rounded-2xl justify-between px-6",
                selectedAnswer === opt && isCorrect === true && "bg-emerald-50 border-emerald-500 text-emerald-700",
                selectedAnswer === opt && isCorrect === false && "bg-rose-50 border-rose-500 text-rose-700",
                selectedAnswer && opt === questions[currentIdx].correct && isCorrect === false && "bg-emerald-50 border-emerald-500 text-emerald-700",
                !selectedAnswer && "hover:border-[#D4AF37] hover:bg-slate-50"
              )}
            >
              <span>{opt}</span>
              {selectedAnswer === opt && isCorrect === true && <CheckCircle2 className="w-5 h-5" />}
              {selectedAnswer === opt && isCorrect === false && <XCircle className="w-5 h-5" />}
              {selectedAnswer && opt === questions[currentIdx].correct && isCorrect === false && <CheckCircle2 className="w-5 h-5 opacity-50" />}
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground italic">
        Pilih jawaban yang paling tepat sesuai makna dalam ayat ini.
      </p>
    </div>
  );
}
