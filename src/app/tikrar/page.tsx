'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { TikrarSystem } from '@/components/tikrar/tikrar-system';
import { TikrarDailyReport } from '@/components/tikrar/tikrar-daily-report';
import { TikrarGroupHeatmap } from '@/components/tikrar/tikrar-group-heatmap';
import { TikrarSchedule } from '@/components/tikrar/tikrar-schedule';
import { HifzProgressChart } from '@/components/progress/hifz-progress-chart';
import { useDoc, useUser } from '@/db';

export default function TikrarPage() {
  const { user } = useUser();
  const { data: userData } = useDoc<any>(user?.id ? 'users' : null, user?.id);
  const fullSalutation = userData?.salutation || 'Ukhti';

  const [activeTab, setActiveTab] = useState<string>('daily-report');
  const [mushafTarget, setMushafTarget] = useState<{ page: number | null; juz: number | null }>({
    page: null,
    juz: null,
  });
  const [refreshSignal, setRefreshSignal] = useState<number>(0);

  const triggerGlobalRefresh = () => setRefreshSignal((n) => n + 1);

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
          Perkuat hafalan {fullSalutation} dengan target 1 Juz terukur, laporan repetisi 40x per
          blok, dan pemantauan keaktifan grup.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 h-auto sm:h-12 bg-muted/50 p-1 rounded-xl gap-1">
          <TabsTrigger
            value="daily-report"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" /> Laporan &amp; Grup
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <CalendarDays className="w-4 h-4 shrink-0" /> Target &amp; Jadwal
          </TabsTrigger>
          <TabsTrigger
            value="mushaf"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <BookOpen className="w-4 h-4 shrink-0" /> Mushaf &amp; Audio
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="font-bold gap-1.5 py-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all"
          >
            <BarChart3 className="w-4 h-4 shrink-0" /> Progres 30 Juz
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Laporan Harian 40x & Heatmap Grup (Fase 3) */}
        <TabsContent value="daily-report" className="space-y-6 outline-none">
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
        </TabsContent>

        {/* Tab 2: Pemilihan Target Mandiri & Generator Jadwal 5 Hari/Pekan (Fase 2) */}
        <TabsContent value="schedule" className="outline-none">
          <TikrarSchedule
            refreshSignal={refreshSignal}
            onScheduleSaved={() => {
              triggerGlobalRefresh();
              setActiveTab('daily-report');
            }}
            onJumpToDailyReport={() => setActiveTab('daily-report')}
          />
        </TabsContent>

        {/* Tab 3: Mushaf Per Kata, Audio 5x Simak & Gabungan Sub-Repetisi */}
        <TabsContent value="mushaf" className="outline-none">
          <TikrarSystem targetPage={mushafTarget.page} targetJuz={mushafTarget.juz} />
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
