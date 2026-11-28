'use client';

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  CheckCircle2,
  GraduationCap,
  ArrowRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IRAB_SURAH_LIST,
  getIrabVersesBySurah,
} from "@/lib/irab-data";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import { useUser, useCollection } from "@/db";

export default function IrabSurahDetailPage() {
  const params = useParams();
  const surahId = String(params.surahId || "");
  const { user } = useUser();

  const chapter = useMemo(
    () => QURAN_CHAPTERS.find((c) => String(c.id) === surahId) || null,
    [surahId]
  );

  const irabSurah = useMemo(
    () => IRAB_SURAH_LIST.find((s) => s.id === surahId) || null,
    [surahId]
  );

  const verses = useMemo(() => getIrabVersesBySurah(surahId), [surahId]);

  const nextIrabSurah = useMemo(() => {
    const idx = IRAB_SURAH_LIST.findIndex((s) => s.id === surahId);
    if (idx >= 0 && idx < IRAB_SURAH_LIST.length - 1) {
      return IRAB_SURAH_LIST[idx + 1];
    }
    return null;
  }, [surahId]);

  const progressOptions = useMemo(
    () => ({
      filters: [
        { column: "user_id", operator: "==", value: user?.id },
        { column: "surah_id", operator: "==", value: Number(surahId) || 0 },
      ],
    }),
    [user?.id, surahId]
  );

  const { data: progress } = useCollection(
    user && surahId ? "quiz_attempts" : null,
    progressOptions
  );

  const passedKeys = useMemo(() => {
    const set = new Set<string>();
    if (!progress) return set;
    progress.forEach((p: any) => {
      if (!p.quiz_id?.startsWith("irab_")) return;
      const isPassed =
        p.is_passed ||
        (Number(p.total_questions) > 0 &&
          Number(p.score) >= Number(p.total_questions));
      if (isPassed) {
        set.add(p.quiz_id.replace("irab_", ""));
      }
    });
    return set;
  }, [progress]);

  const doneCount = verses.filter((v) => passedKeys.has(v.key)).length;
  const surahTitle = irabSurah?.name || chapter?.name_simple || `Surah ${surahId}`;
  const surahArab = irabSurah?.nameArab || chapter?.name_arabic || "";
  const surahMeaning = irabSurah?.meaning || chapter?.translated_name || "";

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      {/* Sticky Header — Mirrors Hi Mufradat /mufradat/[id] */}
      <div className="flex items-center justify-between gap-3 sticky top-16 sm:top-20 bg-background/95 backdrop-blur z-30 py-3 sm:py-4 border-b px-2 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/irab">
              <ChevronLeft className="h-6 w-6 text-[#800000]" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black font-headline truncate">
                {surahId}. {surahTitle}
              </h1>
              {surahArab && (
                <span className="font-arabic text-lg text-[#800000] shrink-0">
                  {surahArab}
                </span>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-[#800000] truncate">
              Hi I&apos;rab • Bedah Nahwu Surah
            </p>
          </div>
        </div>

        {verses.length > 0 && (
          <Badge
            className={cn(
              "shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border",
              doneCount >= verses.length
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-[#800000]/10 text-[#800000] border-[#800000]/20"
            )}
          >
            {doneCount}/{verses.length} Lulus
          </Badge>
        )}
      </div>

      {verses.length === 0 ? (
        <div className="px-4 py-8">
          <Card className="border-dashed border-2 border-[#800000]/20 bg-white rounded-3xl shadow-sm">
            <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-[#800000] border-[#800000]/20">
                  Segera Hadir
                </Badge>
                <h2 className="text-xl font-black text-slate-800">
                  QS. {surahTitle} ({surahId})
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Materi bedah I&apos;rab dan kuis Nahwu-Shorof untuk surah ini sedang dalam tahap penyusunan oleh tim pengajar Hi AQLI.
                </p>
              </div>
              <Button
                asChild
                className="mt-2 bg-[#800000] hover:bg-[#800000]/90 text-white font-bold rounded-full px-6"
              >
                <Link href="/irab">Kembali ke Daftar Surah</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="px-3 sm:px-4 space-y-4">
          {/* Compact Surah Summary */}
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-semibold">
            <span>
              {surahMeaning}
              {irabSurah?.juz ? ` • Juz ${irabSurah.juz}` : ""}
            </span>
            <span>{verses.length} Ayat Tersedia</span>
          </div>

          {/* Verse List */}
          <div className="grid gap-3">
            {verses.map((item) => {
              const isCompleted = passedKeys.has(item.key);
              const arabicFull = item.words.map((w) => w.word).join(" ");

              return (
                <Card
                  key={item.key}
                  className={cn(
                    "border-2 shadow-sm bg-white hover:shadow-md transition-all overflow-hidden rounded-2xl",
                    isCompleted ? "border-emerald-200" : "border-slate-100"
                  )}
                >
                  <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs shrink-0",
                            isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-gradient-to-br from-[#800000] to-[#5a0000] text-white"
                          )}
                        >
                          {item.ayat}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-bold text-sm sm:text-base text-[#800000]">
                              {item.surah} : Ayat {item.ayat}
                            </h2>
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
                      <p
                        className="text-2xl sm:text-3xl font-arabic text-right text-slate-800 leading-loose"
                        dir="rtl"
                      >
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

          {/* Next Surah Card — Mirrors Hi Mufradat /mufradat/[id] */}
          {nextIrabSurah && (
            <div className="pt-4 pb-6">
              <Link href={`/irab/${nextIrabSurah.id}`}>
                <Card className="bg-white border-2 border-dashed border-[#800000]/20 hover:border-[#800000]/40 hover:bg-[#800000]/5 transition-all cursor-pointer group rounded-2xl overflow-hidden shadow-md">
                  <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-muted/50 rounded-full group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5 text-[#800000]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        Surah Selanjutnya
                      </p>
                      <h3 className="text-xl sm:text-2xl font-black font-headline text-[#800000]">
                        {nextIrabSurah.id}. {nextIrabSurah.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        {nextIrabSurah.meaning} • {nextIrabSurah.totalAyat} Ayat
                      </p>
                    </div>
                    <Button className="mt-2 bg-[#800000] hover:bg-[#800000]/90 text-white font-bold rounded-full px-7 h-10 shadow-md">
                      MULAI SEKARANG <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
