'use client';

import { SurahList } from "@/components/surah-list";
import { Button } from "@/components/ui/button";
import { BookOpen, Layers, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JuzList } from "@/components/juz-list";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { useMemo } from "react";

export default function MufradatPage() {
  const { user, isUserLoading } = useUser();

  // Fetch all passed attempts for the current user
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'isPassed', operator: '==', value: true }
    ]
  }), [user?.id]);

  const { data: progress, isLoading: isProgressLoading } = useCollection(
    "quiz_attempts", 
    user ? progressOptions : undefined
  );

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Kurikulum...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Mufradat • Daftar Surat & Juz</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
        <p className="text-muted-foreground text-sm">Pelajari setiap kata dan maknai setiap ayat dalam Mushaf HI AQLI.</p>
      </div>

      <Tabs defaultValue="surah" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="surah" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <Layers className="w-4 h-4" /> Daftar Surat
          </TabsTrigger>
          <TabsTrigger value="juz" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <BookOpen className="w-4 h-4" /> Daftar Juz
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <SurahList baseUrl="/mufradat" userProgress={progress} />
          </div>
        </TabsContent>
        
        <TabsContent value="juz" className="focus-visible:outline-none">
          <JuzList userProgress={progress} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
