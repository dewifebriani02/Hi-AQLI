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
import { useCollection, useDoc } from "@/supabase/db";
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

import { checkIsStudent, isMushafPageFree } from "@/lib/access-control";

export default function MufradatPageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageIdId = params.id as string;
  const pageNum = parseInt(pageIdId);

  const { user, isUserLoading } = useUser();
  const { data: registrations } = useCollection("halaqah_registrations", user?.id ? {
    filters: [{ column: 'user_id', operator: '==', value: user.id }]
  } : undefined);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);
  const isStudent = useMemo(() => {
    const fromRegs = checkIsStudent(registrations);
    const fromProfile = userData?.mufradat_status === 'active' || userData?.mufradat_status === 'trial';
    return fromRegs || fromProfile;
  }, [registrations, userData]);

  useEffect(() => {
    if (!isUserLoading && !isUserDataLoading && !isStudent && !isMushafPageFree(pageNum)) {
      router.push('/mufradat');
    }
  }, [pageNum, isStudent, isUserLoading, isUserDataLoading, router]);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});

  const juzNum = useMemo(() => getJuzForPage(pageNum), [pageNum]);

  const { data: allProgress, isLoading: isProgressLoading } = useCollection("quiz_attempts", {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  });

  const passedVerseKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!allProgress) return keys;
    allProgress.forEach(p => {
      if (p.is_passed && p.quiz_id?.startsWith('mufradat_')) {
        // Handle mufradat_2:142 style quiz_ids
        const key = p.quiz_id.replace('mufradat_', '');
        if (key.includes(':')) keys.add(key);
      }
    });
    return keys;
  }, [allProgress]);

  const isAllVersesPassed = useMemo(() => {
    if (verses.length === 0) return false;
    return verses.every(v => passedVerseKeys.has(v.verse_key));
  }, [verses, passedVerseKeys]);

  const passedCountInPage = useMemo(() => {
    return verses.filter(v => passedVerseKeys.has(v.verse_key)).length;
  }, [verses, passedVerseKeys]);

  // Page Quiz progress
  const isPageCompleted = useMemo(() => {
    if (!allProgress) return false;
    // Check for 100% mastery specifically (is_passed now represents 100% after our update)
    return allProgress.some(p => p.quiz_id === `mufradat_page_${pageNum}` && (p.is_passed || Number(p.score) === Number(p.total_questions)));
  }, [allProgress, pageNum]);

  // Sequential Guard Logic
  const isPrevPageDone = useMemo(() => {
    if (pageNum <= 1) return true;
    if (!allProgress) return false;

    // Check 1: Was the Page Quiz completed?
    const quizDone = allProgress.some(p => 
      p.quiz_id === `mufradat_page_${pageNum - 1}` && (p.is_passed || Number(p.score) === Number(p.total_questions))
    );
    if (quizDone) return true;

    // Check 2: Were all verses on the previous page completed?
    // High-level indicator: if they are a student and have passed activity on the prev page, 
    // we allow entry to avoid the "jump" bug, especially since they clicked it in the dashboard.
    const hasActivityOnPrev = allProgress.some(p => 
      String(p.page_id) === String(pageNum - 1) && p.is_passed
    );
    
    return isStudent && hasActivityOnPrev;
  }, [allProgress, pageNum, isStudent]);

  useEffect(() => {
    if (isProgressLoading || pageNum <= 1) return;
    
    // If not done, we don't redirect immediately to avoid the "jumping" bug
    // instead we will show a "Locked" UI state.
    if (!isPrevPageDone && !isProgressLoading) {
      // Small timeout to allow everything to settle
      const timer = setTimeout(() => {
         // router.push(`/mufradat/page/${pageNum - 1}`); 
         // Optional: we can redirect after showing the locked state for a bit
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPrevPageDone, isProgressLoading, pageNum, router]);

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

  if (loading || isProgressLoading) return <div className="flex flex-col items-center py-32 gap-4"><Loader2 className="animate-spin text-[#800000]" /><p className="text-sm font-bold opacity-60 uppercase tracking-widest">Menyiapkan Halaman {pageNum}...</p></div>;

  // Handle Locked State UI
  if (!isPrevPageDone && pageNum > 1 && !isMushafPageFree(pageNum)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-6 text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center relative">
          <Lock className="w-12 h-12 text-amber-600" />
          <Layout className="w-6 h-6 text-amber-900 absolute -bottom-1 -right-1" />
        </div>
        <div>
          <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-slate-900 mb-2">Halaman Terkunci</h2>
          <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
            Selesaikan kuis atau semua ayat di <strong>Halaman {pageNum - 1}</strong> terlebih dahulu untuk membuka halaman ini.
          </p>
        </div>
        <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 font-black uppercase text-[10px] tracking-widest h-14 px-8 rounded-2xl shadow-lg border-b-4 border-[#600000]">
          <Link href={`/mufradat/page/${pageNum - 1}`}>KEMBALI KE HALAMAN {pageNum - 1}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32 px-4 sm:px-0">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon" className="text-[#800000]"><Link href="/mufradat?tab=juz"><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Mushaf Halaman {pageNum}</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Hi Mufradat • Juz {juzNum}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            asChild={isAllVersesPassed} 
            variant="ghost" 
            size={isAllVersesPassed ? "icon" : "default"} 
            className={cn(
              "text-[#D4AF37] transition-all",
              !isAllVersesPassed && "bg-amber-50 text-amber-600 px-3 gap-2 hover:bg-amber-100 border border-amber-200"
            )}
            disabled={!isAllVersesPassed}
          >
            {isAllVersesPassed ? (
              <Link href={`/mufradat/page/${pageNum}/quiz`}>
                <GraduationCap className="h-5 w-5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-tighter">
                <Lock className="w-3.5 h-3.5" /> PROGRES: {passedCountInPage}/{verses.length} AYAT
              </div>
            )}
          </Button>
          <Button variant="ghost" size="icon" disabled={pageNum <= 1} onClick={() => router.push(`/mufradat/page/${pageNum - 1}`)}><ArrowLeft className="h-5 w-5" /></Button>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={pageNum >= 604 || !isPageCompleted} 
            onClick={() => isPageCompleted && router.push(`/mufradat/page/${pageNum + 1}`)} 
            className={cn(
              "transition-all duration-300", 
              !isPageCompleted && "text-muted-foreground/20 opacity-20 pointer-events-none cursor-not-allowed"
            )}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="border-none bg-muted/20">
        <CardContent className="pt-8 pb-10 px-6 text-right" dir="rtl">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col items-start gap-10 w-full">
              {verses.map((verse) => (
                <div key={verse.id} className="flex flex-col items-start w-full gap-2">
                  <div className="flex flex-wrap justify-start gap-x-2 gap-y-4 w-full" dir="rtl">
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
                  <Link 
                    href={`/mufradat/${verse.verse_key.split(':')[0]}/${verse.verse_key.split(':')[1]}?from=page`}
                    className="text-[10px] font-black text-[#800000]/60 self-center mx-1 font-sans rotate-0 border border-[#800000]/20 px-1.5 rounded hover:bg-[#800000] hover:text-white transition-all shadow-sm"
                    title="Buka Detail Per Ayat"
                  >
                    ({verse.verse_number})
                  </Link>
                  </div>
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
              <Link href={user ? `/mufradat/page/${pageNum}/quiz?from=juz` : `/login?redirectTo=/mufradat/page/${pageNum}?tab=juz`}>
                <GraduationCap className="w-5 h-5" />
                {user ? (isPageCompleted ? "ULANGI UJI HAFALAN" : "MULAI UJI HAFALAN 30 KATA") : "MASUK UNTUK UJI HAFALAN"}
              </Link>
            </Button>
            
            {isPageCompleted && pageNum < 604 && (
              <Button asChild variant="outline" className="w-full border-2 border-emerald-500/20 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-black gap-2 py-6 h-14 text-lg rounded-xl transition-all shadow-sm">
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
