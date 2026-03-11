
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ShieldCheck,
  Clock,
  Minus,
  Plus,
  Layers,
  Zap
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

const LEVELS = [
  { id: 1, name: "Intensif", days: 7 },
  { id: 2, name: "Reguler", days: 14 },
  { id: 3, name: "Santai", days: 21 },
  { id: 4, name: "Pemula", days: 28 },
];

const TARGET_MAX = 40;
const PASS_THRESHOLD = 5; // Minimal 5x to unlock next
const TARGET_META = 3; 

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

export function TikrarSystem() {
  const { user } = useUser();
  const db = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);
  
  const isPaid = userData?.isTikrarPaid || false;
  const paidJuz = userData?.paidJuz || 1;

  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(32);
  
  const [blocks, setBlocks] = useState<any>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const [metaCombined, setMetaCombined] = useState<Record<number, number>>({
    2: 0, 3: 0, 4: 0,
  });

  useEffect(() => {
    if (!isUserDataLoading && userData) {
      setJuz(paidJuz);
      if (loading) {
        setPage(JUZ_PAGES[paidJuz - 1] || 1);
      }
    }
  }, [userData, paidJuz, isUserDataLoading, loading]);

  const currentJuzStartPage = useMemo(() => JUZ_PAGES[juz - 1] || 1, [juz]);
  const nextJuzStartPage = juz < 30 ? JUZ_PAGES[juz] : 605;

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

    fetchVerses();
  }, [page]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const existing = localStorage.getItem(`tikrar_progress_p${page}`);
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify({ 
        ...parsed,
        blocks,
        metaCombined
      }));
    }
  }, [blocks, metaCombined, page, loading]);

  const totalProgress = useMemo(() => {
    let totalDone = 0;
    Object.values(blocks).forEach((b: any) => {
      totalDone += Math.min(b.a.count, PASS_THRESHOLD);
      totalDone += Math.min(b.b.count, PASS_THRESHOLD);
      totalDone += Math.min(b.combined.count, PASS_THRESHOLD);
    });
    Object.values(metaCombined).forEach((val) => {
      totalDone += (val / TARGET_META) * PASS_THRESHOLD;
    });
    const totalTarget = (4 * 3 * PASS_THRESHOLD) + (3 * PASS_THRESHOLD);
    return Math.min(100, (totalDone / totalTarget) * 100);
  }, [blocks, metaCombined]);

  const scheduleInfo = useMemo(() => {
    if (!userData?.tikrarStartDate) return null;
    const start = userData.tikrarStartDate.toDate();
    const today = new Date();
    const diff = Math.ceil(Math.abs(today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const level = LEVELS.find(l => l.id === userData.tikrarLevel) || LEVELS[2];
    return { currentDay: diff, totalDays: level.days };
  }, [userData]);

  if (isUserDataLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#800000]" /></div>;

  if (!isPaid && page !== 1) {
    return (
      <div className="py-20 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed">
        <Lock className="w-12 h-12 mx-auto text-muted-foreground/30" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Hanya untuk Juz yang Didaftarkan</p>
        <Button asChild variant="outline" className="font-bold"><Link href="/study-circles">Daftar Sekarang</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-none bg-gradient-to-br from-[#800000] to-[#b30000] text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-[-20px] top-[-20px] opacity-10"><CalendarDays className="w-40 h-40" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                    Level {LEVELS.find(l => l.id === userData?.tikrarLevel)?.name || "Santai"}
                  </Badge>
                  {isPaid && (
                    <Badge className="bg-emerald-500/20 text-white border-none text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> PERSONAL SCHEDULE ACTIVE
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl font-bold font-headline">Juz {juz} • Halaman {page}</h3>
              </div>
              
              {scheduleInfo && (
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex flex-col items-end">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter opacity-80 mb-1">
                    <Clock className="w-3 h-3" /> Masa Belajar
                  </div>
                  <div className="text-lg font-black">Hari ke-{scheduleInfo.currentDay} <span className="text-xs font-medium opacity-60">/ {scheduleInfo.totalDays}</span></div>
                </div>
              )}
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase opacity-60">Progres Penguasaan Halaman</span>
                <span className="text-[10px] font-bold">{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} className="h-1.5 bg-white/10 [&>div]:bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.max(16, f - 4))}><Minus className="h-4 w-4" /></Button>
            <span className="text-xs font-bold w-6 text-center">{fontSize}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.min(64, f + 4))}><Plus className="h-4 w-4" /></Button>
          </div>
          {totalProgress >= 100 && (
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">
              <a href={`https://wa.me/6281234567890?text=Assalamu'alaikum,%20saya%20sudah%20tuntas%20Tikrar%20Halaman%20${page}%20Juz%20${juz}.%20Mohon%20jadwal%20ujian.`} target="_blank">AJUKAN UJIAN</a>
            </Button>
          )}
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-8 pb-32">
            <div className="px-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#800000]" />
              <h4 className="font-black font-headline text-lg uppercase tracking-widest text-[#800000]">Tahap 1: Penguasaan Blok (TM 1-4)</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(id => {
                // Check if previous block's combined is done
                const prevBlockDone = id === 1 || blocks[id-1].combined.count >= PASS_THRESHOLD;
                
                return (
                  <BlockCard 
                    key={id} 
                    id={id} 
                    isLocked={!prevBlockDone}
                    state={blocks[id]} 
                    verses={verses.slice((id-1) * Math.ceil(verses.length/4), id * Math.ceil(verses.length/4))}
                    onIncrement={(bid: number, type: 'a' | 'b' | 'combined') => {
                      const current = blocks[bid][type].count;
                      if (current < TARGET_MAX) {
                        setBlocks((prev: any) => ({
                          ...prev, 
                          [bid]: {
                            ...prev[bid], 
                            [type]: { count: current + 1 }
                          }
                        }));
                      }
                    }} 
                    target={TARGET_MAX} 
                    passThreshold={PASS_THRESHOLD}
                    fontSize={fontSize}
                  />
                );
              })}
            </div>

            <div className="px-1 flex items-center gap-2 mt-8">
              <Zap className="w-5 h-5 text-amber-500 fill-current" />
              <h4 className="font-black font-headline text-lg uppercase tracking-widest text-[#800000]">Tahap 2: Repetisi Gabungan</h4>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {[5, 6, 7].map((stepNum) => {
                const metaIdx = stepNum - 3;
                const metaLabel = stepNum === 5 ? "Blok 1+2" : stepNum === 6 ? "Blok 1+2+3" : "Halaman Penuh (1-4)";
                const count = metaCombined[metaIdx] || 0;
                const isPassed = count >= TARGET_META;

                // Step 5 depends on TM2 Combined >= 5
                // Step 6 depends on Step 5 >= 3
                // Step 7 depends on Step 6 >= 3
                let stepLocked = false;
                if (stepNum === 5) stepLocked = blocks[2].combined.count < PASS_THRESHOLD;
                if (stepNum === 6) stepLocked = (metaCombined[2] || 0) < TARGET_META;
                if (stepNum === 7) stepLocked = (metaCombined[3] || 0) < TARGET_META;

                return (
                  <Card key={stepNum} className={cn("border-2 transition-all shadow-md", isPassed ? "border-emerald-500 bg-emerald-50/10" : "border-muted", stepLocked && "opacity-50")}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl", isPassed ? "bg-emerald-500 text-white" : "bg-[#800000]/10 text-[#800000]")}>
                            {stepLocked ? <Lock className="w-5 h-5" /> : stepNum}
                          </div>
                          <div className="flex flex-col">
                            <h5 className="font-black uppercase tracking-widest text-[#800000]">Langkah {stepNum}</h5>
                            <p className="text-xs font-bold text-muted-foreground">Gabungan {metaLabel}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                              <span>Repetisi</span>
                              <span>{count} / {TARGET_META}</span>
                            </div>
                            <Progress value={(count / TARGET_META) * 100} className="h-2 bg-muted [&>div]:bg-[#D4AF37]" />
                          </div>
                          <Button 
                            onClick={() => {
                              if (!stepLocked && count < TARGET_META) {
                                setMetaCombined(prev => ({ ...prev, [metaIdx]: count + 1 }));
                              }
                            }}
                            disabled={isPassed || stepLocked}
                            className={cn("h-12 w-12 rounded-xl shrink-0 font-black border-2", isPassed ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-[#800000] border-[#800000] hover:bg-[#800000] hover:text-white")}
                          >
                            {isPassed ? <CheckCircle2 /> : `+1`}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}

function BlockCard({ id, state, verses, onIncrement, target, passThreshold, fontSize, isLocked }: any) {
  const isBlockTuntas = state.combined.count >= passThreshold;
  
  const tokens = useMemo(() => {
    const items: any[] = [];
    verses.forEach((v: any) => {
      v.words.forEach((w: any, idx: number) => {
        items.push({ type: 'word', data: w, verse_key: v.verse_key, word_idx: idx });
      });
      items.push({ type: 'marker', text: `(${v.verse_key.split(':')[1]})`, verse_key: v.verse_key });
    });
    return items;
  }, [verses]);

  const midPoint = Math.ceil(tokens.length / 2);
  const tokensA = tokens.slice(0, midPoint);
  const tokensB = tokens.slice(midPoint);

  const renderToken = (token: any, color: string) => {
    if (token.type === 'word') {
      const wordKey = `${token.verse_key}-${token.word_idx}`;
      return (
        <Tooltip key={wordKey}>
          <TooltipTrigger asChild>
            <span 
              tabIndex={0} 
              role="button"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }} 
              className={cn("font-arabic cursor-help hover:bg-muted/50 rounded px-0.5 transition-colors outline-none", color)}
            >
              {token.data.text_uthmani}
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
              <p className="text-xs font-medium">{token.data.translation?.text || "..."}</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      );
    } else {
      return (
        <span 
          key={`${token.verse_key}-marker`}
          className={cn("inline-flex items-center justify-center px-2 rounded-full border text-[10px] font-bold mx-1 bg-white/50 shadow-sm translate-y-[-2px]", 
            color === "text-rose-600" ? "border-rose-200 text-rose-600" : "border-emerald-200 text-emerald-600"
          )}
        >
          {token.text}
        </span>
      );
    }
  };

  // Internal sequential locking
  const isBLocked = state.a.count < passThreshold;
  const isCombinedLocked = state.b.count < passThreshold;

  return (
    <Card className={cn("border-2 transition-all shadow-lg overflow-hidden", isBlockTuntas ? "border-emerald-500 bg-emerald-50/10" : "border-muted", isLocked && "opacity-50")}>
      <div className="bg-[#800000]/5 py-3 px-6 border-b flex flex-row items-center justify-between">
        <h4 className="text-sm font-black uppercase tracking-widest text-[#800000]">Blok {id} {isLocked && <Lock className="inline w-3 h-3 ml-1" />}</h4>
        {isBlockTuntas && <Badge className="bg-emerald-500 text-white font-black text-[10px] tracking-widest">TUNTAS</Badge>}
      </div>
      <CardContent className="p-6 space-y-6">
        <div className="bg-[#fffcf5] p-5 rounded-2xl border-2 border-[#800000]/10 max-h-[300px] overflow-y-auto no-scrollbar" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-3">
            {tokensA.map((t, idx) => renderToken(t, "text-rose-600"))}
            {tokensB.map((t, idx) => renderToken(t, "text-emerald-600"))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <CounterBox 
            label={`TM${id}a`} 
            count={state.a.count} 
            target={target} 
            isLocked={isLocked}
            passThreshold={passThreshold}
            onClick={() => onIncrement(id, 'a')} 
            colorClass="rose"
          />
          <CounterBox 
            label={`TM${id}b`} 
            count={state.b.count} 
            target={target} 
            isLocked={isLocked || isBLocked}
            passThreshold={passThreshold}
            onClick={() => onIncrement(id, 'b')} 
            colorClass="emerald"
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={() => onIncrement(id, 'combined')}
            disabled={isLocked || isCombinedLocked}
            className={cn(
              "w-full h-14 rounded-xl font-black text-lg transition-all shadow-md", 
              state.combined.count >= target ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#800000] hover:bg-[#800000]/90 shadow-[#800000]/20",
              (isLocked || isCombinedLocked) && "opacity-50"
            )}
          >
            {isLocked || isCombinedLocked ? <Lock className="mr-2" /> : null}
            {state.combined.count >= target ? <><CheckCircle2 className="mr-2" /> TUNTAS</> : `TM${id} GABUNGAN: ${state.combined.count} / ${target}`}
          </Button>
          {isCombinedLocked && !isLocked && (
            <p className="text-[9px] text-center text-amber-700 font-bold uppercase tracking-wider animate-pulse">
              Selesaikan TM{id}a & TM{id}b (min. {passThreshold}x) untuk buka Gabungan
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CounterBox({ label, count, target, onClick, colorClass, isLocked, passThreshold }: any) {
  const isTuntas = count >= passThreshold;
  
  const themes = {
    rose: isTuntas ? "bg-rose-50 border-rose-500 text-rose-700" : "bg-rose-50/30 border-rose-100 hover:border-rose-300 hover:bg-rose-50/50",
    emerald: isTuntas ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-emerald-50/30 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50",
  };

  const theme = colorClass === "rose" ? themes.rose : themes.emerald;

  return (
    <div 
      onClick={isLocked ? undefined : onClick}
      className={cn(
        "h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all select-none relative", 
        isLocked ? "bg-muted/20 border-muted opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95",
        !isLocked && theme
      )}
    >
      <span className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black">{count}</span>
        <span className="text-[10px] font-bold opacity-40">/ {target}</span>
      </div>
      {isTuntas && <CheckCircle2 className="w-4 h-4 mt-1 text-current" />}
      {isLocked && <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />}
    </div>
  );
}
