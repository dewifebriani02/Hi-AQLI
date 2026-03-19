"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Loader2, Info, Mic2, Check, GraduationCap, Lock, Type, Minus, Plus } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { cn } from "@/lib/utils";

interface Word {
  id: number;
  text_uthmani: string;
  translation?: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani?: string;
  words: Word[];
  translations: { text: string }[];
}

interface SurahInfo {
  id: number;
  name_simple: string;
  name_arabic: string;
  translated_name: { name: string };
  verses_count: number;
}

const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy" },
  { id: 2, name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 3, name: "Abdur-Rahman as-Sudais" },
  { id: 6, name: "Mahmoud Khalil Al-Husary" },
  { id: 12, name: "Saud al-Shuraim" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)" },
];

export default function SurahDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useUser();

  const [surah, setSurah] = useState<SurahInfo | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(32);

  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(null);
  const [showReciterDialog, setShowReciterDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'surahId', operator: '==', value: id },
      { column: 'isPassed', operator: '==', value: true }
    ]
  }), [user?.id, id]);

  const { data: progress, isLoading: isProgressLoading } = useCollection("quiz_attempts", progressOptions);

  const completedVerseNumbers = useMemo(() => {
    if (!progress) return new Set<number>();
    return new Set(progress.map(p => p.verseNumber));
  }, [progress]);

  useEffect(() => {
    const savedReciter = localStorage.getItem('aqli_reciter_id');
    if (savedReciter) setSelectedReciterId(parseInt(savedReciter));

    const savedSize = localStorage.getItem('aqli_mushaf_font_size');
    if (savedSize) setFontSize(parseInt(savedSize));

    async function fetchData() {
      if (!id) return;
      try {
        setLoading(true);
        const infoRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const infoData = await infoRes.json();
        setSurah(infoData.chapter);

        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${id}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani&per_page=300`
        );
        const verseData = await verseRes.json();
        if (verseData && verseData.verses) setVerses(verseData.verses);
      } catch (err: any) {
        console.error("Quran API Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id]);

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(20, Math.min(fontSize + delta, 64));
    setFontSize(newSize);
    localStorage.setItem('aqli_mushaf_font_size', newSize.toString());
  };

  const selectReciter = (reciterId: number) => {
    setSelectedReciterId(reciterId);
    localStorage.setItem('aqli_reciter_id', reciterId.toString());
    setShowReciterDialog(false);
  };

  const toggleAudio = async (verseKey: string) => {
    if (!selectedReciterId) {
      setShowReciterDialog(true);
      return;
    }
    if (playingKey === verseKey) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }
    setLoadingAudioKey(verseKey);
    try {
      const res = await fetch(`https://api.quran.com/api/v4/recitations/${selectedReciterId}/by_ayah/${verseKey}`);
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;
      let fullUrl = audioUrl;
      if (audioUrl.startsWith('//')) fullUrl = `https:${audioUrl}`;
      else if (!audioUrl.startsWith('http')) fullUrl = `https://audio.qurancdn.com/${audioUrl}`;
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(fullUrl);
      audioRef.current = audio;
      audio.onplay = () => {
        setPlayingKey(verseKey);
        setLoadingAudioKey(null);
      };
      audio.onended = () => {
        setPlayingKey(null);
        const currentIndex = verses.findIndex(v => v.verse_key === verseKey);
        if (currentIndex !== -1 && currentIndex < verses.length - 1) {
          setTimeout(() => toggleAudio(verses[currentIndex + 1].verse_key), 300);
        }
      };
      await audio.play();
    } catch (err) {
      setLoadingAudioKey(null);
      toast({ variant: "destructive", title: "Audio Error" });
    }
  };

  if (loading || isProgressLoading) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[#800000]" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24">
      <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b px-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link href="/mufradat"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold font-headline">{surah?.id}. {surah?.name_simple}</h1>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">{surah?.translated_name.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-[#800000] font-bold"><Mic2 className="h-4 w-4" /><span>Qari</span></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Pilih Qari</DialogTitle></DialogHeader>
                <div className="grid gap-2 py-4">
                  {RECITERS.map((r) => (
                    <Button key={r.id} variant={selectedReciterId === r.id ? "default" : "outline"} onClick={() => selectReciter(r.id)} className="justify-between font-bold">
                      {r.name} {selectedReciterId === r.id && <Check className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex flex-col divide-y">
        <TooltipProvider delayDuration={0}>
          {verses.map((verse) => {
            const isFirstVerse = verse.verse_number === 1;
            const prevVerseCompleted = completedVerseNumbers.has(verse.verse_number - 1);
            const isLocked = !isFirstVerse && !prevVerseCompleted;
            const isCompleted = completedVerseNumbers.has(verse.verse_number);

            return (
              <div key={verse.id} className={cn("py-12 px-4 space-y-8 transition-opacity", isLocked && "opacity-60")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link
                      href={isLocked ? "#" : `/mufradat/${id}/${verse.verse_number}`}
                      className={cn(
                        "flex items-center justify-center w-12 h-10 rounded-full text-xs font-bold border transition-all",
                        isLocked ? "bg-muted text-muted-foreground cursor-not-allowed" :
                          isCompleted ? "bg-[#D4AF37] text-black border-[#800000]" :
                            "bg-muted text-foreground border-border hover:bg-[#800000] hover:text-white"
                      )}
                      onClick={(e) => isLocked && e.preventDefault()}
                    >
                      {isLocked ? <Lock className="h-4 w-4" /> : `(${verse.verse_number})`}
                    </Link>

                    <Button asChild={!isLocked} variant="ghost" size="sm" className="text-[10px] font-bold text-[#800000] gap-1" disabled={isLocked}>
                      {isLocked ? (
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> TERKUNCI</span>
                      ) : (
                        <Link href={`/mufradat/${id}/${verse.verse_number}`}><Info className="h-3 w-3" /> DETAIL</Link>
                      )}
                    </Button>

                    <Button asChild={!isLocked} variant="ghost" size="sm" className={cn("text-[10px] font-bold gap-1", isCompleted ? "text-[#D4AF37]" : "text-amber-600")} disabled={isLocked}>
                      {isLocked ? (
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> TERKUNCI</span>
                      ) : (
                        <Link href={`/mufradat/${id}/${verse.verse_number}/quiz`}>
                          {isCompleted ? <Check className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                          {isCompleted ? "SUDAH HAFAL" : "UJI HAFALAN"}
                        </Link>
                      )}
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => toggleAudio(verse.verse_key)} disabled={isLocked}>
                    {loadingAudioKey === verse.verse_key ? <Loader2 className="animate-spin h-4 w-4" /> : playingKey === verse.verse_key ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>

                <div className={cn("flex flex-wrap justify-end gap-x-3 gap-y-4 w-full", isLocked && "blur-[2px] select-none")} dir="rtl">
                  {verse.words?.map((word, wordIdx) => {
                    const wordKey = `${verse.verse_key}-${wordIdx}`;
                    return (
                      <Tooltip key={wordIdx} open={activeWordKey === wordKey && !isLocked} onOpenChange={(o) => o && setActiveWordKey(wordKey)}>
                        <TooltipTrigger asChild>
                          <span
                            tabIndex={isLocked ? -1 : 0}
                            role="button"
                            onPointerEnter={() => !isLocked && setActiveWordKey(wordKey)}
                            style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                            className={cn(
                              "font-arabic text-foreground/90 outline-none transition-colors px-0.5 inline-block",
                              !isLocked && "hover:text-[#800000] focus:text-[#800000] cursor-help"
                            )}
                          >
                            {word.text_uthmani}
                          </span>
                        </TooltipTrigger>
                        {!isLocked && (
                          <TooltipPortal>
                            <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                              <p className="text-xs font-medium">{word.translation?.text || "..."}</p>
                            </TooltipContent>
                          </TooltipPortal>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>

                <div className={cn("text-left bg-[#800000]/5 p-5 rounded-xl border-l-4", isLocked ? "border-muted" : "border-[#800000]")}>
                  <p className={cn("text-[10px] font-bold mb-2 uppercase tracking-widest", isLocked ? "text-muted-foreground" : "text-[#800000]")}>
                    Terjemahan Kemenag RI
                  </p>
                  <div className={cn("text-base leading-relaxed", isLocked ? "text-muted-foreground italic" : "text-foreground/90")}>
                    {isLocked ? "Selesaikan kuis ayat sebelumnya untuk membaca terjemahan ini." : <div dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
