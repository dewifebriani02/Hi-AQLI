"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Play, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Translation {
  text: string;
}

interface Verse {
  verse_number: number;
  text_uthmani: string;
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch Surah Info
        const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const infoData = await infoRes.json();
        setSurah(infoData.chapter);

        // Fetch Verses dengan teks Uthmani dan terjemahan Sabeeq Company Bahasa Indonesia (ID 158)
        // Pastikan parameter 'translations' ada di URL
        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=false&translations=158&fields=text_uthmani`
        );
        const verseData = await verseRes.json();
        
        if (verseData && verseData.verses) {
            setVerses(verseData.verses);
        }
      } catch (error) {
        console.error("Gagal mengambil data ayat:", error);
      } finally {
        setLoading(false);
      }
    }
    if (id) {
        fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6 px-4">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-6" />
        <div className="space-y-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!surah) return <div className="p-8 text-center">Surat tidak ditemukan.</div>;

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
          <h2 className="text-3xl font-arabic leading-relaxed text-foreground">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h2>
        </div>
      )}

      {/* Daftar Ayat */}
      <div className="flex flex-col divide-y divide-muted/50">
        {verses.map((verse) => (
          <div key={verse.verse_number} className="py-8 px-4 space-y-8">
            {/* Action Bar Ayat */}
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-primary/20 text-primary text-[10px] font-bold">
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

            {/* Teks Arab */}
            <div className="text-right">
              <p 
                className="text-3xl md:text-4xl font-arabic leading-[2.5] md:leading-[2.8] tracking-wide text-foreground" 
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: verse.text_uthmani }}
              />
            </div>

            {/* Terjemahan Sabeeq Company */}
            <div className="text-left bg-muted/20 p-4 rounded-lg border-l-4 border-accent">
              <p className="text-xs font-bold text-accent-foreground/60 mb-2 uppercase tracking-widest">Terjemahan</p>
              {verse.translations && verse.translations.length > 0 ? (
                <p 
                  className="text-sm md:text-base text-muted-foreground leading-relaxed" 
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
