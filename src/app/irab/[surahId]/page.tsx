'use client';

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Play,
  Pause,
  Loader2,
  Minus,
  Plus,
  Type,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IRAB_SURAH_LIST,
  getIrabVersesBySurah,
} from "@/lib/irab-data";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import { RECITERS, getAyahAudioUrl } from "@/lib/quran-reciters";
import { useUser, useCollection } from "@/db";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function IrabSurahDetailPage() {
  const params = useParams();
  const surahId = String(params.surahId || "");
  const { user } = useUser();
  const { toast } = useToast();

  const [fontSize, setFontSize] = useState(28);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedReciter = localStorage.getItem("aqli_reciter_id");
    if (savedReciter) {
      const parsed = parseInt(savedReciter, 10);
      if (!isNaN(parsed)) setSelectedReciterId(parsed);
    }
    const savedSize = localStorage.getItem("aqli_mushaf_font_size");
    if (savedSize) {
      const parsed = parseInt(savedSize, 10);
      if (!isNaN(parsed)) setFontSize(Math.max(20, Math.min(parsed, 48)));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingKey(null);
    };
  }, [surahId]);

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(20, Math.min(fontSize + delta, 48));
    setFontSize(newSize);
    localStorage.setItem("aqli_mushaf_font_size", newSize.toString());
  };

  const selectReciter = (val: string) => {
    const reciterId = parseInt(val, 10);
    if (!isNaN(reciterId)) {
      setSelectedReciterId(reciterId);
      localStorage.setItem("aqli_reciter_id", reciterId.toString());
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingKey(null);
      }
    }
  };

  const chapter = useMemo(
    () => QURAN_CHAPTERS.find((c) => String(c.id) === surahId) || null,
    [surahId]
  );

  const irabSurah = useMemo(
    () => IRAB_SURAH_LIST.find((s) => s.id === surahId) || null,
    [surahId]
  );

  const verses = useMemo(() => getIrabVersesBySurah(surahId), [surahId]);

  const toggleAudio = async (verseKey: string) => {
    if (playingKey === verseKey) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }

    setLoadingAudioKey(verseKey);

    try {
      const fullUrl = await getAyahAudioUrl(selectedReciterId, verseKey);
      if (!fullUrl) throw new Error("Audio tidak ditemukan");

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setPlayingKey(verseKey);
        setLoadingAudioKey(null);
      };

      audio.onended = () => {
        setPlayingKey(null);
        const currentIndex = verses.findIndex((v) => v.key === verseKey);
        if (currentIndex !== -1 && currentIndex < verses.length - 1) {
          setTimeout(() => toggleAudio(verses[currentIndex + 1].key), 300);
        }
      };

      audio.onerror = () => {
        setLoadingAudioKey(null);
        setPlayingKey(null);
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Gagal memutar suara murottal ayat ini.",
        });
      };

      await audio.play();
    } catch {
      setLoadingAudioKey(null);
      setPlayingKey(null);
      toast({
        variant: "destructive",
        title: "Audio Error",
        description: "Gagal memuat murottal ayat.",
      });
    }
  };

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

  const { passedKeys, verseStatsMap } = useMemo(() => {
    const set = new Set<string>();
    const stats = new Map<string, { maxScore: number; attempts: number }>();
    if (!progress) return { passedKeys: set, verseStatsMap: stats };

    progress.forEach((p: any) => {
      if (!p.quiz_id?.startsWith("irab_")) return;
      const key = p.quiz_id.replace("irab_", "");
      const isPassed =
        p.is_passed ||
        (Number(p.total_questions) > 0 &&
          Number(p.score) >= Number(p.total_questions));
      if (isPassed) {
        set.add(key);
      }

      const pct =
        Math.round((Number(p.score) / (Number(p.total_questions) || 1)) * 100) ||
        0;
      const current = stats.get(key) || { maxScore: 0, attempts: 0 };
      stats.set(key, {
        maxScore: Math.max(current.maxScore, pct),
        attempts: current.attempts + 1,
      });
    });

    return { passedKeys: set, verseStatsMap: stats };
  }, [progress]);

  const doneCount = verses.filter((v) => passedKeys.has(v.key)).length;
  const surahTitle = irabSurah?.name || chapter?.name_simple || `Surah ${surahId}`;
  const surahArab = irabSurah?.nameArab || chapter?.name_arabic || "";
  const surahMeaning = irabSurah?.meaning || chapter?.translated_name || "";

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      {/* Sticky Header — Mirrors Hi Mufradat /mufradat/[id] */}
      <div className="flex flex-col gap-2.5 sticky top-16 sm:top-20 bg-background/95 backdrop-blur z-30 py-3 sm:py-4 border-b px-2 sm:px-4">
        <div className="flex items-center justify-between gap-3">
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

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustFontSize(-2)}>
                <Minus className="h-3 w-3" />
              </Button>
              <Type className="h-3 w-3 text-muted-foreground mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustFontSize(2)}>
                <Plus className="h-3 w-3" />
              </Button>
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
        </div>

        {/* Mobile Font Size + Qari Controls */}
        {verses.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Volume2 className="w-3.5 h-3.5 text-[#800000] shrink-0" />
              <Select value={String(selectedReciterId)} onValueChange={selectReciter}>
                <SelectTrigger className="h-8 text-xs font-semibold bg-white border-slate-200 rounded-lg max-w-[240px]">
                  <SelectValue placeholder="Pilih Qari" />
                </SelectTrigger>
                <SelectContent>
                  {RECITERS.slice(0, 10).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:hidden flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#800000]" onClick={() => adjustFontSize(-2)}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-bold w-6 text-center">{fontSize}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#800000]" onClick={() => adjustFontSize(2)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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
              const vStats = verseStatsMap.get(item.key);
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

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {vStats && vStats.attempts > 0 && (
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                            <span
                              className={cn(
                                "text-[10px] font-black",
                                vStats.maxScore === 100 ? "text-emerald-600" : "text-amber-600"
                              )}
                            >
                              🎯 {vStats.maxScore}%
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 tracking-tighter uppercase">
                              🔄 {vStats.attempts}x
                            </span>
                          </div>
                        )}

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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAudio(item.key)}
                          className="h-9 w-9 text-[#800000] hover:bg-[#800000]/10 rounded-xl"
                          title={playingKey === item.key ? "Jeda Murottal" : "Putar Suara Ayat"}
                        >
                          {loadingAudioKey === item.key ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : playingKey === item.key ? (
                            <Pause className="h-4 w-4 fill-current" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Arabic Verse Preview */}
                    <Link
                      href={`/irab/${item.surahId}/${item.ayat}`}
                      className="block p-3.5 rounded-xl bg-orange-50/40 hover:bg-orange-50/80 border border-orange-100/80 transition-colors"
                    >
                      <p
                        className="font-arabic text-right text-slate-800 leading-loose"
                        style={{ fontSize: `${fontSize}px` }}
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
