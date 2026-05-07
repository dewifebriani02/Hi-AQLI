'use client';

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
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
  Zap as ZapIcon,
  Timer,
  Shuffle,
  Layers,
  Copy
} from "lucide-react";
import confetti from "canvas-confetti";
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
import { format } from "date-fns";
import { getJuzForPage } from "@/lib/quran-mapping";

interface Question {
  id: number;
  arabic: string;
  correct: string;
  options: string[];
  type: 'mcq' | 'tricky' | 'scrambled' | 'reverse';
  scrambledOptions?: string[]; // For 'scrambled' type
}

function MufradatQuizContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const verseId = params.verseId as string;
  const from = searchParams.get('from');
  const { user, isUserLoading } = useUser();
  const studyCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [pageVerseCounts, setPageVerseCounts] = useState<Record<number, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [wrongWords, setWrongWords] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState(1);
  const [surahInfo, setSurahInfo] = useState<{ verses_count: number } | null>(null);
  const [pageId, setPageId] = useState<number | null>(null);
  const [nextVersePage, setNextVersePage] = useState<number | null>(null);
  const [pageWords, setPageWords] = useState<{arabic: string, indonesian: string}[]>([]);
  
  // Sprint Mode states
  const [isSprintMode, setIsSprintMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>("runut");
  const [scrambledIndices, setScrambledIndices] = useState<number[]>([]);
  const [scrambledSelected, setScrambledSelected] = useState<string[]>([]);

  const { data: userData, isLoading: isUserDataLoading, refresh: userDataRefresh } = useDoc(user?.id ? "users" : null, user?.id);

  const verseKey = `${id}:${verseId}`;

  // Auth Guard: Redirect if not logged in (unless it's Al-Fatihah)
  useEffect(() => {
    if (!isUserLoading && !user && id !== '1' && id !== '112' && id !== '113' && id !== '114') {
      router.push('/login');
    }
  }, [user, isUserLoading, router, id]);

  const leaderboardOptions = useMemo(() => ({
    filters: [
      { column: 'quiz_id', operator: '==', value: `mufradat_${verseKey}` }
    ],
    orderBy: { column: 'score', ascending: false }
  }), [verseKey]);

  // Fetch leaderboard data (RLS will automatically filter by group)
  const { data: allAttempts, isLoading: isLeaderboardLoading, refresh: refreshLeaderboard } = useCollection("quiz_attempts", leaderboardOptions);

  const userIds = useMemo(() => [...new Set(allAttempts?.map(a => a.user_id) || [])], [allAttempts]);
  const usersOptions = useMemo(() => ({
    filters: [{ column: 'id', operator: 'in', value: userIds }]
  }), [userIds]);

  const { data: leaderboardUsers } = useCollection(userIds.length > 0 ? "users" : null, usersOptions);

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

  // Fetch verse counts for each page in weekly progress
  useEffect(() => {
    if (!weeklyAttempts) return;
    const uniquePageIds = [...new Set(weeklyAttempts.map(a => a.page_id).filter(id => !!id))];
    
    uniquePageIds.forEach(async (pId) => {
      if (pageVerseCounts[pId]) return;
      try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pId}?fields=id`);
        const data = await res.json();
        if (data.verses) {
          setPageVerseCounts(prev => ({ ...prev, [pId]: data.verses.length }));
        }
      } catch (e) {
        console.error(`Failed to fetch verse count for page ${pId}:`, e);
      }
    });
  }, [weeklyAttempts]);

  const weeklyPageProgress = useMemo(() => {
    if (!weeklyAttempts) return 0;
    
    // Group unique verses by page_id
    const versesByPage = new Map<number, Set<string>>();
    const completedPagesInWeek = new Set<number>();

    weeklyAttempts.forEach(a => {
      if (a.quiz_id?.startsWith('mufradat_page_')) {
        const pageId = a.page_id || a.quiz_id.replace('mufradat_page_', '');
        if (pageId) completedPagesInWeek.add(Number(pageId));
      } else {
        if (!a.page_id) return;
        if (!versesByPage.has(a.page_id)) versesByPage.set(a.page_id, new Set());
        versesByPage.get(a.page_id)!.add(`${a.surah_id}:${a.verse_id}`);
      }
    });

    let totalProgress = 0;
    const allUniquePageIds = new Set([...versesByPage.keys(), ...completedPagesInWeek]);

    allUniquePageIds.forEach(pId => {
      if (completedPagesInWeek.has(pId)) {
        totalProgress += 1;
      } else {
        const verses = versesByPage.get(pId);
        const totalOnPage = pageVerseCounts[pId] || 15;
        totalProgress += Math.min((verses?.size || 0) / totalOnPage, 1);
      }
    });

    return Math.min(totalProgress, 5); 
  }, [weeklyAttempts, pageVerseCounts]);

  const weeklyVerseCount = Math.round(weeklyPageProgress * 10) / 10; // For backward compatibility/display if needed

  const uniqueLeaderboard = useMemo(() => {
    if (!allAttempts) return [];
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
      if (!id || !verseId) return;
      try {
        setLoading(true);
        // Parallel fetch for Surah and Verse data
        const [surahRes, vRes] = await Promise.all([
          fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`),
          fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${verseId}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&fields=page_number`)
        ]);

        const [surahData, data] = await Promise.all([surahRes.json(), vRes.json()]);
        
        setSurahInfo(surahData.chapter);
        
        if (data && data.verse && data.verse.words) {
          setPageId(data.verse.page_number);
          const words = data.verse.words.filter((w: any) => w.char_type_name === 'word');
          
          // Simple "decoy" translations for multi-choice
          const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus"];
          
          const generated = words.map((w: any, idx: number) => {
            const correct = w.translation?.text || "???";
            const filteredDecoys = decoys.filter(d => d !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
            
            // Default type is mcq
            return {
              id: w.id,
              arabic: w.text_uthmani,
              correct: correct,
              options: [correct, ...filteredDecoys].sort(() => Math.random() - 0.5),
              type: 'mcq' as const
            };
          });
          
          setQuestions(generated);

          // Fetch next verse metadata to check for page break
          const nextV = parseInt(verseId) + 1;
          const nextPromise = surahData.chapter && nextV <= surahData.chapter.verses_count
            ? fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${nextV}?fields=page_number`).then(r => r.json())
            : Promise.resolve(null);

          // Fetch all words in this page for contextual decoys
          const pageWordsPromise = fetch(`https://api.quran.com/api/v4/verses/by_page/${data.verse.page_number}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`)
            .then(r => r.json());

          const [nextData, pageData] = await Promise.all([nextPromise, pageWordsPromise]);

          if (nextData && nextData.verse) {
            setNextVersePage(nextData.verse.page_number);
          }

          if (pageData && pageData.verses) {
            const allPageWords = pageData.verses.flatMap((v: any) => 
               v.words.filter((w: any) => w.char_type_name === 'word').map((w: any) => ({
                 arabic: w.text_uthmani,
                 indonesian: w.translation?.text
               }))
            ).filter((t: any) => !!t.indonesian && t.indonesian !== "???");
            setPageWords(allPageWords);
          }
        }
      } catch (err) {
        console.error("Quiz Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [id, verseId]);

  // Main Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && (user || id === '1' || id === '112' || id === '113' || id === '114')) {
      interval = setInterval(() => setTotalTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, user, id]);

  // Timer Countdown logic (Now applies to all modes)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !isFinished && !loading && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      // Time's up! Handle as wrong answer
      handleAnswer("__timeout__");
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, isFinished, loading]);

  const startQuiz = (mode: QuizMode) => {
    setQuizMode(mode);
    setHasStarted(true);
    setTimerActive(true);
    setTimeLeft(10); // Standard 10s for ALL questions

    const standardDecoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];
    
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
      if (pageWords.length < 5) {
        if (targetType === 'indonesian') {
          return standardDecoys.filter(d => d !== target.indonesian).sort(() => Math.random() - 0.5).slice(0, count);
        } else {
          return ["لَا", "نَعَمْ", "فِي", "مِنْ", "إِلَى", "عَلَى"].filter(d => d !== target.arabic).sort(() => Math.random() - 0.5).slice(0, count);
        }
      }

      const targetIndoCat = categorizeIndo(target.indonesian);
      const targetArabCat = categorizeArabic(target.arabic);

      return pageWords
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

    // Apply Mode effects to questions
    setQuestions(prev => {
      let updated = [...prev];
      
      if (mode === "runut") {
        updated = updated.map(q => {
          const smartDecoys = getSmartDecoys({ arabic: q.arabic, indonesian: q.correct }, 3, 'indonesian');
          return {
            ...q,
            options: [q.correct, ...smartDecoys].sort(() => Math.random() - 0.5),
            type: 'mcq' as const
          };
        });
      } else if (mode === "acak") {
        updated = updated.sort(() => Math.random() - 0.5).map(q => {
          const smartDecoys = getSmartDecoys({ arabic: q.arabic, indonesian: q.correct }, 3, 'indonesian');
          return {
            ...q,
            options: [q.correct, ...smartDecoys].sort(() => Math.random() - 0.5),
            type: 'mcq' as const
          };
        });
      } else if (mode === "variasi") {
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
            const smartDecoys = getSmartDecoys({ arabic: q.arabic, indonesian: q.correct }, 3, 'indonesian');
            return {
              ...q,
              type: 'tricky' as const,
              options: [q.correct, ...smartDecoys].sort(() => Math.random() - 0.5)
            };
          }
        });
      }
      return updated;
    });
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || isFinished) return;
    
    const currentQ = questions[currentIdx];
    const correctVal = currentQ.type === 'reverse' ? currentQ.arabic : currentQ.correct;
    const isCorrectVal = answer === correctVal;
    
    setSelectedAnswer(answer);
    setIsCorrect(isCorrectVal);
    setTimerActive(false); // Pause countdown
    
    if (isCorrectVal) {
      playSfx('correct');
      setScore(s => s + 1);
    } else {
      if (answer === "__timeout__") {
        toast({ title: "WAKTU HABIS!", variant: "destructive", duration: 1000 });
      }
      playSfx('incorrect');
      setWrongWords(prev => [...prev, currentQ]);
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setTimeLeft(10); // Reset countdown for next question
        setTimerActive(true); // Restart timer for next question
      } else {
        setIsFinished(true);
        const finalScore = score + (isCorrectVal ? 1 : 0);
        const finalWrongWords = isCorrectVal ? [...wrongWords] : [...wrongWords, currentQ];
        
        if (finalScore === questions.length) {
          playSfx('perfect');
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#800000', '#D4AF37', '#ffffff']
          });
        }
        else playSfx('fail');
        
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
    
    // Refresh user data right before calculation to minimize stale data
    await userDataRefresh();
    
    try {
      const isPassed = finalScore === questions.length;
      
      const { error: insertError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          group_id: userData?.mufradat_group_id,
          quiz_id: `mufradat_${verseKey}`,
          surah_id: id,
          verse_id: verseId,
          score: finalScore,
          total_questions: questions.length,
          duration_seconds: totalTime,
          is_passed: isPassed,
          wrong_words: finalWrongWordIds,
          page_id: pageId,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // --- MABAR SCORING LOGIC ---
      if (isPassed && pageId) {
        const currentJuz = getJuzForPage(pageId);
        const { data: activeMabar } = await supabase
          .from('mufradat_mabar_sessions')
          .select('id')
          .eq('status', 'active')
          .eq('juz_id', currentJuz)
          .maybeSingle();

        if (activeMabar) {
          const { data: participant } = await supabase
            .from('mufradat_mabar_participants')
            .select('points_earned')
            .eq('session_id', activeMabar.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (participant) {
            await supabase
              .from('mufradat_mabar_participants')
              .update({ 
                points_earned: (participant.points_earned || 0) + 10,
                last_activity_at: new Date().toISOString()
              })
              .eq('session_id', activeMabar.id)
              .eq('user_id', user.id);
          }
        }
      }

      // --- STREAK & POINTS LOGIC ---
      if (isPassed) {
        // 1. Calculate Streak
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

        // 2. Update Profile (Points + Streak + Weekly League)
        const newWeeklyPoints = (userData?.mufradat_weekly_points || 0) + 10;
        let newLeague = userData?.mufradat_league || 'Perunggu';
        
        if (newWeeklyPoints > 1000) newLeague = 'Intan';
        else if (newWeeklyPoints > 300) newLeague = 'Emas';
        else if (newWeeklyPoints > 100) newLeague = 'Perak';

        if (newLeague !== userData?.mufradat_league) {
          toast({ 
            title: `NAIK KASTA: ${newLeague.toUpperCase()}!`, 
            description: "Masyallah! Ukhti naik ke liga yang lebih tinggi.", 
            duration: 5000 
          });
        }

        await supabase
          .from('users')
          .update({ 
            points: (userData?.points || 0) + 10,
            mufradat_streak_count: newStreak,
            last_mufradat_quiz_at: now.toISOString(),
            mufradat_weekly_points: newWeeklyPoints,
            mufradat_league: newLeague,
            last_league_reset_at: userData?.last_league_reset_at || now.toISOString()
          })
          .eq('id', user.id);

        // Force refresh all data dependencies
        await userDataRefresh();
        await refreshWeekly();
        refreshLeaderboard();

        // 3. --- BADGE AWARD LOGIC ---
        const awardBadge = async (type: string, title: string, icon: string) => {
           const { data: existing } = await supabase.from('user_badges').select('id').eq('user_id', user.id).eq('badge_type', type).maybeSingle();
           if (!existing) {
             await supabase.from('user_badges').insert({ user_id: user.id, badge_type: type });
             toast({ 
               title: `LENCANA BARU: ${title}`, 
               description: "Masyallah! Ukhti mendapatkan penghargaan baru.", 
               duration: 5000 
             });
           }
        };

        // Check Streak Badge
        if (newStreak >= 7) await awardBadge('streak_7', 'Pejuang Konsisten (7 Hari)', '🔥');
        
        // Check Subuh Warrior (04:00 - 06:00)
        const hour = now.getHours();
        if (hour >= 4 && hour < 6) await awardBadge('subuh_warrior', 'Bintang Subuh', '🌅');

        // Check Total Passed (Ahli Mufradat)
        const { count } = await supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_passed', true);
        if ((count || 0) >= 100) await awardBadge('hafidzah_100', 'Ahli Mufradat (100 Kuis)', '🎓');
        
        toast({ 
          title: "Masyallah! +10 Poin", 
          description: newStreak > 1 
            ? `Konsistensi Ukhti hari ini: ${newStreak} HARI 🔥` 
            : "Progres hafalan berhasil disimpan." 
        });
      }
      // --- END STREAK & BADGE LOGIC ---

      // Refresh leaderboard after save
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

  const handleShareReport = () => {
    const accuracy = Math.round((score / questions.length) * 100);
    const duration = formatTime(totalTime);
    const salutation = userData?.salutation || "Ukhti";
    const name = userData?.full_name || userData?.username || "Hamba Allah";
    const surahName = (surahInfo as any)?.name_simple || "Surah";

    const text = `*LAPORAN PROGRES HI-AQLI* 🌟\n\n` +
      `*Thalibah:* ${salutation} ${name}\n` +
      `*Hafalan:* Surah ${surahName} Ayat ${verseId}\n` +
      `*Skor:* ${score}/${questions.length} (100% Sempurna!)\n` +
      `*Waktu:* ${duration}\n\n` +
      `*Pencapaian Pekan Ini:* ${weeklyVerseCount} Halaman\n` +
      `${weeklyPageProgress >= 1 ? '✅ Target 1 Halaman Pekan Ini Tercapai!' : '⏳ Sedikit lagi menuju target 1 halaman.'}\n\n` +
      `Alhamdulillah, satu langkah lebih dekat memahami Al-Qur'an! 📖✨`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleCopyReport = () => {
    const accuracy = Math.round((score / questions.length) * 100);
    const duration = formatTime(totalTime);
    const salutation = userData?.salutation || "Ukhti";
    const name = userData?.full_name || userData?.username || "Hamba Allah";
    const surahName = (surahInfo as any)?.name_simple || "Surah";

    const text = `*LAPORAN PROGRES HI-AQLI* 🌟\n\n` +
      `*Thalibah:* ${salutation} ${name}\n` +
      `*Hafalan:* Surah ${surahName} Ayat ${verseId}\n` +
      `*Skor:* ${score}/${questions.length} (100% Sempurna!)\n` +
      `*Waktu:* ${duration}\n\n` +
      `*Pencapaian Pekan Ini:* ${weeklyVerseCount} Halaman\n` +
      `${weeklyPageProgress >= 1 ? '✅ Target 1 Halaman Pekan Ini Tercapai!' : '⏳ Sedikit lagi menuju target 1 halaman.'}\n\n` +
      `Alhamdulillah, satu langkah lebih dekat memahami Al-Qur'an! 📖✨`;

    navigator.clipboard.writeText(text);
    toast({ 
      title: "Laporan Disalin!", 
      description: `Silakan tempel (paste) laporan ke grup atau catatan ${salutation}.`,
      duration: 3000
    });
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
    setTimeLeft(10);
    setHasStarted(false);
    setTimerActive(false);
  };

  if (loading || isUserLoading || isUserDataLoading || isLeaderboardLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium text-sm uppercase tracking-widest">Menyiapkan Kuis & Papan Juara...</p>
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
            {isPerfect && (
              <div className="absolute top-4 right-4 animate-pulse">
                <Badge className="bg-white text-orange-600 font-black border-none">+10 POIN</Badge>
              </div>
            )}
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">
              {isPerfect ? "Masyallah Sempurna!" : "Alhamdulillah Selesai"}
            </h2>
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
             
             {/* WEEKLY PROGRESS SUMMARY */}
             <div className={cn(
               "p-4 rounded-2xl border-2 text-left space-y-2",
               weeklyPageProgress >= 1 ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
             )}>
                <div className="flex items-center justify-between">
                   <p className={cn("text-[10px] font-black uppercase tracking-widest", weeklyPageProgress >= 1 ? "text-emerald-600" : "text-blue-600")}>
                      Progres Pekanan
                   </p>
                   {weeklyPageProgress >= 1 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-black">{weeklyVerseCount}</span>
                   <span className="text-xs font-bold text-muted-foreground">/ 1 Halaman</span>
                </div>
                <p className="text-[10px] font-medium leading-relaxed opacity-70">
                   {weeklyPageProgress >= 1 
                     ? "Masyallah! Target minimal 1 halaman pekan ini sudah tercapai. Ukhti hebat!" 
                     : `Tinggal ${(1 - weeklyPageProgress).toFixed(1)} halaman lagi untuk mencapai target minimal 1 halaman pekan ini. Semangat!`}
                </p>
             </div>
          </CardContent>
          {wrongWords.length > 0 && (
            <div className="px-8 pb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Salah ({wrongWords.length})</span>
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
                {surahInfo && parseInt(verseId) < surahInfo.verses_count ? (
                  <div className="flex flex-col gap-3 w-full">
                    <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-[0.1em] text-[10px] gap-2 border-b-4 border-black/10 transition-all active:translate-y-1 active:border-b-0">
                      <Link href={`/mufradat/${id}/${parseInt(verseId) + 1}/quiz${from ? `?from=${from}&` : '?'}success=true`}>
                        <ZapIcon className="w-4 h-4 fill-current" /> LANGSUNG KUIS AYAT {parseInt(verseId) + 1}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-7 rounded-2xl uppercase tracking-widest text-[10px] gap-2 hover:bg-[#800000]/5 transition-all">
                      <Link href={`/mufradat/${id}/${parseInt(verseId) + 1}${from ? `?from=${from}&` : '?'}success=true`}>
                        TADABBUR AYAT {parseInt(verseId) + 1} <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="w-full p-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100 mb-2">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Ma Syaa Allah!</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Anda telah menyelesaikan surat ini.</p>
                  </div>
                )}
                
                {!user && (
                    <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                        <Link href={`/register?redirectTo=/mufradat/${id}/${verseId}`}>
                            <Trophy className="w-4 h-4" /> DAFTAR UNTUK SIMPAN SKOR
                        </Link>
                    </Button>
                )}

                <Button asChild variant="outline" className="w-full border-2 border-slate-200 font-bold py-6 rounded-2xl hover:bg-white bg-white text-slate-600 mb-2">
                  <Link href={from === 'surah' ? `/mufradat/${id}` : "/mufradat"}>KEMBALI KE {from === 'surah' ? 'DAFTAR AYAT' : 'DAFTAR SURAT'}</Link>
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
                    <Copy className="w-3 h-3" />
                    SALIN LAPORAN
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button onClick={handleReset} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                   <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
                </Button>
                
                {!user && (
                    <Button asChild variant="outline" className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-7 rounded-2xl uppercase tracking-widest text-[10px] gap-2">
                        <Link href="/register">
                            DAFTAR AKUN HI AQLI
                        </Link>
                    </Button>
                )}

                <Button asChild variant="ghost" className="w-full font-bold text-slate-500">
                  <Link href={from === 'surah' ? `/mufradat/${id}` : "/mufradat"}>KEMBALI KE {from === 'surah' ? 'DAFTAR AYAT' : 'DAFTAR SURAT'}</Link>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        {/* PAPAN JUARA (LEADERBOARD) */}
        <div className="space-y-4 py-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-xs font-black font-headline uppercase tracking-widest text-slate-700">Papan Juara Ayat Ini</h3>
            </div>
            <Badge variant="outline" className="text-[9px] font-black border-[#D4AF37]/30 text-[#D4AF37] bg-white px-2">TOP 5 PEJUANG</Badge>
          </div>

          <Card className="border-none shadow-lg overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {uniqueLeaderboard && uniqueLeaderboard.length > 0 ? uniqueLeaderboard.map((item: any, idx: number) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm",
                        idx === 0 ? "bg-amber-100 text-amber-700" : 
                        idx === 1 ? "bg-slate-100 text-slate-700" : 
                        idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                      )}>
                        {idx + 1}
                      </div>
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                        <AvatarImage src={item.userData?.photoURL} />
                        <AvatarFallback className="bg-[#800000] text-white text-xs font-black uppercase">
                          {item.userData?.username?.[0] || item.userData?.email?.[0] || 'U'}
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
                             {formatTime(item.duration_seconds || 0)}s
                          </span>
                        </div>
                      </div>
                    </div>
                    {idx === 0 && <Star className="w-4 h-4 fill-current text-amber-400 shrink-0" />}
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-400 italic text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 opacity-20" />
                    Belum ada pejuang kuis di ayat ini.
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
          <Link href={`/mufradat/${id}/${verseId}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Kuis Mufradat</h1>
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
        <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white relative">
          {/* SPRINT TIMER OVERLAY */}
          {isSprintMode && timerActive && (
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 z-10">
               <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    timeLeft > 5 ? "bg-orange-500" : "bg-rose-600"
                  )}
                  style={{ width: `${(timeLeft / 10) * 100}%` }}
               />
            </div>
          )}

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
        Pilih jawaban yang paling tepat sesuai makna dalam ayat ini.
      </p>
    </div>
  );
}

export default function MufradatQuizPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium text-sm uppercase tracking-widest">Menyiapkan Kuis...</p>
      </div>
    }>
      <MufradatQuizContent />
    </Suspense>
  );
}
