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
  UtensilsCrossed,
} from 'lucide-react';
import Link from "next/link";
import { useUser } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUser();
  const [streakDays, setStreakDays] = useState(0);
  const [nextPrayer, setNextPrayer] = useState<{ name: string, time: string, location?: string } | null>(null);

  const { data: userData } = useDoc("users", user?.id);
  const points = userData?.points || 0;

  // Mutaba'ah Progress Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: mutabaahLogs } = useCollection("mutabaah_logs", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '==', value: todayStr }
    ]
  });

  // Get quiz attempts for streak and repetisi calculation
  const { data: quizAttempts } = useCollection("quiz_attempts", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'isPassed', operator: '==', value: true }
    ],
    orderBy: { column: 'created_at', ascending: false }
  });

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
          locationName = geoData.city || geoData.locality || geoData.principalSubdivision || "Lokasi Anda";
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

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* Header: Greeting & Points */}
      <div className="flex items-start justify-between mt-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <Sparkles className="w-4 h-4 fill-current animate-pulse text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">HI AQLI SQUAD</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight text-black">
            Assalamu'alaikum,<br />
            {user?.user_metadata?.full_name?.split(' ')[0] || 'Squad'}!
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-[#800000] text-white gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider shadow-xl shadow-[#800000]/20 rounded-xl border-b-2 border-[#D4AF37]">
            <Zap className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37] animate-pulse" />
            {points.toLocaleString()} POIN
          </Badge>
          <Badge variant="outline" className="text-[9px] font-bold border-amber-200 text-amber-700 bg-amber-50 gap-1 uppercase tracking-tighter">
            <Trophy className="w-2.5 h-2.5" /> Peringkat SQUAD
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

      {/* Feature Grid - Layout Lebih Menarik */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[#800000]" /> Layanan Utama
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Hi Mufradat - Large Card */}
          <Link href="/mufradat" className="block group col-span-2">
            <Card className="overflow-hidden border-none shadow-md bg-white h-36 sm:h-40 border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-amber-50 w-fit"><Activity className="w-5 h-5 text-amber-500 fill-current" /></div>
                  <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black h-fit">POPULER</Badge>
                </div>
                <div>
                  <h4 className="font-black text-sm text-black uppercase">Hi Mufradat</h4>
                  <p className="text-[9px] text-muted-foreground font-bold italic">Mushaf & Terjemahan</p>
                  <Progress value={75} className="h-1 mt-2 bg-amber-100 [&>div]:bg-amber-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hi Hafal - Large Card */}
          <Link href="/hafal" className="block group col-span-2">
            <Card className="overflow-hidden border-none shadow-md bg-white h-36 sm:h-40 border-l-4 border-[#D4AF37] hover:shadow-lg transition-shadow">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-amber-50 w-fit"><Award className="w-5 h-5 text-[#D4AF37]" /></div>
                  <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black h-fit">FAVORIT</Badge>
                </div>
                <div>
                  <h4 className="font-black text-sm text-black uppercase">Hi Hafal</h4>
                  <p className="text-[9px] text-muted-foreground font-bold italic">Hafalan Ayat & Surat</p>
                  <Progress value={60} className="h-1 mt-2 bg-amber-100 [&>div]:bg-[#D4AF37]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hi Ngaji - Warna Menonjol */}
          <Link href="/ngaji" className="block group col-span-2">
            <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow h-28">
              <div className="bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] p-[1px]">
                <CardContent className="bg-gradient-to-r from-[#800000] to-[#a32828] p-3 flex items-center justify-between h-full gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#D4AF37]/20 w-fit"><BookOpen className="w-5 h-5 text-[#D4AF37]" /></div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase">Hi Ngaji</h4>
                      <p className="text-[9px] text-amber-200 font-bold italic">Belajar Tajwid</p>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                </CardContent>
              </div>
            </Card>
          </Link>

          {/* Hi Mutaba'ah */}
          <Link href="/mutabaah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-amber-50 w-fit"><Sparkles className="w-4 h-4 text-amber-500 fill-current" /></div>
                  <Badge className="bg-amber-100 text-amber-700 border-none text-[7px] font-black h-fit">{mutabaahPercent}%</Badge>
                </div>
                <div>
                  <h4 className="font-black text-xs text-black uppercase">Hi Mutaba'ah</h4>
                  <p className="text-[8px] text-muted-foreground">Sunnah Harian</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hi Berbagi - Warna Menonjol */}
          <Link href="/berbagi" className="block group col-span-2">
            <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow h-28">
              <div className="bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] p-[1px]">
                <CardContent className="bg-gradient-to-r from-[#800000] to-[#a32828] p-3 flex items-center justify-between h-full gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#D4AF37]/20 w-fit"><HeartHandshake className="w-5 h-5 text-[#D4AF37]" /></div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase">Hi Berbagi</h4>
                      <p className="text-[9px] text-amber-200 font-bold italic">Donasi & Sedekah</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#D4AF37]" />
                </CardContent>
              </div>
            </Card>
          </Link>

          {/* Hi Muhasabah */}
          <Link href="/muhasabah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#800000] hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-[#800000]/5 w-fit"><Shield className="w-4 h-4 text-[#800000]" /></div>
                  <Badge className="bg-[#800000]/10 text-[#800000] border-none text-[7px] font-black h-fit">{muhasabahPercent}%</Badge>
                </div>
                <div>
                  <h4 className="font-black text-xs text-[#800000] uppercase">Hi Muhasabah</h4>
                  <p className="text-[8px] text-muted-foreground">Evaluasi Diri</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hi Nabung */}
          <Link href="/nabung" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="p-1.5 rounded-lg bg-amber-50 w-fit"><PiggyBank className="w-4 h-4 text-amber-500" /></div>
                <div>
                  <h4 className="font-black text-xs text-black uppercase">Hi Nabung</h4>
                  <p className="text-[8px] text-muted-foreground">Tabungan Umroh</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hi Umroh */}
          <Link href="/umroh" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#D4AF37] hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="p-1.5 rounded-lg bg-amber-50 w-fit"><Plane className="w-4 h-4 text-[#D4AF37]" /></div>
                <div>
                  <h4 className="font-black text-xs text-black uppercase">Hi Umroh</h4>
                  <p className="text-[8px] text-muted-foreground">Persiapan Ibadah</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hi Masak */}
          <Link href="/masak" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#800000] hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="p-1.5 rounded-lg bg-[#800000]/5 w-fit"><UtensilsCrossed className="w-4 h-4 text-[#800000]" /></div>
                <div>
                  <h4 className="font-black text-xs text-[#800000] uppercase">Hi Masak</h4>
                  <p className="text-[8px] text-muted-foreground">Resep & Tips</p>
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
