"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, ListTree, GraduationCap, ArrowLeft, ArrowRight, RotateCcw, Lightbulb, Lock, Layout } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { getJuzForPage } from "@/lib/quran-mapping";

interface WordData {
  id: number;
  text_uthmani: string;
  translation: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  translations: { text: string }[];
  words: WordData[];
}

export default function MufradatPageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageIdId = params.id as string;
  const pageNum = parseInt(pageIdId);

  const { user, isUserLoading } = useUser();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});

  const juzNum = useMemo(() => getJuzForPage(pageNum), [pageNum]);

  // Progress tracking: for pages, we use a separate quiz_id format: "mufradat_page_{pageNum}"
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'quiz_id', operator: '==', value: `mufradat_page_${pageNum}` },
      { column: 'is_passed', operator: '==', value: true }
    ]
  }), [user?.id, pageNum]);

  const { data: progress } = useCollection("quiz_attempts", user ? progressOptions : undefined);
  const isPageCompleted = useMemo(() => progress && progress.length > 0, [progress]);

  // Fetch latest attempt to get wrong_words for review
  const lastAttemptOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'quiz_id', operator: '==', value: `mufradat_page_${pageNum}` }
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 1
  }), [user?.id, pageNum]);

  const { data: lastAttempts } = useCollection("quiz_attempts", user ? lastAttemptOptions : undefined);
  const lastAttempt = useMemo(() => lastAttempts?.[0], [lastAttempts]);
  const wrongWordIds = useMemo(() => new Set<number>(lastAttempt?.wrong_words || []), [lastAttempt]);

  const fetchPageData = useCallback(async () => {
    if (!pageNum) return;
    try {
      setLoading(true);
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pageNum}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`);
      const data = await res.json();
      setVerses(data.verses);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [pageNum]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const incrementWordCount = (key: string) => {
    setWordCounts(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));
  };

  const resetWordCounts = () => {
    setWordCounts({});
  };

  if (loading) return <div className="flex flex-col items-center py-32 gap-4"><Loader2 className="animate-spin text-[#800000]" /><p className="text-sm font-bold opacity-60 uppercase tracking-widest">Menyiapkan Halaman {pageNum}...</p></div>;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32 px-4 sm:px-0">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon" className="text-[#800000]"><Link href="/mufradat"><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Mushaf Halaman {pageNum}</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Hi Mufradat • Juz {juzNum}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="text-[#D4AF37]"><Link href={`/mufradat/page/${pageNum}/quiz`}><GraduationCap className="h-5 w-5" /></Link></Button>
          <Button variant="ghost" size="icon" disabled={pageNum <= 1} onClick={() => router.push(`/mufradat/page/${pageNum - 1}`)}><ArrowLeft className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" disabled={pageNum >= 604} onClick={() => router.push(`/mufradat/page/${pageNum + 1}`)}><ArrowRight className="h-5 w-5" /></Button>
        </div>
      </div>

      <Card className="border-none bg-muted/20">
        <CardContent className="pt-8 pb-10 px-6 text-right" dir="rtl">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-wrap justify-end gap-x-2 gap-y-6 w-full">
              {verses.map((verse) => (
                <div key={verse.id} className="flex flex-wrap justify-end gap-x-2">
                  {verse.words.filter(w => w.text_uthmani).map((word, wordIdx) => {
                    const wordKey = `${verse.id}-${wordIdx}`;
                    return (
                      <Tooltip key={wordKey} open={activeWordKey === wordKey} onOpenChange={(o) => o && setActiveWordKey(wordKey)}>
                        <TooltipTrigger asChild>
                          <span
                            tabIndex={0} role="button" onPointerEnter={() => setActiveWordKey(wordKey)}
                            className="text-2xl md:text-3xl font-arabic leading-[1.8] text-foreground hover:text-[#800000] focus:text-[#800000] outline-none cursor-help px-0.5 inline-block transition-colors"
                          >
                            {word.text_uthmani}
                            {wrongWordIds.has(word.id) && (
                              <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                            )}
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
                  <span className="text-sm font-bold text-muted-foreground self-center mx-1 font-serif rotate-0 border border-muted px-1.5 rounded opacity-50">({verse.verse_number})</span>
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-[#800000]/5 py-4 flex flex-row items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-base flex items-center gap-2 font-headline">
                <ListTree className="w-4 h-4 text-[#800000]" />
                Penjelasan Kata Halaman {pageNum}
              </CardTitle>
              <p className="text-[11px] text-amber-900 font-medium leading-snug">
                <strong>Repetisi</strong>: Ulangi setiap kata sebanyak minimal 5 kali dengan mengetuk baris kata pada daftar di bawah.
                {wrongWordIds.size > 0 && (
                  <span className="block mt-1 text-rose-600 animate-pulse">Ada {wrongWordIds.size} kata yang salah pada kuis terakhir. Mari review!</span>
                )}
              </p>
            </div>
            {Object.keys(wordCounts).length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetWordCounts} className="text-[10px] font-bold text-muted-foreground uppercase gap-1 mt-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto overflow-x-hidden">
            <div className="divide-y" dir="ltr">
              {verses.flatMap(v => v.words.filter(w => w.text_uthmani).map((word, idx) => ({ word, verse: v, idx }))).map(({ word, verse, idx }, globalIdx) => {
                const wordKey = `${verse.id}-${idx}`;
                return (
                  <div
                    key={wordKey}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.98] select-none"
                    onClick={() => incrementWordCount(wordKey)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-border/50",
                        wrongWordIds.has(word.id) ? "bg-rose-500 text-white border-rose-600" : "bg-muted text-muted-foreground"
                      )}>
                        {globalIdx + 1}
                      </span>
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-2xl font-arabic text-right", wrongWordIds.has(word.id) ? "text-rose-600" : "text-[#800000]")} dir="rtl">{word.text_uthmani}</span>
                          {wrongWordIds.has(word.id) && (
                            <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[8px] font-black h-4 px-1 uppercase tracking-tighter">REVIEW</Badge>
                          )}
                        </div>
                        {wordCounts[wordKey] > 0 && (
                          <Badge className="bg-[#D4AF37] hover:bg-[#D4AF37] text-black text-[9px] font-bold h-4 px-1 animate-in zoom-in-50 duration-200">
                            x{wordCounts[wordKey]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-sm font-medium">{word.translation?.text}</p>
                      <p className="text-[10px] text-muted-foreground italic text-amber-700/60">Ayat {verse.verse_number}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t bg-muted/10 p-4 flex flex-col gap-3">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black gap-2 py-6 h-14 text-lg rounded-xl shadow-lg border-b-4 border-[#800000]/20">
              <Link href={user ? `/mufradat/page/${pageNum}/quiz` : `/login?redirectTo=/mufradat/page/${pageNum}`}>
                <GraduationCap className="w-5 h-5" />
                {user ? (isPageCompleted ? "ULANGI UJI HAFALAN" : "MULAI UJI HAFALAN 30 KATA") : "MASUK UNTUK UJI HAFALAN"}
              </Link>
            </Button>
            
            {isPageCompleted && pageNum < 604 && (
              <Button asChild variant="outline" className="w-full border-2 border-[#800000]/20 hover:bg-[#800000]/5 text-[#800000] font-black gap-2 py-6 h-14 text-lg rounded-xl transition-all">
                <Link href={`/mufradat/page/${pageNum + 1}`}>
                  LANJUT KE HALAMAN {pageNum + 1}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-amber-200 bg-amber-50 shadow-sm border-l-4">
          <CardHeader className="py-4 border-b border-amber-100 flex flex-row items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base font-bold font-headline text-amber-900">Target Hafalan Halaman</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>30 Kata Unggulan</strong>: Kuis per halaman akan menguji 30 kata paling sulit untuk memastikan hafalan kosakata Anda kuat.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">2</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Standard Mushaf</strong>: Mengikuti pembagian halaman Mushaf Madinah agar memudahkan visualisasi hafalan.
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
