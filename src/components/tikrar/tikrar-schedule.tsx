"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/db";
import { useDoc } from "@/db";
import {
  CheckCircle2,
  CalendarDays,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Check,
  BookOpen,
  Target,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JUZ_PAGE_MAPPING } from "@/lib/quran-mapping";

const PASS_THRESHOLD = 40;
const META_PASS_THRESHOLD = 10;
const PREP_LISTEN_THRESHOLD = 5;

function addWorkDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < Math.floor(days)) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result;
}

export function TikrarSchedule() {
  const { user } = useUser();
  const [expandedPage, setExpandedPage] = useState<number | null>(null);

  const { data: userData } = useDoc(user ? "users" : null, user?.id);

  const juz = Number(userData?.paid_juz ?? userData?.paidJuz) || 30;
  const durationMonths = Number(userData?.tikrar_target_duration_months) || 2;

  // Pace configuration
  const paceConfig = useMemo(() => {
    if (durationMonths === 1) {
      return { name: "Intensif (1 Bulan)", daysPerPage: 1, dailyLoad: "1 Hal (4 Blok) / hari" };
    }
    if (durationMonths === 3) {
      return { name: "Santai (3 Bulan)", daysPerPage: 4, dailyLoad: "1 Blok / hari" };
    }
    return { name: "Reguler (2 Bulan)", daysPerPage: 2, dailyLoad: "1/2 Hal (2 Blok) / hari" };
  }, [durationMonths]);

  const scheduleData = useMemo(() => {
    const mapping = JUZ_PAGE_MAPPING[juz] || { startPage: 582, endPage: 604 };
    const startPage = mapping.startPage;
    const endPage = mapping.endPage;

    const startDateRaw = userData?.tikrar_start_date ?? userData?.tikrarStartDate;
    const baseStartDate = startDateRaw
      ? new Date(startDateRaw)
      : userData?.created_at
      ? new Date(userData.created_at)
      : new Date();

    const items: any[] = [];
    let currentDate = new Date(baseStartDate);

    // Pre-load all progress from localStorage for current range
    const progressMap = new Map<number, any>();
    if (typeof window !== "undefined") {
      for (let p = startPage; p <= endPage; p++) {
        const saved = localStorage.getItem(`tikrar_progress_p${p}`);
        if (saved) {
          try {
            progressMap.set(p, JSON.parse(saved));
          } catch (e) {}
        }
      }
    }

    const dayAllocation = [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.15];
    const totalDaysForPage = paceConfig.daysPerPage;

    for (let p = startPage; p <= endPage; p++) {
      const pageStart = new Date(currentDate);
      const stepsDates: any[] = [];
      let stepCurrentDate = new Date(pageStart);

      for (let i = 0; i < 11; i++) {
        const sStart = new Date(stepCurrentDate);
        const sDays = Math.max(1, Math.round(totalDaysForPage * dayAllocation[i]));
        const sEnd = addWorkDays(sStart, sDays);
        stepsDates.push({ start: sStart, end: sEnd });
        stepCurrentDate = new Date(sEnd);
      }

      const pageEnd = addWorkDays(pageStart, totalDaysForPage);
      currentDate = new Date(pageEnd);

      let isPrepDone = false;
      let tmProgress: Record<string, boolean> = {};
      let metaProgress: Record<string, boolean> = {};
      let isAllDone = false;

      const data = progressMap.get(p);
      if (data) {
        const b = data.blocks || {};
        const m = data.metaCounts || {};

        isPrepDone = (data.prepListenCount || 0) >= PREP_LISTEN_THRESHOLD && (data.prepTranslationDone || false);

        const letters = ["A", "B", "C", "D"];
        letters.forEach((l) => {
          const lData = b[l] || {};
          tmProgress[l] = (lData.bithNadharCount || 0) >= PASS_THRESHOLD && (lData.bilGhaibCount || 0) >= PASS_THRESHOLD;
        });

        metaProgress["1_2"] = (m["1_2"] || 0) >= META_PASS_THRESHOLD;
        metaProgress["2_3"] = (m["2_3"] || 0) >= META_PASS_THRESHOLD;
        metaProgress["1_2_3"] = (m["1_2_3"] || 0) >= META_PASS_THRESHOLD;
        metaProgress["3_4"] = (m["3_4"] || 0) >= META_PASS_THRESHOLD;
        metaProgress["2_3_4"] = (m["2_3_4"] || 0) >= META_PASS_THRESHOLD;
        metaProgress["1_2_3_4"] = (m["1_2_3_4"] || 0) >= META_PASS_THRESHOLD;

        isAllDone =
          isPrepDone &&
          tmProgress["A"] &&
          tmProgress["B"] &&
          tmProgress["C"] &&
          tmProgress["D"] &&
          metaProgress["1_2_3_4"];
      }

      items.push({
        page: p,
        start: pageStart,
        end: pageEnd,
        steps: stepsDates,
        isDone: isAllDone,
        isPrepDone,
        tmProgress,
        metaProgress,
      });
    }

    return items;
  }, [juz, userData, paceConfig]);

  const completedCount = scheduleData.filter((i: any) => i.isDone).length;
  const progressPercent = scheduleData.length > 0 ? Math.round((completedCount / scheduleData.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Info Rencana & Target */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000] bg-[#800000]/10 px-2 py-0.5 rounded-full">
              Peta Rencana Harian
            </span>
            <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 border-emerald-300">
              5 Hari Aktif / Pekan
            </Badge>
          </div>
          <h3 className="text-xl font-bold font-headline text-foreground">
            Jadwal Tikrar Juz {juz}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#800000]" />
            Pace: <strong>{paceConfig.name}</strong> • Beban: {paceConfig.dailyLoad}
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Timeline Halaman */}
      <div className="relative pl-4 ml-3 border-l-2 border-dashed border-[#800000]/20 space-y-6">
        {scheduleData.map((item: any, idx: number) => {
          const isActive = !item.isDone && (idx === 0 || scheduleData[idx - 1].isDone);
          const isExpanded = expandedPage === item.page;

          return (
            <div key={item.page} className="relative">
              <div
                className={cn(
                  "absolute -left-[25px] top-6 w-5 h-5 rounded-full border-4 bg-white z-10 transition-all duration-500",
                  item.isDone
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/20 scale-110"
                    : isActive
                    ? "border-[#800000] animate-pulse"
                    : "border-muted"
                )}
              >
                {item.isDone && <CheckCircle2 className="w-full h-full text-emerald-500 p-0.5" />}
              </div>

              <Card
                className={cn(
                  "border-none shadow-sm transition-all cursor-pointer hover:shadow-md",
                  item.isDone
                    ? "bg-emerald-50/20"
                    : isActive
                    ? "bg-white ring-2 ring-[#800000]/10"
                    : "bg-card",
                  isExpanded && "ring-2 ring-[#800000]"
                )}
                onClick={() => setExpandedPage(isExpanded ? null : item.page)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Halaman
                        </span>
                        <span className="text-3xl font-black text-[#800000] leading-none">{item.page}</span>
                      </div>
                      <div className="h-10 w-px bg-border mx-2" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Estimasi Selesai
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {item.end.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.isDone && (
                        <Badge className="bg-emerald-500 text-white font-black text-[8px] tracking-widest">DONE</Badge>
                      )}
                      {isActive && (
                        <Badge className="bg-amber-500 text-white font-black text-[8px] tracking-widest">AKTIF</Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-dashed space-y-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#800000]" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]">
                          Urutan Manhaj Tikrar (Halaman {item.page})
                        </h4>
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* Preparation Step */}
                        <StepRow
                          icon={BookOpen}
                          label="TAHAP PERSIAPAN (Simak 5x & Paham Arti)"
                          isDone={item.isPrepDone}
                          date={item.steps[0].end}
                          threshold={5}
                        />

                        {/* 10 Memorization Steps */}
                        <StepRow
                          label={`BLOK A (${item.page}A-1, A-2, G)`}
                          isDone={item.tmProgress["A"]}
                          date={item.steps[1].end}
                          threshold={40}
                        />
                        <StepRow
                          label={`BLOK B (${item.page}B-1, B-2, G)`}
                          isDone={item.tmProgress["B"]}
                          date={item.steps[2].end}
                          threshold={40}
                        />
                        <StepRow
                          label="GABUNG BLOK A & B (Milestone Setoran 1/2 Halaman)"
                          isDone={item.metaProgress["1_2"]}
                          date={item.steps[3].end}
                          isMeta
                          highlight
                          threshold={10}
                        />

                        <StepRow
                          label={`BLOK C (${item.page}C-1, C-2, G)`}
                          isDone={item.tmProgress["C"]}
                          date={item.steps[4].end}
                          threshold={40}
                        />
                        <StepRow
                          label="GABUNG BLOK B & C"
                          isDone={item.metaProgress["2_3"]}
                          date={item.steps[5].end}
                          isMeta
                          threshold={10}
                        />
                        <StepRow
                          label="GABUNG BLOK A s/d C"
                          isDone={item.metaProgress["1_2_3"]}
                          date={item.steps[6].end}
                          isMeta
                          threshold={10}
                        />

                        <StepRow
                          label={`BLOK D (${item.page}D-1, D-2, G)`}
                          isDone={item.tmProgress["D"]}
                          date={item.steps[7].end}
                          threshold={40}
                        />
                        <StepRow
                          label="GABUNG BLOK C & D"
                          isDone={item.metaProgress["3_4"]}
                          date={item.steps[8].end}
                          isMeta
                          threshold={10}
                        />
                        <StepRow
                          label="GABUNG BLOK B s/d D"
                          isDone={item.metaProgress["2_3_4"]}
                          date={item.steps[9].end}
                          isMeta
                          threshold={10}
                        />
                        <StepRow
                          label="GABUNG SELURUH HALAMAN (A-D) (Milestone Setoran 1 Hal)"
                          isDone={item.metaProgress["1_2_3_4"]}
                          date={item.steps[10].end}
                          isMeta
                          highlight
                          threshold={10}
                        />
                      </div>

                      <div className="bg-[#800000] p-4 rounded-2xl flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="w-5 h-5 text-white" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/70 uppercase">
                              Target Ujian Lisan Live Zoom
                            </span>
                            <span className="text-xs font-black text-white">
                              {item.end.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                            </span>
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

function StepRow({
  icon: Icon,
  label,
  isDone,
  date,
  isMeta,
  highlight,
  threshold,
}: {
  icon?: any;
  label: string;
  isDone: boolean;
  date: Date;
  isMeta?: boolean;
  highlight?: boolean;
  threshold: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-all",
        isDone ? "bg-emerald-50 border-emerald-200" : "bg-white",
        highlight && !isDone && "border-amber-500 bg-amber-50/20"
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
            isDone
              ? "bg-emerald-500 text-white"
              : isMeta
              ? "bg-muted text-muted-foreground"
              : "bg-[#800000]/10 text-[#800000]"
          )}
        >
          {isDone ? (
            <Check className="w-3 h-3" />
          ) : Icon ? (
            <Icon className="w-3 h-3" />
          ) : isMeta ? (
            <Zap className="w-3 h-3" />
          ) : (
            <Check className="w-3 h-3 opacity-20" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "text-[10px] font-bold truncate",
              highlight ? "text-[#800000]" : "text-foreground"
            )}
          >
            {label}
          </span>
          <span className="text-[8px] text-muted-foreground font-medium truncate">
            {date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} • Target {threshold}x
          </span>
        </div>
      </div>
      {isDone && <Badge className="bg-emerald-500 h-4 px-1.5 text-[8px] font-black uppercase shrink-0">OK</Badge>}
    </div>
  );
}
