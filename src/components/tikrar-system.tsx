
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import Link from "next/link";

const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

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

const LEVELS = [
  { id: 1, name: "Intensif", days: 7 },
  { id: 2, name: "Reguler", days: 14 },
  { id: 3, name: "Santai", days: 21 },
  { id: 4, name: "Pemula", days: 28 },
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
  const paidJuz = userData?.paidJuz || 1;

  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  
  const [blocks, setBlocks] = useState<Record<number, BlockState>>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  useEffect(() => {
    if (!isUserDataLoading && userData) {
      setJuz(paidJuz);
      // Only set initial page once
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
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani`
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
      } catch (e) {}
    } else {
      setBlocks({
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
      });
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
      }));
    }
  }, [blocks, page, loading]);

  const scheduleInfo = useMemo(() => {
    if (!userData?.tikrarStartDate) return null;
    const start = userData.tikrarStartDate.toDate();
    const today = new Date();
    const diff = Math.ceil(Math.abs(today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const level = LEVELS.find(l => l.id === userData.tikrarLevel) || LEVELS[2];
    return { currentDay: diff, totalDays: level.days };
  }, [userData]);

  const totalProgress = useMemo(() => {
    let totalDone = 0;
    const totalTarget = 4 * 3 * TARGET_TM; // 4 blocks, each has a, b, and combined
    Object.values(blocks).forEach(b => {
      totalDone += Math.min(b.a.count, TARGET_TM);
      totalDone += Math.min(b.b.count, TARGET_TM);
      totalDone += Math.min(b.combined.count, TARGET_TM);
    });
    return (totalDone / totalTarget) * 100;
  }, [blocks]);

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
      {/* Header Progres */}
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
                <span className="text-[10px] font-bold uppercase opacity-60">Progres Repetisi Halaman Ini</span>
                <span className="text-[10px] font-bold">{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} className="h-1.5 bg-white/10 [&>div]:bg-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigasi Halaman & Font */}
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

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-8 pb-20">
          {[1, 2, 3, 4].map(id => (
            <BlockCard 
              key={id} 
              id={id} 
              state={blocks[id]} 
              verses={verses.slice((id-1) * Math.ceil(verses.length/4), id * Math.ceil(verses.length/4))}
              onIncrement={(bid: number, type: 'a' | 'b' | 'combined') => {
                const current = blocks[bid][type].count;
                if (current < TARGET_TM) {
                  setBlocks(prev => ({
                    ...prev, 
                    [bid]: {
                      ...prev[bid], 
                      [type]: { count: current + 1 }
                    }
                  }));
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
    <Card className={cn("border-2 transition-all shadow-lg overflow-hidden", isDone ? "border-emerald-500 bg-emerald-50/10" : "border-muted")}>
      <div className="bg-[#800000]/5 py-3 px-6 border-b flex flex-row items-center justify-between">
        <h4 className="text-sm font-black uppercase tracking-widest text-[#800000]">Blok TM {id}</h4>
        {isDone && <Badge className="bg-emerald-500 text-white font-black text-[10px] tracking-widest">DONE</Badge>}
      </div>
      <CardContent className="p-6 space-y-6">
        <div className="bg-[#fffcf5] p-5 rounded-2xl border-2 border-[#800000]/10 max-h-[200px] overflow-y-auto no-scrollbar" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
            {verses.map((v: any) => (
              <React.Fragment key={v.id}>
                {v.words.map((w: any, idx: number) => (
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
          className={cn(
            "w-full h-14 rounded-xl font-black text-lg transition-all shadow-md", 
            isDone ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#800000] hover:bg-[#800000]/90 shadow-[#800000]/20"
          )}
        >
          {isDone ? <><CheckCircle2 className="mr-2" /> TUNTAS</> : `GABUNGAN ${id}: ${state.combined.count} / ${target}`}
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
      className={cn(
        "h-24 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 select-none", 
        isDone ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-muted/20 border-muted hover:border-[#800000]/30 hover:bg-white"
      )}
    >
      <span className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black">{count}</span>
        <span className="text-[10px] font-bold opacity-40">/ {target}</span>
      </div>
      {isDone && <CheckCircle2 className="w-4 h-4 mt-1" />}
    </div>
  );
}
