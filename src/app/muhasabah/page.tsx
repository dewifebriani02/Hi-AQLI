'use client';

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, 
  CheckCircle2, 
  Shield,
  ChevronLeft,
  Heart,
  UserCheck,
  Info,
  CheckSquare,
} from 'lucide-react';
import Link from "next/link";
import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export default function MuhasabahPage() {
  const { user } = useUser();

  const muhasabahItems = useMemo(() => [
    { id: 'm_wanita_shalat', label: 'Menjaga Shalat 5 Waktu', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_wanita_puasa', label: 'Berpuasa di bulan Ramadhan', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_wanita_kehormatan', label: 'Menjaga Kehormatan (Kemaluan)', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_wanita_taat', label: 'Taat kepada Suami', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_dosa_syirik', label: 'Menjauhi Syirik (Percaya ramalan/zodiak, jimat, dukun)', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Dosa pembinasa' },
    { id: 'm_dosa_sihir', label: 'Menjauhi Sihir', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Dosa pembinasa' },
    { id: 'm_dosa_riba', label: 'Menjauhi Riba', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Dosa besar diperangi Allah' },
    { id: 'm_lisan_ghibah', label: 'Menjaga Lisan (Ghibah/Fitnah)', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'HR. Bukhari' },
    { id: 'm_lisan_suami', label: 'Menghindari Kufur Nikmat pada Suami', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'HR. Bukhari: Mengeluh/Mencela pemberian' },
    { id: 'm_akhlak_tabarruj', label: 'Menghindari Tabarruj', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Tidak berhias berlebihan di luar' },
    { id: 'm_akhlak_niyahah', label: 'Menghindari Niyahah', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Ridha takdir, tidak meratapi berlebihan' },
    { id: 'm_akhlak_sabar', label: 'Sabar & Syukur Hari Ini', sub: 'Kebaikan & Akhlak', dalil: 'Muhasabah Qolbu' },
    { id: 'm_akhlak_birrul', label: 'Birrul Walidain', sub: 'Kebaikan & Akhlak', dalil: 'Berbakti/Mendoakan Orang Tua' },
    { id: 'm_akhlak_infaq', label: 'Infaq/Sedekah Hari Ini', sub: 'Kebaikan & Akhlak', dalil: 'HR. Bukhari: Malaikat mendoakan' },
  ], []);

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: mutabaahLogs, refresh: reloadMutabaah } = useCollection("mutabaah_logs", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '==', value: todayStr }
    ]
  });

  const toggleMutabaah = async (activityId: string) => {
    if (!user) return;
    const existing = mutabaahLogs?.find(l => l.activity_id === activityId);
    const completed = !existing?.completed;

    const { error } = await supabase
      .from("mutabaah_logs")
      .upsert({
        user_id: user.id,
        activity_id: activityId,
        date: todayStr,
        completed
      }, { onConflict: 'user_id,activity_id,date' });

    if (!error) reloadMutabaah();
  };

  const progressCount = muhasabahItems.filter(m => mutabaahLogs?.find(l => l.activity_id === m.id)?.completed).length;
  const progressPercent = Math.round((progressCount / muhasabahItems.length) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000]">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-black text-[#800000] leading-none uppercase">Hi Muhasabah</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Evaluasi Diri Harian</p>
          </div>
        </div>
        <Badge className="bg-[#800000] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
          {progressPercent}% TUNTAS
        </Badge>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Progress Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#D4AF37]">
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Self Evaluation</p>
                <h2 className="text-3xl font-black text-black leading-none">{progressCount} <span className="text-sm font-bold text-muted-foreground">/ {muhasabahItems.length} Poin</span></h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#800000]">{progressPercent}%</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Hati & Akhlak</p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-3 bg-amber-50 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#800000] [&>div]:to-[#D4AF37]" />
          </CardContent>
        </Card>

        {/* Detailed Sections */}
        <div className="space-y-8">
          {Array.from(new Set(muhasabahItems.map(m => m.sub))).map(sub => (
            <div key={sub} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">{sub}</h3>
                <div className="h-[1px] flex-1 bg-orange-100" />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {muhasabahItems.filter(m => m.sub === sub).map(item => {
                  const isDone = mutabaahLogs?.find(l => l.activity_id === item.id)?.completed;

                  return (
                    <Card 
                      key={item.id}
                      className={cn(
                        "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98]",
                        isDone ? "bg-amber-50/50" : "bg-white hover:bg-white/80"
                      )}
                      onClick={() => toggleMutabaah(item.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isDone ? "bg-amber-100 text-[#D4AF37] shadow-inner scale-110" : "bg-orange-50/50 text-orange-200"
                          )}>
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 fill-current" />
                            ) : (
                               sub === '4 Syarat Wanita Surga' ? <Heart className="w-5 h-5" /> : <Shield className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className={cn("text-xs font-bold transition-all", isDone ? "text-muted-foreground line-through" : "text-black")}>
                              {item.label}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Info className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <p className="text-[9px] text-muted-foreground font-medium uppercase line-clamp-1">
                                {item.dalil}
                              </p>
                            </div>
                          </div>
                        </div>
                        {isDone && (
                          <div className="bg-[#D4AF37] p-1 rounded-full text-white">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
