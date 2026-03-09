
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, GraduationCap, CheckCircle2, XCircle, RefreshCw, Trophy, RotateCcw } from "lucide-react";
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

  // SFX Player
  const playSfx = useCallback((type: 'correct' | 'incorrect' | 'perfect' | 'fail') => {
    const soundUrls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Blip (Swapped: Benar = Blip)
      incorrect: 'https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3', // Ding (Swapped: Salah = Ding)
      perfect: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Fanfare
      fail: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3', // Fail sound
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
    
    // Explicitly blur the button to remove focus ring immediately
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
      <div className="p-12 text-center flex flex-col items-center gap-4 max-w-lg mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>Tidak dapat memuat kuis untuk ayat ini.</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href={`/tilawah/${id}/${verseNumber}`}>Kembali</Link>
        </Button>
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
            "p-8 flex flex-col items-center gap-4 text-white transition-colors duration-500",
            isPerfect ? "bg-[#D4AF37]" : "bg-rose-900"
          )}>
            <Trophy className={cn("w-16 h-16 text-white/80", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-bold font-headline">
              {isPerfect ? "Sempurna!" : "Hafalan Belum Sempurna"}
            </h2>
          </div>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-1">
              <div className="text-5xl font-bold text-black">{percentage}%</div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Skor Akurasi</p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl space-y-2">
              <p className="text-sm text-muted-foreground">
                Anda menjawab <strong>{score}</strong> dari <strong>{words.length}</strong> kata dengan benar.
              </p>
              <div className="flex items-center justify-center gap-2 text-[#B8860B] font-bold">
                <RefreshCw className="w-4 h-4" />
                <span>Jumlah Percobaan: {attempts}</span>
              </div>
            </div>

            {!isPerfect && (
              <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                <RotateCcw className="h-4 w-4 text-rose-800" />
                <AlertTitle className="text-xs font-bold">TARGET HARUS 100%</AlertTitle>
                <AlertDescription className="text-[10px] leading-relaxed">
                  Mohon ulangi kuis. Target program Sahabat AQLI adalah hafalan sempurna 100%. Silakan tekan tombol di bawah untuk mencoba lagi.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            {isPerfect ? (
              <Button asChild className="w-full bg-black hover:bg-black/90 text-white font-bold h-12 shadow-lg">
                <Link href={`/tilawah/${id}/${verseNumber}`}>SELESAI & LANJUT</Link>
              </Button>
            ) : (
              <Button 
                className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 shadow-lg gap-2"
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

  const progressValue = ((currentIdx + 1) / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 sm:px-0">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}/${verseNumber}`}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Uji Hafalan Kata</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold text-[#D4AF37]">Ayat {verseNumber} • Percobaan {attempts}</p>
        </div>
        <div className="text-sm font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {currentIdx + 1} / {words.length}
        </div>
      </div>

      <Progress value={progressValue} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card key={`question-card-${currentIdx}`} className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-10 pt-12 bg-muted/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <GraduationCap className="w-24 h-24" />
           </div>
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Apa arti dari kata ini?</CardTitle>
          <div className="text-6xl md:text-8xl font-arabic leading-relaxed text-[#B8860B] drop-shadow-sm">
            {words[currentIdx]?.text_uthmani}
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => (
            <Button
              key={`${currentIdx}-opt-${idx}`}
              variant="outline"
              className={cn(
                "h-auto py-5 text-lg font-bold transition-all duration-200 border-2 bg-white ring-0 focus:ring-0 focus-visible:ring-0 outline-none shadow-sm rounded-xl",
                selectedAnswer === option && isCorrect === true && "bg-green-100 border-green-500 text-green-700 hover:bg-green-100",
                selectedAnswer === option && isCorrect === false && "bg-red-100 border-red-500 text-red-700 hover:bg-red-100",
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
      
      <div className="text-center text-[10px] text-muted-foreground italic font-medium">
        Target 100% diperlukan untuk melanjutkan. Pelajari arti kata dengan teliti.
      </div>
    </div>
  );
}
