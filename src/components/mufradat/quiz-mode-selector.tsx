"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Timer, CheckCircle2, Shuffle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizMode = "runut" | "acak" | "variasi";

interface QuizModeSelectorProps {
  onSelect: (mode: QuizMode) => void;
  title?: string;
  description?: string;
}

export function QuizModeSelector({ 
  onSelect, 
  title = "SIAP MULAI?", 
  description = "Pilih mode kuis Anda sebelum memulai." 
}: QuizModeSelectorProps) {
  return (
    <Card className="border-4 border-[#D4AF37]/20 shadow-2xl overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-center space-y-6">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto text-[#D4AF37]">
         <Zap className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-black font-headline text-[#800000]">{title}</h2>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{description}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
         <button 
            onClick={() => onSelect("runut")}
            className="p-4 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-[#800000]/20 hover:bg-[#800000]/5 transition-all flex flex-col items-center gap-3 group"
         >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#800000] group-hover:text-white transition-colors flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase">Mode Runut</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">Sesuai Urutan</span>
            </div>
         </button>

         <button 
            onClick={() => onSelect("acak")}
            className="p-4 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all flex flex-col items-center gap-3 group"
         >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-colors flex items-center justify-center">
              <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase group-hover:text-orange-600">Mode Acak</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">Kocok Soal</span>
            </div>
         </button>

         <button 
            onClick={() => onSelect("variasi")}
            className="p-4 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all flex flex-col items-center gap-3 group"
         >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase group-hover:text-emerald-700">Mode Variasi</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-400">Tricky & Susun</span>
            </div>
         </button>
      </div>

      <div className="pt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
        Pilih satu untuk memulai
      </div>
    </Card>
  );
}
