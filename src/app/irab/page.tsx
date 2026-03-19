'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Sparkles,
  BookOpen,
  Zap,
  ChevronRight,
  Info,
  Type,
  Layers,
  ChevronDown,
  Trophy,
  GraduationCap,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Timer,
  Star,
  Heart,
} from 'lucide-react';
import Link from "next/link";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Data I'rab dengan penjelasan lengkap
const JUZ_30_DATA: Record<string, any> = {
  "1:1": {
    surah: "Al-Fatihah",
    surahId: "1",
    ayat: 1,
    translation: "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.",
    words: [
      {
        word: "بِـ",
        wordArab: "بِـ",
        trans: "Bi",
        meaning: "Dengan",
        irab: "Harf Jar",
        irabArab: "حَرْفُ الجَرِّ",
        irabExplanation: "Huruf jar yang menyebabkan isim atau makhrun bihi setelahnya berubah menjadi kasrah (majrur). Bi berarti 'dengan' atau 'nama'.",
        shorof: "-",
        function: "Jar",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      },
      {
        word: "اسْمِ",
        wordArab: "الاسْمُ",
        trans: "Ismi",
        meaning: "Nama",
        irab: "Ism Majrur bi Harf al-Jar, wa huwa Mudhaf",
        irabArab: "اِسْمٌ مَجْرُورٌ بِحَرْفِ الجَرِّ، وَهُوَ مُضَافٌ",
        irabExplanation: "Isim yang dijar oleh huruf jar 'bi', sehingga mendapat kasrah. Kemudian berfungsi sebagai mudhaf (kata yang disandarkan kepada kata lain/ mudhaf ilaih).",
        shorof: "Root: s-m-w (س م و)",
        function: "Majrur / Mudhaf",
        color: "bg-amber-50 text-amber-700 border-amber-100"
      },
      {
        word: "اللَّهِ",
        wordArab: "اللَّهُ",
        trans: "Allāh",
        meaning: "Allah",
        irab: "Lafdzul Jalaalah, Mudhaf Ilaih, Majrur",
        irabArab: "لَفْظُ الجَلَالَةِ، مُضَافٌ إِلَيْهِ، مَجْرُورٌ",
        irabExplanation: "Lafdzul Jalaalah (kata Allah) berkedudukan sebagai mudhaf ilaih (kata yang disandari) yang menerima jar dari isim mudhaf sebelumnya, sehingga berakhiran kasrah.",
        shorof: "Lafdzul Jalaalah",
        function: "Mudhaf Ilaih",
        color: "bg-red-50 text-red-700 border-red-100"
      },
      {
        word: "الرَّحْمَٰنِ",
        wordArab: "الرَّحْمَٰنُ",
        trans: "Ar-Raḥmān",
        meaning: "Maha Pengasih",
        irab: "Na'at (Sifat) lil Jalaalah, Majrur",
        irabArab: "نَعْتٌ لِلْجَلَالَةِ، مَجْرُورٌ",
        irabExplanation: "Berfungsi sebagai na'at (kata sifat/keterangan) untuk lafdzul jalaalah yang mendapat jar, sehingga majrur (berakhiran kasrah).",
        shorof: "Root: r-h-m (ر ح م)",
        function: "Na'at",
        color: "bg-green-50 text-green-700 border-green-100"
      },
      {
        word: "الرَّحِيمِ",
        wordArab: "الرَّحِيمُ",
        trans: "Ar-Raḥīm",
        meaning: "Maha Penyayang",
        irab: "Na'at thaanin (Sifat kedua), Majrur",
        irabArab: "نَعْتٌ ثَانٍ، مَجْرُورٌ",
        irabExplanation: "Na'at kedua yang mengikuti na'at pertama, sama-sama mendapat jar karena mengikuti what yang dina'ti (ma'tuf). Berakhiran kasrah.",
        shorof: "Root: r-h-m (ر ح م)",
        function: "Na'at",
        color: "bg-green-50 text-green-700 border-green-100"
      }
    ]
  },
  "114:1": {
    surah: "An-Nas",
    surahId: "114",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan manusia,'",
    words: [
      {
        word: "قُلْ",
        wordArab: "قُلْ",
        trans: "Qul",
        meaning: "Katakanlah",
        irab: "Fi'il Amr (Kata kerja perintah), mabni 'ala sukun",
        irabArab: "فِعْلُ أَمْرٍ، مَبْنِيٌّ عَلَى السُّكُونِ",
        irabExplanation: "Fi'il amr yang dibina sukun pada akhir kata karena fi'il amr selalu mabni. Berfungsi sebagai kalam (predikat) yang marfu' dengan dhammah dhamirah.",
        shorof: "Root: q-w-l (ق و ل)",
        function: "Fi'il Amr",
        color: "bg-purple-50 text-purple-700 border-purple-100"
      },
      {
        word: "أَعُوذُ",
        wordArab: "أَعُوذُ",
        trans: "A'ūdhu",
        meaning: "Aku berlindung",
        irab: "Fi'il Mudhari' (Sedang/akan), Marfu' bid-dhammah",
        irabArab: "فِعْلُ مُضَارِعٍ، مَرْفُوعٌ بِالضَّمَّةِ",
        irabExplanation: "Fi'il mudhari' yang marfu' dengan dhammah dhomirah pada wawu. Berfungsi sebagai kalam (predikat) untuk fa'il (pelaku) yang tersembunyi (dhamir mustatir).",
        shorof: "Root: 'awd (ع و ذ)",
        function: "Fi'il Mudhari'",
        color: "bg-indigo-50 text-indigo-700 border-indigo-100"
      },
      {
        word: "بِـ",
        wordArab: "بِـ",
        trans: "Bi",
        meaning: "Kepada / Dengan",
        irab: "Harf Jar",
        irabArab: "حَرْفُ الجَرِّ",
        irabExplanation: "Huruf jar yang menyebabkan isim setelahnya berubah menjadi kasrah (majrur). Dalam konteks ini berarti 'kepada' karena ta'alluh dengan fi'il.",
        shorof: "-",
        function: "Jar",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      },
      {
        word: "رَبِّ",
        wordArab: "الرَّبُّ",
        trans: "Rabbi",
        meaning: "Tuhan",
        irab: "Ism Majrur, wa huwa Mudhaf",
        irabArab: "اِسْمٌ مَجْرُورٌ، وَهُوَ مُضَافٌ",
        irabExplanation: "Isim yang dijar oleh huruf jar 'bi', sehingga mendapat kasrah. Berfungsi sebagai mudhaf yang akan disandarkan kepada mudhaf ilaih.",
        shorof: "Root: r-b-b (ر ب ب)",
        function: "Majrur / Mudhaf",
        color: "bg-amber-50 text-amber-700 border-amber-100"
      },
      {
        word: "النَّاسِ",
        wordArab: "النَّاسُ",
        trans: "An-Nās",
        meaning: "Manusia",
        irab: "Mudhaf Ilaih, Majrur bil-kasrah",
        irabArab: "مُضَافٌ إِلَيْهِ، مَجْرُورٌ بِالْكَسْرَةِ",
        irabExplanation: "Mudhaf ilaih (kata yang disandari) yang menerima jar dari mudhaf sebelumnya. Berakhiran ya' nisbah yang dibaca kasrah.",
        shorof: "Root: n-w-s (ن و س)",
        function: "Mudhaf Ilaih",
        color: "bg-red-50 text-red-700 border-red-100"
      }
    ]
  },
  "113:1": {
    surah: "Al-Falaq",
    surahId: "113",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan yang menguasai subuh (fajar),'",
    words: [
      {
        word: "قُلْ",
        wordArab: "قُلْ",
        trans: "Qul",
        meaning: "Katakanlah",
        irab: "Fi'il Amr",
        irabArab: "فِعْلُ أَمْرٍ",
        irabExplanation: "Fi'il amr mabni sukun, berfungsi sebagai kalam (predikat) untuk dhamir mustatir (pelaku yang tersembunyi: anta).",
        shorof: "Root: q-w-l",
        function: "Fi'il Amr",
        color: "bg-purple-50 text-purple-700 border-purple-100"
      },
      {
        word: "أَعُوذُ",
        wordArab: "أَعُوذُ",
        trans: "A'ūdhu",
        meaning: "Aku berlindung",
        irab: "Fi'il Mudhari'",
        irabArab: "فِعْلُ مُضَارِعٍ",
        irabExplanation: "Fi'il mudhari' marfu' dengan dhammah, fa'ilnya tersembunyi (dhamir mustatir: ana).",
        shorof: "Root: 'awd",
        function: "Fi'il Mudhari'",
        color: "bg-indigo-50 text-indigo-700 border-indigo-100"
      },
      {
        word: "بِـ",
        wordArab: "بِـ",
        trans: "Bi",
        meaning: "Kepada",
        irab: "Harf Jar",
        irabArab: "حَرْفُ الجَرِّ",
        irabExplanation: "Huruf jar yang menjarkan isim setelahnya.",
        shorof: "-",
        function: "Jar",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      },
      {
        word: "رَبِّ",
        wordArab: "الرَّبُّ",
        trans: "Rabbi",
        meaning: "Tuhan",
        irab: "Ism Majrur, wa huwa Mudhaf",
        irabArab: "اِسْمٌ مَجْرُورٌ، وَهُوَ مُضَافٌ",
        irabExplanation: "Isim majrur karena menerima jar dari harf jar, sekaligus mudhaf yang disandarkan kepada mudhaf ilaih.",
        shorof: "Root: r-b-b",
        function: "Majrur / Mudhaf",
        color: "bg-amber-50 text-amber-700 border-amber-100"
      },
      {
        word: "الْفَلَقِ",
        wordArab: "الْفَلَقُ",
        trans: "Al-Falaq",
        meaning: "Waktu Subuh",
        irab: "Mudhaf Ilaih, Majrur",
        irabArab: "مُضَافٌ إِلَيْهِ، مَجْرُورٌ",
        irabExplanation: "Mudhaf ilaih yang menerima jar dari mudhaf sebelumnya.",
        shorof: "Root: f-l-q (ف ل ق)",
        function: "Mudhaf Ilaih",
        color: "bg-emerald-50 text-emerald-700 border-emerald-100"
      }
    ]
  }
};

