
'use client';

import { SurahList } from "@/components/surah-list";
import { MushafPage } from "@/components/mushaf-page";
import { JuzList } from "@/components/juz-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, BookOpen, Layers, ListFilter } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function QuranPage() {
  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mt-4 px-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-600 mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">Hi Tilawah</span>
        </div>
        <h1 className="text-4xl font-black font-headline tracking-tight text-slate-900 uppercase">Al-Qur'anul Karim</h1>
        <p className="text-muted-foreground text-sm font-medium">Baca dan tadabburi ayat-ayat suci Al-Qur'an dengan nyaman.</p>
      </div>

      <Tabs defaultValue="surah" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-emerald-50 p-1 rounded-2xl border border-emerald-100 shadow-sm">
          <TabsTrigger value="surah" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-xl transition-all">
            <Layers className="w-3.5 h-3.5" /> Surat
          </TabsTrigger>
          <TabsTrigger value="juz" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-xl transition-all">
            <ListFilter className="w-3.5 h-3.5" /> Juz
          </TabsTrigger>
          <TabsTrigger value="mushaf" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-xl transition-all">
            <BookOpen className="w-3.5 h-3.5" /> Mushaf
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-black font-headline text-slate-800 uppercase tracking-tight">Daftar Surat</h2>
              <Badge variant="outline" className="text-[10px] font-black text-emerald-600 border-emerald-200 bg-emerald-50 h-6 px-3">114 SURAT</Badge>
            </div>
            <SurahList baseUrl="/tilawah" />
          </div>
        </TabsContent>

        <TabsContent value="juz" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-black font-headline text-slate-800 uppercase tracking-tight">Daftar Juz</h2>
              <Badge variant="outline" className="text-[10px] font-black text-emerald-600 border-emerald-200 bg-emerald-50 h-6 px-3">30 JUZ</Badge>
            </div>
            <JuzList baseUrl="/tilawah" variant="tilawah" />
          </div>
        </TabsContent>
        
        <TabsContent value="mushaf" className="focus-visible:outline-none">
          <MushafPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
