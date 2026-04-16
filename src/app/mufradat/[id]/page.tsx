"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Loader2, Info, Mic2, Check, GraduationCap, Lock, Type, Minus, Plus, Target, ArrowRight, Star, ShieldAlert, CreditCard, Heart, BookOpen } from "lucide-react";
import Link from "next/link";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import { getMufradatStatus } from "@/lib/mufradat-access";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { SURAH_START_PAGES } from "@/lib/quran-mapping";
import { Card, CardContent } from "@/components/ui/card";
import { checkIsStudent } from "@/lib/access-control";
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
  page_number: number;
}

interface SurahInfo {
  id: number;
  name_simple: string;
  name_arabic: string;
  translated_name: string;
  verses_count: number;
}

const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy" },
  { id: 2, name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 3, name: "Abdur-Rahman as-Sudais" },
  { id: 6, name: "Mahmoud Khalil Al-Husary" },
  { id: 12, name: "Saud al-Shuraim" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)" },
];

export default function MufradatSurahDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [surah, setSurah] = useState<SurahInfo | null>(null);
  const [nextSurah, setNextSurah] = useState<SurahInfo | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(32);

  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch progress for the current surah to handle locking
  // Unified global progress fetch (no surah filter to avoid type/sync issues)
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'surah_id', operator: '==', value: Number(id) }
    ]
  }), [user?.id, id]);

  const { data: userProgress, isLoading: isUserProgressLoading } = useCollection(
    user ? "quiz_attempts" : null, 
    progressOptions
  );

  const registrationsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  }), [user?.id]);

  const { data: registrations, isLoading: isRegLoading } = useCollection(
    user ? "halaqah_registrations" : null, 
    registrationsOptions
  );

  const redemptionsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    select: "*, vouchers(*)"
  }), [user?.id]);

  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection(
    user ? "voucher_redemptions" : null, 
    redemptionsOptions
  );

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);

  const isStudent = useMemo(() => {
    const fromRegs = checkIsStudent(registrations || []);
    const fromProfile = userData?.mufradat_status === 'active' || userData?.mufradat_status === 'trial';
    return fromRegs || fromProfile;
  }, [registrations, userData]);

  const access = useMemo(() => {
    return getMufradatStatus({
      user: userData, 
      registrations: registrations || [], 
      isStudent, 
      surahId: id, 
      redemptions: redemptions || []
    });
  }, [userData, registrations, isStudent, id, redemptions]);

  const isProgressLoading = isUserProgressLoading;

  // Aggregate all progress and stats for this surah
  const progressData = useMemo(() => {
    const pageQuizzes = new Set<number>();
    const passedVerses = new Set<number>();
    const errorVerses = new Set<number>();
    const stats = new Map<number, { maxScore: number, attempts: number }>();
    
    // Process ALL Attempts from global userProgress
    if (userProgress) {
      userProgress.forEach(p => {
        // Robust Passed Check
        const isPassed = p.is_passed || (Number(p.total_questions) > 0 && Number(p.score) >= Number(p.total_questions));

        // 1. Process Page Quizzes
        if (p.quiz_id?.startsWith('mufradat_page_')) {
          if (isPassed) {
            const pNum = parseInt(p.quiz_id.replace('mufradat_page_', ''));
            if (!isNaN(pNum)) pageQuizzes.add(pNum);
          }
          return;
        }

        // 2. Process Verse Attempts (Filter by THIS surah)
        const idMatch = p.quiz_id.match(/mufradat_(\d+)[:|-](\d+)/);
        const sNum = idMatch ? parseInt(idMatch[1]) : Number(p.surah_id);
        
        // If it belongs to this surah
        if (sNum === parseInt(id)) {
          let vNum = idMatch ? parseInt(idMatch[2]) : Number(p.verse_id);
          if (vNum > 0) {
            const score = Math.round((Number(p.score) / (Number(p.total_questions) || 1)) * 100) || 0;
            
            if (isPassed) {
              passedVerses.add(vNum);
            }
            
            // Update errors
            if (p.wrong_words && p.wrong_words.length > 0) {
              errorVerses.add(vNum);
            }

            // Update Stats
            const current = stats.get(vNum) || { maxScore: 0, attempts: 0 };
            stats.set(vNum, {
              maxScore: Math.max(current.maxScore, score),
              attempts: current.attempts + 1
            });
          }
        }
      });
    }

    return { 
      completedPageQuizzes: pageQuizzes, 
      completedVerseNumbers: passedVerses, 
      versesWithErrors: errorVerses,
      verseStatsMap: stats
    };
  }, [userProgress, id]);

  const { 
    completedPageQuizzes, 
    completedVerseNumbers, 
    versesWithErrors, 
    verseStatsMap 
  } = progressData;

  const currentSurahPassedVerses = completedVerseNumbers;

  // Strict Sequential Guard: Redirect if Surah's starting page is locked
  useEffect(() => {
    // WAIT for ALL essential data to be ready before making a decision
    if (isUserLoading || isUserProgressLoading || isRegLoading || isUserDataLoading || isRedemptionsLoading || !user || !userProgress) return;
    
    const hasAnyProgress = currentSurahPassedVerses.size > 0;
    const sId = Number(id);
    const startPage = SURAH_START_PAGES[sId] || 1;
    const isFreeSurah = [1, 112, 113, 114].includes(sId);
    
    // Lenient Surah Lock
    const isUnlocked = isFreeSurah || isStudent || !access.isBlocked || sId === 2 || currentSurahPassedVerses.size > 0 || (startPage > 1 && completedPageQuizzes.has(startPage - 1));
    
    if (!isUnlocked) {
      // Safety timeout to prevent race conditions during initial rendering
      const timer = setTimeout(() => {
        router.push('/mufradat');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [id, isUserLoading, isUserProgressLoading, isRegLoading, isUserDataLoading, isRedemptionsLoading, user, userProgress, completedPageQuizzes, router, currentSurahPassedVerses, isStudent, access.isBlocked]);

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

        // Fetch next surah info if available (can stay background)

        // Fetch next surah info if available
        const nextId = Number(id) + 1;
        if (nextId <= 114) {
          const nextRes = await fetch(`https://api.quran.com/api/v4/chapters/${nextId}?language=id`);
          const nextData = await nextRes.json();
          setNextSurah(nextData.chapter);
        }

        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani,page_number&per_page=300`
        );
        const verseData = await verseRes.json();

        if (verseData && verseData.verses) {
          setVerses(verseData.verses);
        }
      } catch (err: any) {
        console.error("Quran API Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, toast]);

  // Auto-scroll to last completed verse
  useEffect(() => {
    if (!loading && !isProgressLoading && verses.length > 0 && completedVerseNumbers.size > 0) {
      // Find the highest completed verse number
      const lastCompleted = Math.max(...Array.from(completedVerseNumbers));
      
      if (lastCompleted > 0) {
        // Delay slightly to ensure DOM is ready
        const timer = setTimeout(() => {
          const element = document.getElementById(`verse-${lastCompleted}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, isProgressLoading, verses.length, completedVerseNumbers]);

  useEffect(() => {
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
      toast({ title: "Pilih Qari", description: "Silakan pilih Qari di Mode Mushaf terlebih dahulu." });
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

  const isInitialLoading = loading || isUserLoading || (isRegLoading && (registrations || []).length === 0) || (isUserDataLoading && !userData) || (isUserProgressLoading && (userProgress || []).length === 0) || isRedemptionsLoading;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Surah...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link href="/mufradat"><ChevronLeft className="h-6 w-6 text-[#800000]" /></Link></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold font-headline truncate">{surah?.id}. {surah?.name_simple}</h1>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#800000]">Hi Mufradat • Tadabbur Surah</p>
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

      {/* Multi-state Access Banner */}
      {user && (access.showSoftReminder || access.status === 'trial') && (
        <div className={cn(
          "mx-4 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 border-2 shadow-sm",
          access.status === 'trial' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              access.status === 'trial' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            )}>
              {access.status === 'trial' ? <Zap className="w-5 h-5 fill-current" /> : <Heart className="w-5 h-5 fill-amber-500" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-tight",
                  access.status === 'trial' ? "text-emerald-800" : "text-amber-800"
                )}>
                  {access.status === 'trial' ? "Mode Trial Aktif" : "Support Hi AQLI"}
                </p>
                {access.status === 'trial' && <Badge className="bg-emerald-500 text-white text-[8px] h-4">AKSES PENUH</Badge>}
              </div>
              <p className={cn(
                "text-[11px] font-medium leading-tight",
                access.status === 'trial' ? "text-emerald-900" : "text-amber-900"
              )}>
                {access.message}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className={cn(
            "font-black text-[10px] h-9 px-4 rounded-xl shrink-0 shadow-sm",
            access.status === 'trial' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"
          )}>
            <Link href="/mufradat/billing">
              {access.status === 'trial' ? 'STATUS' : 'INFAQ SEKARANG'}
            </Link>
          </Button>
        </div>
      )}
        <div className="sm:hidden flex justify-center">
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border w-full justify-between px-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ukuran Teks</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#800000]" onClick={() => adjustFontSize(-4)}><Minus className="h-4 w-4" /></Button>
              <span className="text-xs font-bold w-6 text-center">{fontSize}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#800000]" onClick={() => adjustFontSize(4)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Murajaah Quiz Banner - Access after completing enough verses */}
      {completedVerseNumbers.size >= Math.min(verses.length, 3) && (
        <Link href={`/mufradat/${id}/murajaah`} className="block">
          <Card className="mx-4 mt-4 bg-gradient-to-r from-[#800000] to-[#b91c1c] text-white border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Target className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline">MURAJAAH KOSAKATA</h3>
                  <p className="text-sm opacity-90 text-white/80">Uji hafalan kosakata tersulit dalam surah ini</p>
                </div>
              </div>
              {versesWithErrors.size > 0 && (
                <div className="flex items-center gap-2 mt-2 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest animate-pulse">Perlu Review: {versesWithErrors.size} Ayat</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="flex flex-col divide-y">
        <TooltipProvider delayDuration={0}>
          {verses.map((verse, index) => {
            const prevVerse = index > 0 ? verses[index - 1] : null;
            const isQuranStart = id === "1" && verse.verse_number === 1;
            const isFirstVerse = verse.verse_number === 1;
            const isNewPage = prevVerse && verse.page_number !== prevVerse.page_number;
            
            // Completion checks
            const isCompleted = completedVerseNumbers.has(verse.verse_number);
            
            // Sequential rule: Verse V is unlocked if previous verse is done
            const isPrevVerseDone = isFirstVerse || completedVerseNumbers.has(prevVerse?.verse_number || 0);

            // A verse is UNLOCKED if:
            // 1. It is a Free Surah (Fatihah & 3 Qul)
            // 2. OR It is the very first verse of the Quran (1:1)
            // 3. OR It's already completed (Passed)
            // 4. OR Previous verse is done (Linear flow)
            const isFreeSurah = [1, 112, 113, 114].includes(Number(id));
            const isUnlockedByContext = isFreeSurah || isPrevVerseDone;
            const isLocked = !isFreeSurah && !isQuranStart && !isCompleted && !isUnlockedByContext;

            return (
              <div key={verse.id}>
                {/* Page Break Indicator (Optional, but keeping UI clean as requested) */}
                {isNewPage && (
                  <div className="mx-8 my-4 h-px bg-slate-100 relative">
                     <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-white text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                       Halaman {verse.page_number}
                     </span>
                  </div>
                )}

                <div 
                  id={`verse-${verse.verse_number}`}
                  className={cn("py-12 px-4 space-y-8 transition-opacity border-b border-dashed border-slate-100", isLocked && "opacity-60")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#800000] opacity-40">
                      <span className="text-xs font-black border-[#800000]/20 border-r pr-3">{verse.verse_key}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button asChild={!isLocked} variant="outline" className={cn(
                        "w-48 h-10 gap-2 font-black text-[10px] rounded-full transition-all active:scale-[0.95] shadow-sm uppercase tracking-widest",
                        isLocked ? "bg-muted text-muted-foreground border-muted cursor-not-allowed" :
                          isCompleted ? "bg-[#D4AF37] text-black border-[#800000]/20 hover:bg-[#D4AF37]/90" :
                            "bg-white text-[#800000] border-[#800000]/20 hover:bg-[#800000]/5"
                      )} disabled={isLocked}>
                        {isLocked ? (
                          <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> TERKUNCI</span>
                        ) : (
                          <Link href={`/mufradat/${id}/${verse.verse_number}?from=surah`}>
                            {isCompleted ? (
                              versesWithErrors.has(verse.verse_number) ? (
                                <span className="flex items-center gap-2 text-rose-600"><Star className="w-3.5 h-3.5 fill-current" /> REVIEW AYAT</span>
                              ) : (
                                <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> PELAJARI LAGI</span>
                              )
                            ) : (
                              <span className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> MULAI UJI HAFALAN</span>
                            )}
                          </Link>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleAudio(verse.verse_key)} disabled={isLocked} className="text-[#800000]">
                        {loadingAudioKey === verse.verse_key ? <Loader2 className="animate-spin h-4 w-4" /> : playingKey === verse.verse_key ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Terjemah per Kata</p>
                      {/* Verse Stats Badge */}
                      {(() => {
                        const vStats = verseStatsMap.get(verse.verse_number);
                        if (vStats && vStats.attempts > 0) {
                          return (
                            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                              <span className={cn("text-[10px] font-black", vStats.maxScore === 100 ? "text-emerald-600" : "text-amber-600")}>🎯 {vStats.maxScore}%</span>
                              <span className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">🔄 {vStats.attempts}x</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    
                    <div className={cn("flex flex-wrap justify-start gap-x-3 gap-y-4 w-full", isLocked && "blur-[2px] select-none")} dir="rtl">
                      {verse.words?.map((word, wordIdx) => {
                        const wordKey = `${verse.verse_key}-${wordIdx}`;
                        return (
                          <Tooltip key={wordKey} open={activeWordKey === wordKey && !isLocked} onOpenChange={(o) => o && setActiveWordKey(wordKey)}>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={isLocked ? -1 : 0}
                                role="button"
                                onPointerEnter={() => !isLocked && setActiveWordKey(wordKey)}
                                style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                                className={cn(
                                  "font-arabic text-foreground/90 outline-none transition-colors px-0.5 inline-block",
                                  !isLocked && "hover:text-[#800000] focus:text-[#800000] cursor-help"
                                )}
                              >
                                {word.text_uthmani}
                              </span>
                            </TooltipTrigger>
                            {!isLocked && (
                              <TooltipPortal>
                                <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                                  <p className="text-xs font-medium">{word.translation?.text || "..."}</p>
                                </TooltipContent>
                              </TooltipPortal>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  <div className={cn("text-left bg-[#800000]/5 p-5 rounded-xl border-l-4 shadow-sm", isLocked ? "border-muted" : "border-[#800000]")}>
                    <p className={cn("text-[10px] font-bold mb-2 uppercase tracking-widest", isLocked ? "text-muted-foreground" : "text-[#800000]")}>
                      Terjemahan Ayat
                    </p>
                    <div className={cn("text-base leading-relaxed text-slate-700", isLocked ? "text-muted-foreground italic" : "text-foreground/90 font-medium")}>
                      {isLocked ? (
                        "Selesaikan kuis ayat sebelumnya untuk membaca terjemahan ini."
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Next Surah Button */}
      {nextSurah && (
        <div className="px-4 pb-12 pt-8">
          <Link href={`/mufradat/${nextSurah.id}`}>
            <Card className="bg-white border-2 border-dashed border-[#800000]/20 hover:border-[#800000]/40 hover:bg-[#800000]/5 transition-all cursor-pointer group rounded-2xl overflow-hidden shadow-md">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-muted/50 rounded-full group-hover:scale-110 transition-transform">
                  <ArrowRight className="w-6 h-6 text-[#800000]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Surah Selanjutnya</p>
                  <h3 className="text-2xl font-black font-headline text-[#800000]">
                    {nextSurah.id}. {nextSurah.name_simple}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">Lanjut pelajari tadabbur kosa kata berikutnya</p>
                </div>
                <Button className="mt-4 bg-[#800000] hover:bg-[#800000]/90 text-white font-bold rounded-full px-8 h-12 shadow-lg group-hover:px-10 transition-all">
                  MULAI SEKARANG
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
      {/* Access Blocked Overlay - Only show if not a Free Surah or if user is logged in but blocked */}
      {(![1, 112, 113, 114].includes(parseInt(id)) || (user && access.isBlocked)) && access.isBlocked && (
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
                         {access.status === 'inactive' ? <BookOpen className="mr-2 w-6 h-6" /> : <CreditCard className="mr-2 w-6 h-6" />} 
                         {access.status === 'on_leave' ? 'CEK STATUS CUTI' : access.status === 'inactive' ? 'DAFTAR PROGRAM SEKARANG' : 'KONFIRMASI PEMBAYARAN'}
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
