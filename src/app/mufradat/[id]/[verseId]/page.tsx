"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BookOpen, ListTree, GraduationCap, ArrowLeft, ArrowRight, RotateCcw, Lightbulb, Lock } from "lucide-react";
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
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";

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

export default function MufradatVerseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const verseId = params.verseId as string;
  const currentVerseNum = parseInt(verseId);

  const { user, isUserLoading } = useUser();

  const [verse, setVerse] = useState<VerseDetail | null>(null);
  const [surahName, setSurahName] = useState("");
  const [totalVerses, setTotalVerses] = useState(0);
  const [apiTafsir, setApiTafsir] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);

  const [wordCounts, setWordCounts] = useState<Record<number, number>>({});

  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'surah_id', operator: '==', value: id },
      { column: 'is_passed', operator: '==', value: true }
    ]
  }), [user?.id, id]);

  const { data: progress } = useCollection("quiz_attempts", user ? progressOptions : undefined);

  const completedVerseNumbers = useMemo(() => {
    if (!progress) return new Set<number>();
    return new Set(progress.map(p => Number(p.verse_id)));
  }, [progress]);

  const isCurrentVerseCompleted = completedVerseNumbers.has(currentVerseNum);


  const fetchOfficialTafsir = useCallback(async (chapterId: string, vNum: string) => {
    setApiTafsir(null);
    try {
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_key/${chapterId}:${vNum}?language=id&translations=33`);
      
      if (res.ok) {
        const data = await res.json();
        const tafsirText = data.verse?.translations?.[0]?.text;
        if (tafsirText) {
          setApiTafsir(tafsirText);
        } else {
          setApiTafsir("Penjelasan atau tafsir belum tersedia untuk ayat ini.");
        }
      } else {
        setApiTafsir("Gagal memuat penjelasan dari API Quran.");
      }
    } catch (err) {
      console.error("Tafsir Fetch Error:", err);
      setApiTafsir(null);
    }
  }, []);

  useEffect(() => {
    async function fetchAll() {
      if (!id || !verseId) return;
      try {
        setLoading(true);
        const sRes = await fetch(`https://api.quran.com/api/v4/chapters/${id}?language=id`);
        const sData = await sRes.json();
        setSurahName(sData.chapter.name_simple);
        setTotalVerses(sData.chapter.verses_count);

        const vRes = await fetch(`https://api.quran.com/api/v4/verses/by_key/${id}:${verseId}?language=id&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33&fields=text_uthmani`);
        const vData = await vRes.json();
        setVerse(vData.verse);

        if (vData.verse) setTimeout(() => fetchOfficialTafsir(id, verseId), 300);
      } catch (e) {
        console.error("Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id, verseId, fetchOfficialTafsir]);

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
        <Button asChild variant="ghost" size="icon" className="text-[#800000]"><Link href={`/mufradat/${id}`}><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">{surahName} : ({verseId})</h1>
          <p className="text-[9px] uppercase tracking-widest text-[#800000] font-bold">Hi Mufradat • Tadabbur Ayat</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="text-[#D4AF37]"><Link href={`/mufradat/${id}/${verseId}/quiz`}><GraduationCap className="h-5 w-5" /></Link></Button>
          <Button variant="ghost" size="icon" disabled={currentVerseNum <= 1} onClick={() => router.push(`/mufradat/${id}/${currentVerseNum - 1}`)}><ArrowLeft className="h-5 w-5" /></Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!!(currentVerseNum >= totalVerses || (!isUserLoading && user && !isCurrentVerseCompleted))}
                    onClick={() => router.push(`/mufradat/${id}/${currentVerseNum + 1}`)}
                  >
                    {!isUserLoading && user && !isCurrentVerseCompleted ? <Lock className="h-4 w-4 text-muted-foreground" /> : <ArrowRight className="h-5 w-5" />}
                  </Button>
                </div>
              </TooltipTrigger>
              {!isUserLoading && user && !isCurrentVerseCompleted && (
                <TooltipContent>
                  <p className="text-[10px]">Selesaikan kuis ayat ini (100%) untuk lanjut</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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
                      className="text-2xl md:text-3xl font-arabic leading-[2] text-foreground hover:text-[#800000] focus:text-[#800000] outline-none cursor-help px-0.5 inline-block"
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
            <Badge variant="outline" className="mb-4 text-[#800000] border-[#800000]/20 text-[10px] font-bold uppercase">Terjemahan Ayat</Badge>
            <div className="text-lg text-muted-foreground leading-relaxed italic" dangerouslySetInnerHTML={{ __html: verse?.translations[0]?.text || "" }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-[#800000]/10 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-[#800000]/5 py-4 flex flex-row items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-base flex items-center gap-2 font-headline">
                <ListTree className="w-4 h-4 text-[#800000]" />
                Penjelasan Kata
              </CardTitle>
              <p className="text-[11px] text-amber-900 font-medium leading-snug">
                <strong>Repetisi</strong>: Ulangi setiap kata sebanyak minimal 5 kali dengan mengetuk baris kata pada daftar di bawah.
              </p>
            </div>
            {Object.keys(wordCounts).length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetWordCounts} className="text-[10px] font-bold text-muted-foreground uppercase gap-1 mt-1">
                <RotateCcw className="w-3 h-3" /> Reset
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
                    <p className="text-[10px] text-muted-foreground italic text-amber-700/60">Ketuk untuk repetisi hafalan</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t bg-muted/10 p-4 flex flex-col gap-3">
            <Button asChild className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black gap-2 py-6 h-14 text-lg rounded-xl shadow-lg border-b-4 border-[#800000]/20">
              <Link href={user ? `/mufradat/${id}/${verseId}/quiz` : `/login?redirectTo=/mufradat/${id}/${verseId}`}>
                <GraduationCap className="w-5 h-5" />
                {user ? (isCurrentVerseCompleted ? "ULANGI UJI HAFALAN" : "MULAI UJI HAFALAN") : "MASUK UNTUK UJI HAFALAN"}
              </Link>
            </Button>

            {isCurrentVerseCompleted && currentVerseNum < totalVerses && (
              <Button asChild variant="outline" className="w-full border-2 border-[#800000]/20 hover:bg-[#800000]/5 text-[#800000] font-black gap-2 py-6 h-14 text-lg rounded-xl transition-all">
                <Link href={`/mufradat/${id}/${currentVerseNum + 1}`}>
                  LANJUT KE AYAT {currentVerseNum + 1}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-amber-200 bg-amber-50 shadow-sm border-l-4">
          <CardHeader className="py-4 border-b border-amber-100 flex flex-row items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base font-bold font-headline text-amber-900">Tips Hafal Kosakata</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Pahami Akar Kata</strong>: Setiap kata memiliki akar yang memberikan gambaran makna dasar yang kuat.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold">2</div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Koneksi Makna</strong>: Hubungkan antara kosa kata Arab dan terjemahannya dengan membayangkan maksud ayat tersebut.
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-[#800000]/10 shadow-sm overflow-hidden border-l-4 border-l-[#800000]">
          <CardHeader className="bg-[#800000] text-white py-4">
            <CardTitle className="text-sm flex items-center gap-2 font-headline"><BookOpen className="w-4 h-4" /> Kemenag RI • Penjelasan Ringkas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-white">
            <div className="text-slate-700 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: apiTafsir || "Memuat penjelasan..." }} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
