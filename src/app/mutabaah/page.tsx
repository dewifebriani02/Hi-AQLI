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
  Star,
  Sun,
  Moon,
  Droplets,
  Shield,
  Activity,
  Book,
  MessageSquare,
  RotateCcw,
  Home,
  CheckSquare,
  ChevronLeft,
  Clock,
  BookOpen,
  Zap,
  ArrowRight,
} from 'lucide-react';
import Link from "next/link";
import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function MutabaahPage() {
  const { user } = useUser();
  const router = useRouter();

  const mutabaahActivities = useMemo(() => [
    { id: 'bangun', label: 'Bangun Tidur', category: 'Malam & Bangun', dalil: 'HR. Bukhari: Mengidupkan hati setelah mati', icon: 'Sun' },
    { id: 'siwak', label: 'Bersiwak', category: 'Malam & Bangun', dalil: 'HR. Bukhari: Siwak membersihkan mulut & diridhai Allah', icon: 'Sparkles' },
    { id: 'tahajjud', label: 'Tahajjud', category: 'Malam & Bangun', dalil: 'HR. Muslim: Shalat malam paling utama setelah fardhu', icon: 'Moon' },
    { id: 'qabliyah_subuh', label: 'Qabliyah Subuh', category: 'Subuh', dalil: 'HR. Muslim: Lebih baik dari dunia & isinya', icon: 'Sun' },
    { id: 'subuh', label: 'Shalat Subuh', category: 'Subuh', dalil: 'HR. Muslim: Dalam jaminan Allah', icon: 'Home' },
    { id: 'dzikir_pagi', label: 'Dzikir Pagi', category: 'Subuh', dalil: 'QS. Al-Ahzab: 42', icon: 'Sun' },
    { id: 'dhuha', label: 'Shalat Dhuha', category: 'Pagi & Dhuha', dalil: 'HR. Muslim: Sedekah 360 persendian', icon: 'Sun' },
    { id: 'kajian', label: 'Ilmu Syar\'i', category: 'Pagi & Dhuha', dalil: 'HR. Muslim: Memudahkan jalan ke surga', icon: 'BookOpen' },
    { id: 'qabliyah_zhuhur', label: 'Qabliyah Zhuhur', category: 'Zhuhur & Ashar', dalil: 'HR. Tirmidzi: Diharamkan neraka', icon: 'Clock' },
    { id: 'zhuhur', label: 'Shalat Zhuhur', category: 'Zhuhur & Ashar', dalil: 'HR. Bukhari: Amalan paling dicintai', icon: 'Sun' },
    { id: 'badiyah_zhuhur', label: 'Ba\'diyah Zhuhur', category: 'Zhuhur & Ashar', dalil: 'HR. Muslim: 12 rakaat surga', icon: 'Clock' },
    { id: 'qabliyah_ashar', label: 'Qabliyah Ashar', category: 'Zhuhur & Ashar', dalil: 'HR. Abu Dawud: Rahmat Allah', icon: 'Clock' },
    { id: 'ashar', label: 'Shalat Ashar', category: 'Zhuhur & Ashar', dalil: 'HR. Bukhari: Tidak terhapus amal', icon: 'Sun' },
    { id: 'dzikir_petang', label: 'Dzikir Petang', category: 'Zhuhur & Ashar', dalil: 'QS. Al-Furqan: 58', icon: 'Moon' },
    { id: 'maghrib', label: 'Shalat Maghrib', category: 'Maghrib & Isya', dalil: 'HR. Bukhari', icon: 'Moon' },
    { id: 'badiyah_maghrib', label: 'Ba\'diyah Maghrib', category: 'Maghrib & Isya', dalil: 'HR. Muslim', icon: 'Clock' },
    { id: 'isya', label: 'Shalat Isya', category: 'Maghrib & Isya', dalil: 'HR. Muslim: Pahala setengah malam', icon: 'Moon' },
    { id: 'badiyah_isya', label: 'Ba\'diyah Isya', category: 'Maghrib & Isya', dalil: 'HR. Muslim', icon: 'Clock' },
    { id: 'witir', label: 'Shalat Witir', category: 'Sebelum Tidur', dalil: 'HR. Bukhari: Allah menyukai ganjil', icon: 'Star' },
    { id: 'wudhu_tidur', label: 'Wudhu Tidur', category: 'Sebelum Tidur', dalil: 'HR. Thabrani: Disertai malaikat', icon: 'Droplets' },
    { id: 'al_mulk', label: 'Surat Al-Mulk', category: 'Sebelum Tidur', dalil: 'HR. Tirmidzi: Syafaat ampunan', icon: 'Book' },
    { id: 'ayat_kursi', label: 'Ayat Kursi', category: 'Sebelum Tidur', dalil: 'HR. Bukhari: Penjagaan dari setan hingga pagi', icon: 'Shield' },
    { id: 'doa_tidur', label: 'Doa Mau Tidur', category: 'Sebelum Tidur', dalil: 'HR. Bukhari', icon: 'Moon' },
    { id: 'evaluasi', label: 'Evaluasi Diri (Muhasabah)', category: 'Sebelum Tidur', dalil: 'Klik tombol di bawah untuk detail', icon: 'Activity' },
    { id: 'quran', label: 'Al-Qur\'an', category: 'Umum', dalil: 'HR. Tirmidzi: 1 Huruf = 10 Kebaikan', icon: 'Book' },
    { id: 'doa_harian', label: 'Doa Harian', category: 'Umum', dalil: 'HR. Abu Dawud', icon: 'MessageSquare' },
    { id: 'tasbih_100', label: 'Subhanallah 100x', category: 'Umum', dalil: 'HR. Muslim: 1000 Pahala', icon: 'Zap' },
    { id: 'istighfar', label: 'Istighfar (70-100x)', category: 'Umum', dalil: 'HR. Bukhari: Rasulullah >70x', icon: 'RotateCcw' },
  ], []);

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: mutabaahLogs, refresh: reloadMutabaah } = useCollection("mutabaah_logs", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '==', value: todayStr }
    ]
  });

  const toggleMutabaah = async (activityId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
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

  const progressCount = mutabaahLogs?.filter(l => l.completed).length || 0;
  const progressPercent = Math.round((progressCount / mutabaahActivities.length) * 100);

  const IconMap: Record<string, any> = {
    Sun, Moon, BookOpen, Clock, Star, Droplets, Shield, Activity, Book, MessageSquare, RotateCcw, Sparkles, Home, CheckSquare, Zap
  };

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000]">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-black text-[#800000] leading-none uppercase">Hi Mutaba'ah</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Tracker Sunnah Harian</p>
          </div>
        </div>
        <Badge className="bg-[#800000] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
          {progressPercent}% PROGRES
        </Badge>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Progress Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#D4AF37]">
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Target Hari Ini</p>
                <h2 className="text-3xl font-black text-black leading-none">{progressCount} <span className="text-sm font-bold text-muted-foreground">/ {mutabaahActivities.length} Amalan</span></h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#800000]">{progressPercent}%</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Tuntas</p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-3 bg-amber-50 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#800000] [&>div]:to-[#D4AF37]" />
          </CardContent>
        </Card>

        {/* Checklist Groups */}
        <div className="space-y-4">
          {Array.from(new Set(mutabaahActivities.map(a => a.category))).map(category => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-[11px] font-black text-[#800000] uppercase tracking-[0.2em]">{category}</h3>
                <div className="h-[1px] flex-1 bg-orange-100" />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {mutabaahActivities.filter(a => a.category === category).map(activity => {
                  const isDone = mutabaahLogs?.find(l => l.activity_id === activity.id)?.completed;
                  const IconComponent = IconMap[activity.icon] || Sparkles;

                  return (
                    <Card 
                      key={activity.id}
                      className={cn(
                        "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98]",
                        isDone ? "bg-amber-50/50" : "bg-white hover:bg-white/80"
                      )}
                      onClick={() => toggleMutabaah(activity.id)}
                    >
                      <CardContent className="p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isDone ? "bg-amber-100 text-[#D4AF37] shadow-inner scale-110" : "bg-orange-50/50 text-orange-400"
                          )}>
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 fill-current" />
                            ) : (
                              <IconComponent className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className={cn("text-xs font-bold transition-all", isDone ? "text-muted-foreground line-through" : "text-black")}>
                              {activity.label}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-medium uppercase mt-0.5 line-clamp-1">
                              {activity.dalil}
                            </p>
                          </div>
                        </div>

                        {activity.id === 'evaluasi' && (
                          <Button asChild size="sm" variant="ghost" className="text-amber-600 hover:text-amber-700 font-black gap-1 text-[10px]">
                            <Link href="/muhasabah">DETAIL <ArrowRight className="w-3 h-3" /></Link>
                          </Button>
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
