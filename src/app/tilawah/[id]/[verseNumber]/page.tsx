"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, BrainCircuit, ListTree, RefreshCw, AlertCircle, GraduationCap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  const [tafsirSource, setTafsirSource] = useState<string>("Kemenag RI");
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
      router.push(`/tilawah/${id}/${currentVerseNum + 1}`);
    } else if (isRightSwipe && currentVerseNum > 1) {
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
      
      if (result.error) {
        setAnalysisError(result.error);
      } else {
        setAnalysis(result);
      }
    } catch (e: any) {
      console.error("AI Analysis Fetch Error:", e);
      setAnalysisError("Gagal terhubung dengan layanan analisis AI.");
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
        setApiTafsir(null);

        // 1. Fetch Surah Info
        const surahRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        if (!surahRes.ok) throw new Error("Gagal memuat nama surat.");
        const surahData = await surahRes.json();
        setSurahName(surahData.chapter.name_simple);
        setTotalVerses(surahData.chapter.verses_count);

        // 2. Fetch Verse Detail
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&words=true&word_fields=text_uthmani,root&word_translation_language=id&translations=33&fields=text_uthmani`
        );
        if (!res.ok) throw new Error("Gagal memuat data ayat.");
        const data = await res.json();
        setVerse(data.verse);

        // 3. Official Tafsir with Fallback Strategy
        const fetchTafsir = async (tafsirId: number) => {
          try {
            const tafsirRes = await fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_key/${id}:${verseNumber}`);
            if (tafsirRes.ok) {
              const tafsirData = await tafsirRes.json();
              return tafsirData.tafsir?.text || null;
            }
          } catch (e) {
            return null;
          }
          return null;
        };

        let tafsirText = await fetchTafsir(157); // Try Kemenag Ringkas first
        if (tafsirText) {
          setTafsirSource("Kemenag RI (Ringkas)");
        } else {
          tafsirText = await fetchTafsir(158); // Fallback to Jalalayn ID
          if (tafsirText) setTafsirSource("Tafsir Jalalayn (ID)");
        }
        
        setApiTafsir(tafsirText || "Tafsir resmi tidak tersedia untuk ayat ini.");
        
        // 4. Trigger AI Analysis
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
        <p className="text-muted-foreground font-medium text-sm">Menyiapkan Penjabaran Ayat...</p>
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
          <h1 className="text-lg font-bold font-headline">{surahName} : {verseNumber}</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Sahabat AQLI • Detail Ayat</p>
        </div>
      </div>

      <Card className="border-none bg-muted/20">
        <CardContent className="pt-8 pb-10 px-6 space-y-8 text-right" dir="rtl">
          <h2 className="text-2xl md:text-4xl font-arabic leading-[2] text-foreground">
            {verse.text_uthmani}
          </h2>
          <div className="max-w-2xl ml-auto text-left" dir="ltr">
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20 text-[10px] font-bold">TERJEMAHAN KEMENAG RI</Badge>
            <div className="text-lg text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse.translations[0].text }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {/* Word-by-Word Analysis */}
        <Card className="border-[#800000]/10 shadow-sm">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base flex items-center gap-2 font-headline">
              <ListTree className="w-4 h-4 text-[#800000]" />
              Penjabaran Kata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" dir="rtl">
              {verse.words?.filter(w => w.text_uthmani).map((word, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors" dir="ltr">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-2xl font-arabic text-[#800000]">{word.text_uthmani}</span>
                    {word.root && (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Akar: <span className="text-foreground font-arabic text-base">{word.root}</span>
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
          <CardFooter className="pt-6 border-t bg-muted/5">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold gap-2 py-6 shadow-md border-b-4 border-amber-600 transition-all active:translate-y-1 active:border-b-0">
              <Link href={`/tilawah/${id}/${verseNumber}/quiz`}>
                <GraduationCap className="w-5 h-5 text-black" /> UJI HAFALAN KATA
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Official Tafsir Section */}
        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-[#800000] text-white py-4">
            <CardTitle className="text-base flex items-center gap-2 font-headline">
              <BookOpen className="w-4 h-4" />
              Tafsir Resmi ({tafsirSource})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {apiTafsir ? (
              <div 
                className="text-foreground/90 leading-relaxed text-base prose prose-sm max-w-none prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: apiTafsir }} 
              />
            ) : (
               <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground italic">Memuat tafsir resmi...</p>
               </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Section */}
         <Card className="border-accent/20 shadow-sm bg-accent/5">
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2 font-headline text-[#800000]">
              <BrainCircuit className="w-4 h-4" />
              Hikmah & Pelajaran (AI Sahabat AQLI)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            {analysisLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : analysisError ? (
               <div className="text-center py-6 space-y-4">
                  <p className="text-sm text-muted-foreground italic">
                    {analysisError}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRetryAnalysis} className="gap-2 border-[#800000] text-[#800000] hover:bg-[#800000]/10 font-bold">
                    <RefreshCw className="w-3 h-3" /> Coba Analisis AI
                  </Button>
               </div>
            ) : analysis ? (
              <p className="text-foreground/90 leading-relaxed italic text-sm whitespace-pre-wrap">{analysis.context}</p>
            ) : (
               <div className="text-center py-6 space-y-4">
                  <p className="text-sm text-muted-foreground italic">Gunakan AI untuk mendapatkan pelajaran praktis dari ayat ini.</p>
                  <Button variant="outline" size="sm" onClick={handleRetryAnalysis} className="gap-2 border-[#800000] text-[#800000] hover:bg-[#800000]/10 font-bold">
                    <RefreshCw className="w-3 h-3" /> Analisis AI
                  </Button>
               </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Sticky Navigation */}
      <div className="fixed bottom-20 md:hidden left-0 right-0 flex justify-between p-2 bg-background/95 backdrop-blur border-t z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex-1 gap-1 text-[#800000] font-bold"
          disabled={currentVerseNum <= 1}
          onClick={() => router.push(`/tilawah/${id}/${currentVerseNum - 1}`)}
        >
          <ChevronLeft className="w-4 h-4" /> PREV
        </Button>
        <div className="flex-1 flex items-center justify-center font-bold text-xs text-muted-foreground">
          AYAT {currentVerseNum} / {totalVerses}
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="flex-1 gap-1 text-[#800000] font-bold"
          disabled={currentVerseNum >= totalVerses}
          onClick={() => router.push(`/tilawah/${id}/${currentVerseNum + 1}`)}
        >
          NEXT <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
