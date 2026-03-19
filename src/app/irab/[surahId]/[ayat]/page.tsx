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
  Info,
  Type,
  GraduationCap,
} from 'lucide-react';
import Link from "next/link";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

// Data I'rab dengan penjelasan lengkap
const JUZ_30_DATA: Record<string, any> = {
  "1:1": {
    surah: "Al-Fatihah",
    surahId: "1",
    ayat: 1,
    translation: "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.",
    words: [
      {
        word: "بِـ",
        wordArab: "بِـ",
        trans: "Bi",
        meaning: "Dengan",
        irab: "Harf Jar",
        irabArab: "حَرْفُ الجَرِّ",
        irabIndo: "Huruf Jarr",
        irabExplanation: "Huruf jar yang menyebabkan isim atau makhrun bihi setelahnya berubah menjadi kasrah (majrur). Bi berarti 'dengan' atau 'nama'.",
        shorof: "-",
        function: "Jar",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      },
      {
        word: "اسْمِ",
        wordArab: "الاسْمُ",
        trans: "Ismi",
        meaning: "Nama",
        irab: "Ism Majrur bi Harf al-Jar, wa huwa Mudhaf",
        irabArab: "اِسْمٌ مَجْرُورٌ بِحَرْفِ الجَرِّ، وَهُوَ مُضَافٌ",
        irabIndo: "Isim yang dijar oleh huruf jar, dan mudhaf",
        irabExplanation: "Isim yang dijar oleh huruf jar 'bi', sehingga mendapat kasrah. Kemudian berfungsi sebagai mudhaf (kata yang disandarkan kepada kata lain/ mudhaf ilaih).",
        shorof: "Root: s-m-w (س م و)",
        function: "Majrur / Mudhaf",
        color: "bg-amber-50 text-amber-700 border-amber-100"
      },
      {
        word: "اللَّهِ",
        wordArab: "اللَّهُ",
        trans: "Allāh",
        meaning: "Allah",
        irab: "Lafdzul Jalaalah, Mudhaf Ilaih, Majrur",
        irabArab: "لَفْظُ الجَلَالَةِ، مُضَافٌ إِلَيْهِ، مَجْرُورٌ",
        irabIndo: "Lafdzul Jalaalah, mudhaf ilaih, majrur",
        irabExplanation: "Lafdzul Jalaalah (kata Allah) berkedudukan sebagai mudhaf ilaih (kata yang disandari) yang menerima jar dari isim mudhaf sebelumnya, sehingga berakhiran kasrah.",
        shorof: "Lafdzul Jalaalah",
        function: "Mudhaf Ilaih",
        color: "bg-red-50 text-red-700 border-red-100"
      },
      {
        word: "الرَّحْمَٰنِ",
        wordArab: "الرَّحْمَٰنُ",
        trans: "Ar-Raḥmān",
        meaning: "Maha Pengasih",
        irab: "Na'at (Sifat) lil Jalaalah, Majrur",
        irabArab: "نَعْتٌ لِلْجَلَالَةِ، مَجْرُورٌ",
        irabIndo: "Na'at bagi Jalaalah, majrur",
        irabExplanation: "Berfungsi sebagai na'at (kata sifat/keterangan) untuk lafdzul jalaalah yang mendapat jar, sehingga majrur (berakhiran kasrah).",
        shorof: "Root: r-h-m (ر ح م)",
        function: "Na'at",
        color: "bg-green-50 text-green-700 border-green-100"
      },
      {
        word: "الرَّحِيمِ",
        wordArab: "الرَّحِيمُ",
        trans: "Ar-Raḥīm",
        meaning: "Maha Penyayang",
        irab: "Na'at thaanin (Sifat kedua), Majrur",
        irabArab: "نَعْتٌ ثَانٍ، مَجْرُورٌ",
        irabIndo: "Na'at kedua, majrur",
        irabExplanation: "Na'at kedua yang mengikuti na'at pertama, sama-sama mendapat jar karena mengikuti what yang dina'ti (ma'tuf). Berakhiran kasrah.",
        shorof: "Root: r-h-m (ر ح م)",
        function: "Na'at",
        color: "bg-green-50 text-green-700 border-green-100"
      }
    ]
  },
  "114:1": {
    surah: "An-Nas",
    surahId: "114",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan manusia,'",
    words: [
      {
        word: "قُلْ",
        wordArab: "قُلْ",
        trans: "Qul",
        meaning: "Katakanlah",
        irab: "Fi'il Amr (Kata kerja perintah), mabni 'ala sukun",
        irabArab: "فِعْلُ أَمْرٍ، مَبْنِيٌّ عَلَى السُّكُونِ",
        irabIndo: "Fi'il amr, mabni atas sukun",
        irabExplanation: "Fi'il amr yang dibina sukun pada akhir kata karena fi'il amr selalu mabni. Berfungsi sebagai kalam (predikat) yang marfu' dengan dhammah dhamirah.",
        shorof: "Root: q-w-l (ق و ل)",
        function: "Fi'il Amr",
        color: "bg-purple-50 text-purple-700 border-purple-100"
      },
      {
        word: "أَعُوذُ",
        wordArab: "أَعُوذُ",
        trans: "A'ūdhu",
        meaning: "Aku berlindung",
        irab: "Fi'il Mudhari' (Sedang/akan), Marfu' bid-dhammah",
        irabArab: "فِعْلُ مُضَارِعٍ، مَرْفُوعٌ بِالضَّمَّةِ",
        irabIndo: "Fi'il mudhari', marfu' dengan dhammah",
        irabExplanation: "Fi'il mudhari' yang marfu' dengan dhammah dhomirah pada wawu. Berfungsi sebagai kalam (predikat) untuk fa'il (pelaku) yang tersembunyi (dhamir mustatir).",
        shorof: "Root: 'awd (ع و ذ)",
        function: "Fi'il Mudhari'",
        color: "bg-indigo-50 text-indigo-700 border-indigo-100"
      },
      {
        word: "بِـ",
        wordArab: "بِـ",
        trans: "Bi",
        meaning: "Kepada / Dengan",
        irab: "Harf Jar",
        irabArab: "حَرْفُ الجَرِّ",
        irabIndo: "Huruf Jar",
        irabExplanation: "Huruf jar yang menyebabkan isim setelahnya berubah menjadi kasrah (majrur). Dalam konteks ini berarti 'kepada' karena ta'alluh dengan fi'il.",
        shorof: "-",
        function: "Jar",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      },
      {
        word: "رَبِّ",
        wordArab: "الرَّبُّ",
        trans: "Rabbi",
        meaning: "Tuhan",
        irab: "Ism Majrur, wa huwa Mudhaf",
        irabArab: "اِسْمٌ مَجْرُورٌ، وَهُوَ مُضَافٌ",
        irabIndo: "Isim majrur, dan mudhaf",
        irabExplanation: "Isim yang dijar oleh huruf jar 'bi', sehingga mendapat kasrah. Berfungsi sebagai mudhaf yang akan disandarkan kepada mudhaf ilaih.",
        shorof: "Root: r-b-b (ر ب ب)",
        function: "Majrur / Mudhaf",
        color: "bg-amber-50 text-amber-700 border-amber-100"
      },
      {
        word: "النَّاسِ",
        wordArab: "النَّاسُ",
        trans: "An-Nās",
        meaning: "Manusia",
        irab: "Mudhaf Ilaih, Majrur bil-kasrah",
        irabArab: "مُضَافٌ إِلَيْهِ، مَجْرُورٌ بِالْكَسْرَةِ",
        irabIndo: "Mudhaf ilaih, majrur dengan kasrah",
        irabExplanation: "Mudhaf ilaih (kata yang disandari) yang menerima jar dari mudhaf sebelumnya. Berakhiran ya' nisbah yang dibaca kasrah.",
        shorof: "Root: n-w-s (ن و س)",
        function: "Mudhaf Ilaih",
        color: "bg-red-50 text-red-700 border-red-100"
      }
    ]
  },
  "113:1": {
    surah: "Al-Falaq",
    surahId: "113",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan yang menguasai subuh (fajar),'",
    words: [
      {
        word: "قُلْ",
        wordArab: "قُلْ",
        trans: "Qul",
        meaning: "Katakanlah",
        irab: "Fi'il Amr",
        irabArab: "فِعْلُ أَمْرٍ",
        irabIndo: "Fi'il amr",
        irabExplanation: "Fi'il amr mabni sukun, berfungsi sebagai kalam (predikat) untuk dhamir mustatir (pelaku yang tersembunyi: anta).",
        shorof: "Root: q-w-l",
        function: "Fi'il Amr",
        color: "bg-purple-50 text-purple-700 border-purple-100"
      },
      {
        word: "أَعُوذُ",
        wordArab: "أَعُوذُ",
        trans: "A'ūdhu",
        meaning: "Aku berlindung",
        irab: "Fi'il Mudhari'",
        irabArab: "فِعْلُ مُضَارِعٍ",
        irabIndo: "Fi'il mudhari'",
        irabExplanation: "Fi'il mudhari' marfu' dengan dhammah, fa'ilnya tersembunyi (dhamir mustatir: ana).",
        shorof: "Root: 'awd",
        function: "Fi'il Mudhari'",
        color: "bg-indigo-50 text-indigo-700 border-indigo-100"
      },
      {
        word: "بِـ",
        wordArab: "بِـ",
        trans: "Bi",
        meaning: "Kepada",
        irab: "Harf Jar",
        irabArab: "حَرْفُ الجَرِّ",
        irabIndo: "Huruf Jar",
        irabExplanation: "Huruf jar yang menjarkan isim setelahnya.",
        shorof: "-",
        function: "Jar",
        color: "bg-blue-50 text-blue-700 border-blue-100"
      },
      {
        word: "رَبِّ",
        wordArab: "الرَّبُّ",
        trans: "Rabbi",
        meaning: "Tuhan",
        irab: "Ism Majrur, wa huwa Mudhaf",
        irabArab: "اِسْمٌ مَجْرُورٌ، وَهُوَ مُضَافٌ",
        irabIndo: "Isim majrur, dan mudhaf",
        irabExplanation: "Isim majrur karena menerima jar dari harf jar, sekaligus mudhaf yang disandarkan kepada mudhaf ilaih.",
        shorof: "Root: r-b-b",
        function: "Majrur / Mudhaf",
        color: "bg-amber-50 text-amber-700 border-amber-100"
      },
      {
        word: "الْفَلَقِ",
        wordArab: "الْفَلَقُ",
        trans: "Al-Falaq",
        meaning: "Waktu Subuh",
        irab: "Mudhaf Ilaih, Majrur",
        irabArab: "مُضَافٌ إِلَيْهِ، مَجْرُورٌ",
        irabIndo: "Mudhaf ilaih, majrur",
        irabExplanation: "Mudhaf ilaih yang menerima jar dari mudhaf sebelumnya.",
        shorof: "Root: f-l-q (ف ل ق)",
        function: "Mudhaf Ilaih",
        color: "bg-emerald-50 text-emerald-700 border-emerald-100"
      }
    ]
  }
};

