"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, BookOpen, Type, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mic2, Check, Play, Pause } from "lucide-react";

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

const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy" },
  { id: 2, name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 3, name: "Abdur-Rahman as-Sudais" },
  { id: 6, name: "Mahmoud Khalil Al-Husary" },
  { id: 12, name: "Saud al-Shuraim" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)" },
];

export function MushafPage() {
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCache, setPageCache] = useState<Record<number, Verse[]>>({});
  const [inputPage, setInputPage] = useState("1");
  const [showTranslation, setShowTranslation] = useState(false);
  const [fontSize, setFontSize] = useState(32); // Default font size
  
  const { toast } = useToast();
  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const [showReciterDialog, setShowReciterDialog] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Tooltip persistence state
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);

  useEffect(() => {
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) setSelectedReciterId(parseInt(savedReciter));

    const savedSize = localStorage.getItem('aqli_mushaf_font_size');
    if (savedSize) setFontSize(parseInt(savedSize));

    async function fetchPageVerses(p: number, isPrefetch = false) {
      if (!isPrefetch && pageCache[p]) {
        setVerses(pageCache[p]);
        setLoading(false);
        // Trigger prefetch for next page even if we use cache
        if (p < 604) fetchPageVerses(p + 1, true);
        return;
      }

      if (!isPrefetch) setLoading(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${p}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`
        );
        if (!res.ok) throw new Error("Gagal memuat halaman");
        const data = await res.json();
        
        if (isPrefetch) {
          setPageCache(prev => ({ ...prev, [p]: data.verses }));
        } else {
          setVerses(data.verses);
          setPageCache(prev => ({ ...prev, [p]: data.verses }));
          // After valid current page, prefetch next
          if (p < 604) fetchPageVerses(p + 1, true);
        }
      } catch (error) {
        console.error("Quran API Error:", error);
      } finally {
        if (!isPrefetch) setLoading(false);
      }
    }
    fetchPageVerses(page);
    setInputPage(page.toString());
    setActiveWordKey(null); // Reset when page changes
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [page]);

  const selectReciter = (reciterId: number) => {
    setSelectedReciterId(reciterId);
    localStorage.setItem('aqli_reciter_id', reciterId.toString());
    setShowReciterDialog(false);
  };

  const toggleAudio = async (verseKey: string) => {
    if (!selectedReciterId) {
      setShowReciterDialog(true);
      return;
    }

    if (playingKey === verseKey) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }

    setLoadingAudioKey(verseKey);

    try {
      const res = await fetch(`https://api.quran.com/api/v4/recitations/${selectedReciterId}/by_ayah/${verseKey}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;

      let fullUrl = audioUrl;
      if (audioUrl.startsWith('//')) fullUrl = `https:${audioUrl}`;
      else if (!audioUrl.startsWith('http')) fullUrl = `https://audio.qurancdn.com/${audioUrl}`;

      if (audioRef.current) audioRef.current.pause();

      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setPlayingKey(verseKey);
        setLoadingAudioKey(null);
      };

      audio.onended = () => {
        setPlayingKey(null);
        // Autoplay next verse if possible
        const currentIndex = verses.findIndex(v => v.verse_key === verseKey);
        if (currentIndex !== -1 && currentIndex < verses.length - 1) {
          setTimeout(() => toggleAudio(verses[currentIndex + 1].verse_key), 300);
        }
      };

      await audio.play();
    } catch (err) {
      setLoadingAudioKey(null);
      toast({ variant: "destructive", title: "Audio Error", description: "Gagal memutar qari." });
    }
  };

  const handlePageChange = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage);
    if (p >= 1 && p <= 604) {
      setPage(p);
    } else {
      setInputPage(page.toString());
    }
  };

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(20, Math.min(fontSize + delta, 64));
    setFontSize(newSize);
    localStorage.setItem('aqli_mushaf_font_size', newSize.toString());
  };

  return (
    <div className="flex flex-col gap-6 px-1">
      {/* Navigation Header */}
      <div className="flex flex-col gap-4 bg-white/80 p-4 rounded-2xl border border-[#800000]/10 shadow-sm sticky top-20 z-20 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustFontSize(-4)} title="Perkecil Font">
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex items-center gap-1.5 px-2">
                <Type className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold w-4 text-center">{fontSize}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustFontSize(4)} title="Perbesar Font">
                <Plus className="h-3 w-3" />
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

            <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-[#800000] font-bold h-9 rounded-full bg-[#800000]/5 border border-[#800000]/10 hover:bg-[#800000]/10 transition-colors">
                  <Mic2 className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-wider">Qari</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-center font-headline text-[#800000] uppercase tracking-widest text-lg pt-4">Pilih Qari</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2 py-6 max-h-[60vh] overflow-y-auto px-1">
                  {RECITERS.map((r) => (
                    <Button 
                      key={r.id} 
                      variant={selectedReciterId === r.id ? "default" : "outline"} 
                      onClick={() => selectReciter(r.id)} 
                      className={cn(
                        "justify-between font-bold h-12 rounded-xl transition-all",
                        selectedReciterId === r.id ? "bg-[#800000] text-white shadow-lg" : "hover:border-[#800000] hover:text-[#800000]"
                      )}
                    >
                      <span className="text-xs uppercase tracking-tight">{r.name}</span>
                      {selectedReciterId === r.id && <Check className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Memuat Halaman...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-24">
          {/* Mushaf Page Container */}
          <Card className="relative p-6 md:p-10 lg:p-14 border-none shadow-2xl bg-[#fffcf5] min-h-[750px] flex flex-col items-center overflow-hidden">
            {/* Decorative Borders */}
            <div className="absolute inset-2 border-[4px] border-[#800000]/5 rounded-xl pointer-events-none" />
            <div className="absolute inset-4 border border-[#800000]/10 rounded-lg pointer-events-none" />
            
            {/* Header Page Info */}
            <div className="w-full text-center mb-6 opacity-40">
               <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#800000]">Halaman {page}</span>
            </div>

            {/* Compact Arabic Text Flow */}
            <div 
              className="flex flex-wrap justify-center items-center gap-x-1 gap-y-3 w-full max-w-[600px] text-center px-2 md:px-4" 
              dir="rtl"
            >
              <TooltipProvider delayDuration={0} skipDelayDuration={0}>
                {verses.map((verse) => (
                  <React.Fragment key={verse.id}>
                    {verse.words.map((word, wordIdx) => {
                      const wordKey = `${verse.verse_key}-${wordIdx}`;
                      return (
                        <Tooltip 
                          key={`${verse.id}-${wordIdx}`}
                          open={activeWordKey === wordKey}
                          onOpenChange={(open) => {
                            if (open) setActiveWordKey(wordKey);
                          }}
                        >
                          <TooltipTrigger asChild>
                            <span 
                              tabIndex={0}
                              role="button"
                              onPointerEnter={() => setActiveWordKey(wordKey)}
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                              className="font-arabic text-foreground/90 hover:text-[#800000] focus:text-[#800000] outline-none transition-colors cursor-help select-none px-0.5 inline-block"
                            >
                              {word.text_uthmani}
                            </span>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent 
                              side="top" 
                              sideOffset={8} 
                              className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100] animate-in fade-in-0 zoom-in-95"
                            >
                              <p className="text-[11px] font-medium">{word.translation?.text || "..."}</p>
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      );
                    })}
                    {/* Compact Verse Marker with Play Button */}
                    <button 
                      onClick={() => toggleAudio(verse.verse_key)}
                      style={{ height: `${fontSize * 0.9}px` }}
                      className={cn(
                        "inline-flex items-center justify-center px-3 rounded-full border text-[10px] font-bold mx-2 align-middle shadow-sm transition-all active:scale-95 group relative overflow-hidden",
                        playingKey === verse.verse_key 
                          ? "bg-[#800000] text-white border-[#800000]" 
                          : "bg-white/50 text-[#800000] border-[#800000]/20 hover:border-[#800000]/50 hover:bg-white"
                      )}
                    >
                      {loadingAudioKey === verse.verse_key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : playingKey === verse.verse_key ? (
                        <div className="flex items-center gap-1.5">
                           <Pause className="h-3 w-3 fill-current" />
                           <span className="opacity-80">{verse.verse_key.split(':')[1]}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                           <Play className="h-3 w-3" />
                           <span className="opacity-60">{verse.verse_key.split(':')[1]}</span>
                        </div>
                      )}
                    </button>
                  </React.Fragment>
                ))}
              </TooltipProvider>
            </div>

            {/* Footer Decorative Icon */}
            <div className="w-full text-center mt-auto pt-6 opacity-20">
               <BookOpen className="w-4 h-4 mx-auto text-[#800000]" />
            </div>
          </Card>

          {/* Separate Translation List */}
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
