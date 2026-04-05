'use client';

import { useState, useMemo, useEffect } from "react";

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
  XCircle,
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
  Search,
  Users,
  Share2,
  MessageSquare,
  Download,
  ExternalLink
} from 'lucide-react';
import Link from "next/link";
import { useUser, supabase } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import { useToast } from "@/hooks/use-toast";
import { QURAN_CHAPTERS, SURAH_MAP_STR } from "@/lib/quran-data";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const [streakDays, setStreakDays] = useState(0);
  const [nextPrayer, setNextPrayer] = useState<{ name: string, time: string, location?: string } | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const { toast } = useToast();

  // Only fetch data if user is logged in
  const { data: userData } = useDoc("users", user?.id);
  const points = userData?.points || 0;

  // Mutaba'ah Progress Calculation - only fetch if user is logged in
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const mutabaahOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id },
      { column: 'date', operator: '==', value: todayStr }
    ]
  } : undefined), [user?.id, todayStr]);

  const { data: mutabaahLogs } = useCollection("mutabaah_logs", mutabaahOptions);

  const quizOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id },
      { column: 'created_at', operator: '>=', value: thirtyDaysAgoStr }
    ],
    orderBy: { column: 'created_at', ascending: false }
  } : undefined), [user?.id, thirtyDaysAgoStr]);

  const { data: quizAttempts } = useCollection("quiz_attempts", quizOptions);

  const donationOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id }
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 10
  } : undefined), [user?.id]);

  const { data: userDonations } = useCollection("donations", donationOptions);

  const mutabaahHistoryOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id },
      { column: 'completed', operator: '==', value: true }
    ],
    orderBy: { column: 'updated_at', ascending: false },
    limit: 20
  } : undefined), [user?.id]);

  const { data: mutabaahHistory } = useCollection("mutabaah_logs", mutabaahHistoryOptions);

  const ngajiRegOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id }
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 10
  } : undefined), [user?.id]);

  const { data: ngajiRegs } = useCollection("halaqah_registrations", ngajiRegOptions);

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
        const cacheKey = `prayer_times_${todayStr}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        if (cached) {
          setNextPrayer(JSON.parse(cached));
          return;
        }

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
          if (typeof window !== 'undefined') localStorage.setItem(cacheKey, JSON.stringify(next));
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
    return attemptDate === todayStr && a.is_passed;
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
        const cacheKey = `hijri_date_${todayStr}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        if (cached) {
          setHijriDate(cached);
          return;
        }

        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
        const result = await res.json();
        if (result.data && result.data.hijri) {
          const h = result.data.hijri;
          const formatted = `${h.day} ${h.month.en} ${h.year} H`;
          setHijriDate(formatted);
          if (typeof window !== 'undefined') localStorage.setItem(cacheKey, formatted);
        }
      } catch (e) {
        console.error("Failed to fetch Hijri date", e);
      }
    };
    fetchHijri();
  }, [todayStr]);

  // Generate Referral Code logic
  useEffect(() => {
    const generateReferralCode = async () => {
      if (!user || userData?.referral_code || isGeneratingCode) return;
      
      setIsGeneratingCode(true);
      try {
        const firstName = (user.user_metadata?.full_name?.split(' ')[0] || 'AQLI').toUpperCase().replace(/[^A-Z0-9]/g, '');
        let sequence = 1;
        let code = "";
        let isUnique = false;

        while (!isUnique) {
          const seqStr = sequence.toString().padStart(2, '0');
          code = `AQLI-${firstName}${seqStr}`;

          // Check if code exists
          const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("referral_code", code)
            .maybeSingle();

          if (!existing) {
            isUnique = true;
          } else {
            sequence++;
          }
        }

        // Save code
        await supabase
          .from("users")
          .update({ referral_code: code })
          .eq("id", user.id);

      } catch (e) {
        console.error("Failed to generate referral code", e);
      } finally {
        setIsGeneratingCode(false);
      }
    };

    if (userData && !userData.referral_code) {
      generateReferralCode();
    }
  }, [user, userData, isGeneratingCode]);

  // Combine activities for "Riwayat Terkini"
  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    
    // 1. Add Quiz Attempts (Mufradat / Irab)
    quizAttempts?.forEach((q: any) => {
      const isMufradat = q.quiz_id?.startsWith('mufradat');
      const isIrab = q.quiz_id?.startsWith('irab');
      
      let programName = isMufradat ? 'Hi Mufradat' : isIrab ? 'Hi Irab' : 'Kuis';
      let statusLabel = q.is_passed ? 'Lulus' : 'Kuis';
      
      let title = "";
      let subtitle = "";

      if (q.quiz_id?.startsWith('mufradat_page_')) {
        const pageId = q.quiz_id.replace('mufradat_page_', '');
        title = `Halaman ${pageId}`;
      } else if (q.surah_id && q.surah_id !== '0') {
        const surahName = SURAH_MAP_STR.get(String(q.surah_id)) || `Surat ${q.surah_id}`;
        title = surahName;
        if (q.verse_id && q.verse_id !== '0') {
          title = `${surahName} Ayat ${q.verse_id}`;
        }
      } else {
        title = "Uji Hafalan";
      }

      subtitle = `Skor ${q.score}/${q.total_questions}`;

      activities.push({
        id: q.id,
        type: 'quiz',
        program: programName,
        status: statusLabel,
        title,
        subtitle,
        timestamp: q.created_at,
        is_passed: q.is_passed,
        icon: isMufradat ? Book : isIrab ? Search : Activity,
        color: q.is_passed ? 'text-emerald-600' : 'text-[#800000]'
      });
    });

    // 2. Add Donations (Hi Berbagi)
    userDonations?.forEach((d: any) => {
      activities.push({
        id: d.id,
        type: 'donation',
        program: 'Hi Berbagi',
        status: d.status === 'verified' ? 'Berhasil' : 'Pending',
        title: d.campaign_title || 'Infaq Umum',
        subtitle: `Rp ${d.amount.toLocaleString('id-ID')}`,
        timestamp: d.created_at,
        icon: HeartPulse,
        color: d.status === 'verified' ? 'text-blue-600' : 'text-amber-500'
      });
    });

    // 3. Add Mutabaah Activity (Hi Mutabaah)
    mutabaahHistory?.forEach((m: any) => {
      const activityLabels: Record<string, string> = {
        'bangun': 'Bangun Tidur', 'siwak': 'Siwak', 'tahajjud': 'Tahajjud',
        'subuh': 'Shalat Subuh', 'dhuha': 'Shalat Dhuha', 'quran': 'Tilawah Quran',
        'al_mulk': 'Baca Al-Mulk', 'dzikir_pagi': 'Dzikir Pagi', 'dzikir_petang': 'Dzikir Petang'
      };
      
      activities.push({
        id: m.id,
        type: 'mutabaah',
        program: 'Hi Mutabaah',
        status: 'Selesai',
        title: activityLabels[m.activity_id] || m.activity_id.replace(/_/g, ' '),
        subtitle: new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        timestamp: m.created_at || m.date,
        icon: Sun,
        color: 'text-emerald-500'
      });
    });

    // 4. Add Ngaji Registration (Hi Ngaji)
    ngajiRegs?.forEach((n: any) => {
      activities.push({
        id: n.id,
        type: 'ngaji',
        program: 'Hi Ngaji',
        status: n.status === 'active' ? 'Aktif' : 'Terdaftar',
        title: 'Pendaftaran Kelas',
        subtitle: n.status === 'pending_verification' ? 'Menunggu Verifikasi' : 'Siap Mulai Belajar',
        timestamp: n.created_at || n.createdAt || new Date(),
        icon: Users,
        color: n.status === 'active' ? 'text-emerald-600' : 'text-amber-500'
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [quizAttempts, userDonations, mutabaahHistory, ngajiRegs]);

  const isMufradatRegistered = useMemo(() => {
    return userData?.mufradat_group_id || ngajiRegs?.some(r => 
      (r.halaqah_id === 'mufradat-premium' || r.halaqah_title?.toLowerCase().includes('mufradat')) && 
      ['active', 'verified', 'pending_verification'].includes(r.status)
    );
  }, [userData, ngajiRegs]);

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
        {user && (
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-[#800000] text-white gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider shadow-xl shadow-[#800000]/20 rounded-xl border-b-2 border-[#D4AF37]">
              <Zap className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37] animate-pulse" />
              {points.toLocaleString()} POIN
            </Badge>
            <Link href="/leaderboard">
              <Badge variant="outline" className="text-[9px] font-bold border-amber-200 text-amber-700 bg-amber-50 gap-1 uppercase tracking-tighter cursor-pointer hover:bg-amber-100 transition-colors">
                <Trophy className="w-2.5 h-2.5" /> Peringkat Sahabat
              </Badge>
            </Link>
          </div>
        )}
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

      {/* 1. GUEST PROMO (Moved right above Layanan Utama) */}
      {!isMufradatRegistered && (
        <div className="mx-1 mt-2 mb-2">
          <Link href={user ? "/study-circles/registration?id=mufradat-premium" : "/register"}>
            <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-[#800000] to-[#500000] shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:shadow-[#800000]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-3xl -mr-20 -mt-20 rounded-full animate-pulse" />
              <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <div className="flex-1 text-center sm:text-left">
                  <Badge className="bg-amber-400 text-[#800000] mb-4 font-black tracking-widest uppercase py-1 px-3 animate-bounce">
                    PROMO TERBATAS!
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-black text-white font-headline leading-tight mb-3">
                    Level Up Hafalan<br />
                    <span className="text-amber-400">Hi Mufradat</span>
                  </h2>
                  <p className="text-slate-100 text-sm font-medium leading-relaxed mb-6 opacity-90 max-w-md">
                    Bukan sekadar setoran, tapi menguasai setiap kata! Gabung sekarang dan dapatkan sistem mentoring harian yang asyik.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                    <div className="flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-amber-400" />
                       <span className="text-[10px] font-black text-white uppercase tracking-wider">Diskon Referral 5rb</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-400" />
                       <span className="text-[10px] font-black text-white uppercase tracking-wider">Mulai dari 20rb</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center gap-2 bg-[#D4AF37] text-[#800000] font-black px-6 py-3 rounded-xl text-xs shadow-lg group-hover:scale-105 transition-all">
                    DAFTAR KINI <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

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

          {/* Hi Tikrar */}
          <Link href="/tikrar" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Award className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Tikrar</span>
          </Link>

          {/* Hi Ngaji */}
          <Link href="/ngaji" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Ngaji</span>
          </Link>

          {/* Hi Berbagi */}
          <Link href="/berbagi" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <HeartHandshake className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Berbagi</span>
          </Link>

          {/* Hi Mutaba'ah */}
          <Link href="/mutabaah" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Mutabaah</span>
          </Link>

          {/* Hi Muhasabah */}
          <Link href="/muhasabah" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Muhasabah</span>
          </Link>

          {/* AI (Locked for everyone but AI is always cool) */}
          <div className="flex flex-col items-center gap-2 opacity-50 cursor-not-allowed">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300 relative">
              <Bot className="w-7 h-7 text-slate-400" />
              <Lock className="w-3 h-3 absolute bottom-2 right-2 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-400 leading-tight">Hi Asisten AI</span>
          </div>
        </div>
      </div>

      {user && userData?.referral_code && (
        <div className="mx-1 mb-8">
          <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white border border-amber-100 flex flex-col sm:flex-row min-h-[180px] group transition-all">
            {/* Promo Image (Premium Preview) */}
            <div className="relative w-full sm:w-1/3 bg-[#800000] overflow-hidden">
               <img 
                src="/images/promo-hiaqli.png" 
                alt="Promo Hi AQLI" 
                className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#800000] via-transparent to-transparent sm:bg-gradient-to-r" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
                   <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
              </div>
            </div>

            <CardContent className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ajak Teman & Hemat Bersama</h3>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pahala Jariyah + Bonus Saldo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Saldo Hadiah</p>
                    <p className="text-sm font-black text-emerald-600">Rp {(userData.referral_balance || 0).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-6">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kode Referral Ukhti</p>
                    <div className="text-2xl font-black text-[#800000] tracking-[0.3em] font-mono">
                      {userData.referral_code}
                    </div>
                </div>
              </div>

              {/* Common Promo Text Generator */}
              {(() => {
                const origin = "https://hiaqli.pro";
                const referralLink = `${origin}/register?ref=${userData.referral_code}&redirectTo=${encodeURIComponent(`/study-circles/registration?ref=${userData.referral_code}`)}`;
                const commonPromoText = `Assalamu'alaikum Warahmatullahi Wabarakatuh Sahabat Fillah! ✨\n\nIngin lebih dekat dengan Al-Qur'an tapi bingung mulai dari mana? Yuk, gabung di ekosistem digital *Hi AQLI*! 🕋📱\n\nNikmati berbagai fitur unggulan kami:\n✅ *Hi Mufradat*: 1 Hal. per Pekan, Quiz Seru & Monitoring Group (Cuma 20rb!).\n✅ *Hi Tikrar*: Metode muroja'ah 40x repetisi untuk Itqan maksimal.\n✅ *Hi Tilawah*: Tracking progress bacaan harian Ukhti.\n✅ *Hi Berbagi*: Salurkan infaq & sedekah dengan transparan.\n✅ *Hi Mutaba'ah & Muhasabah*: Evaluasi amalan harian untuk terus istiqomah.\n\n🎁 *BONUS KHUSUS UNTUKMU!*\nGunakan kode referral saya: *${userData.referral_code}* saat pendaftaran untuk mendapatkan *POTONGAN LANGSUNG Rp 5.000!* 💸\n\nDaftar Sekarang:\n🔗 ${referralLink}\n\nGabung juga di komunitas kami:\n💬 WhatsApp: https://hiaqli.pro/whatsapp\n📢 Telegram: https://hiaqli.pro/telegram\n\nKunjungi Website Kami:\n🌐 www.hiaqli.pro\n\nAyo bareng-bareng jadi Ahlul Qur'an! Jazakumullahu khairan. 🙏✨`;
                
                return (
                  <Button 
                    variant="outline"
                    className="w-full rounded-2xl h-16 font-black uppercase text-[12px] tracking-[0.2em] gap-3 bg-[#800000] text-white border-2 border-[#800000] hover:bg-white hover:text-[#800000] transition-all shadow-xl shadow-[#800000]/20 group/btn"
                    onClick={() => {
                      navigator.clipboard.writeText(commonPromoText);
                      toast({
                        title: "Pesan Disalin!",
                        description: "Silakan tempel (paste) ke WhatsApp atau media sosial lainnya.",
                      });
                    }}
                  >
                    <Download className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" /> 
                    SALIN PESAN PROMOSI
                  </Button>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Riwayat Terkini Section - Moved below Layanan Utama */}
      {user && recentActivities.length > 0 && (
        <section className="px-1 mb-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-black">
              <Clock className="w-5 h-5 text-[#800000]" /> Riwayat Terkini
            </h2>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#800000]/10 hover:bg-[#800000]/[0.02] transition-all group shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                    activity.type === 'quiz' && activity.is_passed ? "bg-emerald-50 text-emerald-600" :
                    activity.type === 'quiz' && !activity.is_passed ? "bg-rose-50 text-rose-600" :
                    activity.type === 'donation' ? "bg-blue-50 text-blue-600" :
                    activity.type === 'mutabaah' ? "bg-amber-50 text-amber-600" : "bg-primary/5 text-primary"
                  )}>
                    <activity.icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-[0.15em]",
                        activity.type === 'quiz' && activity.is_passed ? "text-emerald-600" :
                        activity.type === 'quiz' && !activity.is_passed ? "text-rose-600" :
                        activity.type === 'donation' ? "text-blue-600" :
                        "text-[#800000]"
                      )}>
                        {activity.status} • {activity.program}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 truncate uppercase mt-0.5">
                      {activity.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight opacity-70">
                      {activity.subtitle}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {new Date(activity.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer: Community Links */}
      <div className="mt-8 mb-4 px-4 py-8 bg-[#800000]/5 rounded-[2.5rem] border border-[#800000]/10 flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black text-[#800000] uppercase tracking-[0.2em]">Gabung Komunitas Kami</p>
          <h3 className="text-lg font-black text-slate-800 font-headline">Lebih Dekat Dengan Al-Qur'an</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-2 w-full max-w-md px-1">
          <Link 
            href="/whatsapp" 
            target="_blank" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 shadow-md shadow-emerald-500/10"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span className="text-[8px] font-black uppercase tracking-wider">Grup WA</span>
          </Link>
          
          <Link 
            href="/channel" 
            target="_blank" 
            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 shadow-md shadow-emerald-700/10"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span className="text-[8px] font-black uppercase tracking-wider">Channel WA</span>
          </Link>
          
          <Link 
            href="/telegram" 
            target="_blank" 
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 shadow-md shadow-sky-500/10"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">Telegram</span>
          </Link>
        </div>
        
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">www.hiaqli.pro • Teruslah Istiqomah ✨</p>
      </div>
    </div>
  );
}
