'use client';

import { useState } from 'react';
import { 
  Trophy, 
  Map as MapIcon, 
  ChevronRight, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Star,
  Gamepad2,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useUser } from '@/db';
import { useCollection } from '@/db';

export default function MatanDashboard() {
  const { user } = useUser();
  const { data: matans, isLoading: isMatansLoading } = useCollection("matans");
  const { data: progress } = useCollection("matan_user_progress", { 
    where: user ? ["user_id", "==", user.id] : undefined 
  });

  const totalXp = progress?.reduce((acc, p) => acc + (p.points_awarded || 0), 0) || 0;
  const currentRank = totalXp > 5000 ? 'Ustadz Nahwu' : totalXp > 1000 ? 'An-Nahwi' : 'Thalibul Ilmi';

  if (isMatansLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Sparkles className="w-12 h-12 text-[#800000] animate-pulse" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Mempersiapkan Wilayah...</p>
      </div>
    );
  }

  const displayMatans = matans?.length ? matans : [
    {
      id: 'ajurumiyah',
      title: 'Al-Ajurumiyah',
      author: 'Ibnu Ajurrum',
      level: 'Mubtadi\'',
      category: 'Nahwu',
      total_chapters: 26,
      color: 'maroon',
      slug: 'ajurumiyah',
      description: 'Gerbang utama mempelajari ilmu Nahwu Dasar.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 space-y-12 pb-32">
      {/* Header Stat & Rank */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#800000] font-black uppercase tracking-widest text-[10px]">
            <Gamepad2 className="w-4 h-4" />
            Nahwu Quest Mode
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tighter text-slate-900 italic">Kerajaan Ilmu</h1>
          <p className="text-slate-500 font-medium">Pilih wilayah matan yang ingin Anda taklukkan.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#800000] flex items-center justify-center text-white shadow-lg shadow-[#800000]/20">
            <Trophy className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-none mb-1">Peringkat</span>
             <span className="text-xl font-black text-slate-900 leading-none">{currentRank}</span>
             <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-[#D4AF37]" style={{ width: `${Math.min((totalXp / 1000) * 100, 100)}%` }} />
                </div>
                <span className="text-[9px] font-bold text-[#800000]">{totalXp} XP</span>
             </div>
          </div>
        </div>
      </div>

      {/* World Map Section */}
      <div className="relative space-y-6">
        <div className="flex items-center gap-2 px-1">
          <MapIcon className="w-4 h-4 text-[#800000]" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 font-sans">Daftar Wilayah</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayMatans.map((matan: any) => {
            const isUnlocked = matan.is_active || matan.slug === 'ajurumiyah'; // For now unlock ajurumiyah by default
            return (
              <div key={matan.id} className="relative group">
                <Link 
                  href={isUnlocked ? `/matan/${matan.slug}` : '#'} 
                  className={cn(
                    "block relative h-full overflow-hidden rounded-[2.5rem] border transition-all duration-500 bg-white",
                    isUnlocked 
                      ? "border-slate-200 hover:border-[#800000]/30 hover:shadow-2xl hover:shadow-[#800000]/5 active:scale-95" 
                      : "border-slate-100 opacity-60 grayscale cursor-not-allowed"
                  )}
                >
                  <div className="p-8 flex flex-col h-full space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <Badge className={cn(
                        "font-black text-[9px] uppercase tracking-widest rounded-lg px-2.5 py-1 shadow-sm",
                        isUnlocked ? "bg-[#800000] text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        {matan.level}
                      </Badge>
                      {!isUnlocked && <Lock className="w-4 h-4 text-slate-300" />}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#800000] transition-colors uppercase tracking-tight">{matan.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Karya: {matan.author}</p>
                    </div>

                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      {matan.description}
                    </p>

                    <div className="pt-4 mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{matan.total_chapters || 0} Bab</span>
                      </div>
                      {isUnlocked && (
                         <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#800000] group-hover:bg-[#800000] group-hover:text-white group-hover:border-[#800000] transition-all shadow-sm">
                            <ChevronRight className="w-5 h-5" />
                         </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Challenge Card - Branding version */}
      <div className="relative overflow-hidden rounded-[3rem] p-1 bg-gradient-to-br from-[#800000] to-[#4D0000] shadow-xl shadow-[#800000]/10">
        <div className="relative bg-white rounded-[2.9rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 group overflow-hidden">
           <div className="relative z-10 space-y-5 max-w-lg text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-[#800000]/5 text-[#800000] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#800000]/10">
                 <Star className="w-3 h-3 fill-current text-[#D4AF37]" />
                 Misi Harian: Tantangan I'rab
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Taklukkan 5 Bait Hari Ini</h2>
              <p className="text-slate-500 font-medium border-l-4 border-[#800000]/20 pl-4 py-1">
                Selesaikan Bab Marfu'atul Asma dalam waktu kurang dari 5 menit untuk mendapatkan bonus <span className="text-[#800000] font-black">2x XP!</span>
              </p>
              <Button className="h-14 px-10 rounded-2xl bg-[#800000] hover:bg-[#660000] hover:scale-105 transition-all text-white font-black uppercase tracking-widest shadow-xl shadow-[#800000]/20 border-none group">
                 Mulai Misi
                 <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
           </div>

           <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#800000]/5 blur-[60px]" />
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-dashed border-[#D4AF37]/20 animate-[spin_20s_linear_infinite] flex items-center justify-center">
                 <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#D4AF37]/10" />
              </div>
              <Trophy className="absolute w-16 h-16 md:w-24 md:h-24 text-[#800000] drop-shadow-xl" />
           </div>
           
           {/* Background decorative text */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] font-black text-slate-50/80 pointer-events-none select-none uppercase">
             QUEST
           </div>
        </div>
      </div>
    </div>
  );
}
