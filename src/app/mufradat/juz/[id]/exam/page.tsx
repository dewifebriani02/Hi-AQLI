'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Trophy,
  Star,
  Zap,
  Timer,
  ShieldCheck,
  Target,
  Shuffle,
  Layers
} from "lucide-react";
import Link from "next/link";
import { QuizModeSelector, QuizMode } from "@/components/mufradat/quiz-mode-selector";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUser } from "@/db";
import { useCollection, authFetch } from "@/db";
import { getPagesForJuz } from "@/lib/quran-mapping";

interface Question {
  id: number;
  arabic: string;
  correct: string;
  options: string[];
  type: 'mcq' | 'tricky' | 'scrambled' | 'reverse';
  scrambledOptions?: string[];
}

export default function MufradatJuzExamPage() {
  const params = useParams();
  const router = useRouter();
  const juzId = params.id as string;
  const juzNum = parseInt(juzId);
  const { user, isUserLoading } = useUser();

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
  const [quizMode, setQuizMode] = useState<QuizMode>("runut"); // Default to runut
  const [scrambledIndices, setScrambledIndices] = useState<number[]>([]);
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerActive, setTimerActive] = useState(false);
  const [allJuzWords, setAllJuzWords] = useState<any[]>([]);

  const quizId = `mufradat_juz_exam_${juzNum}`;

  // Auth Guard
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
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function fetchJuzQuestions() {
      if (!juzNum) return;
      try {
        setLoading(true);
        const pages = getPagesForJuz(juzNum);
        
        // Fetch all pages in Juz (this might be slow, but it's an exam)
        const allPagesPromises = pages.map(p => 
          fetch(`https://api.quran.com/api/v4/verses/by_page/${p}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`).then(r => r.json())
        );
        
        const allResults = await Promise.all(allPagesPromises);
        
        // --- SMART SAMPLING LOGIC ---
        // Instead of taking the first 100 words, we take ~5 words from each page
        // to ensure the exam covers the ENTIRE juz from start to finish.
        const sampledWords: any[] = [];
        allResults.forEach(r => {
          if (r.verses) {
            const pageWords = r.verses.flatMap((v: any) => v.words.filter((w: any) => w.char_type_name === 'word'));
            // Shuffle page words and take 5
            const shuffledPageWords = [...pageWords].sort(() => Math.random() - 0.5);
            sampledWords.push(...shuffledPageWords.slice(0, 5));
          }
        });

        setAllJuzWords(sampledWords);
        
        const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus"];
        
        const generated = sampledWords.slice(0, 100).map((w: any) => ({
          id: w.id,
          arabic: w.text_uthmani,
          correct: w.translation?.text || "???",
          options: [w.translation?.text || "???", ...decoys.slice(0, 3)].sort(() => Math.random() - 0.5),
          type: 'mcq' as const
        }));
        
        setQuestions(generated);
      } catch (err) {
        console.error("Exam Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchJuzQuestions();
  }, [juzNum]);

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

    const decoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];

    let selectedWords = [...allJuzWords];
    if (mode !== "runut") {
      selectedWords = selectedWords.sort(() => Math.random() - 0.5);
    }
    
    // Limit to 100 for Juz exam
    selectedWords = selectedWords.slice(0, 100);

    const standardDecoys = ["Maha Pengasih", "Maha Penyayang", "Segala Puji", "Tuhan", "Manusia", "Raja", "Sembahan", "Petunjuk", "Jalan", "Lurus", "Beriman", "Kafir", "Syurga", "Neraka", "Malaikat", "Kitab", "Rasul", "Hari Kiamat", "Takdir", "Sabar", "Syukur"];
    const pool = allJuzWords.map((w: any) => ({
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

    const generated = selectedWords.map((w: any) => {
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

    let updated: Question[] = [...generated];

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
        if (finalScore === questions.length) playSfx('perfect');
        else if (finalScore >= 90) playSfx('perfect');
        else playSfx('fail');
        saveAttempt(finalScore);
      }
      setScrambledIndices([]);
    }, 600);
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

  const saveAttempt = async (finalScore: number) => {
    if (!user) return;
    try {
      await authFetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: quizId,
          surah_id: "0",
          verse_id: "exam",
          juz_id: juzNum,
          score: finalScore,
          total_questions: questions.length,
          duration_seconds: totalTime,
          is_passed: finalScore >= 90,
          wrong_words: wrongWords.map(w => w.id),
          page_id: null
        })
      });
    } catch (e) {
      console.error("Gagal simpan skor:", e);
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

  if (loading || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest text-[#800000]">Menyiapkan Ujian Juz {juzNum} (100 Soal)...</p>
      </div>
    );
  }

  if (isFinished) {
    const isPassed = score >= 90;
    return (
      <div className="max-w-md mx-auto py-12 px-4 pb-32 flex flex-col gap-6 text-center">
        <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className={cn(
            "p-10 flex flex-col items-center gap-4 text-white relative overflow-hidden",
            isPassed ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-rose-900"
          )}>
            {isPassed && <Badge className="bg-white text-emerald-800 font-black">+100 POIN JUZ</Badge>}
            <Trophy className={cn("w-16 h-16", isPassed && "animate-bounce")} />
            <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">
              {isPassed ? "Masyallah Lulus!" : "Belum Lulus"}
            </h2>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
              Ujian Juz {juzNum} • {score} / 100
            </p>
          </div>
          <CardContent className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Durasi</p>
                 <p className="text-xl font-bold">{formatTime(totalTime)}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</p>
                 <p className="text-xl font-bold">{score}%</p>
               </div>
             </div>
             
             {!isPassed && (
               <p className="text-xs font-medium text-rose-600 bg-rose-50 p-4 rounded-xl">
                 Target kelulusan adalah 90 soal benar. Semangat, ulangi lagi untuk membuka Juz berikutnya!
               </p>
             )}
          </CardContent>
          {wrongWords.length > 0 && (
            <div className="px-8 pb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saran Review ({wrongWords.length})</span>
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2">
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
            {isPassed ? (
              <>
                {juzNum < 30 ? (
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                    <Link href={`/mufradat`}>
                      MULAI JUZ BERIKUTNYA <ShieldCheck className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                    <Link href={`/mufradat`}>
                      KHATAM SEMPURNA! <Trophy className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={handleReset} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2">
                 <RefreshCw className="w-4 h-4" /> ULANGI UJIAN
              </Button>
            )}
            <Button asChild variant="ghost" className="w-full font-bold text-slate-500">
              <Link href="/mufradat">KEMBALI KE KURIKULUM</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 py-8 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/mufradat`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <Badge className="bg-[#800000] mb-1">UJIAN JUZ {juzNum}</Badge>
          <h1 className="text-lg font-bold font-headline flex items-center gap-2 tracking-tight">
            Level Akreditasi Juz
          </h1>
        </div>
        <div className="text-right">
           <div className="text-xs font-black text-[#800000]">{currentIdx + 1} / 100</div>
           <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</div>
        </div>
      </div>

      <Progress value={currentIdx + 1} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />

      {!hasStarted && !isFinished ? (
        <QuizModeSelector 
          onSelect={startQuiz} 
          title={`UJIAN JUZ ${juzNum}`} 
          description="Ujian komprehensif 100 soal. Pilih mode kuis Ukhti."
        />
      ) : (
        <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
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
                          <div className="text-3xl font-bold text-slate-800 bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-slate-100 inline-block mx-auto min-w-[200px]">
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
                              "h-16 rounded-2xl border-2 transition-all active:scale-[0.98] relative overflow-hidden group px-6",
                              questions[currentIdx]?.type === 'reverse' ? "font-arabic text-3xl h-20" : "text-lg font-bold",
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
                            
                            <span className="flex-1 text-center">{option}</span>
                            
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

      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
         <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
         <div>
            <p className="text-xs font-black uppercase text-emerald-900 mb-1">Ketentuan Ujian</p>
            <p className="text-[10px] leading-relaxed text-emerald-800 font-medium">Ujian ini bersifat komprehensif dari seluruh halaman di Juz {juzNum}. Pass threshold 90%. Berhasil lulus akan membuka akses ke Juz berikutnya.</p>
         </div>
      </div>
    </div>
  );
}
