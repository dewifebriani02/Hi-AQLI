"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Play, Share2, Bookmark } from "lucide-react";
import Link from "next/link";

// Mock data for Surah details and verses
const surahDetails: Record<string, { name: string; translation: string; verses: { number: number; text: string; translation: string }[] }> = {
  "1": {
    name: "Al-Fatihah",
    translation: "Pembukaan",
    verses: [
      { number: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang." },
      { number: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "Segala puji bagi Allah, Tuhan seluruh alam," },
      { number: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ", translation: "Yang Maha Pengasih, Maha Penyayang," },
      { number: 4, text: "مَالِكِ يَوْمِ الدِّينِ", translation: "Pemilik hari pembalasan." },
      { number: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", translation: "Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami mohon pertolongan." },
      { number: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", translation: "Bimbinglah kami ke jalan yang lurus," },
      { number: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", translation: "(yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat." },
    ]
  }
};

const defaultSurah = {
  name: "Surat",
  translation: "Terjemahan",
  verses: [
    { number: 1, text: "Contoh Ayat Al-Qur'an", translation: "Ini adalah contoh terjemahan ayat." },
    { number: 2, text: "Contoh Ayat Al-Qur'an Kedua", translation: "Ini adalah contoh terjemahan ayat kedua." },
  ]
};

export default function SurahDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const surah = surahDetails[id] || defaultSurah;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-2 border-b">
        <Button asChild variant="ghost" size="icon">
          <Link href="/tilawah">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold font-headline">{surah.name}</h1>
          <p className="text-xs text-muted-foreground">{surah.translation}</p>
        </div>
      </div>

      {/* Bismillah Banner */}
      {id !== "1" && (
        <div className="text-center py-8">
          <h2 className="text-3xl font-arabic">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h2>
        </div>
      )}

      {/* Verses List */}
      <div className="flex flex-col gap-6">
        {surah.verses.map((verse) => (
          <Card key={verse.number} className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-4">
              {/* Verse Actions & Number */}
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {verse.number}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Arabic Text */}
              <div className="text-right py-4">
                <p className="text-3xl font-arabic leading-loose tracking-wide">
                  {verse.text}
                </p>
              </div>

              {/* Translation */}
              <div className="text-left pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {verse.translation}
                </p>
              </div>
              <div className="border-b border-muted/50 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
