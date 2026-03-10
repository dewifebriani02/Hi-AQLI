
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RotateCcw, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Play,
  Loader2,
  BookOpen,
  Lock,
  Layers,
  CalendarDays,
  Target,
  Trophy,
  ArrowRight
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

interface Word {
  text_uthmani: string;
  translation?: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  words: Word[];
}

interface MaqtaState {
  count: number;
}

interface BlockState {
  a: MaqtaState;
  b: MaqtaState;
  combined: MaqtaState;
}

const TARGET_TM = 40;
const RECOMMENDED_META = 40;
const MIN_META = {
  2: 10, // TM1 + TM2
  3: 5,  // TM1 + TM2 + TM3
  4: 3   // TM1 + TM2 + TM3 + TM4
};

const LEVELS = [
  { id: 1, name: "Level 1", desc: "1 Halaman / Pekan", days: 7 },
  { id: 2, name: "Level 2", desc: "1 Halaman / 2 Pekan", days: 14 },
  { id: 3, name: "Level 3", desc: "1 Halaman / 3 Pekan", days: 21 },
  { id: 4, name: "Level 4", desc: "1 Halaman / Bulan", days: 28 },
];

export function TikrarSystem() {
  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrevPageDone, setIsPrevPageDone] = useState(true);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  
  const [blocks, setBlocks] = useState<Record<number, BlockState>>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const [metaCombined, setMetaCombined] = useState<Record<number, number>>({
    2: 0,
    3: 0,
    4: 0
  });

  const currentJuzStartPage = useMemo(() => JUZ_PAGES[juz - 1], [juz]);

  const playSfx = useCallback((type: 'click' | 'finish') => {
    const soundUrls = {
      click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      finish: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
    };
    try {
      const audio = new Audio(soundUrls[type]);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Audio SFX Error:", e);
    }
  }, []);

  const checkPageCompletion = (pageNum: number) => {
    if (pageNum < 1) return true;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${pageNum}`) : null;
    if (!saved) return false;
    try {
      const data = JSON.parse(saved);
      const b = data.blocks || {};
      const m = data.metaCombined || {};
      
      const blocksDone = [1, 2, 3, 4].every(id => 
        b[id]?.a.count === TARGET_TM && 
        b[id]?.b.count === TARGET_TM && 
        b[id]?.combined.count === TARGET_TM
      );
      
      const metaDone = [2, 3, 4].every(id => m[id] >= MIN_META[id as keyof typeof MIN_META]);
      
      return blocksDone && metaDone;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // Initial load from localStorage
    if (typeof window !== 'undefined') {
      const savedLevel = localStorage.getItem('tikrar_level');
      if (savedLevel) setLevel(parseInt(savedLevel));
    }

    async function fetchVerses() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id`
        );
        if (!res.ok) throw new Error("Gagal memuat ayat");
        const data = await res.json();
        setVerses(data.verses);
      } catch (error) {
        console.error("Tikrar Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }

    const savedProgressStr = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${page}`) : null;
    if (savedProgressStr) {
      const saved = JSON.parse(savedProgressStr);
      setBlocks(saved.blocks || {
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      });
      setMetaCombined(saved.metaCombined || { 2: 0, 3: 0, 4: 0 });
    } else {
      setBlocks({
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      });
      setMetaCombined({ 2: 0, 3: 0, 4: 0 });
    }

    setIsPrevPageDone(page === currentJuzStartPage || checkPageCompletion(page - 1));
    fetchVerses();
  }, [page, currentJuzStartPage]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify({ blocks, metaCombined }));
    }
  }, [blocks, metaCombined, page, loading]);

  const handleLevelSelect = (levelId: number) => {
    setLevel(levelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tikrar_level', levelId.toString());
    }
  };

  const handleJuzChange = (val: string) => {
    const newJuz = parseInt(val);
    setJuz(newJuz);
    setPage(JUZ_PAGES[newJuz - 1]);
  };

  const getVersesForRange = (startBlock: number, endBlock: number) => {
    if (verses.length === 0) return [];
    const chunkSize = Math.ceil(verses.length / 4);
    const start = (startBlock - 1) * chunkSize;
    const end = endBlock * chunkSize;
    return verses.slice(start, end);
  };

  const incrementTM = (blockId: number, type: 'a' | 'b' | 'combined') => {
    const currentCount = blocks[blockId][type].count;
    if (currentCount >= TARGET_TM) return;

    const nextCount = currentCount + 1;
    if (nextCount === TARGET_TM) {
      playSfx('finish');
    } else {
      playSfx('click');
    }

    setBlocks(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        [type]: {
          count: nextCount
        }
      }
    }));
  };

  const incrementMeta = (metaId: number) => {
    const currentCount = metaCombined[metaId];
    if (currentCount >= RECOMMENDED_META) return;

    const nextCount = currentCount + 1;
    if (nextCount === RECOMMENDED_META) {
      playSfx('finish');
    } else {
      playSfx('click');
    }

    setMetaCombined(prev => ({
      ...prev,
      [metaId]: nextCount
    }));
  };

  const resetTM = (blockId: number) => {
    setBlocks(prev => ({
      ...prev,
      [blockId]: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } }
    }));
  };

  const resetMeta = (metaId: number) => {
    setMetaCombined(prev => ({ ...prev, [metaId]: 0 }));
  };

  const isTMDone = (blockId: number) => {
    const b = blocks[blockId];
    return b.a.count === TARGET_TM && b.b.count === TARGET_TM && b.combined.count === TARGET_TM;
  };

  const isMetaDone = (metaId: number) => {
    return metaCombined[metaId] >= MIN_META[metaId as keyof typeof MIN_META];
  };

  const calculateTotalProgress = () => {
    let total = 0;
    Object.values(blocks).forEach(b => total += b.a.count + b.b.count + b.combined.count);
    Object.entries(metaCombined).forEach(([id, count]) => total += count);
    
    const totalTarget = (4 * 3 * TARGET_TM) + (3 * RECOMMENDED_META);
    return (total / totalTarget) * 100;
  };

  // Schedule Logic
  const getScheduleForLevel = () => {
    if (!level) return [];
    const l = LEVELS.find(l => l.id === level)!;
    const totalSteps = 7; // TM1, TM2, META2, TM3, META3, TM4, META4
    const daysPerStep = l.days / totalSteps;
    
    return [
      { id: 1, title: "TM 1 (40x)", start: 1, end: Math.ceil(daysPerStep) },
      { id: 2, title: "TM 2 (40x)", start: Math.ceil(daysPerStep) + 1, end: Math.ceil(daysPerStep * 2) },
      { id: 3, title: "Gabungan 1+2", start: Math.ceil(daysPerStep * 2) + 1, end: Math.ceil(daysPerStep * 3) },
      { id: 4, title: "TM 3 (40x)", start: Math.ceil(daysPerStep * 3) + 1, end: Math.ceil(daysPerStep * 4) },
      { id: 5, title: "Gabungan 1+2+3", start: Math.ceil(daysPerStep * 4) + 1, end: Math.ceil(daysPerStep * 5) },
      { id: 6, title: "TM 4 (40x)", start: Math.ceil(daysPerStep * 5) + 1, end: Math.ceil(daysPerStep * 6) },
      { id: 7, title: "Gabungan Halaman", start: Math.ceil(daysPerStep * 6) + 1, end: l.days },
    ];
  };

  const schedule = getScheduleForLevel();

  if (!level) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center py-10 animate-in fade-in duration-500">
        <div className="text-center space-y-2 max-w-md px-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#800000]/10 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#800000]" />
          </div>
          <h2 className="text-2xl font-bold font-headline">Pilih Level Tikrar Daily</h2>
          <p className="text-sm text-muted-foreground">Tentukan intensitas hafalan Anda. Kami akan menyesuaikan jadwal harian Anda secara otomatis.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
          {LEVELS.map((l) => (
            <Card 
              key={l.id} 
              className="cursor-pointer hover:border-[#800000] hover:bg-[#800000]/5 transition-all group"
              onClick={() => handleLevelSelect(l.id)}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg group-hover:text-[#800000] transition-colors">{l.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium">{l.desc}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#800000] group-hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Schedule Banner */}
      <Card className="border-none bg-gradient-to-br from-[#800000] to-[#b30000] text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-[-20px] top-[-20px] opacity-10">
          <CalendarDays className="w-40 h-40" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                  {LEVELS.find(l => l.id === level)?.name} ACTIVE
                </Badge>
                <button onClick={() => setLevel(null)} className="text-[9px] font-bold underline opacity-70 hover:opacity-100">Ganti Level</button>
              </div>
              <h3 className="text-xl font-bold font-headline">Jadwal Hafalan Halaman {page}</h3>
              <p className="text-xs opacity-80 max-w-sm">Target selesai dalam {LEVELS.find(l => l.id === level)?.days} hari dengan metode Tikrar 40x.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-[9px] font-bold uppercase opacity-60">Status</p>
                <p className="text-sm font-bold">On Track</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-[9px] font-bold uppercase opacity-60">Sisa Hari</p>
                <p className="text-sm font-bold">{LEVELS.find(l => l.id === level)?.days} Hari</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1">
              <Target className="w-3 h-3" /> Agenda Berdasarkan Level
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {schedule.map((s, idx) => (
                <div key={idx} className={cn(
                  "min-w-[120px] p-3 rounded-xl border flex flex-col gap-1 transition-all",
                  idx === 0 ? "bg-white text-[#800000] border-white shadow-lg" : "bg-white/10 border-white/10 opacity-60"
                )}>
                  <span className="text-[8px] font-bold uppercase opacity-70">Hari {s.start}-{s.end}</span>
                  <span className="text-[10px] font-bold leading-tight">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-2xl border shadow-sm sticky top-20 z-20 backdrop-blur-md bg-white/90">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-1 w-full sm:w-32">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Pilih Juz</span>
            <Select value={juz.toString()} onValueChange={handleJuzChange}>
              <SelectTrigger className="h-10 font-bold border-none bg-muted/50 focus:ring-0">
                <SelectValue placeholder="Pilih Juz" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()} className="font-medium">
                    Juz {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[100px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Halaman</p>
              <p className="text-2xl font-black text-[#800000]">{page}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(604, p + 1))} disabled={loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#800000]">
            <span>Progres Halaman {page}</span>
            <span>{Math.round(calculateTotalProgress())}%</span>
          </div>
          <Progress value={calculateTotalProgress()} className="h-2 bg-muted [&>div]:bg-[#800000]" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Menyiapkan Ayat Hafalan...</p>
        </div>
      ) : !isPrevPageDone ? (
        <Card className="border-none bg-muted/20 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-headline">Halaman Terkunci</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Anda harus menuntaskan seluruh Tikrar di <strong>Halaman {page - 1}</strong> hingga 100% untuk membuka halaman ini.
              </p>
            </div>
            <Button onClick={() => setPage(page - 1)} variant="outline" className="font-bold gap-2">
              <ChevronLeft className="w-4 h-4" /> Kembali ke Halaman {page - 1}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          <BlockCard 
            id={1} 
            state={blocks[1]} 
            verses={getVersesForRange(1, 1)}
            onIncrement={incrementTM} 
            onReset={() => resetTM(1)}
            target={TARGET_TM}
            isLocked={false}
            activeWordKey={activeWordKey}
            setActiveWordKey={setActiveWordKey}
          />

          <BlockCard 
            id={2} 
            state={blocks[2]} 
            verses={getVersesForRange(2, 2)}
            onIncrement={incrementTM} 
            onReset={() => resetTM(2)}
            target={TARGET_TM}
            isLocked={!isTMDone(1)}
            activeWordKey={activeWordKey}
            setActiveWordKey={setActiveWordKey}
          />

          <MetaCombinedCard
            id={2}
            title="Gabungan TM1 + TM2"
            count={metaCombined[2]}
            min={MIN_META[2]}
            target={RECOMMENDED_META}
            verses={getVersesForRange(1, 2)}
            isLocked={!isTMDone(1) || !isTMDone(2)}
            onIncrement={() => incrementMeta(2)}
            onReset={() => resetMeta(2)}
          />

          <BlockCard 
            id={3} 
            state={blocks[3]} 
            verses={getVersesForRange(3, 3)}
            onIncrement={incrementTM} 
            onReset={() => resetTM(3)}
            target={TARGET_TM}
            isLocked={!isMetaDone(2)}
            activeWordKey={activeWordKey}
            setActiveWordKey={setActiveWordKey}
          />

          <MetaCombinedCard
            id={3}
            title="Gabungan TM1 + TM2 + TM3"
            count={metaCombined[3]}
            min={MIN_META[3]}
            target={RECOMMENDED_META}
            verses={getVersesForRange(1, 3)}
            isLocked={!isMetaDone(2) || !isTMDone(3)}
            onIncrement={() => incrementMeta(3)}
            onReset={() => resetMeta(3)}
          />

          <BlockCard 
            id={4} 
            state={blocks[4]} 
            verses={getVersesForRange(4, 4)}
            onIncrement={incrementTM} 
            onReset={() => resetTM(4)}
            target={TARGET_TM}
            isLocked={!isMetaDone(3)}
            activeWordKey={activeWordKey}
            setActiveWordKey={setActiveWordKey}
          />

          <MetaCombinedCard
            id={4}
            title="Gabungan Seluruh Blok (TM1-4)"
            count={metaCombined[4]}
            min={MIN_META[4]}
            target={RECOMMENDED_META}
            verses={getVersesForRange(1, 4)}
            isLocked={!isMetaDone(3) || !isTMDone(4)}
            onIncrement={() => incrementMeta(4)}
            onReset={() => resetMeta(4)}
          />
        </div>
      )}
    </div>
  );
}

const findBestSplitPoint = (allWords: Array<Word & { verseKey: string, isLastOfVerse: boolean }>) => {
  const waqafChars = /[\u06D6-\u06DC\u06DF-\u06E2\u06E4\u06E7\u06E8]/;
  const potentialPoints: number[] = [];

  allWords.forEach((word, idx) => {
    if (word.isLastOfVerse) potentialPoints.push(idx + 1);
    else if (waqafChars.test(word.text_uthmani)) potentialPoints.push(idx + 1);
  });

  if (potentialPoints.length === 0) return Math.ceil(allWords.length / 2);

  const middle = allWords.length / 2;
  let bestPoint = potentialPoints[0];
  let minDiff = Math.abs(bestPoint - middle);

  potentialPoints.forEach(point => {
    const diff = Math.abs(point - middle);
    if (diff < minDiff) {
      minDiff = diff;
      bestPoint = point;
    }
  });

  return bestPoint;
};

function BlockCard({ id, state, verses, onIncrement, onReset, target, isLocked, activeWordKey, setActiveWordKey }: { 
  id: number, 
  state: BlockState, 
  verses: Verse[],
  onIncrement: (blockId: number, type: 'a' | 'b' | 'combined') => void,
  onReset: () => void,
  target: number,
  isLocked: boolean,
  activeWordKey: string | null,
  setActiveWordKey: (key: string | null) => void
}) {
  const isBlockDone = state.a.count === target && state.b.count === target && state.combined.count === target;

  let currentFocus = "";
  if (isLocked) currentFocus = "Terkunci";
  else if (state.a.count < target) currentFocus = `TM${id}a`;
  else if (state.b.count < target) currentFocus = `TM${id}b`;
  else if (state.combined.count < target) currentFocus = `Gabungan TM${id}a+b`;
  else currentFocus = "Selesai";

  const renderArabicContent = () => {
    if (verses.length === 0) return <p className="text-xs italic text-muted-foreground">Tidak ada ayat.</p>;

    const allWords: Array<Word & { verseKey: string, isLastOfVerse: boolean }> = [];
    verses.forEach(v => {
      v.words.forEach((w, wIdx) => {
        allWords.push({
          ...w,
          verseKey: v.verse_key,
          isLastOfVerse: wIdx === v.words.length - 1
        });
      });
    });

    const splitIdx = findBestSplitPoint(allWords);

    return (
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <div className="flex flex-wrap justify-center items-center gap-x-0 gap-y-2 text-center w-full" dir="rtl">
          {allWords.map((word, idx) => {
            const isPartA = idx < splitIdx;
            const wordKey = `tm${id}-${isPartA ? 'a' : 'b'}-${idx}`;
            const textColor = isPartA ? "text-[#800000]" : "text-[#065f46]";
            const tooltipBg = isPartA ? "bg-[#800000]" : "bg-[#065f46]";

            return (
              <React.Fragment key={wordKey}>
                <Tooltip open={activeWordKey === wordKey && !isLocked} onOpenChange={(o) => o && setActiveWordKey(wordKey)}>
                  <TooltipTrigger asChild>
                    <span 
                      className={cn("text-xl md:text-2xl font-arabic leading-[2.6] cursor-help px-0.5 transition-colors", textColor)}
                      onPointerEnter={() => !isLocked && setActiveWordKey(wordKey)}
                    >
                      {word.text_uthmani}
                    </span>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent className={cn("text-white border-none shadow-lg py-1.5 px-3 z-[100]", tooltipBg)}>
                      <p className="text-[11px] font-medium">{word.translation?.text || "..."}</p>
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
                {word.isLastOfVerse && (
                  <span className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full border text-[8px] font-bold mx-1 align-middle bg-white shrink-0",
                    isPartA ? "border-[#800000]/30 text-[#800000]" : "border-[#065f46]/30 text-[#065f46]"
                  )}>
                    ({word.verseKey.split(':')[1]})
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-500 overflow-hidden shadow-lg relative",
      isLocked ? "border-muted bg-muted/5 opacity-60 pointer-events-none" :
      isBlockDone ? "border-emerald-500 bg-emerald-50/30" : "border-muted"
    )}>
      <div className={cn(
        "py-3 px-6 border-b flex items-center justify-between",
        isLocked ? "bg-muted/20 border-muted" : "bg-[#800000]/5 border-[#800000]/10"
      )}>
        <div className="flex items-center gap-2">
          {isLocked ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : !isBlockDone ? <div className="w-2.5 h-2.5 rounded-full bg-[#800000] animate-pulse" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          <span className={cn("text-[11px] font-bold uppercase tracking-widest", isLocked ? "text-muted-foreground" : "text-[#800000]")}>
            {isLocked ? "Selesaikan langkah sebelumnya" : `Target Hafalan: ${currentFocus}`}
          </span>
        </div>
      </div>

      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 pt-6 px-6">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-black font-headline flex items-center gap-3">
            <span className={isLocked ? "text-muted-foreground" : "text-[#800000]"}>TM {id}</span>
            {isBlockDone && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground border-muted px-2 py-0">
              {verses.length > 0 ? `${verses[0].verse_key} - ${verses[verses.length - 1].verse_key}` : "..."}
            </Badge>
          </div>
        </div>
        {!isLocked && <Button variant="ghost" size="sm" onClick={onReset} className="text-[10px] font-bold text-rose-600 h-8 px-3 uppercase tracking-widest">Reset</Button>}
      </CardHeader>

      <CardContent className="space-y-8 px-6 pb-8">
        <div className={cn(
          "bg-[#fffdf5] p-5 rounded-2xl border-2 shadow-inner min-h-[140px] max-h-[280px] overflow-y-auto no-scrollbar flex flex-col items-center transition-all", 
          isLocked ? "border-muted grayscale blur-[1px]" : "border-[#800000]/10"
        )}>
          <div className="my-auto w-full">
            {renderArabicContent()}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MaqtaCounter label={`TM${id}a`} count={state.a.count} target={target} onClick={() => onIncrement(id, 'a')} isActive={currentFocus === `TM${id}a`} disabled={isLocked} colorClass="text-[#800000]" bgClass="bg-[#800000]/10" />
            <MaqtaCounter label={`TM${id}b`} count={state.b.count} target={target} onClick={() => onIncrement(id, 'b')} isActive={currentFocus === `TM${id}b`} disabled={isLocked || state.a.count < target} colorClass="text-[#065f46]" bgClass="bg-[#065f46]/10" />
          </div>
          <Button disabled={isLocked || state.a.count < target || state.b.count < target} onClick={() => onIncrement(id, 'combined')} className={cn("w-full h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-md", state.combined.count === target ? "bg-emerald-500" : (state.a.count === target && state.b.count === target) ? "bg-[#800000]" : "bg-muted text-muted-foreground")}>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Gabungan TM{id}a+b</span>
            <div className="flex items-center gap-3">
              <RotateCcw className={cn("h-5 w-5", (!isBlockDone && !isLocked && state.a.count === target && state.b.count === target) && "animate-spin-slow")} />
              <span className="text-2xl font-black">{state.combined.count} <span className="text-sm opacity-60">/ {target}</span></span>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaCombinedCard({ id, title, count, min, target, verses, isLocked, onIncrement, onReset }: {
  id: number,
  title: string,
  count: number,
  min: number,
  target: number,
  verses: Verse[],
  isLocked: boolean,
  onIncrement: () => void,
  onReset: () => void
}) {
  const isMinDone = count >= min;
  const isRecommendedDone = count === target;

  return (
    <Card className={cn(
      "border-2 transition-all duration-500 overflow-hidden shadow-xl",
      isLocked ? "border-muted bg-muted/5 opacity-60 grayscale pointer-events-none" :
      isRecommendedDone ? "border-emerald-500 bg-emerald-50/20" : 
      isMinDone ? "border-emerald-200 bg-emerald-50/10" : "border-amber-200 bg-amber-50/50"
    )}>
      <div className={cn("py-3 px-6 border-b flex items-center justify-between", isLocked ? "bg-muted/20" : isMinDone ? "bg-emerald-100/50" : "bg-amber-100/50")}>
        <div className="flex items-center gap-2 text-amber-800">
          <Layers className="w-4 h-4" />
          <span className={cn("text-[11px] font-bold uppercase tracking-widest", isMinDone && "text-emerald-800")}>
            {isLocked ? "Terkunci" : isMinDone ? "Syarat Minimal Terpenuhi" : "Sesi Gabungan Kumulatif"}
          </span>
        </div>
        {!isLocked && <Button variant="ghost" size="sm" onClick={onReset} className="text-[9px] font-bold text-amber-700 h-6 px-2 uppercase">Reset</Button>}
      </div>

      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black font-headline text-amber-900">{title}</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-amber-300 text-amber-700 font-bold text-[9px]">MIN: {min}x</Badge>
          </div>
        </div>

        <div className="bg-white/80 p-4 rounded-xl border border-amber-200 shadow-inner max-h-[220px] overflow-y-auto no-scrollbar" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-2 text-center">
            {verses.map((v) => (
              <React.Fragment key={v.id}>
                {v.words.map((w, idx) => (
                  <span key={idx} className="text-lg font-arabic text-amber-950">{w.text_uthmani}</span>
                ))}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-amber-300 text-[7px] font-bold text-amber-700 mx-1 bg-amber-50">({v.verse_key.split(':')[1]})</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <Button 
          disabled={isLocked}
          onClick={onIncrement}
          className={cn(
            "w-full h-24 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all shadow-xl active:scale-[0.97]",
            isRecommendedDone ? "bg-emerald-600 hover:bg-emerald-700" : 
            isMinDone ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-600 hover:bg-amber-700"
          )}
        >
          {!isMinDone && !isLocked && <span className="text-[9px] font-black uppercase text-amber-100 animate-pulse tracking-widest">Lancarkan Seluruh Bagian Ini</span>}
          <div className="flex items-center gap-4">
            <RotateCcw className={cn("h-6 w-6 text-white", !isRecommendedDone && "animate-spin-slow")} />
            <span className="text-4xl font-black text-white">{count} <span className="text-xl opacity-50">/ {target}</span></span>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}

function MaqtaCounter({ label, count, target, onClick, isActive, disabled, colorClass, bgClass }: { 
  label: string, 
  count: number, 
  target: number, 
  onClick: () => void,
  isActive?: boolean,
  disabled?: boolean,
  colorClass: string,
  bgClass: string
}) {
  const isDone = count === target;

  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all active:scale-95 select-none overflow-hidden h-32",
        disabled ? "bg-muted/20 border-muted grayscale cursor-not-allowed" :
        isDone ? "bg-emerald-100 border-emerald-500 cursor-pointer" : 
        isActive ? "bg-white shadow-xl scale-105 z-10 cursor-pointer border-current" : 
        "bg-white hover:border-current/30 shadow-sm border-border grayscale-[0.5] opacity-80 cursor-pointer"
      )}
      style={isActive ? { borderColor: 'currentColor' } : {}}
    >
      {!disabled && <div className={cn("absolute bottom-0 left-0 right-0 transition-all duration-500 pointer-events-none", isDone ? "bg-emerald-500/20" : bgClass)} style={{ height: `${(count / target) * 100}%` }} />}
      {isActive && !isDone && !disabled && <Badge className={cn("absolute -top-2 text-white text-[8px] font-black px-2 h-5 shadow-lg", colorClass.replace('text-', 'bg-'))}>FOKUS</Badge>}
      <span className={cn("text-[11px] font-bold uppercase tracking-[0.2em] relative z-10 mb-2", disabled ? "text-muted-foreground" : isDone ? "text-emerald-700" : isActive ? colorClass : "text-muted-foreground")}>{label}</span>
      <div className="flex flex-col items-center relative z-10">
        <span className={cn("text-4xl font-black leading-none", disabled ? "text-muted-foreground/50" : isDone ? "text-emerald-600" : isActive ? colorClass : "text-foreground")}>{count}</span>
        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">repetisi</span>
      </div>
      {isDone ? <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-600" /> : isActive && !disabled ? <Play className={cn("absolute top-3 right-3 h-4 w-4 animate-pulse", colorClass)} /> : null}
      {disabled && <Lock className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/30" />}
    </div>
  );
}
