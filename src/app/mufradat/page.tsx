'use client';

import { SurahList } from "@/components/surah-list";
import { MushafPage } from "@/components/mushaf-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MufradatPage() {
  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Mufradat • Mushaf & Terjemahan</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
        <p className="text-muted-foreground text-sm">Pelajari setiap kata dan maknai setiap ayat dalam Mushaf HI AQLI.</p>
      </div>

      <Tabs defaultValue="surah" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="surah" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <Layers className="w-4 h-4" /> Daftar Surat
          </TabsTrigger>
          <TabsTrigger value="mushaf" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <BookOpen className="w-4 h-4" /> Mode Mushaf
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <SurahList />
          </div>
        </TabsContent>
        
        <TabsContent value="mushaf" className="focus-visible:outline-none">
          <MushafPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
