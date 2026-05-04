"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  BookOpen, 
  Trophy, 
  Zap, 
  MessageCircle, 
  HelpCircle,
  Lightbulb,
  MousePointer2,
  ChevronRight,
  ChevronLeft,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const slides = [
  {
    title: "Ahlan wa Sahlan!",
    description: "Selamat Ukhti! Sekarang Ukhti resmi menjadi bagian dari komunitas Hi Mufradat. Yuk, pahami alur belajarnya agar hafalan Ukhti Itqan!",
    icon: <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-10 h-10" /></div>,
    color: "bg-emerald-50",
    accent: "bg-emerald-500"
  },
  {
    title: "Belajar 'Tap-Tap'",
    description: "Sebelum kuis, gunakan fitur 'Belajar Dulu'. Ketuk kata Arab di Mushaf untuk lihat arti, dan ketuk daftar di bawah untuk mencatat repetisi (berapa kali Ukhti sudah melafalkannya).",
    icon: <div className="w-16 h-16 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000]"><MousePointer2 className="w-10 h-10" /></div>,
    color: "bg-rose-50",
    accent: "bg-rose-600"
  },
  {
    title: "4 Jenis Kuis",
    description: "Ukhti akan ditantang dengan: Pilihan Ganda, Susun Kata (menyusun arti), Tebak Arab (pilih kata Arab dari artinya), dan Mode Tricky (menjebak).",
    icon: <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><HelpCircle className="w-10 h-10" /></div>,
    color: "bg-blue-50",
    accent: "bg-blue-500"
  },
  {
    title: "Tab Ayat & Halaman",
    description: "Tab Ayat untuk detail mendalam. Tab Halaman untuk target pekanan. Selesaikan kuis halaman dengan skor 100% untuk membuka halaman berikutnya!",
    icon: <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><BookOpen className="w-10 h-10" /></div>,
    color: "bg-amber-50",
    accent: "bg-amber-500"
  },
  {
    title: "Papan Juara & Mabar",
    description: "Pantau posisi Ukhti di Grup (Papan Juara). Jangan lewatkan Mabar (Main Bareng) kompetisi live real-time dengan poin ganda!",
    icon: <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600"><Trophy className="w-10 h-10" /></div>,
    color: "bg-cyan-50",
    accent: "bg-cyan-500"
  },
  {
    title: "Tips & Komitmen",
    description: "Gunakan titik merah untuk review kata yang salah. Bersedia dipantau Musyrifah di grup WA untuk reminder target.",
    icon: <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Lightbulb className="w-10 h-10" /></div>,
    color: "bg-orange-50",
    accent: "bg-orange-500"
  }
];

export function MufradatOnboarding({ open, onComplete }: OnboardingModalProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  const isLastStep = selectedIndex === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onComplete()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Panduan Hi Mufradat</DialogTitle>
          <DialogDescription>Tutorial singkat untuk memahami alur belajar di platform Hi Mufradat agar hafalan Ukhti lebih maksimal.</DialogDescription>
        </DialogHeader>
        <div className={cn("transition-colors duration-500 p-8 pt-12 text-center relative", slides[selectedIndex].color)}>
          <button 
            onClick={onComplete}
            className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
          {/* Progress Bar */}
          <div className="absolute top-4 left-0 w-full px-8">
            <Progress value={((selectedIndex + 1) / slides.length) * 100} className="h-1 bg-white/50" />
          </div>

          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
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
              onClick={isLastStep ? onComplete : scrollNext} 
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
                onClick={onComplete}
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
