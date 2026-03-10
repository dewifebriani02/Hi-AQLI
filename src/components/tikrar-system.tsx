
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCcw, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Play,
  Loader2,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
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
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Record<number, BlockState>>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const TARGET = 40;

  useEffect(() => {
    async function fetchVerses() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani`
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
    fetchVerses();
    // Reset progress on page change (Optional logic based on preference)
    setBlocks({
      1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    });
  }, [page]);

  // Function to split verses into 4 chunks for TM1 - TM4
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

  const calculateTotalProgress = () => {
    let total = 0;
    Object.values(blocks).forEach(b => {
      total += b.a.count + b.b.count + b.combined.count;
    });
    return (total / (4 * 3 * TARGET)) * 100;
  };

  return (
    <div className="space-y-8">
      {/* Page Selector & Global Progress */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-2xl border shadow-sm sticky top-20 z-20 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[120px]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Halaman Mushaf</p>
            <p className="text-2xl font-black text-[#800000]">{page}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(604, p + 1))} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {[1, 2, 3, 4].map((id) => (
            <BlockCard 
              key={id} 
              id={id} 
              state={blocks[id]} 
              verses={getVersesForBlock(id)}
              onIncrement={increment} 
              onReset={() => resetBlock(id)}
              target={TARGET}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockCard({ id, state, verses, onIncrement, onReset, target }: { 
  id: number, 
  state: BlockState, 
  verses: Verse[],
  onIncrement: (blockId: number, type: 'a' | 'b' | 'combined') => void,
  onReset: () => void,
  target: number
}) {
  const isBlockDone = state.a.count === target && state.b.count === target && state.combined.count === target;

  let currentFocus = "";
  if (state.a.count < target) {
    currentFocus = `TM${id}a`;
  } else if (state.b.count < target) {
    currentFocus = `TM${id}b`;
  } else if (state.combined.count < target) {
    currentFocus = `Gabungan TM${id}a+b`;
  } else {
    currentFocus = "Selesai";
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-500 overflow-hidden shadow-lg",
      isBlockDone ? "border-emerald-500 bg-emerald-50/30" : "border-muted"
    )}>
      {/* Active Focus Header */}
      {!isBlockDone && (
        <div className="bg-[#800000]/5 py-3 px-6 border-b border-[#800000]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#800000] animate-pulse" />
            <span className="text-[11px] font-bold text-[#800000] uppercase tracking-widest">
              Target Hafalan: <span className="underline decoration-double">{currentFocus}</span>
            </span>
          </div>
          <Play className="w-4 h-4 text-[#800000]" />
        </div>
      )}

      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 pt-6 px-6">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-black font-headline flex items-center gap-3">
            <span className="text-[#800000]">TM {id}</span>
            {isBlockDone && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
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
          <Button variant="ghost" size="sm" onClick={onReset} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-3 uppercase tracking-widest">Reset</Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 px-6 pb-8">
        {/* Quran Verses Display Section - Optimized for 3-4 lines */}
        <div className="bg-[#fffdf5] p-6 rounded-2xl border-2 border-[#800000]/10 shadow-inner relative group min-h-[120px] flex flex-col justify-center">
          <div className="absolute top-3 left-3 opacity-20">
            <BookOpen className="w-5 h-5 text-[#800000]" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-3 text-center" dir="rtl">
            {verses.map((v) => (
              <span key={v.id} className="inline-block">
                <span className="text-2xl md:text-3xl font-arabic leading-[1.8] text-foreground/90">
                  {v.text_uthmani}
                </span>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#800000]/30 text-[9px] font-bold text-[#800000] mx-1.5 align-middle bg-white shadow-sm">
                  ({v.verse_key.split(':')[1]})
                </span>
              </span>
            ))}
            {verses.length === 0 && (
              <p className="text-xs italic text-muted-foreground" dir="ltr">Tidak ada ayat di bagian ini.</p>
            )}
          </div>
        </div>

        {/* Counter Controls */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MaqtaCounter 
              label={`TM${id}a`} 
              count={state.a.count} 
              target={target} 
              onClick={() => onIncrement(id, 'a')} 
              isActive={currentFocus === `TM${id}a`}
            />
            <MaqtaCounter 
              label={`TM${id}b`} 
              count={state.b.count} 
              target={target} 
              onClick={() => onIncrement(id, 'b')} 
              isActive={currentFocus === `TM${id}b`}
            />
          </div>

          <div className="pt-2">
            <Button 
              disabled={state.a.count < target || state.b.count < target}
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
                <RotateCcw className={cn("h-5 w-5", !isBlockDone && "animate-spin-slow")} />
                <span className="text-2xl font-black">{state.combined.count} <span className="text-sm opacity-60">/ {target}</span></span>
              </div>
            </Button>
            {(state.a.count < target || state.b.count < target) && (
              <p className="text-[10px] text-center mt-3 text-muted-foreground italic font-semibold flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Selesaikan TM{id}a & TM{id}b untuk lanjut
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MaqtaCounter({ label, count, target, onClick, isActive }: { 
  label: string, 
  count: number, 
  target: number, 
  onClick: () => void,
  isActive?: boolean
}) {
  const isDone = count === target;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 select-none overflow-hidden h-32",
        isDone ? "bg-emerald-100 border-emerald-500 shadow-emerald-100" : 
        isActive ? "bg-white border-[#800000] shadow-xl scale-105 z-10" : 
        "bg-white hover:border-[#800000]/30 shadow-sm border-border grayscale-[0.5] opacity-80 hover:opacity-100"
      )}
    >
      {/* Progress Background Overlay */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 transition-all duration-500 pointer-events-none",
          isDone ? "bg-emerald-500/20" : "bg-[#800000]/10"
        )}
        style={{ height: `${(count / target) * 100}%` }}
      />

      {isActive && !isDone && (
        <Badge className="absolute -top-2 bg-[#800000] text-white text-[8px] font-black px-2 h-5 animate-in fade-in slide-in-from-top-2 shadow-lg">
          FOKUS
        </Badge>
      )}

      <span className={cn(
        "text-[11px] font-bold uppercase tracking-[0.2em] relative z-10 mb-2",
        isDone ? "text-emerald-700" : 
        isActive ? "text-[#800000]" :
        "text-muted-foreground group-hover:text-[#800000]"
      )}>
        {label}
      </span>
      
      <div className="flex flex-col items-center relative z-10">
        <span className={cn(
          "text-4xl font-black leading-none",
          isDone ? "text-emerald-600" : 
          isActive ? "text-[#800000]" :
          "text-foreground"
        )}>
          {count}
        </span>
        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">repetisi</span>
      </div>

      {isDone ? (
        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-600" />
      ) : isActive ? (
        <Play className="absolute top-3 right-3 h-4 w-4 text-[#800000] animate-pulse" />
      ) : (
        <Zap className="absolute top-3 right-3 h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
