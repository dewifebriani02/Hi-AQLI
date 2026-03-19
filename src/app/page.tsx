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
} from 'lucide-react';
import Link from "next/link";
import { useUser } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import React, { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useUser();
  const [tikrarStats, setTikrarStats] = useState<{ day: number, total: number, percent: number } | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string, time: string, location?: string } | null>(null);

  const { data: userData } = useDoc("users", user?.id);
  const isPaid = userData?.isTikrarPaid;
  const paidJuz = userData?.paidJuz;
  const points = userData?.points || 0;

  // Mutaba'ah Progress Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: mutabaahLogs } = useCollection("mutabaah_logs", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '==', value: todayStr }
    ]
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

  useEffect(() => {
    if (isPaid) {
      const startPage = paidJuz ? (paidJuz === 1 ? 1 : (paidJuz - 1) * 20 + 2) : 1;
      const saved = localStorage.getItem(`tikrar_progress_p${startPage}`);
      const savedLevel = localStorage.getItem('tikrar_level');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.startDate) {
          const start = new Date(data.startDate);
          const diff = Math.ceil(Math.abs(new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const totalDays = [0, 7, 14, 21, 28][parseInt(savedLevel || "3")] || 21;
          let done = 0;
          if (data.blocks) Object.values(data.blocks).forEach((b: any) => { if (b.combined?.count >= 40) done++; });
          setTikrarStats({ day: diff, total: totalDays, percent: (done / 4) * 100 });
        }
      } else {
        setTikrarStats({ day: 1, total: 21, percent: 0 });
      }
    }
  }, [isPaid, paidJuz]);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 px-1">
        <Card className="border-none shadow-sm bg-white border-b-4 border-[#800000]">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600"><Flame className="w-5 h-5 fill-current" /></div>
              <Badge variant="outline" className="text-[8px] font-black border-orange-200 text-orange-700 bg-orange-50 px-1.5 h-4">ISTIQOMAH</Badge>
            </div>
            <div>
              <p className="text-2xl font-black text-black">{tikrarStats?.day || 0} Hari</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Streak Belajar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-b-4 border-[#D4AF37]">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-50 text-[#D4AF37]"><Target className="w-5 h-5" /></div>
              <Badge variant="outline" className="text-[8px] font-black border-amber-200 text-amber-700 bg-amber-50 px-1.5 h-4">TARGET</Badge>
            </div>
            <div>
              <p className="text-2xl font-black text-black">{tikrarStats ? Math.round(tikrarStats.percent) : 0}%</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Repetisi Hari Ini</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {nextPrayer && (
        <div className="mx-1">
          <Card className="border-none shadow-md bg-white border-l-4 border-[#D4AF37]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#D4AF37]"><Clock className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">Waktu Shalat</p>
                  <h3 className="text-lg font-black text-black leading-tight">{nextPrayer.name}</h3>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-xl font-black text-[#800000] tracking-tighter">{nextPrayer.time}</div>
                <Badge className="bg-transparent hover:bg-transparent border-none text-[8px] font-black text-muted-foreground p-0 h-auto gap-1">
                  <Star className="w-2 h-2" /> {nextPrayer.location?.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Grid */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[#800000]" /> Layanan Utama
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/mutabaah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-36 border-l-4 border-amber-500">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-amber-50 w-fit"><Sparkles className="w-5 h-5 text-amber-500 fill-current" /></div>
                  <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black h-fit">{mutabaahPercent}%</Badge>
                </div>
                <div>
                  <h4 className="font-black text-sm text-black uppercase">Hi Mutaba'ah</h4>
                  <p className="text-[9px] text-muted-foreground font-bold italic">Sunnah Tracker</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/muhasabah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-36 border-l-4 border-[#800000]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 rounded-lg bg-[#800000]/5 w-fit"><Shield className="w-5 h-5 text-[#800000]" /></div>
                  <Badge className="bg-[#800000]/10 text-[#800000] border-none text-[8px] font-black h-fit">{muhasabahPercent}%</Badge>
                </div>
                <div>
                  <h4 className="font-black text-sm text-[#800000] uppercase">Hi Muhasabah</h4>
                  <p className="text-[9px] text-muted-foreground font-bold italic">Self Evaluation</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/mufradat" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-amber-500">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-amber-50 w-fit"><Activity className="w-5 h-5 text-amber-500" /></div>
                <h4 className="font-black text-xs text-black uppercase">Hi Mufradat</h4>
              </CardContent>
            </Card>
          </Link>

          <Link href="/irab" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#800000]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-[#800000]/5 w-fit"><Book className="w-5 h-5 text-[#800000]" /></div>
                <h4 className="font-black text-xs text-[#800000] uppercase">Hi I'rab</h4>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hafal" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#D4AF37]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-amber-50 w-fit"><Award className="w-5 h-5 text-[#D4AF37]" /></div>
                <h4 className="font-black text-xs text-black uppercase">Hi Hafal</h4>
              </CardContent>
            </Card>
          </Link>

          <Link href="/ngaji" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#800000]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-[#800000]/5 w-fit"><LayoutGrid className="w-5 h-5 text-[#800000]" /></div>
                <h4 className="font-black text-xs text-[#800000] uppercase">Hi Ngaji</h4>
              </CardContent>
            </Card>
          </Link>

          <Link href="/berbagi" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-28 border-l-4 border-[#D4AF37]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-amber-50 w-fit"><HeartHandshake className="w-5 h-5 text-[#D4AF37]" /></div>
                <h4 className="font-black text-xs text-black uppercase">Hi Berbagi</h4>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#800000]" /> Asisten Cerdas
        </h2>
        <Link href="/ai-scholar" className="block group">
          <Card className="overflow-hidden border-2 border-[#D4AF37]/30 bg-white text-[#800000] h-24 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between h-full gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#800000] flex items-center justify-center text-[#D4AF37]"><Bot className="w-6 h-6" /></div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-base uppercase leading-tight">Asisten AI</h4>
                  <p className="text-[10px] text-muted-foreground font-bold">Tanya jawab Tafsir & Tajwid.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#800000]" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
