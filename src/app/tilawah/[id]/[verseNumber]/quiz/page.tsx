
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, GraduationCap, CheckCircle2, XCircle, RefreshCw, Trophy, RotateCcw, Timer } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface WordData {
  id: number;
  text_uthmani: string;
  translation: {
    text: string;
  };
}

export default function WordQuizPage() {
  const params = useParams();
  const id = params.id as string;
  const verseNumber = params.verseNumber as string;

  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [time, setTime] = useState(0);

  const playSfx = useCallback((type: 'correct' | 'incorrect' | 'perfect' | 'fail') => {
    const soundUrls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Blip
      incorrect: 'https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3', // Ding
      perfect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Fanfare
      fail: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3', // Fail
    };
    
    try {
      const audio = new Audio(soundUrls[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Audio SFX Error:", e);
    }
  }, []);

  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id`
      );
      if (!res.ok) throw new Error("Gagal memuat data ayat.");
      const data = await res.json();
      const validWords = data.verse.words.filter((w: any) => w.text_uthmani && w.translation.text);
      setWords(validWords);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, verseNumber]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading]);

  useEffect(() => {
    if (words.length > 0 && currentIdx < words.length) {
      setSelectedAnswer(null);
      setIsCorrect(null);

      const currentWord = words[currentIdx];
      const correct = currentWord.translation.text;
      
      let wrong = words
        .filter(w => w.translation.text !== correct)
        .map(w => w.translation.text);
      
      wrong = [...new Set(wrong)].sort(() => Math.random() - 0.5).slice(0, 3);
      const all = [correct, ...wrong].sort(() => Math.random() - 0.5);
      setOptions(all);
    }
  }, [words, currentIdx]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const correct = words[currentIdx].translation.text;
    const isAnsCorrect = answer === correct;
    
    setSelectedAnswer(answer);
    setIsCorrect(isAnsCorrect);
    
    if (isAnsCorrect) {
      playSfx('correct');
      setScore(s => s + 1);
    } else {
      playSfx('incorrect');
    }

    const finalScoreIfCorrect = isAnsCorrect ? score + 1 : score;

    setTimeout(() => {
      if (currentIdx + 1 < words.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinished(true);
        if (finalScoreIfCorrect === words.length) {
          playSfx('perfect');
        } else {
          playSfx('fail');
        }
      }
    }, 1200);
  };

  const handleReset = () => {
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAttempts(a => a + 1);
    setTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground font-medium">Menyiapkan Kuis Hafalan...</p>
      </div>
    );
  }

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
      <div className="max-w-md mx-auto py-10 flex flex-col gap-8">
        <Card className="text-center border-[#D4AF37]/20 shadow-xl overflow-hidden">
          <div className={cn(
            "p-8 flex flex-col items-center gap-4 text-white",
            isPerfect ? "bg-[#D4AF37]" : "bg-rose-900"
          )}>
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-bold font-headline">
              {isPerfect ? "Hafalan Sempurna!" : "Belum Sempurna"}
            </h2>
          </div>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-4xl font-bold">{percentage}%</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skor</p>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold">{formatTime(time)}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Waktu</p>
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <p className="text-sm font-medium">Percobaan ke-{attempts}</p>
              {!isPerfect && (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                  <RotateCcw className="h-4 w-4 text-rose-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Target Harus 100%</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Silakan ulangi kuis hingga Anda benar-benar hafal seluruh arti kata dalam ayat ini.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            {isPerfect ? (
              <Button asChild className="w-full bg-black hover:bg-black/90 text-white font-bold h-12">
                <Link href={`/tilawah/${id}/${verseNumber}`}>SELESAI & LANJUT</Link>
              </Button>
            ) : (
              <Button 
                className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 gap-2"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 sm:px-0">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}/${verseNumber}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Uji Hafalan Kata</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(time)}</span>
          </div>
        </div>
        <div className="text-sm font-bold bg-muted px-3 py-1 rounded-full">{currentIdx + 1} / {words.length}</div>
      </div>

      <Progress value={((currentIdx + 1) / words.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-10 pt-12 bg-muted/10">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Pilih Arti yang Tepat:</CardTitle>
          <div className="text-6xl md:text-8xl font-arabic leading-relaxed text-[#B8860B]">{words[currentIdx]?.text_uthmani}</div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              className={cn(
                "h-auto py-5 text-lg font-bold transition-all border-2 bg-white ring-0 focus:ring-0 focus-visible:ring-0 outline-none shadow-sm rounded-xl",
                selectedAnswer === option && isCorrect === true && "bg-green-100 border-green-500 text-green-700",
                selectedAnswer === option && isCorrect === false && "bg-red-100 border-red-500 text-red-700",
                selectedAnswer && option === words[currentIdx]?.translation?.text && isCorrect === false && "bg-green-100 border-green-500 text-green-700",
                !selectedAnswer && "hover:border-[#D4AF37] hover:text-[#B8860B]"
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
    </div>
  );
}
