'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { 
  ChevronLeft, 
  BookOpen, 
  Zap, 
  Sparkles, 
  CheckCircle2,
  XCircle,
  ArrowRight,
  Map as MapIcon,
  ChevronRight,
  Play,
  Pause,
  Timer,
  Trophy,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { useUser, db, useCollection, useDoc } from '@/db';

interface MatanQuiz {
  question: string;
  options: string[];
  correct: string;
}

interface MatanItem {
  id?: string;
  bait_arabic: string;
  translation: string;
  syarah_text: string;
  audio_url?: string | null;
  audio_start?: number;
  audio_end?: number;
  example_verse?: {
    text: string;
    surah: number;
    ayat: number;
  };
  quizzes: MatanQuiz[];
}

const FALLBACK_KALAM_ITEMS: MatanItem[] = [
  {
    id: 'initial-kalam-1',
    bait_arabic: 'الكَلَامُ هُوَ اللَّفْظُ المُرَكَّبُ المُفِيدُ بِالوَضْعِ',
    translation: 'Kalam adalah lafazh yang tersusun, memberikan faedah (makna sempurna), dan diucapkan dengan sengaja dalam bahasa Arab.',
    syarah_text: `
      <p class="mb-4">Dalam ilmu Nahwu, suatu ucapan baru disebut <strong>Al-Kalam</strong> apabila memenuhi <strong>4 syarat utama</strong>:</p>
      <ul class="list-disc pl-6 space-y-2 mb-4">
        <li><strong>Al-Lafzhu (اللَّفْظُ):</strong> Suara yang mengandung sebagian huruf hijaiyah (bukan isyarat atau tulisan semata).</li>
        <li><strong>Al-Murakkabu (المُرَكَّبُ):</strong> Tersusun dari minimal dua kata atau lebih (misalnya <em>Zaidun Qa'imun</em>).</li>
        <li><strong>Al-Mufidu (المُفِيدُ):</strong> Memberikan pengertian yang sempurna sehingga pendengar tidak menunggu kelanjutan kalimat.</li>
        <li><strong>Bil-Wadh'i (بِالوَضْعِ):</strong> Disengaja dan menggunakan kaidah bahasa Arab.</li>
      </ul>
      <p> Pembagian kata penyusun Kalam ada tiga: <strong>Isim</strong> (kata benda/sifat), <strong>Fi'il</strong> (kata kerja), dan <strong>Harf</strong> (kata tugas yang memiliki makna).</p>
    `,
    audio_url: null,
    example_verse: {
      text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
      surah: 1,
      ayat: 2,
    },
    quizzes: [
      {
        question: 'Berapa syarat suatu ucapan disebut Al-Kalam menurut Ibnu Ajurrum?',
        options: ['2 Syarat', '3 Syarat', '4 Syarat', '5 Syarat'],
        correct: '4 Syarat',
      },
      {
        question: 'Apa makna syarat "Al-Murakkabu" (المُرَكَّبُ) pada definisi Kalam?',
        options: [
          'Tersusun dari dua kata atau lebih',
          'Berupa isyarat tangan',
          'Mengandung huruf hijaiyah saja',
          'Diucapkan tanpa sengaja',
        ],
        correct: 'Tersusun dari dua kata atau lebih',
      },
      {
        question: 'Apa arti dari syarat "Al-Mufidu" (المُفِيدُ)?',
        options: [
          'Memberi faedah makna yang sempurna',
          'Bersuara keras',
          'Menggunakan huruf jar',
          'Berbentuk kata kerja lampau',
        ],
        correct: 'Memberi faedah makna yang sempurna',
      },
      {
        question: 'Ada berapa pembagian kata (kalimah) penyusun Kalam dalam bahasa Arab?',
        options: [
          '2 (Isim dan Fi\'il)',
          '3 (Isim, Fi\'il, dan Harf)',
          '4 (Isim, Fi\'il, Harf, dan Dharaf)',
          '5 Bagian',
        ],
        correct: '3 (Isim, Fi\'il, dan Harf)',
      },
    ],
  },
];

