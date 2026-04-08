
'use client';

import { SurahList } from "@/components/tilawah/surah-list";
import { MushafPage } from "@/components/tilawah/mushaf-page";
import { JuzList } from "@/components/tilawah/juz-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, BookOpen, Layers, ListFilter } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { checkIsStudent } from "@/lib/access-control";

export default function QuranPage() {
  const { user } = useUser();
  const { data: registrations } = useCollection("halaqah_registrations", user?.id ? {
    filters: [{ column: 'user_id', operator: '==', value: user.id }]
  } : undefined);

  const isStudent = useMemo(() => checkIsStudent(registrations), [registrations]);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mt-4 px-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest text-[#800000]">Hi Tilawah</span>
        </div>
        <h1 className="text-4xl font-black font-headline tracking-tight text-[#800000] uppercase">Al-Qur'anul Karim</h1>
        <p className="text-muted-foreground text-sm font-medium">Baca dan tadabburi ayat-ayat suci Al-Qur'an dengan nyaman.</p>
      </div>

      <Tabs defaultValue="surah" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-[#800000]/5 p-1 rounded-2xl border border-[#800000]/10 shadow-sm">
          <TabsTrigger value="surah" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-[#800000] data-[state=active]:shadow-sm rounded-xl transition-all">
            <Layers className="w-3.5 h-3.5" /> Surat
          </TabsTrigger>
          <TabsTrigger value="juz" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-[#800000] data-[state=active]:shadow-sm rounded-xl transition-all">
            <ListFilter className="w-3.5 h-3.5" /> Juz
          </TabsTrigger>
          <TabsTrigger value="mushaf" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:text-[#800000] data-[state=active]:shadow-sm rounded-xl transition-all">
            <BookOpen className="w-3.5 h-3.5" /> Mushaf
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-black font-headline text-slate-800 uppercase tracking-tight">Daftar Surat</h2>
              <Badge variant="outline" className="text-[10px] font-black text-[#800000] border-[#800000]/20 bg-[#800000]/5 h-6 px-3 uppercase">114 SURAT</Badge>
            </div>
            <SurahList baseUrl="/tilawah" isStudent={isStudent} />
          </div>
        </TabsContent>

        <TabsContent value="juz" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-black font-headline text-slate-800 uppercase tracking-tight">Daftar Juz</h2>
              <Badge variant="outline" className="text-[10px] font-black text-[#800000] border-[#800000]/20 bg-[#800000]/5 h-6 px-3 uppercase">30 JUZ</Badge>
            </div>
            <JuzList baseUrl="/tilawah" variant="tilawah" isStudent={isStudent} />
          </div>
        </TabsContent>
        
        <TabsContent value="mushaf" className="focus-visible:outline-none">
          <MushafPage isStudent={isStudent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
