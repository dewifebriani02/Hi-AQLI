'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  Timer,
  Star,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/db";
import { useCollection } from "@/db";

// Data Kuis untuk setiap ayat
const QUIZ_DATA: Record<string, any> = {
  "1:1": {
    questions: [
      {
        question: "Apa kedudukan i'rab dari kata 'بِـ' (Bi)?",
        correct: "Harf Jar",
        options: ["Fi'il Amr", "Harf Jar", "Ism Majrur", "Na'at"]
      },
      {
        question: "Apa fungsi dari kata 'اللَّهِ' (Allah)?",
        correct: "Mudhaf Ilaih",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il"]
      },
      {
        question: "Kata 'الرَّحْمَٰنِ' berkedudukan sebagai?",
        correct: "Na'at",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il Amr"]
      },
      {
        question: "Apa kedudukan dari 'اسْمِ' (Ismi)?",
        correct: "Majrur / Mudhaf",
        options: ["Mudhaf Ilaih", "Na'at", "Fi'il Amr", "Majrur / Mudhaf"]
      },
      {
        question: "Kedudukan 'الرَّحِيمِ' adalah?",
        correct: "Na'at",
        options: ["Harf Jar", "Mudhaf", "Na'at", "Fi'il Mudhari'"]
      }
    ]
  },
  "114:1": {
    questions: [
      {
        question: "Apa kedudukan i'rab dari kata 'قُلْ' (Qul)?",
        correct: "Fi'il Amr",
        options: ["Fi'il Mudhari'", "Fi'il Amr", "Harf Jar", "Ism Majrur"]
      },
      {
        question: "Kata 'أَعُوذُ' adalah fi'il apa?",
        correct: "Fi'il Mudhari'",
        options: ["Fi'il Madhi", "Fi'il Mudhari'", "Fi'il Amr", "Fi'il Muda'rif"]
      },
      {
        question: "Apa fungsi dari kata 'رَبِّ' (Rabbi)?",
        correct: "Majrur / Mudhaf",
        options: ["Mudhaf Ilaih", "Na'at", "Majrur / Mudhaf", "Fi'il"]
      },
      {
        question: "Huruf 'بِـ' dalam ayat ini berkedudukan sebagai?",
        correct: "Harf Jar",
        options: ["Harf Jar", "Fi'il Amr", "Na'at", "Mudhaf"]
      },
      {
        question: "Kedudukan 'النَّاسِ' adalah?",
        correct: "Mudhaf Ilaih",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il Mudhari'"]
      }
    ]
  },
  "113:1": {
    questions: [
      {
        question: "Huruf 'بِـ' dalam ayat ini berkedudukan sebagai?",
        correct: "Harf Jar",
        options: ["Harf Jar", "Fi'il Amr", "Na'at", "Mudhaf"]
      },
      {
        question: "Kedudukan 'الْفَلَقِ' adalah?",
        correct: "Mudhaf Ilaih",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il Mudhari'"]
      },
      {
        question: "Apa kedudukan dari 'أَعُوذُ'?",
        correct: "Fi'il Mudhari'",
        options: ["Fi'il Amr", "Fi'il Mudhari'", "Harf Jar", "Na'at"]
      },
      {
        question: "Kata 'قُلْ' berkedudukan sebagai?",
        correct: "Fi'il Amr",
        options: ["Fi'il Mudhari'", "Fi'il Amr", "Ism Majrur", "Harf Jar"]
      },
      {
        question: "Fungsi dari 'رَبِّ' adalah?",
        correct: "Majrur / Mudhaf",
        options: ["Mudhaf Ilaih", "Na'at", "Majrur / Mudhaf", "Fi'il"]
      }
    ]
  }
};

