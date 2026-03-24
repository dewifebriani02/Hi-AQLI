
'use client';

import { SurahList } from "@/components/surah-list";
import { MushafPage } from "@/components/mushaf-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function QuranPage() {
  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
        <p className="text-muted-foreground text-sm">Baca, pelajari, dan latih tilawah Ukhti dengan bantuan AI.</p>
      </div>

      <Tabs defaultValue="surah" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="surah" className="font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-[#800000] rounded-lg transition-all">
            <Layers className="w-4 h-4" /> Daftar Surat
          </TabsTrigger>
          <TabsTrigger value="mushaf" className="font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-[#800000] rounded-lg transition-all">
            <BookOpen className="w-4 h-4" /> Mode Mushaf
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          {/* AI Assistant Banner */}
          <Card className="bg-[#800000] text-white border-none shadow-lg overflow-hidden relative group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
              <Mic className="w-32 h-32" />
            </div>
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <h3 className="font-bold text-xl">Asisten AI Tilawah</h3>
                <p className="text-sm opacity-90 max-w-xs leading-relaxed">
                  Dapatkan umpan balik langsung untuk akurasi dan kelancaran bacaan Ukhti.
                </p>
              </div>
              <Button asChild variant="secondary" size="lg" className="font-bold shadow-md w-full sm:w-auto text-[#800000] bg-white hover:bg-white/90">
                <Link href="/tilawah/ai-assistant">Buka Asisten AI</Link>
              </Button>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold font-headline">Daftar Surat</h2>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">114 Surat</span>
            </div>
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
