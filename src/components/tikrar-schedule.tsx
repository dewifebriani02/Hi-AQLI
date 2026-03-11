
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
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
  Layers,
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

const PASS_THRESHOLD = 5;
const META_PASS_THRESHOLD = 10;

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
    const dayAllocation = [0.15, 0.15, 0.1, 0.15, 0.1, 0.1, 0.15, 0.1]; // Distribution across Maqtas and Meta

    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      const stepsDates: any[] = [];
      let stepCurrentDate = new Date(pageStart);

      // We have roughly 10 visual steps now
      for (let i = 0; i < 8; i++) {
        const sStart = new Date(stepCurrentDate);
        const sDays = Math.max(1, Math.round(level.days * (dayAllocation[i] || 0.1)));
        const sEnd = addWorkDays(sStart, sDays);
        stepsDates.push({ start: sStart, end: sEnd });
        stepCurrentDate = new Date(sEnd);
      }

      const pageEnd = new Date(stepCurrentDate);
      
      let maqtaProgress: Record<number, any> = {};
      let metaProgress: Record<string, boolean> = {};
      let isAllDone = false;

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const b = data.blocks || {};
            const m = data.metaCounts || {};
            
            for (let i = 1; i <= 4; i++) {
              maqtaProgress[i] = {
                a: (b[i]?.a?.count || 0) >= PASS_THRESHOLD,
                b: (b[i]?.b?.count || 0) >= PASS_THRESHOLD,
                combined: (b[i]?.combined?.count || 0) >= PASS_THRESHOLD
              };
            }
            metaProgress['1_2'] = (m['1_2'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['1_2_3'] = (m['1_2_3'] || 0) >= META_PASS_THRESHOLD;
            metaProgress['1_2_3_4'] = (m['1_2_3_4'] || 0) >= META_PASS_THRESHOLD;

            isAllDone = maqtaProgress[4].combined && metaProgress['1_2_3_4'];
          } catch (e) {}
        }
      }

      if (Object.keys(maqtaProgress).length === 0) {
        for (let i = 1; i <= 4; i++) maqtaProgress[i] = { a: false, b: false, combined: false };
        metaProgress = { '1_2': false, '1_2_3': false, '1_2_3_4': false };
      }

      items.push({
        page: p,
        start: pageStart,
        end: pageEnd,
        steps: stepsDates,
        maqtaProgress,
        metaProgress,
        isDone: isAllDone,
      });

      currentDate = new Date(pageEnd);
    }

    return items;
  }, [juz, level, userData]);

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
              Silakan selesaikan pendaftaran untuk mendapatkan rencana jadwal personal berdasarkan Tikrar Maqta.
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
            <CalendarDays className="w-6 h-6 text-[#800000]" /> Rencana Tikrar Maqta
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
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]">Detail Tikrar Maqta (TM)</h4>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4].map((stepNum) => (
                          <div key={stepNum} className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/10">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">Tikrar Maqta {stepNum} (5x)</span>
                              <div className="flex gap-1.5">
                                {['a', 'b', 'combined'].map((sub) => (
                                  <div key={sub} className={cn(
                                    "px-1.5 py-0.5 rounded border text-[7px] font-black uppercase",
                                    item.maqtaProgress[stepNum][sub] ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-muted-foreground opacity-40"
                                  )}>
                                    {sub === 'combined' ? 'G' : sub}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}

                        {['1_2', '1_2_3', '1_2_3_4'].map((metaKey) => {
                          const label = metaKey === '1_2' ? "Gabung TM1 & 2" : metaKey === '1_2_3' ? "Gabung TM1-3" : "Gabung Halaman";
                          const isDone = item.metaProgress[metaKey];
                          return (
                            <div key={metaKey} className={cn(
                              "flex items-center justify-between p-3 rounded-xl border transition-all",
                              isDone ? "bg-emerald-50 border-emerald-200" : "bg-white opacity-60"
                            )}>
                              <span className="text-xs font-bold">{label} (10x)</span>
                              {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-[#800000] p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-5 h-5 text-white" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/70 uppercase">Ujian Lisan Maqta</span>
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
