'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Trophy,
  Star,
  Zap,
  Timer,
  ShieldCheck,
  Target
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { getPagesForJuz } from "@/lib/quran-mapping";

interface Question {
  id: number;
  arabic: string;
  correct: string;
  options: string[];
}

export default function MufradatJuzExamPage() {
  const params = useParams();
  const router = useRouter();
  const juzId = params.id as string;
  const juzNum = parseInt(juzId);
  const { user, isUserLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [wrongWords, setWrongWords] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState(1);

  const quizId = `mufradat_juz_exam_${juzNum}`;

  // Auth Guard
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const playSfx = useCallback((type: 'correct' | 'incorrect' | 'perfect' | 'fail') => {
    const soundUrls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      incorrect: 'https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3',
      perfect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      fail: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
    };
    try {
      const audio = new Audio(soundUrls[type]);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function fetchJuzQuestions() {
      if (!juzNum) return;
      try {
        setLoading(true);
        const pages = getPagesForJuz(juzNum);
        
        // Fetch all pages in Juz (this might be slow, but it's an exam)
        const allPagesPromises = pages.map(p => 
          fetch(`https://api.quran.com/api/v4/verses/by_page/${p}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`).then(r => r.json())
        );
        
        const allResults = await Promise.all(allPagesPromises);
        const allWords = allResults.flatMap(r => r.verses.flatMap((v: any) => v.words.filter((w: any) => w.char_type_name === 'word')));
        
        // Randomly select 100 words for the exam
        const shuffledWords = allWords.sort(() => Math.random() - 0.5).slice(0, 100);
        
        const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];
        
        const generated = shuffledWords.map((w: any) => {
          const correct = w.translation?.text || "???";
          const filteredDecoys = decoys.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
          return {
            id: w.id,
            arabic: w.text_uthmani,
            correct: correct,
            options: [correct, ...filteredDecoys].sort(() => Math.random() - 0.5)
          };
        });
        
        setQuestions(generated);
      } catch (err) {
        console.error("Exam Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchJuzQuestions();
  }, [juzNum]);

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
    
    if (correct) {
      playSfx('correct');
      setScore(s => s + 1);
    } else {
      playSfx('incorrect');
      setWrongWords(prev => [...prev, currentQ]);
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setIsFinished(true);
        const finalScore = score + (correct ? 1 : 0);
        if (finalScore === questions.length) playSfx('perfect');
        else if (finalScore >= 90) playSfx('perfect'); // 90% is a pass for exam
        else playSfx('fail');
        saveAttempt(finalScore);
      }
    }, 600); // Faster transition for 100 questions
  };

  const saveAttempt = async (finalScore: number) => {
    if (!user) return;
    try {
      await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: quizId,
          surah_id: "0",
          verse_id: "exam",
          juz_id: juzNum, // Need to handle juz_id in backend or reuse fields
          score: finalScore,
          total_questions: questions.length,
          duration_seconds: totalTime,
          is_passed: finalScore >= 90,
          wrong_words: wrongWords.map(w => w.id)
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

  const handleReset = () => {
    setCurrentIdx(0);
    setScore(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTotalTime(0);
    setWrongWords([]);
    setAttempts(prev => prev + 1);
  };

  if (loading || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest text-[#800000]">Menyiapkan Ujian Juz {juzNum} (100 Soal)...</p>
      </div>
    );
  }

  if (isFinished) {
    const isPassed = score >= 90;
    return (
      <div className="max-w-md mx-auto py-12 px-4 pb-32 flex flex-col gap-6 text-center">
        <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className={cn(
            "p-10 flex flex-col items-center gap-4 text-white relative overflow-hidden",
            isPassed ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-rose-900"
          )}>
            {isPassed && <Badge className="bg-white text-emerald-800 font-black">+100 POIN JUZ</Badge>}
            <Trophy className={cn("w-16 h-16", isPassed && "animate-bounce")} />
            <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">
              {isPassed ? "Masyallah Lulus!" : "Belum Lulus"}
            </h2>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
              Ujian Juz {juzNum} • {score} / 100
            </p>
          </div>
          <CardContent className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Durasi</p>
                 <p className="text-xl font-bold">{formatTime(totalTime)}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</p>
                 <p className="text-xl font-bold">{score}%</p>
               </div>
             </div>
             
             {!isPassed && (
               <p className="text-xs font-medium text-rose-600 bg-rose-50 p-4 rounded-xl">
                 Target kelulusan adalah 90 soal benar. Semangat, ulangi lagi untuk membuka Juz berikutnya!
               </p>
             )}
          </CardContent>
          {wrongWords.length > 0 && (
            <div className="px-8 pb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saran Review ({wrongWords.length})</span>
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2">
                {wrongWords.map((w, idx) => (
                  <div key={idx} className="bg-rose-50 p-3 rounded-xl flex items-center justify-between border border-rose-100 group hover:bg-rose-100 transition-colors">
                    <span className="text-2xl font-arabic text-[#800000]">{w.arabic}</span>
                    <span className="text-sm font-medium text-slate-700">{w.correct}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <CardFooter className="flex flex-col gap-3 p-8 border-t bg-slate-50/50">
            {isPassed ? (
              <>
                {juzNum < 30 ? (
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                    <Link href={`/mufradat`}>
                      MULAI JUZ BERIKUTNYA <ShieldCheck className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                    <Link href={`/mufradat`}>
                      KHATAM SEMPURNA! <Trophy className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={handleReset} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                 <RefreshCw className="w-4 h-4" /> ULANGI UJIAN
              </Button>
            )}
            <Button asChild variant="ghost" className="w-full font-bold text-slate-500">
              <Link href="/mufradat">KEMBALI KE KURIKULUM</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 py-8 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/mufradat`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <Badge className="bg-[#800000] mb-1">UJIAN JUZ {juzNum}</Badge>
          <h1 className="text-lg font-bold font-headline flex items-center gap-2 tracking-tight">
            Level Akreditasi Juz
          </h1>
        </div>
        <div className="text-right">
           <div className="text-xs font-black text-[#800000]">{currentIdx + 1} / 100</div>
           <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</div>
        </div>
      </div>

      <Progress value={currentIdx + 1} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />

      <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
        <CardHeader className="p-10 text-center bg-slate-50 flex flex-col items-center gap-4 border-b">
           <div className="p-3 bg-emerald-100 rounded-full text-emerald-700 animate-pulse"><Target className="w-6 h-6" /></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apa arti dari kosa kata berikut?</p>
           <div className="text-5xl md:text-7xl font-arabic text-[#800000] transition-all duration-300 transform scale-100">{questions[currentIdx]?.arabic}</div>
        </CardHeader>
        <CardContent className="p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {questions[currentIdx]?.options.map((opt, i) => (
            <Button
              key={i}
              variant="outline"
              disabled={!!selectedAnswer}
              onClick={() => handleAnswer(opt)}
              className={cn(
                "h-auto py-6 text-lg font-bold transition-all border-2 rounded-2xl justify-between px-6 text-left",
                selectedAnswer === opt && isCorrect === true && "bg-emerald-50 border-emerald-500 text-emerald-700",
                selectedAnswer === opt && isCorrect === false && "bg-rose-50 border-rose-500 text-rose-700",
                selectedAnswer && opt === questions[currentIdx].correct && isCorrect === false && "bg-emerald-50 border-emerald-500 text-emerald-700",
                !selectedAnswer && "hover:border-emerald-500 hover:bg-emerald-50 hover:scale-[1.02]"
              )}
            >
              <span className="flex-1">{opt}</span>
              {selectedAnswer === opt && isCorrect === true && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {selectedAnswer === opt && isCorrect === false && <XCircle className="w-5 h-5 shrink-0" />}
              {selectedAnswer && opt === questions[currentIdx].correct && isCorrect === false && <CheckCircle2 className="w-5 h-5 opacity-50 shrink-0" />}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
         <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
         <div>
            <p className="text-xs font-black uppercase text-emerald-900 mb-1">Ketentuan Ujian</p>
            <p className="text-[10px] leading-relaxed text-emerald-800 font-medium">Ujian ini bersifat komprehensif dari seluruh halaman di Juz {juzNum}. Pass threshold 90%. Berhasil lulus akan membuka akses ke Juz berikutnya.</p>
         </div>
      </div>
    </div>
  );
}
