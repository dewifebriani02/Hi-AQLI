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

export default function TikrarPage() {
  const { user, isUserLoading } = useUser();
  const { data: userData, refresh: refreshUser } = useDoc<any>(user?.id ? 'users' : null, user?.id);
  const fullSalutation = userData?.salutation || 'Ukhti';

  const [activeTab, setActiveTab] = useState<string>('mushaf');
  const [mushafTarget, setMushafTarget] = useState<{ page: number | null; juz: number | null }>({
    page: null,
    juz: null,
  });
  const [refreshSignal, setRefreshSignal] = useState<number>(0);

  const triggerGlobalRefresh = () => setRefreshSignal((n) => n + 1);

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

  // Alur Wajib Isi Jadwal: Jika thalibah belum memiliki jadwal, otomatis arahkan langsung ke tab schedule
  const [hasInitializedTab, setHasInitializedTab] = useState(false);
  useEffect(() => {
    if (isUserLoading) return;
    if (user && isSchedulesLoading) return;

    if (!hasInitializedTab) {
      if (user && !hasExistingSchedule) {
        setActiveTab('schedule');
      }
      setHasInitializedTab(true);
    }
  }, [user, isUserLoading, isSchedulesLoading, hasExistingSchedule, hasInitializedTab]);

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
                Wajib Diisi
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

        {/* Tab 1: Mushaf Per Kata, Audio 5x Simak, Gabungan Sub-Repetisi & Panel Kirim Laporan Harian */}
        <TabsContent value="mushaf" className="outline-none">
          {user && !hasExistingSchedule && !isSchedulesLoading ? (
            <Card className="border-2 border-[#800000] bg-[#fdfbf7] p-8 sm:p-12 text-center rounded-3xl shadow-lg my-2 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#800000]/10 text-[#800000] mx-auto flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-[#800000]" />
              </div>
              <Badge className="bg-[#D4AF37] text-stone-950 font-black text-[11px] px-3.5 py-1 mb-3 uppercase tracking-wider">
                Langkah Wajib Pertama
              </Badge>
              <h3 className="text-2xl font-headline font-black text-stone-900 mb-2">
                Tentukan Target &amp; Jadwal Belajar Terlebih Dahulu
              </h3>
              <p className="text-sm text-stone-600 max-w-lg mx-auto mb-6 leading-relaxed">
                Afwan {fullSalutation}, seluruh thalibah yang mengambil program Tikrar diwajibkan menentukan <strong>Target Juz</strong>, <strong>Hari Aktif per Pekan</strong>, dan <strong>Kecepatan Belajar</strong> di tab <strong>Target &amp; Jadwal</strong> terlebih dahulu agar hafalan terjadwal secara terstruktur.
              </p>
              <Button
                onClick={() => setActiveTab('schedule')}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-sm h-12 px-8 rounded-xl shadow-md transition-all hover:scale-105"
              >
                <CalendarDays className="w-4 h-4 mr-2" /> Buka Tab Target &amp; Jadwal Sekarang
              </Button>
            </Card>
          ) : (
            <TikrarSystem
              targetPage={mushafTarget.page}
              targetJuz={mushafTarget.juz}
              refreshSignal={refreshSignal}
              onDataChanged={triggerGlobalRefresh}
              onOpenScheduleTab={() => setActiveTab('schedule')}
              onOpenGroupRecapTab={() => setActiveTab('daily-report')}
            />
          )}
        </TabsContent>

        {/* Tab 2: Rekap Pribadi Ringkas & Leaderboard/Heatmap Grup 30 Hari */}
        <TabsContent value="daily-report" className="space-y-6 outline-none">
          {user && !hasExistingSchedule && !isSchedulesLoading ? (
            <Card className="border-2 border-stone-200 bg-white p-8 text-center rounded-3xl shadow-sm max-w-xl mx-auto">
              <Users className="w-12 h-12 text-stone-400 mx-auto mb-3" />
              <h3 className="text-xl font-headline font-black text-stone-800 mb-1">
                Rekap &amp; Heatmap Belum Aktif
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-5 leading-relaxed">
                Rekap kemajuan hafalan dan keaktifan grup akan aktif secara otomatis setelah {fullSalutation} menentukan jadwal belajar.
              </p>
              <Button
                onClick={() => setActiveTab('schedule')}
                className="bg-[#800000] text-white font-bold text-xs h-10 px-6 rounded-xl"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Atur Jadwal Sekarang
              </Button>
            </Card>
          ) : (
            <>
              <TikrarDailyReport
                refreshSignal={refreshSignal}
                onDataChanged={triggerGlobalRefresh}
                onOpenScheduleTab={() => setActiveTab('schedule')}
                onOpenMushafTab={(page, juz) => {
                  setMushafTarget({ page, juz });
                  setActiveTab('mushaf');
                }}
              />
              <TikrarGroupHeatmap refreshSignal={refreshSignal} />
            </>
          )}
        </TabsContent>

        {/* Tab 3: Pemilihan Target Mandiri & Generator Jadwal 5 Hari/Pekan (Fase 2) */}
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
                  Silakan tentukan 1 Juz target hafalan dan kecepatan belajar di bawah, lalu klik tombol <strong>&quot;Buat &amp; Simpan Jadwal Harian&quot;</strong> untuk membuka mushaf dan memulai latihan.
                </p>
              </div>
            </div>
          )}
          <TikrarSchedule
            refreshSignal={refreshSignal}
            onScheduleSaved={() => {
              triggerGlobalRefresh();
              refreshSchedules();
              refreshUser();
              setActiveTab('mushaf');
            }}
            onJumpToDailyReport={() => setActiveTab('mushaf')}
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
