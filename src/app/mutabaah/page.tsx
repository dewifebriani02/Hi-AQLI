'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Settings2,
  Trophy,
  Quote as QuoteIcon,
  Flame,
} from 'lucide-react';
import Link from "next/link";
import { useUser, supabase } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getRandomQuote } from "@/lib/mutabaah-quotes";
import { useToast } from "@/hooks/use-toast";

export default function MutabaahPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [quote, setQuote] = useState(() => getRandomQuote());
  const [localLogs, setLocalLogs] = useState<any[]>([]); // For guest persistence

  const mutabaahActivities = useMemo(() => [
    { id: 'bangun', label: 'Doa Bangun Tidur', category: 'Malam & Bangun', dalil: 'HR. Bukhari: Mengidupkan hati setelah mati', icon: 'Sun' },
    { id: 'siwak', label: 'Bersiwak', category: 'Malam & Bangun', dalil: 'HR. Bukhari: Siwak membersihkan mulut & diridhai Allah', icon: 'Sparkles' },
    { id: 'tahajjud', label: 'Shalat Tahajjud', category: 'Malam & Bangun', dalil: 'HR. Muslim: Shalat malam paling utama setelah fardhu', icon: 'Moon' },
    { id: 'qabliyah_subuh', label: 'Shalat Qabliyah Subuh', category: 'Subuh', dalil: 'HR. Muslim: Lebih baik dari dunia & isinya', icon: 'Sun' },
    { id: 'subuh', label: 'Shalat Subuh', category: 'Subuh', dalil: 'HR. Muslim: Dalam jaminan Allah', icon: 'Home' },
    { id: 'dzikir_pagi', label: 'Dzikir Pagi', category: 'Subuh', dalil: 'QS. Al-Ahzab: 42', icon: 'Sun' },
    { id: 'dhuha', label: 'Shalat Dhuha', category: 'Pagi & Dhuha', dalil: 'HR. Muslim: Sedekah 360 persendian', icon: 'Sun' },
    { id: 'kajian', label: 'Menuntut Ilmu Syar\'i', category: 'Pagi & Dhuha', dalil: 'HR. Muslim: Memudahkan jalan ke surga', icon: 'BookOpen' },
    { id: 'qabliyah_zhuhur', label: 'Shalat Qabliyah Zhuhur', category: 'Zhuhur & Ashar', dalil: 'HR. Tirmidzi: Diharamkan neraka', icon: 'Clock' },
    { id: 'zhuhur', label: 'Shalat Zhuhur', category: 'Zhuhur & Ashar', dalil: 'HR. Bukhari: Amalan paling dicintai', icon: 'Sun' },
    { id: 'badiyah_zhuhur', label: 'Shalat Ba\'diyah Zhuhur', category: 'Zhuhur & Ashar', dalil: 'HR. Muslim: 12 rakaat surga', icon: 'Clock' },
    { id: 'qabliyah_ashar', label: 'Shalat Qabliyah Ashar', category: 'Zhuhur & Ashar', dalil: 'HR. Abu Dawud: Rahmat Allah', icon: 'Clock' },
    { id: 'ashar', label: 'Shalat Ashar', category: 'Zhuhur & Ashar', dalil: 'HR. Bukhari: Tidak terhapus amal', icon: 'Sun' },
    { id: 'dzikir_petang', label: 'Dzikir Petang', category: 'Zhuhur & Ashar', dalil: 'QS. Al-Furqan: 58', icon: 'Moon' },
    { id: 'maghrib', label: 'Shalat Maghrib', category: 'Maghrib & Isya', dalil: 'HR. Bukhari', icon: 'Moon' },
    { id: 'badiyah_maghrib', label: 'Shalat Ba\'diyah Maghrib', category: 'Maghrib & Isya', dalil: 'HR. Muslim', icon: 'Clock' },
    { id: 'isya', label: 'Shalat Isya', category: 'Maghrib & Isya', dalil: 'HR. Muslim: Pahala setengah malam', icon: 'Moon' },
    { id: 'badiyah_isya', label: 'Shalat Ba\'diyah Isya', category: 'Maghrib & Isya', dalil: 'HR. Muslim', icon: 'Clock' },
    { id: 'witir', label: 'Shalat Witir', category: 'Sebelum Tidur', dalil: 'HR. Bukhari: Allah menyukai ganjil', icon: 'Star' },
    { id: 'wudhu_tidur', label: 'Wudhu Tidur', category: 'Sebelum Tidur', dalil: 'HR. Thabrani: Disertai malaikat', icon: 'Droplets' },
    { id: 'al_mulk', label: 'Membaca Surat Al-Mulk', category: 'Sebelum Tidur', dalil: 'HR. Tirmidzi: Syafaat ampunan', icon: 'Book' },
    { id: 'ayat_kursi', label: 'Membaca Ayat Kursi', category: 'Sebelum Tidur', dalil: 'HR. Bukhari: Penjagaan dari setan hingga pagi', icon: 'Shield' },
    { id: 'doa_tidur', label: 'Doa Mau Tidur', category: 'Sebelum Tidur', dalil: 'HR. Bukhari', icon: 'Moon' },
    { id: 'evaluasi', label: 'Evaluasi Diri (Muhasabah)', category: 'Sebelum Tidur', dalil: 'Klik tombol di bawah untuk detail', icon: 'Activity' },
    { id: 'quran', label: 'Tilawah Al-Qur\'an', category: 'Umum', dalil: 'HR. Tirmidzi: 1 Huruf = 10 Kebaikan', icon: 'Book' },
    { id: 'doa_harian', label: 'Membaca Doa Harian', category: 'Umum', dalil: 'HR. Abu Dawud', icon: 'MessageSquare' },
    { id: 'tasbih_100', label: 'Bertasbih 100x', category: 'Umum', dalil: 'HR. Muslim: 1000 Pahala', icon: 'Zap' },
    { id: 'istighfar', label: 'Beristighfar (70-100x)', category: 'Umum', dalil: 'HR. Bukhari: Rasulullah >70x', icon: 'RotateCcw' },
  ], []);

  const { data: userData, refresh: reloadUser } = useDoc("users", user?.id);

  useEffect(() => {
    if (userData) {
      const goals = userData.mutabaah_goals || [];
      setSelectedGoals(goals);
      if (goals.length === 0) {
        setIsSetupMode(true);
      }
    }
  }, [userData]);

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: mutabaahLogs, refresh: reloadMutabaah } = useCollection("mutabaah_logs", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '==', value: todayStr }
    ]
  });

  // Load guest logs from local storage
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem(`mutabaah_guest_logs_${todayStr}`);
      if (saved) setLocalLogs(JSON.parse(saved));
    }
  }, [user, todayStr]);

  const saveGoals = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("users")
      .update({ mutabaah_goals: selectedGoals })
      .eq('id', user.id);
    
    if (!error) {
      setIsSetupMode(false);
      reloadUser();
    }
  };

  const toggleMutabaah = async (activityId: string) => {
    if (!user) {
      // Guest local persistence
      const existing = localLogs.find((l: any) => l.activity_id === activityId);
      const newLogs = existing 
        ? localLogs.filter((l: any) => l.activity_id !== activityId)
        : [...localLogs, { activity_id: activityId, completed: true, date: todayStr }];
      
      setLocalLogs(newLogs);
      localStorage.setItem(`mutabaah_guest_logs_${todayStr}`, JSON.stringify(newLogs));
      
      toast({
        title: "Progres Disimpan (Lokal)",
        description: "Masyaallah! Login untuk dapatkan HI Poin & simpan permanen.",
      });
      return;
    }
    const existing = mutabaahLogs?.find((l: any) => l.activity_id === activityId);
    const completed = !existing?.completed;

    const { error } = await supabase
      .from("mutabaah_logs")
      .upsert({
        user_id: user.id,
        activity_id: activityId,
        date: todayStr,
        completed
      }, { onConflict: 'user_id,activity_id,date' });

    if (!error) {
      reloadMutabaah();
      // Update points if completed
      if (completed) {
        const currentPoints = userData?.points || 0;
        await supabase.from("users").update({ points: currentPoints + 5 }).eq('id', user.id);
        reloadUser();
      }
    }
  };

  const activeActivities = useMemo(() => {
    if (!user) return mutabaahActivities; // Spill all for guests
    return mutabaahActivities.filter(a => selectedGoals.includes(a.id));
  }, [user, mutabaahActivities, selectedGoals]);

  const progressCount = useMemo(() => {
    if (!user) return localLogs.length;
    // @ts-ignore
    return mutabaahLogs?.filter((l: any) => l.completed && selectedGoals.includes(l.activity_id)).length || 0;
  }, [user, mutabaahLogs, selectedGoals, localLogs]);

  const progressPercent = activeActivities.length > 0 ? Math.round((progressCount / activeActivities.length) * 100) : 0;

  const IconMap: Record<string, any> = {
    Sun, Moon, BookOpen, Clock, Star, Droplets, Shield, Activity, Book, MessageSquare, RotateCcw, Sparkles, Home, CheckSquare, Zap
  };

  if (isSetupMode && user) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        {/* Sticky Header for Setup Mode */}
        <div className="sticky top-0 z-[60] bg-white/95 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <Button variant="ghost" onClick={() => setIsSetupMode(false)} className="text-muted-foreground font-bold h-9">Batal</Button>
          <div className="text-center">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Pengaturan Target</h2>
            <p className="text-[9px] font-bold text-muted-foreground">{selectedGoals.length} Amalan Terpilih</p>
          </div>
          <Button 
            onClick={saveGoals} 
            disabled={selectedGoals.length === 0}
            className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-[10px] h-9 px-4 rounded-xl shadow-md"
          >
            SIMPAN
          </Button>
        </div>

        <div className="p-6 space-y-6 max-w-2xl mx-auto w-full pt-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-[#800000] uppercase italic">Pilih Targetmu</h1>
            <p className="text-sm font-bold text-muted-foreground">"Sedikit tapi konsisten lebih dicintai Allah daripada banyak tapi terputus."</p>
          </div>

          <div className="space-y-6 pb-32">
            {Array.from(new Set(mutabaahActivities.map(a => a.category))).map(category => (
              <div key={category} className="space-y-3">
                <h3 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">{category}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {mutabaahActivities.filter(a => a.category === category).map(activity => {
                    const isSelected = selectedGoals.includes(activity.id);
                    return (
                      <Card 
                        key={activity.id}
                        className={cn(
                          "border-2 transition-all cursor-pointer",
                          isSelected ? "border-[#800000] bg-[#800000]/5" : "border-slate-100 hover:border-orange-100"
                        )}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGoals(prev => prev.filter(id => id !== activity.id));
                          } else {
                            setSelectedGoals(prev => [...prev, activity.id]);
                          }
                        }}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={cn(
                            "w-6 h-6 rounded border-2 flex items-center justify-center",
                            isSelected ? "bg-[#800000] border-[#800000]" : "border-slate-300"
                          )}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-black">{activity.label}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">{activity.dalil}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-center z-[60]">
          <Button 
            className="w-full max-w-md bg-[#800000] hover:bg-[#800000]/90 h-14 text-sm font-black uppercase rounded-2xl shadow-xl shadow-[#800000]/20"
            disabled={selectedGoals.length === 0}
            onClick={saveGoals}
          >
            SIMPAN TARGET & MULAI ({selectedGoals.length} AMALAN) <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-20">
      {/* Guest Preview Banner */}
      {!user && (
        <div className="bg-gradient-to-r from-amber-500 to-[#800000] p-4 text-white text-center animate-in slide-in-from-top-2 duration-500 sticky top-[72px] z-40 shadow-lg">
          <p className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-pulse" /> 
            Masuk untuk mencatat amalan harian Ukhti
            <Sparkles className="w-4 h-4 animate-pulse" />
          </p>
          <Button asChild variant="link" className="text-white font-bold p-0 h-auto text-[10px] uppercase underline mt-0.5">
            <Link href="/login">Klik di sini untuk login</Link>
          </Button>
        </div>
      )}
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000]">
            <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-black text-[#800000] leading-none uppercase">Mutaba'ah</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-tighter">My Consistency Journey</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Button variant="ghost" size="icon" className="rounded-full text-[#D4AF37]" onClick={() => setIsSetupMode(true)}>
              <Settings2 className="w-5 h-5" />
            </Button>
          )}
          <Badge className="bg-[#800000] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
            {user ? `${progressPercent}%` : 'PREVIEW'}
          </Badge>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Quote Card */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-[#800000] to-red-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <QuoteIcon className="w-20 h-20 rotate-12" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex gap-4 items-start">
              <div className="bg-white/20 p-2 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium italic leading-relaxed">"{quote.text}"</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">{quote.source}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] font-black uppercase hover:bg-white/10 p-0 text-white/70"
                    onClick={() => setQuote(getRandomQuote())}
                  >
                    Ganti Motivasi
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-[#D4AF37]">
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Target Hari Ini</p>
                <div className="flex items-end gap-2">
                  <h2 className="text-4xl font-black text-black leading-none">{progressCount}</h2>
                  <p className="text-sm font-bold text-muted-foreground uppercase pb-1">/ {activeActivities.length} Amalan</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div className="bg-amber-100 text-[#800000] px-2 py-1 rounded-lg flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-current" />
                  <span className="text-[10px] font-black">STREAK: 5 HARI</span>
                </div>
                <p className="text-2xl font-black text-[#800000]">{progressPercent}%</p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-4 bg-amber-50 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#800000] [&>div]:to-[#D4AF37]" />
          </CardContent>
        </Card>

        {/* Checklist Groups */}
        <div className="space-y-8">
          {Array.from(new Set(activeActivities.map(a => a.category))).map(category => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-[11px] font-black text-black uppercase tracking-[0.2em]">{category}</h3>
                <div className="h-[1px] flex-1 bg-slate-200" />
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {activeActivities.filter(a => a.category === category).map(activity => {
                  const isDone = user 
                    ? mutabaahLogs?.find((l: any) => l.activity_id === activity.id)?.completed
                    : localLogs.find((l: any) => l.activity_id === activity.id)?.completed;
                  
                  const IconComponent = IconMap[activity.icon] || Sparkles;

                  return (
                    <Card 
                      key={activity.id}
                      className={cn(
                        "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98] group overflow-hidden relative",
                        isDone ? "bg-emerald-50/50" : "bg-white hover:shadow-md"
                      )}
                      onClick={() => toggleMutabaah(activity.id)}
                    >
                      {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                            isDone ? "bg-emerald-100 text-emerald-600 scale-105" : "bg-slate-50 text-slate-400 group-hover:bg-[#800000]/5"
                          )}>
                            {isDone ? (
                              <CheckCircle2 className="w-6 h-6 fill-current" />
                            ) : (
                              <IconComponent className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <p className={cn("text-sm font-black transition-all", isDone ? "text-emerald-900" : "text-black")}>
                              {activity.label}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase line-clamp-1">
                                {activity.dalil}
                              </p>
                              {isDone && (
                                <Badge variant="outline" className="text-[7px] h-3 px-1 border-emerald-200 text-emerald-600 bg-emerald-50">
                                  LULUS
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                           <p className="text-[8px] font-bold text-muted-foreground uppercase">7-D Progress</p>
                           <div className="flex gap-0.5">
                              {[1,1,1,1,0,1,1].map((d, i) => (
                                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", d ? "bg-emerald-500" : "bg-slate-200")} />
                              ))}
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {activeActivities.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Settings2 className="w-10 h-10 text-slate-300" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black text-slate-400 uppercase">Belum ada target</p>
              <Button onClick={() => setIsSetupMode(true)} variant="link" className="text-[#800000] font-bold">
                Mulai Atur Sekarang
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
