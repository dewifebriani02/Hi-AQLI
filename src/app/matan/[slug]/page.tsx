'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Lock, 
  CheckCircle2, 
  Play, 
  Trophy,
  Gamepad2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useUser, useCollection } from '@/db';

export default function MatanQuestMap() {
  const params = useParams();
  const { user } = useUser();
  const slug = params.slug as string;

  const matanOptions = useMemo(() => ({
    filters: [{ column: 'slug', operator: '==', value: slug }],
    limit: 1,
  }), [slug]);

  const { data: currentMatans, isLoading: isMatanLoading } = useCollection("matans", matanOptions);
  const currentMatan = currentMatans?.[0];

  const chapterOptions = useMemo(() => ({
    filters: [{ column: 'matan_id', operator: '==', value: currentMatan?.id }],
    orderBy: { column: 'chapter_number', ascending: true },
  }), [currentMatan?.id]);

  const { data: chapters, isLoading: isChaptersLoading } = useCollection(
    currentMatan?.id ? "matan_chapters" : null,
    chapterOptions
  );

  const progressOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
  }), [user?.id]);

  const { data: progress } = useCollection(user ? "matan_user_progress" : null, progressOptions);

  const matanTitle = currentMatan?.title || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Matan');
  const completedCount = chapters?.filter(c => 
    progress?.some(p => (p.memorized || p.status_paham) && (p.chapter_id === c.id || p.item_id === c.id))
  ).length || 0;

  if (isMatanLoading || (currentMatan?.id && isChaptersLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Sparkles className="w-12 h-12 text-[#800000] animate-pulse" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Membaca Gulungan...</p>
      </div>
    );
  }

  // Fallback map if chapters are empty (initial seed)
  const displayChapters = chapters?.length ? chapters : [
    { id: 'initial', title: 'Bab Al-Kalam', description: 'Definisi Kalimat & Syarat Kalam dalam Ilmu Nahwu', chapter_number: 1 }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 pb-32 selection:bg-[#800000]/10">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="rounded-2xl hover:bg-[#800000]/5 text-[#800000]">
                 <Link href="/matan"><ChevronLeft className="w-6 h-6" /></Link>
              </Button>
              <div className="flex flex-col">
                 <div className="flex items-center gap-2 text-[#800000] font-black uppercase tracking-widest text-[10px]">
                    <Gamepad2 className="w-4 h-4" />
                    Peta Quest Kitab
                 </div>
                 <h1 className="text-4xl font-black font-headline tracking-tighter text-slate-900 uppercase">
                    {matanTitle}
                 </h1>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xl">
           <div className="w-12 h-12 rounded-2xl bg-[#800000] flex items-center justify-center text-white shadow-lg shadow-[#800000]/20">
              <Trophy className="w-6 h-6 text-[#D4AF37]" />
           </div>
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-none mb-1">Capaian</span>
              <span className="text-xl font-black text-slate-900 leading-none italic">{completedCount} / {currentMatan?.total_chapters || 26} BAB</span>
           </div>
        </div>
      </div>

      {/* Quest Timeline (Mufradat Style) */}
      <div className="relative space-y-12">
        {/* Timeline Line */}
        <div className="absolute left-[39px] md:left-1/2 md:-translate-x-1/2 top-4 bottom-4 w-1 bg-slate-100 rounded-full" />

        {displayChapters.map((chapter: any, idx) => {
          const isEven = idx % 2 === 0;
          const isCompleted = progress?.some(
            p => (p.memorized || p.status_paham) && (p.chapter_id === chapter.id || p.item_id === chapter.id)
          );
          const isUnlocked = idx === 0 || (progress?.length ?? 0) > 0;
          
          return (
            <div key={chapter.id} className={cn(
              "relative flex items-center gap-8 md:gap-0",
              isEven ? "md:flex-row-reverse" : "md:flex-row"
            )}>
              {/* Content Side */}
              <div className="flex-1 hidden md:block" />

              {/* Icon Node */}
              <div className="relative z-10">
                <div className={cn(
                  "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-lg",
                  isCompleted 
                    ? "bg-white border-[#800000] text-[#800000] ring-4 ring-[#800000]/10" 
                    : isUnlocked 
                      ? "bg-white border-[#D4AF37] text-[#D4AF37] animate-pulse ring-4 ring-[#D4AF37]/10"
                      : "bg-slate-100 border-slate-200 text-slate-300"
                )}>
                   {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : isUnlocked ? <Play className="w-8 h-8 fill-current ml-1" /> : <Lock className="w-6 h-6" />}
                </div>
                
                {/* Connector for mobile */}
                <div className={cn(
                  "absolute top-full left-1/2 -translate-x-1/2 h-12 w-1 md:hidden",
                  idx === displayChapters.length - 1 ? "hidden" : "bg-slate-100"
                )} />
              </div>

              {/* Info Side */}
              <div className={cn(
                "flex-1 group",
                isEven ? "md:pr-12 md:text-right" : "md:pl-12 text-left"
              )}>
                <Link 
                  href={isUnlocked ? `/matan/${slug}/${chapter.id}` : '#'}
                  className={cn(
                    "inline-block transition-all",
                    isUnlocked ? "hover:-translate-y-1" : "cursor-not-allowed"
                  )}
                >
                   <Card className={cn(
                     "rounded-3xl border-2 transition-all p-6",
                     isUnlocked 
                      ? "border-slate-100 hover:border-[#800000]/20 hover:shadow-2xl bg-white" 
                      : "border-transparent bg-slate-50 opacity-40"
                   )}>
                      <div className="space-y-1">
                         <div className={cn(
                           "text-[9px] font-black uppercase tracking-widest",
                           isCompleted ? "text-emerald-600" : isUnlocked ? "text-[#800000]" : "text-slate-400"
                         )}>
                            Langkah {chapter.chapter_number || idx + 1} {isCompleted && '\u2022 Tuntas'}
                         </div>
                         <h3 className="text-xl font-black text-slate-900 group-hover:text-[#800000] transition-colors">{chapter.title}</h3>
                         <p className="text-xs font-bold text-slate-400 normal-case italic">{chapter.description}</p>
                      </div>
                      
                      {isUnlocked && (
                        <div className={cn(
                          "mt-4 flex items-center gap-2",
                          isEven ? "md:justify-end" : "justify-start"
                        )}>
                           <Badge variant="outline" className="border-[#D4AF37]/30 text-[#800000] text-[9px] font-black uppercase tracking-tighter bg-white shadow-sm">
                              {isCompleted ? 'ULANGI MISI' : 'MULAI TANTANGAN'}
                           </Badge>
                        </div>
                      )}
                   </Card>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Encouragement */}
      <div className="pt-20 text-center space-y-6">
         <div className="w-24 h-[2px] bg-[#800000]/10 mx-auto" />
         <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Petualangan Anda Terus Berlanjut</p>
         <Button asChild variant="ghost" className="rounded-2xl text-[#800000] font-black uppercase tracking-widest text-[11px] gap-2 hover:bg-[#800000]/5">
            <Link href="/matan">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Buka Wilayah Lainnya
            </Link>
         </Button>
      </div>
    </div>
  );
}
