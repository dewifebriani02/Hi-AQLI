"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Share2, Bookmark, AlertCircle, Loader2 } from "lucide-react";
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
  translation: {
    text: string;
  };
  char_type_name: string;
}

interface Verse {
  id: number;
  verse_number: number;
  text_uthmani: string;
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

        // 2. Ambil Ayat dengan parameter yang lebih spesifik untuk memastikan teks Arab muncul
        // Menggunakan fields=text_uthmani untuk teks utuh dan words=true untuk per kata
        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&translations=33&fields=text_uthmani&per_page=300`
        );
        
        if (!verseRes.ok) throw new Error("Gagal mengambil data ayat Al-Qur'an.");
        
        const verseData = await verseRes.json();
        
        if (verseData && verseData.verses && Array.isArray(verseData.verses)) {
            setVerses(verseData.verses);
        } else {
            throw new Error("Data ayat tidak ditemukan atau format salah.");
        }
      } catch (err: any) {
        console.error("Quran API Error:", err);
        setError(err.message || "Terjadi kesalahan koneksi ke server Al-Qur'an.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-24 items-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Memuat ayat-ayat suci...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 max-w-4xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan</AlertTitle>
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
        <p className="text-muted-foreground">Maaf, ayat tidak ditemukan untuk surat ini.</p>
        <Button asChild variant="outline">
          <Link href="/tilawah">Coba Surat Lain</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24 md:pb-10">
      {/* Header Navigasi */}
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/tilawah">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold font-headline">{surah.id}. {surah.name_simple}</h1>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {surah.translated_name.name} • {surah.verses_count} Ayat
          </p>
        </div>
      </div>

      {/* Bismillah Banner */}
      {id !== "1" && id !== "9" && (
        <div className="text-center py-12">
          <h2 className="text-5xl font-arabic leading-relaxed text-foreground">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h2>
        </div>
      )}

      {/* Daftar Ayat */}
      <div className="flex flex-col divide-y divide-muted/30">
        {verses.map((verse) => (
          <div key={verse.id} className="py-12 px-4 space-y-10 group transition-colors hover:bg-muted/5">
            {/* Header Ayat & Action */}
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary/20 text-primary text-sm font-bold">
                {verse.verse_number}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Teks Arab dengan Fitur Per Kata */}
            <div className="flex flex-wrap justify-end gap-x-3 gap-y-8" dir="rtl">
              <TooltipProvider>
                {verse.words && verse.words.length > 0 ? (
                  verse.words.map((word) => (
                    <Tooltip key={word.id} delayDuration={100}>
                      <TooltipTrigger asChild>
                        <span 
                          className="text-4xl md:text-6xl font-arabic leading-[2.2] cursor-pointer hover:text-accent transition-colors duration-200" 
                        >
                          {word.text_uthmani}
                        </span>
                      </TooltipTrigger>
                      {word.char_type_name === "word" && (
                        <TooltipContent className="bg-accent text-accent-foreground border-none font-medium shadow-2xl">
                          <p>{word.translation?.text || "..."}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))
                ) : (
                  /* Fallback jika data words tidak ada */
                  <span className="text-4xl md:text-6xl font-arabic leading-[2.2] text-right w-full">
                    {verse.text_uthmani}
                  </span>
                )}
              </TooltipProvider>
            </div>

            {/* Terjemahan Bahasa Indonesia */}
            <div className="text-left bg-muted/40 p-6 rounded-2xl border-l-4 border-accent shadow-sm">
              <p className="text-[10px] font-bold text-accent-foreground/50 mb-3 uppercase tracking-[0.2em]">Terjemahan Kemenag RI</p>
              {verse.translations && verse.translations.length > 0 ? (
                <div 
                  className="text-base md:text-xl text-foreground/90 leading-relaxed font-body" 
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
