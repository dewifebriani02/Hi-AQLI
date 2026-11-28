'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  Timer,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser, useCollection, authFetch } from "@/db";
import { useToast } from "@/hooks/use-toast";
import {
  getIrabNavigation,
  getIrabQuizQuestions,
} from "@/lib/irab-data";

export default function IrabQuizPage() {
  const params = useParams();
  const router = useRouter();
  const surahId = params.surahId as string;
  const ayat = params.ayat as string;
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [totalTime, setTotalTime] = useState(0);

  const currentAyatKey = `${surahId}:${ayat}`;

  const {
    currentData,
    totalVersesInSurah,
    nextInSurah,
    prevGlobal,
    nextGlobal,
    nextSurah,
  } = useMemo(() => getIrabNavigation(surahId, ayat), [surahId, ayat]);

  const questions = useMemo(
    () => getIrabQuizQuestions(surahId, ayat),
    [surahId, ayat]
  );

  // Fetch leaderboard data
  const { data: allAttempts } = useCollection("quiz_attempts", {
    filters: [
      { column: 'quiz_id', operator: '==', value: `irab_${currentAyatKey}` }
    ],
    orderBy: { column: 'score', ascending: false }
  });

  const userIds = useMemo(() => [...new Set(allAttempts?.map(a => a.user_id) || [])], [allAttempts]);
  const { data: leaderboardUsers } = useCollection(userIds.length > 0 ? "users" : null, {
    filters: [{ column: 'id', operator: 'in', value: userIds }]
  });

  const uniqueLeaderboard = useMemo(() => {
    if (!allAttempts) return [];

    const uniqueMap = new Map();
    allAttempts.forEach(attempt => {
      const existing = uniqueMap.get(attempt.user_id);
      const isNewBest = !existing ||
        attempt.score > existing.score ||
        (attempt.score === existing.score && (attempt.duration_seconds < existing.duration_seconds));

      if (isNewBest) {
        const userData = leaderboardUsers?.find(u => u.id === attempt.user_id);
        uniqueMap.set(attempt.user_id, {
          ...attempt,
          userData,
        });
      }
    });

    const finalCounts = new Map();
    allAttempts.forEach(a => finalCounts.set(a.user_id, (finalCounts.get(a.user_id) || 0) + 1));

    return Array.from(uniqueMap.values())
      .map(item => ({ ...item, attemptCount: finalCounts.get(item.user_id) }))
      .sort((a, b) => b.score - a.score || a.duration_seconds - b.duration_seconds)
      .slice(0, 5);
  }, [allAttempts, leaderboardUsers]);

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
      audio.volume = 0.5;
      audio.play().catch(() => { });
    } catch (e) {
      console.error("Audio SFX Error:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(false);
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTotalTime(0);
  }, [currentAyatKey]);

  const saveProgress = useCallback(async (finalScore: number) => {
    if (!user) return;

    try {
      const response = await authFetch('/api/irab-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: `irab_${currentAyatKey}`,
          surah_id: surahId,
          ayat: ayat,
          score: finalScore,
          total_questions: questions.length,
          duration_seconds: totalTime,
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        toast({
          variant: "destructive",
          title: "Gagal menyimpan progres kuis",
          description: errData?.error || `Terjadi kesalahan (${response.status}).`,
        });
      }
    } catch (e) {
      console.error("Gagal menyimpan progres kuis:", e);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan progres kuis",
        description: "Periksa koneksi internet Anda dan coba lagi.",
      });
    }
  }, [user, surahId, ayat, questions.length, totalTime, currentAyatKey, toast]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;

    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const currentQ = questions[currentIdx];
    const isAnsCorrect = answer === currentQ.correct;

    setSelectedAnswer(answer);
    setIsCorrect(isAnsCorrect);

    let nextScore = score;
    if (isAnsCorrect) {
      playSfx('correct');
      nextScore = score + 1;
      setScore(nextScore);
    } else {
      playSfx('incorrect');
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinished(true);
        if (nextScore === questions.length) {
          playSfx('perfect');
        } else {
          playSfx('fail');
        }
        saveProgress(nextScore);
      }
    }, 1000);
  }, [selectedAnswer, questions, currentIdx, score, playSfx, saveProgress]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && user) {
      interval = setInterval(() => {
        setTotalTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, user]);

  useEffect(() => {
    if (questions.length > 0 && currentIdx < questions.length) {
      setSelectedAnswer(null);
      setIsCorrect(null);

      const currentQ = questions[currentIdx];
      const all = [...currentQ.options].sort(() => Math.random() - 0.5);
      setOptions(all);
    }
  }, [questions, currentIdx]);

  const handleReset = () => {
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAttempts(a => a + 1);
    setTotalTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isUserLoading || (loading && user)) {
    return (
      <div className="flex flex-col items-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground font-medium">Menyiapkan Kuis I&apos;rab...</p>
      </div>
    );
  }

  if (!user) return null;

  if (error || !currentData || questions.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <Alert variant="destructive">
          <AlertTitle>Kuis Belum Tersedia</AlertTitle>
          <AlertDescription>{error || "Soal kuis untuk ayat ini tidak ditemukan."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline"><Link href="/irab">Kembali ke Hi I&apos;rab</Link></Button>
      </div>
    );
  }

  if (isFinished) {
    const isPerfect = score === questions.length;
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-md mx-auto py-8 flex flex-col gap-8 pb-32 px-4 sm:px-0">
        <Card className="text-center border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className={cn(
            "p-10 flex flex-col items-center gap-4 text-white relative overflow-hidden",
            isPerfect ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-rose-900"
          )}>
            {isPerfect && (
              <div className="absolute top-4 right-4 animate-pulse">
                <Badge className="bg-white text-orange-600 font-black border-none">+10 POIN</Badge>
              </div>
            )}
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">
              {isPerfect ? "MasyaAllah Sempurna!" : "Belum Sempurna"}
            </h2>
            <p className="text-xs font-bold opacity-90 uppercase tracking-widest">
              {currentData.surah} Ayat {currentData.ayat} • Skor {score}/{questions.length}
            </p>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Waktu</p>
                <p className="text-xl font-bold">{formatTime(totalTime)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</p>
                <p className="text-xl font-bold">{percentage}%</p>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Percobaan ke-{attempts}</p>
              {!isPerfect ? (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                  <RefreshCw className="h-4 w-4 text-rose-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Target Harus 100%</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    Silakan ulangi kuis atau pelajari kembali analisis ayat ini hingga seluruh kedudukan I&apos;rab terjawab tepat.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Lulus 100%!</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    Alhamdulillah, Anda telah menguasai kedudukan I&apos;rab pada {currentData.surah} Ayat {currentData.ayat}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>

          {/* Direct Next Verse Navigation — Exact Hi Mufradat Completion Flow */}
          <CardFooter className="flex flex-col gap-3 p-6 border-t bg-slate-50/50">
            {isPerfect ? (
              <div className="flex flex-col gap-3 w-full">
                {nextInSurah ? (
                  <>
                    <Button
                      asChild
                      className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-7 rounded-2xl shadow-xl uppercase tracking-[0.1em] text-xs gap-2 border-b-4 border-black/10 transition-all active:translate-y-1 active:border-b-0"
                    >
                      <Link href={`/irab/${nextInSurah.surahId}/${nextInSurah.ayat}/quiz`}>
                        <Zap className="w-4 h-4 fill-current" /> LANGSUNG KUIS AYAT {nextInSurah.ayat}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-7 rounded-2xl uppercase tracking-widest text-xs gap-2 hover:bg-[#800000]/5 transition-all"
                    >
                      <Link href={`/irab/${nextInSurah.surahId}/${nextInSurah.ayat}`}>
                        BEDAH I&apos;RAB AYAT {nextInSurah.ayat} <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </>
                ) : nextSurah && nextGlobal ? (
                  <Button
                    asChild
                    className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-7 rounded-2xl shadow-xl uppercase tracking-wider text-xs gap-2"
                  >
                    <Link href={`/irab/${nextGlobal.surahId}/${nextGlobal.ayat}`}>
                      LANJUT KE SURAH {nextSurah.name.toUpperCase()} (AYAT 1) <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <div className="w-full p-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100 mb-1">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Maa Syaa Allah!</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Anda telah menyelesaikan seluruh ayat pada surah ini.</p>
                  </div>
                )}

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-2 border-slate-200 font-bold py-6 rounded-2xl hover:bg-white bg-white text-slate-600"
                >
                  <Link href={`/irab/${surahId}/${ayat}`}>
                    <BookOpen className="w-4 h-4 mr-2" /> KEMBALI KE ANALISIS AYAT {currentData.ayat}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full text-slate-500 font-bold text-xs uppercase tracking-widest">
                  <Link href={`/irab/${surahId}`}>KEMBALI KE DAFTAR AYAT</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-7 rounded-2xl gap-2 shadow-xl uppercase tracking-widest text-xs"
                  onClick={handleReset}
                >
                  <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-6 rounded-2xl uppercase tracking-widest text-xs gap-2"
                >
                  <Link href={`/irab/${surahId}/${ayat}`}>
                    <BookOpen className="w-4 h-4" /> PELAJARI ULANG I&apos;RAB AYAT {currentData.ayat}
                  </Link>
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* PAPAN JUARA */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Papan Juara Ayat Ini</h3>
            </div>
            <Badge variant="outline" className="text-[8px] font-bold border-[#D4AF37]/30 text-[#D4AF37]">TOP 5</Badge>
          </div>

          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="p-0">
              <div className="divide-y text-left">
                {uniqueLeaderboard && uniqueLeaderboard.length > 0 ? uniqueLeaderboard.map((item: any, idx: number) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-white/50 transition-colors">
                    <Link href={`/profile/${item.user_id}`} className="flex items-center gap-3 flex-1">
                      <span className={cn(
                        "text-[10px] font-bold w-4",
                        idx === 0 ? "text-[#D4AF37]" : "text-muted-foreground"
                      )}>{idx + 1}</span>
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={item.userData?.photoURL} />
                        <AvatarFallback className="bg-[#800000] text-white text-xs font-bold">
                          {item.userData?.username?.[0] || item.userData?.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold hover:text-[#800000] transition-colors">
                          {item.userData?.username || 'Hamba Allah'}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-[#D4AF37]" /> {item.score}/{item.total_questions} Benar
                          </span>
                          <span className="text-[8px] text-muted-foreground italic">
                            ({formatTime(item.duration_seconds || 0)})
                          </span>
                          <Badge variant="outline" className="text-[7px] h-3 px-1 border-[#800000]/20 text-[#800000] font-bold">
                            {item.attemptCount}x Coba
                          </Badge>
                        </div>
                      </div>
                    </Link>
                    {idx === 0 && <Star className="w-3 h-3 fill-current text-[#D4AF37] shrink-0" />}
                  </div>
                )) : (
                  <div className="py-8 text-center text-muted-foreground italic text-xs">Belum ada pejuang I&apos;rab di ayat ini.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 sm:px-0 pb-32">
      {/* Sticky Header with Prev / Next Ayat Navigation */}
      <div className="flex items-center gap-3 sticky top-16 sm:top-20 bg-background/95 backdrop-blur z-30 py-3 border-b">
        <Button asChild variant="ghost" size="icon" className="text-[#800000] shrink-0">
          <Link href={`/irab/${surahId}/${ayat}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-lg font-black font-headline truncate">
            Kuis I&apos;rab • {currentData.surah} ({currentData.ayat}/{totalVersesInSurah})
          </h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-[#800000]">Soal {currentIdx + 1}/{questions.length}</span>
            <span>•</span>
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            disabled={!prevGlobal}
            onClick={() => prevGlobal && router.push(`/irab/${prevGlobal.surahId}/${prevGlobal.ayat}/quiz`)}
            title={prevGlobal ? `Kuis Ayat Sebelumnya (${prevGlobal.surah}: ${prevGlobal.ayat})` : "Ayat Pertama"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!nextGlobal}
            onClick={() => nextGlobal && router.push(`/irab/${nextGlobal.surahId}/${nextGlobal.ayat}/quiz`)}
            title={nextGlobal ? `Kuis Ayat Selanjutnya (${nextGlobal.surah}: ${nextGlobal.ayat})` : "Ayat Terakhir"}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardContent className="p-6 sm:p-8 text-center bg-muted/10 pt-8 pb-8 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Pilih Kedudukan I&apos;rab yang Tepat:
          </div>
          {questions[currentIdx]?.wordArab && (
            <div className="inline-block px-6 py-3 rounded-2xl bg-[#800000]/5 border border-[#800000]/15">
              <span className="text-4xl sm:text-5xl font-arabic text-[#800000]" dir="rtl">
                {questions[currentIdx].wordArab}
              </span>
            </div>
          )}
          <div className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed">
            {questions[currentIdx]?.question}
          </div>
        </CardContent>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 gap-3 sm:gap-4">
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              className={cn(
                "h-auto py-4 sm:py-5 text-base sm:text-lg font-bold transition-all border-2 bg-white ring-0 focus:ring-0 focus-visible:ring-0 outline-none shadow-sm rounded-xl",
                selectedAnswer === option && isCorrect === true && "bg-green-100 border-green-500 text-green-700",
                selectedAnswer === option && isCorrect === false && "bg-red-100 border-red-500 text-red-700",
                selectedAnswer && option === questions[currentIdx]?.correct && isCorrect === false && "bg-green-100 border-green-500 text-green-700",
                !selectedAnswer && "hover:border-[#D4AF37] hover:text-[#B8860B]"
              )}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span className="truncate">{option}</span>
                {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                {selectedAnswer === option && isCorrect === false && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                {selectedAnswer && option === questions[currentIdx]?.correct && isCorrect === false && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground italic">
        Uji pemahaman Anda tentang kedudukan i&apos;rab setiap kata dalam {currentData.surah} Ayat {currentData.ayat}.
      </p>
    </div>
  );
}
