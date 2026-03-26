'use client';

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Play, 
  Pause, 
  Loader2, 
  BookOpen, 
  GraduationCap, 
  Volume2,
  Info,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
}

export default function MufradatVerseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const verseId = params.verseId as string;
  const { toast } = useToast();

  const [surah, setSurah] = useState<SurahInfo | null>(null);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id || !verseId) return;
      try {
        setLoading(true);
        // Fetch Surah Info
        const surahRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const surahData = await surahRes.json();
        setSurah(surahData.chapter);

        // Fetch Verse Details (with words and translations)
        const verseRes = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${id}:${verseId}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`
        );
        const verseData = await verseRes.json();
        if (verseData && verseData.verse) {
          setVerse(verseData.verse);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
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
  }, [id, verseId]);

  const toggleAudio = async () => {
    if (!verse) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    
    setLoadingAudio(true);
    try {
      // Using default reciter (Mishary Rashid Alafasy - ID 7) for simplicity in Mufradat
      const res = await fetch(`https://api.quran.com/api/v4/recitations/7/by_ayah/${verse.verse_key}`);
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;
      let fullUrl = audioUrl;
      if (audioUrl.startsWith('//')) fullUrl = `https:${audioUrl}`;
      else if (!audioUrl.startsWith('http')) fullUrl = `https://audio.qurancdn.com/${audioUrl}`;
      
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(fullUrl);
      audioRef.current = audio;
      audio.onplay = () => {
        setPlaying(true);
        setLoadingAudio(false);
      };
      audio.onended = () => setPlaying(false);
      await audio.play();
    } catch (err) {
      setLoadingAudio(false);
      toast({ variant: "destructive", title: "Audio Error", description: "Gagal memutar audio ayat." });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium">Memuat Ayat...</p>
      </div>
    );
  }

  if (!verse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Info className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">Ayat tidak ditemukan.</p>
        <Button asChild variant="outline">
          <Link href={`/mufradat/${id}`}>Kembali ke Surah</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 sticky top-0 bg-background/95 backdrop-blur z-30">
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-[#800000] border-[#800000]/20 hover:bg-[#800000]/5 shrink-0">
          <Link href={`/mufradat/${id}`}>
            <ChevronLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold font-headline truncate text-[#800000]">
            {surah?.name_simple} Ayat {verse.verse_number}
          </h1>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Hi Mufradat • Tadabbur Kata</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleAudio} disabled={loadingAudio} className="text-[#800000]">
          {loadingAudio ? <Loader2 className="animate-spin h-5 w-5" /> : playing ? <Pause className="h-5 w-5 fill-current" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mushaf View */}
      <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl border-b-4 border-[#800000]">
        <CardContent className="p-8 sm:p-12 text-center space-y-8">
          <div className="flex flex-row-reverse flex-wrap justify-center gap-x-4 gap-y-8" dir="rtl">
            {verse.words?.map((word, wordIdx) => (
              <div key={wordIdx} className="flex flex-col items-center gap-2 group cursor-help transition-all hover:scale-110">
                <span className="text-4xl sm:text-5xl font-arabic text-slate-800 group-hover:text-[#800000] transition-colors">
                  {word.text_uthmani}
                </span>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#800000] uppercase tracking-tighter">
                  {word.translation?.text || "..."}
                </span>
              </div>
            ))}
          </div>
          
          <div className="pt-8 border-t border-slate-100 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3 h-3 text-[#D4AF37] fill-current" />
              <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Terjemahan Ayat</p>
            </div>
            <div 
              className="text-base sm:text-lg leading-relaxed text-slate-700 italic font-medium"
              dangerouslySetInnerHTML={{ __html: verse.translations[0]?.text || "" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Study Actions */}
      <div className="grid grid-cols-1 gap-4">
        <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black py-8 h-auto text-lg rounded-2xl shadow-lg border-b-4 border-[#800000]/20">
          <Link href={`/mufradat/${id}/${verseId}/quiz`} className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              <span>Mulai Uji Hafalan</span>
            </div>
            <span className="text-[10px] opacity-70 uppercase tracking-widest">Latih Ingatan Mufradat</span>
          </Link>
        </Button>

        <Card className="bg-[#800000]/5 border-none rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm text-[#800000] shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-[#800000] mb-1">Tips Tadabbur</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Fokuslah pada perubahan kata yang berwarna. Pelajari bagaimana satu akar kata bisa memiliki berbagai makna dalam konteks yang berbeda.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
