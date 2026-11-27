'use client';

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Sparkles,
  BookOpen,
  Zap,
  Layers,
  CheckCircle2,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  IRAB_SURAH_LIST,
  getIrabVersesBySurah,
} from "@/lib/irab-data";
import { useUser, useCollection } from "@/db";

function IrabIndexContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSurah = searchParams.get("surah") || "1";
  const [selectedSurahId, setSelectedSurahId] = useState<string>(
    IRAB_SURAH_LIST.some((s) => s.id === initialSurah) ? initialSurah : "1"
  );

  useEffect(() => {
    const s = searchParams.get("surah");
    if (s && IRAB_SURAH_LIST.some((item) => item.id === s)) {
      setSelectedSurahId(s);
    }
  }, [searchParams]);

  const { user } = useUser();

  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
    ]
  }), [user?.id]);

  const { data: progress } = useCollection(user ? "quiz_attempts" : null, progressOptions);

  const passedKeys = useMemo(() => {
    const set = new Set<string>();
    if (!progress) return set;
    progress.forEach((p: any) => {
      if (!p.quiz_id?.startsWith("irab_")) return;
      const isPassed = p.is_passed || (Number(p.total_questions) > 0 && Number(p.score) >= Number(p.total_questions));
      if (isPassed) {
        const key = p.quiz_id.replace("irab_", "");
        set.add(key);
      }
    });
    return set;
  }, [progress]);

  const activeSurah = useMemo(
    () => IRAB_SURAH_LIST.find((s) => s.id === selectedSurahId) || IRAB_SURAH_LIST[0],
    [selectedSurahId]
  );

  const activeVerses = useMemo(
    () => getIrabVersesBySurah(activeSurah.id),
    [activeSurah.id]
  );

  const handleSelectSurah = (id: string) => {
    setSelectedSurahId(id);
    router.replace(`/irab?surah=${id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-orange-100 px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000]">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-black text-[#800000] leading-none uppercase">Hi I&apos;rab</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Nahwu &amp; Shorof • Bedah Tata Bahasa Al-Qur&apos;an</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full space-y-6">
        {/* Intro Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-[#800000] to-[#5a0000] text-white overflow-hidden relative rounded-3xl">
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            <Sparkles className="w-40 h-40" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1.5">Pelajari I&apos;rab Al-Qur&apos;an Per Ayat</h2>
                <p className="text-sm opacity-90 leading-relaxed">
                  I&apos;rab (إعراب) adalah ilmu Nahwu yang menguraikan kedudukan setiap kata dan perubahan harakat akhirnya dalam kalimat Al-Qur&apos;an, dilengkapi uji pemahaman per ayat seperti di Hi Mufradat.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Surah Selector Tabs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">Pilih Surah</h3>
            <div className="h-[1px] flex-1 bg-orange-100" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {IRAB_SURAH_LIST.map((surah) => {
              const verses = getIrabVersesBySurah(surah.id);
              const doneCount = verses.filter((v) => passedKeys.has(v.key)).length;
              const isSelected = surah.id === activeSurah.id;

              return (
                <button
                  key={surah.id}
                  type="button"
                  onClick={() => handleSelectSurah(surah.id)}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2",
                    isSelected
                      ? "bg-[#800000] text-white border-[#800000] shadow-md"
                      : "bg-white text-slate-800 border-orange-100 hover:border-[#800000]/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-md",
                      isSelected ? "bg-white/20 text-white" : "bg-[#800000]/10 text-[#800000]"
                    )}>
                      QS. {surah.id}
                    </span>
                    <span className={cn("font-arabic text-base font-bold", isSelected ? "text-[#D4AF37]" : "text-[#800000]")}>
                      {surah.nameArab}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm truncate">{surah.name}</p>
                    <p className={cn("text-[10px] font-bold mt-0.5", isSelected ? "text-white/80" : "text-muted-foreground")}>
                      {doneCount}/{surah.totalAyat} Ayat Lulus
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daftar Ayat dalam Surah Terpilih */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">
                QS. {activeSurah.name} ({activeSurah.totalAyat} Ayat)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground">
              {activeSurah.meaning} • Juz {activeSurah.juz}
            </span>
          </div>

          <div className="grid gap-3">
            {activeVerses.map((item) => {
              const isCompleted = passedKeys.has(item.key);
              const arabicFull = item.words.map((w) => w.word).join(" ");

              return (
                <Card
                  key={item.key}
                  className={cn(
                    "border-2 shadow-sm bg-white hover:shadow-md transition-all overflow-hidden rounded-2xl",
                    isCompleted ? "border-emerald-200" : "border-transparent"
                  )}
                >
                  <div className="p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs",
                          isCompleted
                            ? "bg-emerald-600 text-white"
                            : "bg-gradient-to-br from-[#800000] to-[#5a0000] text-white"
                        )}>
                          {item.ayat}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm sm:text-base text-[#800000]">
                              {item.surah} : Ayat {item.ayat}
                            </h4>
                            {isCompleted && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-black gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> LULUS
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {item.words.length} Kata • Bedah Nahwu &amp; Shorof
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5 font-black text-[10px] uppercase tracking-wider gap-1"
                        >
                          <Link href={`/irab/${item.surahId}/${item.ayat}`}>
                            Bedah Ayat <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className={cn(
                            "h-9 rounded-xl font-black text-[10px] uppercase tracking-wider gap-1",
                            isCompleted
                              ? "bg-[#D4AF37] hover:bg-[#B8860B] text-black"
                              : "bg-[#800000] hover:bg-[#800000]/90 text-white"
                          )}
                        >
                          <Link href={`/irab/${item.surahId}/${item.ayat}/quiz`}>
                            <GraduationCap className="w-3.5 h-3.5" />
                            {isCompleted ? "Ulangi Kuis" : "Kuis"}
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Arabic Verse Preview */}
                    <Link
                      href={`/irab/${item.surahId}/${item.ayat}`}
                      className="block p-3.5 rounded-xl bg-orange-50/40 hover:bg-orange-50/80 border border-orange-100/80 transition-colors"
                    >
                      <p className="text-2xl sm:text-3xl font-arabic text-right text-slate-800 leading-loose" dir="rtl">
                        {arabicFull}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground italic mt-2">
                        &ldquo;{item.translation}&rdquo;
                      </p>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
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
