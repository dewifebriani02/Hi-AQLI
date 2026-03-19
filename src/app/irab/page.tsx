'use client';

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Sparkles,
  BookOpen,
  Zap,
  Layers,
} from 'lucide-react';
import Link from "next/link";
import { cn } from "@/lib/utils";

// Daftar ayat yang tersedia untuk I'rab
const IRAB_AYAT_LIST = [
  {
    key: "1:1",
    surah: "Al-Fatihah",
    surahId: "1",
    ayat: 1,
    translation: "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.",
    wordCount: 5,
  },
  {
    key: "114:1",
    surah: "An-Nas",
    surahId: "114",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan manusia,'",
    wordCount: 5,
  },
  {
    key: "113:1",
    surah: "Al-Falaq",
    surahId: "113",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan yang menguasai subuh (fajar),'",
    wordCount: 5,
  },
];

export default function IrabPage() {
  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000]">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-black text-[#800000] leading-none uppercase">Hi I'rab</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Nahwu • Bedah Tata Bahas</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Intro Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-[#800000] to-[#5a0000] text-white overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            <Sparkles className="w-40 h-40" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Pelajari I'rab Al-Qur'an</h2>
                <p className="text-sm opacity-90 leading-relaxed">
                  I'rab (إعراب) adalah ilmu Nahwu yang mempelajari kedudukan kata dalam kalimat Bahasa Arab.
                  Pahami fungsi setiap kata dalam ayat Al-Qur'an.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daftar Ayat yang Tersedia */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">Ayat Tersedia</h3>
            <div className="h-[1px] flex-1 bg-orange-100" />
          </div>

          <div className="grid gap-3">
            {IRAB_AYAT_LIST.map((item) => (
              <Link key={item.key} href={`/irab/${item.surahId}/${item.ayat}`}>
                <Card className="border-none shadow-md bg-white hover:shadow-xl transition-all cursor-pointer group overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#800000] to-[#5a0000] text-white font-bold text-sm group-hover:scale-110 transition-transform">
                      {item.ayat}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base text-[#800000]">{item.surah}</h4>
                        <Badge variant="outline" className="border-amber-300 text-amber-700 text-[9px] font-black uppercase bg-amber-50">
                          Ayat {item.ayat}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground italic line-clamp-1">
                        "{item.translation}"
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Zap className="w-3 h-3 text-[#D4AF37]" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {item.wordCount} Kata • Bedah Nahwu
                        </span>
                      </div>
                    </div>
                    <div className="text-[#800000]/30 group-hover:text-[#800000] transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="pt-8 flex flex-col items-center justify-center text-center">
           <div className="p-4 rounded-2xl bg-white shadow-sm border border-orange-100 max-w-sm">
             <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Al-Juz al-Thalathun</p>
             <p className="text-[9px] text-muted-foreground font-bold italic mt-1">Data I'rab Juz 30 sedang diperbarui berkala.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
