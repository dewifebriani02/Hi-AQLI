
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, BookOpen, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translations: { text: string }[];
  words: { 
    text_uthmani: string; 
    translation: { text: string } 
  }[];
}

export function MushafPage() {
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputPage, setInputPage] = useState("1");

  useEffect(() => {
    async function fetchPageVerses() {
      setLoading(true);
      try {
        // Fetch verses for the specific page from Quran.com API
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`
        );
        if (!res.ok) throw new Error("Gagal memuat halaman");
        const data = await res.json();
        setVerses(data.verses);
      } catch (error) {
        console.error("Quran API Error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPageVerses();
    setInputPage(page.toString());
  }, [page]);

  const handlePageChange = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage);
    if (p >= 1 && p <= 604) {
      setPage(p);
    } else {
      setInputPage(page.toString());
    }
  };

  return (
    <div className="flex flex-col gap-6 px-1">
      {/* Page Navigation Header */}
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-[#800000]/10 shadow-sm sticky top-20 z-20 backdrop-blur-md">
        <Button 
          variant="outline" 
          size="icon" 
          disabled={page <= 1 || loading} 
          onClick={() => setPage(p => p - 1)}
          className="h-10 w-10 border-[#800000]/20 text-[#800000] hover:bg-[#800000] hover:text-white transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <form onSubmit={handlePageChange} className="flex items-center gap-2 flex-1 justify-center">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-inner">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">Hal.</span>
            <Input 
              type="number" 
              min={1} 
              max={604} 
              value={inputPage} 
              onChange={(e) => setInputPage(e.target.value)}
              className="text-center font-bold h-7 w-12 p-0 border-none shadow-none focus-visible:ring-0 text-[#800000] text-lg"
            />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">/ 604</span>
          </div>
          <Button type="submit" size="sm" variant="ghost" className="h-8 text-[10px] font-bold text-[#800000] uppercase tracking-tighter sm:tracking-widest">Pindah</Button>
        </form>

        <Button 
          variant="outline" 
          size="icon" 
          disabled={page >= 604 || loading} 
          onClick={() => setPage(p => p + 1)}
          className="h-10 w-10 border-[#800000]/20 text-[#800000] hover:bg-[#800000] hover:text-white transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Menyiapkan Mushaf...</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y bg-card rounded-2xl border border-[#800000]/5 shadow-xl overflow-hidden mb-12">
          <div className="bg-muted/10 p-4 text-center border-b">
            <p className="text-[10px] font-bold text-[#800000] uppercase tracking-[0.2em]">Halaman {page}</p>
          </div>
          
          <TooltipProvider delayDuration={100}>
            {verses.map((verse) => (
              <div key={verse.id} className="p-8 md:p-12 space-y-8 hover:bg-muted/5 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#800000]/10 flex items-center justify-center text-[10px] font-bold text-[#800000] border border-[#800000]/20">
                      {verse.verse_key}
                    </div>
                  </div>
                  <BookOpen className="w-4 h-4 text-muted-foreground/20 group-hover:text-[#800000]/30 transition-colors" />
                </div>
                
                <div className="flex flex-wrap justify-end gap-x-3 gap-y-5 w-full" dir="rtl">
                  {verse.words.map((word, idx) => (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <span className="text-2xl md:text-4xl font-arabic leading-[1.8] text-right text-foreground/90 hover:text-[#800000] transition-colors duration-200 cursor-help">
                          {word.text_uthmani}
                        </span>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-2 px-3">
                          <p className="text-xs font-medium">{word.translation?.text || "..."}</p>
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  ))}
                </div>

                <div className="text-left bg-muted/30 p-5 rounded-xl border-l-4 border-[#800000]">
                  <p className="text-[10px] font-bold text-[#800000] mb-2 uppercase tracking-widest">Terjemahan Kemenag RI</p>
                  <div 
                    className="text-base md:text-lg text-foreground/80 leading-relaxed italic"
                    dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }}
                  />
                </div>
              </div>
            ))}
          </TooltipProvider>

          <div className="p-8 flex justify-between items-center bg-muted/5">
             <Button 
              variant="ghost" 
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
              className="font-bold text-[#800000] gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Hal. Sebelumnya
            </Button>
            <Button 
              variant="ghost" 
              disabled={page >= 604} 
              onClick={() => setPage(p => p + 1)}
              className="font-bold text-[#800000] gap-2"
            >
              Hal. Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