export default function IrabDetailPage() {
  const params = useParams();
  const surahId = params.surahId as string;
  const ayat = params.ayat as string;
  const [selectedWord, setSelectedWord] = useState<number | null>(0);

  const currentAyatKey = `${surahId}:${ayat}`;
  const currentData = useMemo(() => JUZ_30_DATA[currentAyatKey], [currentAyatKey]);

  if (!currentData) {
    return (
      <div className="flex flex-col min-h-screen bg-orange-50/30 items-center justify-center">
        <p className="text-muted-foreground">Data I'rab tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-[#800000] border-[#800000]/20 hover:bg-[#800000]/5 shrink-0">
            <Link href="/irab">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Kembali</span>
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold font-headline truncate text-[#800000]">{currentData.surah}: {currentData.ayat}</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">Hi I'rab • Bedah Nahwu</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Ayat Display Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#800000] rounded-3xl">
          <CardContent className="p-6 sm:p-8 text-center space-y-6">
            <div className="flex flex-row-reverse flex-wrap justify-center gap-x-3 sm:gap-x-4 gap-y-4 sm:gap-y-6">
              {currentData.words.map((item: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setSelectedWord(idx)}
                  className={cn(
                    "cursor-pointer transition-all duration-300 group relative",
                    selectedWord === idx ? "scale-110" : "opacity-70 hover:opacity-100"
                  )}
                >
                  <p className={cn(
                    "text-3xl sm:text-4xl font-arabic leading-relaxed transition-colors",
                    selectedWord === idx ? "text-[#800000]" : "text-slate-700"
                  )}>
                    {item.word}
                  </p>
                  <div className={cn(
                    "h-1 w-full mt-1 rounded-full transition-all",
                    selectedWord === idx ? "bg-[#D4AF37]" : "bg-transparent group-hover:bg-slate-200"
                  )} />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
               <p className="text-sm font-bold text-[#800000] mb-1 italic">
                 "{currentData.translation}"
               </p>
               <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                 Pilih kata di atas untuk banting I'rab
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Word Detail Section */}
        {selectedWord !== null && currentData.words[selectedWord] && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 px-1">
              <Zap className="w-4 h-4 text-[#D4AF37] fill-current" />
              <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">Analisis Kata (I'rab)</h3>
              <div className="h-[1px] flex-1 bg-orange-100" />
            </div>

            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
               <div className={cn("h-2 w-full", currentData.words[selectedWord].color.split(' ')[0])} />
               <CardContent className="p-4 sm:p-6">
                 {/* Header - RATA KANAN */}
                 <div className="flex justify-between items-start mb-6 text-right" dir="rtl">
                   <div className="text-right">
                     <h4 className="text-3xl sm:text-4xl font-arabic text-black mb-1">{currentData.words[selectedWord].wordArab}</h4>
                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{currentData.words[selectedWord].trans}</p>
                   </div>
                   <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg", currentData.words[selectedWord].color)}>
                     {currentData.words[selectedWord].function}
                   </Badge>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                   {/* Kedudukan I'rab - Urutan: Arab → Latin → Indonesia → Penjelasan (kiri) */}
                   <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-xl bg-white text-[#800000] shadow-sm"><Layers className="w-5 h-5" /></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Info className="w-3 h-3" /> Kedudukan (I'rab)
                        </p>
                      </div>
                      <div className="space-y-3">
                        {/* Arab - RATA KANAN */}
                        <div className="text-right border-b border-slate-200 pb-3" dir="rtl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">بِاللُّغَةِ الْعَرَبِيَّةِ</p>
                          <p className="text-lg sm:text-xl font-arabic font-bold text-[#800000] leading-relaxed">
                            {currentData.words[selectedWord].irabArab}
                          </p>
                        </div>
                        {/* Latin (Transliterasi) - RATA KANAN */}
                        <div className="text-right border-b border-slate-200 pb-3" dir="rtl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Latin</p>
                          <p className="text-sm font-bold text-slate-800 leading-relaxed">
                            {currentData.words[selectedWord].irab}
                          </p>
                        </div>
                        {/* Indonesia (Terjemahan dari Arab) - RATA KANAN */}
                        <div className="text-right border-b border-slate-200 pb-3" dir="rtl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Bahasa Indonesia</p>
                          <p className="text-sm font-bold text-slate-800 leading-relaxed">
                            {currentData.words[selectedWord].irabIndo}
                          </p>
                        </div>
                        {/* Penjelasan - RATA KIRI */}
                        <div className="bg-white p-3 rounded-xl border border-orange-100 text-left">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider mb-1">Penjelasan</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {currentData.words[selectedWord].irabExplanation}
                          </p>
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                        <div className="p-2 rounded-lg bg-white text-orange-600 shadow-sm"><Type className="w-4 h-4" /></div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-1">Akar (Shorof)</p>
                          <p className="text-xs sm:text-sm font-bold text-orange-900">{currentData.words[selectedWord].shorof}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                        <div className="p-2 rounded-lg bg-white text-amber-600 shadow-sm"><BookOpen className="w-4 h-4" /></div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-amber-400 uppercase tracking-tighter mb-1">Makna Indo</p>
                          <p className="text-xs sm:text-sm font-bold text-amber-900">{currentData.words[selectedWord].meaning}</p>
                        </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
            </Card>

            {/* Tombol ke Kuis - Halaman Terpisah */}
            <Button
              asChild
              className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold gap-2 py-6 h-14 text-lg"
            >
              <Link href={`/irab/${surahId}/${ayat}/quiz`}>
                <GraduationCap className="w-5 h-5" />
                Uji Pemahaman I'rab
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
