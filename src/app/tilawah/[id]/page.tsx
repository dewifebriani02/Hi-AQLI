"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Play, Share2, Bookmark, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Verse {
  verse_number: number;
  text_uthmani: string;
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

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Surah Info
        const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const infoData = await infoRes.json();
        setSurah(infoData.chapter);

        // Fetch Verses with Uthmani text and Indonesian translation (ID 33: Kemenag-RI)
        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=false&translations=33&fields=text_uthmani`
        );
        const verseData = await verseRes.json();
        setVerses(verseData.verses);
      } catch (error) {
        console.error("Gagal mengambil data ayat:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-10">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-6" />
        <div className="space-y-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!surah) return <div>Surat tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-2 border-b">
        <Button asChild variant="ghost" size="icon">
          <Link href="/tilawah">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold font-headline">{surah.name_simple}</h1>
          <p className="text-xs text-muted-foreground">{surah.translated_name.name}</p>
        </div>
      </div>

      {/* Bismillah Banner (Except for At-Tawbah and Al-Fatihah shows as first verse) */}
      {id !== "1" && id !== "9" && (
        <div className="text-center py-8">
          <h2 className="text-4xl font-arabic">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h2>
        </div>
      )}

      {/* Verses List */}
      <div className="flex flex-col gap-6">
        {verses.map((verse) => (
          <Card key={verse.verse_number} className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-4">
              {/* Verse Actions & Number */}
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {verse.verse_number}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Arabic Text */}
              <div className="text-right py-4">
                <p 
                  className="text-3xl font-arabic leading-loose tracking-wide dir-rtl" 
                  dir="rtl"
                  dangerouslySetInnerHTML={{ __html: verse.text_uthmani }}
                />
              </div>

              {/* Translation */}
              <div className="text-left pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: verse.translations[0].text }} />
              </div>
              <div className="border-b border-muted/50 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}