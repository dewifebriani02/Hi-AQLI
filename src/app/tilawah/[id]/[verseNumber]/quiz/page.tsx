"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  GraduationCap,
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
  ArrowRight,
  Target,
  BookOpen
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
import { useCollection } from "@/supabase/db";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/supabase/non-blocking-updates";
import { useMemo } from "react";

interface WordData {
  id: number;
  text_uthmani: string;
  translation: {
    text: string;
  };
}

export default function WordQuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const verseNumber = params.verseNumber as string;
  const currentVerseNum = parseInt(verseNumber);
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [words, setWords] = useState<WordData[]>([]);
  const [totalVerses, setTotalVerses] = useState(0);
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
  const [timeLeft, setTimeLeft] = useState(60);
  const [sentCongrats, setSentCongrats] = useState<string[]>([]);
  const [optimisticAttempt, setOptimisticAttempt] = useState<any>(null);

  // Fetch user's completed verses count to show murajaah link
  const userProgressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'surahId', operator: '==', value: id },
      { column: 'isPassed', operator: '==', value: true }
    ]
  }), [user?.id, id]);

  const { data: userProgress } = useCollection("quiz_attempts", userProgressOptions);
  const completedVerseCount = useMemo(() => {
    if (!userProgress) return 0;
    return new Set(userProgress.map(p => p.verseNumber)).size;
  }, [userProgress]);

  // Menggunakan data kuis untuk memastikan user unik di leaderboard per kuis
  const { data: allAttempts, isLoading: isLeaderboardLoading } = useCollection("quiz_attempts", {
    filters: [
      { column: 'quizId', operator: '==', value: `verse_${id}_${verseNumber}` }
    ],
    orderBy: { column: 'score', ascending: false }
  });

  // Combine server data with optimistic update for real-time leaderboard
  const combinedAttempts = useMemo(() => {
    if (!allAttempts) return [];
    if (!optimisticAttempt) return allAttempts;

    // Check if optimistic attempt already exists in server data
    const exists = allAttempts.some(a => a.id === optimisticAttempt.id);
    if (exists) return allAttempts;

    // Add optimistic attempt to the beginning
    return [optimisticAttempt, ...allAttempts];
  }, [allAttempts, optimisticAttempt]);

  // Fetch user details for the leaderboard manually to ensure we have names and photos
  const userIds = useMemo(() => [...new Set(combinedAttempts?.map(a => a.user_id) || [])], [combinedAttempts]);
  const { data: leaderboardUsers } = useCollection(userIds.length > 0 ? "users" : null, {
    filters: [{ column: 'id', operator: 'in', value: userIds }]
  });

  const uniqueLeaderboard = useMemo(() => {
    if (!combinedAttempts) return [];
    
    const uniqueMap = new Map();
    combinedAttempts.forEach(attempt => {
      const existing = uniqueMap.get(attempt.user_id);
      
      // Hitung jumlah percobaan
      const attemptCount = (existing?.attemptCount || 0) + 1;
      
      // Update jika ini adalah percobaan terbaik (skor tertinggi, atau skor sama tapi waktu lebih cepat)
      const isNewBest = !existing || 
        attempt.score > existing.score || 
        (attempt.score === existing.score && (attempt.durationSeconds < existing.durationSeconds));

      if (isNewBest) {
        const userData = leaderboardUsers?.find(u => u.id === attempt.user_id);
        uniqueMap.set(attempt.user_id, {
          ...attempt,
          userData,
          attemptCount: 1 // Akan diupdate di akhir loop
        });
      }
    });

    // Update real attempt counts
    const finalCounts = new Map();
    combinedAttempts.forEach(a => finalCounts.set(a.user_id, (finalCounts.get(a.user_id) || 0) + 1));

    return Array.from(uniqueMap.values())
      .map(item => ({ ...item, attemptCount: finalCounts.get(item.user_id) }))
      .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds)
      .slice(0, 5);
  }, [combinedAttempts, leaderboardUsers]);

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

  const fetchWordsAndSurah = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`
      );
      if (!res.ok) throw new Error("Gagal memuat data ayat.");
      const data = await res.json();
      const validWords = data.verse.words.filter((w: any) => w.text_uthmani && w.translation.text);
      setWords(validWords);

      const sRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
      const sData = await sRes.json();
      setTotalVerses(sData.chapter.verses_count);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, verseNumber]);

  useEffect(() => {
    if (user) {
      fetchWordsAndSurah();
    }
  }, [fetchWordsAndSurah, user]);

  const saveProgress = useCallback(async (finalScore: number) => {
    if (!user) return;
    const isPerfect = finalScore === words.length;

    // Generate optimistic attempt ID for immediate leaderboard update
    const optimisticId = `optimistic_${Date.now()}_${user.id}`;

    // Optimistic update: add to leaderboard immediately
    setOptimisticAttempt({
      id: optimisticId,
      user_id: user.id,
      quizId: `verse_${id}_${verseNumber}`,
      surahId: id,
      verseNumber: parseInt(verseNumber),
      score: finalScore,
      totalQuestions: words.length,
      isPassed: isPerfect,
      durationSeconds: totalTime,
      created_at: new Date().toISOString(),
    });

    try {
      addDocumentNonBlocking("quiz_attempts", {
        user_id: user.id,
        quizId: `verse_${id}_${verseNumber}`,
        surahId: id,
        verseNumber: parseInt(verseNumber),
        score: finalScore,
        totalQuestions: words.length,
        isPassed: isPerfect,
        durationSeconds: totalTime,
        created_at: new Date().toISOString(),
      });

      if (isPerfect) {
        // Gunakan maybeSingle agar tidak 404/406 jika user baru tapi belum ada di tabel public.users
        const { data: uData } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .maybeSingle();
        
        const currentPoints = uData?.points || 0;

        updateDocumentNonBlocking("users", user.id, {
          points: currentPoints + 10,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Gagal menyimpan progres kuis:", e);
    }
  }, [user, id, verseNumber, words.length, totalTime]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;

    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const currentWord = words[currentIdx];
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
            description: "Satu soal maksimal 1 menit.",
          });
        }, 0);
      }
    }

    setTimeout(() => {
      if (currentIdx + 1 < words.length) {
        // CRITICAL FIX: Reset selection state BEFORE incrementing index to clear UI indicators
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinished(true);
        if (nextScore === words.length) {
          playSfx('perfect');
        } else {
          playSfx('fail');
        }
        saveProgress(nextScore);
      }
    }, 1200);
  }, [selectedAnswer, words, currentIdx, score, playSfx, toast, saveProgress]);

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
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && !selectedAnswer && user) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, selectedAnswer, user]);

  useEffect(() => {
    if (timeLeft === 0 && !selectedAnswer && !isFinished && !loading && user) {
      handleAnswer("");
    }
  }, [timeLeft, selectedAnswer, isFinished, loading, handleAnswer, user]);

  useEffect(() => {
    if (words.length > 0 && currentIdx < words.length) {
      // Secondary reset safety check
      setSelectedAnswer(null);
      setIsCorrect(null);
      setTimeLeft(60);

      const currentWord = words[currentIdx];
      const correct = currentWord.translation.text;

      // Acak jawaban dengan benar
      let wrong = words
        .filter(w => w.translation.text !== correct)
        .map(w => w.translation.text);

      wrong = [...new Set(wrong)].sort(() => Math.random() - 0.5).slice(0, 3);
      // Shuffle semua opsi termas jawaban benar
      const all = [correct, ...wrong].sort(() => Math.random() - 0.5);
      setOptions(all);
    }
  }, [words, currentIdx]);

  const handleReset = () => {
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAttempts(a => a + 1);
    setTotalTime(0);
    setTimeLeft(60);
    setSentCongrats([]);
    setOptimisticAttempt(null); // Clear optimistic attempt on retry
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

  if (isUserLoading || (loading && user)) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground font-medium">Menyiapkan Kuis Hafalan...</p>
      </div>
    );
  }

  if (!user) return null;

  if (error || words.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>Tidak dapat memuat kuis.</AlertDescription>
        </Alert>
        <Button asChild variant="outline"><Link href={`/tilawah/${id}/${verseNumber}`}>Kembali</Link></Button>
      </div>
    );
  }

  if (isFinished) {
    const isPerfect = score === words.length;
    const percentage = Math.round((score / words.length) * 100);

    return (
      <div className="max-w-md mx-auto py-10 flex flex-col gap-10 pb-32 px-4 sm:px-0">
        <Card className="text-center border-[#D4AF37]/20 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className={cn(
            "p-8 flex flex-col items-center gap-4 text-white transition-colors duration-500",
            isPerfect ? "bg-[#D4AF37]" : "bg-rose-900"
          )}>
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-bold font-headline">
              {isPerfect ? "Hafalan Sempurna!" : "Belum Sempurna"}
            </h2>
            {isPerfect && <Badge className="bg-white text-black font-black">+10 POIN HI AQLI</Badge>}
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
                  <RotateCcw className="h-4 w-4 text-rose-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Target Harus 100%</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Silakan ulangi kuis hingga Anda benar-benar hafal seluruh arti kata dalam ayat ini untuk membuka ayat selanjutnya dan mendapatkan poin.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Berhasil!</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Masyallah! Anda telah menguasai ayat ini. Poin Anda telah bertambah. Teruslah ber-Itqan!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            {isPerfect ? (
              <div className="flex flex-col gap-3 w-full">
                {currentVerseNum < totalVerses && (
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-14 rounded-2xl shadow-xl gap-2 uppercase tracking-widest">
                    <Link href={`/tilawah/${id}/${currentVerseNum + 1}`}>
                      LANJUT KE AYAT {currentVerseNum + 1} <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                )}
                {/* Murajaah link: show when completed at least 5 verses */}
                {completedVerseCount >= 5 && (
                  <Button asChild className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#C4A030] hover:to-[#A67B00] text-white font-black h-12 rounded-xl shadow-lg gap-2">
                    <Link href={`/tilawah/${id}/murajaah`}>
                      <Target className="w-4 h-4" /> KUIS MURAJAAH (30 KATA)
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full border-2 border-black hover:bg-black/5 text-black font-bold h-12">
                  <Link href={`/tilawah/${id}`}>KEMBALI KE DAFTAR SURAT</Link>
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

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Papan Juara Global</h3>
            </div>
            <Badge variant="outline" className="text-[8px] font-bold border-[#D4AF37]/30 text-[#D4AF37]">TOP 5</Badge>
          </div>

          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="p-0">
              <div className="divide-y text-left">
                {uniqueLeaderboard && uniqueLeaderboard.length > 0 ? uniqueLeaderboard.map((item, idx) => (
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
                            <Zap className="w-2.5 h-2.5 text-[#D4AF37]" /> {item.score}/{item.totalQuestions} Benar
                          </span>
                          <span className="text-[8px] text-muted-foreground italic">
                            ({formatTime(item.durationSeconds || item.duration_seconds || 0)})
                          </span>
                          <Badge variant="outline" className="text-[7px] h-3 px-1 border-[#800000]/20 text-[#800000] font-bold">
                            {item.attemptCount}x Coba
                          </Badge>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[7px] h-3 px-1 font-black">
                            {item.userData?.points || 0} TOTAL POIN
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
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-muted-foreground italic text-xs">Belum ada pejuang Itqan di ayat ini.</div>
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
          <Link href={`/tilawah/${id}/${verseNumber}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Uji Hafalan Kata</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</span>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-colors duration-300",
          timeLeft <= 10 ? "border-rose-500 bg-rose-50 text-rose-600 animate-pulse" : "border-muted bg-muted/50 text-muted-foreground"
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm font-black font-mono">{timeLeft}s</span>
        </div>
      </div>

      <Progress value={((currentIdx + 1) / words.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-10 pt-12 bg-muted/10 relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Pilih Arti yang Tepat:</div>
          <div className="text-6xl md:text-8xl font-arabic leading-relaxed text-[#B8860B]">{words[currentIdx]?.text_uthmani}</div>
          <div className="absolute top-4 right-4 text-[9px] font-bold text-muted-foreground">KATA {currentIdx + 1} / {words.length}</div>
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
                selectedAnswer && option === words[currentIdx]?.translation?.text && isCorrect === false && "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20",
                !selectedAnswer && "hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 hover:text-[#B8860B] focus-visible:border-[#D4AF37] focus-visible:bg-[#D4AF37]/5"
              )}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span className="truncate">{option}</span>
                {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                {selectedAnswer === option && isCorrect === false && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                {selectedAnswer && option === words[currentIdx]?.translation?.text && isCorrect === false && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground italic">
        Selesaikan setiap kata dalam kurang dari 60 detik. Fokus pada hubungan makna dan bunyi.
      </p>
    </div>
  );
}
