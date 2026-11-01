'use client';

import { getCallSign } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RotateCcw, 
  Layers,
  BarChart3,
  Trophy,
  CalendarDays,
  Users,
} from "lucide-react";
import Link from "next/link";
import { TikrarSystem } from "@/components/tikrar/tikrar-system";
import { HifzProgressChart } from "@/components/progress/hifz-progress-chart";
import { TikrarSchedule } from "@/components/tikrar/tikrar-schedule";
import { TikrarActiveHalaqahBanner } from "@/components/tikrar/tikrar-active-halaqah-banner";
import { TikrarDailyReportCard } from "@/components/tikrar/tikrar-daily-report-card";
import { TikrarGroupHeatmap } from "@/components/tikrar/tikrar-group-heatmap";
import { useUser, useDoc } from "@/db";

export default function TikrarPage() {
  const { user } = useUser();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);
  const fullSalutation = userData?.salutation || "Ukhti";
  const currentJuz = Number(userData?.paid_juz ?? userData?.paidJuz) || 30;
  const currentPage = Number(userData?.tikrar_current_page) || 582;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-32">
      {/* Header Halaman Tikrar */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">
            Hi Tikrar • Pusat Itqan HI AQLI
          </span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Metode Tikrar</h1>
        <p className="text-muted-foreground text-sm">
          Perkuat hafalan {fullSalutation} dengan metode repetisi 40x terstruktur, komitmen 5 hari/pekan, pemantauan keaktifan grup, dan setoran tatap muka langsung via Live Zoom.
        </p>
      </div>

      {/* Banner Sesi Halaqah Live Zoom & Target Mandiri */}
      <TikrarActiveHalaqahBanner />

      {/* Tab Navigasi Utama */}
      <Tabs defaultValue="tikrar-daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-8 h-auto sm:h-12 bg-muted/50 p-1 rounded-xl gap-1">
          <TabsTrigger
            value="tikrar-daily"
            className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all py-2 sm:py-0"
          >
            <Layers className="w-4 h-4 hidden sm:block" /> Tikrar Daily
          </TabsTrigger>
          <TabsTrigger
            value="group-activity"
            className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all py-2 sm:py-0"
          >
            <Users className="w-4 h-4 hidden sm:block" /> Keaktifan Grup
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all py-2 sm:py-0"
          >
            <CalendarDays className="w-4 h-4 hidden sm:block" /> Jadwal Saya
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all py-2 sm:py-0"
          >
            <BarChart3 className="w-4 h-4 hidden sm:block" /> Progres
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Tikrar Daily + Laporan Harian Repetisi 40x */}
        <TabsContent
          value="tikrar-daily"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none"
        >
          <TikrarDailyReportCard currentPage={currentPage} currentJuz={currentJuz} />
          <TikrarSystem />
        </TabsContent>

        {/* Tab 2: GitHub-Style Group Activity Heatmap */}
        <TabsContent
          value="group-activity"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none"
        >
          <TikrarGroupHeatmap />
        </TabsContent>

        {/* Tab 3: Jadwal Saya */}
        <TabsContent
          value="schedule"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none"
        >
          <TikrarSchedule />
        </TabsContent>

        {/* Tab 4: Progres & Uji Tajwid */}
        <TabsContent
          value="progress"
          className="space-y-8 animate-in fade-in slide-in-from-bottom-2 outline-none"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-8">
              <Card className="border-none shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-[#800000]/5 border-b border-[#800000]/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#D4AF37]" />
                    <CardTitle className="text-lg font-headline">Pencapaian Tikrar 30 Juz</CardTitle>
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
                    Periksa pemahaman teori tajwid {fullSalutation} sebelum praktek ujian lisan bersama Musyrifah.
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
