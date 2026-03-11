
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  CheckCircle2, 
  Clock, 
  CalendarDays, 
  GraduationCap, 
  ShieldCheck, 
  Info,
  Calendar,
  Lock
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
function addBusinessDays(startDate: Date, days: number): Date {
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
    
    // Assume start from account creation or today if not found
    let currentDate = userData?.createdAt ? new Date(userData.createdAt) : new Date();
    
    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      const pageEnd = addBusinessDays(pageStart, level.days);
      
      // Check if done in localStorage
      let isDone = false;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            // Consider 100% done based on TikrarSystem logic
            const b = data.blocks || {};
            const m = data.metaCombined || {};
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
        examId: `Exam-${p}`
      });

      // Next page starts after current page ends
      currentDate = new Date(pageEnd);
    }

    return items;
  }, [juz, level, userData]);

  if (!isPaid && juz !== 1) {
    return (
      <Card className="border-dashed border-2 bg-muted/20 py-16">
        <CardContent className="flex flex-col items-center justify-center text-center gap-4">
          <Lock className="w-12 h-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Jadwal Terkunci</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Silakan mendaftar Halaqah Tikrar untuk melihat jadwal personal Anda.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-headline flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#800000]" /> Timeline Hafalan Juz {juz}
          </h2>
          <p className="text-xs text-muted-foreground">
            Berdasarkan level <strong>{level.name}</strong> ({level.days} hari kerja/halaman, libur Sabtu & Ahad).
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold uppercase tracking-tighter">
            {scheduleData.length} Ujian Lisan
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold uppercase tracking-tighter">
            {scheduleData.filter(i => i.isDone).length} Selesai
          </Badge>
        </div>
      </div>

      <div className="relative pl-4 ml-2 border-l-2 border-muted-foreground/10 space-y-8">
        {scheduleData.map((item, idx) => (
          <div key={item.page} className="relative">
            {/* Timeline Dot */}
            <div className={cn(
              "absolute -left-[25px] top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all",
              item.isDone ? "border-emerald-500 scale-110 shadow-lg shadow-emerald-500/20" : "border-muted-foreground/30"
            )}>
              {item.isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </div>

            <Card className={cn(
              "border-none shadow-sm transition-all hover:shadow-md",
              item.isDone ? "bg-emerald-50/30" : "bg-card"
            )}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-[#800000]">Hal. {item.page}</span>
                      {item.isDone ? (
                        <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5">DONE</Badge>
                      ) : idx === scheduleData.findIndex(i => !i.isDone) ? (
                        <Badge className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 animate-pulse">ACTIVE</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground uppercase">Upcoming</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 bg-white/50 p-2 rounded-lg border">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Mulai - Selesai</p>
                          <p className="text-xs font-bold">
                            {item.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-[#800000]/5 p-2 rounded-lg border border-[#800000]/10">
                        <GraduationCap className="w-4 h-4 text-[#800000]" />
                        <div>
                          <p className="text-[9px] font-bold text-[#800000] uppercase">Jadwal Ujian Lisan</p>
                          <p className="text-xs font-black">{item.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-32 flex md:flex-col items-center justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 gap-2">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Ujian ke-</p>
                      <p className="text-xl font-black text-muted-foreground">{idx + 1}</p>
                    </div>
                    {item.isDone && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-900">Catatan Jadwal</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Jadwal ini bersifat dinamis. Jika Anda menyelesaikan satu halaman lebih cepat, Anda dapat langsung mengajukan ujian dan melanjutkan ke halaman berikutnya. Libur Sabtu & Ahad digunakan untuk murajaah mandiri di luar target tambahan hafalan baru.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
