'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  BookOpen,
  Zap,
  Layers,
  Info,
  Type,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListTree,
  X,
  Play,
  Pause,
  Loader2,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import Link from "next/link";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import {
  getIrabNavigation,
} from "@/lib/irab-data";
import { getAyahAudioUrl } from "@/lib/quran-reciters";
import { useUser, useCollection } from "@/db";
import { useToast } from "@/hooks/use-toast";

export default function IrabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const surahId = params.surahId as string;
  const ayat = params.ayat as string;
  const currentVerseNum = parseInt(ayat, 10) || 1;
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [wordCounts, setWordCounts] = useState<Record<number, number>>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);

  const detailRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { user } = useUser();

  const {
    currentData,
    surahVerses,
    totalVersesInSurah,
    prevInSurah,
    nextInSurah,
    prevGlobal,
    nextGlobal,
    nextSurah,
  } = useMemo(() => getIrabNavigation(surahId, ayat), [surahId, ayat]);

  useEffect(() => {
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) {
      const parsed = parseInt(savedReciter, 10);
      if (!isNaN(parsed)) setSelectedReciterId(parsed);
    }
  }, []);

  // Reset selected word, repetisi counts, and stop audio when verse changes
  useEffect(() => {
    setSelectedWord(null);
    setWordCounts({});
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setIsLoadingAudio(false);
  }, [surahId, ayat]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = async () => {
    const verseKey = `${surahId}:${ayat}`;
    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const fullUrl = await getAyahAudioUrl(selectedReciterId, verseKey);
      if (!fullUrl) throw new Error("Audio tidak ditemukan");

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlayingAudio(true);
        setIsLoadingAudio(false);
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
      };
      audio.onerror = () => {
        setIsLoadingAudio(false);
        setIsPlayingAudio(false);
        toast({
          variant: "destructive",
          title: "Audio Error",
          description: "Gagal memutar suara murottal ayat ini.",
        });
      };

      await audio.play();
    } catch {
      setIsLoadingAudio(false);
      setIsPlayingAudio(false);
      toast({
        variant: "destructive",
        title: "Audio Error",
        description: "Gagal memuat audio murottal ayat.",
      });
    }
  };

  const handleSelectWord = (idx: number) => {
    setSelectedWord(idx);
    setWordCounts((prev) => ({
      ...prev,
      [idx]: (prev[idx] || 0) + 1,
    }));
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Fetch user's passed I'rab quizzes for this surah (same flow as Hi Mufradat)
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'surah_id', operator: '==', value: Number(surahId) }
    ]
  }), [user?.id, surahId]);

  const { data: progress } = useCollection(user ? "quiz_attempts" : null, progressOptions);

  const completedVerseNumbers = useMemo(() => {
    const passed = new Set<number>();
    if (!progress) return passed;
    progress.forEach((p: any) => {
      if (!p.quiz_id?.startsWith('irab_')) return;
      const isPassed = p.is_passed || (Number(p.total_questions) > 0 && Number(p.score) >= Number(p.total_questions));
      if (isPassed) {
        const match = p.quiz_id.match(/irab_(\d+):(\d+)/);
        const sNum = match ? parseInt(match[1], 10) : Number(p.surah_id);
        const vNum = match ? parseInt(match[2], 10) : Number(p.verse_id);
        if (sNum === Number(surahId) && vNum > 0) {
          passed.add(vNum);
        }
      }
    });
    return passed;
  }, [progress, surahId]);

  const isCurrentVerseCompleted = completedVerseNumbers.has(currentVerseNum);

  if (!currentData) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground font-bold">Data I&apos;rab untuk ayat ini belum tersedia.</p>
        <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 text-white font-bold rounded-xl">
          <Link href="/irab">Kembali ke Daftar Ayat Hi I&apos;rab</Link>
        </Button>
      </div>
    );
  }

  const activeWord = selectedWord !== null ? (currentData.words[selectedWord] || null) : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto pb-32">
      {/* Sticky Top Header — Identical Flow to Hi Mufradat */}
      <div className="flex items-center gap-2 sm:gap-4 sticky top-16 sm:top-20 bg-background/95 backdrop-blur z-30 py-3 sm:py-4 border-b px-2 sm:px-0">
        <Button asChild variant="ghost" size="icon" className="text-[#800000] shrink-0 w-8 h-8 sm:w-10 sm:h-10">
          <Link href={`/irab/${surahId}`}>
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-lg font-black font-headline truncate sm:whitespace-normal leading-tight">
              {currentData.surah} <span className="text-[#800000]/40 mx-1">:</span> ({currentData.ayat}/{totalVersesInSurah})
            </h1>
            {isCurrentVerseCompleted && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-black px-1.5 py-0 h-4 gap-1 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> LULUS
              </Badge>
            )}
          </div>
          <p className="text-[8px] sm:text-[9px] uppercase tracking-tighter sm:tracking-widest text-[#800000] font-black truncate">
            Hi I&apos;rab • Tadabbur &amp; Bedah Nahwu
          </p>
        </div>

        {/* Quick Action Icons (Audio + Quiz + Prev Ayat + Next Ayat) */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAudio}
            className="text-[#800000] hover:bg-[#800000]/10"
            title={isPlayingAudio ? "Jeda Suara Ayat" : "Putar Suara Ayat"}
          >
            {isLoadingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlayingAudio ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-[#D4AF37] hover:bg-[#D4AF37]/10"
            title="Mulai Kuis I'rab Ayat Ini"
          >
            <Link href={`/irab/${surahId}/${ayat}/quiz`}>
              <GraduationCap className="h-5 w-5" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={!prevGlobal}
            onClick={() => prevGlobal && router.push(`/irab/${prevGlobal.surahId}/${prevGlobal.ayat}`)}
            title={prevGlobal ? `Ayat Sebelumnya (${prevGlobal.surah}: ${prevGlobal.ayat})` : "Ini adalah ayat pertama"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={!nextGlobal}
            onClick={() => nextGlobal && router.push(`/irab/${nextGlobal.surahId}/${nextGlobal.ayat}`)}
            title={nextGlobal ? `Ayat Selanjutnya (${nextGlobal.surah}: ${nextGlobal.ayat})` : "Ini adalah ayat terakhir"}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Quick Verse Selector Strip within the Current Surah */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-2 sm:px-0 -mt-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0 mr-1">
          Pilih Ayat:
        </span>
        {surahVerses.map((v) => {
          const isCurrent = v.ayat === currentVerseNum;
          const isDone = completedVerseNumbers.has(v.ayat);
          return (
            <Link
              key={v.key}
              href={`/irab/${v.surahId}/${v.ayat}`}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 border",
                isCurrent
                  ? "bg-[#800000] text-white border-[#800000] shadow-sm"
                  : isDone
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#800000]/40 hover:text-[#800000]"
              )}
            >
              <span>Ayat {v.ayat}</span>
              {isDone && <CheckCircle2 className={cn("w-3 h-3", isCurrent ? "text-[#D4AF37]" : "text-emerald-600")} />}
            </Link>
          );
        })}
      </div>

      {/* Ayat Display Card (Interactive Word-by-Word Mushaf View) */}
      <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#800000] rounded-3xl mx-2 sm:mx-0">
        <CardContent className="p-6 sm:p-8 text-center space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[#800000] border-[#800000]/20 text-[10px] font-black uppercase">
              QS. {currentData.surah} : {currentData.ayat}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAudio}
              className="h-8 rounded-full border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5 font-bold text-[11px] gap-1.5"
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPlayingAudio ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              {isPlayingAudio ? "Jeda Murottal" : "Dengar Ayat"}
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-3 sm:gap-x-5 gap-y-4 sm:gap-y-6" dir="rtl">
            {currentData.words.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectWord(idx)}
                className={cn(
                  "cursor-pointer transition-all duration-200 group relative px-2.5 py-1.5 rounded-2xl border",
                  selectedWord === idx
                    ? "scale-105 bg-[#800000]/5 border-[#800000]/30 shadow-sm"
                    : "border-transparent opacity-85 hover:opacity-100 hover:bg-slate-50"
                )}
              >
                <p className={cn(
                  "text-3xl sm:text-4xl font-arabic leading-relaxed transition-colors",
                  selectedWord === idx ? "text-[#800000] font-bold" : "text-slate-700"
                )}>
                  {item.word}
                </p>
                <span className={cn(
                  "block text-[10px] font-bold mt-0.5",
                  selectedWord === idx ? "text-[#800000]" : "text-slate-400"
                )} dir="ltr">
                  {item.meaning}
                </span>
                <div className={cn(
                  "h-1 w-full mt-1.5 rounded-full transition-all",
                  selectedWord === idx ? "bg-[#D4AF37]" : "bg-transparent group-hover:bg-slate-200"
                )} />
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Badge variant="outline" className="mb-2 text-[#800000] border-[#800000]/20 text-[10px] font-bold uppercase">
              Terjemahan Ayat
            </Badge>
            <p className="text-base sm:text-lg font-medium text-slate-700 mb-2 italic leading-relaxed">
              &ldquo;{currentData.translation}&rdquo;
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
              Ketuk salah satu kata untuk membuka detail I&apos;rab &amp; Shorof
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 1. Ringkasan I'rab Seluruh Kata (Ditaruh Terlebih Dahulu) */}
      <Card className="border-[#800000]/10 shadow-sm overflow-hidden mx-2 sm:mx-0">
        <CardHeader className="border-b bg-[#800000]/5 py-4 flex flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base flex items-center gap-2 font-headline">
              <ListTree className="w-4 h-4 text-[#800000]" />
              Ringkasan I&apos;rab Seluruh Kata ({currentData.words.length} Kata)
            </CardTitle>
            <p className="text-[11px] text-amber-900 font-medium leading-snug">
              Ketuk baris kata di bawah untuk melihat detail penjelasan I&apos;rab &amp; Shorof.
            </p>
          </div>
          {Object.keys(wordCounts).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWordCounts({})}
              className="text-[10px] font-bold text-muted-foreground uppercase gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y" dir="ltr">
            {currentData.words.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectWord(idx)}
                className={cn(
                  "p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-all cursor-pointer select-none",
                  selectedWord === idx && "bg-[#800000]/[0.05]"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={cn(
                    "text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                    selectedWord === idx
                      ? "bg-[#800000] text-white border-[#800000]"
                      : "bg-muted text-muted-foreground border-border/50"
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-arabic text-[#800000]" dir="rtl">
                        {item.word}
                      </span>
                      <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5 border", item.color)}>
                        {item.function}
                      </Badge>
                      {wordCounts[idx] > 0 && (
                        <Badge className="bg-[#D4AF37] hover:bg-[#D4AF37] text-black text-[9px] font-bold h-4 px-1.5 animate-in zoom-in-50 duration-200">
                          x{wordCounts[idx]}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium truncate max-w-full">
                      {item.trans} — &ldquo;{item.meaning}&rdquo;
                    </span>
                  </div>
                </div>
                <div className="text-right max-w-[45%] hidden sm:block">
                  <p className="text-xs font-bold text-slate-700 line-clamp-1">{item.irabIndo}</p>
                  <p className="text-[10px] text-muted-foreground font-arabic line-clamp-1" dir="rtl">{item.irabArab}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Detail Analisis Kata (Muncul Setelah Kata / Ringkasan Diklik) */}
      <div ref={detailRef} className="scroll-mt-36 px-2 sm:px-0">
        {activeWord && selectedWord !== null && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D4AF37] fill-current" />
                <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">
                  Detail Kata Ke-{selectedWord + 1} dari {currentData.words.length}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px] font-black rounded-lg"
                  disabled={selectedWord <= 0}
                  onClick={() => setSelectedWord((w) => (w !== null ? Math.max(0, w - 1) : 0))}
                >
                  <ArrowLeft className="w-3 h-3 mr-1" /> Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px] font-black rounded-lg"
                  disabled={selectedWord >= currentData.words.length - 1}
                  onClick={() => setSelectedWord((w) => (w !== null ? Math.min(currentData.words.length - 1, w + 1) : 0))}
                >
                  Berikutnya <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-[#800000]"
                  onClick={() => setSelectedWord(null)}
                  title="Tutup Detail"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <div className={cn("h-2 w-full", activeWord.color.split(' ')[0])} />
              <CardContent className="p-4 sm:p-6">
                {/* Header - RATA KANAN */}
                <div className="flex justify-between items-start mb-6 text-right" dir="rtl">
                  <div className="text-right">
                    <h4 className="text-3xl sm:text-4xl font-arabic text-black mb-1">{activeWord.wordArab}</h4>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest" dir="ltr">
                      {activeWord.trans} • &ldquo;{activeWord.meaning}&rdquo;
                    </p>
                  </div>
                  <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg border", activeWord.color)} dir="ltr">
                    {activeWord.function}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Kedudukan I'rab */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-white text-[#800000] shadow-sm">
                        <Layers className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Info className="w-3 h-3" /> Kedudukan (I&apos;rab)
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* Arab */}
                      <div className="text-right border-b border-slate-200 pb-3" dir="rtl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">بِاللُّغَةِ الْعَرَبِيَّةِ</p>
                        <p className="text-lg sm:text-xl font-arabic font-bold text-[#800000] leading-relaxed">
                          {activeWord.irabArab}
                        </p>
                      </div>
                      {/* Latin */}
                      <div className="text-left border-b border-slate-200 pb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Transliterasi I&apos;rab</p>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed">
                          {activeWord.irab}
                        </p>
                      </div>
                      {/* Indonesia */}
                      <div className="text-left border-b border-slate-200 pb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Terjemah Kedudukan</p>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed">
                          {activeWord.irabIndo}
                        </p>
                      </div>
                      {/* Penjelasan */}
                      <div className="bg-white p-3.5 rounded-xl border border-orange-100 text-left">
                        <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-1">Penjelasan Nahwu</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {activeWord.irabExplanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                      <div className="p-2 rounded-lg bg-white text-orange-600 shadow-sm shrink-0">
                        <Type className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider mb-1">Akar &amp; Wazan (Shorof)</p>
                        <p className="text-xs sm:text-sm font-bold text-orange-950">{activeWord.shorof}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                      <div className="p-2 rounded-lg bg-white text-amber-600 shadow-sm shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Makna Kata</p>
                        <p className="text-xs sm:text-sm font-bold text-amber-950">{activeWord.meaning}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation & Quiz Buttons — Exact Hi Mufradat Pattern */}
      <Card className="border-[#800000]/10 shadow-sm overflow-hidden mx-2 sm:mx-0">
        <CardFooter className="pt-6 bg-muted/10 p-4 flex flex-col gap-3">
          {/* Primary Quiz CTA */}
          <Button
            asChild
            className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black gap-2 py-6 h-14 text-base sm:text-lg rounded-xl shadow-lg border-b-4 border-[#800000]/20 uppercase tracking-wider"
          >
            <Link href={`/irab/${surahId}/${ayat}/quiz`}>
              <GraduationCap className="w-5 h-5" />
              {isCurrentVerseCompleted ? `ULANGI KUIS I'RAB AYAT ${currentData.ayat}` : `MULAI UJI PEMAHAMAN I'RAB`}
            </Link>
          </Button>

          {/* Direct Next Verse Navigation (Tadabbur Next Ayat + Direct Next Quiz) just like Hi Mufradat */}
          {nextInSurah ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <Button
                asChild
                variant="outline"
                className="w-full border-2 border-[#800000]/20 hover:bg-[#800000]/5 text-[#800000] font-black gap-2 py-6 h-14 text-sm sm:text-base rounded-xl transition-all uppercase tracking-wider"
              >
                <Link href={`/irab/${nextInSurah.surahId}/${nextInSurah.ayat}`}>
                  BEDAH AYAT {nextInSurah.ayat}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black py-6 h-14 text-sm sm:text-base rounded-xl shadow-md transition-all uppercase tracking-wider gap-2"
              >
                <Link href={`/irab/${nextInSurah.surahId}/${nextInSurah.ayat}/quiz`}>
                  <Zap className="w-4 h-4 fill-current text-[#D4AF37]" />
                  LANGSUNG KUIS AYAT {nextInSurah.ayat}
                </Link>
              </Button>
            </div>
          ) : nextSurah && nextGlobal ? (
            <Button
              asChild
              variant="outline"
              className="w-full border-2 border-[#800000]/20 hover:bg-[#800000]/5 text-[#800000] font-black gap-2 py-6 h-14 text-sm sm:text-base rounded-xl transition-all uppercase tracking-wider"
            >
              <Link href={`/irab/${nextGlobal.surahId}/${nextGlobal.ayat}`}>
                LANJUT KE SURAH {nextSurah.name.toUpperCase()} (AYAT 1)
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          ) : null}

          {/* Prev / Back to Surah List row */}
          <div className="flex items-center justify-between w-full pt-1 gap-2">
            {prevInSurah ? (
              <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground hover:text-[#800000] gap-1.5">
                <Link href={`/irab/${prevInSurah.surahId}/${prevInSurah.ayat}`}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Ayat Sebelumnya ({prevInSurah.surah}: {prevInSurah.ayat})
                </Link>
              </Button>
            ) : <span />}

            <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground hover:text-[#800000]">
              <Link href={`/irab/${surahId}`}>
                Daftar Ayat {currentData.surah}
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
