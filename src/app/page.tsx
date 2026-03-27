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
  Flame,
  Target,
  ArrowRight,
  Clock,
  CheckCircle2,
  Trophy,
  Zap,
  Star,
  Sun,
  LayoutGrid,
  Bot,
  HeartHandshake,
  Award,
  Activity,
  Shield,
  ShieldCheck,
  Book,
  BookOpen,
  Lock,
  Mic,
  PiggyBank,
  Plane,
  Utensils,
  HeartPulse,
} from 'lucide-react';
import Link from "next/link";
import { useUser } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const [streakDays, setStreakDays] = useState(0);
  const [nextPrayer, setNextPrayer] = useState<{ name: string, time: string, location?: string } | null>(null);

  // Only fetch data if user is logged in
  const { data: userData } = useDoc("users", user?.id);
  const points = userData?.points || 0;

  // Mutaba'ah Progress Calculation - only fetch if user is logged in
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: mutabaahLogs } = useCollection(
    "mutabaah_logs",
    user?.id ? {
      filters: [
        { column: 'user_id', operator: '==', value: user.id },
        { column: 'date', operator: '==', value: todayStr }
      ]
    } : undefined
  );

  // Get quiz attempts for streak and repetisi calculation - only fetch if user is logged in
  const { data: quizAttempts } = useCollection(
    "quiz_attempts",
    user?.id ? {
      filters: [
        { column: 'user_id', operator: '==', value: user.id },
        { column: 'isPassed', operator: '==', value: true }
      ],
      orderBy: { column: 'created_at', ascending: false }
    } : undefined
  );

  // Independent counts
  const mutabaahActivitiesCount = 28;
  const muhasabahActivitiesCount = 14;

  const mutabaahDoneCount = mutabaahLogs?.filter(l => [
    'bangun', 'siwak', 'tahajjud', 'qabliyah_subuh', 'subuh', 'dzikir_pagi', 'dhuha',
    'kajian', 'qabliyah_zhuhur', 'zhuhur', 'badiyah_zhuhur', 'qabliyah_ashar', 'ashar',
    'dzikir_petang', 'maghrib', 'badiyah_maghrib', 'isya', 'badiyah_isya', 'witir',
    'wudhu_tidur', 'al_mulk', 'ayat_kursi', 'doa_tidur', 'evaluasi', 'quran', 'doa_harian',
    'tasbih_100', 'istighfar'
  ].includes(l.activity_id) && l.completed).length || 0;

  const muhasabahDoneCount = mutabaahLogs?.filter(l => [
    'm_wanita_shalat', 'm_wanita_puasa', 'm_wanita_kehormatan', 'm_wanita_taat',
    'm_dosa_syirik', 'm_dosa_sihir', 'm_dosa_riba', 'm_lisan_ghibah', 'm_lisan_suami',
    'm_akhlak_tabarruj', 'm_akhlak_niyahah', 'm_akhlak_sabar', 'm_akhlak_birrul', 'm_akhlak_infaq'
  ].includes(l.activity_id) && l.completed).length || 0;

  const mutabaahPercent = Math.round((mutabaahDoneCount / mutabaahActivitiesCount) * 100);
  const muhasabahPercent = Math.round((muhasabahDoneCount / muhasabahActivitiesCount) * 100);

  useEffect(() => {
    const fetchPrayerTimes = async (lat: number, lon: number) => {
      try {
        let locationName = "Jakarta";
        try {
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
          const geoData = await geoRes.json();
          locationName = geoData.city || geoData.locality || geoData.principalSubdivision || "Lokasi Ukhti";
        } catch (e) {
          console.error("Geocoding failed", e);
        }

        const date = new Date();
        const res = await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(date.getTime() / 1000)}?latitude=${lat}&longitude=${lon}&method=11`);
        const result = await res.json();
        if (result.data) {
          const timings = result.data.timings;
          const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
          const prayerLabels: Record<string, string> = {
            "Fajr": "Subuh", "Dhuhr": "Dzuhur", "Asr": "Ashar", "Maghrib": "Maghrib", "Isha": "Isya"
          };

          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          let next = null;

          for (const name of prayerNames) {
            const [hours, minutes] = timings[name].split(':').map(Number);
            const prayerMinutes = hours * 60 + minutes;
            if (prayerMinutes > currentMinutes) {
              next = { name: prayerLabels[name], time: timings[name], location: locationName };
              break;
            }
          }
          if (!next) next = { name: "Subuh", time: timings["Fajr"], location: locationName };
          setNextPrayer(next);
        }
      } catch (err) {
        console.error("Failed to fetch prayer times", err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude),
        () => fetchPrayerTimes(-6.2088, 106.8456)
      );
    } else {
      fetchPrayerTimes(-6.2088, 106.8456);
    }
  }, []);

  // Hitung Streak Belajar dan Repetisi dari quiz_attempts
  useEffect(() => {
    if (!quizAttempts || quizAttempts.length === 0) {
      setStreakDays(0);
      return;
    }

    // Hitung streak hari berturut-turut dengan aktivitas
    const streakMap = new Map<string, boolean>();
    quizAttempts.forEach((attempt: any) => {
      if (attempt.created_at) {
        const date = new Date(attempt.created_at).toISOString().split('T')[0];
        streakMap.set(date, true);
      }
    });

    // Hitung streak dari hari ini ke belakang
    let streak = 0;
    let checkDate = new Date();

    // Cek apakah hari ini ada aktivitas
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (streakMap.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Jika hari ini tidak ada aktivitas, cek kemarin (streak bisa continue)
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          // Coba sampai 7 hari ke belakang
          if (streak > -7) continue;
        }
        break;
      }
    }

    setStreakDays(streak);
  }, [quizAttempts]);

  // Hitung repetisi hari ini
  const todayQuizCount = quizAttempts?.filter((a: any) => {
    if (!a.created_at) return false;
    const attemptDate = new Date(a.created_at).toISOString().split('T')[0];
    return attemptDate === todayStr && a.isPassed;
  }).length || 0;

  const repetisiPercent = Math.min(Math.round((todayQuizCount / 5) * 100), 100);

  // Date Formatting
  const gregorianDate = new Intl.DateTimeFormat('id-ID', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date());

  const [hijriDate, setHijriDate] = useState<string>("");

  useEffect(() => {
    const fetchHijri = async () => {
      try {
        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
        const result = await res.json();
        if (result.data && result.data.hijri) {
          const h = result.data.hijri;
          setHijriDate(`${h.day} ${h.month.en} ${h.year} H`);
        }
      } catch (e) {
        console.error("Failed to fetch Hijri date", e);
      }
    };
    fetchHijri();
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* Header: Greeting & Points */}
      <div className="flex items-start justify-between mt-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <Sparkles className="w-4 h-4 fill-current animate-pulse text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Hi Sahabat AQLI</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight text-black">
            Assalamu'alaikum,<br />
            {user?.user_metadata?.full_name?.split(' ')[0] || 'Sahabat'}!
          </h1>
          <div className="flex flex-col gap-0.5 mt-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{gregorianDate}</p>
            {hijriDate && (
              <p className="text-[10px] font-black text-[#800000] uppercase tracking-wider">{hijriDate}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-[#800000] text-white gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider shadow-xl shadow-[#800000]/20 rounded-xl border-b-2 border-[#D4AF37]">
            <Zap className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37] animate-pulse" />
            {points.toLocaleString()} POIN
          </Badge>
          <Badge variant="outline" className="text-[9px] font-bold border-amber-200 text-amber-700 bg-amber-50 gap-1 uppercase tracking-tighter">
            <Trophy className="w-2.5 h-2.5" /> Peringkat Sahabat
          </Badge>
        </div>
      </div>

      {/* Waktu Shalat - Background Menonjol */}
      {nextPrayer && (
        <div className="mx-1">
          <Card className="border-none shadow-lg overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-r from-[#800000] via-[#a32828] to-[#800000] p-[1px]">
              <CardContent className="bg-gradient-to-r from-[#800000] to-[#5a0000] p-4 flex items-center justify-between rounded-2xl">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sun className="w-6 h-6 text-[#D4AF37] fill-current" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-200 uppercase tracking-wider">Waktu Shalat Berikutnya</p>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{nextPrayer.name}</h3>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-2xl sm:text-3xl font-black text-[#D4AF37] tracking-tighter">{nextPrayer.time}</div>
                  <Badge className="bg-white/20 hover:bg-white/20 backdrop-blur border-none text-[8px] font-black text-white p-0 h-auto gap-1">
                    <Star className="w-2 h-2 fill-[#D4AF37] text-[#D4AF37]" /> {nextPrayer.location?.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 px-1">
        <Card className="border-none shadow-sm bg-white border-b-4 border-[#800000]">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-50 text-orange-600"><Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></div>
              <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black border-orange-200 text-orange-700 bg-orange-50 px-1 h-3 sm:h-4">ISTIQOMAH</Badge>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-black">{streakDays} Hari</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Streak Belajar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-b-4 border-[#D4AF37]">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-50 text-[#D4AF37]"><Target className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black border-amber-200 text-amber-700 bg-amber-50 px-1 h-3 sm:h-4">TARGET</Badge>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-black">{repetisiPercent}%</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Target Hari Ini</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hi Mufradat Registration Banner - Prominent CTA */}
      <section className="px-1 mb-6">
        <Link href="/study-circles/registration?id=mufradat-premium" className="block group">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#800000] to-[#5a0000] p-6 shadow-xl border-2 border-[#D4AF37]/30 group-hover:shadow-2xl transition-all duration-300">
            {/* Decorative Gold Elements */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative flex flex-col sm:flex-row items-center gap-5">
              <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:rotate-6 transition-transform">
                <BookOpen className="w-8 h-8 text-[#D4AF37]" />
              </div>
              
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg font-black text-white font-headline tracking-tight">Hi Mufradat</h3>
                  <Badge className="bg-[#D4AF37] text-[#800000] border-none text-[7px] h-3.5 font-black px-1.5 uppercase tracking-widest">OPEN</Badge>
                </div>
                <p className="text-white/80 text-[10px] sm:text-xs font-bold leading-relaxed max-w-md">
                  Pahami 1 hal Al-Qur'an per pekan dengan bimbingan & monitoring intensif. Mulai Rp 20rb/bln!
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[8px] font-black text-white uppercase tracking-wider">
                    <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> TERSTRUKTUR
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[8px] font-black text-white uppercase tracking-wider">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> MONITORING
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 w-full sm:w-auto">
                <div className="flex items-center justify-center gap-2 bg-[#D4AF37] text-[#800000] font-black px-5 py-2.5 rounded-xl text-xs shadow-lg group-hover:scale-105 transition-transform">
                  DAFTAR <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Layanan Utama - 4-Column Icon Grid */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-black">
          <LayoutGrid className="w-5 h-5 text-[#800000]" /> Layanan Utama
        </h2>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
          {/* Hi Tilawah */}
          <Link href="/tilawah" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Tilawah</span>
          </Link>

          {/* Hi Mufradat */}
          <Link href="/mufradat" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Mufradat</span>
          </Link>

          {/* Hi Hafal (Locked) */}
          <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed grayscale">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <Award className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Hafal</span>
          </div>

          {/* Hi Ngaji (Locked) */}
          <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed grayscale">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <BookOpen className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Ngaji</span>
          </div>

          {/* Hi Berbagi (Locked) */}
          <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed grayscale">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <HeartHandshake className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Berbagi</span>
          </div>

          {/* Hi Mutaba'ah (Locked) */}
          <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed grayscale">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <Target className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Mutaba'ah</span>
          </div>

          {/* Hi Muhasabah (Locked) */}
          <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed grayscale">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <Shield className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Muhasabah</span>
          </div>

          {/* AI (Locked) */}
          <div className="flex flex-col items-center gap-2 opacity-50 cursor-not-allowed">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <Bot className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Asisten AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
