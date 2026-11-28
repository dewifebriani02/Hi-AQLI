'use client';

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  BookOpen,
  Search,
  CheckCircle2,
  Star,
  Lock,
  RotateCcw,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import {
  IRAB_SURAH_LIST,
  IRAB_ORDERED_KEYS,
  getIrabVersesBySurah,
} from "@/lib/irab-data";
import { useUser, useCollection } from "@/db";

function IrabIndexContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"semua" | "tersedia">("semua");

  // Backward compatibility for legacy /irab?surah=X links
  useEffect(() => {
    const s = searchParams.get("surah");
    if (s && /^\d+$/.test(s)) {
      router.replace(`/irab/${s}`);
    }
  }, [searchParams, router]);

  const { user } = useUser();

  const progressOptions = useMemo(
    () => ({
      filters: [{ column: "user_id", operator: "==", value: user?.id }],
    }),
    [user?.id]
  );

  const { data: progress } = useCollection(
    user ? "quiz_attempts" : null,
    progressOptions
  );

  const { passedKeys, passedCountBySurah } = useMemo(() => {
    const keys = new Set<string>();
    const bySurah = new Map<number, Set<number>>();
    if (!progress) return { passedKeys: keys, passedCountBySurah: bySurah };

    progress.forEach((p: any) => {
      if (!p.quiz_id?.startsWith("irab_")) return;
      const isPassed =
        p.is_passed ||
        (Number(p.total_questions) > 0 &&
          Number(p.score) >= Number(p.total_questions));
      if (!isPassed) return;

      const key = p.quiz_id.replace("irab_", "");
      keys.add(key);

      const match = key.match(/^(\d+):(\d+)$/);
      const sNum = match ? parseInt(match[1], 10) : Number(p.surah_id);
      const vNum = match ? parseInt(match[2], 10) : Number(p.verse_id);
      if (sNum > 0 && vNum > 0) {
        if (!bySurah.has(sNum)) bySurah.set(sNum, new Set());
        bySurah.get(sNum)!.add(vNum);
      }
    });

    return { passedKeys: keys, passedCountBySurah: bySurah };
  }, [progress]);

  const availableSurahMap = useMemo(() => {
    const map = new Map<number, number>();
    IRAB_SURAH_LIST.forEach((s) => {
      const verses = getIrabVersesBySurah(s.id);
      map.set(Number(s.id), verses.length || s.totalAyat);
    });
    return map;
  }, []);

  const totalPassedVerses = useMemo(
    () => IRAB_ORDERED_KEYS.filter((k) => passedKeys.has(k)).length,
    [passedKeys]
  );

  const filteredSurahs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return QURAN_CHAPTERS.filter((s) => {
      if (filterTab === "tersedia" && !availableSurahMap.has(s.id)) {
        return false;
      }
      if (!q) return true;
      return (
        s.name_simple.toLowerCase().includes(q) ||
        s.translated_name.toLowerCase().includes(q) ||
        String(s.id) === q
      );
    });
  }, [searchQuery, filterTab, availableSurahMap]);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto px-3 sm:px-4">
      {/* Header — Mirrors Hi Mufradat */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4 px-1">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[#800000]">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-7 w-7 -ml-1.5 rounded-full text-[#800000]"
            >
              <Link href="/">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            </Button>
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">
              Hi I&apos;rab • Nahwu &amp; Shorof Per Surat
            </span>
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Bedah I&apos;rab Al-Qur&apos;an
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            Pilih surat untuk menguraikan kedudukan kata (I&apos;rab) dan akar kata (Shorof) per ayat.
          </p>
        </div>

        {/* Compact Progress Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-11 px-4 rounded-2xl border-2 border-[#800000]/15 bg-white flex items-center gap-2.5 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col leading-none gap-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                Progres I&apos;rab
              </span>
              <span className="text-xs font-black text-[#800000]">
                {totalPassedVerses} / {IRAB_ORDERED_KEYS.length} Ayat Lulus
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search — Mirrors Hi Mufradat */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-[#800000] transition-colors" />
        </div>
        <Input
          type="text"
          placeholder="Cari nomor atau nama surat..."
          className="h-13 sm:h-14 pl-12 pr-10 bg-white border border-slate-100 shadow-lg rounded-2xl text-sm sm:text-base font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#800000]/20 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-[#800000]"
            aria-label="Hapus pencarian"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs — Mirrors Hi Mufradat TabsList */}
      <Tabs
        value={filterTab}
        onValueChange={(v) => setFilterTab(v as "semua" | "tersedia")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-5 h-11 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger
            value="semua"
            className="font-bold gap-1.5 text-xs data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" /> Semua Surat ({QURAN_CHAPTERS.length})
          </TabsTrigger>
          <TabsTrigger
            value="tersedia"
            className="font-bold gap-1.5 text-xs data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all"
          >
            <Layers className="w-3.5 h-3.5" /> Tersedia Materi ({IRAB_SURAH_LIST.length})
          </TabsTrigger>
        </TabsList>

        {/* 114-Surah Grid — Identical Card Design to Hi Mufradat SurahList */}
        {filteredSurahs.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-2 border-slate-200 bg-white rounded-2xl">
            <p className="text-sm font-bold text-slate-600">
              Surat &ldquo;{searchQuery}&rdquo; tidak ditemukan.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-[#800000] font-bold"
              onClick={() => setSearchQuery("")}
            >
              Tampilkan Semua Surat
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
            {filteredSurahs.map((surah) => {
              const availableVersesCount = availableSurahMap.get(surah.id) || 0;
              const isAvailable = availableVersesCount > 0;
              const passedCount = passedCountBySurah.get(surah.id)?.size || 0;
              const isCompleted =
                isAvailable && passedCount >= availableVersesCount;

              const cardContent = (
                <Card
                  className={cn(
                    "p-4 transition-all group border-none shadow-sm relative overflow-hidden h-full",
                    isAvailable
                      ? "cursor-pointer"
                      : "opacity-45 grayscale pointer-events-none select-none border border-slate-200",
                    isCompleted
                      ? "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100/80"
                      : "bg-white hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {!isAvailable && (
                    <div className="absolute top-2 right-2 p-1.5 bg-slate-400/20 rounded-full">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-lg shadow-sm">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm transition-all rotate-45 shrink-0",
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : !isAvailable
                            ? "bg-slate-200 text-slate-400"
                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                        )}
                      >
                        <span className="-rotate-45">{surah.id}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h2
                          className={cn(
                            "font-bold text-base truncate",
                            isCompleted && "text-emerald-900"
                          )}
                        >
                          {surah.name_simple}
                        </h2>
                        <p
                          className={cn(
                            "text-xs text-muted-foreground truncate",
                            isCompleted
                              ? "text-emerald-700/70"
                              : "group-hover:text-accent-foreground/80"
                          )}
                        >
                          {surah.translated_name} • {surah.verses_count} Ayat
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <div
                        className={cn(
                          "text-xl font-arabic leading-none",
                          isCompleted ? "text-emerald-800" : "mb-1"
                        )}
                      >
                        {surah.name_arabic}
                      </div>
                      {isCompleted ? (
                        <div className="flex items-center gap-1 bg-emerald-200/50 px-1.5 py-0.5 rounded text-[8px] font-black text-emerald-800 uppercase tracking-tighter">
                          <Star className="w-2 h-2 fill-current" /> Lulus
                        </div>
                      ) : (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-accent-foreground/80 font-semibold">
                          {!isAvailable
                            ? "SEGERA HADIR"
                            : surah.revelation_place === "makkah"
                            ? "Makkiyah"
                            : "Madaniyah"}
                        </div>
                      )}
                    </div>
                  </div>

                  {passedCount > 0 && !isCompleted && isAvailable && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        <span>Progres I&apos;rab</span>
                        <span>
                          {passedCount}/{availableVersesCount} Ayat
                        </span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#800000]"
                          style={{
                            width: `${(passedCount / availableVersesCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              );

              if (!isAvailable) {
                return <div key={surah.id}>{cardContent}</div>;
              }

              return (
                <Link key={surah.id} href={`/irab/${surah.id}`}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        )}
      </Tabs>
    </div>
  );
}

export default function IrabPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-orange-50/30" />}>
      <IrabIndexContent />
    </Suspense>
  );
}
