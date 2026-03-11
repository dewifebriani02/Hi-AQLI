
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
  Layers
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

// Helper to skip weekends
function addWorkDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
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
    
    const daysPerBlock = Math.floor(level.days / 4);

    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      
      // Calculate individual block dates
      const blockDates = [];
      let bCurrentDate = new Date(pageStart);
      for (let i = 1; i <= 4; i++) {
        const bStart = new Date(bCurrentDate);
        const bDays = i === 4 ? level.days - (daysPerBlock * 3) : daysPerBlock;
        const bEnd = addWorkDays(bStart, bDays);
        blockDates.push({ id: i, start: bStart, end: bEnd });
        bCurrentDate = new Date(bEnd);
      }

      const pageEnd = new Date(bCurrentDate);
      
      let isDone = false;
      let blockProgress = { 1: false, 2: false, 3: false, 4: false };

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const b = data.blocks || {};
            const m = data.metaCombined || {};
            
            blockProgress = {
              1: b[1]?.combined?.count >= 40,
              2: b[2]?.combined?.count >= 40,
              3: b[3]?.combined?.count >= 40,
              4: b[4]?.combined?.count >= 40,
            };

            isDone = Object.values(blockProgress).every(v => v) && (m[4] >= 3);
          } catch (e) {}
        }
      }

      items.push({
        page: p,
        start: pageStart,
        end: pageEnd,
        blocks: blockDates,
        blockProgress,
        isDone,
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
            Level: <strong className="text-[#800000]">{level.name}</strong> • Melompati Sabtu & Ahad
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
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estimasi</span>
                        <span className="text-xs font-bold text-foreground">
                          {item.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
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
                    <div className="mt-6 pt-6 border-t border-dashed space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <Layers className="w-4 h-4 text-[#800000]" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]">Breakdown Jadwal Per Blok</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.blocks.map((block) => (
                          <div 
                            key={block.id}
                            className={cn(
                              "p-3 rounded-xl border-2 flex items-center justify-between gap-3 transition-colors",
                              item.blockProgress[block.id as keyof typeof item.blockProgress] 
                                ? "bg-emerald-50 border-emerald-200" 
                                : "bg-muted/30 border-muted"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm",
                                item.blockProgress[block.id as keyof typeof item.blockProgress] 
                                  ? "bg-emerald-500 text-white" 
                                  : "bg-white text-muted-foreground border"
                              )}>
                                {block.id}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Blok TM{block.id}</span>
                                <span className="text-[10px] font-bold">
                                  {block.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {block.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            {item.blockProgress[block.id as keyof typeof item.blockProgress] && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#800000]/5 p-4 rounded-xl border-2 border-dashed border-[#800000]/10 flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-5 h-5 text-[#800000]" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-[#800000] uppercase tracking-widest leading-none mb-1">Target Ujian Lisan</span>
                            <span className="text-sm font-black">{item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-[#800000]/20 text-[#800000] font-black text-[9px] px-2">#{idx + 1}</Badge>
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
            <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Panduan Rencana Belajar</p>
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Ketuk kartu halaman untuk melihat rincian tanggal per blok. Jadwal ini dihitung secara sistematis berdasarkan tanggal mulai pendaftaran Anda dan level pengerjaan yang dipilih.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
