
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, BrainCircuit, ListTree, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVerseAnalysis } from "@/app/actions";
import { type AnalyzeVerseOutput } from "@/ai/flows/verse-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VerseDetail {
  id: number;
  verse_number: number;
  text_uthmani: string;
  translations: { text: string }[];
}

export default function VerseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const verseNumber = params.verseNumber as string;
  
  const [verse, setVerse] = useState<VerseDetail | null>(null);
  const [surahName, setSurahName] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeVerseOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAiAnalysis = useCallback(async (name: string, num: number, text: string) => {
    setAnalysisLoading(true);
    setError(null);
    try {
      const result = await getVerseAnalysis({
        surahName: name,
        verseNumber: num,
        verseText: text
      });
      setAnalysis(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Terjadi kesalahan saat memuat analisis.");
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchVerse() {
      try {
        setLoading(true);
        // Fetch surah name
        const surahRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const surahData = await surahRes.json();
        setSurahName(surahData.chapter.name_simple);

        // Fetch verse detail
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&translations=33&fields=text_uthmani`
        );
        const data = await res.json();
        setVerse(data.verse);
        
        // Trigger AI Analysis
        if (data.verse) {
          fetchAiAnalysis(surahData.chapter.name_simple, parseInt(verseNumber), data.verse.text_uthmani);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Gagal memuat data ayat dari server.");
      } finally {
        setLoading(false);
      }
    }
    fetchVerse();
  }, [id, verseNumber, fetchAiAnalysis]);

  const handleRetry = () => {
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

  if (!verse) return (
    <div className="p-12 text-center flex flex-col items-center gap-4">
      <p className="text-muted-foreground">Data ayat tidak ditemukan.</p>
      <Button asChild variant="outline">
        <Link href={`/tilawah/${id}`}>Kembali</Link>
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-24 px-4 sm:px-0">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/tilawah/${id}`}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold font-headline">{surahName} : Ayat {verseNumber}</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#800000] font-bold">Detail & Penjabaran Mendalam</p>
        </div>
      </div>

      {/* Main Verse Card */}
      <Card className="border-none bg-muted/20">
        <CardContent className="pt-8 pb-10 px-6 space-y-8 text-center">
          <h2 className="text-4xl md:text-5xl font-arabic leading-[1.8] text-foreground" dir="rtl">
            {verse.text_uthmani}
          </h2>
          <div className="max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20">Terjemahan Kemenag RI</Badge>
            <p className="text-xl text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse.translations[0].text }} />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Analisis AI</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 mt-2">
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-fit gap-2 border-destructive/20 hover:bg-destructive/10"
              onClick={handleRetry}
            >
              <RefreshCw className="w-3 h-3" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        {/* Word Breakdown */}
        <Card className="border-[#800000]/10 shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2 font-headline">
              <ListTree className="w-5 h-5 text-[#800000]" />
              Penjabaran Kata & Akar Kata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {analysisLoading ? (
               <div className="p-6 space-y-4">
                 {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
               </div>
            ) : analysis ? (
              <div className="divide-y">
                {analysis.wordBreakdown.map((item, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-arabic text-[#800000]">{item.word}</span>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Akar: <span className="text-foreground font-arabic text-lg">{item.root}</span></span>
                    </div>
                    <div className="text-right sm:max-w-[60%]">
                      <p className="text-sm font-medium">{item.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground italic">
                {error ? "Analisis tidak tersedia karena kesalahan sistem." : "Menunggu analisis AI..."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tafsir Card */}
        <Card className="border-[#800000]/10 shadow-sm">
          <CardHeader className="bg-[#800000] text-white">
            <CardTitle className="text-lg flex items-center gap-2 font-headline">
              <BookOpen className="w-5 h-5" />
              Tafsir Ringkas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {analysisLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : analysis ? (
              <p className="text-foreground/90 leading-relaxed text-lg whitespace-pre-wrap">{analysis.tafsir}</p>
            ) : (
               <p className="text-muted-foreground italic text-center py-4">Tafsir akan muncul setelah analisis AI berhasil.</p>
            )}
          </CardContent>
        </Card>

         {/* Lesson Card */}
         <Card className="border-accent/20 shadow-sm bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-headline text-[#800000]">
              <BrainCircuit className="w-5 h-5" />
              Pelajaran & Konteks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : analysis ? (
              <p className="text-muted-foreground leading-relaxed">{analysis.context}</p>
            ) : (
               <p className="text-muted-foreground italic text-center py-4">Pelajaran utama akan muncul di sini.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
