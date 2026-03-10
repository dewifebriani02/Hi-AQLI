
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    async function fetchPageVerses() {
      setLoading(true);
      try {
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
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 p-3 rounded-2xl border border-[#800000]/10 shadow-sm sticky top-20 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={page <= 1 || loading} 
            onClick={() => setPage(p => p - 1)}
            className="text-[#800000]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <form onSubmit={handlePageChange} className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hal.</span>
              <Input 
                type="number" 
                value={inputPage} 
                onChange={(e) => setInputPage(e.target.value)}
                className="text-center font-bold h-7 w-10 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 text-[#800000]"
              />
            </div>
            <Button type="submit" size="sm" variant="ghost" className="h-8 text-[10px] font-bold text-[#800000]">GO</Button>
          </form>

          <Button 
            variant="ghost" 
            size="icon" 
            disabled={page >= 604 || loading} 
            onClick={() => setPage(p => p + 1)}
            className="text-[#800000]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 bg-muted/20 px-3 py-1.5 rounded-full border">
          <Switch 
            id="translation-toggle" 
            checked={showTranslation} 
            onCheckedChange={setShowTranslation}
            className="data-[state=checked]:bg-[#800000]"
          />
          <Label htmlFor="translation-toggle" className="text-[9px] font-bold uppercase tracking-widest cursor-pointer text-muted-foreground">
            Terjemahan
          </Label>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Memuat Halaman...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-24">
          {/* Mushaf Page Container - Re-engineered for 15-line compactness */}
          <Card className="relative p-6 md:p-10 lg:p-14 border-none shadow-2xl bg-[#fffcf5] min-h-[750px] flex flex-col items-center overflow-hidden">
            {/* Decorative Borders to mimic a physical Quran page */}
            <div className="absolute inset-2 border-[4px] border-[#800000]/5 rounded-xl pointer-events-none" />
            <div className="absolute inset-4 border border-[#800000]/10 rounded-lg pointer-events-none" />
            
            {/* Header Page Info */}
            <div className="w-full text-center mb-6 opacity-40">
               <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#800000]">Halaman {page}</span>
            </div>

            {/* Compact Arabic Text Flow - Optimized for 15 lines visual density */}
            <div 
              className="flex flex-wrap justify-center items-center gap-x-1 gap-y-3 w-full max-w-[500px] text-center px-2 md:px-4" 
              dir="rtl"
            >
              <TooltipProvider delayDuration={0}>
                {verses.map((verse) => (
                  <React.Fragment key={verse.id}>
                    {verse.words.map((word, wordIdx) => (
                      <Tooltip key={`${verse.id}-${wordIdx}`}>
                        <TooltipTrigger asChild>
                          <span 
                            tabIndex={0}
                            role="button"
                            className="text-3xl md:text-4xl lg:text-5xl font-arabic leading-[2.4] md:leading-[2.6] text-foreground/90 hover:text-[#800000] focus:text-[#800000] focus:outline-none transition-colors cursor-help select-none px-0.5"
                          >
                            {word.text_uthmani}
                          </span>
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent side="top" sideOffset={8} className="bg-[#800000] text-white border-none shadow-lg py-1 px-2 z-[100] animate-in fade-in-0 zoom-in-95">
                            <p className="text-[10px] font-medium">{word.translation?.text || "..."}</p>
                          </TooltipContent>
                        </TooltipPortal>
                      </Tooltip>
                    ))}
                    {/* Compact Verse Marker */}
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#800000]/20 text-[10px] font-bold text-[#800000] mx-2 align-middle bg-white/50 shadow-xs shrink-0 translate-y-[-2px]">
                      {verse.verse_key.split(':')[1]}
                    </span>
                  </React.Fragment>
                ))}
              </TooltipProvider>
            </div>

            {/* Footer Decorative Icon */}
            <div className="w-full text-center mt-auto pt-6 opacity-20">
               <BookOpen className="w-4 h-4 mx-auto text-[#800000]" />
            </div>
          </Card>

          {/* Separate Translation List (if toggled ON) */}
          {showTranslation && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
               <div className="flex items-center gap-2">
                 <div className="h-px bg-border flex-1" />
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Terjemahan Halaman {page}</span>
                 <div className="h-px bg-border flex-1" />
               </div>
               
               <div className="grid gap-3">
                 {verses.map((verse) => (
                   <div key={verse.id} className="bg-white p-4 rounded-xl border-l-4 border-[#800000] shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[9px] font-bold text-[#800000] border-[#800000]/20">
                          {verse.verse_key}
                        </Badge>
                      </div>
                      <div 
                        className="text-sm text-muted-foreground leading-relaxed italic"
                        dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }}
                      />
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
