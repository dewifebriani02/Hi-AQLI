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
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">HI AQLI Sahabat</span>
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

      {/* Feature Grid - Layout Dua Kolom Baru */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-black">
          <LayoutGrid className="w-5 h-5 text-[#800000]" /> Layanan Utama
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Baris 1: Mufradat & Hafal (PREMIUM REDESIGN) */}
          <Link href="/mufradat" className="block group">
            <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all h-28 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 relative">
              <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white uppercase tracking-widest leading-tight">Hi Mufradat</h4>
                  <p className="text-[8px] text-white/70 font-bold uppercase mt-0.5">Dalami Kata Al-Qur'an Fun</p>
                </div>
              </CardContent>
              <Activity className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 rotate-12" />
            </Card>
          </Link>
          <Link href="/hafal" className="block group">
            <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all h-28 rounded-3xl bg-gradient-to-br from-[#D4AF37] to-yellow-600 relative">
              <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white uppercase tracking-widest leading-tight">Hi Hafal</h4>
                  <p className="text-[8px] text-white/70 font-bold uppercase mt-0.5">Hafal Metode Tikrar 40x</p>
                </div>
              </CardContent>
              <Award className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 -rotate-12" />
            </Card>
          </Link>

          {/* Baris 2: Ngaji & Berbagi (PREMIUM REDESIGN) */}
          <Link href="/ngaji" className="block group">
            <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all h-28 rounded-3xl bg-gradient-to-br from-[#800000] to-[#5a0000] relative">
              <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white uppercase tracking-widest leading-tight">Hi Ngaji</h4>
                  <p className="text-[8px] text-white/70 font-bold uppercase mt-0.5">Perbaiki Tajwid & Tahsin</p>
                </div>
              </CardContent>
              <BookOpen className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 rotate-12" />
            </Card>
          </Link>
          <Link href="/berbagi" className="block group">
            <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all h-28 rounded-3xl bg-gradient-to-br from-rose-500 to-amber-500 relative">
              <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <HeartHandshake className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-white uppercase tracking-widest leading-tight">Hi Berbagi</h4>
                  <p className="text-[8px] text-white/70 font-bold uppercase mt-0.5">Salurkan Infaq</p>
                </div>
              </CardContent>
              <HeartHandshake className="absolute -bottom-2 -right-2 w-20 h-20 text-white/10 -rotate-12" />
            </Card>
          </Link>

          {/* Baris 3: Mutaba'ah & Muhasabah (Tetap Muncul) */}
          <Link href="/mutabaah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-24 border-l-4 border-[#800000] rounded-2xl hover:shadow-md transition-all">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="p-1.5 rounded-lg bg-[#800000]/5 w-fit"><Target className="w-4 h-4 text-[#800000]" /></div>
                <div className="flex justify-between items-end">
                  <h4 className="font-black text-[10px] text-[#800000] uppercase tracking-wider leading-tight">Hi Mutaba'ah</h4>
                  <span className="text-[10px] font-black text-[#800000]">{mutabaahPercent}%</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/muhasabah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-24 border-l-4 border-[#D4AF37] rounded-2xl hover:shadow-md transition-all">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="p-1.5 rounded-lg bg-amber-50 w-fit"><Shield className="w-4 h-4 text-[#D4AF37]" /></div>
                <div className="flex justify-between items-end">
                  <h4 className="font-black text-[10px] text-black uppercase tracking-wider leading-tight">Hi Muhasabah</h4>
                  <span className="text-[10px] font-black text-[#D4AF37]">{muhasabahPercent}%</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Asisten AI - DIKUNCI (Masih Pengembangan) */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#800000]" /> Asisten Cerdas
        </h2>
        <Card className="overflow-hidden border-2 border-dashed border-[#D4AF37]/30 bg-muted/30">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center relative">
                <Bot className="w-6 h-6 text-[#D4AF37]" />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#800000] flex items-center justify-center">
                  <Lock className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-base uppercase leading-tight flex items-center gap-2">
                  Asisten AI
                  <Badge variant="outline" className="text-[8px] font-black border-amber-300 text-amber-600 bg-amber-50">SEGERA</Badge>
                </h4>
                <p className="text-[10px] text-muted-foreground">Tanya jawab Tafsir & Tajwid. Sedang dalam pengembangan.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
