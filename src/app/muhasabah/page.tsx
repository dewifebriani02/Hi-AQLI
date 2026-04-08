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
  Quote as QuoteIcon,
  Flame,
} from 'lucide-react';
import { getRandomQuote } from "@/lib/mutabaah-quotes";
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
  const [quote, setQuote] = useState(() => getRandomQuote());

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

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }, []);

  const logsOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '>=', value: thirtyDaysAgoStr }
    ]
  }), [user?.id, thirtyDaysAgoStr]);

  const { data: mutabaahLogs, refresh: reloadMutabaah } = useCollection("mutabaah_logs", logsOptions);

  const todayLogs = useMemo(() => 
    mutabaahLogs?.filter((l: any) => l.date === todayStr) || [],
  [mutabaahLogs, todayStr]);

  // Load legacy/guest logs from local storage for monitoring
  const [guestHistoricalLogs, setGuestHistoricalLogs] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('muhasabah_guest_logs_history');
    if (saved) setGuestHistoricalLogs(JSON.parse(saved));
  }, []);

  const saveToGuestHistory = (activityId: string, completed: boolean, date: string) => {
    setGuestHistoricalLogs(prev => {
      const newHistory = completed 
        ? [...prev, { activity_id: activityId, completed, date }]
        : prev.filter(l => !(l.activity_id === activityId && l.date === date));
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filtered = newHistory.filter(l => new Date(l.date) >= thirtyDaysAgo);
      
      localStorage.setItem('muhasabah_guest_logs_history', JSON.stringify(filtered));
      return filtered;
    });
  };

  const toggleMutabaah = async (activityId: string) => {
    if (!user) {
      // Guest local persistence
      const existing = localLogs.find((l: any) => l.activity_id === activityId);
      const completed = !existing?.completed;
      const newLogs = existing 
        ? localLogs.filter((l: any) => l.activity_id !== activityId)
        : [...localLogs, { activity_id: activityId, completed: true, date: todayStr }];
      
      setLocalLogs(newLogs);
      saveToGuestHistory(activityId, completed, todayStr);
      
      toast({
        title: "Langkah Tersimpan (Lokal)",
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

    if (error) {
      console.error("DEBUG [Muhasabah]: Save failed", error);
      toast({
        title: "Gagal Menyimpan",
        description: `Error: ${error.message}. Mohon hubungi admin.`,
        variant: "destructive"
      });
      return;
    }

    // reloadMutabaah(); // Optimization: Removed redundant reload; handled by useCollection real-time sync
  };

  const progressCount = useMemo(() => {
    const logs = user ? todayLogs : localLogs;
    return muhasabahItems.filter(m => logs?.find((l: any) => l.activity_id === m.id)?.completed).length;
  }, [user, todayLogs, localLogs, muhasabahItems]);

  const currentWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to Monday-start: 1 (Mon) to 7 (Sun)
    const diffToMon = day === 0 ? -6 : 1 - day;
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + diffToMon + i);
      return d.toISOString().split('T')[0];
    });
  }, []);

  const history30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const progressPercent = Math.min(100, Math.round((progressCount / muhasabahItems.length) * 100));

  const monitoringStats = useMemo(() => {
    const logsData = user ? mutabaahLogs : guestHistoricalLogs;
    if (!logsData) return null;
    
    console.log("Trend Debug [Muhasabah]: logsData size", logsData.length);
    
    const itemStats = muhasabahItems.map(item => {
      const logs = logsData.filter((l: any) => l.activity_id === item.id);
      const uniqueCompletedDates = new Set(
        logs.filter((l: any) => l.completed).map((l: any) => l.date)
      );
      const percent = Math.round((uniqueCompletedDates.size / 30) * 100);
      return { ...item, completedCount: uniqueCompletedDates.size, percent };
    });

    const averageMonthly = Math.round(
      itemStats.reduce((acc, curr) => acc + curr.percent, 0) / muhasabahItems.length
    ) || 0;

    const yearlyProjection = Math.round(averageMonthly * 0.9);

    // Calculate Current Streak (Istiqomah)
    let currentStreak = 0;
    let tempDate = new Date();
    for (let i = 0; i < 30; i++) {
      const dStr = tempDate.toISOString().split('T')[0];
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed);
      if (dayLogs.length > 0) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        // If it's today and 0, we still check yesterday before breaking
        if (i === 0) {
          tempDate.setDate(tempDate.getDate() - 1);
          continue; 
        }
        break;
      }
    }

    // Unified 30-day History calculation for Heatmap and Trends
    const heatmap = history30Days.map(dStr => {
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && l.activity_id.startsWith('m_'));
      const uniqueDay = new Set(dayLogs.map((l: any) => l.activity_id));
      const percent = muhasabahItems.length > 0 ? (uniqueDay.size / muhasabahItems.length) : 0;
      
      let level = 0;
      if (percent > 0) level = 1;
      if (percent > 0.3) level = 2;
      if (percent > 0.6) level = 3;
      if (percent > 0.8) level = 4;

      return { date: dStr, level, count: uniqueDay.size };
    });

    const dailyTrend = history30Days.slice(-7).map(dStr => {
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && l.activity_id.startsWith('m_'));
      const uniqueDay = new Set(dayLogs.map((l: any) => l.activity_id));
      return {
        date: dStr,
        percent: muhasabahItems.length > 0 ? Math.min(100, Math.round((uniqueDay.size / muhasabahItems.length) * 100)) : 0
      };
    });

    return {
      averageMonthly,
      yearlyProjection,
      currentStreak,
      heatmap,
      dailyTrend
    };
  }, [user, mutabaahLogs, guestHistoricalLogs, muhasabahItems, history30Days]);

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
                            isDone ? "bg-amber-50/30" : "bg-white hover:bg-white/80"
                          )}
                          onClick={() => toggleMutabaah(item.id)}
                        >
                          {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37]" />}
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              {/* LEFT: Checkbox Indentifier */}
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border-2",
                                isDone 
                                  ? "bg-[#D4AF37] border-[#D4AF37] text-white scale-105" 
                                  : "bg-orange-50/50 border-orange-100 text-orange-200 group-hover:border-amber-200"
                              )}>
                                {isDone ? (
                                  <CheckSquare className="w-5 h-5" />
                                ) : (
                                  <div className="w-5 h-5 rounded border-2 border-current opacity-20" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className={cn("p-1 rounded-md shrink-0", isDone ? "bg-amber-100/50 text-[#D4AF37]" : "bg-slate-100 text-slate-400")}>
                                     {sub === '4 Syarat Wanita Surga' ? <Heart className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                  </div>
                                  <p className={cn("text-xs font-bold transition-all truncate", isDone ? "text-amber-900" : "text-black")}>
                                    {item.label}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Info className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  <p className="text-[9px] text-muted-foreground font-medium uppercase truncate">
                                    {item.dalil}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                             <div className="flex flex-col items-end gap-1 shrink-0">
                               <p className="text-[8px] font-bold text-muted-foreground uppercase">SEN-MIN</p>
                               <div className="flex gap-0.5">
                                  {currentWeek.map((date, i) => {
                                    const wasDone = user
                                      ? mutabaahLogs?.find((l: any) => l.activity_id === item.id && l.date === date)?.completed
                                      : guestHistoricalLogs.find((l: any) => l.activity_id === item.id && l.date === date)?.completed;
                                    
                                    const dayName = ['S', 'S', 'R', 'K', 'J', 'S', 'M'][i];
                                    const isToday = date === todayStr;

                                    return (
                                      <div 
                                        key={i} 
                                        className={cn(
                                          "w-2 h-2 rounded-full flex items-center justify-center text-[5px] font-black transition-all", 
                                          wasDone ? "bg-amber-500 text-white scale-110 shadow-sm" : "bg-slate-100 text-slate-400",
                                          isToday && !wasDone && "border border-amber-300 animate-pulse"
                                        )} 
                                        title={date}
                                      >
                                        {dayName}
                                      </div>
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
            {/* Main Consistency Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Streak Card */}
              <Card className="bg-gradient-to-br from-[#800000] to-red-600 border-none shadow-lg p-6 text-white relative overflow-hidden h-full flex flex-col justify-between">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 opacity-90">
                    <Flame className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Istiqomah Beruntun</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black">{monitoringStats?.currentStreak || 0}</span>
                    <span className="text-sm font-bold opacity-80 uppercase tracking-tighter">Hari</span>
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  <p className="text-[10px] font-medium leading-relaxed opacity-90">
                    Masyallah! Terus jaga muhasabahmu. {monitoringStats?.currentStreak && monitoringStats.currentStreak > 3 ? 'Pertahankan api semangat ini!' : 'Mulai langkah istiqomahmu hari ini.'}
                  </p>
                </div>
                {/* Background Decoration */}
                <Flame className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 rotate-12" />
              </Card>

              {/* Today's Target Card */}
              <Card className="border-none shadow-sm p-6 bg-white flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-orange-50 rounded-lg">
                      <TargetIcon className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evaluasi Hari Ini</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black text-slate-800">{progressCount}</span>
                    <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">/ {muhasabahItems.length} evaluasi</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full transition-all duration-1000" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-orange-600 mt-4 uppercase tracking-wide">
                  {progressPercent >= 100 ? '🎉 Masyallah! Sempurna.' : 'Semangat! Teruskan muhasabahnya.'}
                </p>
              </Card>
            </div>

            {/* Kalender Kebaikan (Heatmap) */}
            <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kalender Muhasabah (30 Hari)</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[8px] font-bold text-slate-400">Jarang</span>
                   {[0,1,2,3,4].map(l => (
                     <div key={l} className={cn(
                       "w-2.5 h-2.5 rounded-sm",
                       l === 0 ? "bg-slate-100" : 
                       l === 1 ? "bg-amber-100" :
                       l === 2 ? "bg-amber-300" :
                       l === 3 ? "bg-orange-500" : "bg-orange-700"
                     )} />
                   ))}
                   <span className="text-[8px] font-bold text-slate-400">Istiqomah</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 justify-between">
                {monitoringStats?.heatmap.map((day, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-[calc(100%/10-6px)] aspect-square rounded-sm transition-all duration-500",
                      day.level === 0 ? "bg-slate-100" : 
                      day.level === 1 ? "bg-amber-100" :
                      day.level === 2 ? "bg-amber-300" :
                      day.level === 3 ? "bg-orange-500" : "bg-orange-700"
                    )}
                    title={`${day.date}: ${day.count} amalan`}
                  />
                ))}
              </div>
            </Card>

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

            {/* Nutrisi Qolbu (Spiritual Motivation) */}
            <Card className="border-none shadow-sm bg-white overflow-hidden relative border-t-4 border-[#800000]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-50 p-2 rounded-xl">
                    <QuoteIcon className="w-4 h-4 text-[#800000]" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Nutrisi Qolbu</h4>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">Renungan Muhasabah Diri</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 flex gap-4">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-1" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[7px] h-3.5 px-1 font-black uppercase border-amber-200 text-amber-600 bg-amber-50/50">
                          {quote.type === 'ayat' ? 'Al-Qur\'an' : 'Hadits Shahih'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium italic leading-relaxed text-amber-900">
                        "{quote.text}"
                      </p>
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{quote.source}</p>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-6 text-[9px] font-black uppercase text-amber-600 hover:bg-amber-100"
                           onClick={() => setQuote(getRandomQuote())}
                         >
                           Hikmah Selanjutnya
                         </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
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
