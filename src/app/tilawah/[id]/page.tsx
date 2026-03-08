"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Bookmark, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [surah, setSurah] = useState<SurahInfo | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);

        // 1. Ambil Info Surat
        const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        if (!infoRes.ok) throw new Error("Gagal mengambil informasi surat.");
        const infoData = await infoRes.json();
        setSurah(infoData.chapter);

        // 2. Ambil Ayat dengan data kata-per-kata dan terjemahan Bahasa Indonesia
        // Menggunakan parameter words=true untuk mendapatkan data per kata
        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&translations=33&fields=text_uthmani&per_page=300`
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
          <h2 className="text-4xl md:text-5xl font-arabic leading-relaxed text-foreground">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </h2>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border/50">
        {verses.map((verse) => (
          <div key={verse.id} className="py-12 px-4 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-foreground text-sm font-bold border">
                {verse.verse_number}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Area Teks Arab dengan Hover Maroon dan Tooltip */}
            <div className="flex flex-wrap justify-end gap-x-3 gap-y-6" dir="rtl">
              <TooltipProvider delayDuration={100}>
                {verse.words && verse.words.length > 0 ? (
                  verse.words.map((word) => (
                    <Tooltip key={word.id}>
                      <TooltipTrigger asChild>
                        <span 
                          className="text-4xl md:text-6xl font-arabic leading-[2.2] cursor-pointer hover:text-[#800000] transition-colors" 
                        >
                          {word.text_uthmani}
                        </span>
                      </TooltipTrigger>
                      {word.translation && (
                        <TooltipContent className="bg-[#800000] text-white font-semibold border-none shadow-lg">
                          <p className="text-sm">{word.translation.text}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))
                ) : (
                  <span className="text-4xl md:text-6xl font-arabic leading-[2.2] text-right w-full">
                    {verse.text_uthmani}
                  </span>
                )}
              </TooltipProvider>
            </div>

            {/* Terjemahan Ayat (Kemenag RI) */}
            <div className="text-left bg-muted/30 p-6 rounded-xl border-l-4 border-[#800000]">
              <p className="text-[10px] font-bold text-[#800000] mb-2 uppercase tracking-widest">Terjemahan Kemenag RI</p>
              {verse.translations && verse.translations.length > 0 ? (
                <div 
                  className="text-base md:text-xl text-foreground/90 leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: verse.translations[0].text }} 
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Terjemahan tidak tersedia.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
