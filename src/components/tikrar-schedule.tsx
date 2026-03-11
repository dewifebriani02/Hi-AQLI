
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  CheckCircle2, 
  CalendarDays, 
  GraduationCap, 
  Lock,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

const LEVELS = [
  { id: 1, name: "Intensif", days: 7 },
  { id: 2, name: "Reguler", days: 14 },
  { id: 3, name: "Santai", days: 21 },
  { id: 4, name: "Pemula", days: 28 },
];

const PASS_THRESHOLD = 40; // Maqta Individu Wajib 40x
const META_PASS_THRESHOLD = 10; // Gabungan Blok Minimal 10x

// Helper to skip weekends
function addWorkDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < Math.floor(days)) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // 0: Sunday, 6: Saturday
      added++;
    }
  }
  return result;
}

export function TikrarSchedule() {
  const { user } = useUser();
  const db = useFirestore();
  const [expandedPage, setExpandedPage] = useState<number | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);

  const isPaid = userData?.isTikrarPaid || false;
  const juz = userData?.paidJuz || 1;
  const levelId = userData?.tikrarLevel || 3;
  const level = LEVELS.find(l => l.id === levelId) || LEVELS[2];

  const scheduleData = useMemo(() => {
    const startPage = JUZ_PAGES[juz - 1];
    const endPage = juz < 30 ? JUZ_PAGES[juz] - 1 : 604;
    const items = [];
    
    const adminStartDate = userData?.tikrarStartDate?.toDate?.() || 
                          userData?.createdAt?.toDate?.() || 
                          new Date();
    
    let currentDate = new Date(adminStartDate);
    
    const dayAllocation = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]; 

    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      const stepsDates: any[] = [];
      let stepCurrentDate = new Date(pageStart);

      for (let i = 0; i < 10; i++) {
        const sStart = new Date(stepCurrentDate);
        const sDays = Math.max(1, Math.round(level.days * dayAllocation[i]));
        const sEnd = addWorkDays(sStart, sDays);
        stepsDates.push({ start: sStart, end: sEnd });
        stepCurrentDate = new Date(sEnd);
      }

      const pageEnd = new Date(stepCurrentDate);
      
      let tmProgress: Record<string, boolean> = {};
      let metaProgress: Record<string, boolean> = {};
      let isAllDone = false;

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const b = data.blocks || {};
            const m = data.metaCounts || {};
            
            const letters = ["", "A", "B", "C", "D"];
            for (let i = 1; i <= 4; i++) {
              const l = letters[i];
              tmProgress[`${l}1`] = (b[i]?.a?.count || 0) >= PASS_THRESHOLD;
              tmProgress[`${l}2`] = (b[i]?.b?.count || 0) >= PASS_THRESHOLD;
              tmProgress[`${l}G`] = (b[i]?.combined?.count || 0) >= PASS_THRESHOLD;
            }
            
            metaProgress['1_2'] = (m['1_2'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['2_3'] = (m['2_3'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['1_2_3'] = (m['1_2_3'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['3_4'] = (m['3_4'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['2_3_4'] = (m['2_3_4'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['1_2_3_4'] = (m['1_2_3_4'] || 0) >= META_PASS_THRESHOLD;

            isAllDone = metaProgress['1_2_3_4'];
          } catch (e) {}
        }
      }

      items.push({
        page: p,
        start: pageStart,
        end: pageEnd,
        steps: stepsDates,
        tmProgress,
        metaProgress,
        isDone: isAllDone,
      });

      currentDate = new Date(pageEnd);
    }

    return items;
  }, [juz, level, userData, page]);

  if (!isPaid && juz !== 1) {
    return (
      <Card className="border-dashed border-2 bg-muted/20 py-20">
        <CardContent className="flex flex-col items-center justify-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Jadwal Khusus Peserta Tikrar</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Silakan selesaikan pendaftaran untuk mendapatkan rencana jadwal personal berdasarkan Manhaj Tikrar.
            </p>
          </div>
          <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 font-bold">
            <Link href="/study-circles">Daftar Sekarang</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completedCount = scheduleData.filter(i => i.isDone).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#800000]" /> Rencana Belajar
          </h2>
          <p className="text-sm text-muted-foreground">
            Juz {juz} • Level: <strong className="text-[#800000]">{level.name}</strong>
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Total Hal.</p>
            <p className="text-xl font-black text-[#800000]">{scheduleData.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Tuntas</p>
            <p className="text-xl font-black text-emerald-600">{completedCount}</p>
          </div>
        </div>
      </div>

      <div className="relative pl-4 ml-3 border-l-2 border-dashed border-[#800000]/20 space-y-6">
        {scheduleData.map((item, idx) => {
          const isActive = !item.isDone && (idx === 0 || scheduleData[idx - 1].isDone);
          const isExpanded = expandedPage === item.page;
          
          return (
            <div key={item.page} className="relative">
              <div className={cn(
                "absolute -left-[25px] top-6 w-5 h-5 rounded-full border-4 bg-white z-10 transition-all duration-500",
                item.isDone ? "border-emerald-500 shadow-lg shadow-emerald-500/20 scale-110" : 
                isActive ? "border-[#800000] animate-pulse" : "border-muted"
              )}>
                {item.isDone && <CheckCircle2 className="w-full h-full text-emerald-500 p-0.5" />}
              </div>

              <Card 
                className={cn(
                  "border-none shadow-sm transition-all cursor-pointer hover:shadow-md",
                  item.isDone ? "bg-emerald-50/20" : 
                  isActive ? "bg-white ring-2 ring-[#800000]/10" : "bg-card",
                  isExpanded && "ring-2 ring-[#800000]"
                )}
                onClick={() => setExpandedPage(isExpanded ? null : item.page)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Halaman</span>
                        <span className="text-3xl font-black text-[#800000] leading-none">{item.page}</span>
                      </div>
                      <div className="h-10 w-px bg-border mx-2" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estimasi Selesai</span>
                        <span className="text-xs font-bold text-foreground">
                          {item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {item.isDone && <Badge className="bg-emerald-500 text-white font-black text-[8px] tracking-widest">DONE</Badge>}
                      {isActive && <Badge className="bg-amber-500 text-white font-black text-[8px] tracking-widest">AKTIF</Badge>}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-dashed space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#800000]" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]">10 Tahapan Manhaj Tikrar</h4>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <StepRow label={`BLOK A (${item.page}A-1, A-2, G)`} isDone={item.tmProgress['A1'] && item.tmProgress['A2'] && item.tmProgress['AG']} date={item.steps[0].end} threshold={40} />
                        <StepRow label={`BLOK B (${item.page}B-1, B-2, G)`} isDone={item.tmProgress['B1'] && item.tmProgress['B2'] && item.tmProgress['BG']} date={item.steps[1].end} threshold={40} />
                        <StepRow label="GABUNG BLOK A & B" isDone={item.metaProgress['1_2']} date={item.steps[2].end} isMeta threshold={10} />
                        
                        <StepRow label={`BLOK C (${item.page}C-1, C-2, G)`} isDone={item.tmProgress['C1'] && item.tmProgress['C2'] && item.tmProgress['CG']} date={item.steps[3].end} threshold={40} />
                        <StepRow label="GABUNG BLOK B & C" isDone={item.metaProgress['2_3']} date={item.steps[4].end} isMeta threshold={10} />
                        <StepRow label="GABUNG BLOK A s/d C" isDone={item.metaProgress['1_2_3']} date={item.steps[5].end} isMeta threshold={10} />
                        
                        <StepRow label={`BLOK D (${item.page}D-1, D-2, G)`} isDone={item.tmProgress['D1'] && item.tmProgress['D2'] && item.tmProgress['DG']} date={item.steps[6].end} threshold={40} />
                        <StepRow label="GABUNG BLOK C & D" isDone={item.metaProgress['3_4']} date={item.steps[7].end} isMeta threshold={10} />
                        <StepRow label="GABUNG BLOK B s/d D" isDone={item.metaProgress['2_3_4']} date={item.steps[8].end} isMeta threshold={10} />
                        <StepRow label="GABUNG SELURUH HALAMAN (A-D)" isDone={item.metaProgress['1_2_3_4']} date={item.steps[9].end} isMeta highlight threshold={10} />
                      </div>

                      <div className="bg-[#800000] p-4 rounded-2xl flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-5 h-5 text-white" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/70 uppercase">Target Ujian Lisan</span>
                            <span className="text-xs font-black text-white">{item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepRow({ label, isDone, date, isMeta, highlight, threshold }: { label: string, isDone: boolean, date: Date, isMeta?: boolean, highlight?: boolean, threshold: number }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl border transition-all",
      isDone ? "bg-emerald-50 border-emerald-200" : "bg-white",
      highlight && !isDone && "border-amber-500 bg-amber-50/20"
    )}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
          isDone ? "bg-emerald-500 text-white" : isMeta ? "bg-muted text-muted-foreground" : "bg-[#800000]/10 text-[#800000]"
        )}>
          {isDone ? <Check className="w-3 h-3" /> : isMeta ? <Zap className="w-3 h-3" /> : <Check className="w-3 h-3 opacity-20" />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className={cn("text-[10px] font-bold truncate", highlight ? "text-[#800000]" : "text-foreground")}>{label}</span>
          <span className="text-[8px] text-muted-foreground font-medium truncate">
            {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • Target {threshold}x
          </span>
        </div>
      </div>
      {isDone && <Badge className="bg-emerald-500 h-4 px-1.5 text-[8px] font-black uppercase shrink-0">OK</Badge>}
    </div>
  );
}
