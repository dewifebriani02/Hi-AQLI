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
  BarChart3,
  TrendingUp,
  Target as TargetIcon,
  Calendar,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  const [quote, setQuote] = useState(() => getRandomQuote());
  const [localLogs, setLocalLogs] = useState<any[]>([]); // For guest persistence
  const [hijriData, setHijriData] = useState<any>(null);

  useEffect(() => {
    const fetchHijri = async () => {
      try {
        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
        const result = await res.json();
        if (result.data && result.data.hijri) {
          setHijriData(result.data.hijri);
        }
      } catch (e) {
        console.error("Failed to fetch Hijri date", e);
      }
    };
    fetchHijri();
  }, []);

  const baseActivities = useMemo(() => [
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

  // Load legacy/guest logs from local storage for monitoring
  const [guestHistoricalLogs, setGuestHistoricalLogs] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mutabaah_guest_logs_history');
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
      
      localStorage.setItem('mutabaah_guest_logs_history', JSON.stringify(filtered));
      return filtered;
    });
  };

  const saveGoals = async () => {
    // Legacy - removed
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
        description: "Masyaallah! Login untuk dapatkan HI Poin & simpan permanen.",
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
      console.error("DEBUG [Mutabaah]: Save failed", error);
      toast({
        title: "Gagal Menyimpan",
        description: `Error: ${error.message}. Mohon hubungi admin.`,
        variant: "destructive"
      });
      return;
    }

    reloadMutabaah();
    // Update points if completed
    if (completed) {
      const currentPoints = userData?.points || 0;
      const { error: pointError } = await supabase.from("users").update({ points: currentPoints + 5 }).eq('id', user.id);
      if (pointError) console.error("DEBUG [Mutabaah]: Points update failed", pointError);
      reloadUser();
    }
  };

  const activeActivities = useMemo(() => {
    const activities = [...baseActivities];
    
    // 1. Add Doa Sahur after Tahajjud
    const tahajjudIdx = activities.findIndex(a => a.id === 'tahajjud');
    if (tahajjudIdx !== -1) {
      activities.splice(tahajjudIdx + 1, 0, { 
        id: 'doa_sahur', 
        label: 'Perbanyak Doa di Waktu Sahur', 
        category: 'Malam & Bangun', 
        dalil: 'HR. Bukhari & Muslim: Waktu mustajab di sepertiga malam', 
        icon: 'MessageSquare' 
      });
    }

    // 2. Add Monday/Thursday Fasting
    const day = new Date().getDay();
    if (day === 1 || day === 4) {
      activities.push({ 
        id: 'puasa_senin_kamis', 
        label: 'Puasa Sunnah Senin Kamis', 
        category: 'Umum', 
        dalil: 'HR. Tirmidzi: Amalan diangkat pada hari tersebut', 
        icon: 'Sun' 
      });
    }

    // 3. Hijri-based activities
    if (hijriData) {
      const hDay = parseInt(hijriData.day);
      // Ayyamul Bidh (13, 14, 15)
      if ([13, 14, 15].includes(hDay)) {
        activities.push({ 
          id: 'ayyamul_bidh', 
          label: 'Puasa Ayyamul Bidh', 
          category: 'Umum', 
          dalil: 'HR. Tirmidzi: Seperti puasa sepanjang tahun', 
          icon: 'Star' 
        });
      }
      // Sunnah Bekam (17, 19, 21)
      if ([17, 19, 21].includes(hDay)) {
        activities.push({ 
          id: 'sunnah_bekam', 
          label: 'Sunnah Berbekam', 
          category: 'Kesehatan', 
          dalil: 'HR. Tirmidzi: Kesembuhan pada tiga hal...', 
          icon: 'Activity' 
        });
      }
    }

    return activities;
  }, [baseActivities, hijriData]);

  const progressCount = useMemo(() => {
    const logs = user ? todayLogs : localLogs;
    if (!logs) return 0;
    
    // Fix 143% bug: Count unique completed activity IDs ONLY if they are currently active
    const activeIds = new Set(activeActivities.map(a => a.id));
    const uniqueCompleted = new Set(
      logs
        .filter((l: any) => l.completed && activeIds.has(l.activity_id))
        .map((l: any) => l.activity_id)
    );
    return uniqueCompleted.size;
  }, [user, todayLogs, localLogs, activeActivities]);

  const history30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const progressPercent = activeActivities.length > 0 
    ? Math.min(100, Math.round((progressCount / activeActivities.length) * 100)) 
    : 0;

  const monitoringStats = useMemo(() => {
    const logsData = user ? mutabaahLogs : guestHistoricalLogs;
    if (!logsData) return null;
    
    console.log("Trend Debug [Mutabaah]: logsData count", logsData.length);
    const last7 = history30Days.slice(-7);
    console.log("Trend Debug [Mutabaah]: history30 last 7", last7);
    const sampleDay = last7[last7.length - 1];
    const sampleLogs = logsData.filter((l: any) => l.date === sampleDay);
    console.log(`Trend Debug [Mutabaah]: logs for ${sampleDay}`, sampleLogs);
    
    const activityStats = activeActivities.map(activity => {
      const logs = logsData.filter((l: any) => l.activity_id === activity.id);
      const uniqueCompletedDates = new Set(
        logs.filter((l: any) => l.completed).map((l: any) => l.date)
      );
      const percent = Math.round((uniqueCompletedDates.size / 30) * 100); 
      return { ...activity, completedCount: uniqueCompletedDates.size, percent };
    });

    const averageMonthly = Math.round(
      activityStats.reduce((acc, curr) => acc + curr.percent, 0) / activeActivities.length
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
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && !l.activity_id.startsWith('m_'));
      const uniqueCount = new Set(dayLogs.map((l: any) => l.activity_id)).size;
      
      const percent = activeActivities.length > 0 ? (uniqueCount / activeActivities.length) : 0;
      let level = 0;
      if (percent > 0) level = 1;
      if (percent > 0.3) level = 2;
      if (percent > 0.6) level = 3;
      if (percent > 0.8) level = 4;

      return { date: dStr, level, count: uniqueCount };
    });

    const dailyTrend = history30Days.slice(-7).map(dStr => {
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && !l.activity_id.startsWith('m_'));
      const uniqueCount = new Set(dayLogs.map((l: any) => l.activity_id)).size;
      return {
        date: dStr,
        percent: activeActivities.length > 0 ? Math.min(100, Math.round((uniqueCount / activeActivities.length) * 100)) : 0
      };
    });

    return {
      averageMonthly,
      yearlyProjection,
      currentStreak,
      heatmap,
      dailyTrend
    };
  }, [user, mutabaahLogs, guestHistoricalLogs, activeActivities, history30Days]);

  const IconMap: Record<string, any> = {
    Sun, Moon, BookOpen, Clock, Star, Droplets, Shield, Activity, Book, MessageSquare, RotateCcw, Sparkles, Home, CheckSquare, Zap
  };

  // Setup mode removed

  return (
    <div className="flex flex-col min-h-screen bg-orange-50/30 pb-20">
      <Tabs defaultValue="evaluasi" className="w-full">
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
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between">
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
              <Badge className="bg-[#800000] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
                {user ? `${progressPercent}%` : 'PREVIEW'}
              </Badge>
            </div>
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
                      <span className="text-[10px] font-black">STREAK: {monitoringStats?.currentStreak || 0} HARI</span>
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
                    {activeActivities.filter(activity => activity.category === category).map(activity => {
                      const isDone = user 
                        ? todayLogs?.find((l: any) => l.activity_id === activity.id)?.completed
                        : localLogs.find((l: any) => l.activity_id === activity.id)?.completed;
                      
                      const IconComponent = IconMap[activity.icon] || Sparkles;

                      return (
                        <Card 
                          key={activity.id}
                          className={cn(
                            "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98] group overflow-hidden relative",
                            isDone ? "bg-emerald-50/30" : "bg-white hover:shadow-md"
                          )}
                          onClick={() => toggleMutabaah(activity.id)}
                        >
                          {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              {/* LEFT: Checkbox Indentifier */}
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border-2",
                                isDone 
                                  ? "bg-emerald-500 border-emerald-500 text-white scale-105" 
                                  : "bg-slate-50 border-slate-100 text-slate-300 group-hover:border-emerald-200"
                              )}>
                                {isDone ? (
                                  <CheckSquare className="w-5 h-5" />
                                ) : (
                                  <div className="w-5 h-5 rounded border-2 border-current opacity-20" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className={cn("p-1 rounded-md shrink-0", isDone ? "bg-emerald-100/50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                     <IconComponent className="w-3 h-3" />
                                  </div>
                                  <p className={cn("text-sm font-black transition-all truncate", isDone ? "text-emerald-900" : "text-black")}>
                                    {activity.label}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[9px] text-muted-foreground font-bold uppercase truncate">
                                    {activity.dalil}
                                  </p>
                                  {isDone && (
                                    <Badge variant="outline" className="text-[7px] h-3 px-1 border-emerald-200 text-emerald-600 bg-emerald-50 shrink-0">
                                      ALHAMDULILLAH
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                               <p className="text-[8px] font-bold text-muted-foreground uppercase">7-D</p>
                               <div className="flex gap-0.5">
                                  {history30Days.slice(-7).map((date, i) => {
                                    const wasDone = user
                                      ? mutabaahLogs?.find((l: any) => l.activity_id === activity.id && l.date === date)?.completed
                                      : guestHistoricalLogs.find((l: any) => l.activity_id === activity.id && l.date === date)?.completed;
                                    return (
                                      <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", wasDone ? "bg-emerald-500 scale-110" : "bg-slate-200")} title={date} />
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

            {activeActivities.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-black text-slate-400 uppercase">Memuat Amalan...</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="mt-0 outline-none">
          <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
            {/* Stats Overview */}
            {/* Main Consistency Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Streak Card */}
              <Card className="bg-gradient-to-br from-orange-500 to-red-600 border-none shadow-lg p-6 text-white relative overflow-hidden h-full flex flex-col justify-between">
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
                    Masyallah! Terus jaga amalanmu. {monitoringStats?.currentStreak && monitoringStats.currentStreak > 3 ? 'Pertahankan api semangat ini!' : 'Mulai langkah istiqomahmu hari ini.'}
                  </p>
                </div>
                {/* Background Decoration */}
                <Flame className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 rotate-12" />
              </Card>

              {/* Today's Target Card */}
              <Card className="border-none shadow-sm p-6 bg-white flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                      <TargetIcon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Hari Ini</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black text-slate-800">{progressCount}</span>
                    <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">/ {activeActivities.length} amalan</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-emerald-600 mt-4 uppercase tracking-wide">
                  {progressPercent >= 100 ? '🎉 Sempurna! Semua tuntas.' : 'Semangat! Selesaikan amalan lainnya.'}
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kalender Kebaikan (30 Hari)</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[8px] font-bold text-slate-400">Jarang</span>
                   {[0,1,2,3,4].map(l => (
                     <div key={l} className={cn(
                       "w-2.5 h-2.5 rounded-sm",
                       l === 0 ? "bg-slate-100" : 
                       l === 1 ? "bg-emerald-100" :
                       l === 2 ? "bg-emerald-300" :
                       l === 3 ? "bg-emerald-500" : "bg-emerald-700"
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
                      day.level === 1 ? "bg-emerald-100" :
                      day.level === 2 ? "bg-emerald-300" :
                      day.level === 3 ? "bg-emerald-500" : "bg-emerald-700"
                    )}
                    title={`${day.date}: ${day.count} amalan`}
                  />
                ))}
              </div>
            </Card>

            {/* Daily Trend Chart (Simple Bar) */}
            <Card className="border-none shadow-sm p-6 overflow-hidden">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4 text-[#800000]" /> Tren Istiqomah 7 Hari
               </h3>
                <div className="flex items-end justify-between h-32 gap-3">
                  {monitoringStats?.dailyTrend.map((day, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col items-center gap-2 group">
                      <div className="w-full bg-slate-50 rounded-t-lg relative flex-1 flex items-end overflow-hidden">
                        <div 
                         className="w-full bg-gradient-to-t from-[#800000] to-orange-500 rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-80" 
                         style={{ height: `${day.percent}%` }}
                        >
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] font-black opacity-0 group-hover:opacity-100 transition-opacity text-white">
                            {day.percent}%
                          </div>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-muted-foreground whitespace-nowrap">
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
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">Semangat Beramal Shalih</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex gap-4">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[7px] h-3.5 px-1 font-black uppercase border-emerald-200 text-emerald-600 bg-emerald-50/50">
                          {quote.type === 'ayat' ? 'Al-Qur\'an' : 'Hadits Shahih'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium italic leading-relaxed text-emerald-900">
                        "{quote.text}"
                      </p>
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{quote.source}</p>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-6 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-100"
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
            <Card className="bg-gradient-to-r from-[#800000] to-[#5a0000] p-6 rounded-3xl text-white shadow-xl shadow-[#800000]/20">
              <div className="flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 mb-1">Total HI Poin Mutaba'ah</p>
                   <h3 className="text-3xl font-black">{(mutabaahLogs?.filter((l: any) => l.completed).length || 0) * 5} <span className="text-sm font-bold opacity-70">POIN</span></h3>
                 </div>
                 <div className="bg-white/20 p-3 rounded-2xl">
                   <Zap className="w-8 h-8 text-amber-300 fill-current" />
                 </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
