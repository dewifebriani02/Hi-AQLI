"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Flame,
  Award,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useUser, useDoc, useCollection } from "@/db";
import { DEFAULT_TIKRAR_HALAQAHS } from "./tikrar-onboarding-modal";
import { cn } from "@/lib/utils";

// Mock classmates in the same Zoom cohort to provide immediate rich peer accountability
const COHORT_CLASSMATES = [
  {
    id: "classmate-1",
    name: "Maryam Zakaria",
    salutation: "Ukhti",
    streak: 16,
    points: 580,
    activeDaysThisWeek: 5,
    isCurrentUser: false,
    // Pola keaktifan 30 hari (1 = tuntas, 2 = setoran lulus, 0 = kosong)
    activityPattern: [
      1, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1,
    ],
  },
  {
    id: "classmate-2",
    name: "Fatimah Azzahra",
    salutation: "Ukhti",
    streak: 12,
    points: 460,
    activeDaysThisWeek: 5,
    isCurrentUser: false,
    activityPattern: [
      1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 2, 0, 0, 1, 0,
    ],
  },
  {
    id: "classmate-3",
    name: "Khadijah Al-Kubro",
    salutation: "Ukhti",
    streak: 6,
    points: 310,
    activeDaysThisWeek: 3,
    isCurrentUser: false,
    activityPattern: [
      1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 2, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1,
    ],
  },
  {
    id: "classmate-4",
    name: "Aisyah Humaira",
    salutation: "Ukhti",
    streak: 9,
    points: 390,
    activeDaysThisWeek: 4,
    isCurrentUser: false,
    activityPattern: [
      1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1,
    ],
  },
  {
    id: "classmate-5",
    name: "Shafiyyah Binti Huyay",
    salutation: "Ukhti",
    streak: 4,
    points: 220,
    activeDaysThisWeek: 2,
    isCurrentUser: false,
    activityPattern: [
      0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0,
    ],
  },
];

