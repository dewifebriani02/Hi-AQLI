"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Loader2, Lock, Type, Minus, Plus, Target, ArrowRight, Star, ShieldAlert, CreditCard, Heart, BookOpen, GraduationCap, Check, Grid3X3, ChevronDown, ChevronUp, X, Zap } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { JUZ_PAGE_MAPPING, getJuzForPage } from "@/lib/quran-mapping";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { checkIsStudent, checkIsVerifiedStudent } from "@/lib/access-control";

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

export default function MufradatJuzDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string; // Juz ID
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(32);
  const [isIndexOpen, setIsIndexOpen] = useState(false);

  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showReminder, setShowReminder] = useState(true);

  // Fetch progress for this Juz
  const { data: userProgress, isLoading: isUserProgressLoading } = useCollection(user ? "quiz_attempts" : null, {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id }
    ]
  });

  const { data: registrations, isLoading: isRegLoading } = useCollection(user ? "halaqah_registrations" : null, {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  });

  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection(user ? "voucher_redemptions" : null, {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    select: "*, vouchers(*)"
  });

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);

  const isStudent = useMemo(() => {
    const fromRegs = checkIsStudent(registrations || []);
    const fromProfile = userData?.mufradat_status === 'active' || userData?.mufradat_status === 'trial';
    return fromRegs || fromProfile;
  }, [registrations, userData]);

  const isVerifiedStudent = useMemo(() => {
    const fromRegs = checkIsVerifiedStudent(registrations || []);
    const fromProfile = userData?.mufradat_status === 'active';
    return fromRegs || fromProfile;
  }, [registrations, userData]);

  const access = useMemo(() => {
    // For Juz access, we check if the user has access to the first page of this Juz
    const pageMapping = JUZ_PAGE_MAPPING[parseInt(id)];
    const startPage = pageMapping?.startPage;
    return getMufradatStatus({
      user: userData, 
      registrations: registrations || [], 
      isStudent, 
      pageId: startPage, 
      redemptions: redemptions || []
    });
  }, [userData, registrations, isStudent, id, redemptions]);

  const progressData = useMemo(() => {
    const passedVerses = new Set<string>(); // "surahId:verseId"
    const errorVerses = new Set<string>();
    const stats = new Map<string, { maxScore: number, attempts: number }>();
    
    if (userProgress) {
        userProgress.forEach(p => {
          const isPassed = p.is_passed || (Number(p.total_questions) > 0 && Number(p.score) >= Number(p.total_questions));
          
          if (!p.quiz_id?.startsWith('mufradat_page_') && !p.quiz_id?.startsWith('mufradat_juz_exam_')) {
            const key = `${p.surah_id}:${p.verse_id}`;
            const score = Math.round((Number(p.score) / (Number(p.total_questions) || 1)) * 100) || 0;
            
            if (isPassed) passedVerses.add(key);
            if (p.wrong_words && p.wrong_words.length > 0) errorVerses.add(key);

            const current = stats.get(key) || { maxScore: 0, attempts: 0 };
            stats.set(key, {
              maxScore: Math.max(current.maxScore, score),
              attempts: current.attempts + 1
            });
          }
        });
    }

    return { passedVerses, errorVerses, verseStatsMap: stats };
  }, [userProgress]);

  const { passedVerses, errorVerses, verseStatsMap } = progressData;

  // Group verses by Surah for the Index
  const groupedVerses = useMemo(() => {
    const groups: { surahId: number; surahName: string; verses: Verse[] }[] = [];
    verses.forEach(v => {
      const sId = parseInt(v.verse_key.split(':')[0]);
      let group = groups.find(g => g.surahId === sId);
      if (!group) {
        const surahInfo = QURAN_CHAPTERS.find(c => c.id === sId);
        group = { 
          surahId: sId, 
          surahName: surahInfo?.name_simple || `Surah ${sId}`, 
          verses: [] 
        };
        groups.push(group);
      }
      group.verses.push(v);
    });
    return groups;
  }, [verses]);

  const scrollToVerse = (verseKey: string) => {
    const verseIdKey = verseKey.replace(':', '-');
    const element = document.getElementById(`verse-${verseIdKey}`);
    if (element) {
      const headerOffset = 180; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      // Flash highlight
      element.classList.add('bg-[#800000]/5');
      setTimeout(() => element.classList.remove('bg-[#800000]/5'), 2000);
      
      setIsIndexOpen(false); // Close index after jumping on mobile
    }
  };

  useEffect(() => {
    if (isUserLoading || isUserDataLoading) return;
    const isFreeJuz = parseInt(id) === 1;
    if (!(isVerifiedStudent || access.status === 'trial') && !isFreeJuz && access.isBlocked) {
      router.push('/mufradat?tab=juz');
    }
  }, [id, isUserLoading, isUserDataLoading, isVerifiedStudent, access.isBlocked, access.status, router]);

  useEffect(() => {
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) setSelectedReciterId(parseInt(savedReciter));

    const savedSize = localStorage.getItem('aqli_mushaf_font_size');
    if (savedSize) setFontSize(parseInt(savedSize));

    async function fetchVerses() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_juz/${id}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani,page_number&per_page=1000`
        );
        const data = await res.json();
        if (data && data.verses) {
          setVerses(data.verses);
        }
      } catch (err) {
        console.error("Juz Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVerses();
  }, [id]);

  // Auto-scroll to last completed verse in this Juz
  useEffect(() => {
    if (!loading && !isUserProgressLoading && verses.length > 0 && passedVerses.size > 0) {
      // Find the last completed verse that belongs to this Juz
      let lastCompletedKey = null;
      for (let i = verses.length - 1; i >= 0; i--) {
        if (passedVerses.has(verses[i].verse_key)) {
          lastCompletedKey = verses[i].verse_key;
          break;
        }
      }
      
      if (lastCompletedKey) {
        const timer = setTimeout(() => {
          scrollToVerse(lastCompletedKey);
        }, 1200); // Slightly longer delay to ensure full rendering
        return () => clearTimeout(timer);
      }
    }
  }, [loading, isUserProgressLoading, verses, passedVerses]);

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(20, Math.min(fontSize + delta, 64));
    setFontSize(newSize);
    localStorage.setItem('aqli_mushaf_font_size', newSize.toString());
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

  if (loading || isUserLoading || isRegLoading || isUserDataLoading || isUserProgressLoading || isRedemptionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Juz {id}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link href="/mufradat?tab=juz"><ChevronLeft className="h-6 w-6 text-[#800000]" /></Link></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold font-headline truncate">Juz {id}</h1>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#800000]">Hi Mufradat • Tadabbur per Juz</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsIndexOpen(!isIndexOpen)}
                className={cn(
                  "gap-2 font-bold transition-all rounded-full px-4 border-2",
                  isIndexOpen ? "bg-[#800000] text-white border-[#800000]" : "text-[#800000] border-[#800000]/10 hover:border-[#800000]/30"
                )}
            >
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Daftar Ayat</span>
                {isIndexOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
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

        {/* Verse Index Grid Overlay/Section */}
        {isIndexOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b shadow-2xl z-20 max-h-[70vh] overflow-y-auto animate-in slide-in-from-top-4 duration-300">
            <div className="p-6 space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Indeks Ayat Juz {id}</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                       <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" /> Selesai
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                       <div className="w-2.5 h-2.5 rounded-full border border-slate-200" /> Belum
                    </div>
                  </div>
               </div>

               <div className="space-y-8">
                  {groupedVerses.map(group => (
                    <div key={group.surahId} className="space-y-3">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]/40">Surah</span>
                          <h4 className="font-black text-xs uppercase tracking-tight text-slate-600 border-b-2 border-slate-100 pb-1">{group.surahId}. {group.surahName}</h4>
                       </div>
                       <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
                          {group.verses.map(v => {
                            const isDone = passedVerses.has(v.verse_key);
                            return (
                              <button
                                key={v.id}
                                onClick={() => scrollToVerse(v.verse_key)}
                                className={cn(
                                  "h-10 rounded-xl text-[10px] font-black transition-all active:scale-90 flex items-center justify-center border shadow-sm",
                                  isDone 
                                    ? "bg-[#D4AF37] text-black border-[#800000]/10" 
                                    : "bg-white text-slate-400 border-slate-100 hover:border-[#800000]/20 hover:text-[#800000]"
                                )}
                              >
                                {v.verse_key.split(':')[1]}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

      </div>
 
      {/* Soft Reminder Banner */}
      {access.showSoftReminder && showReminder && (
          <div className="mx-4 bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl flex flex-col gap-4 animate-in slide-in-from-top-4 shadow-sm relative mb-4">
              <button 
                onClick={() => setShowReminder(false)}
                className="absolute top-3 right-3 p-1 hover:bg-amber-100 rounded-full transition-colors text-amber-600"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-4 pr-6">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <Heart className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-tight text-amber-800">Support Hi AQLI</p>
                      <p className="text-[11px] font-medium text-amber-900 leading-tight">{access.message}</p>
                  </div>
              </div>
              <Button asChild size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] h-11 rounded-xl shadow-lg shadow-amber-200/50 transition-all active:scale-[0.98]">
                  <Link href="/mufradat/billing">INFAQ SEKARANG</Link>
              </Button>
          </div>
      )}



      <div className="flex flex-col divide-y">
        <TooltipProvider delayDuration={0}>
          {verses.map((verse, index) => {
            const prevVerse = index > 0 ? verses[index - 1] : null;
            const surahId = parseInt(verse.verse_key.split(':')[0]);
            const prevSurahId = prevVerse ? parseInt(prevVerse.verse_key.split(':')[0]) : null;
            const isNewSurah = surahId !== prevSurahId;
            const surahInfo = isNewSurah ? QURAN_CHAPTERS.find(c => c.id === surahId) : null;

            const verseIdKey = verse.verse_key.replace(':', '-');
            const isCompleted = passedVerses.has(verse.verse_key);
            const isPrevVerseDone = index === 0 || passedVerses.has(verses[index-1].verse_key);
            
            // Unified unlock logic: Check program access AND sequential progress
            const isFreeJuz = parseInt(id) === 1;
            const hasProgramAccess = isFreeJuz || isVerifiedStudent || access.status === 'trial' || !access.isBlocked;
            const isSequentialDone = index === 0 || isCompleted || isPrevVerseDone;
            
            const isUnlocked = hasProgramAccess && (isFreeJuz || isSequentialDone);

            return (
              <div key={verse.id} id={`verse-${verseIdKey}`}>
                {isNewSurah && surahInfo && (
                  <div className="bg-[#800000]/5 py-8 px-6 border-y border-[#800000]/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#800000]/60">Bagian Surah</p>
                      <h2 className="text-xl font-black font-headline text-[#800000]">{surahInfo.id}. {surahInfo.name_simple}</h2>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-arabic text-[#800000]">{surahInfo.name_arabic}</p>
                    </div>
                  </div>
                )}
                <div className={cn("py-12 px-4 space-y-8 transition-opacity border-b border-dashed border-slate-100", !isUnlocked && "opacity-60")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#800000] opacity-40">
                      <span className="text-xs font-black border-[#800000]/20 border-r pr-3">{verse.verse_key}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button asChild={isUnlocked} variant="outline" className={cn(
                        "w-48 h-10 gap-2 font-black text-[10px] rounded-full transition-all active:scale-[0.95] shadow-sm uppercase tracking-widest",
                        !isUnlocked ? "bg-muted text-muted-foreground border-muted cursor-not-allowed" :
                          isCompleted ? "bg-[#D4AF37] text-black border-[#800000]/20 hover:bg-[#D4AF37]/90" :
                            "bg-white text-[#800000] border-[#800000]/20 hover:bg-[#800000]/5"
                      )} disabled={!isUnlocked}>
                        {!isUnlocked ? (
                          <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> TERKUNCI</span>
                        ) : (
                          <Link href={`/mufradat/${verse.verse_key.split(':')[0]}/${verse.verse_key.split(':')[1]}?from=juz`}>
                            {isCompleted ? (
                              errorVerses.has(verse.verse_key) ? (
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
                      <Button variant="ghost" size="icon" onClick={() => toggleAudio(verse.verse_key)} disabled={!isUnlocked} className="text-[#800000]">
                        {loadingAudioKey === verse.verse_key ? <Loader2 className="animate-spin h-4 w-4" /> : playingKey === verse.verse_key ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Terjemah per Kata</p>
                      {(() => {
                        const vStats = verseStatsMap.get(verse.verse_key);
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
                    
                    <div className={cn("flex flex-wrap justify-start gap-x-3 gap-y-4 w-full", !isUnlocked && "blur-[2px] select-none")} dir="rtl">
                      {verse.words?.map((word, wordIdx) => {
                        const wordKey = `${verse.verse_key}-${wordIdx}`;
                        return (
                          <Tooltip key={wordKey} open={activeWordKey === wordKey && isUnlocked} onOpenChange={(o) => o && setActiveWordKey(wordKey)}>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={!isUnlocked ? -1 : 0}
                                role="button"
                                onPointerEnter={() => isUnlocked && setActiveWordKey(wordKey)}
                                style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                                className={cn(
                                  "font-arabic text-foreground/90 outline-none transition-colors px-0.5 inline-block",
                                  isUnlocked && "hover:text-[#800000] focus:text-[#800000] cursor-help"
                                )}
                              >
                                {word.text_uthmani}
                              </span>
                            </TooltipTrigger>
                            {isUnlocked && (
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

                  <div className={cn("text-left bg-[#800000]/5 p-5 rounded-xl border-l-4 shadow-sm", !isUnlocked ? "border-muted" : "border-[#800000]")}>
                    <p className={cn("text-[10px] font-bold mb-2 uppercase tracking-widest", !isUnlocked ? "text-muted-foreground" : "text-[#800000]")}>Terjemahan Ayat</p>
                    <div className={cn("text-base leading-relaxed text-slate-700", !isUnlocked ? "text-muted-foreground italic" : "text-foreground/90 font-medium")}>
                      {!isUnlocked ? "Selesaikan kuis ayat sebelumnya untuk membaca terjemahan ini." : <div dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>


      {parseInt(id) < 30 && (
        <div className="px-4 pb-12 pt-8">
          <Link href={`/mufradat/juz/${parseInt(id) + 1}`}>
            <Card className="bg-white border-2 border-dashed border-[#800000]/20 hover:border-[#800000]/40 hover:bg-[#800000]/5 transition-all cursor-pointer group rounded-2xl overflow-hidden shadow-md">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-muted/50 rounded-full group-hover:scale-110 transition-transform">
                  <ArrowRight className="w-6 h-6 text-[#800000]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Juz Selanjutnya</p>
                  <h3 className="text-2xl font-black font-headline text-[#800000]">Juz {parseInt(id) + 1}</h3>
                </div>
                <Button className="mt-4 bg-[#800000] hover:bg-[#800000]/90 text-white font-bold rounded-full px-8 h-12 shadow-lg group-hover:px-10 transition-all">MULAI SEKARANG</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
