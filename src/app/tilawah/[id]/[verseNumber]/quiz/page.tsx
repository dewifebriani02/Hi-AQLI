
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, GraduationCap, CheckCircle2, XCircle, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    async function fetchWords() {
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
    }
    fetchWords();
  }, [id, verseNumber]);

  useEffect(() => {
    if (words.length > 0 && currentIdx < words.length) {
      const currentWord = words[currentIdx];
      const correct = currentWord.translation.text;
      
      // Get random unique wrong answers from all words in this verse
      let wrong = words
        .filter(w => w.translation.text !== correct)
        .map(w => w.translation.text);
      
      // Shuffle and take up to 3
      wrong = [...new Set(wrong)].sort(() => Math.random() - 0.5).slice(0, 3);
      
      // Combine and shuffle again
      const all = [correct, ...wrong].sort(() => Math.random() - 0.5);
      setOptions(all);
      // Reset state for new question (backup reset)
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
  }, [words, currentIdx]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    
    setSelectedAnswer(answer);
    const correct = words[currentIdx].translation.text;
    const isAnsCorrect = answer === correct;
    setIsCorrect(isAnsCorrect);
    
    if (isAnsCorrect) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      if (currentIdx + 1 < words.length) {
        // Crucial fix: Reset state before moving to the next index
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentIdx(c => c + 1);
      } else {
        setIsFinished(true);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
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
    const percentage = Math.round((score / words.length) * 100);
    return (
      <div className="max-w-md mx-auto py-10 flex flex-col gap-8">
        <Card className="text-center border-[#800000]/20 shadow-xl overflow-hidden">
          <div className="bg-[#800000] p-8 flex flex-col items-center gap-4 text-white">
            <Trophy className="w-16 h-16 animate-bounce" />
            <h2 className="text-2xl font-bold font-headline">Hasil Uji Hafalan</h2>
          </div>
          <CardContent className="pt-8 space-y-4">
            <div className="text-5xl font-bold text-[#800000]">{percentage}%</div>
            <p className="text-muted-foreground">
              Anda menjawab {score} dari {words.length} kata dengan benar.
            </p>
            <div className="pt-4">
               {percentage >= 80 ? (
                 <Badge className="bg-green-500 text-white p-2 px-4 rounded-lg">Luar Biasa!</Badge>
               ) : percentage >= 50 ? (
                 <Badge className="bg-blue-500 text-white p-2 px-4 rounded-lg">Cukup Bagus!</Badge>
               ) : (
                 <Badge className="bg-orange-500 text-white p-2 px-4 rounded-lg">Terus Berlatih!</Badge>
               )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold">
               <Link href={`/tilawah/${id}/${verseNumber}`}>Selesai</Link>
            </Button>
            <Button variant="outline" className="w-full font-bold gap-2" onClick={() => window.location.reload()}>
               <RefreshCw className="w-4 h-4" /> Ulangi Kuis
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentWord = words[currentIdx];
  const progressValue = ((currentIdx + 1) / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}/${verseNumber}`}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Uji Hafalan Kata</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold text-[#800000]">Ayat {verseNumber}</p>
        </div>
        <div className="text-sm font-bold text-muted-foreground">
          {currentIdx + 1} / {words.length}
        </div>
      </div>

      <Progress value={progressValue} className="h-2 bg-muted [&>div]:bg-[#800000]" />

      <Card className="border-[#800000]/10 shadow-lg">
        <CardHeader className="text-center pb-10 pt-12 bg-muted/20">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#800000]/60 mb-4">Apa arti dari kata ini?</CardTitle>
          <div className="text-6xl md:text-7xl font-arabic leading-relaxed text-[#800000]">
            {currentWord?.text_uthmani}
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              className={cn(
                "h-auto py-5 text-lg font-medium transition-all duration-200 border-2",
                selectedAnswer === option && isCorrect === true && "bg-green-100 border-green-500 text-green-700 hover:bg-green-100 hover:text-green-700",
                selectedAnswer === option && isCorrect === false && "bg-red-100 border-red-500 text-red-700 hover:bg-red-100 hover:text-red-700",
                selectedAnswer && option === currentWord?.translation?.text && isCorrect === false && "bg-green-100 border-green-500 text-green-700",
                !selectedAnswer && "hover:border-[#800000] hover:text-[#800000]"
              )}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span>{option}</span>
                {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {selectedAnswer === option && isCorrect === false && <XCircle className="w-5 h-5 text-red-600" />}
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground italic">
        Pilih jawaban yang paling tepat sesuai dengan terjemahan kata tersebut.
      </div>
    </div>
  );
}