export function TikrarGroupHeatmap() {
  const { user } = useUser();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);

  // Ambil daftar log harian pengguna saat ini
  const { data: userDailyLogs } = useCollection("tikrar_daily_logs", {
    filters: [{ column: "user_id", operator: "==", value: user?.id }],
  });

  // Ambil daftar setoran tasmi' live zoom pengguna saat ini
  const { data: userSubmissions } = useCollection("tikrar_submissions", {
    filters: [{ column: "user_id", operator: "==", value: user?.id }],
  });

  const activeHalaqahId = userData?.tikrar_halaqah_id || DEFAULT_TIKRAR_HALAQAHS[0].id;
  const halaqah = useMemo(() => {
    return DEFAULT_TIKRAR_HALAQAHS.find((h) => h.id === activeHalaqahId) || DEFAULT_TIKRAR_HALAQAHS[0];
  }, [activeHalaqahId]);

  // Bangun 30 hari kalender terakhir
  const last30Days = useMemo(() => {
    const days: { date: Date; dateStr: string; dayOfWeek: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr,
        dayOfWeek: d.getDay(), // 0 = Ahad, 6 = Sabtu
      });
    }
    return days;
  }, []);

  // Hitung keaktifan pengguna saat ini dalam 30 hari
  const currentUserActivity = useMemo(() => {
    const logsMap = new Map<string, any>();
    if (userDailyLogs) {
      userDailyLogs.forEach((l: any) => logsMap.set(l.log_date, l));
    }

    const subMap = new Map<string, any>();
    if (userSubmissions) {
      userSubmissions.forEach((s: any) => {
        if (s.session_date) subMap.set(s.session_date, s);
        else if (s.verified_at) subMap.set(s.verified_at.split("T")[0], s);
      });
    }

    const pattern = last30Days.map((day) => {
      if (subMap.has(day.dateStr) && subMap.get(day.dateStr).status === "passed") {
        return 2; // Lolos Setoran Live Zoom
      }
      if (logsMap.has(day.dateStr)) {
        return 1; // Laporan 40x Tuntas
      }
      return 0; // Kosong
    });

    // Hitung hari aktif pekan ini (Senin s/d hari ini)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0-6
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysSinceMonday);
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

    let activeThisWeek = 0;
    last30Days.forEach((d, idx) => {
      if (d.dateStr >= startOfWeekStr && pattern[idx] > 0) {
        activeThisWeek++;
      }
    });

    // Hitung streak beruntun
    let currentStreak = 0;
    for (let i = pattern.length - 1; i >= 0; i--) {
      if (pattern[i] > 0) currentStreak++;
      else break;
    }

    return {
      id: user?.id || "current-user",
      name: userData?.username || user?.user_metadata?.full_name || "Anda",
      salutation: userData?.salutation || "Ukhti",
      streak: Math.max(currentStreak, Number(userData?.streak || 0)),
      points: Number(userData?.points || 120),
      activeDaysThisWeek: activeThisWeek,
      isCurrentUser: true,
      activityPattern: pattern,
    };
  }, [last30Days, userDailyLogs, userSubmissions, user, userData]);

  // Gabungkan user dengan teman se-halaqah
  const members = useMemo(() => {
    return [currentUserActivity, ...COHORT_CLASSMATES];
  }, [currentUserActivity]);

  return (
    <div className="space-y-6">
      {/* Header Info Halaqah & Aturan 5 Hari / Pekan */}
      <Card className="border border-[#800000]/20 bg-gradient-to-r from-[#800000]/5 via-white to-[#800000]/5 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-[#800000] px-2.5 py-0.5 rounded-full">
                  Group Accountability
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Wajib 5 Hari Aktif / Pekan
                </span>
              </div>

              <h3 className="text-xl font-bold font-headline text-foreground flex items-center gap-2">
                <span>{halaqah.icon}</span>
                <span>{halaqah.title}</span>
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Dipandu oleh <strong>{halaqah.musyrifah}</strong>. Seluruh anggota dalam kelompok jadwal ini saling memantau
                keaktifan repetisi harian dan bergiliran tasmi' di ruang Live Zoom.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {halaqah.zoom_link && (
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9"
                >
                  <a href={halaqah.zoom_link} target="_blank" rel="noopener noreferrer">
                    <Video className="w-3.5 h-3.5" />
                    Buka Zoom Sesi
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </Button>
              )}

              {halaqah.whatsapp_group_link && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 font-bold text-xs gap-1.5 h-9"
                >
                  <a href={halaqah.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Grup WA
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap Matrix Card */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/40 border-b p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold font-headline text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-[#800000]" />
                Grid Keaktifan 30 Hari Anggota Halaqah
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pantau konsistensi repetisi dan kelulusan setoran sesama thalibah.
              </p>
            </div>

            {/* Legend Kotak */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground bg-white px-3 py-1.5 rounded-lg border">
              <span className="font-semibold text-foreground">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-stone-200 border border-stone-300" />
                <span>Belum Lapor / Libur</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-emerald-600" />
                <span>Tuntas 40x</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-amber-500 shadow-2xs" />
                <span>Lolos Setoran Zoom</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4 overflow-x-auto">
          <div className="min-w-[680px] space-y-3">
            {members.map((member, idx) => {
              const isQuotaMet = member.activeDaysThisWeek >= 5;
              const isClose = member.activeDaysThisWeek === 4;

              return (
                <div
                  key={member.id}
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all",
                    member.isCurrentUser
                      ? "bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20 shadow-xs"
                      : "bg-card hover:bg-muted/40 border-border"
                  )}
                >
                  {/* Thalibah Info */}
                  <div className="w-52 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="font-bold text-xs text-foreground truncate">
                        {member.name} {member.isCurrentUser && <span className="text-[#800000]">(Anda)</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pl-6 mt-1">
                      {isQuotaMet ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                          ✓ 5/5 Hari Pekan Ini
                        </span>
                      ) : isClose ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          4/5 Hari Pekan Ini
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                          ⚠️ {member.activeDaysThisWeek}/5 Hari
                        </span>
                      )}

                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-amber-500" />
                        {member.streak} Hari
                      </span>
                    </div>
                  </div>

                  {/* 30 Days Grid Box Matrix */}
                  <div className="flex items-center gap-1.5 flex-1 justify-center">
                    {member.activityPattern.map((status, dayIdx) => {
                      const dayMeta = last30Days[dayIdx];
                      const isWeekend = dayMeta.dayOfWeek === 0 || dayMeta.dayOfWeek === 6;
                      const dateTitle = `${dayMeta.date.toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}: ${status === 2 ? "Lulus Setoran Live Zoom" : status === 1 ? "Tuntas 40x Repetisi" : isWeekend ? "Hari Libur / Toleransi" : "Belum Ada Laporan"}`;

                      return (
                        <div
                          key={dayIdx}
                          title={dateTitle}
                          className={cn(
                            "w-3.5 h-3.5 rounded-xs transition-transform hover:scale-125 cursor-help",
                            status === 2
                              ? "bg-amber-500 shadow-xs ring-1 ring-amber-600"
                              : status === 1
                              ? "bg-emerald-600"
                              : isWeekend
                              ? "bg-stone-100 border border-stone-200"
                              : "bg-stone-200"
                          )}
                        />
                      );
                    })}
                  </div>

                  {/* Poin Thalibah */}
                  <div className="w-24 text-right shrink-0">
                    <span className="font-black text-xs text-[#800000]">{member.points} Poin</span>
                    <p className="text-[9px] text-muted-foreground">Akumulasi</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground italic text-center pt-2">
            *Setiap thalibah wajib memenuhi kuota minimal 5 hari aktif tikrar per pekan. Akhir pekan (Sabtu & Ahad) dapat
            dimanfaatkan untuk toleransi murajaah dan setoran tambahan ke Musyrifah.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