// Kuis options untuk setiap ayat
const QUIZ_DATA: Record<string, any> = {
  "1:1": {
    questions: [
      {
        question: "Apa kedudukan i'rab dari kata 'بِـ' (Bi)?",
        correct: "Harf Jar",
        options: ["Fi'il Amr", "Harf Jar", "Ism Majrur", "Na'at"]
      },
      {
        question: "Apa fungsi dari kata 'اللَّهِ' (Allah)?",
        correct: "Mudhaf Ilaih",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il"]
      },
      {
        question: "Kata 'الرَّحْمَٰنِ' berkedudukan sebagai?",
        correct: "Na'at",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il Amr"]
      }
    ]
  },
  "114:1": {
    questions: [
      {
        question: "Apa kedudukan i'rab dari kata 'قُلْ' (Qul)?",
        correct: "Fi'il Amr",
        options: ["Fi'il Mudhari'", "Fi'il Amr", "Harf Jar", "Ism Majrur"]
      },
      {
        question: "Kata 'أَعُوذُ' adalah fi'il apa?",
        correct: "Fi'il Mudhari'",
        options: ["Fi'il Madhi", "Fi'il Mudhari'", "Fi'il Amr", "Fi'il Muda'rif"]
      },
      {
        question: "Apa fungsi dari kata 'رَبِّ' (Rabbi)?",
        correct: "Majrur / Mudhaf",
        options: ["Mudhaf Ilaih", "Na'at", "Majrur / Mudhaf", "Fi'il"]
      }
    ]
  },
  "113:1": {
    questions: [
      {
        question: "Huruf 'بِـ' dalam ayat ini berkedudukan sebagai?",
        correct: "Harf Jar",
        options: ["Harf Jar", "Fi'il Amr", "Na'at", "Mudhaf"]
      },
      {
        question: "Kedudukan 'الْفَلَقِ' adalah?",
        correct: "Mudhaf Ilaih",
        options: ["Mudhaf", "Mudhaf Ilaih", "Na'at", "Fi'il Mudhari'"]
      }
    ]
  }
};

