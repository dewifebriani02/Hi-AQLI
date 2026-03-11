
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  RotateCcw, 
  Layers,
  BarChart3,
  Trophy,
  CalendarDays
} from "lucide-react";
import Link from "next/link";
import { TikrarSystem } from "@/components/tikrar-system";
import { ProgressClient } from "@/components/progress-client";
import { HifzProgressChart } from "@/components/hifz-progress-chart";
import { TikrarSchedule } from "@/components/tikrar-schedule";

const tajweedRules = [
  {
    title: "Nun Sakinah dan Tanwin",
    category: "Artikulasi",
    content: "Aturan yang mengatur pengucapan Nun tanpa harakat (نْ) atau Tanwin (ـًـــٍـــٌ) ketika diikuti oleh huruf-huruf tertentu. Ini termasuk Izhar (jelas), Idgham (melebur), Iqlab (mengubah), dan Ikhfa (menyembunyikan).",
  },
  {
    title: "Mim Sakinah",
    category: "Artikulasi",
    content: "Aturan untuk Mim tanpa harakat (مْ). Ini termasuk Ikhfa Syafawi (menyembunyikan), Idgham Syafawi (melebur), dan Izhar Syafawi (jelas), tergantung pada huruf yang mengikutinya.",
  },
  {
    title: "Qalqalah",
    category: "Pantulan",
    content: "Suara memantul atau bergetar yang dibuat pada huruf-huruf tertentu (ق ط b ج d) ketika mereka memiliki sukun. Ada berbagai tingkat Qalqalah tergantung pada posisi huruf dalam kata.",
  },
  {
    title: "Madd (Panjang)",
    category: "Vokal",
    content: "Perpanjangan suara vokal. Ada banyak jenis, seperti Madd Asli (madd alami) dan Madd Far'i (madd sekunder), masing-masing dengan aturan khusus untuk panjangnya.",
  },
];

export default function HafalanPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Metode Tikrar Al-Qur'an</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Hafalan & Tikrar</h1>
        <p className="text-muted-foreground text-sm">
          Gunakan Tikrar Daily untuk memperkuat hafalan melalui repetisi dan pantau jadwal personal Anda.
        </p>
      </div>

      <Tabs defaultValue="tikrar-daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="tikrar-daily" className="font-bold gap-2 data-[state=active]:text-[#800000] rounded-lg">
            <Layers className="w-4 h-4" /> Tikrar Daily
          </TabsTrigger>
          <TabsTrigger value="schedule" className="font-bold gap-2 data-[state=active]:text-[#800000] rounded-lg">
            <CalendarDays className="w-4 h-4" /> Jadwal Saya
          </TabsTrigger>
          <TabsTrigger value="progress" className="font-bold gap-2 data-[state=active]:text-[#800000] rounded-lg">
            <BarChart3 className="w-4 h-4" /> Progres
          </TabsTrigger>
        </TabsList>

        {/* SYSTEM TIKRAR DAILY TAB */}
        <TabsContent value="tikrar-daily" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TikrarSystem />
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TikrarSchedule />
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-8">
              {/* 30 JUZ RADIAL PROGRESS */}
              <Card className="border-none shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-[#800000]/5 border-b border-[#800000]/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#D4AF37]" />
                    <CardTitle className="text-lg font-headline">Pencapaian Hafalan 30 Juz</CardTitle>
                  </div>
                  <CardDescription>Visualisasi perkembangan hafalan Anda dari Juz 1 hingga 30.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                  <HifzProgressChart />
                </CardContent>
              </Card>

              {/* RECITATION ACCURACY LINE CHART */}
              <Card className="border-none shadow-md bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-lg font-headline">Statistik Akurasi Tilawah</CardTitle>
                  <CardDescription>Ringkasan skor akurasi dari asisten AI dalam 6 bulan terakhir.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressClient />
                </CardContent>
              </Card>

              {/* TAJWEED REFERENCE ACCORDION */}
              <Accordion type="single" collapsible className="w-full">
                <div className="px-1 mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Referensi Tajwid</h3>
                </div>
                {tajweedRules.map((rule, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="border-b border-[#800000]/10">
                    <AccordionTrigger className="text-lg font-headline hover:no-underline py-6">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center text-xs font-bold">{index + 1}</span>
                        {rule.title}
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#800000] border-[#800000]/20">{rule.category}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground leading-relaxed pl-12 pb-6">
                      {rule.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            
            <div className="md:col-span-4">
              <Card className="border-[#800000]/10 shadow-lg sticky top-24">
                <CardHeader className="bg-[#800000]/5">
                  <CardTitle className="text-lg font-headline text-[#800000]">Uji Pengetahuan</CardTitle>
                  <CardDescription>Ikuti kuis untuk memeriksa pemahaman Anda tentang aturan Tajwid.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Kuis adalah cara yang bagus untuk memperkuat pembelajaran. Tantang diri Anda setelah meninjau modul.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold">
                    <Link href="/tajweed-quiz">Mulai Kuis</Link>
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
