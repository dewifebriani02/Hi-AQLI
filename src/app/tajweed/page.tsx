
'use client';

import { useState } from "react";
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
  CheckCircle2, 
  Calendar, 
  Zap, 
  Plus, 
  Trophy,
  History,
  Timer
} from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
    content: "Suara memantul atau bergetar yang dibuat pada huruf-huruf tertentu (ق ط b ج د) ketika mereka memiliki sukun. Ada berbagai tingkat Qalqalah tergantung pada posisi huruf dalam kata.",
  },
  {
    title: "Madd (Panjang)",
    category: "Vokal",
    content: "Perpanjangan suara vokal. Ada banyak jenis, seperti Madd Asli (madd alami) dan Madd Far'i (madd sekunder), masing-masing dengan aturan khusus untuk panjangnya.",
  },
];

const dailyTikrar = [
  { id: 1, task: "Ulangi Makharij Al-Huruf (Tenggorokan)", count: 20, completed: false },
  { id: 2, task: "Praktik Idgham Bighunnah (5 Ayat)", count: 10, completed: true },
  { id: 3, task: "Hafalan Aturan Madd Thabi'i", count: 15, completed: false },
];

export default function TajweedPage() {
  const [tikrarCount, setTikrarCount] = useState(0);
  const [activeTab, setActiveTab] = useState("theory");

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Tajwid & Tikrar</h1>
        <p className="text-muted-foreground text-sm">
          Kuasai teori Tajwid dan perkuat ingatan Anda melalui metode repetisi harian (Tikrar).
        </p>
      </div>

      <Tabs defaultValue="theory" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="theory" className="font-bold gap-2 data-[state=active]:text-[#800000] rounded-lg">
            <BookOpen className="w-4 h-4" /> Materi & Hukum
          </TabsTrigger>
          <TabsTrigger value="tikrar" className="font-bold gap-2 data-[state=active]:text-[#800000] rounded-lg">
            <RotateCcw className="w-4 h-4" /> Tikrar Daily
          </TabsTrigger>
        </TabsList>

        {/* THEORY TAB */}
        <TabsContent value="theory" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8">
              <Accordion type="single" collapsible className="w-full">
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
              <Card className="border-[#800000]/10 shadow-lg">
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

        {/* TIKRAR TAB */}
        <TabsContent value="tikrar" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Daily Goal Card */}
          <Card className="bg-gradient-to-br from-[#800000] to-[#b30000] text-white border-none shadow-xl overflow-hidden relative">
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <RotateCcw className="w-48 h-48" />
            </div>
            <CardContent className="p-8 relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-headline">Misi Tikrar Hari Ini</h3>
                  <p className="text-xs text-white/70">Senin, 24 Februari 2025</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span>Progres Harian</span>
                  <span>65%</span>
                </div>
                <Progress value={65} className="h-2 bg-white/20 [&>div]:bg-white" />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#800000] bg-white/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-white/80" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase">3 Tantangan Berhadiah Aktif</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Checklist Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Daftar Tugas</h3>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1"><Plus className="w-3 h-3" /> Tambah</Button>
              </div>
              <div className="space-y-3">
                {dailyTikrar.map((item) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "p-4 rounded-xl border flex items-center justify-between gap-4 transition-all cursor-pointer group",
                      item.completed ? "bg-emerald-50/50 border-emerald-100" : "bg-white hover:border-[#800000]/30 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center transition-colors",
                        item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-muted-foreground/30"
                      )}>
                        {item.completed && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-bold", item.completed && "line-through text-muted-foreground")}>{item.task}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{item.count} Repetisi Target</span>
                      </div>
                    </div>
                    <Badge variant="ghost" className="text-[9px] font-bold group-hover:bg-[#800000]/10">DETAIL</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Counter Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000] px-1">Tasbih Tikrar Digital</h3>
              <Card className="border-none shadow-md bg-[#fffcf5] flex flex-col items-center justify-center p-8 text-center gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Klik untuk Menghitung</p>
                  <div className="text-7xl font-mono font-black text-[#800000] drop-shadow-sm">{tikrarCount}</div>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={() => setTikrarCount(prev => prev + 1)}
                  className="w-32 h-32 rounded-full bg-[#800000] hover:bg-[#800000]/90 shadow-2xl active:scale-95 transition-all text-white font-bold text-xl flex flex-col gap-1 border-8 border-white"
                >
                  <RotateCcw className="w-8 h-8" />
                  <span>TIKRAR</span>
                </Button>

                <div className="flex gap-2 w-full pt-4">
                  <Button variant="outline" size="sm" onClick={() => setTikrarCount(0)} className="flex-1 font-bold gap-2">
                    <History className="w-4 h-4" /> Reset
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 font-bold gap-2">
                    <Timer className="w-4 h-4" /> Simpan
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Calendar Streak */}
          <div className="space-y-4 pt-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000] px-1">Konsistensi Tikrar</h3>
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between overflow-x-auto no-scrollbar">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'].map((day, idx) => (
                <div key={day} className="flex flex-col items-center gap-3 shrink-0 px-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{day}</span>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                    idx < 3 ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : 
                    idx === 3 ? "border-[#800000] bg-[#800000]/5 text-[#800000] animate-pulse" : "border-muted text-muted-foreground"
                  )}>
                    {idx < 3 ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{24 + idx}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
