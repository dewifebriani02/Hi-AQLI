"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  CalendarDays,
  Clock,
  Minus,
  Plus,
  Zap,
  Info,
  Mic2,
  BookOpen,
  Check,
  Play,
  Pause,
  Headphones,
  Languages,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUser, supabase } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import { addDocumentNonBlocking } from "@/supabase/non-blocking-updates";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import chaptersData from "@/data/chapters.json";
import { SURAH_START_PAGES } from "@/lib/quran-mapping";

const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy" },
  { id: 2, name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 3, name: "Abdur-Rahman as-Sudais" },
  { id: 6, name: "Mahmoud Khalil Al-Husary" },
  { id: 12, name: "Saud al-Shuraim" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)" },
];

const TARGET_MAX = 40;
const PASS_THRESHOLD = 40;
const META_PASS_THRESHOLD = 10;
const PREP_LISTEN_THRESHOLD = 5;

interface Word {
  text_uthmani: string;
  translation?: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  words: Word[];
  translations?: { text: string }[];
}

export function TikrarSystem() {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user ? "users" : null, user?.id);
  const paidJuz = userData?.paid_juz || 1;

  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [hasInitializedPage, setHasInitializedPage] = useState(false);
  const [isRequestingExam, setIsRequestingExam] = useState(false);

  const [prepListenCount, setPrepListenCount] = useState(0);
  const [prepTranslationDone, setPrepTranslationDone] = useState(false);

  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const isAutoPlayingRef = useRef(false);
  const [playingVerseIndex, setPlayingVerseIndex] = useState<number | null>(null);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [showReciterDialog, setShowReciterDialog] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioUrlRef = useRef<string | null>(null);

  const examOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'page', operator: '==', value: page }
    ]
  }), [user?.id, page]);

  const { data: examRequests } = useCollection("page_exams", examOptions);
  const activeExam = examRequests?.find(r => r.status !== 'failed');

  const [blocks, setBlocks] = useState<any>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const [metaCounts, setMetaCounts] = useState<Record<string, number>>({
    '1_2': 0, '2_3': 0, '1_2_3': 0, '3_4': 0, '2_3_4': 0, '1_2_3_4': 0,
  });

  useEffect(() => {
    if (!isUserDataLoading && userData && !hasInitializedPage) {
      const startPage = JUZ_PAGES[paidJuz - 1] || 1;
      setJuz(paidJuz);
      setPage(startPage);
      setHasInitializedPage(true);
    }
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) setSelectedReciterId(parseInt(savedReciter));
  }, [userData, paidJuz, isUserDataLoading, hasInitializedPage]);

  useEffect(() => {
    async function fetchVerses() {
      setLoading(true);
      if (audioRef.current) audioRef.current.pause();
      setIsAutoPlaying(false);
      isAutoPlayingRef.current = false;
      setPlayingVerseIndex(null);

      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33`
        );
        if (!res.ok) throw new Error("Gagal memuat ayat");
        const data = await res.json();
        
        if (data && data.verses && data.verses.length > 0) {
          setVerses(data.verses);
          // Point 4: Pre-fetch first audio URL instantly after loading verses
          if (selectedReciterId) {
            getAudioUrlByVerseKey(data.verses[0].verse_key, selectedReciterId).then(url => {
              nextAudioUrlRef.current = url;
            });
          }
        }
      } catch (error) {
        console.error("Tikrar Maqta Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }

    const savedProgressStr = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${page}`) : null;
    if (savedProgressStr) {
      try {
        const saved = JSON.parse(savedProgressStr);
        setPrepListenCount(saved.prepListenCount || 0);
        setPrepTranslationDone(saved.prepTranslationDone || false);
        setBlocks(saved.blocks || {
          1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
          2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
          3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
          4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        });
        setMetaCounts(saved.metaCounts || {
          '1_2': 0, '2_3': 0, '1_2_3': 0, '3_4': 0, '2_3_4': 0, '1_2_3_4': 0,
        });
      } catch (e) { }
    } else {
      setPrepListenCount(0);
      setPrepTranslationDone(false);
      setBlocks({
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      });
      setMetaCounts({ '1_2': 0, '2_3': 0, '1_2_3': 0, '3_4': 0, '2_3_4': 0, '1_2_3_4': 0 });
    }
    fetchVerses();
  }, [page]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;

    // Debounce saving to localStorage to prevent lag during rapid increments
    const timer = setTimeout(() => {
      const existing = localStorage.getItem(`tikrar_progress_p${page}`);
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify({
        ...parsed,
        prepListenCount,
        prepTranslationDone,
        blocks,
        metaCounts
      }));
    }, 500); // Wait 500ms after last change before writing to disk

    return () => clearTimeout(timer);
  }, [prepListenCount, prepTranslationDone, blocks, metaCounts, page, loading]);

  const blockVerses = useMemo(() => {
    if (verses.length === 0) return { 1: [], 2: [], 3: [], 4: [] };
    const perBlock = Math.ceil(verses.length / 4);
    return {
      1: verses.slice(0, perBlock),
      2: verses.slice(perBlock, perBlock * 2),
      3: verses.slice(perBlock * 2, perBlock * 3),
      4: verses.slice(perBlock * 3),
    };
  }, [verses]);

  const getAudioUrlByVerseKey = async (verseKey: string, reciterId: number) => {
    try {
      const res = await fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${verseKey}`);
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;
      if (!audioUrl) return null;
      return audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl.startsWith('http') ? audioUrl : `https://audio.qurancdn.com/${audioUrl}`;
    } catch (e) {
      return null;
    }
  };

  const getAudioUrl = async (vIndex: number) => {
    if (vIndex < 0 || vIndex >= verses.length || !selectedReciterId) return null;
    return getAudioUrlByVerseKey(verses[vIndex].verse_key, selectedReciterId);
  };

  const stopAutoPlay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
    setPlayingVerseIndex(null);
    nextAudioUrlRef.current = null;
  };

  const playVerse = useCallback(async (vIndex: number, loopNum: number) => {
    if (!isAutoPlayingRef.current) return;

    if (vIndex >= verses.length) {
      if (loopNum < 4) {
        setPrepListenCount(p => Math.min(5, p + 1));
        setCurrentLoop(loopNum + 1);
        playVerse(0, loopNum + 1);
      } else {
        setPrepListenCount(5);
        stopAutoPlay();
        toast({ title: "Simak Tuntas", description: "Persiapan 5x simak halaman selesai!" });
      }
      return;
    }

    setPlayingVerseIndex(vIndex);
    let fullUrl = nextAudioUrlRef.current || await getAudioUrl(vIndex);

    if (!fullUrl) {
      stopAutoPlay();
      return;
    }

    if (vIndex + 1 < verses.length) {
      getAudioUrl(vIndex + 1).then(url => { nextAudioUrlRef.current = url; });
    } else if (loopNum < 4) {
      getAudioUrl(0).then(url => { nextAudioUrlRef.current = url; });
    }

    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = fullUrl;
    audioRef.current.onended = () => { playVerse(vIndex + 1, loopNum); };
    audioRef.current.play().catch(() => stopAutoPlay());
  }, [verses, selectedReciterId, toast]);

  const startAutoPlay = async () => {
    if (!selectedReciterId) {
      setShowReciterDialog(true);
      return;
    }
    if (verses.length === 0) return;
    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;
    setCurrentLoop(0);
    nextAudioUrlRef.current = null;
    playVerse(0, 0);
  };

  const handleRequestExam = async () => {
    if (!user || isRequestingExam) return;
    setIsRequestingExam(true);
    try {
      await addDocumentNonBlocking("page_exams", {
        user_id: user.id,
        user_name: userData?.username || user.user_metadata?.full_name || "Thalibah",
        page: page,
        juz: juz,
        status: "requested",
        requested_at: new Date().toISOString()
      });
      const text = `Assalamu'alaikum Admin HI AQLI, saya ${userData?.username || user.user_metadata?.full_name} telah tuntas Tikrar Halaman ${page} Juz ${juz}. Mohon jadwal ujian lisan. Syukron.`;
      window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(text)}`, '_blank');
      toast({ title: "Permohonan Dikirim", description: "Admin HI AQLI akan segera menjadwalkan ujian lisan Ukhti." });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal mengajukan ujian" });
    } finally {
      setIsRequestingExam(false);
    }
  };

  const isPrepTuntas = prepListenCount >= PREP_LISTEN_THRESHOLD && prepTranslationDone;
  const isTuntasTM = (mid: number) => blocks[mid].combined.count >= PASS_THRESHOLD;
  const isMetaTuntas = (key: string) => (metaCounts[key] || 0) >= META_PASS_THRESHOLD;

  const totalProgress = useMemo(() => {
    let totalDone = 0;
    if (prepListenCount >= PREP_LISTEN_THRESHOLD) totalDone += 5;
    if (prepTranslationDone) totalDone += 5;
    [1, 2, 3, 4].forEach(id => {
      totalDone += (Math.min(blocks[id].a.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
      totalDone += (Math.min(blocks[id].b.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
      totalDone += (Math.min(blocks[id].combined.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
    });
    const metaWeight = 5;
    Object.keys(metaCounts).forEach(k => {
      totalDone += (Math.min(metaCounts[k], META_PASS_THRESHOLD) / META_PASS_THRESHOLD) * metaWeight;
    });
    const totalWeight = 10 + (4 * 30) + (6 * metaWeight);
    return Math.min(100, (totalDone / totalWeight) * 100);
  }, [prepListenCount, prepTranslationDone, blocks, metaCounts]);

  if (isUserDataLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#800000]" /></div>;

  return (
    <div className="space-y-8 pb-32">
      <Card className="border-none bg-[#800000] text-white shadow-xl overflow-hidden relative border-b-4 border-[#D4AF37]">
        <div className="absolute right-[-20px] top-[-20px] opacity-10"><CalendarDays className="w-40 h-40 text-[#D4AF37]" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <Badge className="bg-[#D4AF37] text-black border-none text-[10px] font-black uppercase tracking-widest">HI AQLI Tikrar System</Badge>
                <div className="flex flex-col">
                  <h3 className="text-2xl font-black font-headline">Halaman {page}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 decoration-[#D4AF37] decoration-2 underline-offset-4 underline">
                    QS. {(() => {
                      let surahId = 1;
                      Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
                        if (start <= page) surahId = Number(id);
                      });
                      return (chaptersData.chapters as any[]).find(c => c.id === surahId)?.name_simple || "Loading...";
                    })()}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex flex-col items-end">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter opacity-80 mb-1">
                  <Clock className="w-3 h-3 text-[#D4AF37]" /> Status Progres
                </div>
                <div className="text-lg font-black">{Math.round(totalProgress)}% <span className="text-xs font-medium opacity-60">Tuntas</span></div>
              </div>
            </div>
            <Progress value={totalProgress} className="h-1.5 bg-white/10 [&>div]:bg-[#D4AF37]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-6 bg-white p-4 rounded-2xl border shadow-sm sticky top-20 z-20 backdrop-blur-md border-[#800000]/10">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(JUZ_PAGES[juz - 1] || 1, p - 1))} disabled={loading || page <= (JUZ_PAGES[juz - 1] || 1)} className="rounded-xl h-10 w-10 border-[#800000]/20 hover:bg-[#800000]/5">
            <ChevronLeft className="h-5 w-5 text-[#800000]" />
          </Button>
          <span className="text-xl font-black text-[#800000] w-12 text-center">{page}</span>
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(juz < 30 ? (JUZ_PAGES[juz] || 605) - 1 : 604, p + 1))} disabled={loading || page >= (juz < 30 ? (JUZ_PAGES[juz] || 605) - 1 : 604)} className="rounded-xl h-10 w-10 border-[#800000]/20 hover:bg-[#800000]/5">
            <ChevronRight className="h-5 w-5 text-[#800000]" />
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#800000]" onClick={() => setFontSize(f => Math.max(12, f - 4))}><Minus className="h-4 w-4" /></Button>
          <span className="text-xs font-bold w-6 text-center">{fontSize}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#800000]" onClick={() => setFontSize(f => Math.min(64, f + 4))}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        <Card className={cn("border-2 transition-all shadow-md overflow-hidden", isPrepTuntas ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-[#800000]/30 bg-white")}>
          <div className="bg-[#800000] py-2 px-4 border-b flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Tahap 0: Persiapan (Prasyarat)</span>
            {isPrepTuntas && <Badge className="bg-[#D4AF37] text-black font-black text-[8px] tracking-widest h-4">SIAP MENGHAFAL</Badge>}
          </div>
          <CardContent className="p-6 space-y-8">
            <div className="flex flex-col gap-8">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", prepListenCount >= 5 ? "bg-[#D4AF37] text-black" : "bg-white text-[#800000] border-2 border-[#800000]/20")}>
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#800000]">Simak Murattal & Tadabbur</h4>
                      <p className="text-[10px] text-muted-foreground uppercase">Auto 5x siklus</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#800000] bg-white px-3 py-1 rounded-full border border-[#800000]/20 shadow-sm">{prepListenCount} / 5</span>
                    <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 font-bold border-[#800000]/20 text-[#800000]">
                          <Mic2 className="w-4 h-4" /> Pilih Qari
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Pilih Qari</DialogTitle></DialogHeader>
                        <div className="grid gap-2 py-4">
                          {RECITERS.map((r) => (
                            <Button key={r.id} variant={selectedReciterId === r.id ? "default" : "outline"} onClick={() => { setSelectedReciterId(r.id); localStorage.setItem('aqli_reciter_id', r.id.toString()); setShowReciterDialog(false); }} className={cn("justify-start gap-3 font-bold", selectedReciterId === r.id && "bg-[#800000] text-white")}>
                              {selectedReciterId === r.id && <Check className="w-4 h-4" />} {r.name}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Button onClick={isAutoPlaying ? stopAutoPlay : startAutoPlay} className={cn("w-full h-14 font-black rounded-2xl border-2 transition-all gap-3 shadow-md uppercase tracking-widest", isAutoPlaying ? "bg-[#800000] text-white border-white" : prepListenCount >= 5 ? "bg-[#D4AF37] border-[#D4AF37] text-black" : "bg-[#800000] text-white border-transparent")}>
                  {isAutoPlaying ? <><Pause className="w-6 h-6 fill-current" /> Berhenti</> : <><Play className="w-6 h-6 fill-current" /> {prepListenCount >= 5 ? 'Ulangi Simak' : 'Mulai Simak'}</>}
                </Button>

                {playingVerseIndex !== null && verses[playingVerseIndex] && (
                  <div className="mt-6 p-6 sm:p-8 bg-white rounded-[2.5rem] border-2 border-[#D4AF37] shadow-xl animate-in fade-in zoom-in duration-500 overflow-hidden">
                    <div className="flex flex-col gap-8">
                      <div className="flex items-center justify-center gap-2">
                        <Badge className="bg-[#800000] text-white text-[9px] font-black uppercase tracking-[0.2em]">Siklus {currentLoop + 1}</Badge>
                        <Badge variant="outline" className="text-[9px] font-black border-[#800000]/20 text-[#800000]">Ayat {verses[playingVerseIndex].verse_key.split(':')[1]}</Badge>
                      </div>
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-4" dir="rtl">
                        {verses[playingVerseIndex].words.map((word, wIdx) => (
                          <span key={wIdx} style={{ fontSize: `${fontSize * 1.4}px`, lineHeight: 1.6 }} className="font-arabic text-[#800000] font-bold">{word.text_uthmani}</span>
                        ))}
                      </div>
                      <Separator className="bg-[#D4AF37]/20" />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2"><Languages className="w-3 h-3" /> Arti Per Kata</div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {verses[playingVerseIndex].words.filter(w => w.text_uthmani).map((word, wIdx) => (
                            <div key={wIdx} className="bg-muted border-2 border-muted-foreground/10 rounded-xl px-3 py-1.5 flex flex-col items-center gap-0.5 shadow-sm min-w-[60px]">
                              <span className="font-arabic text-black text-sm font-bold leading-none">{word.text_uthmani}</span>
                              <span className="text-[9px] font-medium text-[#800000] leading-none">{word.translation?.text || "-"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#800000]/5 p-5 rounded-3xl border-l-4 border-[#800000]">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#800000] uppercase tracking-widest mb-2"><BookOpen className="w-3 h-3" /> Terjemahan Kalimat</div>
                        <p className="text-sm sm:text-base text-black leading-relaxed italic font-medium">"{verses[playingVerseIndex].translations?.[0]?.text.replace(/<[^>]*>?/gm, '') || "Memuat terjemahan..."}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted p-6 rounded-3xl border-2 border-dashed border-muted-foreground/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", prepTranslationDone ? "bg-[#D4AF37] text-black" : "bg-white text-[#800000] border-2 border-[#800000]/20")}>
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#800000]">Konfirmasi Pemahaman</h4>
                    <p className="text-[10px] text-muted-foreground uppercase">Sudah tadabbur</p>
                  </div>
                </div>
                <Button variant={prepTranslationDone ? "default" : "outline"} onClick={() => setPrepTranslationDone(!prepTranslationDone)} className={cn("w-full h-12 font-black rounded-xl border-2 uppercase tracking-widest text-[10px]", prepTranslationDone ? "bg-[#D4AF37] hover:bg-[#D4AF37]/90 border-transparent text-black" : "border-[#800000] text-[#800000] hover:bg-[#800000]/5")}>
                  {prepTranslationDone ? "SUDAH DIPAHAMI" : "KONFIRMASI PEMAHAMAN"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-10 mt-10">
          <div className="bg-[#800000] text-white p-4 rounded-2xl border-2 border-[#D4AF37] flex items-start gap-3 mx-1 shadow-lg">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-bold uppercase tracking-wide">
              <strong>Aturan Itqan:</strong> Maqta wajib <strong>40x</strong>. Gabungan wajib <strong>10x</strong>.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MaqtaCard id={1} page={page} state={blocks[1]} verses={blockVerses[1]} isLocked={!isPrepTuntas} onIncrement={setBlocks} fontSize={fontSize} letter="A" />
            <MaqtaCard id={2} page={page} state={blocks[2]} verses={blockVerses[2]} isLocked={!isTuntasTM(1)} onIncrement={setBlocks} fontSize={fontSize} letter="B" />
          </div>

          <MetaStep label="GABUNG BLOK A & B" count={metaCounts['1_2']} isLocked={!isTuntasTM(1) || !isTuntasTM(2)} onIncrement={() => setMetaCounts(p => ({ ...p, '1_2': p['1_2'] + 1 }))} />

          <MaqtaCard id={3} page={page} state={blocks[3]} verses={blockVerses[3]} isLocked={!isMetaTuntas('1_2')} onIncrement={setBlocks} fontSize={fontSize} letter="C" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetaStep label="GABUNG BLOK B & C" count={metaCounts['2_3']} isLocked={!isTuntasTM(3)} onIncrement={() => setMetaCounts(p => ({ ...p, '2_3': p['2_3'] + 1 }))} />
            <MetaStep label="GABUNG BLOK A s/d C" count={metaCounts['1_2_3']} isLocked={!isMetaTuntas('2_3')} onIncrement={() => setMetaCounts(p => ({ ...p, '1_2_3': p['1_2_3'] + 1 }))} />
          </div>

          <MaqtaCard id={4} page={page} state={blocks[4]} verses={blockVerses[4]} isLocked={!isMetaTuntas('1_2_3')} onIncrement={setBlocks} fontSize={fontSize} letter="D" />

          <div className="space-y-4">
            <MetaStep label="GABUNG BLOK C & D" count={metaCounts['3_4']} isLocked={!isTuntasTM(4)} onIncrement={() => setMetaCounts(p => ({ ...p, '3_4': p['3_4'] + 1 }))} />
            <MetaStep label="GABUNG BLOK B s/d D" count={metaCounts['2_3_4']} isLocked={!isMetaTuntas('3_4')} onIncrement={() => setMetaCounts(p => ({ ...p, '2_3_4': p['2_3_4'] + 1 }))} />
            <MetaStep label="GABUNG SELURUH HALAMAN (A - D)" count={metaCounts['1_2_3_4']} isLocked={!isMetaTuntas('2_3_4')} onIncrement={() => setMetaCounts(p => ({ ...p, '1_2_3_4': p['1_2_3_4'] + 1 }))} highlight />
          </div>

          <div className="flex flex-col gap-6 mt-4">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <h4 className="text-xl font-black font-headline text-black uppercase tracking-widest">Tahap Ujian Halaman</h4>
            </div>
            {!isMetaTuntas('1_2_3_4') ? (
              <Card className="border-2 border-dashed bg-muted py-10">
                <CardContent className="flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-dashed"><Lock className="w-6 h-6 text-muted-foreground" /></div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest max-w-[200px]">Selesaikan repetisi gabungan seluruh halaman untuk membuka ujian.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in duration-500">
                <Card className="border-none bg-[#800000] text-white shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform border-b-4 border-[#D4AF37]">
                  <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] flex items-center justify-center mb-4"><ClipboardCheck className="w-6 h-6 text-black" /></div>
                      <h5 className="text-lg font-black leading-tight uppercase">Simulasi Ujian Mandiri</h5>
                      <p className="text-[11px] opacity-80 leading-relaxed">Uji pemahaman terjemahan dan sambung ayat halaman ini.</p>
                    </div>
                    <Button asChild className="bg-[#D4AF37] text-black font-black w-full rounded-xl hover:bg-[#D4AF37]/90 h-12 shadow-lg">
                      <Link href={`/tajweed/simulation?page=${page}`}>MULAI SIMULASI <ArrowRight className="ml-2 w-4 h-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card className={cn("border-none shadow-xl overflow-hidden transition-all border-b-4", activeExam ? "bg-[#800000] text-white border-white" : "bg-white text-[#800000] hover:scale-[1.02] border-[#D4AF37] border-2")}>
                  <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#800000]/10 flex items-center justify-center mb-4">{activeExam ? <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" /> : <MessageSquare className="w-6 h-6 text-[#800000]" />}</div>
                      <h5 className="text-lg font-black leading-tight uppercase">{activeExam ? "Ujian Diajukan" : "Ajukan Ujian Lisan"}</h5>
                      <p className="text-[11px] opacity-80 leading-relaxed">{activeExam ? `Status: ${activeExam.status.toUpperCase()}. Tunggu instruksi Admin.` : "Dapatkan sertifikasi Itqan melalui ujian lisan resmi."}</p>
                    </div>
                    {!activeExam && (
                      <Button onClick={handleRequestExam} disabled={isRequestingExam} className="bg-[#800000] text-white font-black w-full rounded-xl hover:bg-[#800000]/90 h-12 shadow-lg">
                        {isRequestingExam ? <Loader2 className="animate-spin" /> : <><Zap className="mr-2 w-4 h-4 fill-current text-[#D4AF37]" /> AJUKAN SEKARANG</>}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

function MaqtaCard({ id, page, state, verses, onIncrement, fontSize, isLocked, letter }: any) {
  const isDoneG = state.combined.count >= PASS_THRESHOLD;
  const tokens = useMemo(() => {
    const items: any[] = [];
    verses.forEach((v: any) => {
      v.words.forEach((w: any, idx: number) => { items.push({ type: 'word', data: w, verse_key: v.verse_key, word_idx: idx }); });
      items.push({ type: 'marker', text: `(${v.verse_key.split(':')[1]})`, verse_key: v.verse_key });
    });
    return items;
  }, [verses]);
  const mid = Math.ceil(tokens.length / 2);
  const tokensA = tokens.slice(0, mid);
  const tokensB = tokens.slice(mid);
  const renderToken = (token: any, colorClass: string) => {
    if (token.type === 'word') {
      return (
        <Tooltip key={`${token.verse_key}-${token.word_idx}`}>
          <TooltipTrigger asChild><span tabIndex={0} style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }} className={cn("font-arabic cursor-help hover:bg-[#D4AF37]/20 rounded px-0.5 outline-none transition-colors", colorClass)}>{token.data.text_uthmani}</span></TooltipTrigger>
          <TooltipPortal><TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]"><p className="text-xs font-bold">{token.data.translation?.text || "..."}</p></TooltipContent></TooltipPortal>
        </Tooltip>
      );
    }
    return <span key={`${token.verse_key}-m`} className="inline-flex items-center justify-center px-2 rounded-full border border-[#800000]/20 text-[10px] font-bold mx-1 bg-white translate-y-[-2px]">{token.text}</span>;
  };
  return (
    <Card className={cn("border-2 transition-all shadow-md overflow-hidden flex flex-col h-full", isDoneG ? "border-[#D4AF37] bg-[#D4AF37]/5 shadow-[#D4AF37]/10" : "border-[#800000]/20", isLocked && "opacity-50 grayscale select-none")}>
      <div className="bg-[#800000] py-2 px-4 border-b flex justify-between items-center shrink-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-white truncate">BLOK {letter} ({page}{letter}) {isLocked && "• LOCK"}</span>
        {isDoneG && <Badge className="bg-[#D4AF37] text-black font-black text-[8px] tracking-widest h-4 shrink-0">TUNTAS</Badge>}
      </div>
      <CardContent className="p-4 flex flex-col flex-1 gap-4 overflow-hidden">
        <div className="bg-white p-4 rounded-xl border-2 border-[#800000]/5 flex-1 overflow-y-auto no-scrollbar" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
            {tokensA.map(t => renderToken(t, "text-[#800000]"))}
            {tokensB.map(t => renderToken(t, "text-black"))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <CounterBox label={`${page}${letter}-1`} count={state.a.count} isLocked={isLocked} onInc={() => onIncrement((p: any) => ({ ...p, [id]: { ...p[id], a: { count: p[id].a.count + 1 } } }))} color="maroon" threshold={PASS_THRESHOLD} />
          <CounterBox label={`${page}${letter}-2`} count={state.b.count} isLocked={isLocked || state.a.count < PASS_THRESHOLD} onInc={() => onIncrement((p: any) => ({ ...p, [id]: { ...p[id], b: { count: p[id].b.count + 1 } } }))} color="darkMaroon" threshold={PASS_THRESHOLD} />
        </div>
        <Button onClick={() => onIncrement((p: any) => ({ ...p, [id]: { ...p[id], combined: { count: p[id].combined.count + 1 } } }))} disabled={isLocked || state.b.count < PASS_THRESHOLD} className={cn("w-full h-12 flex-col rounded-xl font-black uppercase tracking-widest shrink-0 py-1 transition-all relative", isDoneG ? "bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-lg" : "bg-[#800000] text-white hover:bg-[#800000]/90")}>
          <span className="text-[8px] flex items-center gap-1 leading-none opacity-80 mb-0.5">{isLocked || state.b.count < PASS_THRESHOLD ? <Lock className="w-2 h-2" /> : null} GABUNG {page}{letter}</span>
          <span className="text-sm leading-none">{state.combined.count} / {PASS_THRESHOLD}</span>
          {isDoneG && <div className="absolute top-1 right-1"><CheckCircle2 className="w-3 h-3 text-black" /></div>}
        </Button>
      </CardContent>
    </Card>
  );
}

function MetaStep({ label, count, isLocked, onIncrement, highlight }: any) {
  const isDone = count >= META_PASS_THRESHOLD;
  const TARGET_MAX_LOCAL = 10;
  return (
    <div className={cn("relative p-4 rounded-2xl border-2 flex items-center justify-between transition-all", isDone ? "bg-[#D4AF37]/10 border-[#D4AF37]" : "bg-white border-[#800000]/10", highlight && !isDone && "border-[#800000] bg-[#800000]/5", isLocked && "opacity-40 grayscale select-none")}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0", isDone ? "bg-[#D4AF37] text-black" : highlight ? "bg-[#800000] text-white" : "bg-[#800000]/10 text-[#800000]")}>
          {isLocked ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-current" />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest truncate">Sub-Repetisi Gabungan</span>
          <span className={cn("text-[11px] font-black uppercase tracking-tight truncate", highlight ? "text-[#800000]" : "text-black")}>{label}</span>
          <span className="text-[8px] font-bold text-muted-foreground">MIN. {META_PASS_THRESHOLD}x</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] font-bold text-black uppercase">{count} / {TARGET_MAX_LOCAL}</span>
          <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden"><div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${(count / TARGET_MAX_LOCAL) * 100}%` }} /></div>
        </div>
        <Button onClick={onIncrement} disabled={isLocked || isDone} className={cn("h-9 w-9 rounded-lg p-0 font-black text-xs shrink-0 transition-all shadow-sm", isDone ? "bg-[#D4AF37] text-black border-none" : "bg-[#800000] text-white hover:bg-[#800000]/90")}>{isDone ? <CheckCircle2 className="w-4 h-4" /> : `+1`}</Button>
      </div>
    </div>
  );
}

function CounterBox({ label, count, isLocked, onInc, color, threshold }: any) {
  const isDone = count >= threshold;
  const themes: any = {
    maroon: isDone ? "bg-[#800000] text-white border-[#800000]" : "bg-white border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5",
    darkMaroon: isDone ? "bg-[#4d0000] text-white border-[#4d0000]" : "bg-white border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5"
  };
  return (
    <div onClick={isLocked || isDone ? undefined : onInc} className={cn("h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative px-1 shadow-sm", isLocked ? "opacity-50 grayscale cursor-not-allowed bg-muted shadow-none" : themes[color])}>
      <span className="text-[10px] font-black uppercase opacity-60 tracking-wider truncate w-full text-center leading-none mb-1">{label}</span>
      <div className="flex items-baseline gap-0.5 leading-none"><span className="text-base font-black">{count}</span><span className="text-[8px] font-bold opacity-40">/ {threshold}</span></div>
      {isLocked && <Lock className="absolute top-1 right-1 w-2 h-2 text-muted-foreground" />}
      {isDone && <CheckCircle2 className="absolute top-1 right-1 w-3 h-3 text-current" />}
    </div>
  );
}