export default function MatanChapterReader() {
  const params = useParams();
  const { user } = useUser();
  const slug = params.slug as string;
  const chapterId = params.chapterId as string;

  const isSeedChapter = chapterId === 'initial';

  const { data: chapterDoc } = useDoc(
    !isSeedChapter ? "matan_chapters" : null,
    !isSeedChapter ? chapterId : null
  );

  const itemsOptions = useMemo(() => ({
    filters: [{ column: 'chapter_id', operator: '==', value: chapterId }],
    orderBy: { column: 'order_index', ascending: true },
  }), [chapterId]);

  const { data: dbItems, isLoading: isItemsLoading } = useCollection<MatanItem>(
    !isSeedChapter ? "matan_items" : null,
    itemsOptions
  );

  const progressOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
  }), [user?.id]);

  const { data: currentProgress } = useCollection(user ? "matan_user_progress" : null, progressOptions);

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

  const effectiveItems: MatanItem[] = useMemo(() => {
    if (dbItems && dbItems.length > 0) return dbItems;
    return FALLBACK_KALAM_ITEMS;
  }, [dbItems]);

  const item: MatanItem = effectiveItems[activeItem] || FALLBACK_KALAM_ITEMS[0];
  const quizzes = Array.isArray(item.quizzes) ? item.quizzes : [];
  const chapterTitle = chapterDoc?.title || 'Bab Al-Kalam';
  const chapterStepLabel = chapterDoc?.order_index !== undefined ? Number(chapterDoc.order_index) + 1 : 1;

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

  const totalXp = currentProgress?.reduce((acc, p) => acc + (p.points_awarded || 0), 0) || 0;

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
    }, 1500);
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
      if (score === quizzes.length) {
        playSfx('perfect');
      } else {
        playSfx('fail');
      }

      if (!user) return;

      const saveProgress = async () => {
        try {
          const isPassed = score === quizzes.length;

          await db.from('quiz_attempts').insert({
            user_id: user.id,
            quiz_id: quizId,
            score,
            total_questions: quizzes.length,
            duration_seconds: totalTime,
            is_passed: isPassed,
            created_at: new Date().toISOString()
          });

          if (isPassed && dbItems?.[activeItem]?.id) {
            await db.from('matan_user_progress').upsert({
              user_id: user.id,
              item_id: dbItems[activeItem].id,
              status_paham: true,
              points_awarded: score * 10
            });
          }

          refreshLeaderboard();
        } catch (e) {
          console.error("Gagal menyimpan progress:", e);
        }
      };

      saveProgress();
    }
  }, [quizStage, score, quizzes.length, playSfx, user, dbItems, activeItem, quizId, totalTime, refreshLeaderboard]);

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

  if (isItemsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Membuka Lembaran Matan...</p>
      </div>
    );
  }

  const currentQuestion = quizzes[currentQuizIdx];

  return (
    <div className="min-h-screen pb-40 selection:bg-[#800000]/10 font-body">
      {/* Branded Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="rounded-2xl text-slate-900 hover:bg-[#800000]/5">
                 <Link href={`/matan/${slug}`}><ChevronLeft className="w-6 h-6 text-[#800000]" /></Link>
              </Button>
              <div className="flex flex-col">
                 <h2 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tighter">{chapterTitle}</h2>
                 <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1">{slug} • Langkah {chapterStepLabel}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#800000]/5 px-4 py-2 rounded-2xl border border-[#800000]/10">
                 <Zap className="w-4 h-4 text-[#D4AF37] fill-current" />
                 <span className="text-sm font-black text-slate-900">{totalXp} XP</span>
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Bait Card */}
        <div className="relative">
           <div className="relative bg-white rounded-[3rem] border border-slate-200 p-8 md:p-14 shadow-2xl flex flex-col items-center text-center space-y-10 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-[#800000]">
                 <BookOpen className="w-64 h-64 rotate-12" />
              </div>

              <div className="space-y-6 relative z-10 w-full">
                 <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="h-[2px] w-12 bg-[#800000]/10" />
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                    <div className="h-[2px] w-12 bg-[#800000]/10" />
                 </div>

                 <h3 className="text-4xl md:text-6xl font-arabic leading-[1.8] text-slate-900 direction-rtl px-4 font-headline" dir="rtl">
                    {item.bait_arabic}
                 </h3>
                 
                  <div className="pt-8 space-y-6">
                    <p className="text-xl md:text-2xl font-medium text-slate-500 leading-relaxed italic max-w-2xl mx-auto normal-case">
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
                <Button onClick={() => setShowSyarah(true)} className="h-16 px-10 rounded-2xl bg-[#800000] text-white font-black uppercase tracking-widest hover:bg-[#660000] shadow-xl shadow-[#800000]/20">
                  Buka Syarah Bait <ArrowRight className="w-5 h-5 ml-2 text-[#D4AF37]" />
                </Button>
              )}
           </div>
        </div>

        {/* Syarah & Quiz */}
        {showSyarah && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 space-y-12">
             <div className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-14 shadow-xl">
                <h4 className="flex items-center gap-3 text-xs font-black text-[#800000] uppercase tracking-widest mb-10">
                   <Zap className="w-5 h-5 fill-current text-[#D4AF37]" /> Analisa Mendalam
                </h4>
                <div className="text-slate-600 leading-relaxed text-lg font-medium normal-case" dangerouslySetInnerHTML={{ __html: item.syarah_text || '' }} />
                
                {/* Lab I'rab */}
                {item.example_verse?.text && (
                  <div className="mt-14 p-10 rounded-[2.5rem] bg-gradient-to-br from-[#800000]/5 to-white border-2 border-[#800000]/10 text-center space-y-8">
                     <div className="text-4xl md:text-5xl font-arabic text-slate-900" dir="rtl">{item.example_verse.text}</div>
                     <Button asChild className="h-14 px-10 rounded-2xl bg-[#800000] text-white font-black shadow-xl">
                        <Link href={`/irab?surah=${item.example_verse.surah}&ayat=${item.example_verse.ayat}`}>Buka di Lab I&apos;rab <Sparkles className="w-4 h-4 ml-2 text-[#D4AF37]" /></Link>
                     </Button>
                  </div>
                )}
             </div>

             {/* QUIZ ENGINE */}
             {quizzes.length > 0 && (
               <div id="quiz-anchor" className="scroll-mt-32">
                  {quizStage === 'start' && (
                    <Card className="bg-[#800000] border-4 border-[#D4AF37]/20 rounded-[3rem] p-10 text-center space-y-10 shadow-2xl relative overflow-hidden">
                      <div className="space-y-2">
                         <h2 className="text-3xl font-black text-white italic">Cek Pemahaman</h2>
                         <p className="text-amber-100/60 text-sm">Selesaikan tantangan ({quizzes.length} soal) untuk menguasai bab ini.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <button onClick={() => startQuiz('relax')} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-[#D4AF37] transition-all text-left">
                            <MapIcon className="w-8 h-8 text-[#D4AF37] mb-2" />
                            <div className="text-white font-black uppercase text-sm">Mode Santai</div>
                            <div className="text-[10px] text-white/40 uppercase">Tanpa Waktu</div>
                         </button>
                         <button onClick={() => startQuiz('sprint')} className="p-6 rounded-3xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all text-left">
                            <Timer className="w-8 h-8 text-[#D4AF37] mb-2" />
                            <div className="text-[#D4AF37] font-black uppercase text-sm">Flashcard Sprint</div>
                            <div className="text-[10px] text-[#D4AF37]/40 uppercase">10 Detik / Soal</div>
                         </button>
                      </div>
                    </Card>
                  )}

                  {quizStage === 'playing' && currentQuestion && (
                    <Card className="bg-white border-none rounded-[3rem] shadow-2xl overflow-hidden min-h-[500px]">
                       <div className="p-5 bg-slate-50 border-b border-slate-100 space-y-3">
                          <div className="flex justify-between items-center px-4">
                             <span className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Soal {currentQuizIdx + 1} / {quizzes.length}</span>
                             <div className="flex items-center gap-2">
                                <Timer className={cn("w-4 h-4", isSprintMode && timeLeft < 4 ? "text-rose-500 animate-pulse" : "text-slate-400")} />
                                <span className="text-xs font-black text-slate-500">{isSprintMode ? `00:${timeLeft.toString().padStart(2, '0')}` : formatTime(totalTime)}</span>
                             </div>
                          </div>
                          <Progress value={((currentQuizIdx + 1) / quizzes.length) * 100} className="h-2 bg-[#800000]/5 [&>div]:bg-[#D4AF37]" />
                       </div>
                       <div className="p-10 flex flex-col items-center justify-center text-center space-y-10">
                          <h3 className="text-2xl font-black text-[#800000] uppercase leading-tight max-w-lg">{currentQuestion.question}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                             {currentQuestion.options.map((opt, i) => (
                                <button
                                  key={i}
                                  disabled={!!selectedAnswer}
                                  onClick={() => handleAnswer(opt)}
                                  className={cn(
                                    "p-6 rounded-2xl border-2 font-black text-sm flex justify-between items-center transition-all text-left gap-3",
                                    selectedAnswer === opt 
                                      ? (isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-rose-50 border-rose-500 text-rose-700")
                                      : (selectedAnswer && opt === currentQuestion.correct ? "bg-emerald-50/50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-100 text-slate-600 hover:border-[#D4AF37] hover:text-[#800000]")
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
                    <div className="space-y-12 animate-in zoom-in duration-500">
                      <Card className="bg-white border-none rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className={cn("p-12 text-center flex flex-col items-center gap-4 text-white", score === quizzes.length ? "bg-[#800000]" : "bg-slate-800")}>
                           <Trophy className={cn("w-24 h-24 mb-2 text-[#D4AF37]", score === quizzes.length && "animate-bounce")} />
                           <h2 className="text-3xl font-black italic uppercase">Hasil Tantangan</h2>
                           <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Skor: {score} / {quizzes.length} • Waktu: {formatTime(totalTime)}</p>
                        </div>
                        
                        <CardContent className="p-10 space-y-8">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</div>
                                 <div className="text-2xl font-black text-[#800000]">{Math.round((score / quizzes.length) * 100)}%</div>
                              </div>
                              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">XP Diraih</div>
                                 <div className="text-2xl font-black text-[#D4AF37]">+{score * 20}</div>
                              </div>
                           </div>

                           {wrongAnswers.length > 0 && (
                             <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-[#800000] uppercase tracking-widest border-l-4 border-[#800000] pl-3">Review Salah ({wrongAnswers.length})</h4>
                                <div className="grid gap-3 max-h-48 overflow-y-auto pr-2">
                                   {wrongAnswers.map((w, idx) => (
                                     <div key={idx} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                        <p className="text-xs font-black text-slate-800 uppercase">{w.question}</p>
                                        <div className="flex justify-between mt-1 text-[10px] font-bold">
                                           <span className="text-rose-500">Anda: {w.userSelected === "__timeout__" ? "Waktu Habis" : w.userSelected}</span>
                                           <span className="text-emerald-600">Jawaban: {w.correct}</span>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           <div className="flex flex-col gap-3">
                              <Button onClick={resetQuiz} className="h-16 rounded-2xl bg-[#800000] text-white font-black shadow-xl">TANTANG LAGI</Button>
                              <Button asChild variant="ghost" className="h-14 rounded-2xl font-bold text-slate-400"><Link href={`/matan/${slug}`}>KEMBALI KE PETA</Link></Button>
                           </div>
                        </CardContent>
                      </Card>

                      {/* PAPAN JUARA */}
                      <div className="space-y-6">
                         <h3 className="text-xs font-black text-[#800000] uppercase tracking-widest flex items-center gap-2 px-2">
                            <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" /> Papan Juara Bab Ini
                         </h3>
                         <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                            <div className="divide-y divide-slate-100">
                               {leaderboardEntries.length > 0 ? leaderboardEntries.map((entry, idx) => (
                                 <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
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

      {/* Floating Bottom Navigation (Bait Stepper) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full p-2 shadow-2xl">
         <Button
           variant="ghost"
           size="icon"
           disabled={activeItem <= 0}
           onClick={() => {
             setActiveItem(i => Math.max(0, i - 1));
             setShowSyarah(false);
             resetQuiz();
           }}
           className="w-12 h-12 rounded-full text-slate-400 hover:text-[#800000] disabled:opacity-30"
         >
           <ChevronLeft className="w-7 h-7" />
         </Button>
         <div className="px-6 flex flex-col items-center">
            <span className="text-[8px] font-black text-[#D4AF37] uppercase tracking-widest">{chapterTitle}</span>
            <span className="text-xs font-black text-slate-900 border-b-2 border-[#800000]">BAIT {activeItem + 1} / {effectiveItems.length}</span>
         </div>
         <Button
           variant="ghost"
           size="icon"
           disabled={activeItem >= effectiveItems.length - 1}
           onClick={() => {
             setActiveItem(i => Math.min(effectiveItems.length - 1, i + 1));
             setShowSyarah(false);
             resetQuiz();
           }}
           className="w-12 h-12 rounded-full text-slate-400 hover:text-[#800000] disabled:opacity-30"
         >
           <ChevronRight className="w-7 h-7" />
         </Button>
      </div>
    </div>
  );
}
