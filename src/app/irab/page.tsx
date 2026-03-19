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
  ChevronRight,
  Info,
  Type,
  Layers,
  ChevronDown,
} from 'lucide-react';
import Link from "next/link";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const JUZ_30_DATA: Record<string, any> = {
  "1:1": {
    surah: "Al-Fatihah",
    ayat: 1,
    translation: "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.",
    words: [
      { word: "بِـ", trans: "Bi", meaning: "Dengan", irab: "Harf Jar", shorof: "-", function: "Jar", color: "bg-blue-50 text-blue-700 border-blue-100" },
      { word: "اسْمِ", trans: "Ismi", meaning: "Nama", irab: "Ism Majrur bi Harf al-Jar, wa huwa Mudhaf", shorof: "Root: s-m-w (س م و)", function: "Majrur / Mudhaf", color: "bg-amber-50 text-amber-700 border-amber-100" },
      { word: "اللَّهِ", trans: "Allāh", meaning: "Allah", irab: "Lafdzul Jalaalah, Mudhaf Ilaih, Majrur", shorof: "Lafdzul Jalaalah", function: "Mudhaf Ilaih", color: "bg-red-50 text-red-700 border-red-100" },
      { word: "الرَّحْمَٰنِ", trans: "Ar-Raḥmān", meaning: "Maha Pengasih", irab: "Na'at (Sifat) lil Jalaalah, Majrur", shorof: "Root: r-h-m (ر ح م)", function: "Na'at", color: "bg-green-50 text-green-700 border-green-100" },
      { word: "الرَّحِيمِ", trans: "Ar-Raḥīm", meaning: "Maha Penyayang", irab: "Na'at thaanin (Sifat kedua), Majrur", shorof: "Root: r-h-m (ر ح م)", function: "Na'at", color: "bg-green-50 text-green-700 border-green-100" }
    ]
  },
  "114:1": {
    surah: "An-Nas",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan manusia,'",
    words: [
      { word: "قُلْ", trans: "Qul", meaning: "Katakanlah", irab: "Fi'il Amr (Kata kerja perintah), mabni 'ala sukun", shorof: "Root: q-w-l (ق و ل)", function: "Fi'il Amr", color: "bg-purple-50 text-purple-700 border-purple-100" },
      { word: "أَعُوذُ", trans: "A'ūdhu", meaning: "Aku berlindung", irab: "Fi'il Mudhari' (Sedang/akan), Marfu' bid-dhammah", shorof: "Root: 'awd (ع و ذ)", function: "Fi'il Mudhari'", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
      { word: "بِـ", trans: "Bi", meaning: "Kepada / Dengan", irab: "Harf Jar", shorof: "-", function: "Jar", color: "bg-blue-50 text-blue-700 border-blue-100" },
      { word: "رَبِّ", trans: "Rabbi", meaning: "Tuhan", irab: "Ism Majrur, wa huwa Mudhaf", shorof: "Root: r-b-b (ر ب ب)", function: "Majrur / Mudhaf", color: "bg-amber-50 text-amber-700 border-amber-100" },
      { word: "النَّاسِ", trans: "An-Nās", meaning: "Manusia", irab: "Mudhaf Ilaih, Majrur bil-kasrah", shorof: "Root: n-w-s (ن و س)", function: "Mudhaf Ilaih", color: "bg-red-50 text-red-700 border-red-100" }
    ]
  },
  "113:1": {
    surah: "Al-Falaq",
    ayat: 1,
    translation: "Katakanlah (Muhammad), 'Aku berlindung kepada Tuhan yang menguasai subuh (fajar),'",
    words: [
      { word: "قُلْ", trans: "Qul", meaning: "Katakanlah", irab: "Fi'il Amr", shorof: "Root: q-w-l", function: "Fi'il Amr", color: "bg-purple-50 text-purple-700 border-purple-100" },
      { word: "أَعُوذُ", trans: "A'ūdhu", meaning: "Aku berlindung", irab: "Fi'il Mudhari'", shorof: "Root: 'awd", function: "Fi'il Mudhari'", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
      { word: "بِـ", trans: "Bi", meaning: "Kepada", irab: "Harf Jar", shorof: "-", function: "Jar", color: "bg-blue-50 text-blue-700 border-blue-100" },
      { word: "رَبِّ", trans: "Rabbi", meaning: "Tuhan", irab: "Ism Majrur, wa huwa Mudhaf", shorof: "Root: r-b-b", function: "Majrur / Mudhaf", color: "bg-amber-50 text-amber-700 border-amber-100" },
      { word: "الْفَلَقِ", trans: "Al-Falaq", meaning: "Waktu Subuh", irab: "Mudhaf Ilaih, Majrur", shorof: "Root: f-l-q (ف ل ق)", function: "Mudhaf Ilaih", color: "bg-emerald-50 text-emerald-700 border-emerald-100" }
    ]
  }
};

export default function IrabPage() {
  const [currentAyatKey, setCurrentAyatKey] = useState("1:1");
  const [selectedWord, setSelectedWord] = useState<number | null>(0);

  const currentData = useMemo(() => JUZ_30_DATA[currentAyatKey], [currentAyatKey]);

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
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Juz 30 • Bedah Nahwu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px] font-black uppercase bg-amber-50">
             {currentData.surah}: {currentData.ayat}
           </Badge>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Ayat Selector Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {Object.keys(JUZ_30_DATA).map(key => (
            <Button 
              key={key}
              onClick={() => {
                setCurrentAyatKey(key);
                setSelectedWord(0);
              }}
              variant={currentAyatKey === key ? "default" : "outline"}
              className={cn(
                "rounded-full px-4 h-8 text-[10px] font-black uppercase flex-shrink-0 transition-all",
                currentAyatKey === key ? "bg-[#800000] text-white border-none" : "border-orange-200 text-[#800000] bg-white"
              )}
            >
              {JUZ_30_DATA[key].surah} {JUZ_30_DATA[key].ayat}
            </Button>
          ))}
          <Button variant="ghost" className="rounded-full px-4 h-8 text-[10px] font-black uppercase flex-shrink-0 text-slate-400">
            LIHAT SEMUA <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Ayat Display Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#800000] rounded-3xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex flex-row-reverse flex-wrap justify-center gap-x-4 gap-y-6">
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
                    "text-4xl font-arabic leading-relaxed transition-colors",
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
               <CardContent className="p-6">
                 <div className="flex justify-between items-start mb-6">
                   <div>
                     <h4 className="text-4xl font-arabic text-black mb-1">{currentData.words[selectedWord].word}</h4>
                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{currentData.words[selectedWord].trans}</p>
                   </div>
                   <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg", currentData.words[selectedWord].color)}>
                     {currentData.words[selectedWord].function}
                   </Badge>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                   <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="p-2.5 rounded-xl bg-white text-[#800000] shadow-sm"><Layers className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <Info className="w-3 h-3" /> Kedudukan (I'rab)
                        </p>
                        <p className="text-base font-bold text-slate-800 leading-relaxed">
                          {currentData.words[selectedWord].irab}
                        </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                        <div className="p-2 rounded-lg bg-white text-orange-600 shadow-sm"><Type className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mb-1">Akar (Shorof)</p>
                          <p className="text-sm font-bold text-orange-900">{currentData.words[selectedWord].shorof}</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                        <div className="p-2 rounded-lg bg-white text-amber-600 shadow-sm"><BookOpen className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[9px] font-black text-amber-400 uppercase tracking-tighter mb-1">Makna Indo</p>
                          <p className="text-sm font-bold text-amber-900">{currentData.words[selectedWord].meaning}</p>
                        </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        )}

        <div className="pt-10 flex flex-col items-center justify-center text-center">
           <div className="p-4 rounded-2xl bg-white shadow-sm border border-orange-100">
             <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Al-Juz al-Thalathun</p>
             <p className="text-[9px] text-muted-foreground font-bold italic mt-1">Data I'rab Juz 30 sedang diperbarui berkala.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
