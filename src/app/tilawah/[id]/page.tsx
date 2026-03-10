
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Bookmark, AlertCircle, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  translated_name: { name: string };
  verses_count: number;
}

export default function SurahDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  
  const [surah, setSurah] = useState<SurahInfo | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio States
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);

        const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        if (!infoRes.ok) throw new Error("Gagal mengambil informasi surat.");
        const infoData = await infoRes.json();
        setSurah(infoData.chapter);

        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani&per_page=300`
        );
        
        if (!verseRes.ok) throw new Error("Gagal mengambil data ayat.");
        
        const verseData = await verseRes.json();
        
        if (verseData && verseData.verses && Array.isArray(verseData.verses)) {
          setVerses(verseData.verses);
        } else {
          throw new Error("Format data ayat tidak valid.");
        }
      } catch (err: any) {
        console.error("Quran API Fetch Error:", err);
        setError("Gagal memuat ayat Al-Qur'an. Silakan periksa koneksi internet Anda.");
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

  const toggleAudio = async (verseKey: string) => {
    if (playingKey === verseKey) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }

    setLoadingAudioKey(verseKey);
    
    try {
      // Use recitation ID 7 (Mishary Rashid Alafasy)
      const res = await fetch(`https://api.quran.com/api/v4/recitations/7/by_ayah/${verseKey}`);
      if (!res.ok) throw new Error("Gagal memuat audio.");
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;

      if (!audioUrl) throw new Error("Audio tidak tersedia.");

      // Handle relative URLs from API
      let fullUrl = audioUrl;
      if (audioUrl.startsWith('//')) {
        fullUrl = `https:${audioUrl}`;
      } else if (!audioUrl.startsWith('http')) {
        fullUrl = `https://audio.qurancdn.com/${audioUrl}`;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setPlayingKey(verseKey);
        setLoadingAudioKey(null);
      };

      audio.onended = () => {
        setPlayingKey(null);
        // AUTOPLAY LOGIC: Find next verse in current Surah
        const currentIndex = verses.findIndex(v => v.verse_key === verseKey);
        if (currentIndex !== -1 && currentIndex < verses.length - 1) {
          const nextVerse = verses[currentIndex + 1];
          // Use setTimeout to avoid potential recursion issues with browser audio policy
          setTimeout(() => toggleAudio(nextVerse.verse_key), 300);
        }
      };

      audio.onerror = (e) => {
        console.error("Audio Playback Error:", e);
        setLoadingAudioKey(null);
        setPlayingKey(null);
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Gagal memutar murottal. Silakan coba lagi.",
        });
      };

      await audio.play();
    } catch (err) {
      console.error("Fetch Audio Error:", err);
      setLoadingAudioKey(null);
      toast({
        variant: "destructive",
        title: "Audio Error",
        description: "Tidak dapat mengambil data murottal.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium">Memuat Ayat Suci...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 max-w-4xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Masalah Koneksi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/tilawah">Kembali ke Daftar Surat</Link>
        </Button>
      </div>
    );
  }

  if (!surah || verses.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <p className="text-muted-foreground">Ayat tidak ditemukan.</p>
        <Button asChild variant="outline">
          <Link href="/tilawah">Pilih Surat Lain</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-4">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/tilawah">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold font-headline">{surah.id}. {surah.name_simple}</h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            {surah.translated_name.name} • {surah.verses_count} Ayat
          </p>
        </div>
      </div>

      {id !== "1" && id !== "9" && (
        <div className="text-center py-12">
          <h2 className="text-2xl md:text-3xl font-arabic leading-relaxed text-foreground">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </h2>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border/50">
        <TooltipProvider delayDuration={100}>
          {verses.map((verse) => (
            <div key={verse.id} className="py-12 px-4 space-y-8 group">
              <div className="flex items-center justify-between">
                <Link 
                  href={`/tilawah/${id}/${verse.verse_number}`}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-foreground text-sm font-bold border hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-all cursor-pointer"
                  title="Klik untuk detail & tafsir AI"
                >
                  {verse.verse_number}
                </Link>
                <div className="flex items-center gap-1">
                   <Button asChild variant="ghost" size="sm" className="text-[10px] font-bold text-[#800000] hover:text-[#800000] gap-1">
                    <Link href={`/tilawah/${id}/${verse.verse_number}`}>
                      <Info className="h-3 w-3" /> DETAIL & TAFSIR
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 transition-colors",
                      playingKey === verse.verse_key ? "text-[#800000] bg-[#800000]/10" : "text-muted-foreground"
                    )}
                    onClick={() => toggleAudio(verse.verse_key)}
                    disabled={loadingAudioKey === verse.verse_key}
                  >
                    {loadingAudioKey === verse.verse_key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playingKey === verse.verse_key ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div 
                className="flex flex-wrap justify-end gap-x-3 gap-y-4 w-full" 
                dir="rtl"
              >
                {verse.words?.map((word, wordIdx) => (
                  <Tooltip key={wordIdx}>
                    <TooltipTrigger asChild>
                      <span className="text-2xl md:text-3xl font-arabic leading-[1.8] text-right text-foreground/90 hover:text-[#800000] transition-colors duration-200 cursor-help">
                        {word.text_uthmani}
                      </span>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent className="bg-[#800000] text-white border-none shadow-lg">
                        <p className="text-xs font-medium">{word.translation?.text || "..."}</p>
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                ))}
              </div>

              <div className="text-left bg-muted/30 p-5 rounded-xl border-l-4 border-[#800000]">
                <p className="text-[10px] font-bold text-[#800000] mb-2 uppercase tracking-widest">Terjemahan Kemenag RI</p>
                {verse.translations && verse.translations.length > 0 ? (
                  <div 
                    className="text-base md:text-lg text-foreground/90 leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: verse.translations[0].text }} 
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Terjemahan tidak tersedia.</p>
                )}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
