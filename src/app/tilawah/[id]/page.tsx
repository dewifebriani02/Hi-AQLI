"use client";


import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Loader2, Type, Minus, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import { RECITERS } from "@/lib/quran-reciters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface Word {
  id: number;
  text_uthmani: string;
  translation?: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani?: string;
  words: Word[];
  translations: { text: string }[];
}

interface SurahInfo {
  id: number;
  name_simple: string;
  name_arabic: string;
  translated_name: string;
  verses_count: number;
}

import { checkIsStudent, isSurahFree } from "@/lib/access-control";

export default function SurahDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useUser();

  const { data: registrations } = useCollection("halaqah_registrations", user?.id ? {
    filters: [{ column: 'user_id', operator: '==', value: user.id }]
  } : undefined);

  const isStudent = useMemo(() => checkIsStudent(registrations), [registrations]);

  useEffect(() => {
    const sId = Number(id);
    if (!isStudent && sId && !isSurahFree(sId)) {
      toast({
        variant: "destructive",
        title: "Surat Terkunci",
        description: "Ukhti perlu mendaftar program untuk membuka materi ini."
      });
      router.push('/tilawah');
    }
  }, [id, isStudent, router, toast]);

  const [surah, setSurah] = useState<SurahInfo | null>(() => {
    const sId = Number(id);
    if (sId) {
      return QURAN_CHAPTERS.find(c => c.id === sId) || null;
    }
    return null;
  });
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleLimit, setVisibleLimit] = useState(20);
  const [fontSize, setFontSize] = useState(32);

  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // No locks for Tilawah mode
  const isProgressLoading = false;
  const completedVerseNumbers = new Set<number>();

  useEffect(() => {
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) setSelectedReciterId(parseInt(savedReciter));

    const savedSize = localStorage.getItem('aqli_mushaf_font_size');
    if (savedSize) setFontSize(parseInt(savedSize));

    async function fetchData() {
      if (!id) return;

      // 1. Instantly set Surah metadata from local data for zero-latency header
      const localSurah = QURAN_CHAPTERS.find(c => c.id === Number(id));
      if (localSurah) setSurah(localSurah);

      try {
        setLoading(true);

        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani&per_page=300`
        );
        const verseData = await verseRes.json();

        if (verseData && verseData.verses) {
          setVerses(verseData.verses);
          
          // Scroll to verse if provided in query param
          const searchParams = new URLSearchParams(window.location.search);
          const verseToScroll = searchParams.get('verse');
          if (verseToScroll) {
            const vIndex = verseData.verses.findIndex((v: any) => v.verse_number.toString() === verseToScroll);
            if (vIndex !== -1 && vIndex >= 20) {
              setVisibleLimit(vIndex + 5);
            }
            
            setTimeout(() => {
              const element = verseRefs.current[verseToScroll];
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('bg-[#800000]/5');
                setTimeout(() => element.classList.remove('bg-[#800000]/5'), 2000);
              }
            }, 500);
          }
        }
      } catch (err: any) {
        console.error("Quran API Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id]);

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(20, Math.min(fontSize + delta, 64));
    setFontSize(newSize);
    localStorage.setItem('aqli_mushaf_font_size', newSize.toString());
  };

  const selectReciter = (reciterId: number) => {
    setSelectedReciterId(reciterId);
    localStorage.setItem('aqli_reciter_id', reciterId.toString());
  };


  const toggleAudio = async (verseKey: string) => {
    if (!selectedReciterId) {
      toast({
        title: "Qari Belum Dipilih",
        description: "Silakan pilih Qari di halaman utama Tilawah terlebih dahulu."
      });
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
        const currentIndex = verses.findIndex(v => v.verse_key === verseKey);
        if (currentIndex !== -1 && currentIndex < verses.length - 1) {
          setTimeout(() => toggleAudio(verses[currentIndex + 1].verse_key), 300);
        }
      };

      await audio.play();
    } catch (err) {
      setLoadingAudioKey(null);
      toast({ variant: "destructive", title: "Audio Error" });
    }
  };

  if (loading || isProgressLoading) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[#800000]" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link href="/tilawah"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold font-headline">{surah?.id}. {surah?.name_simple}</h1>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">{surah?.translated_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-muted/30 p-1 rounded-lg border mr-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustFontSize(-4)}>
                <Minus className="h-3 w-3" />
              </Button>
              <Type className="h-3 w-3 text-muted-foreground mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustFontSize(4)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="sm:hidden flex justify-center">
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border w-full justify-between px-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ukuran Teks</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => adjustFontSize(-4)}><Minus className="h-4 w-4" /></Button>
              <span className="text-xs font-bold w-6 text-center">{fontSize}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => adjustFontSize(4)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>


      <div className="flex flex-col divide-y">
        <TooltipProvider delayDuration={0}>
          {verses.slice(0, visibleLimit).map((verse) => (
            <div 
              key={verse.id} 
              ref={el => { verseRefs.current[verse.verse_number.toString()] = el }}
              className="py-12 px-4 space-y-8 transition-opacity rounded-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-10 rounded-full text-xs font-bold border transition-all bg-[#800000]/5 text-[#800000] border-[#800000]/10 italic">
                    ({verse.verse_number})
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toggleAudio(verse.verse_key)}>
                  {loadingAudioKey === verse.verse_key ? <Loader2 className="animate-spin h-4 w-4" /> : playingKey === verse.verse_key ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex flex-wrap justify-end gap-x-3 gap-y-4 w-full" dir="rtl">
                {verse.words?.map((word, wordIdx) => {
                  const wordKey = `${verse.verse_key}-${wordIdx}`;
                  return (
                    <Tooltip key={wordIdx} open={activeWordKey === wordKey} onOpenChange={(o) => o && setActiveWordKey(wordKey)}>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          role="button"
                          onPointerEnter={() => setActiveWordKey(wordKey)}
                          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                          className="font-arabic text-foreground/90 outline-none transition-colors px-0.5 inline-block hover:text-[#800000] focus:text-[#800000] cursor-help"
                        >
                          {word.text_uthmani}
                        </span>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                          <p className="text-xs font-medium">{word.translation?.text || "..."}</p>
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  );
                })}
              </div>

              <div className="text-left bg-muted/30 p-5 rounded-xl border-l-4 border-[#800000]">
                <p className="text-[10px] font-bold mb-2 uppercase tracking-widest text-[#800000]">
                  Terjemahan Kemenag RI
                </p>
                <div className="text-base leading-relaxed text-foreground/90">
                  <div dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }} />
                </div>
              </div>
            </div>
          ))}
        </TooltipProvider>

        {/* Load More Observer */}
        {verses.length > visibleLimit && (
          <div className="py-12 flex justify-center">
            <Button 
              variant="outline" 
              className="rounded-full px-8 border-2 border-[#800000]/10 text-[#800000] font-black"
              onClick={() => setVisibleLimit(prev => prev + 30)}
            >
              TAMPILKAN 30 AYAT LAGI...
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
