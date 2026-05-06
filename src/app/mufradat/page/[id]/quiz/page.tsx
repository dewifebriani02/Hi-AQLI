'use client';

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Trophy,
  Star,
  Zap as ZapIcon,
  Timer,
  Target,
  Shuffle,
  Layers
} from "lucide-react";
import Link from "next/link";
import { QuizModeSelector, QuizMode } from "@/components/mufradat/quiz-mode-selector";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabase";
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Question {
  id: number;
  arabic: string;
  correct: string;
  options: string[];
  type: 'mcq' | 'tricky' | 'scrambled' | 'reverse';
  scrambledOptions?: string[];
}

function PageQuizContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageId = params.id as string;
  const pageNum = parseInt(pageId);

  const from = searchParams.get('from');
  const surahId = searchParams.get('surahId');
  const nextVerseId = searchParams.get('nextVerseId');

  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

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
  const [hasStarted, setHasStarted] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>("runut");
  const [scrambledIndices, setScrambledIndices] = useState<number[]>([]);
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(false);
  const [allPageWords, setAllPageWords] = useState<any[]>([]);

  const { data: userData, isLoading: isUserDataLoading, refresh: userDataRefresh } = useDoc(user?.id ? "users" : null, user?.id);

  // Auth Guard
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const quizId = `mufradat_page_${pageNum}`;

  // Fetch leaderboard data (RLS will automatically filter by group)
  const { data: allAttempts, isLoading: isLeaderboardLoading, refresh: refreshLeaderboard } = useCollection("quiz_attempts", {
    filters: [
      { column: 'quiz_id', operator: '==', value: quizId }
    ],
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

  // FETCH WEEKLY PROGRESS
  const startOfWeek = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }, []);

  const weeklyProgressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'is_passed', operator: '==', value: true },
      { column: 'created_at', operator: '>=', value: startOfWeek }
    ]
  }), [user?.id, startOfWeek]);

  const { data: weeklyAttempts, refresh: refreshWeekly } = useCollection(user ? "quiz_attempts" : null, weeklyProgressOptions);

  const weeklyVerseCount = useMemo(() => {
    if (!weeklyAttempts) return 0;
    const uniqueVerses = new Set(weeklyAttempts.map(a => `${a.surah_id}:${a.verse_id}`));
    return uniqueVerses.size;
  }, [weeklyAttempts]);

  const handleShareReport = () => {
    const duration = formatTime(totalTime);
    const salutation = userData?.salutation || "Ukhti";
    const name = userData?.full_name || userData?.username || "Hamba Allah";

    const text = `*LAPORAN PROGRES HI-AQLI* 🌟\n\n` +
      `*Thalibah:* ${salutation} ${name}\n` +
      `*Hafalan:* Kuis Halaman ${pageNum} (SELESAI)\n` +
      `*Skor:* ${score}/${questions.length} (100% Sempurna!)\n` +
      `*Waktu:* ${duration}\n\n` +
      `*Pencapaian Pekan Ini:* ${weeklyVerseCount} Ayat\n` +
      `${weeklyVerseCount >= 15 ? '✅ Target 1 Halaman Pekan Ini Tercapai!' : '⏳ Sedikit lagi menuju target 1 halaman.'}\n\n` +
      `Alhamdulillah, satu langkah lebih dekat memahami Al-Qur'an! 📖✨`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleCopyReport = () => {
    const duration = formatTime(totalTime);
    const salutation = userData?.salutation || "Ukhti";
    const name = userData?.full_name || userData?.username || "Hamba Allah";

    const text = `*LAPORAN PROGRES HI-AQLI* 🌟\n\n` +
      `*Thalibah:* ${salutation} ${name}\n` +
      `*Hafalan:* Kuis Halaman ${pageNum} (SELESAI)\n` +
      `*Skor:* ${score}/${questions.length} (100% Sempurna!)\n` +
      `*Waktu:* ${duration}\n\n` +
      `*Pencapaian Pekan Ini:* ${weeklyVerseCount} Ayat\n` +
      `${weeklyVerseCount >= 15 ? '✅ Target 1 Halaman Pekan Ini Tercapai!' : '⏳ Sedikit lagi menuju target 1 halaman.'}\n\n` +
      `Alhamdulillah, satu langkah lebih dekat memahami Al-Qur'an! 📖✨`;

    navigator.clipboard.writeText(text);
    toast({ 
      title: "Laporan Disalin!", 
      description: "Silakan tempel (paste) laporan ke grup atau catatan Anda.",
      duration: 3000
    });
  };

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
          setAllPageWords(allWords);
          
          // Default: Generate first 30 sequential questions
          const selectedWords = allWords.slice(0, 30);
          const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];
          
          const generated = selectedWords.map((w: any) => {
            const correct = w.translation?.text || "???";
            const filteredDecoys = decoys.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
            return {
              id: w.id,
              arabic: w.text_uthmani,
              correct: correct,
              options: [correct, ...filteredDecoys].sort(() => Math.random() - 0.5),
              type: 'mcq' as const
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

  
  // Countdown Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !isFinished && !loading && hasStarted && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleAnswer("__timeout__");
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, isFinished, loading, hasStarted]);

  const startQuiz = (mode: QuizMode) => {
    setQuizMode(mode);
    setHasStarted(true);
    setTimerActive(true);
    setTimeLeft(10);
    
    // Process questions based on mode
    const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];

    let selectedWords = [...allPageWords];
    if (mode === "acak") {
      selectedWords = selectedWords.sort(() => Math.random() - 0.5);
    }
    
    selectedWords = selectedWords.slice(0, 30);

    const standardDecoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];
    const pool = allPageWords.map((w: any) => ({
      arabic: w.text_uthmani,
      indonesian: w.translation?.text
    })).filter(t => !!t.indonesian && t.indonesian !== "???");

    // Categorization Helpers
    const categorizeIndo = (text: string) => {
      text = text.toLowerCase();
      if (text.startsWith("maha") || text.startsWith("paling") || text.startsWith("sangat")) return "attribute";
      if (text.match(/^(me|ber|di|ter)/) || text.match(/(kan|i|lah)$/)) return "verb";
      if (text.length < 5 && ["dan", "maka", "dari", "ke", "ya", "ia", "di", "itu", "ini"].includes(text)) return "particle";
      return "noun";
    };

    const categorizeArabic = (text: string) => {
      if (text.startsWith("ال")) return "noun_definite";
      if (text.endsWith("ون") || text.endsWith("ين")) return "plural";
      if (text.length <= 2) return "particle";
      return "other";
    };

    const getSmartDecoys = (target: {arabic: string, indonesian: string}, count: number, targetType: 'arabic' | 'indonesian' = 'indonesian') => {
      if (pool.length < 5) {
        if (targetType === 'indonesian') {
          return standardDecoys.filter(d => d !== target.indonesian).sort(() => Math.random() - 0.5).slice(0, count);
        } else {
          return ["لَا", "نَعَمْ", "فِي", "مِنْ", "إِلَى", "عَلَى"].filter(d => d !== target.arabic).sort(() => Math.random() - 0.5).slice(0, count);
        }
      }

      const targetIndoCat = categorizeIndo(target.indonesian);
      const targetArabCat = categorizeArabic(target.arabic);

      return pool
        .filter(w => w.indonesian !== target.indonesian && w.arabic !== target.arabic)
        .map(w => {
          let score = 0;
          if (categorizeIndo(w.indonesian) === targetIndoCat) score += 10;
          if (categorizeArabic(w.arabic) === targetArabCat) score += 10;
          if (Math.abs(w.indonesian.length - target.indonesian.length) <= 3) score += 5;
          score += Math.random() * 5;
          return { ...w, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map(w => targetType === 'indonesian' ? w.indonesian : w.arabic);
    };

    let updated = selectedWords.map((w: any) => {
      const correct = w.translation?.text || "???";
      const smartDecoys = getSmartDecoys({ arabic: w.text_uthmani, indonesian: correct }, 3, 'indonesian');

      return {
        id: w.id,
        arabic: w.text_uthmani,
        correct: correct,
        options: [correct, ...smartDecoys].sort(() => Math.random() - 0.5),
        type: 'mcq' as const
      };
    });

    if (mode === "variasi") {
      updated = updated.map(q => {
        const rand = Math.random();
        const isScrambled = rand < 0.33 && q.correct.split(' ').length > 1;
        const isReverse = rand >= 0.33 && rand < 0.66;
        
        if (isScrambled) {
          const words = q.correct.split(' ');
          const distractors = getSmartDecoys({ arabic: q.arabic, indonesian: q.correct }, Math.max(4, 9 - words.length), 'indonesian');

          return {
            ...q,
            type: 'scrambled' as const,
            scrambledOptions: [...words, ...distractors].sort(() => Math.random() - 0.5)
          };
        } else if (isReverse) {
          const arabicDecoys = getSmartDecoys({ arabic: q.arabic, indonesian: q.correct }, 3, 'arabic');

          return {
            ...q,
            type: 'reverse' as const,
            options: [q.arabic, ...arabicDecoys].sort(() => Math.random() - 0.5)
          };
        } else {
          return {
            ...q,
            type: 'tricky' as const
          };
        }
      });
    }

    setQuestions(updated);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || isFinished) return;
    
    setSelectedAnswer(answer);
    const currentQ = questions[currentIdx];
    const correctVal = currentQ.type === 'reverse' ? currentQ.arabic : currentQ.correct;
    const isCorrectVal = answer === correctVal;
    
    setIsCorrect(isCorrectVal);
    setTimerActive(false);
    
    if (isCorrectVal) {
      playSfx('correct');
      setScore(s => s + 1);
    } else {
      setWrongWords(prev => [...prev, currentQ]);
      playSfx('fail');
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setTimerActive(true);
        setTimeLeft(10);
      } else {
        setIsFinished(true);
        const finalScore = score + (isCorrectVal ? 1 : 0);
        const finalWrongWords = isCorrectVal ? [...wrongWords] : [...wrongWords, currentQ];
        if (finalScore === questions.length) playSfx('perfect');
        saveAttempt(finalScore, finalWrongWords.map((w: any) => w.id));
      }
      setScrambledIndices([]);
    }, 1000);
  };

  const handleScrambledClick = (index: number, isSelected: boolean) => {
    if (isSelected) {
      setScrambledIndices(prev => prev.filter(i => i !== index));
    } else {
      setScrambledIndices(prev => [...prev, index]);
    }
  };

  const checkScrambled = () => {
    const currentQ = questions[currentIdx];
    const answer = scrambledIndices.map(idx => currentQ.scrambledOptions![idx]).join(' ');
    handleAnswer(answer);
  };

  const saveAttempt = async (finalScore: number, finalWrongWordIds: number[]) => {
    if (!user) return;
    await userDataRefresh();
    
    try {
      const isPassed = finalScore === questions.length;
      
      const { error: insertError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          group_id: userData?.mufradat_group_id,
          quiz_id: quizId,
          surah_id: "0", 
          verse_id: pageNum.toString(), 
          score: finalScore,
          total_questions: questions.length,
          duration_seconds: totalTime,
          is_passed: isPassed,
          wrong_words: finalWrongWordIds,
          page_id: Number(pageNum),
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      if (isPassed) {
        // 1. Calculate Streak & Points
        await userDataRefresh();
        const now = new Date();
        const lastQuizAt = userData?.last_mufradat_quiz_at ? new Date(userData.last_mufradat_quiz_at) : null;
        let newStreak = userData?.mufradat_streak_count || 0;

        if (!lastQuizAt) {
          newStreak = 1;
        } else {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const lastDate = new Date(lastQuizAt.getFullYear(), lastQuizAt.getMonth(), lastQuizAt.getDate()).getTime();
          const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) newStreak += 1;
          else if (diffDays > 1) newStreak = 1;
        }

        const pointsPerVerse = 10;
        const totalVerses = questions.length; // usually 15
        const pointsEarned = totalVerses * pointsPerVerse;

        const newWeeklyPoints = (userData?.mufradat_weekly_points || 0) + pointsEarned;
        let newLeague = userData?.mufradat_league || 'Perunggu';
        
        if (newWeeklyPoints > 1000) newLeague = 'Intan';
        else if (newWeeklyPoints > 300) newLeague = 'Emas';
        else if (newWeeklyPoints > 100) newLeague = 'Perak';

        await supabase
          .from('users')
          .update({ 
            points: (userData?.points || 0) + pointsEarned,
            mufradat_streak_count: newStreak,
            last_mufradat_quiz_at: now.toISOString(),
            mufradat_weekly_points: newWeeklyPoints,
            mufradat_league: newLeague,
            last_league_reset_at: userData?.last_league_reset_at || now.toISOString()
          })
          .eq('id', user.id);

        toast({ title: `Masyallah! +${pointsEarned} Poin`, description: "Halaman selesai & progres berhasil disimpan." });
        
        // Force refresh all data
        await userDataRefresh();
        await refreshWeekly();
      }

      refreshLeaderboard();
    } catch (e: any) {
      console.error("Gagal simpan skor:", e);
      toast({ 
        title: "Gagal menyimpan progres", 
        description: e.message || "Pastikan koneksi internet stabil.",
        variant: "destructive"
      });
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
    setHasStarted(false);
    setScrambledIndices([]);
  };

  if (loading || isUserLoading || isUserDataLoading || isLeaderboardLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest text-[#800000]">Menyiapkan Kuis & Papan Juara...</p>
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
             
             {/* WEEKLY PROGRESS SUMMARY */}
             <div className={cn(
               "p-4 rounded-2xl border-2 text-left space-y-2",
               weeklyVerseCount >= 15 ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
             )}>
                <div className="flex items-center justify-between">
                   <p className={cn("text-[10px] font-black uppercase tracking-widest", weeklyVerseCount >= 15 ? "text-emerald-600" : "text-blue-600")}>
                      Progres Pekanan
                   </p>
                   {weeklyVerseCount >= 15 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-black">{weeklyVerseCount}</span>
                   <span className="text-xs font-bold text-muted-foreground">/ 15 Ayat</span>
                </div>
                <p className="text-[10px] font-medium leading-relaxed opacity-70">
                   {weeklyVerseCount >= 15 
                     ? "Masyallah! Target minimal 1 halaman (15 ayat) pekan ini sudah tercapai. Ukhti hebat!" 
                     : `Tinggal ${15 - weeklyVerseCount} ayat lagi untuk mencapai target minimal 1 halaman pekan ini. Semangat!`}
                </p>
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
                <Button asChild variant="outline" className="w-full border-2 border-slate-200 font-bold py-6 rounded-2xl hover:bg-white bg-white text-slate-600 mb-2">
                  <Link href={from === 'surah' && surahId ? `/mufradat/${surahId}` : "/mufradat?tab=juz"}>KEMBALI KE {from === 'surah' ? 'DAFTAR AYAT' : 'DAFTAR HALAMAN'}</Link>
                </Button>

                {/* Automated WhatsApp Sharing Button - MOVED HERE & ONLY IF PERFECT */}
                <div className="w-full space-y-4 pt-4 border-t border-slate-200">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sudah cukup lelah hari ini?</p>
                    <p className="text-[9px] text-slate-400 font-medium">Istirahatlah sejenak dan bagikan pencapaian Ukhti.</p>
                  </div>
                  
                  <Button 
                    onClick={handleShareReport}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-7 rounded-2xl shadow-lg uppercase tracking-widest text-[10px] gap-3"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    BAGIKAN VIA WHATSAPP
                  </Button>

                  <Button 
                    variant="ghost"
                    onClick={handleCopyReport}
                    className="w-full text-slate-400 font-bold py-2 rounded-2xl uppercase tracking-widest text-[9px] gap-2 hover:bg-slate-50 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    SALIN LAPORAN
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button onClick={handleReset} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                   <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
                </Button>
                <Button asChild variant="ghost" className="w-full font-bold text-slate-500">
                  <Link href="/mufradat?tab=juz">KEMBALI KE DAFTAR HALAMAN</Link>
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
                            <ZapIcon className="w-3 h-3 text-[#D4AF37] fill-current" /> {item.score}/{item.total_questions}
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
          <Link href={`/mufradat/page/${pageNum}?from=juz`}><ChevronLeft className="h-6 w-6" /></Link>
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

      {!hasStarted && !isFinished ? (
        <QuizModeSelector onSelect={startQuiz} />
      ) : (
        <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
          <CardContent className="p-6 sm:p-10 text-center bg-slate-50 flex flex-col items-center gap-6 relative min-h-[400px]">
            <div className="absolute top-4 right-6 animate-in zoom-in duration-300">
               <Badge 
                 variant="outline" 
                 className={cn(
                   "font-black text-sm px-4 py-1.5 border-2 transition-all flex items-center gap-2 shadow-sm rounded-full",
                   timeLeft > 3 ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-rose-600 text-rose-600 bg-rose-50 scale-110 animate-pulse"
                 )}
               >
                 <Timer className="w-4 h-4" /> 00:{timeLeft.toString().padStart(2, '0')}
               </Badge>
            </div>
            
            {!isFinished && questions.length > 0 && (
              <div className="w-full flex-1 flex flex-col justify-center">
                {questions[currentIdx]?.type === 'scrambled' ? (
                  <div className="flex flex-col gap-6">
                    <div className="text-center space-y-2 mb-4">
                      <div className="text-6xl font-arabic text-[#800000] leading-relaxed">
                        {questions[currentIdx].arabic}
                      </div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Susun Terjemahan</p>
                    </div>

                    <div className="min-h-[60px] p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-wrap gap-2 items-center justify-center shadow-inner">
                      {scrambledIndices.length === 0 ? (
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Susun terjemahan di sini...</span>
                      ) : (
                        scrambledIndices.map((idx) => (
                          <Badge 
                            key={idx} 
                            onClick={() => handleScrambledClick(idx, true)}
                            className="bg-[#800000] text-white hover:bg-[#800000]/90 cursor-pointer py-1.5 px-3 rounded-lg text-sm transition-all animate-in zoom-in"
                          >
                            {questions[currentIdx].scrambledOptions![idx]}
                          </Badge>
                        ))
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-center">
                      {questions[currentIdx]?.scrambledOptions?.map((word, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          disabled={scrambledIndices.includes(i) || !!selectedAnswer}
                          onClick={() => handleScrambledClick(i, false)}
                          className={cn(
                            "rounded-xl border-2 transition-all",
                            scrambledIndices.includes(i) ? "opacity-30 scale-95" : "hover:border-[#800000]/30 hover:bg-[#800000]/5 bg-white"
                          )}
                        >
                          {word}
                        </Button>
                      ))}
                    </div>

                    <Button 
                      disabled={scrambledIndices.length === 0 || !!selectedAnswer}
                      onClick={checkScrambled}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 rounded-xl shadow-lg mt-4"
                    >
                      PERIKSA JAWABAN
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center justify-center gap-2 py-4 animate-in fade-in duration-700">
                      {questions[currentIdx]?.type === 'reverse' ? (
                        <div className="space-y-4 w-full">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Terjemahan:</p>
                          <div className="text-2xl sm:text-3xl font-bold text-slate-800 bg-white px-6 sm:px-8 py-6 rounded-[2rem] shadow-sm border border-slate-100 block w-full max-w-sm mx-auto break-words">
                            {questions[currentIdx]?.correct}
                          </div>
                          <p className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest mt-4">Pilih Bahasa Arabnya:</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Apa arti dari kata berikut?</p>
                           <div className="text-6xl font-arabic text-[#800000] leading-relaxed drop-shadow-sm">
                            {questions[currentIdx]?.arabic}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 w-full max-w-md mx-auto">
                      {questions[currentIdx]?.options.map((option, i) => {
                        const isCorrectOption = questions[currentIdx].type === 'reverse' 
                          ? option === questions[currentIdx].arabic 
                          : option === questions[currentIdx].correct;
                        
                        return (
                          <Button
                            key={i}
                            variant="outline"
                            size="lg"
                            className={cn(
                              "min-h-[4rem] h-auto py-4 rounded-2xl border-2 transition-all active:scale-[0.98] relative overflow-hidden group px-6",
                              questions[currentIdx]?.type === 'reverse' ? "font-arabic text-2xl sm:text-3xl min-h-[5rem]" : "text-base sm:text-lg font-bold",
                              selectedAnswer === option 
                                ? (isCorrectOption
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/20" 
                                    : "bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/20")
                                : (selectedAnswer && isCorrectOption 
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 opacity-90"
                                    : "hover:border-[#800000]/40 hover:bg-[#800000]/5 bg-white")
                            )}
                            onClick={() => handleAnswer(option)}
                            disabled={!!selectedAnswer}
                          >
                            {selectedAnswer === option && (
                              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                {isCorrectOption 
                                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-in zoom-in" />
                                  : <XCircle className="w-6 h-6 text-rose-500 animate-in zoom-in" />
                                }
                              </div>
                            )}
                            
                            <span className="flex-1 text-center whitespace-normal break-words leading-tight">{option}</span>
                            
                            {selectedAnswer === option && isCorrectOption && (
                              <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-[10px] text-muted-foreground italic">
        Pilih jawaban yang paling tepat sesuai makna dalam halaman ini.
      </p>
    </div>
  );
}

export default function MufradatPageQuizPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest text-[#800000]">Menyiapkan Kuis Halaman...</p>
      </div>
    }>
      <PageQuizContent />
    </Suspense>
  );
}
