"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Share2, Bookmark, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Translation {
  text: string;
}

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
  translations: Translation[];
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

        // 2. Ambil Ayat (Gunakan parameter yang lebih stabil)
        // Kita meminta words=true (untuk per kata) dan translations=33 (Kemenag RI)
        // fields=text_uthmani memastikan teks Arab utuh juga terkirim
        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?words=true&translations=33&word_translation_language=id&fields=text_uthmani&per_page=300`
        );
        
        if (!verseRes.ok) throw new Error("Gagal mengambil data ayat Al-Qur'an.");
        
        const verseData = await verseRes.json();
        
        if (verseData && verseData.verses) {
            setVerses(verseData.verses);
        } else {
            throw new Error("Struktur data ayat tidak sesuai.");
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan koneksi ke server Al-Qur'an.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-12 px-4 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Memuat ayat-ayat suci...</p>
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
      <div className="p-8 text-center flex flex-col items-center gap-4">
        <p>Maaf, ayat tidak ditemukan untuk surat ini.</p>
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
        <div className="text-center py-10">
          <h2 className="text-4xl font-arabic leading-relaxed text-foreground">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h2>
        </div>
      )}

      {/* Daftar Ayat */}
      <div className="flex flex-col divide-y divide-muted/50">
        {verses.map((verse) => (
          <div key={verse.id} className="py-12 px-4 space-y-10 group transition-colors hover:bg-muted/5">
            {/* Action Bar Ayat */}
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary/20 text-primary text-xs font-bold">
                {verse.verse_number}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Teks Arab dengan Word-by-Word Tooltip */}
            <div className="flex flex-wrap justify-end gap-x-2 gap-y-8" dir="rtl">
              <TooltipProvider>
                {verse.words && verse.words.length > 0 ? (
                  verse.words.map((word) => (
                    <Tooltip key={word.id} delayDuration={100}>
                      <TooltipTrigger asChild>
                        <span 
                          className="text-4xl md:text-5xl font-arabic leading-[2] cursor-pointer hover:text-accent transition-colors duration-200" 
                        >
                          {word.text_uthmani}
                        </span>
                      </TooltipTrigger>
                      {word.char_type_name === "word" && (
                        <TooltipContent className="bg-accent text-accent-foreground border-none font-medium shadow-xl">
                          <p>{word.translation?.text || "..."}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))
                ) : (
                  <span className="text-4xl md:text-5xl font-arabic leading-[2] text-right w-full">
                    {verse.text_uthmani}
                  </span>
                )}
              </TooltipProvider>
            </div>

            {/* Terjemahan Bahasa Indonesia */}
            <div className="text-left bg-muted/30 p-6 rounded-2xl border-l-4 border-accent shadow-sm">
              <p className="text-[10px] font-bold text-accent-foreground/40 mb-3 uppercase tracking-[0.2em]">Terjemahan Kemenag RI</p>
              {verse.translations && verse.translations.length > 0 ? (
                <div 
                  className="text-base md:text-lg text-foreground leading-relaxed font-body" 
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
