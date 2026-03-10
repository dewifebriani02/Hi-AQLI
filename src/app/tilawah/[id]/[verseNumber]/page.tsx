
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, BookOpen, BrainCircuit, ListTree, RefreshCw, GraduationCap, Lightbulb, ArrowLeft, ArrowRight, Play, Pause } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVerseAnalysis } from "@/app/actions";
import { type AnalyzeVerseOutput } from "@/ai/flows/verse-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WordData {
  id: number;
  text_uthmani: string;
  root: string | null;
  translation: {
    text: string;
  };
}

interface VerseDetail {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  translations: { text: string }[];
  words: WordData[];
}

export default function VerseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const verseNumber = params.verseNumber as string;
  const currentVerseNum = parseInt(verseNumber);
  
  const [verse, setVerse] = useState<VerseDetail | null>(null);
  const [surahName, setSurahName] = useState("");
  const [totalVerses, setTotalVerses] = useState(0);
  const [apiTafsir, setApiTafsir] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeVerseOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Swipe Detection Logic
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    
    if (distance > 70 && currentVerseNum < totalVerses) {
      router.push(`/tilawah/${id}/${currentVerseNum + 1}`);
    } 
    else if (distance < -70 && currentVerseNum > 1) {
      router.push(`/tilawah/${id}/${currentVerseNum - 1}`);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const fetchAiAnalysis = useCallback(async (name: string, num: number, text: string) => {
    setAnalysisLoading(true);
    try {
      const result = await getVerseAnalysis({
        surahName: name,
        verseNumber: num,
        verseText: text
      });
      setAnalysis(result);
    } catch (e) {
      console.error("AI Analysis Error:", e);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const fetchOfficialTafsir = useCallback(async (chapterId: string, vNum: string) => {
    setApiTafsir(null);
    try {
      const tafsirId = 157; // Kemenag RI
      const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_key/${chapterId}:${vNum}`);
      if (res.ok) {
        const data = await res.json();
        setApiTafsir(data.tafsir?.text || "Tafsir belum tersedia untuk ayat ini.");
      } else {
        setApiTafsir("Gagal memuat tafsir resmi.");
      }
    } catch {
      setApiTafsir("Gagal memuat tafsir resmi.");
    }
  }, []);

  useEffect(() => {
    async function fetchAll() {
      if (!id || !verseNumber) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch Surah Info
        const sRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const sData = await sRes.json();
        setSurahName(sData.chapter.name_simple);
        setTotalVerses(sData.chapter.verses_count);

        // Fetch Verse Details
        const vRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`);
        if (!vRes.ok) throw new Error("Gagal memuat ayat.");
        const vData = await vRes.json();
        setVerse(vData.verse);

        // Fetch Tafsir & AI Analysis
        fetchOfficialTafsir(id, verseNumber);
        if (vData.verse) fetchAiAnalysis(sData.chapter.name_simple, parseInt(verseNumber), vData.verse.text_uthmani);
      } catch (e: any) {
        setError("Gagal memuat data ayat.");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id, verseNumber, fetchAiAnalysis, fetchOfficialTafsir]);

  const togglePlay = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsAudioLoading(true);
    try {
      const verseKey = `${id}:${verseNumber}`;
      const res = await fetch(`https://api.quran.com/api/v4/recitations/7/by_ayah/${verseKey}`);
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;

      if (!audioUrl) throw new Error();

      const fullUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsAudioLoading(false);
      };
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsAudioLoading(false);
        setIsPlaying(false);
        toast({ variant: "destructive", title: "Gagal memuat audio" });
      };

      await audio.play();
    } catch {
      setIsAudioLoading(false);
      toast({ variant: "destructive", title: "Audio tidak tersedia" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium text-sm">Menyiapkan Penjabaran Ayat...</p>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col gap-8 max-w-4xl mx-auto pb-32 px-4 sm:px-0 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Navigation */}
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}`}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">{surahName} : {verseNumber}</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Sahabat AQLI • Geser untuk navigasi ayat</p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentVerseNum <= 1}
            onClick={() => router.push(`/tilawah/${id}/${currentVerseNum - 1}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentVerseNum >= totalVerses}
            onClick={() => router.push(`/tilawah/${id}/${currentVerseNum + 1}`)}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Verse Card */}
      <Card className="border-none bg-muted/20 relative overflow-hidden">
        <CardContent className="pt-8 pb-10 px-6 space-y-8 text-right" dir="rtl">
          <h2 className="text-2xl md:text-4xl font-arabic leading-[2] text-foreground">
            {verse?.text_uthmani}
          </h2>
          <div className="max-w-2xl ml-auto text-left" dir="ltr">
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20 text-[10px] font-bold">TERJEMAHAN KEMENAG RI</Badge>
            <div className="text-lg text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse?.translations[0]?.text || "" }} />
          </div>
          
          {/* Audio Action in Card */}
          <div className="flex justify-center pt-4" dir="ltr">
            <Button 
              onClick={togglePlay}
              disabled={isAudioLoading}
              className={cn(
                "rounded-full w-14 h-14 shadow-lg transition-all",
                isPlaying ? "bg-[#800000] hover:bg-[#800000]/90" : "bg-white text-[#800000] hover:bg-muted border-2 border-[#800000]/20"
              )}
            >
              {isAudioLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-1" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {/* Word Breakdown Section */}
        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base flex items-center gap-2 font-headline">
              <ListTree className="w-4 h-4 text-[#800000]" />
              Penjabaran Kata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" dir="rtl">
              {verse?.words?.filter(w => w.text_uthmani).map((word, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors" dir="ltr">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-2xl font-arabic text-[#800000]">{word.text_uthmani}</span>
                  </div>
                  <div className="text-right sm:max-w-[60%]">
                    <p className="text-sm font-medium">{word.translation.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Memorization Tips Card */}
            <div className="p-4 bg-amber-50/50" dir="ltr">
              <Alert className="border-amber-200 bg-white shadow-sm">
                <Lightbulb className="h-4 w-4 text-[#B8860B]" />
                <AlertTitle className="text-xs font-bold text-[#800000] uppercase tracking-wider">Tips Menghafal Efektif</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground leading-relaxed space-y-2 mt-2">
                  <p>• <strong>Visualisasi:</strong> Bayangkan arti kata dalam gambaran visual sesuai konteks ayat.</p>
                  <p>• <strong>Pengulangan Lisan:</strong> Ucapkan kata Arab dan artinya sebanyak 5 kali.</p>
                  <p>• <strong>Target Sempurna:</strong> Anda wajib mendapatkan skor 100% untuk menyelesaikan kuis ini.</p>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t bg-muted/10 p-4">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold gap-2 py-6 shadow-md border-b-4 border-amber-600 transition-all active:translate-y-0.5 active:border-b-2 h-14 text-lg">
              <Link href={`/tilawah/${id}/${verseNumber}/quiz`}>
                <GraduationCap className="w-5 h-5 text-black" /> UJI HAFALAN KATA
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Tafsir Card */}
        <Card className="border-[#800000]/10 shadow-sm">
          <CardHeader className="bg-[#800000] text-white py-4">
            <CardTitle className="text-sm flex items-center gap-2 font-headline">
              <BookOpen className="w-4 h-4" />
              Tafsir Resmi (Kemenag RI)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {apiTafsir ? (
              <div 
                className="text-foreground/90 leading-relaxed text-base prose prose-sm max-w-none prose-strong:text-[#800000]"
                dangerouslySetInnerHTML={{ __html: apiTafsir }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground italic">
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <p className="text-xs">Memuat tafsir...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Hikmah Card */}
        <Card className="border-accent/20 shadow-sm bg-accent/5">
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2 font-headline text-[#800000]">
              <BrainCircuit className="w-4 h-4" />
              Hikmah (AI Sahabat AQLI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : analysis ? (
              <p className="text-foreground/90 leading-relaxed italic text-sm">{analysis.context}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Analisis tidak tersedia.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Footer Navigation */}
      <div className="flex items-center justify-between gap-4 mt-8">
        <Button 
          variant="outline" 
          className="flex-1 gap-2 border-[#800000] text-[#800000] font-bold" 
          disabled={currentVerseNum <= 1}
          onClick={() => router.push(`/tilawah/${id}/${currentVerseNum - 1}`)}
        >
          <ChevronLeft className="h-4 w-4" /> Ayat Sebelumnya
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 gap-2 border-[#800000] text-[#800000] font-bold" 
          disabled={currentVerseNum >= totalVerses}
          onClick={() => router.push(`/tilawah/${id}/${currentVerseNum + 1}`)}
        >
          Ayat Selanjutnya <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
