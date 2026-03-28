"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Search, CheckCircle2, Star, ChevronDown, ChevronRight, Lock, GraduationCap, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";
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

// Precise verse counts per juz for completion tracking
const JUZ_DATA: Record<number, { total_verses: number, mapping: Record<string, string> }> = {
  1: { total_verses: 148, mapping: { "1": "1-7", "2": "1-141" } },
  2: { total_verses: 111, mapping: { "2": "142-252" } },
  3: { total_verses: 126, mapping: { "2": "253-286", "3": "1-92" } },
  4: { total_verses: 131, mapping: { "3": "93-200", "4": "1-23" } },
  5: { total_verses: 124, mapping: { "4": "24-147" } },
  6: { total_verses: 110, mapping: { "4": "148-176", "5": "1-81" } },
  7: { total_verses: 149, mapping: { "5": "82-120", "6": "1-110" } },
  8: { total_verses: 142, mapping: { "6": "111-165", "7": "1-87" } },
  9: { total_verses: 159, mapping: { "7": "88-206", "8": "1-40" } },
  10: { total_verses: 127, mapping: { "8": "41-75", "9": "1-92" } },
  11: { total_verses: 151, mapping: { "9": "93-129", "10": "1-109", "11": "1-5" } },
  12: { total_verses: 170, mapping: { "11": "6-123", "12": "1-52" } },
  13: { total_verses: 154, mapping: { "12": "53-111", "13": "1-43", "14": "1-52" } },
  14: { total_verses: 227, mapping: { "15": "1-99", "16": "1-128" } },
  15: { total_verses: 185, mapping: { "17": "1-111", "18": "1-74" } },
  16: { total_verses: 269, mapping: { "18": "75-110", "19": "1-98", "20": "1-135" } },
  17: { total_verses: 190, mapping: { "21": "1-112", "22": "1-78" } },
  18: { total_verses: 202, mapping: { "23": "1-118", "24": "1-64", "25": "1-20" } },
  19: { total_verses: 339, mapping: { "25": "21-77", "26": "1-227", "27": "1-55" } },
  20: { total_verses: 171, mapping: { "27": "56-93", "28": "1-88", "29": "1-45" } },
  21: { total_verses: 178, mapping: { "29": "46-69", "30": "1-60", "31": "1-34", "32": "1-30", "33": "1-30" } },
  22: { total_verses: 169, mapping: { "33": "31-73", "34": "1-54", "35": "1-45", "36": "1-27" } },
  23: { total_verses: 357, mapping: { "36": "28-83", "37": "1-182", "38": "1-88", "39": "1-31" } },
  24: { total_verses: 175, mapping: { "39": "32-75", "40": "1-85", "41": "1-46" } },
  25: { total_verses: 246, mapping: { "41": "47-54", "42": "1-53", "43": "1-89", "44": "1-59", "45": "1-37" } },
  26: { total_verses: 195, mapping: { "46": "1-35", "47": "1-38", "48": "1-29", "49": "1-18", "50": "1-45", "51": "1-30" } },
  27: { total_verses: 399, mapping: { "51": "31-60", "52": "1-49", "53": "1-62", "54": "1-55", "55": "1-78", "56": "1-96", "57": "1-29" } },
  28: { total_verses: 137, mapping: { "58": "1-22", "59": "1-24", "60": "1-13", "61": "1-14", "62": "1-11", "63": "1-11", "64": "1-18", "65": "1-12", "66": "1-12" } },
  29: { total_verses: 431, mapping: { "67": "1-30", "68": "1-52", "69": "1-52", "70": "1-44", "71": "1-28", "72": "1-28", "73": "1-20", "74": "1-56", "75": "1-40", "76": "1-31", "77": "1-50" } },
  30: { total_verses: 564, mapping: { "78": "1-40", "79": "1-46", "80": "1-42", "81": "1-29", "82": "1-19", "83": "1-36", "84": "1-25", "85": "1-22", "86": "1-17", "87": "1-19", "88": "1-26", "89": "1-30", "90": "1-20", "91": "1-15", "92": "1-21", "93": "1-11", "94": "1-8", "95": "1-8", "96": "1-19", "97": "1-5", "98": "1-8", "99": "1-8", "100": "1-11", "101": "1-11", "102": "1-8", "103": "1-3", "104": "1-9", "105": "1-5", "106": "1-4", "107":"1-7", "108":"1-3", "109":"1-6", "110":"1-3", "111":"1-5", "112":"1-4", "113":"1-5", "114":"1-6" } },
};

