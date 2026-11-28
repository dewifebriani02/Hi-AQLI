'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  Timer,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Copy,
} from "lucide-react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuizModeSelector, QuizMode } from "@/components/mufradat/quiz-mode-selector";
import { cn } from "@/lib/utils";
import { useUser, useCollection, useDoc, authFetch } from "@/db";
import { useToast } from "@/hooks/use-toast";
import { getIrabNavigation } from "@/lib/irab-data";
import { generateIrabQuestions, IrabRichQuestion } from "@/lib/irab-quiz";
import {
  isIrabSoundEnabled,
  setIrabSoundEnabled,
  playIrabSfx,
  unlockIrabAudio,
} from "@/lib/irab-sound";
import { getAyahAudioUrl } from "@/lib/quran-reciters";

const FREE_IRAB_SURAHS = new Set(["1", "112", "113", "114"]);
const QUESTION_SECONDS = 10;

export default function IrabQuizPage() {
  const params = useParams();
  const router = useRouter();
  const surahId = params.surahId as string;
  const ayat = params.ayat as string;
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>("runut");
  const [questions, setQuestions] = useState<IrabRichQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [wrongWords, setWrongWords] = useState<IrabRichQuestion[]>([]);
  const [attempts, setAttempts] = useState(1);
  const [totalTime, setTotalTime] = useState(0);

  // Per-question countdown timer (mirrors Hi Mufradat 10s sprint timer)
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  // Sound & Murottal states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAyatKey = `${surahId}:${ayat}`;

  const {
    currentData,
    totalVersesInSurah,
    nextInSurah,
    prevGlobal,
    nextGlobal,
    nextSurah,
  } = useMemo(() => getIrabNavigation(surahId, ayat), [surahId, ayat]);

  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);

  // Leaderboard query
  const leaderboardOptions = useMemo(
    () => ({
      filters: [{ column: "quiz_id", operator: "==", value: `irab_${currentAyatKey}` }],
      orderBy: { column: "score", ascending: false },
    }),
    [currentAyatKey]
  );

  const { data: allAttempts, refresh: refreshLeaderboard } = useCollection(
    "quiz_attempts",
    leaderboardOptions
  );

  const userIds = useMemo(
    () => [...new Set(allAttempts?.map((a) => a.user_id) || [])],
    [allAttempts]
  );

  const usersOptions = useMemo(
    () => ({
      filters: [{ column: "id", operator: "in", value: userIds }],
    }),
    [userIds]
  );

  const { data: leaderboardUsers } = useCollection(
    userIds.length > 0 ? "users" : null,
    usersOptions
  );

  const uniqueLeaderboard = useMemo(() => {
    if (!allAttempts) return [];

    const uniqueMap = new Map();
    allAttempts.forEach((attempt) => {
      const existing = uniqueMap.get(attempt.user_id);
      const isNewBest =
        !existing ||
        attempt.score > existing.score ||
        (attempt.score === existing.score &&
          attempt.duration_seconds < existing.duration_seconds);

      if (isNewBest) {
        const uData = leaderboardUsers?.find((u) => u.id === attempt.user_id);
        uniqueMap.set(attempt.user_id, {
          ...attempt,
          userData: uData,
        });
      }
    });

    const finalCounts = new Map();
    allAttempts.forEach((a) =>
      finalCounts.set(a.user_id, (finalCounts.get(a.user_id) || 0) + 1)
    );

    return Array.from(uniqueMap.values())
      .map((item) => ({ ...item, attemptCount: finalCounts.get(item.user_id) }))
      .sort((a, b) => b.score - a.score || a.duration_seconds - b.duration_seconds)
      .slice(0, 5);
  }, [allAttempts, leaderboardUsers]);

  // Auth Guard: allow free surahs (1, 112, 113, 114) without login, matching Hi Mufradat
  useEffect(() => {
    if (!isUserLoading && !user && !FREE_IRAB_SURAHS.has(String(surahId))) {
      router.push("/login");
    }
  }, [user, isUserLoading, router, surahId]);

  useEffect(() => {
    setSoundEnabled(isIrabSoundEnabled());
    const savedReciter = localStorage.getItem("aqli_reciter_id");
    if (savedReciter) {
      const parsed = parseInt(savedReciter, 10);
      if (!isNaN(parsed)) setSelectedReciterId(parsed);
    }
  }, []);

  // Reset quiz state on verse change
  useEffect(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setIsLoadingAudio(false);

    setQuestions(generateIrabQuestions(surahId, ayat, "runut"));
    setLoading(false);
    setHasStarted(false);
    setQuizMode("runut");
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setWrongWords([]);
    setTotalTime(0);
    setTimeLeft(QUESTION_SECONDS);
    setTimerActive(false);
  }, [surahId, ayat]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setIrabSoundEnabled(next);
    if (next) {
      unlockIrabAudio();
      playIrabSfx("tick");
    }
  };

  const toggleVerseAudio = async () => {
    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const fullUrl = await getAyahAudioUrl(selectedReciterId, currentAyatKey);
      if (!fullUrl) throw new Error("Audio tidak ditemukan");

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlayingAudio(true);
        setIsLoadingAudio(false);
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
      };
      audio.onerror = () => {
        setIsLoadingAudio(false);
        setIsPlayingAudio(false);
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Gagal memutar suara murottal ayat ini.",
        });
      };

      await audio.play();
    } catch {
      setIsLoadingAudio(false);
      setIsPlayingAudio(false);
      toast({
        variant: "destructive",
        title: "Audio Error",
        description: "Gagal memuat murottal ayat.",
      });
    }
  };

  const saveProgress = useCallback(
    async (finalScore: number, totalQ: number, durationSeconds: number) => {
      if (!user) return;

      try {
        const response = await authFetch("/api/irab-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            quiz_id: `irab_${currentAyatKey}`,
            surah_id: surahId,
            ayat: ayat,
            score: finalScore,
            total_questions: totalQ,
            duration_seconds: durationSeconds,
          }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          toast({
            variant: "destructive",
            title: "Gagal menyimpan progres kuis",
            description: errData?.error || `Terjadi kesalahan (${response.status}).`,
          });
        } else {
          refreshLeaderboard();
          if (finalScore === totalQ) {
            toast({
              title: "MasyaAllah! +10 Poin",
              description: "Progres kuis I'rab berhasil disimpan.",
            });
          }
        }
      } catch (e) {
        console.error("Gagal menyimpan progres kuis:", e);
        toast({
          variant: "destructive",
          title: "Gagal menyimpan progres kuis",
          description: "Periksa koneksi internet Anda dan coba lagi.",
        });
      }
    },
    [user, surahId, ayat, currentAyatKey, toast, refreshLeaderboard]
  );

  const handleAnswer = useCallback(
    (answer: string) => {
      if (selectedAnswer || isFinished || questions.length === 0) return;

      if (typeof document !== "undefined") {
        (document.activeElement as HTMLElement)?.blur();
      }

      const currentQ = questions[currentIdx];
      if (!currentQ) return;

      const isAnsCorrect = answer === currentQ.correct;

      setSelectedAnswer(answer);
      setIsCorrect(isAnsCorrect);
      setTimerActive(false);

      const nextScore = isAnsCorrect ? score + 1 : score;
      if (isAnsCorrect) {
        playIrabSfx("correct");
        setScore(nextScore);
      } else {
        if (answer === "__timeout__") {
          toast({
            title: "WAKTU HABIS!",
            variant: "destructive",
            duration: 1000,
          });
        }
        playIrabSfx("incorrect");
        setWrongWords((prev) => [...prev, currentQ]);
      }

      const capturedTime = totalTime;

      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = setTimeout(() => {
        if (currentIdx + 1 < questions.length) {
          setCurrentIdx((prev) => prev + 1);
          setSelectedAnswer(null);
          setIsCorrect(null);
          setTimeLeft(QUESTION_SECONDS);
          setTimerActive(true);
        } else {
          setIsFinished(true);
          if (nextScore === questions.length) {
            playIrabSfx("perfect");
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#800000", "#D4AF37", "#ffffff"],
            });
          } else {
            playIrabSfx("fail");
          }
          saveProgress(nextScore, questions.length, capturedTime);
        }
      }, 1000);
    },
    [selectedAnswer, isFinished, questions, currentIdx, score, totalTime, toast, saveProgress]
  );

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  }, [handleAnswer]);

  // Total elapsed timer (ticks once started)
  useEffect(() => {
    if (!hasStarted || isFinished || loading) return;
    const interval = setInterval(() => {
      setTotalTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, isFinished, loading]);

  // Per-question 10s countdown timer
  useEffect(() => {
    if (!hasStarted || !timerActive || isFinished || loading) return;

    if (timeLeft <= 0) {
      handleAnswerRef.current("__timeout__");
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next > 0 && next <= 3) {
          playIrabSfx("tick");
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, timerActive, timeLeft, isFinished, loading]);

  const startQuiz = (mode: QuizMode) => {
    unlockIrabAudio();
    const generated = generateIrabQuestions(surahId, ayat, mode);
    setQuizMode(mode);
    setQuestions(generated);
    setCurrentIdx(0);
    setScore(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setWrongWords([]);
    setTotalTime(0);
    setTimeLeft(QUESTION_SECONDS);
    setHasStarted(true);
    setTimerActive(true);
  };

  const handleReset = () => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setScore(0);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setWrongWords([]);
    setAttempts((a) => a + 1);
    setTotalTime(0);
    setTimeLeft(QUESTION_SECONDS);
    setHasStarted(false);
    setTimerActive(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const buildReportText = () => {
    const duration = formatTime(totalTime);
    const salutation = userData?.salutation || "Ukhti";
    const name = userData?.full_name || userData?.username || "Hamba Allah";
    const surahName = currentData?.surah || "Surah";

    return (
      `*LAPORAN PROGRES HI I'RAB AQLI* 🌟\n\n` +
      `*Thalibah:* ${salutation} ${name}\n` +
      `*Bedah I'rab:* Surah ${surahName} Ayat ${ayat}\n` +
      `*Mode:* ${quizMode.toUpperCase()}\n` +
      `*Skor:* ${score}/${questions.length} (100% Sempurna!)\n` +
      `*Waktu:* ${duration}\n\n` +
      `Alhamdulillah, semakin paham Nahwu & Shorof Al-Qur'an! 📖✨`
    );
  };

  const handleShareReport = () => {
    const encodedText = encodeURIComponent(buildReportText());
    window.open(`https://wa.me/?text=${encodedText}`, "_blank");
  };

  const handleCopyReport = () => {
    const salutation = userData?.salutation || "Ukhti";
    navigator.clipboard.writeText(buildReportText());
    toast({
      title: "Laporan Disalin!",
      description: `Silakan tempel (paste) laporan ke grup atau catatan ${salutation}.`,
      duration: 3000,
    });
  };

  if (isUserLoading || loading) {
    return (
      <div className="flex flex-col items-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
        <p className="text-muted-foreground font-medium text-sm uppercase tracking-widest">
          Menyiapkan Kuis I&apos;rab...
        </p>
      </div>
    );
  }

  if (!user && !FREE_IRAB_SURAHS.has(String(surahId))) return null;

  if (!currentData || questions.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <Alert variant="destructive">
          <AlertTitle>Kuis Belum Tersedia</AlertTitle>
          <AlertDescription>Soal kuis untuk ayat ini tidak ditemukan.</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/irab">Kembali ke Hi I&apos;rab</Link>
        </Button>
      </div>
    );
  }

  if (isFinished) {
    const isPerfect = score === questions.length;
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-md mx-auto py-8 flex flex-col gap-8 pb-32 px-4 sm:px-0">
        <Card className="text-center border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div
            className={cn(
              "p-10 flex flex-col items-center gap-4 text-white relative overflow-hidden",
              isPerfect ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-800"
            )}
          >
            {isPerfect && (
              <div className="absolute top-4 right-4 animate-pulse">
                <Badge className="bg-white text-orange-600 font-black border-none">
                  +10 POIN
                </Badge>
              </div>
            )}
            <Trophy className={cn("w-16 h-16", isPerfect && "animate-bounce")} />
            <h2 className="text-2xl font-black font-headline uppercase tracking-tighter">
              {isPerfect ? "Masyallah Sempurna!" : "Alhamdulillah Selesai"}
            </h2>
            <p className="text-xs font-bold opacity-90 uppercase tracking-widest">
              {currentData.surah} Ayat {currentData.ayat} • Skor {score}/{questions.length}
            </p>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Waktu
                </p>
                <p className="text-xl font-bold">{formatTime(totalTime)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Akurasi
                </p>
                <p className="text-xl font-bold">{percentage}%</p>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Percobaan ke-{attempts} • Mode {quizMode.toUpperCase()}
              </p>
              {!isPerfect ? (
                <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                  <RefreshCw className="h-4 w-4 text-rose-800" />
                  <AlertTitle className="text-xs font-bold uppercase">
                    Target Harus 100%
                  </AlertTitle>
                  <AlertDescription className="text-[11px]">
                    Silakan ulangi kuis atau pelajari kembali analisis ayat ini hingga seluruh kedudukan I&apos;rab terjawab tepat.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                  <AlertTitle className="text-xs font-bold uppercase">Lulus 100%!</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    Alhamdulillah, Anda telah menguasai kedudukan I&apos;rab pada {currentData.surah} Ayat {currentData.ayat}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>

          {/* Wrong Words Review List — Mirrors Hi Mufradat */}
          {wrongWords.length > 0 && (
            <div className="px-8 pb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                  Salah ({wrongWords.length})
                </span>
                <div className="h-1 flex-1 bg-slate-200 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {wrongWords.map((w, idx) => (
                  <div
                    key={idx}
                    className="bg-rose-50 p-3 rounded-xl flex items-center justify-between gap-3 border border-rose-100"
                  >
                    <div className="flex flex-col">
                      <span className="text-2xl font-arabic text-[#800000]" dir="rtl">
                        {w.wordArab}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {w.trans} — &ldquo;{w.meaning}&rdquo;
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 text-right">
                      {w.type === "reverse" ? `${w.functionName}` : w.correct}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Next Verse Navigation — Exact Hi Mufradat Completion Flow */}
          <CardFooter className="flex flex-col gap-3 p-6 border-t bg-slate-50/50">
            {isPerfect ? (
              <div className="flex flex-col gap-3 w-full">
                {nextInSurah ? (
                  <>
                    <Button
                      asChild
                      className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-7 rounded-2xl shadow-xl uppercase tracking-[0.1em] text-xs gap-2 border-b-4 border-black/10 transition-all active:translate-y-1 active:border-b-0"
                    >
                      <Link href={`/irab/${nextInSurah.surahId}/${nextInSurah.ayat}/quiz`}>
                        <Zap className="w-4 h-4 fill-current" /> LANGSUNG KUIS AYAT{" "}
                        {nextInSurah.ayat}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-7 rounded-2xl uppercase tracking-widest text-xs gap-2 hover:bg-[#800000]/5 transition-all"
                    >
                      <Link href={`/irab/${nextInSurah.surahId}/${nextInSurah.ayat}`}>
                        BEDAH I&apos;RAB AYAT {nextInSurah.ayat}{" "}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </>
                ) : nextSurah && nextGlobal ? (
                  <Button
                    asChild
                    className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-7 rounded-2xl shadow-xl uppercase tracking-wider text-xs gap-2"
                  >
                    <Link href={`/irab/${nextGlobal.surahId}/${nextGlobal.ayat}`}>
                      LANJUT KE SURAH {nextSurah.name.toUpperCase()} (AYAT 1){" "}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <div className="w-full p-4 bg-emerald-50 rounded-2xl text-center border border-emerald-100 mb-1">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                      Maa Syaa Allah!
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Anda telah menyelesaikan seluruh ayat pada surah ini.
                    </p>
                  </div>
                )}

                {!user && (
                  <Button
                    asChild
                    className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest text-xs gap-2"
                  >
                    <Link href={`/register?redirectTo=/irab/${surahId}/${ayat}`}>
                      <Trophy className="w-4 h-4" /> DAFTAR UNTUK SIMPAN SKOR
                    </Link>
                  </Button>
                )}

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-2 border-slate-200 font-bold py-6 rounded-2xl hover:bg-white bg-white text-slate-600"
                >
                  <Link href={`/irab/${surahId}/${ayat}`}>
                    <BookOpen className="w-4 h-4 mr-2" /> KEMBALI KE ANALISIS AYAT{" "}
                    {currentData.ayat}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full text-slate-500 font-bold text-xs uppercase tracking-widest"
                >
                  <Link href={`/irab/${surahId}`}>KEMBALI KE DAFTAR AYAT</Link>
                </Button>

                {/* WhatsApp Sharing & Copy — Mirrors Hi Mufradat */}
                <div className="w-full space-y-3 pt-4 border-t border-slate-200">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Sudah cukup lelah hari ini?
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      Istirahatlah sejenak dan bagikan pencapaian Ukhti.
                    </p>
                  </div>

                  <Button
                    onClick={handleShareReport}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-7 rounded-2xl shadow-lg uppercase tracking-widest text-[10px] gap-3"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-7 rounded-2xl gap-2 shadow-xl uppercase tracking-widest text-xs"
                  onClick={handleReset}
                >
                  <RefreshCw className="w-4 h-4" /> ULANGI KUIS SEKARANG
                </Button>
                {!user && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-7 rounded-2xl uppercase tracking-widest text-[10px] gap-2"
                  >
                    <Link href="/register">DAFTAR AKUN HI AQLI</Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-2 border-[#800000]/20 text-[#800000] font-black py-6 rounded-2xl uppercase tracking-widest text-xs gap-2"
                >
                  <Link href={`/irab/${surahId}/${ayat}`}>
                    <BookOpen className="w-4 h-4" /> PELAJARI ULANG I&apos;RAB AYAT{" "}
                    {currentData.ayat}
                  </Link>
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* PAPAN JUARA */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-sm font-bold font-headline uppercase tracking-widest">
                Papan Juara Ayat Ini
              </h3>
            </div>
            <Badge
              variant="outline"
              className="text-[8px] font-bold border-[#D4AF37]/30 text-[#D4AF37]"
            >
              TOP 5
            </Badge>
          </div>

          <Card className="border-none shadow-sm bg-muted/20">
            <CardContent className="p-0">
              <div className="divide-y text-left">
                {uniqueLeaderboard && uniqueLeaderboard.length > 0 ? (
                  uniqueLeaderboard.map((item: any, idx: number) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 hover:bg-white/50 transition-colors"
                    >
                      <Link
                        href={`/profile/${item.user_id}`}
                        className="flex items-center gap-3 flex-1"
                      >
                        <span
                          className={cn(
                            "text-[10px] font-bold w-4",
                            idx === 0 ? "text-[#D4AF37]" : "text-muted-foreground"
                          )}
                        >
                          {idx + 1}
                        </span>
                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                          <AvatarImage src={item.userData?.photoURL} />
                          <AvatarFallback className="bg-[#800000] text-white text-xs font-bold">
                            {item.userData?.username?.[0] ||
                              item.userData?.email?.[0] ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold hover:text-[#800000] transition-colors">
                            {item.userData?.username || "Hamba Allah"}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-[#D4AF37]" />{" "}
                              {item.score}/{item.total_questions} Benar
                            </span>
                            <span className="text-[8px] text-muted-foreground italic">
                              ({formatTime(item.duration_seconds || 0)})
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[7px] h-3 px-1 border-[#800000]/20 text-[#800000] font-bold"
                            >
                              {item.attemptCount}x Coba
                            </Badge>
                          </div>
                        </div>
                      </Link>
                      {idx === 0 && (
                        <Star className="w-3 h-3 fill-current text-[#D4AF37] shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground italic text-xs">
                    Belum ada pejuang I&apos;rab di ayat ini.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 py-6 sm:py-8 pb-32">
      {/* Header — Mirrors Hi Mufradat with Timer + Ulangi + Sound Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 sticky top-16 sm:top-20 bg-background/95 backdrop-blur z-30 py-3 border-b">
        <Button asChild variant="ghost" size="icon" className="text-[#800000] shrink-0">
          <Link href={`/irab/${surahId}/${ayat}`}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-lg font-black font-headline truncate">
            Kuis I&apos;rab • {currentData.surah} ({currentData.ayat}/{totalVersesInSurah})
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" /> {formatTime(totalTime)}
            </span>
            <span>•</span>
            <span className="text-[#D4AF37]">Percobaan {attempts}</span>
          </div>
        </div>

        <div className="text-xs font-black text-[#800000] shrink-0">
          {currentIdx + 1} / {questions.length}
        </div>

        <Button
          onClick={toggleSound}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-[#800000] shrink-0"
          title={soundEnabled ? "Matikan Efek Suara" : "Nyalakan Efek Suara"}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-300" />
          )}
        </Button>

        <Button
          onClick={handleReset}
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[10px] font-black text-slate-400 hover:text-[#800000] uppercase tracking-tighter shrink-0"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Ulangi
        </Button>

        <div className="hidden sm:flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!prevGlobal}
            onClick={() =>
              prevGlobal && router.push(`/irab/${prevGlobal.surahId}/${prevGlobal.ayat}/quiz`)
            }
            title={
              prevGlobal
                ? `Kuis Ayat Sebelumnya (${prevGlobal.surah}: ${prevGlobal.ayat})`
                : "Ayat Pertama"
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!nextGlobal}
            onClick={() =>
              nextGlobal && router.push(`/irab/${nextGlobal.surahId}/${nextGlobal.ayat}/quiz`)
            }
            title={
              nextGlobal
                ? `Kuis Ayat Selanjutnya (${nextGlobal.surah}: ${nextGlobal.ayat})`
                : "Ayat Terakhir"
            }
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Progress
        value={((currentIdx + 1) / questions.length) * 100}
        className="h-1.5 bg-slate-100 [&>div]:bg-[#D4AF37]"
      />

      {!hasStarted ? (
        <QuizModeSelector
          onSelect={startQuiz}
          title="SIAP MULAI?"
          description="Pilih mode kuis I'rab Anda sebelum memulai (10 detik per soal)."
        />
      ) : (
        <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white relative">
          {/* SPRINT TIMER BAR — Mirrors Hi Mufradat */}
          {timerActive && (
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 z-10">
              <div
                className={cn(
                  "h-full transition-all duration-1000",
                  timeLeft > 5 ? "bg-orange-500" : "bg-rose-600"
                )}
                style={{ width: `${(timeLeft / QUESTION_SECONDS) * 100}%` }}
              />
            </div>
          )}

          <CardContent className="p-6 sm:p-10 text-center bg-slate-50 flex flex-col items-center gap-6 relative min-h-[420px]">
            {/* Top-left: Murottal Ayat Button */}
            <div className="w-full flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleVerseAudio}
                className="h-8 rounded-full border-[#800000]/20 bg-white text-[#800000] hover:bg-[#800000]/5 font-bold text-[11px] gap-1.5 shadow-sm"
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlayingAudio ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isPlayingAudio ? "Jeda Ayat" : "Dengar Ayat"}
              </Button>

              {/* Top-right: Countdown Timer Badge */}
              <Badge
                variant="outline"
                className={cn(
                  "font-black text-sm px-4 py-1.5 border-2 transition-all flex items-center gap-2 shadow-sm rounded-full",
                  timeLeft > 3
                    ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                    : "border-rose-600 text-rose-600 bg-rose-50 scale-110 animate-pulse"
                )}
              >
                <Timer className="w-4 h-4" /> 00:{timeLeft.toString().padStart(2, "0")}
              </Badge>
            </div>

            {currentQ && (
              <div className="w-full flex-1 flex flex-col justify-center gap-8">
                <div className="flex flex-col items-center justify-center gap-3 py-2 animate-in fade-in duration-500">
                  {currentQ.type === "reverse" ? (
                    <div className="space-y-4 w-full">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Kedudukan I&apos;rab &amp; Makna:
                      </p>
                      <div className="bg-white px-6 sm:px-8 py-6 rounded-[2rem] shadow-sm border border-slate-100 block w-full max-w-sm mx-auto space-y-1.5">
                        <div className="text-xl sm:text-2xl font-black text-[#800000]">
                          {currentQ.functionName}
                        </div>
                        <div className="text-sm font-medium text-slate-500">
                          &ldquo;{currentQ.meaning}&rdquo;
                        </div>
                      </div>
                      <p className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest mt-2">
                        {currentQ.promptLabel}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        {currentQ.promptLabel}
                      </p>
                      <div
                        className="text-5xl sm:text-6xl font-arabic text-[#800000] leading-relaxed drop-shadow-sm"
                        dir="rtl"
                      >
                        {currentQ.wordArab}
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        {currentQ.trans} • &ldquo;{currentQ.meaning}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 w-full max-w-md mx-auto">
                  {currentQ.options.map((option, i) => {
                    const isCorrectOption = option === currentQ.correct;

                    return (
                      <Button
                        key={i}
                        variant="outline"
                        size="lg"
                        className={cn(
                          "min-h-[4rem] h-auto py-4 rounded-2xl border-2 transition-all active:scale-[0.98] relative overflow-hidden group px-6 ring-0 focus:ring-0 focus-visible:ring-0 outline-none",
                          currentQ.type === "reverse"
                            ? "font-arabic text-2xl sm:text-3xl min-h-[5rem]"
                            : "text-sm sm:text-base font-bold",
                          selectedAnswer === option
                            ? isCorrectOption
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/20"
                              : "bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/20"
                            : selectedAnswer && isCorrectOption
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 opacity-90"
                            : "hover:border-[#800000]/40 hover:bg-[#800000]/5 bg-white"
                        )}
                        onClick={() => handleAnswer(option)}
                        disabled={!!selectedAnswer}
                      >
                        {selectedAnswer === option && (
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            {isCorrectOption ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-in zoom-in" />
                            ) : (
                              <XCircle className="w-6 h-6 text-rose-500 animate-in zoom-in" />
                            )}
                          </div>
                        )}
                        {selectedAnswer && selectedAnswer !== option && isCorrectOption && (
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-in zoom-in" />
                          </div>
                        )}

                        <span className="flex-1 text-center whitespace-normal break-words leading-tight px-6">
                          {option}
                        </span>

                        {selectedAnswer === option && isCorrectOption && (
                          <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-center text-muted-foreground italic">
        Uji pemahaman Anda tentang kedudukan i&apos;rab setiap kata dalam {currentData.surah} Ayat{" "}
        {currentData.ayat}.
      </p>
    </div>
  );
}
