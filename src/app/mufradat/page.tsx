'use client';

import { SurahList } from "@/components/surah-list";
import { Button } from "@/components/ui/button";
import { BookOpen, Layers, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JuzList } from "@/components/juz-list";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { useMemo, useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Headphones, Check, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy", style: "Murattal" },
  { id: 2, name: "AbdulBaset AbdulSamad", style: "Murattal" },
  { id: 3, name: "Abdur-Rahman as-Sudais", style: "Sura/Juz" },
  { id: 6, name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
  { id: 12, name: "Saud al-Shuraim", style: "Murattal" },
  { id: 1, name: "AbdulBaset AbdulSamad", style: "Mujawwad" },
];

export default function MufradatPage() {
  const { user, isUserLoading } = useUser();

  // Fetch all passed attempts for the current user
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id }
    ]
  }), [user?.id]);

  const { data: progress, isLoading: isProgressLoading } = useCollection(
    "quiz_attempts", 
    user ? progressOptions : undefined
  );

  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [isReciterDialogOpen, setIsReciterDialogOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aqli_reciter_id');
    if (saved) setSelectedReciterId(parseInt(saved));
  }, []);

  const selectReciter = (id: number) => {
    setSelectedReciterId(id);
    localStorage.setItem('aqli_reciter_id', id.toString());
    setIsReciterDialogOpen(false);
  };

  const selectedReciterName = RECITERS.find(r => r.id === selectedReciterId)?.name || "Pilih Qari";

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4 px-1">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Mufradat • Daftar Surat & Juz</span>
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
          <p className="text-muted-foreground text-sm max-w-md">Pelajari setiap kata dan maknai setiap ayat dalam Mushaf HI AQLI.</p>
        </div>

        <Dialog open={isReciterDialogOpen} onOpenChange={setIsReciterDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-12 px-6 rounded-2xl border-2 border-[#800000]/10 hover:bg-[#800000]/5 hover:border-[#800000]/20 flex items-center gap-3 group transition-all shrink-0 bg-white">
              <div className="w-8 h-8 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-colors">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start leading-none gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pilihan Qari</span>
                <span className="text-xs font-bold text-slate-800">{selectedReciterName}</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-gradient-to-br from-[#800000] to-[#b91c1c] text-white">
              <DialogTitle className="text-xl font-black font-headline flex items-center gap-3">
                <Music className="w-6 h-6 text-[#D4AF37]" />
                PILIH QARI FAVORIT
              </DialogTitle>
              <p className="text-white/70 text-xs font-medium">Suara Tilawah akan menyesuaikan Qari yang Anda pilih.</p>
            </DialogHeader>
            <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto bg-slate-50">
              {RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectReciter(r.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                    selectedReciterId === r.id 
                      ? "bg-white border-[#800000] shadow-md scale-[1.02]" 
                      : "bg-white/50 border-transparent hover:border-slate-200 hover:bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm",
                      selectedReciterId === r.id ? "bg-[#800000] text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {r.name[0]}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={cn("text-sm font-bold", selectedReciterId === r.id ? "text-[#800000]" : "text-slate-700")}>{r.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{r.style}</span>
                    </div>
                  </div>
                  {selectedReciterId === r.id && (
                    <div className="w-6 h-6 rounded-full bg-[#800000] flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
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
            <SurahList 
              baseUrl="/mufradat" 
              userProgress={progress} 
              selectedReciterId={selectedReciterId} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="juz" className="focus-visible:outline-none">
          <JuzList 
            userProgress={progress} 
            selectedReciterId={selectedReciterId} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
