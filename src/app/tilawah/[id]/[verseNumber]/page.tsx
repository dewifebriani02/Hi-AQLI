
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, BrainCircuit, ListTree, RefreshCw, AlertCircle, GraduationCap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVerseAnalysis } from "@/app/actions";
import { type AnalyzeVerseOutput } from "@/ai/flows/verse-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  text_uthmani: string;
  translations: { text: string }[];
  words: WordData[];
}

export default function VerseDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Swipe Detection
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
    const isLeftSwipe = distance > 70;
    const isRightSwipe = distance < -70;

    if (isLeftSwipe && currentVerseNum < totalVerses) {
      // Swipe Left -> Next Verse
      router.push(`/tilawah/${id}/${currentVerseNum + 1}`);
    } else if (isRightSwipe && currentVerseNum > 1) {
      // Swipe Right -> Prev Verse
      router.push(`/tilawah/${id}/${currentVerseNum - 1}`);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const fetchAiAnalysis = useCallback(async (name: string, num: number, text: string) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await getVerseAnalysis({
        surahName: name,
        verseNumber: num,
        verseText: text
      });
      setAnalysis(result);
    } catch (e: any) {
      console.error("AI Analysis Error captured in UI:", e);
      setAnalysisError(e.message || "Gagal memuat analisis AI.");
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchVerse() {
      if (!id || !verseNumber) return;

      try {
        setLoading(true);
        setError(null);
        setAnalysis(null);

        const surahRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        if (!surahRes.ok) throw new Error("Gagal memuat nama surat.");
        const surahData = await surahRes.json();
        setSurahName(surahData.chapter.name_simple);
        setTotalVerses(surahData.chapter.verses_count);

        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&words=true&word_fields=text_uthmani,root&word_translation_language=id&translations=33&fields=text_uthmani`
        );
        if (!res.ok) throw new Error("Gagal memuat data ayat.");
        const data = await res.json();
        setVerse(data.verse);

        try {
          const tafsirRes = await fetch(
            `https://api.quran.com/api/v4/tafsirs/157/by_key/${id}:${verseNumber}`
          );
          if (tafsirRes.ok) {
            const tafsirData = await tafsirRes.json();
            setApiTafsir(tafsirData.tafsir?.text || "Tafsir tidak tersedia.");
          } else {
            setApiTafsir("Tafsir resmi tidak tersedia untuk ayat ini.");
          }
        } catch (tafsirErr) {
          console.error("Tafsir Fetch Error:", tafsirErr);
          setApiTafsir("Gagal memuat tafsir resmi.");
        }
        
        if (data.verse) {
          fetchAiAnalysis(surahData.chapter.name_simple, parseInt(verseNumber), data.verse.text_uthmani);
        }
      } catch (err: any) {
        console.error("Main Fetch Error:", err);
        setError(err.message || "Terjadi kesalahan saat memuat data.");
      } finally {
        setLoading(false);
      }
    }
    fetchVerse();
  }, [id, verseNumber, fetchAiAnalysis]);

  const handleRetryAnalysis = () => {
    if (verse) {
      fetchAiAnalysis(surahName, parseInt(verseNumber), verse.text_uthmani);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto py-32 items-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-muted-foreground font-medium">Menyiapkan Penjabaran Ayat...</p>
      </div>
    );
  }

  if (error || !verse) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4 max-w-lg mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan</AlertTitle>
          <AlertDescription>{error || "Data ayat tidak ditemukan."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href={`/tilawah/${id}`}>Kembali ke Surat</Link>
        </Button>
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
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}`}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex-1 flex flex-col">
          <h1 className="text-lg font-bold font-headline">{surahName} : Ayat {verseNumber}</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#800000] font-bold">Sahabat AQLI • Detail Mendalam</p>
        </div>
        <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 text-white font-bold gap-2">
          <Link href={`/tilawah/${id}/${verseNumber}/quiz`}>
            <GraduationCap className="w-4 h-4" /> UJI HAFALAN
          </Link>
        </Button>
      </div>

      <Card className="border-none bg-muted/20">
        <CardContent className="pt-8 pb-10 px-6 space-y-8 text-center" dir="rtl">
          <h2 className="text-3xl md:text-4xl font-arabic leading-[1.8] text-foreground">
            {verse.text_uthmani}
          </h2>
          <div className="max-w-2xl mx-auto" dir="ltr">
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20">Terjemahan Kemenag RI</Badge>
            <div className="text-lg text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse.translations[0].text }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-[#800000]/10 shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2 font-headline">
              <ListTree className="w-5 h-5 text-[#800000]" />
              Penjabaran Kata & Akar Kata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" dir="rtl">
              {verse.words?.filter(w => w.text_uthmani).map((word, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors" dir="ltr">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-2xl font-arabic text-[#800000]">{word.text_uthmani}</span>
                    {word.root && (
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                        Akar: <span className="text-foreground font-arabic text-lg">{word.root}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-right sm:max-w-[60%]">
                    <p className="text-sm font-medium">{word.translation.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-[#800000] text-white">
            <CardTitle className="text-lg flex items-center gap-2 font-headline">
              <BookOpen className="w-5 h-5" />
              Tafsir Ringkas (Kemenag RI)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {apiTafsir ? (
              <div 
                className="text-foreground/90 leading-relaxed text-lg prose prose-sm max-w-none prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: apiTafsir }} 
              />
            ) : (
               <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
               </div>
            )}
          </CardContent>
        </Card>

         <Card className="border-accent/20 shadow-sm bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-headline text-[#800000]">
              <BrainCircuit className="w-5 h-5" />
              Pelajaran & Konteks (AI Sahabat AQLI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : analysis ? (
              <p className="text-foreground/90 leading-relaxed italic whitespace-pre-wrap">{analysis.context}</p>
            ) : (
               <div className="text-center py-6 space-y-4">
                  <p className="text-sm text-muted-foreground italic">
                    {analysisError || "Gagal memuat analisis AI secara otomatis."}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRetryAnalysis} className="gap-2 border-[#800000] text-[#800000] hover:bg-[#800000]/10">
                    <RefreshCw className="w-3 h-3" /> Coba Analisis AI
                  </Button>
               </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-24 left-0 right-0 px-4 md:px-8 pointer-events-none z-40 hidden md:block">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button 
            variant="secondary" 
            className="pointer-events-auto shadow-lg border border-[#800000]/20 gap-2 bg-white/90 backdrop-blur"
            disabled={currentVerseNum <= 1}
            onClick={() => router.push(`/tilawah/${id}/${currentVerseNum - 1}`)}
          >
            <ChevronLeft className="w-4 h-4" /> Ayat Sebelumnya
          </Button>
          <Button 
            variant="secondary" 
            className="pointer-events-auto shadow-lg border border-[#800000]/20 gap-2 bg-white/90 backdrop-blur"
            disabled={currentVerseNum >= totalVerses}
            onClick={() => router.push(`/tilawah/${id}/${currentVerseNum + 1}`)}
          >
            Ayat Selanjutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="fixed bottom-20 md:hidden left-0 right-0 flex justify-between p-2 bg-background/80 backdrop-blur border-t z-50">
        <Button 
          variant="ghost" 
          className="flex-1 gap-1 text-[#800000]"
          disabled={currentVerseNum <= 1}
          onClick={() => router.push(`/tilawah/${id}/${currentVerseNum - 1}`)}
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <div className="flex-1 flex items-center justify-center font-bold text-sm text-muted-foreground">
          {currentVerseNum} / {totalVerses}
        </div>
        <Button 
          variant="ghost" 
          className="flex-1 gap-1 text-[#800000]"
          disabled={currentVerseNum >= totalVerses}
          onClick={() => router.push(`/tilawah/${id}/${currentVerseNum + 1}`)}
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
