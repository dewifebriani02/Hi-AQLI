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
  CalendarDays,
  Target
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
    content: "Suara memantul atau bergetar yang dibuat pada huruf-huruf tertentu (ق ط ب ج d) ketika mereka memiliki sukun.",
  },
];

export default function HafalPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Hafal • Pusat Itqan HI AQLI</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Metode Tikrar</h1>
        <p className="text-muted-foreground text-sm">
          Perkuat hafalan Anda dengan metode repetisi 40x terstruktur untuk hasil Itqan.
        </p>
      </div>

      <Tabs defaultValue="tikrar-daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="tikrar-daily" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all">
            <Layers className="w-4 h-4 hidden sm:block" /> Tikrar Daily
          </TabsTrigger>
          <TabsTrigger value="schedule" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all">
            <CalendarDays className="w-4 h-4 hidden sm:block" /> Jadwal Saya
          </TabsTrigger>
          <TabsTrigger value="progress" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg text-xs transition-all">
            <BarChart3 className="w-4 h-4 hidden sm:block" /> Progres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tikrar-daily" className="animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
          <TikrarSystem />
        </TabsContent>

        <TabsContent value="schedule" className="animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
          <TikrarSchedule />
        </TabsContent>

        <TabsContent value="progress" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-8">
              <Card className="border-none shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-[#800000]/5 border-b border-[#800000]/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#D4AF37]" />
                    <CardTitle className="text-lg font-headline">Pencapaian Hafalan 30 Juz</CardTitle>
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
                  <p className="text-sm text-muted-foreground leading-relaxed">Periksa pemahaman teori Anda sebelum praktek ujian lisan.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-12">
                    <Link href="/hafal/quiz">Mulai Kuis Teori</Link>
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
