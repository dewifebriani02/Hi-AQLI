
"use client";

import React, { useMemo } from "react";
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
  Clock
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
    
    // Default to account creation or a reasonable start date
    let currentDate = userData?.createdAt ? new Date(userData.createdAt) : new Date();
    
    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      const pageEnd = addWorkDays(pageStart, level.days);
      
      // Check local progress
      let isDone = false;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const b = data.blocks || {};
            const m = data.metaCombined || {};
            // Simplified "Done" check for UI
            const blocksDone = [1, 2, 3, 4].every(id => b[id]?.combined?.count >= 40);
            const metaDone = m[4] >= 3;
            isDone = blocksDone && metaDone;
          } catch (e) {}
        }
      }

      items.push({
        page: p,
        start: pageStart,
        end: pageEnd,
        isDone,
      });

      // Sequential: next page starts when this one is planned to end
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
              Silakan selesaikan pendaftaran Halaqah Tikrar untuk mendapatkan rencana jadwal personal yang melompati hari libur Sabtu & Ahad.
            </p>
          </div>
          <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 font-bold">
            <Link href="/study-circles">Daftar Tikrar Sekarang</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalExams = scheduleData.length;
  const completedExams = scheduleData.filter(i => i.isDone).length;

  return (
    <div className="space-y-8">
      {/* SUMMARY HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#800000]" /> Rencana Belajar Juz {juz}
          </h2>
          <p className="text-sm text-muted-foreground">
            Level: <strong className="text-foreground">{level.name}</strong> • Target: <strong className="text-foreground">{level.days} hari/halaman</strong> (Libur Sabtu-Ahad).
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Total Ujian</p>
            <p className="text-xl font-black text-[#800000]">{totalExams}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Tuntas</p>
            <p className="text-xl font-black text-emerald-600">{completedExams}</p>
          </div>
        </div>
      </div>

      {/* SCHEDULE LIST */}
      <div className="relative pl-4 ml-3 border-l-2 border-dashed border-[#800000]/20 space-y-10">
        {scheduleData.map((item, idx) => {
          const isActive = !item.isDone && (idx === 0 || scheduleData[idx - 1].isDone);
          
          return (
            <div key={item.page} className="relative">
              {/* Timeline Indicator */}
              <div className={cn(
                "absolute -left-[25px] top-0 w-5 h-5 rounded-full border-4 bg-white z-10 transition-all duration-500",
                item.isDone ? "border-emerald-500 shadow-lg shadow-emerald-500/20 scale-110" : 
                isActive ? "border-[#800000] animate-pulse" : "border-muted"
              )}>
                {item.isDone && <CheckCircle2 className="w-full h-full text-emerald-500 p-0.5" />}
              </div>

              <Card className={cn(
                "border-none shadow-sm transition-all hover:translate-x-1 duration-300",
                item.isDone ? "bg-emerald-50/20 opacity-80" : 
                isActive ? "bg-white ring-2 ring-[#800000]/10 shadow-md" : "bg-card"
              )}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-[#800000]">Hal. {item.page}</span>
                        {item.isDone ? (
                          <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 tracking-widest">SELESAI</Badge>
                        ) : isActive ? (
                          <Badge className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 animate-pulse tracking-widest">AKTIF SEKARANG</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Antrean</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-dashed">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Masa Belajar</p>
                            <p className="text-xs font-bold text-foreground">
                              {item.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed",
                          item.isDone ? "bg-emerald-50 border-emerald-200" : "bg-[#800000]/5 border-[#800000]/10"
                        )}>
                          <GraduationCap className={cn("w-5 h-5", item.isDone ? "text-emerald-600" : "text-[#800000]")} />
                          <div>
                            <p className={cn("text-[10px] font-black uppercase tracking-wider", item.isDone ? "text-emerald-700" : "text-[#800000]")}>Jadwal Ujian Lisan</p>
                            <p className="text-sm font-black text-foreground">
                              {item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:w-32 flex md:flex-col items-center justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 gap-3">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Ujian Ke-</p>
                        <p className="text-3xl font-black text-muted-foreground/40">#{idx + 1}</p>
                      </div>
                      {item.isDone && (
                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-lg">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* FOOTER INFO */}
      <Card className="bg-blue-50 border-blue-100 shadow-none mt-10">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Kebijakan Jadwal</p>
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Jadwal ini dihitung secara sistematis dengan mengasumsikan libur pada hari Sabtu dan Ahad untuk murajaah mandiri. Jika Anda menyelesaikan Tikrar sebelum target tanggal selesai, Anda diperbolehkan langsung mengajukan ujian lisan kepada Tutor dan melompat ke halaman berikutnya lebih awal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
