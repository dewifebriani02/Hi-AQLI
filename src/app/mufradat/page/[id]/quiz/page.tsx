'use client';

import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Target
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Question {
  id: number;
  arabic: string;
  correct: string;
  options: string[];
}

export default function MufradatPageQuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageId = params.id as string;
  const pageNum = parseInt(pageId);

  const from = searchParams.get('from');
  const surahId = searchParams.get('surahId');
  const nextVerseId = searchParams.get('nextVerseId');

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

  // Auth Guard
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const quizId = `mufradat_page_${pageNum}`;

  // Fetch leaderboard data
  const { data: allAttempts, refresh: refreshLeaderboard } = useCollection("quiz_attempts", {
    filters: [{ column: 'quiz_id', operator: '==', value: quizId }],
    orderBy: { column: 'score', ascending: false }
  });

  const userIds = useMemo(() => [...new Set(allAttempts?.map(a => a.user_id) || [])], [allAttempts]);
  
  const { data: leaderboardUsers } = useCollection(userIds.length > 0 ? "users" : null, {
    filters: [{ column: 'id', operator: 'in', value: userIds }]
  });

  const leaderboardData = useMemo(() => {
    if (!allAttempts) return [];
    
    // Get unique best score per user
    const uniqueMap = new Map();
    allAttempts.forEach(attempt => {
      const existing = uniqueMap.get(attempt.user_id);
      const isNewBest = !existing || 
        (attempt.score > existing.score || 
        (attempt.score === existing.score && (attempt.duration_seconds < existing.duration_seconds)));
      
      if (isNewBest) {
        const userData = leaderboardUsers?.find(u => u.id === attempt.user_id);
        uniqueMap.set(attempt.user_id, { ...attempt, userData });
      }
    });

    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score || a.duration_seconds - b.duration_seconds)
      .slice(0, 5);
  }, [allAttempts, leaderboardUsers]);

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
    async function fetchQuestions() {
      if (!pageNum) return;
      try {
        setLoading(true);
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${pageNum}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`
        );
        const data = await res.json();
        
        if (data && data.verses) {
          const allWords = data.verses.flatMap((v: any) => v.words.filter((w: any) => w.char_type_name === 'word'));
          
          // Randomly select 30 words
          const shuffledWords = allWords.sort(() => Math.random() - 0.5).slice(0, 30);
          
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
        }
      } catch (err) {
        console.error("Quiz Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [pageNum]);

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
        else playSfx('fail');
        saveAttempt(finalScore);
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
          user_id: user.id,
          quiz_id: quizId,
          surah_id: "0", // 0 indicates page-based
          verse_id: pageNum.toString(), // reuse verse_id field for pageNum for now or adjust DB
          score: finalScore,
          total_questions: questions.length,
          duration_seconds: totalTime,
          is_passed: finalScore === 100,
          wrong_words: wrongWords.map(w => w.id),
          page_id: Number(pageNum)
        })
      });
      refreshLeaderboard();
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
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest text-[#800000]">Menyiapkan Kuis Halaman {pageNum}...</p>
      </div>
    );
  }

  if (isFinished) {
    const isPerfect = score === questions.length;
    return (
      <div className="max-w-md mx-auto py-12 px-4 pb-32 flex flex-col gap-6">
        <Card className="text-center border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className={cn(
            "p-10 flex flex-col items-center gap-4 text-white relative overflow-hidden",
            isPerfect ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-800"
          )}>
            {isPerfect ? (
              <div className="flex flex-col items-center gap-2">
                <Trophy className="w-16 h-16 text-yellow-200 animate-bounce" />
                <h2 className="text-3xl font-black uppercase tracking-tighter">LUAR BIASA GEMILANG!</h2>
                <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/30 backdrop-blur-sm">
                  🎯 HALAMAN {Number(pageNum) + 1} TERBUKA!
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Target className="w-12 h-12 text-slate-400 opacity-50" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">COBA LAGI, PEJUANG!</h2>
                <div className="bg-rose-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border border-rose-500/30 text-rose-100">
                  ⚠️ BUTUH 100% (SEMPURNA) UNTUK LANJUT
                </div>
              </div>
            )}
            
            <div className="mt-4 flex flex-col items-center">
              <span className="text-6xl font-black">{score}<span className="text-2xl opacity-50">/{questions.length}</span></span>
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-2">Skor Kosakata Anda</p>
            </div>
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
          {wrongWords.length > 0 && (
            <div className="px-8 pb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Perlu Review ({wrongWords.length})</span>
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
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
            {isPerfect ? (
              <>
                {from === 'surah' && surahId && nextVerseId ? (
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                    <Link href={`/mufradat/${surahId}/${nextVerseId}?from=surah`}>
                      Lanjut ke Ayat {nextVerseId} <ChevronLeft className="w-4 h-4 rotate-180" />
                    </Link>
                  </Button>
                ) : (
                  pageNum < 604 ? (
                    <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                      <Link href={`/mufradat/page/${pageNum + 1}${from ? `?from=${from}` : ''}`}>
                        Lanjut ke Halaman Berikutnya <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                      <Link href={`/mufradat`}>
                        Selesai! Kembali <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Link>
                    </Button>
                  )
                )}
                <Button asChild variant="outline" className="w-full border-2 border-slate-200 font-bold py-6 rounded-2xl hover:bg-white bg-white text-slate-600">
                  <Link href={from === 'surah' && surahId ? `/mufradat/${surahId}` : "/mufradat"}>KEMBALI KE {from === 'surah' ? 'DAFTAR AYAT' : 'DAFTAR JUZ'}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleReset} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                   <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
                </Button>
                <Button asChild variant="ghost" className="w-full font-bold text-slate-500">
                  <Link href="/mufradat">KEMBALI KE DAFTAR JUZ</Link>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
        
        {/* Leaderboard Card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37]" /> Papan Juara Halaman Ini
            </h3>
            <span className="text-[10px] font-bold text-slate-400">TOP 5 PEJUANG</span>
          </div>

          <Card className="border-none shadow-lg overflow-hidden rounded-3xl bg-white">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {leaderboardData.length > 0 ? leaderboardData.map((item: any, idx: number) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                        idx === 0 ? "bg-[#D4AF37] text-white shadow-md rotate-3" : 
                        idx === 1 ? "bg-slate-200 text-slate-600" :
                        idx === 2 ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-400"
                      )}>
                        {idx + 1}
                      </div>
                      <Avatar className="w-10 h-10 border-2 border-white shadow-sm shrink-0">
                        <AvatarImage src={item.userData?.avatar_url} />
                        <AvatarFallback className="bg-[#800000]/5 text-[#800000] font-bold text-xs">
                          {(item.userData?.username || 'H').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-slate-800 truncate">
                          {item.userData?.username || 'Hamba Allah'}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-[#D4AF37] fill-current" /> {item.score}/{item.total_questions}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium italic">
                             {formatTime(item.duration_seconds || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {idx === 0 && <Star className="w-4 h-4 fill-current text-amber-400 shrink-0" />}
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-400 italic text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 opacity-20" />
                    Belum ada pejuang kuis di halaman ini.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 py-8 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/mufradat/page/${pageNum}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Kuis Halaman {pageNum}</h1>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Timer className="w-3 h-3" /> {formatTime(totalTime)}
          </div>
        </div>
        <div className="text-xs font-black text-[#800000]">{currentIdx + 1} / {questions.length}</div>
        <Button onClick={handleReset} variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black text-slate-400 hover:text-[#800000] uppercase tracking-tighter">
          <RefreshCw className="w-3 h-3 mr-1" /> Ulangi
        </Button>
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
        Pilih jawaban yang paling tepat sesuai makna dalam halaman ini.
      </p>
    </div>
  );
}