interface JuzListProps {
  baseUrl?: string;
  userProgress?: any[];
  variant?: "mufradat" | "tilawah";
  selectedReciterId?: number;
}

export function JuzList({ 
  baseUrl = "/mufradat", 
  userProgress = [], 
  variant = "mufradat",
  selectedReciterId = 7
}: JuzListProps) {
  const [search, setSearch] = useState("");
  const [playingJuz, setPlayingJuz] = useState<number | null>(null);
  const [loadingAudioJuz, setLoadingAudioJuz] = useState<number | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [expandedJuz, setExpandedJuz] = useState<number | null>(null);
  
  const juzArray = Array.from({ length: 30 }, (_, i) => i + 1);
  
  // Calculate completion status for pages and juz exams
  const progressData = useMemo(() => {
    const completedPages = new Set<number>();
    const completedExams = new Set<number>();
    
    if (!userProgress) return { completedPages, completedExams };

    userProgress.forEach(attempt => {
      if (!attempt.is_passed) return;
      
      if (attempt.quiz_id.startsWith('mufradat_page_')) {
        const pNum = parseInt(attempt.quiz_id.replace('mufradat_page_', ''));
        completedPages.add(pNum);
      } else if (attempt.quiz_id.startsWith('mufradat_juz_exam_')) {
        const jNum = parseInt(attempt.quiz_id.replace('mufradat_juz_exam_', ''));
        completedExams.add(jNum);
      }
    });

    return { completedPages, completedExams };
  }, [userProgress]);

  const { completedPages, completedExams } = progressData;

  const filteredJuz = juzArray.filter(j => 
    `Juz ${j}`.toLowerCase().includes(search.toLowerCase()) ||
    JUZ_MAPPING[j].name.toLowerCase().includes(search.toLowerCase())
  );

  // Audio Cleanup
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

    if (audio) {
      audio.pause();
    }

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

      newAudio.onended = () => {
        setPlayingJuz(null);
      };

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

      <div className="flex flex-col gap-3 pb-4">
        {filteredJuz.map((j) => {
          const mapping = JUZ_MAPPING[j];
          const juzPages = getPagesForJuz(j);
          const isExamPassed = completedExams.has(j);
          const totalPages = juzPages.length;
          const finishedPagesCount = juzPages.filter(p => completedPages.has(p)).length;
          const isAllPagesDone = finishedPagesCount === totalPages;
          
          // Juz N+1 is unlocked if Juz N Exam is passed. Juz 1 is always unlocked.
          const isJuzUnlocked = j === 1 || completedExams.has(j - 1);
          const isExpanded = expandedJuz === j;

          if (variant === 'tilawah') {
            return (
              <Link key={j} href={`${baseUrl}/${mapping.surah}?verse=${mapping.verse}`}>
                <Card className="p-5 hover:bg-[#800000]/5 transition-all cursor-pointer border border-slate-100 shadow-sm rounded-2xl">
                   {/* Tilawah-specific card remains similar to original but styled */}
                   <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg bg-[#800000]/10 text-[#800000]">
                        {j}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-black text-lg text-slate-800">Juz {j}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#800000] opacity-70">Dimulai: {mapping.name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-full bg-[#800000]/5 text-[#800000]"
                      onClick={(e) => togglePlay(e, j)}
                    >
                      {loadingAudioJuz === j ? <Loader2 className="w-5 h-5 animate-spin" /> : playingJuz === j ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </Button>
                  </div>
                </Card>
              </Link>
            );
          }

            const targetVerse = `/mufradat/${mapping.surah}/${mapping.verse}`;

            return (
              <div key={j} className="flex flex-col gap-2">
                <div className="relative group">
                  <Link href={isJuzUnlocked ? targetVerse : "#"} onClick={(e) => !isJuzUnlocked && e.preventDefault()}>
                    <Card 
                      className={cn(
                        "p-5 transition-all cursor-pointer border-none shadow-sm relative overflow-hidden rounded-2xl",
                        isExamPassed 
                          ? "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100/80 shadow-md" 
                          : !isJuzUnlocked
                            ? "bg-slate-50 opacity-60 grayscale cursor-not-allowed"
                            : "bg-white hover:bg-accent hover:text-accent-foreground hover:shadow-md border border-slate-100"
                      )}
                    >
                      {!isJuzUnlocked && (
                        <div className="absolute top-0 right-0 p-2 text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      {isExamPassed && (
                        <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-lg shadow-sm z-10 text-[8px] font-black px-2 py-0.5 uppercase tracking-tighter flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> LULUS UJIAN
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg transition-all",
                            isExamPassed 
                              ? "bg-emerald-500 text-white" 
                              : isJuzUnlocked ? "bg-[#800000]/10 text-[#800000]" : "bg-slate-200 text-slate-400"
                          )}>
                            {j}
                          </div>
                          <div className="flex flex-col">
                            <h4 className={cn(
                              "font-black text-lg tracking-tight",
                              isExamPassed ? "text-emerald-900" : "text-slate-800"
                            )}>Juz {j}</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                              {totalPages} HALAMAN • {finishedPagesCount} SELESAI
                            </p>
                          </div>
                        </div>
                      </div>

                      {isJuzUnlocked && finishedPagesCount > 0 && !isExamPassed && (
                        <div className="mt-4">
                          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            <span>Progres Hafalan Juz</span>
                            <span>{Math.round((finishedPagesCount/totalPages)*100)}%</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#800000] to-[#D4AF37]" style={{ width: `${(finishedPagesCount/totalPages)*100}%` }} />
                          </div>
                        </div>
                      )}
                    </Card>
                  </Link>

                  {/* EXPAND BUTTON (Separate from Card Click) */}
                  {isJuzUnlocked && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2">
                       <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-muted/50 hidden sm:flex"
                        onClick={(e) => togglePlay(e, j)}
                      >
                        {loadingAudioJuz === j ? <Loader2 className="w-5 h-5 animate-spin" /> : playingJuz === j ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </Button>
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

              {/* Expanded Page List */}
              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 px-4 py-2 border-l-2 border-slate-100 ml-6 animate-in slide-in-from-left-2 duration-200">
                  {juzPages.map((p, idx) => {
                    const isDone = completedPages.has(p);
                    const prevDone = idx === 0 || completedPages.has(juzPages[idx-1]);
                    const isUnlocked = idx === 0 || prevDone;

                    return (
                      <Link 
                        key={p} 
                        href={isUnlocked ? `/mufradat/page/${p}` : "#"}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl transition-all border",
                          isDone 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                            : isUnlocked 
                              ? "bg-white border-slate-100 hover:border-[#800000]/30 hover:shadow-sm" 
                              : "bg-slate-50 opacity-60 border-transparent grayscale cursor-not-allowed"
                        )}
                        onClick={(e: React.MouseEvent) => !isUnlocked && e.preventDefault()}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black",
                            isDone ? "bg-emerald-500 text-white" : isUnlocked ? "bg-slate-100 text-slate-500" : "bg-slate-200 text-slate-400"
                          )}>{p}</span>
                          <span className="text-xs font-bold tracking-tight">Halaman {p}</span>
                        </div>
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : !isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      </Link>
                    );
                  })}
                  
                  {/* Juz Exam Button */}
                  <div className="col-span-full mt-4 flex flex-col gap-2">
                    <Button 
                      asChild={isAllPagesDone} 
                      disabled={!isAllPagesDone}
                      variant={isExamPassed ? "outline" : "default"}
                      className={cn(
                        "w-full h-14 rounded-2xl gap-2 font-black uppercase tracking-widest text-xs",
                        isExamPassed 
                          ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                          : isAllPagesDone 
                            ? "bg-[#D4AF37] hover:bg-[#B8860B] text-black shadow-lg" 
                            : "bg-muted text-muted-foreground opacity-50"
                      )}
                    >
                      {isAllPagesDone ? (
                        <Link href={`/mufradat/juz/${j}/exam`}>
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
                      <Link href={`/mufradat/${mapping.surah}?verse=${mapping.verse}`}>
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
