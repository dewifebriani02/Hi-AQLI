"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Search, CheckCircle2, Star, ChevronDown, ChevronRight, Lock, GraduationCap, ArrowRight, Play, Pause, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { JUZ_PAGE_MAPPING, getPagesForJuz } from "@/lib/quran-mapping";

// Mapping Juz to starting surah and verse
const JUZ_MAPPING: Record<number, { surah: number, verse: number, name: string }> = {
  1: { surah: 1, verse: 1, name: "Al-Fatihah" },
  2: { surah: 2, verse: 142, name: "Al-Baqarah" },
  3: { surah: 2, verse: 253, name: "Al-Baqarah" },
  4: { surah: 3, verse: 93, name: "Ali 'Imran" },
  5: { surah: 4, verse: 24, name: "An-Nisa'" },
  6: { surah: 4, verse: 148, name: "An-Nisa'" },
  7: { surah: 5, verse: 82, name: "Al-Ma'idah" },
  8: { surah: 6, verse: 111, name: "Al-An'am" },
  9: { surah: 7, verse: 88, name: "Al-A'raf" },
  10: { surah: 8, verse: 41, name: "Al-Anfal" },
  11: { surah: 9, verse: 93, name: "At-Taubah" },
  12: { surah: 11, verse: 6, name: "Hud" },
  13: { surah: 12, verse: 53, name: "Yusuf" },
  14: { surah: 15, verse: 1, name: "Al-Hijr" },
  15: { surah: 17, verse: 1, name: "Al-Isra'" },
  16: { surah: 18, verse: 75, name: "Al-Kahf" },
  17: { surah: 21, verse: 1, name: "Al-Anbiya'" },
  18: { surah: 23, verse: 1, name: "Al-Mu'minun" },
  19: { surah: 25, verse: 21, name: "Al-Furqan" },
  20: { surah: 27, verse: 56, name: "An-Naml" },
  21: { surah: 29, verse: 45, name: "Al-'Ankabut" },
  22: { surah: 33, verse: 31, name: "Al-Ahzab" },
  23: { surah: 36, verse: 28, name: "Ya-Sin" },
  24: { surah: 39, verse: 32, name: "Az-Zumar" },
  25: { surah: 41, verse: 47, name: "Fussilat" },
  26: { surah: 46, verse: 1, name: "Al-Ahqaf" },
  27: { surah: 51, verse: 31, name: "Adh-Dhariyat" },
  28: { surah: 58, verse: 1, name: "Al-Mujadila" },
  29: { surah: 67, verse: 1, name: "Al-Mulk" },
  30: { surah: 78, verse: 1, name: "An-Naba'" },
};

const JUZ_VERSE_COUNTS: Record<number, number> = {
  1: 148, 2: 111, 3: 126, 4: 131, 5: 124, 6: 110, 7: 149, 8: 142, 9: 159, 10: 127,
  11: 151, 12: 170, 13: 154, 14: 227, 15: 185, 16: 269, 17: 190, 18: 202, 19: 338, 20: 171,
  21: 178, 22: 163, 23: 357, 24: 175, 25: 246, 26: 195, 27: 399, 28: 137, 29: 431, 30: 564
};

interface JuzListProps {
  baseUrl?: string;
  userProgress?: any[];
  variant?: "mufradat" | "tilawah";
  selectedReciterId?: number;
  mode?: "ayat" | "halaman";
  unlockedJuz?: number[];
}