export default function IrabPage() {
  const [currentAyatKey, setCurrentAyatKey] = useState("1:1");
  const [selectedWord, setSelectedWord] = useState<number | null>(0);
  const [showQuiz, setShowQuiz] = useState(false);

  // Kuis state
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizAttempts, setQuizAttempts] = useState(1);
  const [totalTime, setTotalTime] = useState(0);

  const { user } = useUser();
  const currentData = useMemo(() => JUZ_30_DATA[currentAyatKey], [currentAyatKey]);
  const quizData = useMemo(() => QUIZ_DATA[currentAyatKey] || { questions: [] }, [currentAyatKey]);

  // Fetch leaderboard data dari tabel quiz_attempts yang sudah ada
  const { data: allAttempts } = useCollection("quiz_attempts", {
    filters: [
      { column: 'quizId', operator: '==', value: `irab_${currentAyatKey}` }
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
        attempt.score > existing.score ||
        (attempt.score === existing.score && (attempt.durationSeconds < existing.durationSeconds));

      if (isNewBest) {
        const userData = leaderboardUsers?.find(u => u.id === attempt.user_id);
        uniqueMap.set(attempt.user_id, {
          ...attempt,
          userData,
        });
      }
    });

    const finalCounts = new Map();
    allAttempts.forEach(a => finalCounts.set(a.user_id, (finalCounts.get(a.user_id) || 0) + 1));

    return Array.from(uniqueMap.values())
      .map(item => ({ ...item, attemptCount: finalCounts.get(item.user_id) }))
      .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds)
      .slice(0, 5);
  }, [allAttempts, leaderboardUsers]);

  // Timer for quiz
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!quizFinished && showQuiz && !selectedAnswer) {
      interval = setInterval(() => {
        setTotalTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizFinished, showQuiz, selectedAnswer]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;

    const currentQ = quizData.questions[currentQuizIdx];
    const correct = answer === currentQ.correct;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      setQuizScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuizIdx + 1 < quizData.questions.length) {
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentQuizIdx(prev => prev + 1);
      } else {
        setQuizFinished(true);
        // Save progress
        if (user) {
          saveQuizProgress();
        }
      }
    }, 1200);
  };

  const saveQuizProgress = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/irab-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          quizId: `irab_${currentAyatKey}`,
          surahId: currentData.surahId,
          ayat: currentData.ayat,
          score: quizScore + (isCorrect ? 1 : 0),
          totalQuestions: quizData.questions.length,
          durationSeconds: totalTime,
        })
      });
    } catch (e) {
      console.error("Failed to save quiz progress:", e);
    }
  };

  const resetQuiz = () => {
    setCurrentQuizIdx(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setQuizFinished(false);
    setQuizAttempts(prev => prev + 1);
    setTotalTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000]">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-black text-[#800000] leading-none uppercase">Hi I'rab</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Juz 30 • Bedah Nahwu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px] font-black uppercase bg-amber-50">
             {currentData.surah}: {currentData.ayat}
           </Badge>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Ayat Selector Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {Object.keys(JUZ_30_DATA).map(key => (
            <Button
              key={key}
              onClick={() => {
                setCurrentAyatKey(key);
                setSelectedWord(0);
                setShowQuiz(false);
                resetQuiz();
              }}
              variant={currentAyatKey === key ? "default" : "outline"}
              className={cn(
                "rounded-full px-4 h-8 text-[10px] font-black uppercase flex-shrink-0 transition-all",
                currentAyatKey === key ? "bg-[#800000] text-white border-none" : "border-orange-200 text-[#800000] bg-white"
              )}
            >
              {JUZ_30_DATA[key].surah} {JUZ_30_DATA[key].ayat}
            </Button>
          ))}
          <Button variant="ghost" className="rounded-full px-4 h-8 text-[10px] font-black uppercase flex-shrink-0 text-slate-400">
            LIHAT SEMUA <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Ayat Display Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#800000] rounded-3xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex flex-row-reverse flex-wrap justify-center gap-x-4 gap-y-6">
              {currentData.words.map((item: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setSelectedWord(idx)}
                  className={cn(
                    "cursor-pointer transition-all duration-300 group relative",
                    selectedWord === idx ? "scale-110" : "opacity-70 hover:opacity-100"
                  )}
                >
                  <p className={cn(
                    "text-4xl font-arabic leading-relaxed transition-colors",
                    selectedWord === idx ? "text-[#800000]" : "text-slate-700"
                  )}>
                    {item.word}
                  </p>
                  <div className={cn(
                    "h-1 w-full mt-1 rounded-full transition-all",
                    selectedWord === idx ? "bg-[#D4AF37]" : "bg-transparent group-hover:bg-slate-200"
                  )} />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
               <p className="text-sm font-bold text-[#800000] mb-1 italic">
                 "{currentData.translation}"
               </p>
               <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                 Pilih kata di atas untuk banting I'rab
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Word Detail Section - RATA KANAN */}
        {selectedWord !== null && currentData.words[selectedWord] && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 px-1">
              <Zap className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">Analisis Kata (I'rab)</h3>
              <div className="h-[1px] flex-1 bg-orange-100" />
            </div>

            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
               <div className={cn("h-2 w-full", currentData.words[selectedWord].color.split(' ')[0])} />
               <CardContent className="p-6">
                 {/* Header - RATA KANAN */}
                 <div className="flex justify-between items-start mb-6 text-right" dir="rtl">
                   <div className="text-right">
                     <h4 className="text-4xl font-arabic text-black mb-1">{currentData.words[selectedWord].wordArab}</h4>
                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{currentData.words[selectedWord].trans}</p>
                   </div>
                   <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg", currentData.words[selectedWord].color)}>
                     {currentData.words[selectedWord].function}
                   </Badge>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                   {/* Kedudukan I'rab - Dengan Arab + Indonesia + Penjelasan */}
                   <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-xl bg-white text-[#800000] shadow-sm"><Layers className="w-5 h-5" /></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Info className="w-3 h-3" /> Kedudukan (I'rab)
                        </p>
                      </div>
                      <div className="space-y-3" dir="rtl">
                        <div className="text-right border-b border-slate-200 pb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">بِاللُّغَةِ الْعَرَبِيَّةِ</p>
                          <p className="text-lg font-arabic font-bold text-[#800000] leading-relaxed">
                            {currentData.words[selectedWord].irabArab}
                          </p>
                        </div>
                        <div className="text-right border-b border-slate-200 pb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Bahasa Indonesia</p>
                          <p className="text-base font-bold text-slate-800 leading-relaxed">
                            {currentData.words[selectedWord].irab}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-orange-100">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider mb-1">Penjelasan</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {currentData.words[selectedWord].irabExplanation}
                          </p>
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                        <div className="p-2 rounded-lg bg-white text-orange-600 shadow-sm"><Type className="w-4 h-4" /></div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-1">Akar (Shorof)</p>
                          <p className="text-sm font-bold text-orange-900">{currentData.words[selectedWord].shorof}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                        <div className="p-2 rounded-lg bg-white text-amber-600 shadow-sm"><BookOpen className="w-4 h-4" /></div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-amber-400 uppercase tracking-tighter mb-1">Makna Indo</p>
                          <p className="text-sm font-bold text-amber-900">{currentData.words[selectedWord].meaning}</p>
                        </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        )}

        {/* Kuis Button */}
        {!showQuiz && selectedWord !== null && (
          <Button
            onClick={() => setShowQuiz(true)}
            className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold gap-2 py-6 h-14 text-lg"
          >
            <GraduationCap className="w-5 h-5" />
            Uji Pemahaman I'rab
          </Button>
        )}

        {/* KUIS Section */}
        {showQuiz && !quizFinished && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">Kuis I'rab</h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span className="text-[#D4AF37]">Soal {currentQuizIdx + 1}/{quizData.questions.length}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(totalTime)}</span>
              </div>
            </div>

            <Progress value={((currentQuizIdx + 1) / quizData.questions.length) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />

            <Card className="border-[#D4AF37]/10 shadow-2xl overflow-hidden rounded-2xl">
              <CardHeader className="text-center pb-8 pt-10 bg-muted/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Pilih Jawaban yang Tepat:</div>
                <div className="text-xl md:text-2xl font-bold text-[#B8860B] text-center">
                  {quizData.questions[currentQuizIdx]?.question}
                </div>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 gap-4">
                {quizData.questions[currentQuizIdx]?.options.map((option: string, idx: number) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className={cn(
                      "h-auto py-5 text-base font-bold transition-all border-2 bg-white ring-0 focus:ring-0 outline-none shadow-sm rounded-xl",
                      selectedAnswer === option && isCorrect === true && "bg-green-100 border-green-500 text-green-700",
                      selectedAnswer === option && isCorrect === false && "bg-red-100 border-red-500 text-red-700",
                      selectedAnswer && option === quizData.questions[currentQuizIdx].correct && isCorrect === false && "bg-green-100 border-green-500 text-green-700",
                      !selectedAnswer && "hover:border-[#D4AF37] hover:text-[#B8860B]"
                    )}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedAnswer}
                  >
                    <div className="flex items-center justify-between w-full px-2">
                      <span className="truncate">{option}</span>
                      {selectedAnswer === option && isCorrect === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                      {selectedAnswer === option && isCorrect === false && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                      {selectedAnswer && option === quizData.questions[currentQuizIdx].correct && isCorrect === false && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quiz Finished - Leaderboard */}
        {quizFinished && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="text-center border-[#D4AF37]/20 shadow-xl overflow-hidden">
              <div className={cn(
                "p-8 flex flex-col items-center gap-4 text-white transition-colors duration-500",
                quizScore === quizData.questions.length ? "bg-[#D4AF37]" : "bg-rose-900"
              )}>
                <Trophy className={cn("w-16 h-16", quizScore === quizData.questions.length && "animate-bounce")} />
                <h2 className="text-2xl font-bold">
                  {quizScore === quizData.questions.length ? "Sempurna!" : "Belum Sempurna"}
                </h2>
                {quizScore === quizData.questions.length && <Badge className="bg-white text-black font-black">+10 POIN</Badge>}
              </div>
              <CardContent className="pt-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-4xl font-bold">{Math.round((quizScore / quizData.questions.length) * 100)}%</div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skor</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-4xl font-bold">{formatTime(totalTime)}</div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Waktu</p>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                  <p className="text-sm font-medium">Percobaan ke-{quizAttempts}</p>
                  {quizScore < quizData.questions.length ? (
                    <Alert className="bg-rose-50 border-rose-200 text-rose-800 text-left">
                      <AlertTitle className="text-xs font-bold uppercase">Target 100%</AlertTitle>
                      <AlertDescription className="text-[10px]">
                        Silakan ulangi kuis untuk menguasai i'rab ayat ini.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-left">
                      <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                      <AlertTitle className="text-xs font-bold uppercase">Berhasil!</AlertTitle>
                      <AlertDescription className="text-[10px]">
                        Masyallah! Anda telah menguasai i'rab ayat ini.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 p-6">
                {quizScore === quizData.questions.length ? (
                  <Button
                    className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-bold h-12"
                    onClick={() => setShowQuiz(false)}
                  >
                    Kembali ke Analisis
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold h-12 gap-2"
                    onClick={resetQuiz}
                  >
                    <RefreshCw className="w-4 h-4" /> ULANGI KUIS
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* PAPAN JUARA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#D4AF37] fill-current" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Papan Juara Ayat Ini</h3>
                </div>
                <Badge variant="outline" className="text-[8px] font-bold border-[#D4AF37]/30 text-[#D4AF37]">TOP 5</Badge>
              </div>

              <Card className="border-none shadow-sm bg-muted/20">
                <CardContent className="p-0">
                  <div className="divide-y text-left">
                    {uniqueLeaderboard && uniqueLeaderboard.length > 0 ? uniqueLeaderboard.map((item: any, idx: number) => (
                      <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-white/50 transition-colors">
                        <Link href={`/profile/${item.user_id}`} className="flex items-center gap-3 flex-1">
                          <span className={cn(
                            "text-[10px] font-bold w-4",
                            idx === 0 ? "text-[#D4AF37]" : "text-muted-foreground"
                          )}>{idx + 1}</span>
                          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                            <AvatarImage src={item.userData?.photoURL} />
                            <AvatarFallback className="bg-[#800000] text-white text-xs font-bold">
                              {item.userData?.username?.[0] || item.userData?.email?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold hover:text-[#800000] transition-colors">
                              {item.userData?.username || 'Hamba Allah'}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-[#D4AF37]" /> {item.score}/{item.totalQuestions} Benar
                              </span>
                              <span className="text-[8px] text-muted-foreground italic">
                                ({formatTime(item.durationSeconds || 0)})
                              </span>
                              <Badge variant="outline" className="text-[7px] h-3 px-1 border-[#800000]/20 text-[#800000] font-bold">
                                {item.attemptCount}x Coba
                              </Badge>
                            </div>
                          </div>
                        </Link>
                        {idx === 0 && <Star className="w-3 h-3 fill-current text-[#D4AF37] shrink-0" />}
                      </div>
                    )) : (
                      <div className="py-8 text-center text-muted-foreground italic text-xs">Belum ada pejuang I'rab di ayat ini.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="pt-10 flex flex-col items-center justify-center text-center">
           <div className="p-4 rounded-2xl bg-white shadow-sm border border-orange-100">
             <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Al-Juz al-Thalathun</p>
             <p className="text-[9px] text-muted-foreground font-bold italic mt-1">Data I'rab Juz 30 sedang diperbarui berkala.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
