
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
  ShieldCheck, 
  Info,
  Calendar,
  Lock,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  Circle,
  Zap,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const TARGET_TM = 40;

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
    
    // Distribution of 7 steps across total days per page
    // Steps 1-4 take ~15% each (total 60%)
    // Steps 5-7 take ~13.3% each (total 40%)
    const dayAllocation = [0.15, 0.15, 0.15, 0.15, 0.133, 0.133, 0.134];

    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      const stepsDates: any[] = [];
      let stepCurrentDate = new Date(pageStart);

      for (let i = 0; i < 7; i++) {
        const sStart = new Date(stepCurrentDate);
        const sDays = Math.max(1, Math.round(level.days * dayAllocation[i]));
        const sEnd = addWorkDays(sStart, sDays);
        stepsDates.push({ start: sStart, end: sEnd });
        stepCurrentDate = new Date(sEnd);
      }

      const pageEnd = new Date(stepCurrentDate);
      
      let stepProgress: Record<number, any> = {};
      let isAllDone = false;

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const b = data.blocks || {};
            const m = data.metaCombined || {};
            
            // Steps 1-4 (Blocks)
            for (let i = 1; i <= 4; i++) {
              stepProgress[i] = {
                a: b[i]?.a?.count >= TARGET_TM,
                b: b[i]?.b?.count >= TARGET_TM,
                combined: b[i]?.combined?.count >= TARGET_TM,
                isFullDone: b[i]?.combined?.count >= TARGET_TM
              };
            }
            // Steps 5-7 (Meta)
            stepProgress[5] = { isFullDone: m[2] >= 3 }; // Meta 2
            stepProgress[6] = { isFullDone: m[3] >= 3 }; // Meta 3
            stepProgress[7] = { isFullDone: m[4] >= 3 }; // Meta 4

            isAllDone = [1,2,3,4,5,6,7].every(id => stepProgress[id].isFullDone);
          } catch (e) {}
        }
      }

      // Default empty progress
      if (Object.keys(stepProgress).length === 0) {
        for (let i = 1; i <= 7; i++) {
          stepProgress[i] = { isFullDone: false, a: false, b: false, combined: false };
        }
      }

      items.push({
        page: p,
        start: pageStart,
        end: pageEnd,
        steps: stepsDates,
        stepProgress,
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
            <h3 className="text-xl font-bold">Jadwal Hanya Untuk Santri Terdaftar</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Silakan selesaikan pendaftaran Halaqah Tikrar untuk mendapatkan rencana jadwal personal.
            </p>
          </div>
          <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 font-bold">
            <Link href="/study-circles">Daftar Tikrar Sekarang</Link>
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
            <CalendarDays className="w-6 h-6 text-[#800000]" /> Rencana Belajar Juz {juz}
          </h2>
          <p className="text-sm text-muted-foreground">
            Level: <strong className="text-[#800000]">{level.name}</strong> • Libur Sabtu & Ahad
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Target Hal.</p>
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
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Selesai</span>
                        <span className="text-xs font-bold text-foreground">
                          {item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#800000]" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]">7 Langkah Tikrar</h4>
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground">Progres Detail</span>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4].map((stepNum) => (
                          <div key={stepNum} className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-[#800000] text-white flex items-center justify-center text-[10px] font-black">{stepNum}</span>
                                <span className="text-xs font-bold">TM {stepNum} (Blok Individu)</span>
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground">
                                {item.steps[stepNum-1].start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {item.steps[stepNum-1].end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              {['a', 'b', 'combined'].map((sub) => {
                                const isDone = item.stepProgress[stepNum][sub as keyof typeof item.stepProgress[number]];
                                return (
                                  <div key={sub} className={cn(
                                    "flex flex-col items-center justify-center py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-tighter transition-all",
                                    isDone ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white text-muted-foreground border-dashed"
                                  )}>
                                    {sub === 'combined' ? 'Gabungan' : `Bag. ${sub}`}
                                    {isDone && <Check className="w-2.5 h-2.5 mt-0.5" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {[5, 6, 7].map((stepNum) => {
                          const metaLabel = stepNum === 5 ? "Blok 1+2" : stepNum === 6 ? "Blok 1+2+3" : "Blok 1-4 (Final)";
                          const isDone = item.stepProgress[stepNum].isFullDone;
                          return (
                            <div key={stepNum} className={cn(
                              "flex items-center justify-between p-3 rounded-xl border transition-all",
                              isDone ? "bg-emerald-50 border-emerald-200" : "bg-white"
                            )}>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                                  isDone ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"
                                )}>{stepNum}</span>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">TM {stepNum} ({metaLabel})</span>
                                  <span className="text-[9px] font-medium text-muted-foreground">Repetisi Gabungan</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-muted-foreground">
                                  {item.steps[stepNum-1].start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {item.steps[stepNum-1].end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-[#800000] p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-[#800000]/20">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-xl">
                            <GraduationCap className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">Target Ujian Lisan</span>
                            <span className="text-sm font-black text-white">{item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                          STEP FINAL
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

      <Card className="bg-blue-50 border-blue-100 shadow-none mt-10">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Informasi Penjadwalan</p>
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Jadwal di atas adalah estimasi ideal. Satu halaman Al-Qur'an memiliki 7 langkah pengerjaan (TM 1 s/d TM 7). Pastikan Anda mencentang repetisi di tab "Tikrar Daily" untuk memperbarui status di sini secara otomatis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
