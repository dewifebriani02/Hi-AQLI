"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CheckCircle2, Star, Play, Pause, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SURAH_START_PAGES } from "@/lib/quran-mapping";

interface Surah {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
  translated_name: {
    name: string;
  };
}

interface SurahListProps {
  baseUrl?: string;
  userProgress?: any[];
  selectedReciterId?: number;
}

export function SurahList({ 
  baseUrl = "/tilawah", 
  userProgress = [], 
  selectedReciterId = 7 
}: SurahListProps) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<number | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchSurahs() {
      try {
        const response = await fetch("https://api.quran.com/api/v4/chapters?language=id");
        const data = await response.json();
        setSurahs(data.chapters);
      } catch (error) {
        console.error("Gagal mengambil daftar surat:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSurahs();
  }, []);

  // Audio Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  const togglePlay = async (e: React.MouseEvent, surahId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (playingId === surahId) {
      audio?.pause();
      setPlayingId(null);
      return;
    }

    if (audio) {
      audio.pause();
    }

    setLoadingAudioId(surahId);

    try {
      const res = await fetch(`https://api.quran.com/api/v4/recitations/${selectedReciterId}/by_chapter/${surahId}`);
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;

      if (!audioUrl) throw new Error("Audio not found");

      let fullUrl = audioUrl;
      if (audioUrl.startsWith('//')) fullUrl = `https:${audioUrl}`;
      else if (!audioUrl.startsWith('http')) fullUrl = `https://audio.qurancdn.com/${audioUrl}`;

      const newAudio = new Audio(fullUrl);
      setAudio(newAudio);
      
      newAudio.onplay = () => {
        setPlayingId(surahId);
        setLoadingAudioId(null);
      };

      newAudio.onended = () => {
        setPlayingId(null);
      };

      newAudio.onerror = () => {
        setLoadingAudioId(null);
        setPlayingId(null);
      };

      await newAudio.play();
    } catch (err) {
      console.error("Audio Playback Error:", err);
      setLoadingAudioId(null);
    }
  };

  // Calculate completion status for each surah
  const completionMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!userProgress) return map;

    userProgress.forEach(attempt => {
      if (attempt.is_passed) {
        const sId = Number(attempt.surah_id);
        const vId = Number(attempt.verse_id);
        
        // We use a Set-like string key to ignore duplicate passed attempts for same verse
        const key = `${sId}:${vId}`;
        // Store unique verse counts per surah
        // Actually, just store all passed verse numbers in a Set per surah
        if (!map.has(sId)) {
          (map as any).set(sId, new Set());
        }
        (map.get(sId) as any).add(vId);
      }
    });

    const finalMap = new Map<number, number>();
    map.forEach((verseSet, sId) => {
      finalMap.set(sId, (verseSet as any).size);
    });
    return finalMap;
  }, [userProgress]);

  const filteredSurahs = surahs.filter((s) =>
    s.name_simple.toLowerCase().includes(search.toLowerCase()) ||
    s.translated_name.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari surat..." 
          className="pl-10 h-11 bg-muted/50 border-none ring-offset-background" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {filteredSurahs.map((surah) => {
          const passedCount = completionMap.get(surah.id) || 0;
          const isCompleted = passedCount >= surah.verses_count;

          const startPage = SURAH_START_PAGES[surah.id] || 1;
          const href = baseUrl === "/mufradat" 
            ? `/mufradat/page/${startPage}` 
            : `${baseUrl}/${surah.id}`;

          return (
            <Link key={surah.id} href={href}>
              <Card 
                className={cn(
                  "p-4 transition-all cursor-pointer group border-none shadow-sm relative overflow-hidden",
                  isCompleted 
                    ? "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100/80" 
                    : "bg-card/50 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isCompleted && (
                  <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-lg shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm transition-colors rotate-45",
                      isCompleted 
                        ? "bg-emerald-500 text-white" 
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      <span className="-rotate-45">{surah.id}</span>
                    </div>
                    <div className="flex flex-col">
                      <h4 className={cn(
                        "font-bold text-base",
                        isCompleted && "text-emerald-900"
                      )}>{surah.name_simple}</h4>
                      <p className={cn(
                        "text-xs text-muted-foreground",
                        isCompleted ? "text-emerald-700/70" : "group-hover:text-accent-foreground/80"
                      )}>
                        {surah.translated_name.name} • {surah.verses_count} Ayat
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "w-10 h-10 rounded-full transition-all shrink-0",
                        playingId === surah.id 
                          ? "bg-[#800000] text-white hover:bg-[#800000]/90" 
                          : "bg-muted/50 text-muted-foreground hover:bg-[#800000]/10 hover:text-[#800000]"
                      )}
                      onClick={(e) => togglePlay(e, surah.id)}
                    >
                      {loadingAudioId === surah.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : playingId === surah.id ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </Button>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className={cn(
                        "text-xl font-arabic leading-none",
                        isCompleted ? "text-emerald-800" : "mb-1"
                      )}>{surah.name_arabic}</div>
                      {isCompleted ? (
                        <div className="flex items-center gap-1 bg-emerald-200/50 px-1.5 py-0.5 rounded text-[8px] font-black text-emerald-800 uppercase tracking-tighter">
                          <Star className="w-2 h-2 fill-current" /> Khatam
                        </div>
                      ) : (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-accent-foreground/80 font-semibold">
                          {surah.revelation_place === "makkah" ? "Makkiyah" : "Madaniyah"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {passedCount > 0 && !isCompleted && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Progres Hafalan</span>
                      <span>{Math.round((passedCount/surah.verses_count)*100)}%</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#800000]" style={{ width: `${(passedCount/surah.verses_count)*100}%` }} />
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
