
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  RotateCcw, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [blocks, setBlocks] = useState<Record<number, BlockState>>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const TARGET = 40;

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
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[120px]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Halaman Mushaf</p>
            <p className="text-2xl font-black text-[#800000]">{page}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(604, p + 1))}>
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

      {/* 4 TM Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((id) => (
          <BlockCard 
            key={id} 
            id={id} 
            state={blocks[id]} 
            onIncrement={increment} 
            onReset={() => resetBlock(id)}
            target={TARGET}
          />
        ))}
      </div>
    </div>
  );
}

function BlockCard({ id, state, onIncrement, onReset, target }: { 
  id: number, 
  state: BlockState, 
  onIncrement: (blockId: number, type: 'a' | 'b' | 'combined') => void,
  onReset: () => void,
  target: number
}) {
  const isBlockDone = state.a.count === target && state.b.count === target && state.combined.count === target;

  return (
    <Card className={cn(
      "border-2 transition-all duration-500",
      isBlockDone ? "border-emerald-500 bg-emerald-50/30" : "border-muted"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-headline flex items-center gap-2">
            TM{id}
            {isBlockDone && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Target: 40x per Maqta</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-[10px] font-bold text-muted-foreground">RESET</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Maqta A */}
          <MaqtaCounter 
            label={`TM${id}a`} 
            count={state.a.count} 
            target={target} 
            onClick={() => onIncrement(id, 'a')} 
          />
          {/* Maqta B */}
          <MaqtaCounter 
            label={`TM${id}b`} 
            count={state.b.count} 
            target={target} 
            onClick={() => onIncrement(id, 'b')} 
          />
        </div>

        {/* Combined TM */}
        <div className="pt-2">
          <Button 
            disabled={state.a.count < target || state.b.count < target}
            onClick={() => onIncrement(id, 'combined')}
            className={cn(
              "w-full h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
              state.combined.count === target ? "bg-emerald-500 hover:bg-emerald-600" : 
              (state.a.count === target && state.b.count === target) ? "bg-[#800000] hover:bg-[#800000]/90" : "bg-muted text-muted-foreground"
            )}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Gabungan TM{id}a+b</span>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="text-xl font-black">{state.combined.count} <span className="text-[10px] opacity-60">/ {target}</span></span>
            </div>
          </Button>
          {(state.a.count < target || state.b.count < target) && (
            <p className="text-[9px] text-center mt-2 text-muted-foreground italic font-medium">Selesaikan TM{id}a & TM{id}b untuk buka gabungan</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MaqtaCounter({ label, count, target, onClick }: { 
  label: string, 
  count: number, 
  target: number, 
  onClick: () => void 
}) {
  const isDone = count === target;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 select-none overflow-hidden",
        isDone ? "bg-emerald-100 border-emerald-500" : "bg-white hover:border-[#800000]/30 shadow-sm border-border"
      )}
    >
      {/* Progress Background Overlay */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-[#800000]/5 transition-all duration-300 pointer-events-none" 
        style={{ height: `${(count / target) * 100}%` }}
      />

      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest relative z-10 mb-1",
        isDone ? "text-emerald-700" : "text-muted-foreground group-hover:text-[#800000]"
      )}>
        {label}
      </span>
      
      <div className="flex flex-col items-center relative z-10">
        <span className={cn(
          "text-3xl font-black",
          isDone ? "text-emerald-600" : "text-foreground"
        )}>
          {count}
        </span>
        <span className="text-[9px] font-bold opacity-40 uppercase">dari {target}</span>
      </div>

      {isDone ? (
        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-600" />
      ) : (
        <Zap className="absolute top-2 right-2 h-3 w-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
