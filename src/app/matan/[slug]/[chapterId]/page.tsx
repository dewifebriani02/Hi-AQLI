'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  BookOpen, 
  Zap, 
  Sparkles, 
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Map as MapIcon,
  ChevronRight,
  Play,
  Pause,
  Timer,
  Trophy,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { useUser, db, useCollection, useDoc } from '@/db';
import {
  AJURUMIYAH_CHAPTERS,
  getMatanChapterById,
  getMatanChapterNavigation,
  isMatanChapterCompleted,
  MatanItem,
  MatanQuiz,
} from '@/lib/matan-data';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function MatanChapterReader() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const slug = params.slug as string;
  const chapterId = params.chapterId as string;

  const isUuidChapter = UUID_RE.test(chapterId || '');

  const { data: chapterDoc } = useDoc(
    isUuidChapter ? "matan_chapters" : null,
    isUuidChapter ? chapterId : null
  );

  const itemsOptions = useMemo(() => ({
    filters: [{ column: 'chapter_id', operator: '==', value: chapterId }],
    orderBy: { column: 'item_number', ascending: true },
  }), [chapterId]);

  const { data: dbItems, isLoading: isItemsLoading } = useCollection<any>(
    isUuidChapter ? "matan_items" : null,
    itemsOptions
  );

  const progressOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
  }), [user?.id]);

  const { data: currentProgress, refresh: refreshProgress } = useCollection(user ? "matan_user_progress" : null, progressOptions);
  const { data: userQuizAttempts, refresh: refreshUserAttempts } = useCollection(user ? "quiz_attempts" : null, progressOptions);

  const [activeItem, setActiveItem] = useState(0);
  const [showSyarah, setShowSyarah] = useState(false);

  // Quiz States
  const [quizStage, setQuizStage] = useState<'start' | 'playing' | 'result'>('start');
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([]);
  const [isSprintMode, setIsSprintMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const quizTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fallbackChapter = useMemo(
    () => getMatanChapterById(chapterId) || AJURUMIYAH_CHAPTERS[0],
    [chapterId]
  );

  const { prev: prevChapter, next: nextChapter, totalChapters } = useMemo(
    () => getMatanChapterNavigation(chapterId),
    [chapterId]
  );

  // Reset state when chapter changes
  useEffect(() => {
    setActiveItem(0);
    setShowSyarah(false);
    setQuizStage('start');
    setCurrentQuizIdx(0);
    setScore(0);
    setWrongAnswers([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimerActive(false);
  }, [chapterId]);

  const effectiveItems: MatanItem[] = useMemo(() => {
    if (dbItems && dbItems.length > 0) {
      return dbItems.map((raw: any) => {
        const arabicText = raw.bait_arabic || raw.arabic || '';
        const translationText = raw.translation || '';
        const syarah = raw.syarah_text || `
          <p class="mb-3">Perhatikan susunan lafazh matan berikut:</p>
          <p class="font-bold text-slate-900 mb-3">${arabicText}</p>
          <p>${translationText || 'Pelajari makna kaidah di atas dengan saksama sebelum melanjutkan ke latihan pemahaman.'}</p>
        `;
        const fallbackQuizzes: MatanQuiz[] = Array.isArray(raw.quizzes) && raw.quizzes.length > 0
          ? raw.quizzes
          : fallbackChapter.items[0].quizzes;
        return {
          ...raw,
          bait_arabic: arabicText,
          translation: translationText,
          syarah_text: syarah,
          quizzes: fallbackQuizzes,
        };
      });
    }
    return fallbackChapter.items;
  }, [dbItems, fallbackChapter]);

  const item: MatanItem = effectiveItems[activeItem] || fallbackChapter.items[0];
  const quizzes = Array.isArray(item.quizzes) ? item.quizzes : [];
  const chapterTitle = chapterDoc?.title || fallbackChapter.title;
  const chapterStepLabel =
    chapterDoc?.chapter_number ??
    (chapterDoc?.order_index !== undefined ? Number(chapterDoc.order_index) + 1 : fallbackChapter.chapter_number);

  const isCurrentChapterCompleted = useMemo(
    () => isMatanChapterCompleted(fallbackChapter, slug || 'ajurumiyah', currentProgress, userQuizAttempts),
    [fallbackChapter, slug, currentProgress, userQuizAttempts]
  );

  const quizId = `matan_${slug}_${item.id || chapterId}`;
  const leaderboardOptions = useMemo(() => ({
    filters: [{ column: 'quiz_id', operator: '==', value: quizId }],
    orderBy: { column: 'score', ascending: false },
    limit: 20,
  }), [quizId]);

  const { data: quizAttempts, refresh: refreshLeaderboard } = useCollection("quiz_attempts", leaderboardOptions);

  const leaderboardUserIds = useMemo(
    () => [...new Set((quizAttempts || []).map((a: any) => a.user_id).filter(Boolean))],
    [quizAttempts]
  );

  const leaderboardUsersOptions = useMemo(() => ({
    filters: [{ column: 'id', operator: 'in', value: leaderboardUserIds }],
  }), [leaderboardUserIds]);

  const { data: leaderboardUsers } = useCollection(
    leaderboardUserIds.length > 0 ? "users" : null,
    leaderboardUsersOptions
  );

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const leaderboardEntries = useMemo(() => {
    if (!quizAttempts || quizAttempts.length === 0) return [];
    const bestByUser = new Map<string, any>();
    quizAttempts.forEach((att: any) => {
      const prev = bestByUser.get(att.user_id);
      if (
        !prev ||
        att.score > prev.score ||
        (att.score === prev.score && (att.duration_seconds || 0) < (prev.duration_seconds || 0))
      ) {
        const u = leaderboardUsers?.find((usr: any) => usr.id === att.user_id);
        bestByUser.set(att.user_id, {
          id: att.id,
          name: u?.username || u?.full_name || 'Thalibul Ilmi',
          avatarUrl: u?.avatar_url,
          score: att.score || 0,
          totalQuestions: att.total_questions || quizzes.length || 1,
          time: formatTime(att.duration_seconds || 0),
          xp: (att.score || 0) * 20,
        });
      }
    });
    return Array.from(bestByUser.values()).slice(0, 5);
  }, [quizAttempts, leaderboardUsers, quizzes.length, formatTime]);

  const totalXp = useMemo(() => {
    const progressXp = currentProgress?.reduce(
      (acc: number, p: any) => acc + (p.points_awarded ?? ((p.memorized || p.status_paham) ? 40 : 0)),
      0
    ) || 0;
    const matanQuizXp = (userQuizAttempts || [])
      .filter((q: any) => String(q.quiz_id || '').startsWith('matan_'))
      .reduce((acc: number, q: any) => acc + (Number(q.score) || 0) * 20, 0);
    return Math.max(progressXp, matanQuizXp);
  }, [currentProgress, userQuizAttempts]);

  // SFX Logic
  const playSfx = useCallback((type: 'correct' | 'incorrect' | 'perfect' | 'fail') => {
    const soundUrls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      incorrect: 'https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3',
      perfect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      fail: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
    };
    try {
      const audio = new Audio(soundUrls[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  // Main Audio Automata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      if (item.audio_end && audio.currentTime >= item.audio_end) {
        audio.pause();
        setIsPlayingAudio(false);
      }
    };
    const handleEnded = () => setIsPlayingAudio(false);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [item.audio_end]);

  // Quiz Total Timer
  useEffect(() => {
    if (quizStage === 'playing') {
      totalTimerRef.current = setInterval(() => setTotalTime(t => t + 1), 1000);
    } else {
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
        totalTimerRef.current = null;
      }
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [quizStage]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer || quizStage !== 'playing') return;
    const currentQ = quizzes[currentQuizIdx];
    if (!currentQ) return;

    setTimerActive(false);
    const correct = answer === currentQ.correct;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      playSfx('correct');
      setScore(s => s + 1);
    } else {
      playSfx('incorrect');
      setWrongAnswers(prev => [...prev, { ...currentQ, userSelected: answer }]);
    }

    setTimeout(() => {
      setCurrentQuizIdx(prevIdx => {
        const nextIdx = prevIdx + 1;
        if (nextIdx < quizzes.length) {
          setSelectedAnswer(null);
          setIsCorrect(null);
          setTimeLeft(10);
          setTimerActive(true);
          return nextIdx;
        } else {
          setQuizStage('result');
          return prevIdx;
        }
      });
    }, 1200);
  }, [currentQuizIdx, selectedAnswer, quizStage, quizzes, playSfx]);

  // Sprint Mode Timer
  useEffect(() => {
    if (isSprintMode && timerActive && quizStage === 'playing' && timeLeft > 0) {
      quizTimerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (isSprintMode && timeLeft === 0 && quizStage === 'playing') {
      handleAnswer("__timeout__");
    }
    return () => { if (quizTimerRef.current) clearTimeout(quizTimerRef.current); };
  }, [timeLeft, timerActive, isSprintMode, quizStage, handleAnswer]);

  // Play Result SFX (Perfect/Fail) & Save Progress
  useEffect(() => {
    if (quizStage === 'result' && quizzes.length > 0) {
      const isPassed = quizzes.length > 0 && score / quizzes.length >= 0.8;
      if (isPassed) {
        playSfx('perfect');
      } else {
        playSfx('fail');
      }

      if (!user) return;

      const saveProgress = async () => {
        try {
          await db.from('quiz_attempts').insert({
            user_id: user.id,
            quiz_id: quizId,
            score,
            total_questions: quizzes.length,
            duration_seconds: totalTime,
            is_passed: isPassed,
            created_at: new Date().toISOString()
          });

          const currentDbItem = dbItems?.[activeItem];
          if (isPassed && currentDbItem?.id && UUID_RE.test(currentDbItem.id)) {
            const existing = currentProgress?.find((p: any) => p.item_id === currentDbItem.id);
            if (existing?.id) {
              await db.from('matan_user_progress').update({
                memorized: true,
                updated_at: new Date().toISOString(),
              }).eq('id', existing.id);
            } else {
              await db.from('matan_user_progress').insert({
                user_id: user.id,
                matan_id: chapterDoc?.matan_id || null,
                chapter_id: isUuidChapter ? chapterId : null,
                item_id: currentDbItem.id,
                memorized: true,
                updated_at: new Date().toISOString(),
              });
            }
          }

          refreshProgress();
          refreshUserAttempts();
          refreshLeaderboard();
        } catch (e) {
          console.error("Gagal menyimpan progress:", e);
        }
      };

      saveProgress();
    }
  }, [quizStage, score, quizzes.length, playSfx, user, dbItems, activeItem, quizId, totalTime, refreshLeaderboard, refreshProgress, refreshUserAttempts, chapterDoc?.matan_id, isUuidChapter, chapterId, currentProgress]);

  const startQuiz = (mode: 'relax' | 'sprint') => {
    if (quizzes.length === 0) return;
    setIsSprintMode(mode === 'sprint');
    setQuizStage('playing');
    setCurrentQuizIdx(0);
    setScore(0);
    setTotalTime(0);
    setWrongAnswers([]);
    setTimeLeft(10);
    setTimerActive(true);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const resetQuiz = () => {
    setQuizStage('start');
    setCurrentQuizIdx(0);
    setScore(0);
    setWrongAnswers([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimerActive(false);
    if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
  };

  const toggleBaitAudio = () => {
    const audio = audioRef.current;
    if (!audio || !item.audio_url) return;
    if (audio.paused) {
      if (audio.currentTime < (item.audio_start || 0) || audio.currentTime >= (item.audio_end || 999)) {
        audio.currentTime = item.audio_start || 0;
      }
      audio.play().catch(() => {});
      setIsPlayingAudio(true);
    } else {
      audio.pause();
      setIsPlayingAudio(false);
    }
  };

  if (isUuidChapter && isItemsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Membuka Lembaran Matan...</p>
      </div>
    );
  }

  const currentQuestion = quizzes[currentQuizIdx];
  const isQuizPassed = quizzes.length > 0 && score / quizzes.length >= 0.8;

  return (
    <div className="min-h-screen pb-32 selection:bg-[#800000]/10 font-body">
      {/* Branded Header with Prev/Next Chapter Navigation */}
      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button asChild variant="ghost" size="icon" className="rounded-2xl text-slate-900 hover:bg-[#800000]/5 shrink-0">
              <Link href={`/matan/${slug}`}><ChevronLeft className="w-6 h-6 text-[#800000]" /></Link>
            </Button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 leading-none uppercase tracking-tighter truncate">
                  {chapterTitle}
                </h2>
                {isCurrentChapterCompleted && (
                  <Badge className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0 h-4 gap-1 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> TUNTAS
                  </Badge>
                )}
              </div>
              <p className="text-[10px] font-bold text-[#800000] uppercase tracking-widest mt-1">
                {slug} • Bab {chapterStepLabel} / {totalChapters}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-[#800000]/5 px-3 py-1.5 rounded-xl border border-[#800000]/10 mr-1">
              <Zap className="w-3.5 h-3.5 text-[#D4AF37] fill-current" />
              <span className="text-xs font-black text-slate-900">{totalXp} XP</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              disabled={!prevChapter}
              onClick={() => prevChapter && router.push(`/matan/${slug}/${prevChapter.id}`)}
              title={prevChapter ? `Bab Sebelumnya: ${prevChapter.title}` : "Ini adalah Bab Pertama"}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!nextChapter}
              onClick={() => nextChapter && router.push(`/matan/${slug}/${nextChapter.id}`)}
              title={nextChapter ? `Bab Selanjutnya: ${nextChapter.title}` : "Ini adalah Bab Terakhir"}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-2 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Quick Chapter Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {AJURUMIYAH_CHAPTERS.map((chap) => {
            const isCurr = chap.id === fallbackChapter.id;
            const isDone = isMatanChapterCompleted(chap, slug || 'ajurumiyah', currentProgress, userQuizAttempts);
            return (
              <Link
                key={chap.id}
                href={`/matan/${slug}/${chap.id}`}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 border",
                  isCurr
                    ? "bg-[#800000] text-white border-[#800000] shadow-sm"
                    : isDone
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#800000]/40"
                )}
              >
                <span>Bab {chap.chapter_number}: {chap.title.replace(/^Bab\s+/i, '')}</span>
                {isDone && <CheckCircle2 className={cn("w-3 h-3", isCurr ? "text-[#D4AF37]" : "text-emerald-600")} />}
              </Link>
            );
          })}
        </div>

        {/* Bait Selector (Only shown inline if chapter has > 1 bait, never floating over bottom nav) */}
        {effectiveItems.length > 1 && (
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeItem <= 0}
              onClick={() => {
                setActiveItem(i => Math.max(0, i - 1));
                setShowSyarah(false);
                resetQuiz();
              }}
              className="text-xs font-bold gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Bait Sebelumnya
            </Button>
            <span className="text-xs font-black text-[#800000] uppercase tracking-widest">
              Bait {activeItem + 1} / {effectiveItems.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={activeItem >= effectiveItems.length - 1}
              onClick={() => {
                setActiveItem(i => Math.min(effectiveItems.length - 1, i + 1));
                setShowSyarah(false);
                resetQuiz();
              }}
              className="text-xs font-bold gap-1"
            >
              Bait Berikutnya <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Bait Card */}
        <div className="relative">
           <div className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 p-5 sm:p-8 md:p-12 shadow-xl flex flex-col items-center text-center space-y-6 sm:space-y-8 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-[#800000]">
                 <BookOpen className="w-64 h-64 rotate-12" />
              </div>

              <div className="space-y-5 relative z-10 w-full">
                 <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-[2px] w-12 bg-[#800000]/10" />
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                    <div className="h-[2px] w-12 bg-[#800000]/10" />
                 </div>

                 <h3 className="text-2xl sm:text-4xl md:text-5xl font-arabic leading-[1.9] text-slate-900 direction-rtl px-1 sm:px-4 font-headline" dir="rtl">
                    {item.bait_arabic}
                 </h3>
                 
                  <div className="pt-4 space-y-5 border-t border-slate-100">
                    <p className="text-base sm:text-xl font-medium text-slate-600 leading-relaxed italic max-w-2xl mx-auto normal-case">
                       &ldquo;{item.translation}&rdquo;
                    </p>
                    
                    {/* Audio Player (shown when audio_url exists) */}
                    {item.audio_url && (
                      <div className="flex items-center justify-center gap-5 bg-slate-50 rounded-3xl p-4 border border-slate-100 max-w-sm mx-auto shadow-sm">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className={cn(
                             "w-12 h-12 rounded-2xl transition-all shadow-lg",
                             isPlayingAudio ? "bg-slate-200" : "bg-[#800000] text-white"
                           )}
                           onClick={toggleBaitAudio}
                         >
                           {isPlayingAudio ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                         </Button>
                         <div className="flex-1 flex flex-col gap-2">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                               <div className={cn("h-full bg-[#800000] transition-all duration-300", isPlayingAudio ? "w-full" : "w-[5%]")} />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 text-left px-1">{isPlayingAudio ? "Sedang Memutar..." : "Putar Bait"}</span>
                         </div>
                         <audio ref={audioRef} src={item.audio_url} />
                      </div>
                    )}
                 </div>
              </div>

              {!showSyarah && (
                <Button onClick={() => setShowSyarah(true)} className="h-14 px-8 rounded-2xl bg-[#800000] text-white font-black uppercase tracking-widest hover:bg-[#660000] shadow-xl shadow-[#800000]/20">
                  Buka Syarah &amp; Kuis Bab Ini <ArrowRight className="w-5 h-5 ml-2 text-[#D4AF37]" />
                </Button>
              )}
           </div>
        </div>

        {/* Syarah & Quiz */}
        {showSyarah && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-500 space-y-8">
             <div className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-10 shadow-xl">
                <h4 className="flex items-center gap-2.5 text-xs font-black text-[#800000] uppercase tracking-widest mb-6">
                   <Zap className="w-5 h-5 fill-current text-[#D4AF37]" /> Syarah &amp; Penjelasan Kaidah
                </h4>
                <div className="text-slate-700 leading-relaxed text-base sm:text-lg font-medium normal-case" dangerouslySetInnerHTML={{ __html: item.syarah_text || '' }} />
                
                {/* Lab I'rab */}
                {item.example_verse?.text && (
                  <div className="mt-8 p-5 sm:p-8 rounded-2xl bg-gradient-to-br from-[#800000]/5 to-white border-2 border-[#800000]/10 text-center space-y-5">
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Contoh Penerapan dalam Al-Qur&apos;an</p>
                     <div className="text-3xl sm:text-4xl font-arabic text-slate-900 leading-loose" dir="rtl">{item.example_verse.text}</div>
                     <Button asChild className="h-12 px-8 rounded-2xl bg-[#800000] text-white font-black shadow-lg">
                        <Link href={`/irab/${item.example_verse.surah}/${item.example_verse.ayat}`}>
                          Buka Ayat Ini di Lab Hi I&apos;rab <Sparkles className="w-4 h-4 ml-2 text-[#D4AF37]" />
                        </Link>
                     </Button>
                  </div>
                )}
             </div>

             {/* QUIZ ENGINE */}
             {quizzes.length > 0 && (
               <div id="quiz-anchor" className="scroll-mt-32">
                  {quizStage === 'start' && (
                    <Card className="bg-[#800000] border-4 border-[#D4AF37]/20 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
                      <div className="space-y-2">
                         <h2 className="text-2xl sm:text-3xl font-black text-white italic">Uji Pemahaman {chapterTitle}</h2>
                         <p className="text-amber-100/80 text-xs sm:text-sm">
                           Selesaikan tantangan ({quizzes.length} soal, minimal lulus 80%) untuk membuka bab berikutnya.
                         </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <button onClick={() => startQuiz('relax')} className="p-6 rounded-2xl bg-white/10 border border-white/15 hover:border-[#D4AF37] transition-all text-left">
                            <MapIcon className="w-8 h-8 text-[#D4AF37] mb-2" />
                            <div className="text-white font-black uppercase text-sm">Mode Santai</div>
                            <div className="text-[10px] text-white/60 uppercase">Tanpa Batas Waktu</div>
                         </button>
                         <button onClick={() => startQuiz('sprint')} className="p-6 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all text-left">
                            <Timer className="w-8 h-8 text-[#D4AF37] mb-2" />
                            <div className="text-[#D4AF37] font-black uppercase text-sm">Flashcard Sprint</div>
                            <div className="text-[10px] text-[#D4AF37]/70 uppercase">10 Detik / Soal</div>
                         </button>
                      </div>
                    </Card>
                  )}

                  {quizStage === 'playing' && currentQuestion && (
                    <Card className="bg-white border-none rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden">
                       <div className="p-5 bg-slate-50 border-b border-slate-100 space-y-3">
                          <div className="flex justify-between items-center px-2">
                             <span className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Soal {currentQuizIdx + 1} / {quizzes.length}</span>
                             <div className="flex items-center gap-2">
                                <Timer className={cn("w-4 h-4", isSprintMode && timeLeft < 4 ? "text-rose-500 animate-pulse" : "text-slate-400")} />
                                <span className="text-xs font-black text-slate-500">{isSprintMode ? `00:${timeLeft.toString().padStart(2, '0')}` : formatTime(totalTime)}</span>
                             </div>
                          </div>
                          <Progress value={((currentQuizIdx + 1) / quizzes.length) * 100} className="h-2 bg-[#800000]/5 [&>div]:bg-[#D4AF37]" />
                       </div>
                       <div className="p-5 sm:p-10 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8">
                          <h3 className="text-lg sm:text-2xl font-black text-[#800000] leading-snug max-w-xl">{currentQuestion.question}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl">
                             {currentQuestion.options.map((opt, i) => (
                                <button
                                  key={i}
                                  disabled={!!selectedAnswer}
                                  onClick={() => handleAnswer(opt)}
                                  className={cn(
                                    "p-5 rounded-2xl border-2 font-bold text-sm flex justify-between items-center transition-all text-left gap-3",
                                    selectedAnswer === opt 
                                      ? (isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-rose-50 border-rose-500 text-rose-700")
                                      : (selectedAnswer && opt === currentQuestion.correct ? "bg-emerald-50/50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:text-[#800000]")
                                  )}
                                >
                                   <span>{opt}</span>
                                   {selectedAnswer === opt && (isCorrect ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />)}
                                </button>
                             ))}
                          </div>
                       </div>
                    </Card>
                  )}

                  {quizStage === 'result' && (
                    <div className="space-y-8 animate-in zoom-in duration-300">
                      <Card className="bg-white border-none rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className={cn("p-10 text-center flex flex-col items-center gap-3 text-white", isQuizPassed ? "bg-[#800000]" : "bg-slate-800")}>
                           <Trophy className={cn("w-20 h-20 mb-1 text-[#D4AF37]", isQuizPassed && "animate-bounce")} />
                           <h2 className="text-2xl sm:text-3xl font-black italic uppercase">
                             {isQuizPassed ? "MasyaAllah, Bab Tuntas!" : "Belum Mencapai Target 80%"}
                           </h2>
                           <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
                             Skor: {score} / {quizzes.length} • Waktu: {formatTime(totalTime)}
                           </p>
                        </div>
                        
                        <CardContent className="p-5 sm:p-8 space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</div>
                                 <div className="text-2xl font-black text-[#800000]">{Math.round((score / quizzes.length) * 100)}%</div>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">XP Diraih</div>
                                 <div className="text-2xl font-black text-[#D4AF37]">+{score * 20}</div>
                              </div>
                           </div>

                           {wrongAnswers.length > 0 && (
                             <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-[#800000] uppercase tracking-widest border-l-4 border-[#800000] pl-3">Review Jawaban ({wrongAnswers.length})</h4>
                                <div className="grid gap-2.5 max-h-48 overflow-y-auto pr-2">
                                   {wrongAnswers.map((w, idx) => (
                                     <div key={idx} className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl">
                                        <p className="text-xs font-bold text-slate-800">{w.question}</p>
                                        <div className="flex justify-between mt-1 text-[10px] font-bold">
                                           <span className="text-rose-600">Anda: {w.userSelected === "__timeout__" ? "Waktu Habis" : w.userSelected}</span>
                                           <span className="text-emerald-700">Benar: {w.correct}</span>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           <div className="flex flex-col gap-3">
                              {isQuizPassed && nextChapter && (
                                <Button
                                  asChild
                                  className="h-14 rounded-2xl bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black shadow-xl uppercase tracking-wider text-xs sm:text-sm gap-2"
                                >
                                  <Link href={`/matan/${slug}/${nextChapter.id}`}>
                                    LANJUT KE BAB {nextChapter.chapter_number}: {nextChapter.title.toUpperCase()}
                                    <ArrowRight className="w-5 h-5" />
                                  </Link>
                                </Button>
                              )}
                              <Button onClick={resetQuiz} variant={isQuizPassed ? "outline" : "default"} className={cn("h-13 rounded-2xl font-black gap-2", !isQuizPassed && "bg-[#800000] text-white shadow-xl")}>
                                <RefreshCw className="w-4 h-4" /> ULANGI KUIS BAB INI
                              </Button>
                              <Button asChild variant="ghost" className="h-12 rounded-2xl font-bold text-slate-500">
                                <Link href={`/matan/${slug}`}>KEMBALI KE DAFTAR BAB</Link>
                              </Button>
                           </div>
                        </CardContent>
                      </Card>

                      {/* PAPAN JUARA */}
                      <div className="space-y-4">
                         <h3 className="text-xs font-black text-[#800000] uppercase tracking-widest flex items-center gap-2 px-2">
                            <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" /> Papan Juara Bab Ini
                         </h3>
                         <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
                            <div className="divide-y divide-slate-100">
                               {leaderboardEntries.length > 0 ? leaderboardEntries.map((entry, idx) => (
                                 <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                       <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", idx === 0 ? "bg-[#D4AF37] text-white" : "bg-slate-100 text-slate-400")}>{idx + 1}</div>
                                       <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                          <AvatarImage src={entry.avatarUrl} />
                                          <AvatarFallback className="bg-[#800000] text-white text-xs font-black">{entry.name[0]}</AvatarFallback>
                                       </Avatar>
                                       <div>
                                          <div className="text-sm font-black text-slate-900 leading-none mb-1">{entry.name}</div>
                                          <div className="text-[10px] font-bold text-slate-400 uppercase">Skor {entry.score}/{entry.totalQuestions} • {entry.time}</div>
                                       </div>
                                    </div>
                                    <div className="text-xs font-black text-[#800000] italic">+{entry.xp} XP</div>
                                 </div>
                               )) : (
                                 <div className="p-8 text-center text-xs font-bold text-slate-400 italic">
                                   Jadilah penakluk pertama bab ini!
                                 </div>
                               )}
                            </div>
                         </Card>
                      </div>
                    </div>
                  )}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
