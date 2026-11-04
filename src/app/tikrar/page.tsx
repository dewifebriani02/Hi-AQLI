'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { TikrarSystem } from '@/components/tikrar/tikrar-system';
import { TikrarDailyReport } from '@/components/tikrar/tikrar-daily-report';
import { TikrarGroupHeatmap } from '@/components/tikrar/tikrar-group-heatmap';
import { TikrarSchedule } from '@/components/tikrar/tikrar-schedule';
import { HifzProgressChart } from '@/components/progress/hifz-progress-chart';
import { useDoc, useUser, useCollection } from '@/db';
import { getJuzPageRange } from '@/lib/tikrar-schedule-generator';

export default function TikrarPage() {
  const { user, isUserLoading } = useUser();
  const { data: userData, refresh: refreshUser } = useDoc<any>(user?.id ? 'users' : null, user?.id);
  const fullSalutation = userData?.salutation || 'Ukhti';

  const [activeTab, setActiveTab] = useState<string>('mushaf');
  const [mushafTarget, setMushafTarget] = useState<{
    page: number | null;
    juz: number | null;
    timestamp?: number;
  }>({
    page: null,
    juz: null,
  });
  const [refreshSignal, setRefreshSignal] = useState<number>(0);

  const triggerGlobalRefresh = () => setRefreshSignal((n) => n + 1);

  // Target aktif default dari user data / jadwal
  const userActiveJuz = useMemo(() => {
    const raw = Number(userData?.paidJuz ?? userData?.paid_juz);
    return raw >= 1 && raw <= 30 ? raw : 30;
  }, [userData]);

  const userActivePage = useMemo(() => {
    const range = getJuzPageRange(userActiveJuz);
    if (typeof window !== "undefined") {
      const localPage = Number(localStorage.getItem("aqli_tikrar_last_page"));
      const localJuz = Number(localStorage.getItem("aqli_tikrar_last_juz"));
      if (
        localPage >= range.startPage &&
        localPage <= range.endPage &&
        (!localJuz || localJuz === userActiveJuz)
      ) {
        return localPage;
      }
    }
    const curr = Number(userData?.tikrar_current_page);
    if (curr >= range.startPage && curr <= range.endPage) return curr;
    return range.startPage;
  }, [userActiveJuz, userData?.tikrar_current_page]);

  // Periksa apakah peserta sudah memiliki jadwal belajar Tikrar tersimpan di database
  const schedulesOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    }),
    [user?.id]
  );
  const {
    data: userSchedules,
    isLoading: isSchedulesLoading,
    refresh: refreshSchedules,
  } = useCollection<any>(user?.id ? 'tikrar_user_schedules' : null, schedulesOptions);

  useEffect(() => {
    if (refreshSignal > 0 && user?.id) {
      refreshUser();
      refreshSchedules();
    }
  }, [refreshSignal, user?.id, refreshUser, refreshSchedules]);

  const hasExistingSchedule = useMemo(() => {
    if (!user?.id) return false;
    if (userSchedules && userSchedules.length > 0) return true;
    if (userData?.tikrar_target_duration_months && userData?.tikrar_start_date) return true;
    return false;
  }, [user?.id, userSchedules, userData]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-32">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">
            Hi Tikrar • Pusat Itqan HI AQLI
          </span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Metode Tikrar</h1>
        <p className="text-muted-foreground text-sm">
          Perkuat hafalan {fullSalutation} dengan mushaf sub-blok berurutan, penggabungan antar
          blok, laporan harian terpadu, dan pemantauan keaktifan grup.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 h-auto sm:h-12 bg-muted/50 p-1 rounded-xl gap-1">
          <TabsTrigger
            value="mushaf"
            onClick={() => {
              if (userActivePage && userActiveJuz) {
                setMushafTarget({
                  page: userActivePage,
                  juz: userActiveJuz,
                  timestamp: Date.now(),
                });
              }
            }}
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <BookOpen className="w-4 h-4 shrink-0" /> Mushaf &amp; Audio
          </TabsTrigger>
          <TabsTrigger
            value="daily-report"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <Users className="w-4 h-4 shrink-0" /> Rekap &amp; Grup
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all relative"
          >
            <CalendarDays className="w-4 h-4 shrink-0" /> Target &amp; Jadwal
            {user && !hasExistingSchedule && !isSchedulesLoading && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black bg-amber-400 text-stone-950 rounded-full animate-pulse">
                Pengaturan
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <BarChart3 className="w-4 h-4 shrink-0" /> Progres 30 Juz
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Mushaf Per Kata, Audio 5x Simak, Gabungan Sub-Repetisi & Auto-Sync Laporan */}
        <TabsContent value="mushaf" className="outline-none space-y-4">
          {user && !hasExistingSchedule && !isSchedulesLoading && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-amber-900" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                    Jadwal Belajar Belum Disimpan
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Afwan {fullSalutation}, tentukan target Juz &amp; hari aktif di tab <strong>Target &amp; Jadwal</strong> agar hafalan terjadwal rapi, atau Ukhti tetap dapat langsung berlatih di bawah.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('schedule')}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0 shadow-sm"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Atur Jadwal
              </Button>
            </div>
          )}
          <TikrarSystem
            targetPage={mushafTarget.page}
            targetJuz={mushafTarget.juz}
            targetTimestamp={mushafTarget.timestamp}
            refreshSignal={refreshSignal}
            onDataChanged={triggerGlobalRefresh}
            onOpenScheduleTab={() => setActiveTab('schedule')}
            onOpenGroupRecapTab={() => setActiveTab('daily-report')}
          />
        </TabsContent>

        {/* Tab 2: Rekap Pribadi Ringkas & Leaderboard/Heatmap Grup 30 Hari */}
        <TabsContent value="daily-report" className="space-y-6 outline-none">
          {user && !hasExistingSchedule && !isSchedulesLoading && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-amber-900" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                    Target Jadwal Belum Ditetapkan
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Simpan jadwal harian di tab Target &amp; Jadwal untuk menghubungkan target pekanan dengan kalender.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('schedule')}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Atur Jadwal Sekarang
              </Button>
            </div>
          )}
          <TikrarDailyReport
            refreshSignal={refreshSignal}
            onDataChanged={triggerGlobalRefresh}
            onOpenScheduleTab={() => setActiveTab('schedule')}
            onOpenMushafTab={(page, juz) => {
              setMushafTarget({ page, juz, timestamp: Date.now() });
              setActiveTab('mushaf');
            }}
          />
          <TikrarGroupHeatmap refreshSignal={refreshSignal} />
        </TabsContent>

        {/* Tab 3: Pemilihan Target Mandiri & Generator Jadwal (Fase 2) */}
        <TabsContent value="schedule" className="outline-none">
          {user && !hasExistingSchedule && !isSchedulesLoading && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 p-4 sm:p-5 rounded-2xl shadow-md flex items-center gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-stone-950" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  Langkah Awal: Buat Jadwal Belajar {fullSalutation}
                </h4>
                <p className="text-xs font-semibold text-stone-900 leading-relaxed">
                  Silakan tentukan 1 Juz target hafalan dan kecepatan belajar di bawah, lalu klik tombol <strong>&quot;Simpan Target &amp; Generate Jadwal&quot;</strong> untuk membuka mushaf dan memulai latihan.
                </p>
              </div>
            </div>
          )}
          <TikrarSchedule
            refreshSignal={refreshSignal}
            onScheduleSaved={(target) => {
              triggerGlobalRefresh();
              refreshSchedules();
              refreshUser();
              if (target?.page) {
                setMushafTarget({ page: target.page, juz: target.juz || null, timestamp: Date.now() });
              }
              setActiveTab('mushaf');
            }}
            onOpenMushafTarget={(target) => {
              if (target?.page) {
                setMushafTarget({ page: target.page, juz: target.juz || null, timestamp: Date.now() });
              }
              setActiveTab('mushaf');
            }}
            onJumpToDailyReport={() => {
              if (userActivePage && userActiveJuz) {
                setMushafTarget({ page: userActivePage, juz: userActiveJuz, timestamp: Date.now() });
              }
              setActiveTab('mushaf');
            }}
          />
        </TabsContent>

        {/* Tab 4: Progres 30 Juz & Kuis Teori Tajwid */}
        <TabsContent value="progress" className="space-y-8 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-8">
              <Card className="border-none shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-[#800000]/5 border-b border-[#800000]/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#D4AF37]" />
                    <CardTitle className="text-lg font-headline">
                      Pencapaian Tikrar 30 Juz
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-8">
                  <HifzProgressChart />
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-4">
              <Card className="border-[#800000]/10 shadow-lg sticky top-24">
                <CardHeader className="bg-[#800000] text-white">
                  <CardTitle className="text-lg font-headline">Uji Teori Tajwid</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Periksa pemahaman teori {fullSalutation} sebelum praktek ujian lisan.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-12"
                  >
                    <Link href="/tikrar/quiz">Mulai Kuis Teori</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
