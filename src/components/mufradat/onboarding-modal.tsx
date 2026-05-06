"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  BookOpen, 
  Trophy, 
  MousePointer2, 
  HelpCircle,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  salutation?: string;
}

const getSlides = (salutation: string) => [
  {
    title: "Ahlan wa Sahlan!",
    description: `Selamat ${salutation}! Sekarang ${salutation} resmi menjadi bagian dari komunitas Hi Mufradat. Yuk, pahami alur belajarnya agar hafalan ${salutation} Itqan!`,
    icon: <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white"><CheckCircle2 className="w-10 h-10" /></div>,
    color: "bg-slate-50",
    accent: "bg-slate-900"
  },
  {
    title: "Belajar 'Tap-Tap'",
    description: `Sebelum kuis, gunakan fitur 'Belajar Dulu'. Ketuk kata Arab di Mushaf untuk lihat arti, dan ketuk daftar di bawah untuk mencatat repetisi (berapa kali ${salutation} sudah melafalkannya).`,
    icon: <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white"><MousePointer2 className="w-10 h-10" /></div>,
    color: "bg-white",
    accent: "bg-slate-800"
  },
  {
    title: "4 Jenis Kuis",
    description: `${salutation} akan ditantang dengan: Pilihan Ganda, Susun Kata (menyusun arti), Tebak Arab (pilih kata Arab dari artinya), dan Mode Tricky (menjebak).`,
    icon: <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white"><HelpCircle className="w-10 h-10" /></div>,
    color: "bg-slate-50",
    accent: "bg-slate-900"
  },
  {
    title: "Tab Ayat & Halaman",
    description: "Tab Ayat untuk detail mendalam. Tab Halaman untuk target pekanan. Selesaikan kuis halaman dengan skor 100% untuk membuka halaman berikutnya!",
    icon: <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white"><BookOpen className="w-10 h-10" /></div>,
    color: "bg-white",
    accent: "bg-slate-800"
  },
  {
    title: "Papan Juara & Mabar",
    description: `Pantau posisi ${salutation} di Grup (Papan Juara). Jangan lewatkan Mabar (Main Bareng) kompetisi live real-time dengan poin ganda!`,
    icon: <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white"><Trophy className="w-10 h-10" /></div>,
    color: "bg-slate-50",
    accent: "bg-slate-900"
  },
  {
    title: "Tips & Komitmen",
    description: "Gunakan titik merah untuk review kata yang salah. Bersedia dipantau Musyrifah di grup WA untuk reminder target.",
    icon: <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white"><Lightbulb className="w-10 h-10" /></div>,
    color: "bg-white",
    accent: "bg-slate-800"
  }
];

export function MufradatOnboarding({ open, onComplete, salutation = "Ukhti" }: OnboardingModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const slides = getSlides(salutation);

  const scrollPrev = () => setSelectedIndex(prev => Math.max(prev - 1, 0));
  const scrollNext = () => setSelectedIndex(prev => Math.min(prev + 1, slides.length - 1));

  const isLastStep = selectedIndex === slides.length - 1;

  const handleComplete = () => {
    setSelectedIndex(0); // Reset for next time if needed
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleComplete()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Panduan Hi Mufradat</DialogTitle>
          <DialogDescription>Tutorial singkat untuk memahami alur belajar di platform Hi Mufradat agar hafalan Ukhti lebih maksimal.</DialogDescription>
        </DialogHeader>
        <div className={cn("transition-colors duration-500 p-8 pt-12 text-center relative", slides[selectedIndex].color)}>
          <button 
            onClick={handleComplete}
            className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
          {/* Progress Bar */}
          <div className="absolute top-4 left-0 w-full px-8">
            <Progress value={((selectedIndex + 1) / slides.length) * 100} className="h-1 bg-white/50" />
          </div>

          <div key={selectedIndex} className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
            {slides[selectedIndex].icon}
            <div className="space-y-3">
              <h2 className="text-2xl font-black font-headline uppercase tracking-tighter text-slate-900 leading-none">
                {slides[selectedIndex].title}
              </h2>
              <p className="text-slate-600 text-sm font-medium leading-relaxed px-4">
                {slides[selectedIndex].description}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 space-y-6">
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selectedIndex ? "w-8 bg-slate-900" : "w-1.5 bg-slate-200"
                )}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {selectedIndex > 0 ? (
              <Button 
                variant="outline" 
                onClick={scrollPrev} 
                className="h-14 rounded-2xl border-2 px-6 font-bold"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                DULU
              </Button>
            ) : null}
            
            <Button 
              onClick={isLastStep ? handleComplete : scrollNext} 
              className={cn(
                "flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg text-white",
                isLastStep ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
              )}
            >
              {isLastStep ? "SAYA PAHAM & MULAI" : "LANJUT"}
              {!isLastStep && <ChevronRight className="w-5 h-5 ml-2" />}
            </Button>

            {!isLastStep && (
              <Button 
                variant="ghost" 
                onClick={handleComplete}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px]"
              >
                LEWATI
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
