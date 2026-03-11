
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
  Clock,
  Minus,
  Plus,
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
const PASS_THRESHOLD = 5; // Minimal 5x untuk Maqta internal
const META_PASS_THRESHOLD = 10; // Minimal 10x untuk Gabungan antar Blok

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
  const [fontSize, setFontSize] = useState(18); // Default font 18px
  
  const [blocks, setBlocks] = useState<any>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
  });

  const [metaCounts, setMetaCounts] = useState<Record<string, number>>({
    '1_2': 0,
    '2_3': 0,
    '1_2_3': 0,
    '3_4': 0,
    '2_3_4': 0,
    '1_2_3_4': 0,
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
        console.error("Tikrar Maqta Fetch Error:", error);
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
        setMetaCounts(saved.metaCounts || {
          '1_2': 0, '2_3': 0, '1_2_3': 0, '3_4': 0, '2_3_4': 0, '1_2_3_4': 0,
        });
      } catch (e) {}
    } else {
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
    if (!loading && typeof window !== 'undefined') {
      const existing = localStorage.getItem(`tikrar_progress_p${page}`);
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify({ 
        ...parsed,
        blocks,
        metaCounts
      }));
    }
  }, [blocks, metaCounts, page, loading]);

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

  const isTuntasTM = (mid: number) => blocks[mid].combined.count >= PASS_THRESHOLD;
  const isMetaTuntas = (key: string) => (metaCounts[key] || 0) >= META_PASS_THRESHOLD;

  const totalProgress = useMemo(() => {
    let totalDone = 0;
    [1, 2, 3, 4].forEach(id => {
      totalDone += Math.min(blocks[id].a.count, PASS_THRESHOLD);
      totalDone += Math.min(blocks[id].b.count, PASS_THRESHOLD);
      totalDone += Math.min(blocks[id].combined.count, PASS_THRESHOLD);
    });
    Object.keys(metaCounts).forEach(k => {
      totalDone += (Math.min(metaCounts[k], META_PASS_THRESHOLD) / META_PASS_THRESHOLD) * PASS_THRESHOLD;
    });
    const totalTarget = (12 * PASS_THRESHOLD) + (6 * PASS_THRESHOLD);
    return Math.min(100, (totalDone / totalTarget) * 100);
  }, [blocks, metaCounts]);

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
    <div className="space-y-8 pb-32">
      <Card className="border-none bg-gradient-to-br from-[#800000] to-[#b30000] text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-[-20px] top-[-20px] opacity-10"><CalendarDays className="w-40 h-40" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <Badge className="bg-white/20 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                  Level {LEVELS.find(l => l.id === userData?.tikrarLevel)?.name || "Santai"}
                </Badge>
                <h3 className="text-2xl font-bold font-headline">Juz {juz} • Halaman {page}</h3>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex flex-col items-end">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter opacity-80 mb-1">
                  <Clock className="w-3 h-3" /> Status Progres
                </div>
                <div className="text-lg font-black">{Math.round(totalProgress)}% <span className="text-xs font-medium opacity-60">Tuntas</span></div>
              </div>
            </div>
            <Progress value={totalProgress} className="h-1.5 bg-white/10 [&>div]:bg-white" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-6 bg-white p-4 rounded-2xl border shadow-sm sticky top-20 z-20 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(currentJuzStartPage, p - 1))} disabled={loading || page <= currentJuzStartPage} className="rounded-xl h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-xl font-black text-[#800000] w-12 text-center">{page}</span>
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(nextJuzStartPage - 1, p + 1))} disabled={loading || page >= nextJuzStartPage - 1} className="rounded-xl h-10 w-10">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.max(12, f - 4))}><Minus className="h-4 w-4" /></Button>
          <span className="text-xs font-bold w-6 text-center">{fontSize}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFontSize(f => Math.min(64, f + 4))}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MaqtaCard id={1} page={page} state={blocks[1]} verses={blockVerses[1]} isLocked={false} onIncrement={setBlocks} fontSize={fontSize} />
            <MaqtaCard id={2} page={page} state={blocks[2]} verses={blockVerses[2]} isLocked={!isTuntasTM(1)} onIncrement={setBlocks} fontSize={fontSize} />
          </div>

          <MetaStep 
            label="GABUNG BLOK A & B" 
            count={metaCounts['1_2']} 
            isLocked={!isTuntasTM(1) || !isTuntasTM(2)} 
            onIncrement={() => setMetaCounts(p => ({...p, '1_2': p['1_2'] + 1}))} 
          />

          <MaqtaCard id={3} page={page} state={blocks[3]} verses={blockVerses[3]} isLocked={!isMetaTuntas('1_2')} onIncrement={setBlocks} fontSize={fontSize} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetaStep label="GABUNG BLOK B & C" count={metaCounts['2_3']} isLocked={!isTuntasTM(3)} onIncrement={() => setMetaCounts(p => ({...p, '2_3': p['2_3'] + 1}))} />
            <MetaStep label="GABUNG BLOK A s/d C" count={metaCounts['1_2_3']} isLocked={!isMetaTuntas('2_3')} onIncrement={() => setMetaCounts(p => ({...p, '1_2_3': p['1_2_3'] + 1}))} />
          </div>

          <MaqtaCard id={4} page={page} state={blocks[4]} verses={blockVerses[4]} isLocked={!isMetaTuntas('1_2_3')} onIncrement={setBlocks} fontSize={fontSize} />

          <div className="space-y-4">
            <MetaStep label="GABUNG BLOK C & D" count={metaCounts['3_4']} isLocked={!isTuntasTM(4)} onIncrement={() => setMetaCounts(p => ({...p, '3_4': p['3_4'] + 1}))} />
            <MetaStep label="GABUNG BLOK B s/d D" count={metaCounts['2_3_4']} isLocked={!isMetaTuntas('3_4')} onIncrement={() => setMetaCounts(p => ({...p, '2_3_4': p['2_3_4'] + 1}))} />
            <MetaStep label="GABUNG SELURUH HALAMAN (A - D)" count={metaCounts['1_2_3_4']} isLocked={!isMetaTuntas('2_3_4')} onIncrement={() => setMetaCounts(p => ({...p, '1_2_3_4': p['1_2_3_4'] + 1}))} highlight />
          </div>

          {isMetaTuntas('1_2_3_4') && (
            <Card className="bg-emerald-600 text-white border-none shadow-xl animate-in zoom-in duration-500">
              <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                <CheckCircle2 className="w-16 h-16" />
                <h4 className="text-2xl font-black font-headline">Masyallah, Halaman Tuntas!</h4>
                <p className="text-sm opacity-90 max-w-sm">Anda telah menyelesaikan seluruh urutan repetisi untuk halaman ini. Silakan ajukan jadwal ujian lisan kepada Admin.</p>
                <Button asChild className="bg-white text-emerald-700 font-black px-10 h-14 rounded-2xl shadow-lg mt-2">
                  <a href={`https://wa.me/6281234567890?text=Assalamu'alaikum,%20saya%20sudah%20tuntas%20Tikrar%20Halaman%20${page}%20Juz%20${juz}.%20Mohon%20jadwal%20ujian.`} target="_blank">AJUKAN UJIAN SEKARANG</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

function MaqtaCard({ id, page, state, verses, onIncrement, fontSize, isLocked }: any) {
  const isDoneA = state.a.count >= PASS_THRESHOLD;
  const isDoneB = state.b.count >= PASS_THRESHOLD;
  const isDoneG = state.combined.count >= PASS_THRESHOLD;

  const blockLetters = ["", "A", "B", "C", "D"];
  const letter = blockLetters[id];

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

  const mid = Math.ceil(tokens.length / 2);
  const tokensA = tokens.slice(0, mid);
  const tokensB = tokens.slice(mid);

  const renderToken = (token: any, color: string) => {
    if (token.type === 'word') {
      return (
        <Tooltip key={`${token.verse_key}-${token.word_idx}`}>
          <TooltipTrigger asChild>
            <span style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }} className={cn("font-arabic cursor-help hover:bg-muted/50 rounded px-0.5 outline-none transition-colors", color)}>
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
    }
    return <span key={`${token.verse_key}-m`} className="inline-flex items-center justify-center px-2 rounded-full border text-[10px] font-bold mx-1 bg-white/50 translate-y-[-2px]">{token.text}</span>;
  };

  return (
    <Card className={cn("border-2 transition-all shadow-md overflow-hidden", isDoneG ? "border-emerald-500 bg-emerald-50/10" : "border-muted", isLocked && "opacity-50 grayscale select-none")}>
      <div className="bg-[#800000]/5 py-2 px-4 border-b flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">BLOK {letter} (HALAMAN {page}{letter}) {isLocked && "• TERKUNCI"}</span>
        {isDoneG && <Badge className="bg-emerald-500 text-white font-black text-[8px] tracking-widest h-4">TUNTAS</Badge>}
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="bg-[#fffcf5] p-4 rounded-xl border-2 border-[#800000]/10 max-h-[200px] overflow-y-auto no-scrollbar" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
            {tokensA.map(t => renderToken(t, "text-rose-600"))}
            {tokensB.map(t => renderToken(t, "text-emerald-600"))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CounterBox label={`${page}${letter}-1`} count={state.a.count} isLocked={isLocked} onInc={() => onIncrement((p:any) => ({...p, [id]: {...p[id], a: {count: p[id].a.count + 1}}}))} color="rose" threshold={PASS_THRESHOLD} />
          <CounterBox label={`${page}${letter}-2`} count={state.b.count} isLocked={isLocked || !isDoneA} onInc={() => onIncrement((p:any) => ({...p, [id]: {...p[id], b: {count: p[id].b.count + 1}}}))} color="emerald" threshold={PASS_THRESHOLD} />
        </div>
        <Button onClick={() => onIncrement((p:any) => ({...p, [id]: {...p[id], combined: {count: p[id].combined.count + 1}}}))} disabled={isLocked || !isDoneB} className={cn("w-full h-14 flex-col rounded-xl font-black uppercase tracking-widest", isDoneG ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#800000] hover:bg-[#800000]/90")}>
          <span className="text-[10px] flex items-center gap-1">
            {isLocked || !isDoneB ? <Lock className="w-3 h-3" /> : null}
            {page}{letter} GABUNGAN
          </span>
          <span className="text-base">{state.combined.count} / {TARGET_MAX}</span>
          <span className="text-[8px] opacity-70">Minimal {PASS_THRESHOLD} kali</span>
        </Button>
      </CardContent>
    </Card>
  );
}

function MetaStep({ label, count, isLocked, onIncrement, highlight }: any) {
  const isDone = count >= META_PASS_THRESHOLD;
  return (
    <div className={cn("relative p-4 rounded-2xl border-2 flex items-center justify-between transition-all", isDone ? "bg-emerald-50 border-emerald-500" : "bg-muted/10 border-muted", highlight && "border-amber-500 bg-amber-50/30", isLocked && "opacity-40 grayscale select-none")}>
      <div className="flex items-center gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs", isDone ? "bg-emerald-500 text-white" : highlight ? "bg-amber-500 text-white" : "bg-[#800000]/10 text-[#800000]")}>
          {isLocked ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-current" />}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Repetisi Gabungan</span>
          <span className={cn("text-sm font-black uppercase tracking-tight", highlight ? "text-amber-900" : "text-[#800000]")}>{label}</span>
          <span className="text-[9px] font-bold text-muted-foreground">Minimal {META_PASS_THRESHOLD} kali</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{count} / {TARGET_MAX}</span>
          <div className="w-20 h-1 bg-muted rounded-full mt-1 overflow-hidden"><div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${(count/TARGET_MAX)*100}%` }} /></div>
        </div>
        <Button onClick={onIncrement} disabled={isLocked || isDone} className={cn("h-10 w-10 rounded-lg p-0 font-black text-xs", isDone ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-[#800000] border-2 border-[#800000] hover:bg-[#800000] hover:text-white")}>
          {isDone ? <CheckCircle2 className="w-5 h-5" /> : `+1`}
        </Button>
      </div>
    </div>
  );
}

function CounterBox({ label, count, isLocked, onInc, color, threshold }: any) {
  const isDone = count >= threshold;
  const themes: any = {
    rose: isDone ? "bg-rose-50 border-rose-500 text-rose-700" : "bg-white border-muted hover:border-rose-300",
    emerald: isDone ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-muted hover:border-emerald-300"
  };
  return (
    <div onClick={isLocked || isDone ? undefined : onInc} className={cn("h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative", isLocked ? "opacity-50 grayscale cursor-not-allowed bg-muted/20" : themes[color])}>
      <span className="text-[8px] font-black uppercase opacity-60 tracking-[0.2em]">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black">{count}</span>
        <span className="text-[8px] font-bold opacity-40">/ {TARGET_MAX}</span>
      </div>
      <span className="text-[8px] font-bold opacity-60 mt-0.5">Minimal {threshold} kali</span>
      {isLocked && <Lock className="absolute top-1 right-1 w-2.5 h-2.5 text-muted-foreground" />}
      {isDone && <CheckCircle2 className="w-3 h-3 text-current mt-0.5" />}
    </div>
  );
}
