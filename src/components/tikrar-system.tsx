
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
  2: 10, // TM1 + TM2
  3: 5,  // TM1 + TM2 + TM3
  4: 3   // TM1 + TM2 + TM3 + TM4
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

  // Handle Initial Juz and Access
  useEffect(() => {
    if (!isUserDataLoading && userData) {
      if (isPaid && paidJuz) {
        setJuz(paidJuz);
        setPage(JUZ_PAGES[paidJuz - 1]);
      } else {
        setJuz(1);
        setPage(1);
      }
    }
  }, [userData, isPaid, paidJuz, isUserDataLoading]);

  const isTrial = page === 1 && juz === 1;
  const accessDenied = !isTrial && (!isPaid || (paidJuz !== null && juz !== paidJuz));

  const currentJuzStartPage = useMemo(() => JUZ_PAGES[juz - 1], [juz]);
  const nextJuzStartPage = juz < 30 ? JUZ_PAGES[juz] : 605;

  const playSfx = useCallback((type: 'click' | 'finish') => {
    if (typeof window === 'undefined') return;
    const soundUrls = {
      click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      finish: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
    };
    try {
      const audio = new Audio(soundUrls[type]);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Audio SFX Error:", e);
    }
  }, []);

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
    if (typeof window !== 'undefined') {
      const savedLevel = localStorage.getItem('tikrar_level');
      if (savedLevel) setLevel(parseInt(savedLevel));
    }

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
      } catch (e) {
        console.error("Parse Error", e);
      }
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
      localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify({ blocks, metaCombined }));
    }
  }, [blocks, metaCombined, page, loading]);

  const handleLevelSelect = (levelId: number) => {
    setLevel(levelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tikrar_level', levelId.toString());
    }
  };

  const incrementTM = (blockId: number, type: 'a' | 'b' | 'combined') => {
    if (accessDenied) return;
    const currentCount = blocks[blockId][type].count;
    if (currentCount >= TARGET_TM) return;
    const nextCount = currentCount + 1;
    if (nextCount === TARGET_TM) playSfx('finish');
    else playSfx('click');
    setBlocks(prev => ({ 
      ...prev, 
      [blockId]: { ...prev[blockId], [type]: { count: nextCount } } 
    }));
  };

  const incrementMeta = (metaId: number) => {
    if (accessDenied) return;
    const currentCount = metaCombined[metaId];
    if (currentCount >= RECOMMENDED_META) return;
    const nextCount = currentCount + 1;
    if (nextCount === RECOMMENDED_META) playSfx('finish');
    else playSfx('click');
    setMetaCombined(prev => ({ ...prev, [metaId]: nextCount }));
  };

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

  if (!level) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center py-10 animate-in fade-in duration-500">
        <div className="text-center space-y-2 max-w-md px-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#800000]/10 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#800000]" />
          </div>
          <h2 className="text-2xl font-bold font-headline">Pilih Level Tikrar Daily</h2>
          <p className="text-sm text-muted-foreground">Tentukan intensitas hafalan Anda. Akses Juz spesifik terbuka bagi yang sudah mendaftar.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
          {LEVELS.map((l) => (
            <Card key={l.id} className="cursor-pointer hover:border-[#800000] hover:bg-[#800000]/5 transition-all group" onClick={() => handleLevelSelect(l.id)}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg group-hover:text-[#800000] transition-colors">{l.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium">{l.desc}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#800000] group-hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getVersesForRange = (startBlock: number, endBlock: number) => {
    if (verses.length === 0) return [];
    const chunkSize = Math.ceil(verses.length / 4);
    const start = (startBlock - 1) * chunkSize;
    const end = endBlock * chunkSize;
    return verses.slice(start, end);
  };

  return (
    <div className="space-y-8">
      <Card className="border-none bg-gradient-to-br from-[#800000] to-[#b30000] text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-[-20px] top-[-20px] opacity-10"><CalendarDays className="w-40 h-40" /></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                  Level {LEVELS.find(l => l.id === level)?.name} ACTIVE
                </Badge>
                {isPaid ? (
                  <Badge className="bg-emerald-500/20 text-white border-none text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> JUZ {paidJuz} ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-white border-white/30 text-[9px] font-bold">MODE TRIAL (JUZ 1)</Badge>
                )}
              </div>
              <h3 className="text-xl font-bold font-headline">Juz {juz} • Halaman {page}</h3>
              <p className="text-xs opacity-80 max-w-sm">Anda sedang fokus menghafal <strong>Juz {juz}</strong>. Selesaikan setiap halaman untuk mengajukan ujian.</p>
            </div>
            {totalProgress >= 100 && (
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2">
                <a href={`https://wa.me/6281234567890?text=Assalamu'alaikum,%20saya%20sudah%20tuntas%20Tikrar%20Halaman%20${page}%20Juz%20${juz}%20dan%20ingin%20mengajukan%20ujian.`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" /> AJUKAN UJIAN
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-2xl border shadow-sm sticky top-20 z-20 backdrop-blur-md bg-white/90">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(currentJuzStartPage, p - 1))} disabled={loading || page <= currentJuzStartPage}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[100px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Halaman</p>
              <p className="text-2xl font-black text-[#800000]">{page}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(nextJuzStartPage - 1, p + 1))} disabled={loading || page >= nextJuzStartPage - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 w-full max-w-md space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#800000]">
            <span>Halaman {page} Progress</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2 bg-muted [&>div]:bg-[#800000]" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Menyiapkan Ayat...</p>
        </div>
      ) : accessDenied ? (
        <Card className="border-none bg-rose-50/50 py-20 border-2 border-dashed border-rose-200">
          <CardContent className="flex flex-col items-center justify-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-lg"><Lock className="w-10 h-10" /></div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold font-headline text-rose-900">Akses Juz Terkunci</h3>
              <p className="text-sm text-rose-800 max-w-sm mx-auto">
                Maaf, Anda hanya memiliki akses penuh untuk <strong>Juz {paidJuz || "yang telah didaftarkan"}</strong>. 
                User umum hanya dapat mencoba trial di Juz 1 Halaman 1.
              </p>
            </div>
            <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 font-bold px-8 h-12 shadow-xl">
              <Link href="/study-circles">Daftar Pilihan Juz di Menu Halaqah</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !isPrevPageDone ? (
        <Card className="border-none bg-muted/20 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><Lock className="w-10 h-10" /></div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-headline">Halaman Terkunci</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">Anda harus menuntaskan seluruh Tikrar di <strong>Halaman {page - 1}</strong> untuk membuka halaman ini.</p>
            </div>
            <Button onClick={() => setPage(page - 1)} variant="outline" className="font-bold gap-2"><ChevronLeft className="w-4 h-4" /> Kembali ke Hal {page - 1}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          <BlockCard 
            id={1} state={blocks[1]} verses={getVersesForRange(1, 1)}
            onIncrement={incrementTM} target={TARGET_TM} isLocked={false} 
          />
          
          <BlockCard 
            id={2} state={blocks[2]} verses={getVersesForRange(2, 2)}
            onIncrement={incrementTM} target={TARGET_TM} isLocked={blocks[1].combined.count < TARGET_TM} 
          />

          <MetaCombinedCard 
            id={2} title="Gabungan TM1 + TM2" count={metaCombined[2]} min={MIN_META[2]} target={RECOMMENDED_META}
            verses={getVersesForRange(1, 2)} isLocked={blocks[2].combined.count < TARGET_TM} onIncrement={() => incrementMeta(2)}
          />

          <BlockCard 
            id={3} state={blocks[3]} verses={getVersesForRange(3, 3)}
            onIncrement={incrementTM} target={TARGET_TM} isLocked={metaCombined[2] < MIN_META[2]} 
          />

          <MetaCombinedCard 
            id={3} title="Gabungan TM1 + TM2 + TM3" count={metaCombined[3]} min={MIN_META[3]} target={RECOMMENDED_META}
            verses={getVersesForRange(1, 3)} isLocked={blocks[3].combined.count < TARGET_TM} onIncrement={() => incrementMeta(3)}
          />

          <BlockCard 
            id={4} state={blocks[4]} verses={getVersesForRange(4, 4)}
            onIncrement={incrementTM} target={TARGET_TM} isLocked={metaCombined[3] < MIN_META[3]} 
          />

          <MetaCombinedCard 
            id={4} title="Gabungan Akhir TM1-4" count={metaCombined[4]} min={MIN_META[4]} target={RECOMMENDED_META}
            verses={getVersesForRange(1, 4)} isLocked={blocks[4].combined.count < TARGET_TM} onIncrement={() => incrementMeta(4)}
          />
        </div>
      )}
    </div>
  );
}

function BlockCard({ id, state, verses, onIncrement, target, isLocked }: any) {
  const isBlockDone = state.combined.count >= target;
  
  const { partA, partB } = useMemo(() => {
    const allWords: any[] = [];
    verses.forEach((v: Verse) => {
      v.words.forEach((w, idx) => {
        allWords.push({ 
          ...w, 
          verse_id: v.id, 
          verse_key: v.verse_key,
          is_last_word: idx === v.words.length - 1
        });
      });
    });

    const splitIdx = allWords.findIndex((w, i) => {
      const isAtWaqaf = WAQAF_CHARS.some(char => w.text_uthmani.includes(char));
      const isNearCenter = i >= allWords.length * 0.4 && i <= allWords.length * 0.6;
      return (isAtWaqaf && isNearCenter) || (w.is_last_word && isNearCenter);
    });

    const finalSplit = splitIdx === -1 ? Math.ceil(allWords.length / 2) : splitIdx + 1;
    return {
      partA: allWords.slice(0, finalSplit),
      partB: allWords.slice(finalSplit)
    };
  }, [verses]);

  return (
    <Card className={cn("border-2 transition-all duration-500 overflow-hidden shadow-lg", isLocked ? "opacity-50 pointer-events-none grayscale" : isBlockDone ? "border-emerald-500 bg-emerald-50/20" : "border-muted")}>
      <CardHeader className="bg-[#800000]/5 py-3 px-6 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold font-headline text-[#800000]">BLOK TM {id}</CardTitle>
        <div className="flex gap-2">
          {isBlockDone ? <Badge className="bg-emerald-500">SELESAI</Badge> : isLocked ? <Lock className="w-4 h-4" /> : <Badge variant="outline">PROGRESS</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="bg-[#fffdf5] p-5 rounded-2xl border-2 border-[#800000]/10 max-h-[280px] overflow-y-auto no-scrollbar" dir="rtl">
           <TooltipProvider delayDuration={0}>
             <div className="flex flex-wrap justify-center items-center gap-x-0 gap-y-3 text-center">
               {partA.map((w, i) => (
                 <WordItem key={`a-${i}`} word={w} color="text-[#800000]" />
               ))}
               {partB.map((w, i) => (
                 <WordItem key={`b-${i}`} word={w} color="text-emerald-700" />
               ))}
             </div>
           </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MaqtaCounter label={`TM${id}a`} count={state.a.count} target={target} onClick={() => onIncrement(id, 'a')} disabled={isLocked} active={state.a.count < target} />
          <MaqtaCounter label={`TM${id}b`} count={state.b.count} target={target} onClick={() => onIncrement(id, 'b')} disabled={isLocked || state.a.count < target} active={state.a.count >= target && state.b.count < target} />
        </div>
        <Button 
          onClick={() => onIncrement(id, 'combined')} 
          disabled={isLocked || state.a.count < target || state.b.count < target}
          className={cn("w-full h-16 rounded-xl font-bold transition-all", state.combined.count >= target ? "bg-emerald-500" : "bg-[#800000] scale-105 shadow-xl")}
        >
          Gabungan {id}a+b: {state.combined.count} / {target}
        </Button>
      </CardContent>
    </Card>
  );
}

function MetaCombinedCard({ title, count, min, target, verses, isLocked, onIncrement }: any) {
  const isMinTapped = count >= min;
  return (
    <Card className={cn("border-2 shadow-xl transition-all", isLocked ? "opacity-50 grayscale pointer-events-none" : "border-amber-200 bg-amber-50/30")}>
      <CardHeader className="py-3 px-6 bg-amber-100/50 border-b"><CardTitle className="text-amber-900 font-headline flex items-center gap-2"><Zap className="w-4 h-4" /> {title}</CardTitle></CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="max-h-[220px] overflow-y-auto no-scrollbar bg-white/80 p-5 rounded-xl border-2 border-dashed border-amber-200" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-3 text-center">
            {verses.map((v: Verse) => (
              <React.Fragment key={v.id}>
                {v.words.map((w, idx) => (
                  <span key={idx} className="text-xl md:text-2xl font-arabic text-amber-950 leading-[2.4]">{w.text_uthmani}</span>
                ))}
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-amber-300 text-[9px] font-bold mx-1 text-amber-800 bg-amber-50">({v.verse_key.split(':')[1]})</span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <Button onClick={onIncrement} className={cn("w-full h-20 rounded-2xl text-2xl font-black transition-all", isMinTapped ? "bg-emerald-500 hover:bg-emerald-600 scale-105 shadow-xl" : "bg-amber-600 hover:bg-amber-700")}>
          {count} / {target}
        </Button>
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-amber-800 bg-amber-100/50 py-2 rounded-lg">
          {isMinTapped ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          Minimal {min}x untuk lanjut ke tahap berikutnya
        </div>
      </CardContent>
    </Card>
  );
}

function WordItem({ word, color }: any) {
  return (
    <React.Fragment>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-xl md:text-2xl font-arabic leading-[2.6] outline-none cursor-help px-0.5 inline-block transition-colors hover:bg-black/5 rounded", color)}>
            {word.text_uthmani}
          </span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent className="bg-black text-white border-none shadow-lg py-1 px-2 z-[100]">
            <p className="text-[10px] font-medium">{word.translation?.text || "..."}</p>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
      {word.is_last_word && (
        <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full border text-[8px] font-bold mx-1 bg-white/50", color.replace('text-', 'border-'))}>
          ({word.verse_key.split(':')[1]})
        </span>
      )}
    </React.Fragment>
  );
}

function MaqtaCounter({ label, count, target, onClick, disabled, active }: any) {
  const isDone = count >= target;
  return (
    <div 
      onClick={disabled || isDone ? undefined : onClick} 
      className={cn(
        "relative h-24 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all", 
        disabled ? "bg-muted opacity-50 cursor-not-allowed" : 
        isDone ? "bg-emerald-50 border-emerald-500 text-emerald-700" :
        active ? "border-[#800000] bg-white shadow-md scale-105 z-10" : "bg-muted/20 border-muted"
      )}
    >
      <span className="text-[10px] font-bold uppercase opacity-60">{label}</span>
      <span className="text-3xl font-black">{count}</span>
      <span className="text-[8px] font-bold opacity-40">/ {target}</span>
      {isDone && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-emerald-500" />}
      {!isDone && disabled && <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />}
    </div>
  );
}
