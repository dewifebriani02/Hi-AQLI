"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  RotateCcw,
  Timer,
  Star,
  Heart,
  Clock,
  Zap,
  BookOpen,
  Target,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase, useUser } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/supabase/non-blocking-updates";
import { useMemo } from "react";

interface WordData {
  id: number;
  text_uthmani: string;
  translation: {
    text: string;
  };
  verse_number: number;
}

interface Verse {
  verse_number: number;
  words: WordData[];
}

// Fungsi untuk menghitung tingkat kesulitan kata (kata yang lebih panjang dan lebih kompleks dianggap lebih sulit)
const calculateWordDifficulty = (word: WordData): number => {
  const arabicLength = word.text_uthmani.length;
  const translationLength = word.translation?.text?.length || 0;
  const hasDiacritics = /[ًٌٌٍّْ]/.test(word.text_uthmani);
  const hasShadda = /[ّ]/.test(word.text_uthmani);

  // Skor kesulitan berdasarkan panjang dan kompleksitas
  return arabicLength * 2 + translationLength + (hasDiacritics ? 2 : 0) + (hasShadda ? 3 : 0);
};

export default function MurajaahQuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [quizWords, setQuizWords] = useState<WordData[]>([]);
  const [surahName, setSurahName] = useState<string>("");
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
  const [timeLeft, setTimeLeft] = useState(45);
  const [sentCongrats, setSentCongrats] = useState<string[]>([]);
  const [optimisticAttempt, setOptimisticAttempt] = useState<any>(null);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);

  // Murajaah quiz uses separate quizId format - Filtered by Group (RLS)
  const { data: allAttempts, isLoading: isLeaderboardLoading } = useCollection("quiz_attempts", {
    filters: [
      { column: 'quiz_id', operator: '==', value: `murajaah_${id}` }
    ],
    orderBy: { column: 'score', ascending: false }
  });

  // Combine server data with optimistic update
  const combinedAttempts = useMemo(() => {
    if (!allAttempts) return [];
    if (!optimisticAttempt) return allAttempts;
    const exists = allAttempts.some((a: any) => a.id === optimisticAttempt.id);
    if (exists) return allAttempts;
    return [optimisticAttempt, ...allAttempts];
  }, [allAttempts, optimisticAttempt]);

  const userIds = useMemo(() => [...new Set(combinedAttempts?.map((a: any) => a.user_id) || [])], [combinedAttempts]);
  const { data: leaderboardUsers } = useCollection((userIds.length > 0 && user) ? "users" : null, {
    filters: [{ column: 'id', operator: 'in', value: userIds }]
  });

  const uniqueLeaderboard = useMemo(() => {
    if (!combinedAttempts) return [];

    const uniqueMap = new Map();
    (combinedAttempts as any[]).forEach(attempt => {
      const existing = uniqueMap.get(attempt.user_id);
      const attemptCount = (existing?.attemptCount || 0) + 1;
      const isNewBest = !existing ||
        attempt.score > existing.score ||
        (attempt.score === existing.score && (attempt.duration_seconds < existing.duration_seconds));

      if (isNewBest) {
        const userData = leaderboardUsers?.find((u: any) => u.id === attempt.user_id);
        uniqueMap.set(attempt.user_id, {
          ...attempt,
          userData,
          attemptCount: 1
        });
      }
    });

    const finalCounts = new Map();
    (combinedAttempts as any[]).forEach((a: any) => finalCounts.set(a.user_id, (finalCounts.get(a.user_id) || 0) + 1));

    return Array.from(uniqueMap.values())
      .map((item: any) => ({ ...item, attemptCount: finalCounts.get(item.user_id) }))
      .sort((a: any, b: any) => b.score - a.score || a.duration_seconds - b.duration_seconds)
      .slice(0, 10);
  }, [combinedAttempts, leaderboardUsers]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      // Allow guest to take quiz, but progress won't save
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

  const fetchMurajaahData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch surah info
      const sRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
      const sData = await sRes.json();
      setSurahName(sData.chapter.name_simple);

      // Fetch all verses with words
      const vRes = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&per_page=300`
      );
      const vData = await vRes.json();

      if (!vData.verses) throw new Error("Gagal memuat data ayat.");

      // Collect all words with their verse numbers
      const allWords: WordData[] = [];
      vData.verses.forEach((verse: Verse) => {
        verse.words.forEach((word) => {
          // Skip very short words (less than 2 characters) for Fatihah and tiny surahs, but be more lenient
          const minLen = vData.verses.length <= 10 ? 1 : 2;
          if (word.text_uthmani && word.text_uthmani.length >= minLen && word.translation?.text) {
            allWords.push({
              ...word,
              verse_number: verse.verse_number
            });
          }
        });
      });

      if (allWords.length < 5) {
        throw new Error("Surah ini tidak memiliki cukup kata untuk kuis murajaah.");
      }

      // Sort by difficulty and take up to 30 most difficult words
      const sortedByDifficulty = [...allWords].sort((a, b) => calculateWordDifficulty(b) - calculateWordDifficulty(a));
      const targetCount = Math.min(allWords.length, 30);
      const selectedWords = sortedByDifficulty.slice(0, targetCount);

      setQuizWords(selectedWords);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMurajaahData();
  }, [fetchMurajaahData]);

  const saveProgress = useCallback(async (finalScore: number) => {
    if (!user) return;
    const isPerfect = finalScore === quizWords.length;

    // Generate optimistic attempt ID
    const optimisticId = `optimistic_${Date.now()}_${user.id}`;

    // Optimistic update
    setOptimisticAttempt({
      id: optimisticId,
      user_id: user.id,
      group_id: userData?.mufradat_group_id,
      quiz_id: `murajaah_${id}`,
      surah_id: id,
      verse_id: "0", // 0 indicates murajaah (full surah)
      score: finalScore,
      total_questions: quizWords.length,
      is_passed: isPerfect,
      duration_seconds: totalTime,
      created_at: new Date().toISOString(),
    });

    try {
      addDocumentNonBlocking("quiz_attempts", {
        user_id: user.id,
        group_id: userData?.mufradat_group_id,
        quiz_id: `murajaah_${id}`,
        surah_id: id,
        verse_id: "0",
        score: finalScore,
        total_questions: quizWords.length,
        is_passed: isPerfect,
        duration_seconds: totalTime,
        created_at: new Date().toISOString(),
      });

      if (isPerfect) {
        const { data: uData } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .maybeSingle();

        const currentPoints = uData?.points || 0;

        updateDocumentNonBlocking("users", user.id, {
          points: currentPoints + 25, // Bonus points for murajaah completion
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Gagal menyimpan progres murajaah:", e);
    }
  }, [user, id, quizWords.length, totalTime]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;

    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const currentWord = quizWords[currentIdx];
    if (!currentWord) return;

    const correct = currentWord.translation.text;
    const isAnsCorrect = answer === correct;

    setSelectedAnswer(answer === "" ? "Waktu Habis" : answer);
    setIsCorrect(isAnsCorrect);

    let nextScore = score;
    if (isAnsCorrect) {
      playSfx('correct');
      nextScore = score + 1;
      setScore(nextScore);
    } else {
      playSfx('incorrect');
      if (answer === "") {
        setTimeout(() => {
          toast({
            variant: "destructive",
            title: "Waktu Habis!",
            description: "Satu soal maksimal 45 detik.",
          });
        }, 0);
      }
    }

    setTimeout(() => {
      if (currentIdx + 1 < quizWords.length) {
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinished(true);
        const passThreshold = Math.ceil(quizWords.length * 0.9);
        if (nextScore >= passThreshold) { 
          playSfx('perfect');
        } else {
          playSfx('fail');
        }
        saveProgress(nextScore);
      }
    }, 1200);
  }, [selectedAnswer, quizWords, currentIdx, score, playSfx, toast, saveProgress]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading) {
      interval = setInterval(() => {
        setTotalTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && !selectedAnswer) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, selectedAnswer]);

  useEffect(() => {
    if (timeLeft === 0 && !selectedAnswer && !isFinished && !loading) {
      handleAnswer("");
    }
  }, [timeLeft, selectedAnswer, isFinished, loading, handleAnswer]);

  useEffect(() => {
    if (quizWords.length > 0 && currentIdx < quizWords.length) {
      setSelectedAnswer(null);
      setIsCorrect(null);
      setTimeLeft(45); // 45 seconds for murajaah

      const currentWord = quizWords[currentIdx];
      const correct = currentWord.translation.text;

      let wrong = quizWords
        .filter(w => w.translation.text !== correct)
        .map(w => w.translation.text);

      wrong = [...new Set(wrong)].sort(() => Math.random() - 0.5).slice(0, 3);
      const all = [correct, ...wrong].sort(() => Math.random() - 0.5);
      setOptions(all);
    }
  }, [quizWords, currentIdx]);

  const handleReset = () => {
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAttempts(a => a + 1);
    setTotalTime(0);
    setTimeLeft(45);
    setSentCongrats([]);
    setOptimisticAttempt(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendCongrats = (userName: string) => {
    if (sentCongrats.includes(userName)) return;
    setSentCongrats(prev => [...prev, userName]);
    toast({
      title: "Ucapan Terkirim!",
      description: `Masyallah, ucapan selamat terkirim ke ${userName}.`,
    });
  };

  if (isUserLoading || loading || isUserDataLoading || isLeaderboardLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Menyiapkan Kuis Murajaah & Papan Juara...</p>
      </div>
    );
  }

  if (error || quizWords.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>{error || "Tidak dapat memuat kuis murajaah."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline"><Link href={`/mufradat/${id}`}>Kembali</Link></Button>
      </div>
    );
  }

  if (isFinished) {
    const passThreshold = Math.ceil(quizWords.length * 0.9);
    const isExcellent = score >= passThreshold;
    const percentage = Math.round((score / quizWords.length) * 100);

    return (
      <div className="max-w-md mx-auto py-10 flex flex-col gap-10 pb-32 px-4 sm:px-0">
        <Card className="text-center border-[#D4AF37]/20 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className={cn(
            "p-8 flex flex-col items-center gap-4 text-white transition-colors duration-500",
            isExcellent ? "bg-[#D4AF37]" : "bg-rose-900"
          )}>
            <Target className={cn("w-16 h-16", isExcellent && "animate-bounce")} />
            <h2 className="text-2xl font-bold font-headline">
              {isExcellent ? "Murajaah Luar Biasa!" : "Belum Maksimal"}
            </h2>
            {isExcellent && user && <Badge className="bg-white text-black font-black">+25 POIN HI AQLI</Badge>}
            {!user && <Badge className="bg-white text-black font-black">LOGIN UNTUK SIMPAN SKOR</Badge>}
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
              {!isExcellent ? (
                <Alert className="bg-amber-50 border-amber-200 text-amber-800 text-left">
                  <RotateCcw className="h-4 w-4 text-amber-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Target Minimal 90%</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Murajaah menguji pemahaman kata-ayat dalam surah ini. Targetkan minimal {passThreshold} dari {quizWords.length} kata benar.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Masyallah!</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Pemahaman Anda atas kosakata surah ini sangat baik. {user ? "Bonus poin telah ditambahkan." : "Login untuk menyimpan progres."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            <div className="flex flex-col gap-3 w-full">
              <Button
                className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 gap-2 shadow-lg"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4" /> ULANGI MURAJAAH
              </Button>
              <Button asChild variant="outline" className="w-full border-2 border-black hover:bg-black/5 text-black font-bold h-12">
                <Link href={`/mufradat/${id}`}>KEMBALI KE SURAT</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {user && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
                <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Papan Juara Murajaah</h3>
              </div>
              <Badge variant="outline" className="text-[8px] font-bold border-[#D4AF37]/30 text-[#D4AF37]">TOP 10</Badge>
            </div>

            <Card className="border-none shadow-sm bg-muted/20">
              <CardContent className="p-0">
                <div className="divide-y text-left">
                  {uniqueLeaderboard && uniqueLeaderboard.length > 0 ? uniqueLeaderboard.map((item: any, idx: number) => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-white/50 transition-colors">
                      <Link href={`/profile/${item.user_id}`} className="flex items-center gap-3 flex-1">
                        <span className={cn(
                          "text-[10px] font-bold w-4",
                          idx === 0 ? "text-[#D4AF37]" : idx === 1 ? "text-slate-500" : idx === 2 ? "text-amber-700" : "text-muted-foreground"
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendCongrats(item.userData?.username || 'Sahabat')}
                          className={cn(
                            "h-7 px-2 text-[9px] font-bold gap-1 transition-all",
                            sentCongrats.includes(item.userData?.username || 'Sahabat') ? "text-rose-500 bg-rose-50" : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                          )}
                        >
                          <Heart className={cn("w-3 h-3", sentCongrats.includes(item.userData?.username || 'Sahabat') && "fill-current")} />
                          {sentCongrats.includes(item.userData?.username || 'Sahabat') ? "Terkirim" : "Selamat"}
                        </Button>
                        {idx === 0 && <Star className="w-3 h-3 fill-current text-[#D4AF37] shrink-0" />}
                        {idx === 1 && <Star className="w-3 h-3 fill-current text-slate-400 shrink-0" />}
                        {idx === 2 && <Star className="w-3 h-3 fill-current text-amber-600 shrink-0" />}
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center text-muted-foreground italic text-xs">Belum ada pejuang murajaah untuk surat ini.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 sm:px-0 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/mufradat/${id}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline flex items-center gap-2">
            <Target className="w-5 h-5 text-[#D4AF37]" />
            Murajaah {surahName}
          </h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {quizWords.length} Kata Paling Sulit</span>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-colors duration-300",
          timeLeft <= 15 ? "border-rose-500 bg-rose-50 text-rose-600 animate-pulse" : "border-muted bg-muted/50 text-muted-foreground"
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm font-black font-mono">{timeLeft}s</span>
        </div>
      </div>

      <Progress value={((currentIdx + 1) / quizWords.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-10 pt-12 bg-muted/10 relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Pilih Arti yang Tepat (Kata {currentIdx + 1} / {quizWords.length})
          </div>
          <div className="text-4xl md:text-6xl font-arabic leading-relaxed text-[#B8860B]">
            {quizWords[currentIdx]?.text_uthmani}
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
            <BookOpen className="w-3 h-3" />
            Ayat {quizWords[currentIdx]?.verse_number}
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              className={cn(
                "h-auto py-5 text-lg font-bold transition-all border-2 bg-white ring-0 focus:ring-0 focus-visible:ring-0 outline-none shadow-sm rounded-xl",
                selectedAnswer === option && isCorrect === true && "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20",
                selectedAnswer === option && isCorrect === false && "bg-red-100 border-red-500 text-red-700 ring-2 ring-red-500/20",
                selectedAnswer && option === quizWords[currentIdx]?.translation?.text && isCorrect === false && "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20",
                !selectedAnswer && "hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 hover:text-[#B8860B] focus-visible:border-[#D4AF37] focus-visible:bg-[#D4AF37]/5"
              )}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span className="truncate">{option}</span>
                {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                {selectedAnswer === option && isCorrect === false && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                {selectedAnswer && option === quizWords[currentIdx]?.translation?.text && isCorrect === false && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Murajaah: Ulangan Pemahaman</p>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Kuis ini menguji {quizWords.length} kata dari surah {surahName}. Setiap kata diambil dari ayat berbeda. Anda punya 45 detik per soal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
