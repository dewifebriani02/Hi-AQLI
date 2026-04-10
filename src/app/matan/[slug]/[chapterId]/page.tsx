'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  BookOpen, 
  Zap, 
  Sparkles, 
  Heart, 
  PartyPopper,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Star,
  Map as MapIcon,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Timer,
  RefreshCw,
  Trophy,
  User
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { useUser, supabase } from '@/supabase';
import { useCollection } from '@/supabase/db';
import { addMonth } from 'date-fns'; // if needed, but we use now() mostly

export default function MatanChapterReader() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const slug = params.slug as string;
  const chapterId = params.chapterId as string;

  const { data: items, isLoading: isItemsLoading } = useCollection("matan_items", {
    where: ["chapter_id", "==", chapterId],
    order: { column: "order_index", ascending: true }
  });

  const { data: currentProgress } = useCollection("matan_user_progress", {
    where: user ? ["user_id", "==", user.id] : undefined
  });

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

  const item = items?.[activeItem] || {
    bait_arabic: "Memuat...",
    translation: "Mohon tunggu sejenak",
    syarah_text: "",
    audio_url: null,
    quizzes: []
  };

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
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [item.audio_end]);

  // Quiz Total Timer
  useEffect(() => {
    if (quizStage === 'playing') {
      totalTimerRef.current = setInterval(() => setTotalTime(t => t+1), 1000);
    } else {
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
        totalTimerRef.current = null;
      }
    }
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [quizStage]);

  // Sprint Mode Timer
  useEffect(() => {
    if (isSprintMode && timerActive && quizStage === 'playing' && timeLeft > 0) {
      quizTimerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (isSprintMode && timeLeft === 0 && quizStage === 'playing') {
      handleAnswer("__timeout__");
    }
    return () => { if (quizTimerRef.current) clearTimeout(quizTimerRef.current); };
  }, [timeLeft, timerActive, isSprintMode, quizStage]);

  // Play Result SFX (Perfect/Fail) & Save Progress
  useEffect(() => {
    if (quizStage === 'result' && user && items?.[activeItem]?.id) {
      if (score === item.quizzes.length) {
        playSfx('perfect');
      } else {
        playSfx('fail');
      }

      const saveProgress = async () => {
        try {
          const currentItem = items[activeItem];
          const isPassed = score === currentItem.quizzes?.length;

          // 1. Save Quiz Attempt (Standardized format)
          await supabase.from('quiz_attempts').insert({
            user_id: user.id,
            quiz_id: `matan_${slug}_${currentItem.id}`,
            score: score,
            total_questions: currentItem.quizzes?.length || 0,
            duration_seconds: totalTime,
            is_passed: isPassed,
            created_at: new Date().toISOString()
          });

          // 2. Save Matan User Progress (Only if passed/perfect?)
          // Usually we save progress if they understand/pass
          if (isPassed) {
             await supabase.from('matan_user_progress').upsert({
               user_id: user.id,
               item_id: currentItem.id,
               status_paham: true,
               points_awarded: score * 10
             });
          }
        } catch (e) {
          console.error("Gagal menyimpan progress:", e);
        }
      };

      saveProgress();
    }
  }, [quizStage, score, item.quizzes?.length, playSfx, user, items, activeItem, slug, totalTime]);

  const startQuiz = (mode: 'relax' | 'sprint') => {
    setIsSprintMode(mode === 'sprint');
    setQuizStage('playing');
    setCurrentQuizIdx(0);
    setScore(0);
    setTotalTime(0);
    setWrongAnswers([]);
    setTimeLeft(10);
    setTimerActive(true);
    setSelectedAnswer(null); // Ensure clean for new start
    setIsCorrect(null);
  };

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer || quizStage !== 'playing') return;

    setTimerActive(false);
    const currentQ = item.quizzes[currentQuizIdx];
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

    // FIXED: Use functional update and clear timeouts for robust transitions
    setTimeout(() => {
      setCurrentQuizIdx(prevIdx => {
        const nextIdx = prevIdx + 1;
        if (nextIdx < item.quizzes.length) {
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
  }, [currentQuizIdx, selectedAnswer, quizStage, item.quizzes, playSfx]);

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
    if (!audio) return;
    if (audio.paused) {
      if (audio.currentTime < (item.audio_start || 0) || audio.currentTime >= (item.audio_end || 999)) {
        audio.currentTime = item.audio_start || 0;
      }
      audio.play();
      setIsPlayingAudio(true);
    } else {
      audio.pause();
      setIsPlayingAudio(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
                 <h2 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tighter">{CHAPTER_CONTENT.title}</h2>
                 <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1">{slug} • Langkah {chapterId}</p>
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

                 <h3 className="text-4xl md:text-6xl font-arabic leading-[1.8] text-slate-900 direction-rtl px-4 font-headline">
                    {item.bait_arabic}
                 </h3>
                 
                  <div className="pt-8 space-y-6">
                    <p className="text-xl md:text-2xl font-medium text-slate-500 leading-relaxed italic max-w-2xl mx-auto normal-case">
                       "{item.translation}"
                    </p>
                    
                    {/* Audio Player */}
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
                     <div className="text-4xl md:text-5xl font-arabic text-slate-900">{item.example_verse.text}</div>
                     <Button asChild className="h-14 px-10 rounded-2xl bg-[#800000] text-white font-black shadow-xl">
                        <Link href={`/irab?surah=${item.example_verse.surah}&ayat=${item.example_verse.ayat}`}>Buka di Lab I'rab <Sparkles className="w-4 h-4 ml-2 text-[#D4AF37]" /></Link>
                     </Button>
                  </div>
                )}
             </div>

             {/* QUIZ ENGINE */}
             <div id="quiz-anchor" className="scroll-mt-32">
                {quizStage === 'start' && (
                  <Card className="bg-[#800000] border-4 border-[#D4AF37]/20 rounded-[3rem] p-10 text-center space-y-10 shadow-2xl relative overflow-hidden">
                    <div className="space-y-2">
                       <h2 className="text-3xl font-black text-white italic">Cek Pemahaman</h2>
                       <p className="text-amber-100/60 text-sm">Selesaikan tantangan untuk menguasai bab ini.</p>
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

                {quizStage === 'playing' && (
                  <Card className="bg-white border-none rounded-[3rem] shadow-2xl overflow-hidden min-h-[500px]">
                     <div className="p-5 bg-slate-50 border-b border-slate-100 space-y-3">
                        <div className="flex justify-between items-center px-4">
                           <span className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Soal {currentQuizIdx + 1} / {item.quizzes.length}</span>
                           <div className="flex items-center gap-2">
                              <Timer className={cn("w-4 h-4", isSprintMode && timeLeft < 4 ? "text-rose-500 animate-pulse" : "text-slate-400")} />
                              <span className="text-xs font-black text-slate-500">{isSprintMode ? `00:${timeLeft.toString().padStart(2, '0')}` : formatTime(totalTime)}</span>
                           </div>
                        </div>
                        <Progress value={((currentQuizIdx + 1) / item.quizzes.length) * 100} className="h-2 bg-[#800000]/5 [&>div]:bg-[#D4AF37]" />
                     </div>
                     <div className="p-10 flex flex-col items-center justify-center text-center space-y-10">
                        <h3 className="text-2xl font-black text-[#800000] uppercase leading-tight max-w-lg">{item.quizzes[currentQuizIdx].question}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                           {item.quizzes[currentQuizIdx].options.map((opt, i) => (
                              <button
                                key={i}
                                disabled={!!selectedAnswer}
                                onClick={() => handleAnswer(opt)}
                                className={cn(
                                  "p-6 rounded-2xl border-2 font-black text-sm flex justify-between items-center transition-all",
                                  selectedAnswer === opt 
                                    ? (isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-rose-50 border-rose-500 text-rose-700")
                                    : (selectedAnswer && opt === item.quizzes[currentQuizIdx].correct ? "bg-emerald-50/50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-100 text-slate-400 hover:border-[#D4AF37] hover:text-[#800000]")
                                )}
                              >
                                 <span>{opt}</span>
                                 {selectedAnswer === opt && (isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />)}
                              </button>
                           ))}
                        </div>
                     </div>
                  </Card>
                )}

                {quizStage === 'result' && (
                  <div className="space-y-12 animate-in zoom-in duration-500">
                    <Card className="bg-white border-none rounded-[3rem] shadow-2xl overflow-hidden">
                      <div className={cn("p-12 text-center flex flex-col items-center gap-4 text-white", score === item.quizzes.length ? "bg-[#800000]" : "bg-slate-800")}>
                         <Trophy className={cn("w-24 h-24 mb-2 text-[#D4AF37]", score === item.quizzes.length && "animate-bounce")} />
                         <h2 className="text-3xl font-black italic uppercase">Hasil Tantangan</h2>
                         <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Skor: {score} / {item.quizzes.length} • Waktu: {formatTime(totalTime)}</p>
                      </div>
                      
                      <CardContent className="p-10 space-y-8">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</div>
                               <div className="text-2xl font-black text-[#800000]">{Math.round((score/item.quizzes.length)*100)}%</div>
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

                    {/* PAPAN JUARA (MUFRADAT STYLE) */}
                    <div className="space-y-6">
                       <h3 className="text-xs font-black text-[#800000] uppercase tracking-widest flex items-center gap-2 px-2">
                          <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" /> Papan Juara Lokal
                       </h3>
                       <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                          <div className="divide-y divide-slate-100">
                             {MOCK_LEADERBOARD.map((user, idx) => (
                               <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                                  <div className="flex items-center gap-4">
                                     <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", idx === 0 ? "bg-[#D4AF37] text-white" : "bg-slate-100 text-slate-400")}>{idx + 1}</div>
                                     <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarFallback className="bg-[#800000] text-white text-xs font-black">{user.name[0]}</AvatarFallback>
                                     </Avatar>
                                     <div>
                                        <div className="text-sm font-black text-slate-900 leading-none mb-1">{user.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Skor {user.score}/5 • {user.time}</div>
                                     </div>
                                  </div>
                                  <div className="text-xs font-black text-[#800000] italic">+{user.xp} XP</div>
                               </div>
                             ))}
                          </div>
                       </Card>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full p-2 shadow-2xl">
         <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full text-slate-400 hover:text-[#800000]"><ChevronLeft className="w-7 h-7" /></Button>
         <div className="px-6 flex flex-col items-center">
            <span className="text-[8px] font-black text-[#D4AF37] uppercase tracking-widest">CHAPTER</span>
            <span className="text-xs font-black text-slate-900 border-b-2 border-[#800000]">BAB {chapterId}</span>
         </div>
         <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full text-slate-400 hover:text-[#800000]"><ChevronRight className="w-7 h-7" /></Button>
      </div>
    </div>
  );
}
