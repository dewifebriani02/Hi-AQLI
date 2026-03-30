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
  Zap,
  Timer
} from "lucide-react";
import Link from "next/link";
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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [wrongWords, setWrongWords] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState(1);
  const [surahInfo, setSurahInfo] = useState<{ verses_count: number } | null>(null);
  const [pageId, setPageId] = useState<number | null>(null);
  const [nextVersePage, setNextVersePage] = useState<number | null>(null);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);

  const verseKey = `${id}:${verseId}`;

  // Auth Guard: Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Fetch leaderboard data (RLS will automatically filter by group)
  const { data: allAttempts, isLoading: isLeaderboardLoading, refresh: refreshLeaderboard } = useCollection("quiz_attempts", {
    filters: [
      { column: 'quiz_id', operator: '==', value: `mufradat_${verseKey}` }
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
          
          const generated = words.map((w: any) => {
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

          // Fetch next verse metadata to check for page break
          const nextV = parseInt(verseId) + 1;
          if (surahData.chapter && nextV <= surahData.chapter.verses_count) {
            const nextRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${nextV}?fields=page_number`);
            const nextData = await nextRes.json();
            if (nextData && nextData.verse) {
              setNextVersePage(nextData.verse.page_number);
            }
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
        // Important: use the state + current if it WAS wrong to capture the last wrong item
        const finalWrongWords = correct ? [...wrongWords] : [...wrongWords, currentQ];
        
        if (finalScore === questions.length) playSfx('perfect');
        else playSfx('fail');
        
        saveAttempt(finalScore, finalWrongWords.map((w: any) => w.id));
      }
    }, 1000);
  };

  const saveAttempt = async (finalScore: number, finalWrongWordIds: number[]) => {
    if (!user) return;
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

      // Update points for perfect score
      if (isPassed) {
        const { data: profile } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .maybeSingle();
        
        const currentPoints = profile?.points || 0;
        await supabase
          .from('users')
          .update({ points: currentPoints + 10 })
          .eq('id', user.id);
          
        toast({ title: "Masyallah! +10 Poin", description: "Progres hafalan berhasil disimpan." });
      }

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
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                    <Link href={`/mufradat/${id}/${parseInt(verseId) + 1}${from ? `?from=${from}` : ''}`}>
                      Lanjut ke Ayat {parseInt(verseId) + 1} <ChevronLeft className="w-4 h-4 rotate-180" />
                    </Link>
                  </Button>
                ) : (
                  <div className="w-full p-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100 mb-2">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Ma Syaa Allah!</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Anda telah menyelesaikan surat ini.</p>
                  </div>
                )}
                <Button asChild variant="outline" className="w-full border-2 border-slate-200 font-bold py-6 rounded-2xl hover:bg-white bg-white text-slate-600">
                  <Link href={from === 'surah' ? `/mufradat/${id}` : "/mufradat"}>KEMBALI KE {from === 'surah' ? 'DAFTAR AYAT' : 'DAFTAR SURAT'}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleReset} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                   <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
                </Button>
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
                            <Zap className="w-3 h-3 text-[#D4AF37] fill-current" /> {item.score}/{item.total_questions}
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