export function JuzList({ 
  baseUrl = "/mufradat", 
  userProgress = [], 
  variant = "mufradat",
  selectedReciterId = 7,
  mode = "halaman",
  unlockedJuz = []
}: JuzListProps) {
  const [search, setSearch] = useState("");
  const [playingJuz, setPlayingJuz] = useState<number | null>(null);
  const [loadingAudioJuz, setLoadingAudioJuz] = useState<number | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [expandedJuz, setExpandedJuz] = useState<number | null>(null);
  
  const juzArray = Array.from({ length: 30 }, (_, i) => i + 1);
  
  const formatTime = (seconds: number) => {
    if (seconds === Infinity) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressData = useMemo(() => {
    const completedPages = new Set<number>();
    const pagesWithAnyProgress = new Set<number>();
    const completedExams = new Set<number>();
    const pageStats = new Map<number, { maxScore: number, attempts: number, bestTime: number }>();
    
    if (!userProgress) return { completedPages, completedExams, pagesWithAnyProgress, pageStats };

    userProgress.forEach(attempt => {
      let pNum = attempt.page_id ? Number(attempt.page_id) : null;
      if (!pNum && attempt.quiz_id.startsWith('mufradat_page_')) {
        pNum = parseInt(attempt.quiz_id.replace('mufradat_page_', ''));
      }

      if (pNum) {
        pagesWithAnyProgress.add(pNum);
        const score = Math.round((Number(attempt.score) / (Number(attempt.total_questions) || 1)) * 100) || 0;
        const time = Number(attempt.duration_seconds) || Infinity;
        
        const current = pageStats.get(pNum) || { maxScore: 0, attempts: 0, bestTime: Infinity };
        pageStats.set(pNum, {
          maxScore: Math.max(current.maxScore, score),
          attempts: current.attempts + 1,
          bestTime: Math.min(current.bestTime, time)
        });

        if ((attempt.is_passed || Number(attempt.score) === Number(attempt.total_questions)) && attempt.quiz_id.startsWith('mufradat_page_')) {
          completedPages.add(pNum);
        }
      }
      
      if (attempt.is_passed && attempt.quiz_id.startsWith('mufradat_juz_exam_')) {
        const jNum = parseInt(attempt.quiz_id.replace('mufradat_juz_exam_', ''));
        completedExams.add(jNum);
      }
    });

    return { completedPages, completedExams, pagesWithAnyProgress, pageStats };
  }, [userProgress]);

  const verseCompletionMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!userProgress) return map;
    
    // Get all chapters and their juz info to map verse completions to juz
    // For simplicity, we can rely on page-to-juz mapping for verses
    userProgress.forEach(attempt => {
      const isPassed = attempt.is_passed || Number(attempt.score) === Number(attempt.total_questions);
      if (isPassed && !attempt.quiz_id.startsWith('mufradat_page_') && !attempt.quiz_id.startsWith('mufradat_juz_exam_')) {
        const pNum = attempt.page_id ? Number(attempt.page_id) : null;
        if (pNum) {
          const juzId = getJuzForPage(pNum);
          if (juzId) {
            const current = map.get(juzId) || 0;
            // Since kuis_attempts doesn't guarantee uniqueness per verse per juz in this check, 
            // the detail page will be more accurate, but for the progress bar this is a good heuristic.
            // Better: use a Set to count unique verses per juz
            if (! (map as any)._sets) (map as any)._sets = new Map<number, Set<string>>();
            const juzSets = (map as any)._sets;
            if (!juzSets.has(juzId)) juzSets.set(juzId, new Set<string>());
            juzSets.get(juzId).add(`${attempt.surah_id}:${attempt.verse_id}`);
          }
        }
      }
    });

    const finalMap = new Map<number, number>();
    if ((map as any)._sets) {
      (map as any)._sets.forEach((set: Set<string>, jId: number) => {
        finalMap.set(jId, set.size);
      });
    }
    return finalMap;
  }, [userProgress]);

  const { completedPages, completedExams, pagesWithAnyProgress, pageStats } = progressData;

  const filteredJuz = juzArray.filter(j => 
    `Juz ${j}`.toLowerCase().includes(search.toLowerCase()) ||
    JUZ_MAPPING[j].name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  const togglePlay = async (e: React.MouseEvent, jNum: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (playingJuz === jNum) {
      audio?.pause();
      setPlayingJuz(null);
      return;
    }

    if (audio) audio.pause();
    setLoadingAudioJuz(jNum);

    try {
      const mapping = JUZ_MAPPING[jNum];
      const verseKey = `${mapping.surah}:${mapping.verse}`;
      const res = await fetch(`https://api.quran.com/api/v4/recitations/${selectedReciterId}/by_ayah/${verseKey}`);
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;

      if (!audioUrl) throw new Error("Audio not found");

      let fullUrl = audioUrl;
      if (audioUrl.startsWith('//')) fullUrl = `https:${audioUrl}`;
      else if (!audioUrl.startsWith('http')) fullUrl = `https://audio.qurancdn.com/${audioUrl}`;

      const newAudio = new Audio(fullUrl);
      setAudio(newAudio);
      
      newAudio.onplay = () => {
        setPlayingJuz(jNum);
        setLoadingAudioJuz(null);
      };
      newAudio.onended = () => setPlayingJuz(null);
      newAudio.onerror = () => {
        setLoadingAudioJuz(null);
        setPlayingJuz(null);
      };
      await newAudio.play();
    } catch (err) {
      console.error("Audio Playback Error:", err);
      setLoadingAudioJuz(null);
    }
  };

  const showAudioControls = variant === "tilawah";

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari Juz (contoh: Juz 30)..." 
          className="pl-10 h-11 bg-muted/50 border-none ring-offset-background text-sm font-medium" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={cn(
        "grid gap-3 pb-4",
        mode === 'ayat' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {filteredJuz.map((j) => {
          const mapping = JUZ_MAPPING[j];
          const juzPages = getPagesForJuz(j);
          const isExamPassed = completedExams.has(j);
          const totalPages = juzPages.length;
          const finishedPagesCount = juzPages.filter(p => completedPages.has(p)).length;
          const isAllPagesDone = finishedPagesCount === totalPages;
          
          const startPage = juzPages[0];
          const isJuzUnlocked = variant === "tilawah" || startPage === 1 || completedPages.has(startPage - 1) || (unlockedJuz || []).includes(j);
          const isExpanded = expandedJuz === j;

          // GRID VIEW (AYAT MODE) OR TILAWAH
          if (mode === 'ayat' || variant === 'tilawah') {
            const passedVersesCount = verseCompletionMap.get(j) || 0;
            const totalVerses = JUZ_VERSE_COUNTS[j] || 1;
            const isJuzCompleted = passedVersesCount >= totalVerses;

            const CardContent = (
              <Card className={cn(
                "p-4 transition-all border-none shadow-sm relative overflow-hidden h-full group",
                isJuzUnlocked ? "cursor-pointer hover:bg-accent" : "opacity-40 grayscale pointer-events-none select-none",
                isExamPassed || isJuzCompleted ? "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100/80" : "bg-card/50"
              )}>
                 <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg font-black text-sm transition-all rotate-45",
                      isExamPassed || isJuzCompleted ? "bg-emerald-500 text-white" : isJuzUnlocked ? "bg-[#800000]/10 text-[#800000]" : "bg-slate-200 text-slate-400"
                    )}>
                      <span className="-rotate-45">{j}</span>
                    </div>
                    <div className="flex flex-col">
                      <h4 className={cn("font-bold text-base", (isExamPassed || isJuzCompleted) && "text-emerald-900 leading-none mb-1")}>Juz {j}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Dimulai: {mapping.name}</p>
                    </div>
                  </div>
                  {showAudioControls && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full bg-primary/5 text-primary"
                      onClick={(e) => togglePlay(e, j)}
                    >
                      {loadingAudioJuz === j ? <Loader2 className="w-4 h-4 animate-spin" /> : playingJuz === j ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </Button>
                  )}
                  {isJuzCompleted && !isExamPassed && (
                    <div className="text-right flex flex-col items-end gap-1">
                       <div className="flex items-center gap-1 bg-emerald-200/50 px-1.5 py-0.5 rounded text-[8px] font-black text-emerald-800 uppercase tracking-tighter">
                          <Star className="w-2 h-2 fill-current" /> Khatam
                       </div>
                    </div>
                  )}
                </div>
                {isExamPassed && (
                  <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-lg shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
                {passedVersesCount > 0 && !isJuzCompleted && isJuzUnlocked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Progres Hafalan</span>
                      <span>{Math.round((passedVersesCount/totalVerses)*100)}%</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#800000]" style={{ width: `${(passedVersesCount/totalVerses)*100}%` }} />
                    </div>
                  </div>
                )}
              </Card>
            );

            return (
              <Link key={j} href={isJuzUnlocked ? `${baseUrl}/juz/${j}` : "#"}>
                {CardContent}
              </Link>
            );
          }

          // HALAMAN MODE (EXPANDING)
          return (
            <div key={j} className="flex flex-col gap-2">
              <div className="relative group">
                <Card 
                  className={cn(
                    "p-0 transition-all shadow-sm relative overflow-hidden rounded-2xl flex",
                    isExamPassed 
                      ? "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100/80 shadow-md" 
                      : !isJuzUnlocked
                        ? "bg-slate-50 opacity-60 grayscale cursor-not-allowed border border-slate-100"
                        : "bg-white hover:bg-accent border border-slate-100"
                  )}
                >
                  <div 
                    className={cn(
                      "flex-1 flex flex-col p-4 transition-all",
                      isJuzUnlocked ? "cursor-pointer" : "pointer-events-none"
                    )}
                    onClick={() => isJuzUnlocked && setExpandedJuz(isExpanded ? null : j)}
                  >
                    {!isJuzUnlocked && (
                      <div className="absolute top-2 right-2 p-1.5 bg-slate-400/20 rounded-full">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    {isExamPassed && (
                      <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-lg shadow-sm z-10 text-[8px] font-black px-2 py-0.5 uppercase tracking-tighter flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> LULUS UJIAN
                      </div>
                    )}
                    
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg transition-all",
                          isExamPassed ? "bg-emerald-500 text-white" : isJuzUnlocked ? "bg-[#800000]/10 text-[#800000]" : "bg-slate-200 text-slate-400"
                        )}>
                          {j}
                        </div>
                        <div className="flex flex-col">
                          <h4 className={cn("font-black text-lg tracking-tight", isExamPassed ? "text-emerald-900" : "text-slate-800")}>Juz {j}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                            {totalPages} HALAMAN • {finishedPagesCount} SELESAI
                          </p>
                        </div>
                      </div>

                      {isJuzUnlocked && finishedPagesCount > 0 && !isExamPassed && (
                        <div className="mt-4 pr-12">
                          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            <span>Progres Hafalan Juz</span>
                            <span>{Math.round((finishedPagesCount/totalPages)*100)}%</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#800000] to-[#D4AF37]" style={{ width: `${(finishedPagesCount/totalPages)*100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-12 border-l border-slate-50 flex flex-col items-center justify-center gap-2 py-2" />
                </Card>

                {isJuzUnlocked && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2">
                     {showAudioControls && (
                       <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-muted/50 hidden sm:flex text-slate-400 hover:text-[#800000]"
                        onClick={(e) => togglePlay(e, j)}
                      >
                        {loadingAudioJuz === j ? <Loader2 className="w-5 h-5 animate-spin" /> : playingJuz === j ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </Button>
                     )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-[#800000]/10 text-slate-400 hover:text-[#800000]"
                      onClick={() => setExpandedJuz(isExpanded ? null : j)}
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </Button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 px-4 py-2 border-l-2 border-slate-100 ml-6 animate-in slide-in-from-left-2 duration-200">
                  {juzPages.map((p) => {
                    const isDone = completedPages.has(p);
                    const isUnlocked = p === 1 || completedPages.has(p - 1) || isDone;
                    const stats = pageStats.get(p) || { maxScore: 0, attempts: 0, bestTime: Infinity };
                    return (
                      <Link 
                        key={p} 
                        href={isUnlocked ? `/mufradat/page/${p}` : "#"}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl transition-all border",
                          isDone ? "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-sm" : isUnlocked ? "bg-white border-slate-100 hover:border-[#800000]/30 hover:shadow-sm" : "bg-slate-50 opacity-60 border-transparent grayscale cursor-not-allowed"
                        )}
                        onClick={(e) => !isUnlocked && e.preventDefault()}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black", isDone ? "bg-emerald-500 text-white" : isUnlocked ? "bg-slate-100 text-slate-500" : "bg-slate-200 text-slate-400")}>{p}</div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold tracking-tight">Halaman {p}</span>
                            {stats.attempts > 0 && (
                              <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">
                                <span className={cn(stats.maxScore === 100 ? "text-emerald-600" : "text-amber-600")}>🎯 {stats.maxScore}%</span>
                                <span>🔄 {stats.attempts}x</span>
                                {stats.bestTime !== Infinity && <span>⏱️ {formatTime(stats.bestTime)}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        {isDone ? (
                          <div className="flex items-center gap-1 bg-emerald-500 text-white p-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : !isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      </Link>
                    )
                  })}
                  <div className="col-span-full mt-4 flex flex-col gap-2">
                    <Button 
                      asChild={isAllPagesDone} 
                      disabled={!isAllPagesDone}
                      variant={isExamPassed ? "outline" : "default"}
                      className={cn(
                        "w-full h-14 rounded-2xl gap-2 font-black uppercase tracking-widest text-xs transition-all",
                        isExamPassed ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : isAllPagesDone ? "bg-[#D4AF37] hover:bg-[#B8860B] text-black shadow-lg" : "bg-muted text-muted-foreground opacity-50"
                      )}
                    >
                      {isAllPagesDone ? (
                        <Link href={`/mufradat/juz/${j}/exam`} className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          {isExamPassed ? "ULANGI UJIAN JUZ (100 SOAL)" : "MULAI UJIAN JUZ (100 SOAL)"}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2">
                           <Lock className="w-4 h-4" /> SELESAIKAN SEMUA HALAMAN UNTUK UJIAN
                        </div>
                      )}
                    </Button>
                    <Button asChild variant="ghost" className="w-full text-[10px] font-black text-muted-foreground hover:text-[#800000] uppercase tracking-[0.2em] gap-2">
                      <Link href={`/mufradat/${mapping.surah}/${mapping.verse}`}>
                        <ArrowRight className="w-3.5 h-3.5" /> LIHAT DETAIL PER AYAT (MODE LAMA)
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
