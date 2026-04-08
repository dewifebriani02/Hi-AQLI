"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, ListTree, GraduationCap, ArrowLeft, ArrowRight, RotateCcw, Lightbulb, Lock, ShieldAlert, CreditCard, Heart, Zap } from "lucide-react";
import Link from "next/link";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import { getMufradatStatus } from "@/lib/mufradat-access";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { useUser } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { cn } from "@/lib/utils";

interface WordData {
  id: number;
  text_uthmani: string;
  translation: {
    text: string;
  };
}

interface VerseDetail {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  translations: { text: string }[];
  words: WordData[];
}

function VerseDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const verseId = params.verseId as string;
  const from = searchParams.get('from');
  const success = searchParams.get('success');
  const currentVerseNum = parseInt(verseId);

  const { user, isUserLoading } = useUser();
  const studyCardRef = useRef<HTMLDivElement>(null);

  const [verse, setVerse] = useState<VerseDetail | null>(null);
  const [surahName, setSurahName] = useState("");
  const [totalVerses, setTotalVerses] = useState(0);
  const [apiTafsir, setApiTafsir] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);

  const [wordCounts, setWordCounts] = useState<Record<number, number>>({});

  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'surah_id', operator: '==', value: Number(id) }
    ]
  }), [user?.id, id]);

  const { data: progress, isLoading: isProgressLoading } = useCollection(user ? "quiz_attempts" : null, progressOptions);

  const { data: registrations, isLoading: isRegLoading } = useCollection(user ? "halaqah_registrations" : null, {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  });

  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection(user ? "voucher_redemptions" : null, {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    select: "*, vouchers(*)"
  });

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);

  const access = useMemo(() => {
    return getMufradatStatus(userData, registrations || [], id, verseId, redemptions || []);
  }, [userData, registrations, id, verseId, redemptions]);

  const completedVerseNumbers = useMemo(() => {
    const passed = new Set<number>();
    if (!progress) return passed;
    
    // Filter by THIS surah ID in memory for accuracy
    progress.forEach(p => {
      if (p.quiz_id.startsWith('mufradat_page_')) return;
      
      // Check if attempt belongs to this surah
      const idMatch = p.quiz_id.match(/mufradat_(\d+)[:|-](\d+)/);
      const sNum = idMatch ? parseInt(idMatch[1]) : Number(p.surah_id);
      if (sNum !== parseInt(id)) return;

      const isPassed = p.is_passed || (Number(p.total_questions) > 0 && Number(p.score) >= Number(p.total_questions));
      
      if (isPassed) {
        let vNum = idMatch ? parseInt(idMatch[2]) : Number(p.verse_id);
        if (vNum > 0) passed.add(vNum);
      }
    });
    return passed;
  }, [progress, id]);

  const isCurrentVerseCompleted = completedVerseNumbers.has(Number(verseId));

  const completedPageQuizzes = useMemo(() => {
    const pageSet = new Set<number>();
    if (!progress) return pageSet;
    progress.forEach(p => {
      if (!p.quiz_id?.startsWith('mufradat_page_')) return;

      // Robust Passed Check
      const isPassed = p.is_passed || (Number(p.total_questions) > 0 && Number(p.score) >= Number(p.total_questions));
      
      if (isPassed) {
        const pNum = parseInt(p.quiz_id.replace('mufradat_page_', ''));
        if (!isNaN(pNum)) pageSet.add(pNum);
      }
    });
    return pageSet;
  }, [progress]);

  // Sequential Learning Guard
  useEffect(() => {
    if (isUserLoading || isProgressLoading || !user || !verse || !progress) return;
    
    // 1. BYPASS for Free Surahs (Al-Fatihah, etc.)
    if (access.isFree) return;

    const vIdx = parseInt(verseId);
    const isFirstVerseOfQuran = parseInt(id) === 1 && vIdx === 1;
    const isFirstVerseOfSurah = vIdx === 1;
    const isPrevVerseDone = completedVerseNumbers.has(vIdx - 1);
    
    // A verse is UNLOCKED if:
    // 1. Subscription is active/paid (!access.isBlocked)
    // 2. AND It's one of the "Start" conditions:
    //    a. It's a Free Verse (Al-Fatihah, etc.)
    //    b. It's the first verse of the Quran (1:1)
    //    c. It's already completed
    //    d. It's the first verse of a surah 
    //    e. Previous verse in the same surah is done
    //    f. User just came from a successful quiz (Optimistic)
    
    // Core check: User MUST have subscription access OR it's a free verse
    const hasProgramAccess = access.isFree || !access.isBlocked;
    const isSequentialPathDone = isFirstVerseOfQuran || isFirstVerseOfSurah || isCurrentVerseCompleted || isPrevVerseDone || success === 'true';

    const isUnlocked = hasProgramAccess && isSequentialPathDone;
    
    if (!isUnlocked) {
      // Grace period: Wait 1500ms before redirecting to allow DB sync
      // This prevents 'flicker' redirects if the user just finished the kuis
      const timer = setTimeout(() => {
        router.push(`/mufradat/${id}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [verse, progress, isProgressLoading, isUserLoading, user, router, id, verseId, isCurrentVerseCompleted, completedVerseNumbers, access.isFree]);
  
  // Fetch latest attempt for THIS specific verse to get wrong_words
  const lastAttemptOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'quiz_id', operator: '==', value: `mufradat_${id}:${verseId}` }
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 1
  }), [user?.id, id, verseId]);

  const { data: lastAttempts } = useCollection(user ? "quiz_attempts" : null, lastAttemptOptions);
  const lastAttempt = useMemo(() => lastAttempts?.[0], [lastAttempts]);
  const wrongWordIds = useMemo(() => new Set<number>(lastAttempt?.wrong_words || []), [lastAttempt]);


  const fetchOfficialTafsir = useCallback(async (chapterId: string, vNum: string) => {
    setApiTafsir(null);
    try {
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_key/${chapterId}:${vNum}?language=id&translations=33`);
      
      if (res.ok) {
        const data = await res.json();
        const tafsirText = data.verse?.translations?.[0]?.text;
        if (tafsirText) {
          setApiTafsir(tafsirText);
        } else {
          setApiTafsir("Penjelasan atau tafsir belum tersedia untuk ayat ini.");
        }
      } else {
        setApiTafsir("Gagal memuat penjelasan dari API Quran.");
      }
    } catch (err) {
      console.error("Tafsir Fetch Error:", err);
      setApiTafsir(null);
    }
  }, []);

  useEffect(() => {
    async function fetchAll() {
      if (!id || !verseId) return;

      // 1. Instantly set Surah metadata from local data for zero-latency header
      const localSurah = QURAN_CHAPTERS.find(c => c.id === Number(id));
      if (localSurah) {
        setSurahName(localSurah.name_simple);
        setTotalVerses(localSurah.verses_count);
      }

      try {
        setLoading(true);
        const [sRes, vRes] = await Promise.all([
          Promise.resolve({ ok: true, json: () => ({ chapter: localSurah }) }), // Use localSurah if available
          fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${verseId}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`)
        ]);

        const [sData, vData] = await Promise.all([sRes.json(), vRes.json()]);
        
        if (sData.chapter) {
          setSurahName(sData.chapter.name_simple);
          setTotalVerses(sData.chapter.verses_count);
        }
        setVerse(vData.verse);

        if (vData.verse) setTimeout(() => fetchOfficialTafsir(id, verseId), 300);
      } catch (e) {
        console.error("Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id, verseId, fetchOfficialTafsir]);

  // Auto-scroll to study section once loaded
  useEffect(() => {
    if (!loading && studyCardRef.current) {
      setTimeout(() => {
        studyCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading]);

  const incrementWordCount = (idx: number) => {
    setWordCounts(prev => ({
      ...prev,
      [idx]: (prev[idx] || 0) + 1
    }));
  };

  const resetWordCounts = () => {
    setWordCounts({});
  };

  if (loading || isUserLoading || isRegLoading || isUserDataLoading || isProgressLoading || isRedemptionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Penjabaran...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32 px-4 sm:px-0">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon" className="text-[#800000]"><Link href={`/mufradat/${id}`}><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">{surahName} : ({verseId})</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Hi Mufradat • Tadabbur Ayat</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild={Boolean(user || access.isFree)} variant="ghost" size="icon" className="text-[#D4AF37]">
            <Link href={(user || access.isFree) ? `/mufradat/${id}/${verseId}/quiz${from ? `?from=${from}` : ''}` : `/login?redirectTo=/mufradat/${id}/${verseId}${from ? `?from=${from}` : ''}`}>
              <GraduationCap className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" disabled={currentVerseNum <= 1} onClick={() => router.push(`/mufradat/${id}/${currentVerseNum - 1}`)}><ArrowLeft className="h-5 w-5" /></Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!!(currentVerseNum >= totalVerses || (!isUserLoading && user && !isCurrentVerseCompleted))}
                    onClick={() => router.push(`/mufradat/${id}/${currentVerseNum + 1}`)}
                  >
                    {!isUserLoading && user && !isCurrentVerseCompleted ? <Lock className="h-4 w-4 text-muted-foreground" /> : <ArrowRight className="h-5 w-5" />}
                  </Button>
                </div>
              </TooltipTrigger>
              {!isUserLoading && user && !isCurrentVerseCompleted && (
                <TooltipContent>
                  <p className="text-[10px]">Selesaikan kuis ayat ini (100%) untuk lanjut</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Soft Reminder Banner */}
      {access.showSoftReminder && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Heart className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-tight text-amber-800">Support Hi AQLI</p>
              <p className="text-[11px] font-medium text-amber-900 leading-tight">
                {access.message}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] h-9 px-4 rounded-xl shrink-0">
            <Link href="/mufradat/billing">INFAQ SEKARANG</Link>
          </Button>
        </div>
      )}

      <Card ref={studyCardRef} className="border-none bg-muted/20 scroll-mt-24">
        <CardContent className="pt-8 pb-10 px-6 text-right" dir="rtl">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-wrap justify-end gap-x-2 gap-y-4 w-full">
              {verse?.words?.filter(w => w.text_uthmani).map((word, wordIdx) => (
                <Tooltip key={wordIdx} open={activeWordIdx === wordIdx} onOpenChange={(o) => o && setActiveWordIdx(wordIdx)}>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0} role="button" onPointerEnter={() => setActiveWordIdx(wordIdx)}
                      className="text-2xl md:text-3xl font-arabic leading-[2] text-foreground hover:text-[#800000] focus:text-[#800000] outline-none cursor-help px-0.5 inline-block"
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
              ))}
            </div>
          </TooltipProvider>
          <div className="max-w-2xl ml-auto text-left mt-8" dir="ltr">
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20 text-[10px] font-bold uppercase">Terjemahan Ayat</Badge>
            <div className="text-lg text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse?.translations[0]?.text || "" }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-[#800000]/5 py-4 flex flex-row items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-base flex items-center gap-2 font-headline">
                <ListTree className="w-4 h-4 text-[#800000]" />
                Penjelasan Kata
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
          <CardContent className="p-0">
            <div className="divide-y" dir="ltr">
              {verse?.words?.filter(w => w.text_uthmani).map((word, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.98] select-none"
                  onClick={() => incrementWordCount(idx)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-muted-foreground w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-2xl font-arabic text-right", wrongWordIds.has(word.id) ? "text-rose-600" : "text-[#800000]")} dir="rtl">{word.text_uthmani}</span>
                        {wrongWordIds.has(word.id) && (
                          <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[8px] font-black h-4 px-1 uppercase tracking-tighter">REVIEW</Badge>
                        )}
                      </div>
                      {wordCounts[idx] > 0 && (
                        <Badge className="bg-[#D4AF37] hover:bg-[#D4AF37] text-black text-[9px] font-bold h-4 px-1 animate-in zoom-in-50 duration-200">
                          x{wordCounts[idx]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">{word.translation.text}</p>
                    <p className="text-[10px] text-muted-foreground italic text-amber-700/60">Ketuk untuk repetisi hafalan</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t bg-muted/10 p-4 flex flex-col gap-3">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black gap-2 py-6 h-14 text-lg rounded-xl shadow-lg border-b-4 border-[#800000]/20">
              <Link href={(user || access.isFree) ? `/mufradat/${id}/${verseId}/quiz${from ? `?from=${from}` : ''}` : `/login?redirectTo=/mufradat/${id}/${verseId}${from ? `?from=${from}` : ''}`}>
                <GraduationCap className="w-5 h-5" />
                {(user || access.isFree) ? (isCurrentVerseCompleted ? "ULANGI UJI HAFALAN" : "MULAI UJI HAFALAN") : "MASUK UNTUK UJI HAFALAN"}
              </Link>
            </Button>

            {isCurrentVerseCompleted && currentVerseNum < totalVerses && (
              <div className="flex flex-col gap-3 w-full">
                <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-6 h-14 text-lg rounded-xl shadow-lg border-b-4 border-black/10 transition-all active:translate-y-1 active:border-b-0 uppercase tracking-widest gap-2">
                  <Link href={`/mufradat/${id}/${currentVerseNum + 1}/quiz${from ? `?from=${from}` : ''}`}>
                    <Zap className="w-5 h-5 fill-current underline" /> MULAI KUIS AYAT {currentVerseNum + 1}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-2 border-[#800000]/20 hover:bg-[#800000]/5 text-[#800000] font-black gap-2 py-6 h-14 text-lg rounded-xl transition-all uppercase tracking-widest">
                  <Link href={`/mufradat/${id}/${currentVerseNum + 1}${from ? `?from=${from}` : ''}`}>
                    TADABBUR AYAT {currentVerseNum + 1}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        <Card className="border-amber-200 bg-amber-50 shadow-sm border-l-4">
          <CardHeader className="py-4 border-b border-amber-100 flex flex-row items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base font-bold font-headline text-amber-900">Tips Hafal Kosakata</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Pahami Akar Kata</strong>: Setiap kata memiliki akar yang memberikan gambaran makna dasar yang kuat.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">2</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Koneksi Makna</strong>: Hubungkan antara kosa kata Arab dan terjemahannya dengan membayangkan maksud ayat tersebut.
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-[#800000]/10 shadow-sm overflow-hidden border-l-4 border-l-[#800000]">
          <CardHeader className="bg-[#800000] text-white py-4">
            <CardTitle className="text-sm flex items-center gap-2 font-headline"><BookOpen className="w-4 h-4" /> Kemenag RI • Penjelasan Ringkas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-white">
            <div className="text-slate-700 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: apiTafsir || "Memuat penjelasan..." }} />
          </CardContent>
        </Card>

      </div>

      {/* Access Blocked Overlay */}
      {access.isBlocked && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-md flex items-center justify-center p-6 sm:p-4">
          <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden animate-in zoom-in duration-300">
             <div className="bg-rose-600 py-10 flex flex-col items-center gap-3 text-white">
                <ShieldAlert className="h-16 w-16" />
                <h2 className="text-2xl font-black font-headline uppercase tracking-widest">Akses Tertutup</h2>
             </div>
             <CardContent className="pt-8 pb-10 space-y-6 text-center">
                <div className="space-y-3">
                   <p className="text-sm font-bold text-slate-800 leading-relaxed px-4">
                      {access.message}
                   </p>
                   <p className="text-[11px] text-muted-foreground italic px-6">
                   </p>
                </div>
                <div className="flex flex-col gap-3 px-4">
                   <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black h-14 rounded-2xl text-lg shadow-lg">
                      <Link href={access.redirectTo || "/mufradat/billing"}>
                         {access.redirectTo?.includes('billing') || !access.redirectTo ? <CreditCard className="mr-2 w-6 h-6" /> : <GraduationCap className="mr-2 w-6 h-6" />}
                         {access.buttonText || (access.status === 'on_leave' ? 'CEK STATUS CUTI' : 'KONFIRMASI PEMBAYARAN')}
                      </Link>
                   </Button>
                   <Button asChild variant="ghost" className="text-muted-foreground font-bold">
                      <Link href="/">Kembali ke Dasbor</Link>
                   </Button>
                </div>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MufradatVerseDetailPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center py-32 gap-4"><Loader2 className="animate-spin text-[#800000]" /><p className="text-sm">Menyiapkan Penjabaran...</p></div>}>
      <VerseDetailContent />
    </Suspense>
  );
}
