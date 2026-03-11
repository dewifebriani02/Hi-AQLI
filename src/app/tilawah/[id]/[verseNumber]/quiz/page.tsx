
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, GraduationCap, CheckCircle2, XCircle, RefreshCw, Trophy, RotateCcw, Timer, Star, Heart, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";

interface WordData {
  id: number;
  text_uthmani: string;
  translation: {
    text: string;
  };
}

export default function WordQuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const verseNumber = params.verseNumber as string;
  const { toast } = useToast();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

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
  const [totalTime, setTotalTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); 
  const [sentCongrats, setSentCongrats] = useState<string[]>([]);

  // Fetch real global leaderboard for this verse (top 5)
  const leaderboardQuery = useMemoFirebase(() => {
    if (!db || !id || !verseNumber) return null;
    return query(
      collection(db, "users"),
      orderBy("points", "desc"),
      limit(5)
    );
  }, [db, id, verseNumber]);

  const { data: globalUsers } = useCollection(leaderboardQuery);

  // Auth Protection Redirect
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
    if (user) {
      fetchWords();
    }
  }, [fetchWords, user]);

  const saveProgress = useCallback(async (finalScore: number) => {
    if (!user || !db) return;
    const isPerfect = finalScore === words.length;
    
    try {
      // 1. Record Attempt
      addDoc(collection(db, "users", user.uid, "quiz_attempts"), {
        userId: user.uid,
        quizId: `verse_${id}_${verseNumber}`,
        surahId: id,
        verseNumber: parseInt(verseNumber),
        score: finalScore,
        totalQuestions: words.length,
        isPassed: isPerfect,
        durationSeconds: totalTime,
        createdAt: serverTimestamp(),
      });

      // 2. Grant Points if Perfect (Itqan)
      if (isPerfect) {
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, {
          points: increment(10), // Give 10 points for each perfect verse memorization
          updatedAt: serverTimestamp()
        }).catch(() => {
          // If updateDoc fails (e.g. field doesn't exist), try setDoc with merge
          setDocumentNonBlocking(userRef, { points: increment(10) }, { merge: true });
        });
      }
    } catch (e) {
      console.error("Error saving progress:", e);
    }
  }, [user, db, id, verseNumber, words.length, totalTime]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;
    
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const currentWord = words[currentIdx];
    if (!currentWord) return;

    const correct = currentWord.translation.text;
    const isAnsCorrect = answer === correct;
    
    setSelectedAnswer(answer === "" ? "Waktu Habis" : answer);
    setIsCorrect(isAnsCorrect);
    
    let nextScore = score;
    if (isAnsCorrect) {
      playSfx('correct');
      nextScore = score + 1;
      setScore(nextScore);
    } else {
      playSfx('incorrect');
      if (answer === "") {
        setTimeout(() => {
          toast({
            variant: "destructive",
            title: "Waktu Habis!",
            description: "Satu soal maksimal 1 menit.",
          });
        }, 0);
      }
    }

    setTimeout(() => {
      if (currentIdx + 1 < words.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsFinished(true);
        if (nextScore === words.length) {
          playSfx('perfect');
        } else {
          playSfx('fail');
        }
        saveProgress(nextScore);
      }
    }, 1200);
  }, [selectedAnswer, words, currentIdx, score, playSfx, toast, saveProgress]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && user) {
      interval = setInterval(() => {
        setTotalTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isFinished && !loading && !selectedAnswer && user) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, loading, selectedAnswer, user]);

  useEffect(() => {
    if (timeLeft === 0 && !selectedAnswer && !isFinished && !loading && user) {
      handleAnswer("");
    }
  }, [timeLeft, selectedAnswer, isFinished, loading, handleAnswer, user]);

  useEffect(() => {
    if (words.length > 0 && currentIdx < words.length) {
      setSelectedAnswer(null);
      setIsCorrect(null);
      setTimeLeft(60); 

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

  const handleReset = () => {
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAttempts(a => a + 1);
    setTotalTime(0);
    setTimeLeft(60);
    setSentCongrats([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendCongrats = (userName: string) => {
    if (sentCongrats.includes(userName)) return;
    setSentCongrats(prev => [...prev, userName]);
    toast({
      title: "Ucapan Terkirim!",
      description: `Masyallah, ucapan selamat terkirim ke ${userName}.`,
    });
  };

  if (isUserLoading || (loading && user)) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground font-medium">Menyiapkan Kuis Hafalan...</p>
      </div>
    );
  }

  if (!user) return null;

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
      <div className="max-w-md mx-auto py-10 flex flex-col gap-10 pb-32 px-4 sm:px-0">
        <Card className="text-center border-[#D4AF37]/20 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className={cn(
            "p-8 flex flex-col items-center gap-4 text-white transition-colors duration-500",
            isPerfect ? "bg-[#D4AF37]" : "bg-rose-900"
          )}>
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-bold font-headline">
              {isPerfect ? "Hafalan Sempurna!" : "Belum Sempurna"}
            </h2>
            {isPerfect && <Badge className="bg-white text-black font-black">+10 POIN HI AQLI</Badge>}
          </div>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-4xl font-bold">{percentage}%</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skor</p>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold">{formatTime(totalTime)}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Waktu</p>
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <p className="text-sm font-medium">Percobaan ke-{attempts}</p>
              {!isPerfect ? (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                  <RotateCcw className="h-4 w-4 text-rose-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Target Harus 100%</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Silakan ulangi kuis hingga Anda benar-benar hafal seluruh arti kata dalam ayat ini untuk membuka ayat selanjutnya dan mendapatkan poin.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Berhasil!</AlertTitle>
                  <AlertDescription className="text-[10px]">
                    Masyallah! Anda telah menguasai ayat ini. Poin Anda telah bertambah. Teruslah ber-Itqan!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6">
            {isPerfect ? (
              <Button asChild className="w-full bg-black hover:bg-black/90 text-white font-bold h-12 shadow-lg">
                <Link href={`/tilawah/${id}`}>KEMBALI KE DAFTAR</Link>
              </Button>
            ) : (
              <Button 
                className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 gap-2 shadow-lg"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
              </Button>
            )}
          </CardFooter>
        </Card>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Papan Juara Global</h3>
            </div>
            <Badge variant="outline" className="text-[8px] font-bold border-[#D4AF37]/30 text-[#D4AF37]">TOP 5</Badge>
          </div>
          
          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="p-0">
              <div className="divide-y">
                {globalUsers && globalUsers.length > 0 ? globalUsers.map((u, idx) => (
                  <div key={u.id} className="flex items-center justify-between p-3.5 hover:bg-white/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-bold w-4",
                        idx === 0 ? "text-[#D4AF37]" : "text-muted-foreground"
                      )}>{idx + 1}</span>
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback className="bg-[#800000] text-white text-xs font-bold">{u.username?.[0] || u.email?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{u.username || 'Hamba Allah'}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                             <Zap className="w-2.5 h-2.5 text-[#D4AF37]" /> {u.points || 0} Poin
                           </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleSendCongrats(u.username || 'Thalibah')}
                        className={cn(
                          "h-7 px-2 text-[9px] font-bold gap-1 transition-all",
                          sentCongrats.includes(u.username || 'Thalibah') ? "text-rose-500 bg-rose-50" : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        <Heart className={cn("w-3 h-3", sentCongrats.includes(u.username || 'Thalibah') && "fill-current")} />
                        {sentCongrats.includes(u.username || 'Thalibah') ? "Terkirim" : "Selamat"}
                      </Button>
                      {idx === 0 && <Star className="w-3 h-3 fill-current text-[#D4AF37] shrink-0" />}
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-muted-foreground italic text-xs">Belum ada peringkat tersedia.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 sm:px-0 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}/${verseNumber}`}><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Uji Hafalan Kata</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</span>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-colors duration-300",
          timeLeft <= 10 ? "border-rose-500 bg-rose-50 text-rose-600 animate-pulse" : "border-muted bg-muted/50 text-muted-foreground"
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm font-black font-mono">{timeLeft}s</span>
        </div>
      </div>

      <Progress value={((currentIdx + 1) / words.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

      <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-10 pt-12 bg-muted/10 relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Pilih Arti yang Tepat:</div>
          <div className="text-6xl md:text-8xl font-arabic leading-relaxed text-[#B8860B]">{words[currentIdx]?.text_uthmani}</div>
          <div className="absolute top-4 right-4 text-[9px] font-bold text-muted-foreground">KATA {currentIdx + 1} / {words.length}</div>
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
      
      <p className="text-[10px] text-center text-muted-foreground italic">
        Selesaikan setiap kata dalam kurang dari 60 detik. Fokus pada hubungan makna dan bunyi.
      </p>
    </div>
  );
}
