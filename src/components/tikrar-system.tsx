
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCcw, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Play,
  Loader2,
  Lock,
  CalendarDays,
  Trophy,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Clock,
  Flag,
  Info,
  Type,
  Minus,
  Plus
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import Link from "next/link";

const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

const WAQAF_CHARS = ['ۖ', 'ۗ', 'ۚ', 'ۛ', 'ۜ', '۟', '۠', 'ۡ', 'ۢ'];

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
}

interface MaqtaState {
  count: number;
}

interface BlockState {
  a: MaqtaState;
  b: MaqtaState;
  combined: MaqtaState;
}

const TARGET_TM = 40;
const RECOMMENDED_META = 40;
const MIN_META = {
  2: 10,
  3: 5,
  4: 3
};

const LEVELS = [
  { id: 1, name: "Intensif", desc: "1 Halaman / Pekan", days: 7 },
  { id: 2, name: "Reguler", desc: "1 Halaman / 2 Pekan", days: 14 },
  { id: 3, name: "Santai", desc: "1 Halaman / 3 Pekan", days: 21 },
  { id: 4, name: "Pemula", desc: "1 Halaman / Bulan", days: 28 },
];

export function TikrarSystem() {
  const { user } = useUser();
  const db = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);
  
  const isPaid = userData?.isTikrarPaid || false;
  const paidJuz = userData?.paidJuz || null;

  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrevPageDone, setIsPrevPageDone] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(24);
  
  const [blocks, setBlocks] = useState<Record<number, BlockState>>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const [metaCombined, setMetaCombined] = useState<Record<number, number>>({
    2: 0,
    3: 0,
    4: 0
  });

  useEffect(() => {
    if (userData?.tikrarLevel) {
      setLevel(userData.tikrarLevel);
    } else if (!level) {
      setLevel(3);
    }
  }, [userData, level]);

  useEffect(() => {
    if (!isUserDataLoading && userData) {
      if (isPaid && paidJuz) {
        setJuz(paidJuz);
        if (page === 1) setPage(JUZ_PAGES[paidJuz - 1]);
      }
    }
  }, [userData, isPaid, paidJuz, isUserDataLoading, page]);

  const isTrial = page === 1 && juz === 1;
  const accessDenied = !isTrial && (!isPaid || (paidJuz !== null && juz !== paidJuz));

  const currentJuzStartPage = useMemo(() => JUZ_PAGES[juz - 1] || 1, [juz]);
  const nextJuzStartPage = juz < 30 ? JUZ_PAGES[juz] : 605;

  const checkPageCompletion = (pageNum: number) => {
    if (pageNum < 1) return true;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${pageNum}`) : null;
    if (!saved) return false;
    try {
      const data = JSON.parse(saved);
      const b = data.blocks || {};
      const m = data.metaCombined || {};
      const blocksDone = [1, 2, 3, 4].every(id => b[id]?.combined.count >= TARGET_TM);
      const metaDone = m[4] >= MIN_META[4];
      return blocksDone && metaDone;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    async function fetchVerses() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id`
        );
        if (!res.ok) throw new Error("Gagal memuat ayat");
        const data = await res.json();
        setVerses(data.verses);
      } catch (error) {
        console.error("Tikrar Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }

    const savedProgressStr = typeof window !== 'undefined' ? localStorage.getItem(`tikrar_progress_p${page}`) : null;
    if (savedProgressStr) {
      try {
        const saved = JSON.parse(savedProgressStr);
        setBlocks(saved.blocks || {
          1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
          2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
          3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
          4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        });
        setMetaCombined(saved.metaCombined || { 2: 0, 3: 0, 4: 0 });
      } catch (e) {}
    } else {
      setBlocks({
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      });
      setMetaCombined({ 2: 0, 3: 0, 4: 0 });
    }

    setIsPrevPageDone(page === currentJuzStartPage || checkPageCompletion(page - 1));
    fetchVerses();
  }, [page, currentJuzStartPage, juz]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify({ 
        blocks, 
        metaCombined, 
        startDate: userData?.tikrarStartDate?.toDate?.()?.toISOString() || userData?.createdAt?.toDate?.()?.toISOString()
      }));
    }
  }, [blocks, metaCombined, page, loading, userData]);

  const scheduleInfo = useMemo(() => {
    if (!level || !userData) return null;
    const adminStart = userData.tikrarStartDate?.toDate?.() || userData.createdAt?.toDate?.();
    if (!adminStart) return null;

    const start = new Date(adminStart);
    const selectedLevel = LEVELS.find(l => l.id === level) || LEVELS[2];
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      currentDay: diffDays,
      totalDays: selectedLevel.days,
    };
  }, [level, userData]);

  const calculateTotalProgress = () => {
    let totalDone = 0;
    const totalTarget = (4 * 3 * TARGET_TM) + (3 * RECOMMENDED_META);
    Object.values(blocks).forEach(b => {
      totalDone += b.a.count + b.b.count + b.combined.count;
    });
    Object.values(metaCombined).forEach(count => {
      totalDone += count;
    });
    return (totalDone / totalTarget) * 100;
  };

  const totalProgress = calculateTotalProgress();

  if (isUserDataLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#800000]" /></div>;

  return (
    <div className="space-y-8">
      {/* HEADER: INFO PERSONAL BERDASARKAN TGL ADMIN */}
      <Card className="border-none bg-gradient-to-br from-[#800000] to-[#b30000] text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-[-20px] top-[-20px] opacity-10"><CalendarDays className="w-40 h-40" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                    Level {LEVELS.find(l => l.id === level)?.name || "Santai"}
                  </Badge>
                  {isPaid ? (
                    <Badge className="bg-emerald-500/20 text-white border-none text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> PERSONAL START DATE ACTIVE
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-white border-white/30 text-[9px] font-bold">MODE TRIAL</Badge>
                  )}
                </div>
                <h3 className="text-2xl font-bold font-headline">Juz {juz} • Halaman {page}</h3>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex flex-col items-end">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter opacity-80 mb-1">
                  <Clock className="w-3 h-3" /> Masa Belajar Hal. Ini
                </div>
                <div className="text-lg font-black">Hari ke-{scheduleInfo?.currentDay || 1} <span className="text-xs font-medium opacity-60">/ {scheduleInfo?.totalDays || 21}</span></div>
                <p className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded bg-white/20 uppercase tracking-widest">
                  Personal Schedule
                </p>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase opacity-60">Progres Halaman</span>
                <span className="text-[10px] font-bold">{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} className="h-1.5 bg-white/10 [&>div]:bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NAVIGATION */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-2xl border shadow-sm sticky top-20 z-20 backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(currentJuzStartPage, p - 1))} disabled={loading || page <= currentJuzStartPage} className="rounded-xl h-12 w-12 border-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Halaman</p>
              <p className="text-3xl font-black text-[#800000]">{page}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(nextJuzStartPage - 1, p + 1))} disabled={loading || page >= nextJuzStartPage - 1} className="rounded-xl h-12 w-12 border-2">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.max(16, f - 2))}><Minus className="h-4 w-4" /></Button>
              <span className="text-xs font-bold w-6 text-center">{fontSize}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.min(48, f + 2))}><Plus className="h-4 w-4" /></Button>
            </div>
            {totalProgress >= 100 && (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">
                <a href={`https://wa.me/6281234567890?text=Assalamu'alaikum,%20saya%20sudah%20tuntas%20Tikrar%20Halaman%20${page}%20Juz%20${juz}.%20Mohon%20jadwal%20ujian.`} target="_blank">AJUKAN UJIAN</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-[#800000]" /></div>
      ) : accessDenied ? (
        <div className="py-20 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Hanya untuk Juz yang Didaftarkan</p>
          <Button asChild variant="outline" className="font-bold"><Link href="/study-circles">Daftar Juz {juz}</Link></Button>
        </div>
      ) : !isPrevPageDone ? (
        <div className="py-20 text-center space-y-4 bg-rose-50 rounded-3xl border-2 border-dashed border-rose-200">
          <Lock className="w-12 h-12 mx-auto text-rose-300" />
          <p className="text-sm font-bold text-rose-800 uppercase tracking-widest">Selesaikan Hal {page - 1} Terlebih Dahulu</p>
          <Button onClick={() => setPage(page - 1)} className="bg-rose-600 font-bold">Kembali</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 pb-20">
          {[1, 2, 3, 4].map(id => (
            <BlockCard 
              key={id} id={id} state={blocks[id]} 
              verses={verses.slice((id-1) * Math.ceil(verses.length/4), id * Math.ceil(verses.length/4))}
              onIncrement={(bid: any, type: any) => {
                const current = blocks[bid][type].count;
                if (current < TARGET_TM) {
                  setBlocks(prev => ({...prev, [bid]: {...prev[bid], [type]: {count: current + 1}}}));
                }
              }} 
              target={TARGET_TM} 
              fontSize={fontSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockCard({ id, state, verses, onIncrement, target, fontSize }: any) {
  const isDone = state.combined.count >= target;
  return (
    <Card className={cn("border-2 transition-all shadow-lg", isDone ? "border-emerald-500 bg-emerald-50/10" : "border-muted")}>
      <CardHeader className="bg-[#800000]/5 py-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold font-headline">BLOK TM {id}</CardTitle>
        {isDone && <Badge className="bg-emerald-500">DONE</Badge>}
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="bg-[#fffcf5] p-5 rounded-2xl border-2 border-[#800000]/10 max-h-[200px] overflow-y-auto no-scrollbar" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
            {verses.map((v: any) => (
              <React.Fragment key={v.id}>
                {v.words.map((w: any, idx: any) => (
                  <span key={idx} style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }} className="font-arabic text-[#800000]">{w.text_uthmani}</span>
                ))}
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-[#800000]/20 text-[8px] font-bold mx-1 text-[#800000] bg-white/50">({v.verse_key.split(':')[1]})</span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CounterBox label={`TM${id}a`} count={state.a.count} target={target} onClick={() => onIncrement(id, 'a')} />
          <CounterBox label={`TM${id}b`} count={state.b.count} target={target} onClick={() => onIncrement(id, 'b')} />
        </div>
        <Button 
          onClick={() => onIncrement(id, 'combined')}
          disabled={state.a.count < target || state.b.count < target}
          className={cn("w-full h-14 rounded-xl font-black text-lg", isDone ? "bg-emerald-500" : "bg-[#800000]")}
        >
          GABUNGAN {id}: {state.combined.count} / {target}
        </Button>
      </CardContent>
    </Card>
  );
}

function CounterBox({ label, count, target, onClick }: any) {
  const isDone = count >= target;
  return (
    <div 
      onClick={isDone ? undefined : onClick}
      className={cn("h-20 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all", isDone ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-muted/20 border-muted hover:border-[#800000]/30")}
    >
      <span className="text-[10px] font-bold uppercase opacity-60">{label}</span>
      <span className="text-2xl font-black">{count} <span className="text-[10px] font-bold opacity-40">/ {target}</span></span>
    </div>
  );
}
