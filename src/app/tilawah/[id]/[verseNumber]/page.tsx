"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, BrainCircuit, ListTree, GraduationCap, ArrowLeft, ArrowRight, RotateCcw, Lightbulb, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import { getVerseAnalysis } from "@/app/actions";
import { type AnalyzeVerseOutput } from "@/ai/flows/verse-analysis";
import { Skeleton } from "@/components/ui/skeleton";

interface WordData {
  id: number;
  text_uthmani: string;
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
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  
  // Repetition Counter State
  const [wordCounts, setWordCounts] = useState<Record<number, number>>({});

  const fetchAiAnalysis = useCallback(async (name: string, num: number, text: string) => {
    setAnalysisLoading(true);
    try {
      const result = await getVerseAnalysis({ surahName: name, verseNumber: num, verseText: text });
      if (result) {
        setAnalysis(result);
      }
    } catch (e) {
      console.error("AI Analysis Error:", e);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const fetchOfficialTafsir = useCallback(async (chapterId: string, vNum: string) => {
    setApiTafsir(null);
    try {
      const res = await fetch(`https://api.quran.com/api/v4/tafsirs/157/by_key/${chapterId}:${vNum}`);
      if (res.ok) {
        const data = await res.json();
        setApiTafsir(data.tafsir?.text || "Tafsir belum tersedia.");
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
        const sRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const sData = await sRes.json();
        setSurahName(sData.chapter.name_simple);
        setTotalVerses(sData.chapter.verses_count);

        const vRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${verseNumber}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`);
        const vData = await vRes.json();
        setVerse(vData.verse);

        fetchOfficialTafsir(id, verseNumber);
        if (vData.verse) fetchAiAnalysis(sData.chapter.name_simple, parseInt(verseNumber), vData.verse.text_uthmani);
      } catch (e) {
        console.error("Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id, verseNumber, fetchAiAnalysis, fetchOfficialTafsir]);

  const incrementWordCount = (idx: number) => {
    setWordCounts(prev => ({
      ...prev,
      [idx]: (prev[idx] || 0) + 1
    }));
  };

  const resetWordCounts = () => {
    setWordCounts({});
  };

  if (loading) return <div className="flex flex-col items-center py-32 gap-4"><Loader2 className="animate-spin text-[#800000]" /><p className="text-sm">Menyiapkan Penjabaran...</p></div>;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32 px-4 sm:px-0">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button asChild variant="ghost" size="icon"><Link href={`/tilawah/${id}`}><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">{surahName} : ({verseNumber})</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Sahabat AQLI • Fokus Pendalaman Ayat</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="text-amber-600"><Link href={`/tilawah/${id}/${verseNumber}/quiz`}><GraduationCap className="h-5 w-5" /></Link></Button>
          <Button variant="ghost" size="icon" disabled={currentVerseNum <= 1} onClick={() => router.push(`/tilawah/${id}/${currentVerseNum - 1}`)}><ArrowLeft className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" disabled={currentVerseNum >= totalVerses} onClick={() => router.push(`/tilawah/${id}/${currentVerseNum + 1}`)}><ArrowRight className="h-5 w-5" /></Button>
        </div>
      </div>

      <Card className="border-none bg-muted/20">
        <CardContent className="pt-8 pb-10 px-6 text-right" dir="rtl">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-wrap justify-end gap-x-2 gap-y-4 w-full">
              {verse?.words?.filter(w => w.text_uthmani).map((word, wordIdx) => (
                <Tooltip key={wordIdx} open={activeWordIdx === wordIdx} onOpenChange={(o) => o && setActiveWordIdx(wordIdx)}>
                  <TooltipTrigger asChild>
                    <span 
                      tabIndex={0} role="button" onPointerEnter={() => setActiveWordIdx(wordIdx)}
                      className="text-2xl md:text-4xl font-arabic leading-[2] text-foreground hover:text-[#800000] focus:text-[#800000] outline-none cursor-help px-0.5 inline-block"
                    >
                      {word.text_uthmani}
                    </span>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                      <p className="text-xs font-medium">{word.translation?.text || "..."}</p>
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
          <div className="max-w-2xl ml-auto text-left mt-8" dir="ltr">
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20 text-[10px] font-bold uppercase">Terjemahan Kemenag RI</Badge>
            <div className="text-lg text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse?.translations[0]?.text || "" }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-headline">
              <ListTree className="w-4 h-4 text-[#800000]" />
              Penjabaran Kata
            </CardTitle>
            {Object.keys(wordCounts).length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetWordCounts} className="text-[10px] font-bold text-muted-foreground uppercase gap-1">
                <RotateCcw className="w-3 h-3" /> Reset Hitungan
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" dir="ltr">
              {verse?.words?.filter(w => w.text_uthmani).map((word, idx) => (
                <div 
                  key={idx} 
                  className="p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-all cursor-pointer active:scale-[0.98] select-none"
                  onClick={() => incrementWordCount(idx)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-muted-foreground w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-2xl font-arabic text-[#800000] text-right" dir="rtl">{word.text_uthmani}</span>
                      {wordCounts[idx] > 0 && (
                        <Badge className="bg-[#D4AF37] hover:bg-[#D4AF37] text-black text-[9px] font-bold h-4 px-1 animate-in zoom-in-50 duration-200">
                          x{wordCounts[idx]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">{word.translation.text}</p>
                    <p className="text-[10px] text-muted-foreground italic">Ketuk untuk repetisi hafalan</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t bg-muted/10 p-4">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold gap-2 py-6 h-14 text-lg">
              <Link href={`/tilawah/${id}/${verseNumber}/quiz`}><GraduationCap className="w-5 h-5" /> MULAI UJI HAFALAN</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Static Tips Menghafal Kata (Moved below Start Quiz button) */}
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader className="py-4 border-b border-amber-100 flex flex-row items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base font-bold font-headline text-amber-900">Tips Menghafal Terjemahan Per Kata</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Visualisasi</strong>: Bayangkan makna kata tersebut secara visual di dalam pikiran Anda saat membacanya.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">2</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Repetisi</strong>: Ulangi setiap kata sebanyak <strong>minimal 5 kali</strong> dengan mengetuk baris kata pada daftar di atas.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">3</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Koneksi</strong>: Fokuskan pikiran pada hubungan antara bunyi pengucapan Arab dan arti bahasa Indonesianya.
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Hikmah & Konteks AI (Terpisah di bagian bawah) */}
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="py-4 border-b border-indigo-50">
            <CardTitle className="text-base flex items-center gap-2 font-headline text-indigo-900">
              <BrainCircuit className="w-5 h-5" /> Bimbingan Hikmah & Konteks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {analysisLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-indigo-950">
                <p className="leading-relaxed whitespace-pre-wrap italic">
                  {analysis?.hikmah || "Memformulasikan bimbingan hikmah untuk Anda..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#800000]/10 shadow-sm">
          <CardHeader className="bg-[#800000] text-white py-4">
            <CardTitle className="text-sm flex items-center gap-2 font-headline"><BookOpen className="w-4 h-4" /> Tafsir Resmi</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-foreground/90 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: apiTafsir || "Memuat tafsir..." }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
