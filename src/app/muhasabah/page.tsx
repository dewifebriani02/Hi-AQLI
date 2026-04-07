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
  BarChart3,
  TrendingUp,
  Calendar,
  Zap,
  Trophy,
  Target as TargetIcon,
  Sun,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Link from "next/link";
import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function MuhasabahPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [localLogs, setLocalLogs] = useState<any[]>([]); // For guest persistence

  const muhasabahItems = useMemo(() => [
    { id: 'm_wanita_shalat', label: 'Menjaga Shalat 5 Waktu', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_wanita_puasa', label: 'Berpuasa di bulan Ramadhan', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_wanita_kehormatan', label: 'Menjaga Kehormatan (Kemaluan)', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_wanita_taat', label: 'Mentaati Suami', sub: '4 Syarat Wanita Surga', dalil: 'HR. Ahmad' },
    { id: 'm_dosa_syirik', label: 'Menjauhi Syirik (Percaya ramalan/zodiak, jimat, dukun)', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Dosa pembinasa' },
    { id: 'm_dosa_sihir', label: 'Menjauhi Sihir', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Dosa pembinasa' },
    { id: 'm_dosa_riba', label: 'Menjauhi Riba', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Dosa besar diperangi Allah' },
    { id: 'm_lisan_ghibah', label: 'Menjaga Lisan (Ghibah/Fitnah)', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'HR. Bukhari' },
    { id: 'm_lisan_suami', label: 'Menghindari Kufur Nikmat pada Suami', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'HR. Bukhari: Mengeluh/Mencela pemberian' },
    { id: 'm_akhlak_tabarruj', label: 'Menghindari Tabarruj', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Tidak berhias berlebihan di luar' },
    { id: 'm_akhlak_niyahah', label: 'Menghindari Niyahah', sub: 'Dosa2 besar yang biasa dilakukan wanita', dalil: 'Ridha takdir, tidak meratapi berlebihan' },
    { id: 'm_akhlak_sabar', label: 'Bersabar & Bersyukur Hari Ini', sub: 'Kebaikan & Akhlak', dalil: 'Muhasabah Qolbu' },
    { id: 'm_akhlak_birrul', label: 'Berbakti kepada Orang Tua (Birrul Walidain)', sub: 'Kebaikan & Akhlak', dalil: 'Berbakti/Mendoakan Orang Tua' },
    { id: 'm_akhlak_infaq', label: 'Berinfaq/Sedekah Hari Ini', sub: 'Kebaikan & Akhlak', dalil: 'HR. Bukhari: Malaikat mendoakan' },
  ], []);

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: mutabaahLogs, refresh: reloadMutabaah } = useCollection("mutabaah_logs", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '>=', value: thirtyDaysAgoStr }
    ]
  });

  const todayLogs = useMemo(() => 
    mutabaahLogs?.filter((l: any) => l.date === todayStr) || [],
  [mutabaahLogs, todayStr]);

  // Load guest logs from local storage
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem(`muhasabah_guest_logs_${todayStr}`);
      if (saved) setLocalLogs(JSON.parse(saved));
    }
  }, [user, todayStr]);

  const toggleMutabaah = async (activityId: string) => {
    if (!user) {
      // Guest local persistence
      const existing = localLogs.find((l: any) => l.activity_id === activityId);
      const newLogs = existing 
        ? localLogs.filter((l: any) => l.activity_id !== activityId)
        : [...localLogs, { activity_id: activityId, completed: true, date: todayStr }];
      
      setLocalLogs(newLogs);
      localStorage.setItem(`muhasabah_guest_logs_${todayStr}`, JSON.stringify(newLogs));
      
      toast({
        title: "Evaluasi Disimpan (Lokal)",
        description: "Masyallah! Login untuk simpan permanen & raih HI Poin.",
      });
      return;
    }
    const existing = todayLogs?.find((l: any) => l.activity_id === activityId);
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

  const progressCount = useMemo(() => {
    if (!user) return localLogs.length;
    return muhasabahItems.filter(m => todayLogs?.find((l: any) => l.activity_id === m.id)?.completed).length;
  }, [user, todayLogs, localLogs, muhasabahItems]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const monitoringStats = useMemo(() => {
    if (!mutabaahLogs) return null;
    
    const itemStats = muhasabahItems.map(item => {
      const logs = mutabaahLogs.filter((l: any) => l.activity_id === item.id);
      const completedCount = logs.filter((l: any) => l.completed).length;
      const percent = Math.round((completedCount / 30) * 100);
      return { ...item, completedCount, percent };
    });

    const averageMonthly = Math.round(
      itemStats.reduce((acc, curr) => acc + curr.percent, 0) / muhasabahItems.length
    ) || 0;

    return {
      averageMonthly,
      consistent: itemStats.filter(s => s.percent >= 70).sort((a,b) => b.percent - a.percent).slice(0, 5),
      needsImprovement: itemStats.filter(s => s.percent < 40).sort((a,b) => a.percent - b.percent).slice(0, 5),
      dailyTrend: last7Days.map(date => {
        const dayLogs = mutabaahLogs.filter((l: any) => l.date === date && l.completed && l.activity_id.startsWith('m_'));
        return {
          date,
          percent: Math.round((dayLogs.length / muhasabahItems.length) * 100)
        };
      })
    };
  }, [mutabaahLogs, muhasabahItems, last7Days]);
  
  const progressPercent = Math.round((progressCount / muhasabahItems.length) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-20">
      <Tabs defaultValue="evaluasi" className="w-full">
        {/* Guest Preview Banner */}
        {!user && (
          <div className="bg-gradient-to-r from-amber-500 to-[#800000] p-4 text-white text-center animate-in slide-in-from-top-2 duration-500 sticky top-[72px] z-40 shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" /> 
              Masuk untuk mencatat evaluasi diri Ukhti
              <Sparkles className="w-4 h-4 animate-pulse" />
            </p>
            <Button asChild variant="link" className="text-white font-bold p-0 h-auto text-[10px] uppercase underline mt-0.5">
              <Link href="/login">Klik di sini untuk login</Link>
            </Button>
          </div>
        )}
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between">
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
              {user ? `${progressPercent}% TUNTAS` : 'PREVIEW'}
            </Badge>
          </div>

          <TabsList className="w-full h-12 bg-transparent border-t border-orange-50 rounded-none p-0">
            <TabsTrigger 
              value="evaluasi" 
              className="flex-1 h-full rounded-none data-[state=active]:bg-white data-[state=active]:text-[#800000] data-[state=active]:border-b-2 data-[state=active]:border-[#800000] font-black text-[10px] uppercase tracking-widest"
            >
              Evaluasi
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring" 
              className="flex-1 h-full rounded-none data-[state=active]:bg-white data-[state=active]:text-[#800000] data-[state=active]:border-b-2 data-[state=active]:border-[#800000] font-black text-[10px] uppercase tracking-widest"
            >
              Monitoring
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="evaluasi" className="mt-0 outline-none">
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
                      const isDone = user
                        ? todayLogs?.find((l: any) => l.activity_id === item.id)?.completed
                        : localLogs.find((l: any) => l.activity_id === item.id)?.completed;

                      return (
                        <Card 
                          key={item.id}
                          className={cn(
                            "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98] group overflow-hidden relative",
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
                            
                            <div className="flex flex-col items-end gap-1">
                               <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">7-Day</p>
                               <div className="flex gap-0.5">
                                  {last7Days.map((date, i) => {
                                    const wasDone = user
                                      ? mutabaahLogs?.find((l: any) => l.activity_id === item.id && l.date === date)?.completed
                                      : false;
                                    return (
                                      <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", wasDone ? "bg-[#D4AF37] scale-110" : "bg-slate-200")} />
                                    );
                                  })}
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
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="mt-0 outline-none">
          <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Harian', value: progressPercent, icon: Sun, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Bulanan', value: monitoringStats?.averageMonthly || 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Tahunan', value: Math.round((monitoringStats?.averageMonthly || 0) * 0.92), icon: TrendingUp, color: 'text-[#800000]', bg: 'bg-orange-50' },
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-sm text-center p-4">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2", stat.bg)}>
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                  <p className="text-xl font-black text-black">{stat.value}%</p>
                </Card>
              ))}
            </div>

            {/* Daily Trend Chart (Simple Bar) */}
            <Card className="border-none shadow-sm p-6 overflow-hidden">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4 text-[#800000]" /> Tren Muhasabah 7 Hari
               </h3>
               <div className="flex items-end justify-between h-32 gap-2">
                 {monitoringStats?.dailyTrend.map((day, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                     <div className="w-full bg-slate-50 rounded-t-lg relative h-full flex items-end">
                       <div 
                        className="w-full bg-gradient-to-t from-[#800000] to-[#D4AF37] rounded-t-lg transition-all duration-500 group-hover:opacity-80" 
                        style={{ height: `${day.percent}%` }}
                       >
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                           {day.percent}%
                         </div>
                       </div>
                     </div>
                     <span className="text-[8px] font-bold text-muted-foreground group-hover:text-black transition-colors">
                       {day.date.split('-').slice(1).reverse().join('/')}
                     </span>
                   </div>
                 ))}
               </div>
            </Card>

            {/* Consistency Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bintang Istiqomah */}
              <Card className="border-none shadow-sm p-5 border-t-4 border-emerald-500">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Kebaikan Terjaga</h4>
                </div>
                <div className="space-y-3">
                  {monitoringStats?.consistent.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">Mulailah hari ini untuk membangun keistiqomahan.</p>
                  ) : (
                    monitoringStats?.consistent.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-700 truncate mr-2">{item.label}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 h-4 text-[8px] border-none">{item.percent}%</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Peluang Kebaikan */}
              <Card className="border-none shadow-sm p-5 border-t-4 border-amber-400">
                <div className="flex items-center gap-2 mb-4">
                  <TargetIcon className="w-4 h-4 text-amber-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">Perlu Perhatian</h4>
                </div>
                <div className="space-y-3">
                  {monitoringStats?.needsImprovement.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">Maa syaa Allah, semua amalan berjalan baik!</p>
                  ) : (
                    monitoringStats?.needsImprovement.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-700 truncate mr-2">{item.label}</span>
                        <Badge className="bg-amber-100 text-amber-700 h-4 text-[8px] border-none">{item.percent}%</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
            
            {/* Total Poin Card */}
            <Card className="bg-gradient-to-r from-[#D4AF37] to-[#800000] p-6 rounded-3xl text-white shadow-xl shadow-[#800000]/20">
              <div className="flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">Total HI Poin Muhasabah</p>
                   <h3 className="text-3xl font-black">{(mutabaahLogs?.filter((l: any) => l.completed && l.activity_id.startsWith('m_')).length || 0) * 5} <span className="text-sm font-bold opacity-70">POIN</span></h3>
                 </div>
                 <div className="bg-white/20 p-3 rounded-2xl">
                   <Zap className="w-8 h-8 text-amber-100 fill-current" />
                 </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
