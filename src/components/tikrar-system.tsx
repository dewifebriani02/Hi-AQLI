
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Lock
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Mapping Juz to their starting pages in Madani Mushaf
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

export function TikrarSystem() {
  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrevPageDone, setIsPrevPageDone] = useState(true);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Record<number, BlockState>>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const TARGET = 40;

  const currentJuzStartPage = useMemo(() => JUZ_PAGES[juz - 1], [juz]);

  const checkPageCompletion = (pageNum: number) => {
    if (pageNum < 1) return true;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${pageNum}`) : null;
    if (!saved) return false;
    try {
      const data = JSON.parse(saved) as Record<number, BlockState>;
      return [1, 2, 3, 4].every(id => 
        data[id].a.count === TARGET && 
        data[id].b.count === TARGET && 
        data[id].combined.count === TARGET
      );
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
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

    const savedProgress = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${page}`) : null;
    if (savedProgress) {
      setBlocks(JSON.parse(savedProgress));
    } else {
      setBlocks({
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      });
    }

    setIsPrevPageDone(page === currentJuzStartPage || checkPageCompletion(page - 1));
    fetchVerses();
  }, [page, currentJuzStartPage]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify(blocks));
    }
  }, [blocks, page, loading]);

  const handleJuzChange = (val: string) => {
    const newJuz = parseInt(val);
    setJuz(newJuz);
    setPage(JUZ_PAGES[newJuz - 1]);
  };

  const getVersesForBlock = (blockId: number) => {
    if (verses.length === 0) return [];
    const chunkSize = Math.ceil(verses.length / 4);
    const start = (blockId - 1) * chunkSize;
    const end = start + chunkSize;
    return verses.slice(start, end);
  };

  const increment = (blockId: number, type: 'a' | 'b' | 'combined') => {
    setBlocks(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        [type]: {
          count: Math.min(prev[blockId][type].count + 1, TARGET)
        }
      }
    }));
  };

  const resetBlock = (blockId: number) => {
    setBlocks(prev => ({
      ...prev,
      [blockId]: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } }
    }));
  };

  const isBlockDone = (blockId: number) => {
    const b = blocks[blockId];
    return b.a.count === TARGET && b.b.count === TARGET && b.combined.count === TARGET;
  };

  const calculateTotalProgress = () => {
    let total = 0;
    Object.values(blocks).forEach(b => {
      total += b.a.count + b.b.count + b.combined.count;
    });
    return (total / (4 * 3 * TARGET)) * 100;
  };

  return (
    <div className="space-y-8">
      {/* Juz & Page Navigator */}
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
          {[1, 2, 3, 4].map((id) => {
            const isSequentialLocked = id > 1 && !isBlockDone(id - 1);
            return (
              <BlockCard 
                key={id} 
                id={id} 
                state={blocks[id]} 
                verses={getVersesForBlock(id)}
                onIncrement={increment} 
                onReset={() => resetBlock(id)}
                target={TARGET}
                isLocked={isSequentialLocked}
                activeWordKey={activeWordKey}
                setActiveWordKey={setActiveWordKey}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Logic to find split points (waqaf marks or end of verses) in Uthmani text
const findBestSplitPoint = (allWords: Array<Word & { verseKey: string, isLastOfVerse: boolean }>) => {
  const waqafChars = /[\u06D6-\u06DC\u06DF-\u06E2\u06E4\u06E7\u06E8]/;
  const potentialPoints: number[] = [];

  allWords.forEach((word, idx) => {
    if (word.isLastOfVerse) {
      potentialPoints.push(idx + 1);
    }
    else if (waqafChars.test(word.text_uthmani)) {
      potentialPoints.push(idx + 1);
    }
  });

  if (potentialPoints.length === 0) {
    return Math.ceil(allWords.length / 2);
  }

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
  if (isLocked) {
    currentFocus = "Terkunci";
  } else if (state.a.count < target) {
    currentFocus = `TM${id}a`;
  } else if (state.b.count < target) {
    currentFocus = `TM${id}b`;
  } else if (state.combined.count < target) {
    currentFocus = `Gabungan TM${id}a+b`;
  } else {
    currentFocus = "Selesai";
  }

  const renderArabicContent = () => {
    if (verses.length === 0) {
      return <p className="text-xs italic text-muted-foreground" dir="ltr">Tidak ada ayat di bagian ini.</p>;
    }

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
        <div 
          className="flex flex-wrap justify-center items-center gap-x-0 gap-y-2 text-center w-full" 
          dir="rtl"
        >
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
                      className={cn(
                        "text-xl md:text-2xl font-arabic leading-[2.6] cursor-help px-0.5 transition-colors",
                        textColor
                      )}
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
                    "inline-flex items-center justify-center w-6 h-6 rounded-full border text-[8px] font-bold mx-1 align-middle bg-white shadow-xs shrink-0",
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
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          ) : !isBlockDone ? (
            <div className="w-2.5 h-2.5 rounded-full bg-[#800000] animate-pulse" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span className={cn(
            "text-[11px] font-bold uppercase tracking-widest",
            isLocked ? "text-muted-foreground" : "text-[#800000]"
          )}>
            {isLocked ? "Selesaikan TM sebelumnya" : `Target Hafalan: ${currentFocus}`}
          </span>
        </div>
        {!isLocked && !isBlockDone && <Play className="w-4 h-4 text-[#800000]" />}
      </div>

      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 pt-6 px-6">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-black font-headline flex items-center gap-3">
            <span className={isLocked ? "text-muted-foreground" : "text-[#800000]"}>TM {id}</span>
            {isBlockDone && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            {isLocked && <Lock className="h-5 w-5 text-muted-foreground/50" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground border-muted px-2 py-0">
              {verses.length > 0 ? `${verses[0].verse_key} - ${verses[verses.length - 1].verse_key}` : "Kosong"}
            </Badge>
            <p className="text-[10px] text-muted-foreground font-bold tracking-tighter">40x Repetisi Per Sesi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBlockDone && (
            <Badge className="bg-emerald-500 text-white text-[9px] font-bold py-1 px-3">LULUS TIKRAR</Badge>
          )}
          {!isLocked && (
            <Button variant="ghost" size="sm" onClick={onReset} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-3 uppercase tracking-widest">Reset</Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-8 px-6 pb-8">
        <div className={cn(
          "bg-[#fffdf5] p-5 rounded-2xl border-2 shadow-inner relative group min-h-[140px] flex flex-col justify-center items-center transition-all overflow-hidden",
          isLocked ? "border-muted grayscale blur-[1px]" : "border-[#800000]/10"
        )}>
          <div className="absolute top-3 left-3 opacity-20">
            <BookOpen className="w-5 h-5 text-[#800000]" />
          </div>
          {renderArabicContent()}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MaqtaCounter 
              label={`TM${id}a`} 
              count={state.a.count} 
              target={target} 
              onClick={() => !isLocked && onIncrement(id, 'a')} 
              isActive={currentFocus === `TM${id}a`}
              disabled={isLocked}
              colorClass="text-[#800000]"
              bgClass="bg-[#800000]/10"
            />
            <MaqtaCounter 
              label={`TM${id}b`} 
              count={state.b.count} 
              target={target} 
              onClick={() => !isLocked && state.a.count === target && onIncrement(id, 'b')} 
              isActive={currentFocus === `TM${id}b`}
              disabled={isLocked || state.a.count < target}
              colorClass="text-[#065f46]"
              bgClass="bg-[#065f46]/10"
            />
          </div>

          <div className="pt-2">
            <Button 
              disabled={isLocked || state.a.count < target || state.b.count < target}
              onClick={() => onIncrement(id, 'combined')}
              className={cn(
                "w-full h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-md active:scale-[0.98]",
                state.combined.count === target ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : 
                (state.a.count === target && state.b.count === target) ? "bg-[#800000] hover:bg-[#800000]/90 shadow-[#800000]/20" : "bg-muted text-muted-foreground grayscale cursor-not-allowed"
              )}
            >
              {currentFocus === `Gabungan TM${id}a+b` && !isBlockDone && (
                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-white animate-bounce tracking-widest">
                  <Play className="w-2.5 h-2.5 fill-current" /> Fokus Sekarang
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Gabungan TM{id}a+b</span>
              <div className="flex items-center gap-3">
                <RotateCcw className={cn("h-5 w-5", (!isBlockDone && !isLocked) && "animate-spin-slow")} />
                <span className="text-2xl font-black">{state.combined.count} <span className="text-sm opacity-60">/ {target}</span></span>
              </div>
            </Button>
            {!isLocked && (state.a.count < target || state.b.count < target) && (
              <p className="text-[10px] text-center mt-3 text-muted-foreground italic font-semibold flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Selesaikan {state.a.count < target ? `TM${id}a` : `TM${id}b`} untuk lanjut
              </p>
            )}
          </div>
        </div>
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
        isDone ? "bg-emerald-100 border-emerald-500 shadow-emerald-100 cursor-pointer" : 
        isActive ? "bg-white shadow-xl scale-105 z-10 cursor-pointer border-current" : 
        "bg-white hover:border-current/30 shadow-sm border-border grayscale-[0.5] opacity-80 hover:opacity-100 cursor-pointer"
      )}
      style={isActive ? { borderColor: 'currentColor' } : {}}
    >
      {!disabled && (
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 transition-all duration-500 pointer-events-none",
            isDone ? "bg-emerald-500/20" : bgClass
          )}
          style={{ height: `${(count / target) * 100}%` }}
        />
      )}

      {isActive && !isDone && !disabled && (
        <Badge className={cn("absolute -top-2 text-white text-[8px] font-black px-2 h-5 animate-in fade-in slide-in-from-top-2 shadow-lg", colorClass.replace('text-', 'bg-'))}>
          FOKUS
        </Badge>
      )}

      <span className={cn(
        "text-[11px] font-bold uppercase tracking-[0.2em] relative z-10 mb-2",
        disabled ? "text-muted-foreground" :
        isDone ? "text-emerald-700" : 
        isActive ? colorClass :
        "text-muted-foreground group-hover:text-current"
      )}>
        {label}
      </span>
      
      <div className="flex flex-col items-center relative z-10">
        <span className={cn(
          "text-4xl font-black leading-none",
          disabled ? "text-muted-foreground/50" :
          isDone ? "text-emerald-600" : 
          isActive ? colorClass :
          "text-foreground"
        )}>
          {count}
        </span>
        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">repetisi</span>
      </div>

      {isDone ? (
        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-600" />
      ) : isActive && !disabled ? (
        <Play className={cn("absolute top-3 right-3 h-4 w-4 animate-pulse", colorClass)} />
      ) : !disabled && (
        <Zap className="absolute top-3 right-3 h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      
      {disabled && <Lock className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/30" />}
    </div>
  );
}