export default function IrabQuizPage() {
  const params = useParams();
  const router = useRouter();
  const surahId = params.surahId as string;
  const ayat = params.ayat as string;
  const { user, isUserLoading } = useUser();

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
  const quizData = useMemo(() => QUIZ_DATA[currentAyatKey] || { questions: [] }, [currentAyatKey]);

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
  }, [currentAyatKey]);

  const saveProgress = useCallback(async (finalScore: number) => {
    if (!user) return;
    const isPerfect = finalScore === quizData.questions.length;

    try {
      const response = await fetch('/api/irab-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: `irab_${currentAyatKey}`,
          surah_id: surahId,
          ayat: ayat,
          score: finalScore,
          total_questions: quizData.questions.length,
          duration_seconds: totalTime,
        })
      });
    } catch (e) {
      console.error("Gagal menyimpan progres kuis:", e);
    }
  }, [user, surahId, ayat, quizData.questions.length, totalTime, currentAyatKey]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;

    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const currentQ = quizData.questions[currentIdx];
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
      if (currentIdx + 1 < quizData.questions.length) {
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinished(true);
        if (nextScore === quizData.questions.length) {
          playSfx('perfect');
        } else {
          playSfx('fail');
        }
        saveProgress(nextScore);
      }
    }, 1200);
  }, [selectedAnswer, quizData.questions, currentIdx, score, playSfx, saveProgress]);

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
    if (quizData.questions.length > 0 && currentIdx < quizData.questions.length) {
      setSelectedAnswer(null);
      setIsCorrect(null);

      const currentQ = quizData.questions[currentIdx];
      const all = [...currentQ.options].sort(() => Math.random() - 0.5);
      setOptions(all);
    }
  }, [quizData.questions, currentIdx]);

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
        <p className="text-muted-foreground font-medium">Menyiapkan Kuis I'rab...</p>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline"><Link href={`/irab/${surahId}/${ayat}`}>Kembali</Link></Button>
      </div>
    );
  }

  if (isFinished) {
    const isPerfect = score === quizData.questions.length;
    const percentage = Math.round((score / quizData.questions.length) * 100);

    return (
      <div className="max-w-md mx-auto py-10 flex flex-col gap-10 pb-32 px-4 sm:px-0">
        <Card className="text-center border-[#D4AF37]/20 shadow-xl overflow-hidden">
          <div className={cn(
            "p-8 flex flex-col items-center gap-4 text-white transition-colors duration-500",
            isPerfect ? "bg-[#D4AF37]" : "bg-rose-900"
          )}>
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-bold font-headline">
              {isPerfect ? "Sempurna!" : "Belum Sempurna"}
            </h2>
            {isPerfect && <Badge className="bg-white text-black font-black">+10 POIN</Badge>}
          </div>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-4xl font-bold">{percentage}%</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skor</p>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold">{formatTime(totalTime)}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Waktu</p>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <p className="text-sm font-medium">Percobaan ke-{attempts}</p>
              {!isPerfect ? (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                  <RefreshCw className="h-4 w-4 text-rose-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Target Harus 100%</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Silakan ulangi kuis hingga Anda benar-benar memahami i'rab ayat ini.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Berhasil!</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Masyallah! Anda telah menguasai i'rab ayat ini. Teruslah ber-Itqan!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            {isPerfect ? (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-bold h-14"
                  onClick={() => router.push(`/irab/${surahId}/${ayat}`)}
                >
                  Kembali ke Analisis
                </Button>
                <Button asChild variant="outline" className="w-full border-2 border-black hover:bg-black/5 text-black font-bold h-12">
                  <Link href="/irab">DAFTAR AYAT</Link>
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 gap-2 shadow-lg"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
              </Button>
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
                  <div className="py-8 text-center text-muted-foreground italic text-xs">Belum ada pejuang I'rab di ayat ini.</div>
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
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/irab/${surahId}/${ayat}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Kuis I'rab</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</span>
          </div>
        </div>
      </div>

      <Progress value={((currentIdx + 1) / quizData.questions.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardContent className="p-6 sm:p-8 text-center bg-muted/10 pt-10 pb-10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Pilih Jawaban yang Tepat:</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#B8860B] mb-2 leading-relaxed">
            {quizData.questions[currentIdx]?.question}
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
                selectedAnswer && option === quizData.questions[currentIdx]?.correct && isCorrect === false && "bg-green-100 border-green-500 text-green-700",
                !selectedAnswer && "hover:border-[#D4AF37] hover:text-[#B8860B]"
              )}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span className="truncate">{option}</span>
                {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                {selectedAnswer === option && isCorrect === false && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                {selectedAnswer && option === quizData.questions[currentIdx]?.correct && isCorrect === false && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground italic">
        Uji pemahaman Anda tentang kedudukan i'rab setiap kata dalam ayat ini.
      </p>
    </div>
  );
}
