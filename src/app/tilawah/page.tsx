
'use client';

import { SurahList } from "@/components/tilawah/surah-list";
import { MushafPage } from "@/components/tilawah/mushaf-page";
import { JuzList } from "@/components/tilawah/juz-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, BookOpen, Layers, ListFilter } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { RECITERS } from "@/lib/quran-reciters";
import { Mic2, Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { checkIsStudent } from "@/lib/access-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function QuranPage() {
  const { user } = useUser();
  const { data: registrations } = useCollection("halaqah_registrations", user?.id ? {
    filters: [{ column: 'user_id', operator: '==', value: user.id }]
  } : undefined);

  const isStudent = useMemo(() => checkIsStudent(registrations), [registrations]);
  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const [searchReciter, setSearchReciter] = useState("");
  const [showReciterDialog, setShowReciterDialog] = useState(false);

  useEffect(() => {
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) setSelectedReciterId(parseInt(savedReciter));
    else {
      // Default to Mishary
      setSelectedReciterId(7);
      localStorage.setItem('aqli_reciter_id', '7');
    }
  }, []);

  const selectReciter = (reciterId: number) => {
    setSelectedReciterId(reciterId);
    localStorage.setItem('aqli_reciter_id', reciterId.toString());
    setShowReciterDialog(false);
  };

  const filteredReciters = useMemo(() => {
    return RECITERS.filter(r => r.name.toLowerCase().includes(searchReciter.toLowerCase()));
  }, [searchReciter]);

  const activeReciter = useMemo(() => {
    return RECITERS.find(r => r.id === selectedReciterId);
  }, [selectedReciterId]);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mt-4 px-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest text-[#800000]">Hi Tilawah</span>
        </div>
        <h1 className="text-4xl font-black font-headline tracking-tight text-[#800000] uppercase">Al-Qur'anul Karim</h1>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 mb-4">
          <p className="text-muted-foreground text-sm font-medium">Baca dan tadabburi ayat-ayat suci Al-Qur'an dengan nyaman.</p>
          
          <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 rounded-2xl border-[#800000]/20 bg-[#800000]/5 text-[#800000] font-bold gap-3 px-6 shadow-sm hover:bg-[#800000]/10 transition-all border-2">
                <div className="w-6 h-6 rounded-full bg-[#800000]/10 flex items-center justify-center">
                  <Mic2 className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="text-[9px] uppercase tracking-widest opacity-60">Pilih Qari</span>
                  <span className="text-xs truncate max-w-[150px]">{activeReciter?.name || 'Mishary Rashid'}</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col rounded-[2rem] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-center font-black uppercase tracking-tighter text-xl text-[#800000]">Library Qari Al-Qur'an</DialogTitle>
                <DialogDescription className="sr-only">
                  Pilih Qari favorit Ukhti untuk mendengarkan audio tilawah Al-Qur'an.
                </DialogDescription>
              </DialogHeader>
              <div className="px-1 py-4 flex flex-col gap-4 overflow-hidden">
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-[#800000] transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Cari Qari favorit Ukhti..." 
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border-none text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#800000]/10 shadow-inner"
                      value={searchReciter}
                      onChange={(e) => setSearchReciter(e.target.value)}
                    />
                 </div>
                 <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar p-1">
                  {filteredReciters.map((r) => (
                    <Button 
                      key={r.id} 
                      variant={selectedReciterId === r.id ? "default" : "outline"} 
                      onClick={() => selectReciter(r.id)} 
                      className={cn(
                        "w-full justify-between font-bold h-14 rounded-2xl transition-all active:scale-[0.98]",
                        selectedReciterId === r.id ? "bg-[#800000] hover:bg-[#800000]/90 text-white shadow-lg" : "hover:border-[#800000]/30 hover:bg-[#800000]/5 text-slate-700"
                      )}
                    >
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-sm">{r.name}</span>
                        {r.style && <span className={cn("text-[9px] uppercase tracking-widest", selectedReciterId === r.id ? "text-white/60" : "text-muted-foreground")}>{r.style}</span>}
                      </div>
                      {selectedReciterId === r.id && <Check className="h-5 w-5 shrink-0" />}
                    </Button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
            <JuzList baseUrl="/tilawah" variant="tilawah" isStudent={isStudent} selectedReciterId={selectedReciterId || 7} />
          </div>
        </TabsContent>
        
        <TabsContent value="mushaf" className="focus-visible:outline-none">
          <MushafPage isStudent={isStudent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
