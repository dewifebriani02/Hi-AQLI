'use client';

import { useState, useMemo, useEffect } from "react";
import { getCallSign } from "@/lib/utils";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles as SparklesIcon,
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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Heart,
  Check,
  Loader2
} from 'lucide-react';
import Link from "next/link";
import { useUser, supabase } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import { useToast } from "@/hooks/use-toast";
import { QURAN_CHAPTERS, SURAH_MAP_STR } from "@/lib/quran-data";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAJOR_CITIES = [
  { name: "Jakarta", lat: -6.2088, lon: 106.8456 },
  { name: "Surabaya", lat: -7.2575, lon: 112.7521 },
  { name: "Bandung", lat: -6.9175, lon: 107.6191 },
  { name: "Medan", lat: 3.5952, lon: 98.6722 },
  { name: "Makassar", lat: -5.1476, lon: 119.4327 },
  { name: "Yogyakarta", lat: -7.7956, lon: 110.3695 }
];

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { data: userData, isLoading: isUserDocLoading } = useDoc(user?.id ? "users" : null, user?.id);
  const fullSalutation = userData?.salutation || "Ukhti";
  const callSign = getCallSign(fullSalutation);
  const [showSalutationForcer, setShowSalutationForcer] = useState(false);
  const [forcedSalutation, setForcedSalutation] = useState("Ukhti");
  const [isForcerSaving, setIsForcerSaving] = useState(false);

  useEffect(() => {
    // Show forcer only if user is logged in, but hasn't chosen a salutation yet.
    // Check both the metadata flag AND if the salutation field is empty/default.
    if (!isUserLoading && !isUserDocLoading && user && userData) {
      const hasChosen = !!userData.metadata?.has_chosen_salutation;
      const hasSalutationSet = !!userData.salutation && userData.salutation !== "";
      
      if (!hasChosen && !hasSalutationSet) {
        setShowSalutationForcer(true);
      } else {
        // Explicitly close if we found data (e.g. after sync or update)
        setShowSalutationForcer(false);
      }
    }
  }, [user, userData, isUserLoading, isUserDocLoading]);

  const handleForceSalutation = async () => {
    if (!user) return;
    setIsForcerSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          salutation: forcedSalutation,
          metadata: {
            ...(userData?.metadata || {}),
            has_chosen_salutation: true
          }
        })
        .eq('id', user.id);

      if (error) throw error;
      setShowSalutationForcer(false);
      toast({ title: "Masyallah!", description: `Panggilan Akrab berhasil diatur sebagai ${forcedSalutation}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: err.message });
    } finally {
      setIsForcerSaving(false);
    }
  };
  const [streakDays, setStreakDays] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [nextPrayer, setNextPrayer] = useState<{ name: string, time: string, location?: string } | null>(null);
  const [manualCity, setManualCity] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<'umum' | 'mufradat'>('umum');
  const { toast } = useToast();

  // Only fetch data if user is logged in
  const points = userData?.points || 0;

  // Mutaba'ah Progress Calculation - only fetch if user is logged in
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], []);

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
    limit: 5
  } : undefined), [user?.id]);

  const { data: userDonations } = useCollection("donations", donationOptions);

  const mutabaahHistoryOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id },
      { column: 'completed', operator: '==', value: true }
    ],
    orderBy: { column: 'updated_at', ascending: false },
    limit: 10
  } : undefined), [user?.id]);

  const { data: mutabaahHistory } = useCollection("mutabaah_logs", mutabaahHistoryOptions);

  const ngajiRegOptions = useMemo(() => (user?.id ? {
    filters: [
      { column: 'user_id', operator: '==', value: user.id }
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 5
  } : undefined), [user?.id]);

  const { data: ngajiRegs } = useCollection("halaqah_registrations", ngajiRegOptions);

  // Independent counts
  const mutabaahActivitiesCount = 28;
  const muhasabahActivitiesCount = 14;

  const mutabaahDoneCount = useMemo(() => {
    return mutabaahLogs?.filter(l => [
      'bangun', 'siwak', 'tahajjud', 'qabliyah_subuh', 'subuh', 'dzikir_pagi', 'dhuha',
      'kajian', 'qabliyah_zhuhur', 'zhuhur', 'badiyah_zhuhur', 'qabliyah_ashar', 'ashar',
      'dzikir_petang', 'maghrib', 'badiyah_maghrib', 'isya', 'badiyah_isya', 'witir',
      'wudhu_tidur', 'al_mulk', 'ayat_kursi', 'doa_tidur', 'evaluasi', 'quran', 'doa_harian',
      'tasbih_100', 'istighfar'
    ].includes(l.activity_id) && l.completed).length || 0;
  }, [mutabaahLogs]);

  const muhasabahDoneCount = useMemo(() => {
    return mutabaahLogs?.filter(l => [
      'm_wanita_shalat', 'm_wanita_puasa', 'm_wanita_kehormatan', 'm_wanita_taat',
      'm_dosa_syirik', 'm_dosa_sihir', 'm_dosa_riba', 'm_lisan_ghibah', 'm_lisan_suami',
      'm_akhlak_tabarruj', 'm_akhlak_niyahah', 'm_akhlak_sabar', 'm_akhlak_birrul', 'm_akhlak_infaq'
    ].includes(l.activity_id) && l.completed).length || 0;
  }, [mutabaahLogs]);

  const mutabaahPercent = Math.round((mutabaahDoneCount / mutabaahActivitiesCount) * 100);
  const muhasabahPercent = Math.round((muhasabahDoneCount / muhasabahActivitiesCount) * 100);


  const fetchPrayerTimes = async (lat: number, lon: number, isAuto = false) => {
    try {
      const todayStrLocal = new Date().toISOString().split('T')[0];
      const cacheKey = `prayer_times_${todayStrLocal}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
      
      let locationName = isAuto ? "Mendeteksi..." : (manualCity || `Lokasi ${fullSalutation}`);
      
      try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
        const geoData = await geoRes.json();
        locationName = geoData.city || geoData.locality || geoData.principalSubdivision || `Lokasi ${fullSalutation}`;
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

  const handleAutoDetect = () => {
    if (navigator.geolocation) {
      toast({ description: `Mendeteksi lokasi ${fullSalutation} secara otomatis...` });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setManualCity(null);
          fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude, true);
          toast({ title: "Lokasi Ditemukan", description: "Jadwal shalat telah diperbarui otomatis." });
        },
        (err) => {
          console.warn("Geolocation fallback to Jakarta:", err.message);
          toast({ variant: "destructive", title: "Gagal Mendeteksi", description: "Izin lokasi ditolak atau GPS tidak aktif. Silakan pilih manual." });
          fetchPrayerTimes(-6.2088, 106.8456);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    if (manualCity) {
      const city = MAJOR_CITIES.find(c => c.name === manualCity);
      if (city) fetchPrayerTimes(city.lat, city.lon);
    } else {
      // Hanya jalankan auto-detect sekali atau jika manualCity kosong
      handleAutoDetect();
    }
  }, [manualCity]);

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

    // 5. Add Demo Data for Guest Mode
    if (!user) {
      activities.push(
        {
          id: 'demo-1',
          type: 'quiz',
          program: 'Hi Mufradat',
          status: 'Simulasi',
          title: 'Surat Al-Baqarah: 1-5',
          subtitle: 'Contoh Progres Hafalan',
          timestamp: new Date().toISOString(),
          is_passed: true,
          icon: Book,
          color: 'text-emerald-500 opacity-60'
        },
        {
          id: 'demo-2',
          type: 'mutabaah',
          program: 'Hi Mutabaah',
          status: 'Simulasi',
          title: 'Tilawah 1 Juz',
          subtitle: 'Target Harian Sahabat',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          icon: Sun,
          color: 'text-amber-500 opacity-60'
        },
        {
          id: 'demo-3',
          type: 'donation',
          program: 'Hi Berbagi',
          status: 'Simulasi',
          title: 'Sedekah Subuh',
          subtitle: 'Kebaikan Berkelanjutan',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          icon: HeartPulse,
          color: 'text-rose-500 opacity-60'
        }
      );
    }

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [quizAttempts, userDonations, mutabaahHistory, ngajiRegs, user]);

  const isRegistered = useMemo(() => {
    return !!userData?.mufradat_group_id || !!userData?.is_tikrar_paid || ngajiRegs?.some(r =>
      ['active', 'verified', 'pending_verification'].includes(r.status)
    );
  }, [userData, ngajiRegs]);

  // ONBOARDING CHECKLIST LOGIC
  const onboardingSteps = useMemo(() => {
    if (!user) return [];

    return [
      {
        id: "profile",
        title: "Lengkapi Profil",
        subtitle: `Pasang nomor WhatsApp ${fullSalutation}`,
        isDone: !!userData?.whatsapp,
        href: "/profile?edit=true",
        icon: UserIcon
      },
      {
        id: "quiz",
        title: "Kuis Perdana",
        subtitle: "Coba kuis Mufradat gratis",
        isDone: (quizAttempts?.length || 0) > 0,
        href: "/mufradat",
        icon: SparklesIcon
      },
      {
        id: "program",
        title: "Daftar Program",
        subtitle: "Gabung di Hi Mufradat/Tikrar",
        isDone: isRegistered,
        href: "/programs",
        icon: BookOpen
      }
    ];
  }, [user, userData, quizAttempts, ngajiRegs]);

  const onboardingDoneCount = onboardingSteps.filter(s => s.isDone).length;
  const onboardingPercent = Math.round((onboardingDoneCount / onboardingSteps.length) * 100);
  const showOnboarding = user && onboardingPercent < 100;

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* Header: Greeting & Points */}
      <div className="flex items-start justify-between mt-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <SparklesIcon className="w-4 h-4 fill-current animate-pulse text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Hi Sahabat AQLI</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight text-black">
            Assalamu'alaikum,<br />
            {fullSalutation} {user?.user_metadata?.full_name?.split(' ')[0] || ''}!
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

                  <Dialog>
                    <DialogTrigger asChild>
                      <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur border-none text-[8px] font-black text-white p-0 h-auto gap-1 cursor-pointer transition-colors px-1">
                        <Star className="w-2 h-2 fill-[#D4AF37] text-[#D4AF37]" /> {nextPrayer.location?.toUpperCase()}
                      </Badge>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-center text-[#800000] font-black uppercase tracking-widest">Pilih Lokasi {fullSalutation}</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-center uppercase tracking-tight">
                          Gunakan deteksi otomatis atau pilih kota terdekat untuk menyesuaikan jadwal shalat.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="pt-4 px-1">
                        <Button
                          onClick={handleAutoDetect}
                          className="w-full h-14 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-lg gap-3 uppercase tracking-widest text-xs"
                        >
                          <Bot className="w-5 h-5 animate-bounce" />
                          Deteksi Lokasi Otomatis
                        </Button>
                      </div>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest"><span className="bg-white px-2 text-muted-foreground">Atau Pilih Manual</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pb-4">
                        {MAJOR_CITIES.map((city) => (
                          <Button
                            key={city.name}
                            variant={manualCity === city.name ? "default" : "outline"}
                            className={cn(
                              "rounded-xl font-bold uppercase text-[10px] tracking-wider h-12",
                              manualCity === city.name ? "bg-[#800000] text-white" : "border-slate-200"
                            )}
                            onClick={() => {
                              setManualCity(city.name);
                              if (typeof window !== 'undefined') {
                                localStorage.removeItem(`prayer_times_${todayStr}_`); // Partial clear to force refetch
                              }
                            }}
                          >
                            {city.name}
                          </Button>
                        ))}
                      </div>
                      <p className="text-[9px] text-center text-slate-400 font-medium italic">Jadwal shalat akan menyesuaikan dengan koordinat kota yang dipilih.</p>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      )}

      {/* 0. ONBOARDING CHECKLIST */}
      {showOnboarding && (
        <div className="mx-1 animate-in slide-in-from-top-4 duration-500">
          <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white border-b-4 border-slate-900">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ahlan Wa Sahlan!</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selesaikan langkah awal {fullSalutation}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-slate-900 leading-none">{onboardingPercent}%</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Selesai</span>
                </div>
              </div>

              <Progress value={onboardingPercent} className="h-2 bg-slate-100" indicatorClassName="bg-slate-900 transition-all duration-1000" />

              <div className="grid gap-3">
                {onboardingSteps.map((step) => (
                  <Link key={step.id} href={step.isDone ? "#" : step.href}>
                    <div className={cn(
                      "group flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98]",
                      step.isDone ? "bg-slate-50 border-slate-200 opacity-80" : "bg-white border-slate-100 hover:border-slate-900/20 hover:shadow-md"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          step.isDone ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-900/5 group-hover:text-slate-900"
                        )}>
                          {step.isDone ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("text-xs font-black uppercase tracking-tight", step.isDone ? "text-slate-400 line-through" : "text-slate-800")}>
                            {step.title}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{step.subtitle}</span>
                        </div>
                      </div>
                      {!step.isDone && (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:bg-[#800000] group-hover:border-[#800000] transition-colors">
                          <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-white" />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
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
      {(!user || !isRegistered) && (
        <div className="mx-1 mt-2 mb-2">
          <Link href={user ? "/programs" : "/register"}>
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
                    Bukan sekadar setoran, tapi menguasai setiap kata! Gabung sekarang dan dapatkan sistem mentoring harian yang asyik bersama para pengajar AQLI.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Keringanan Referral 5rb</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Hanya 20rb per bulan!</span>
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
                  <SparklesIcon className="w-6 h-6 text-amber-400 animate-pulse" />
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
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kode Referral {fullSalutation}</p>
                  <div className="text-2xl font-black text-[#800000] tracking-[0.3em] font-mono">
                    {userData.referral_code}
                  </div>
                </div>
              </div>

              {/* Common Promo Text Generator */}
              {(() => {
                const origin = "https://hiaqli.pro";
                const referralLink = `${origin}/register?ref=${userData.referral_code}`;
                const mufradatLink = `${origin}/register?ref=${userData.referral_code}&program=mufradat`;
                
                const promoTexts: Record<string, string> = {
                  mufradat: `*DEKATKAN DIRI DENGAN AL-QUR'AN MELALUI MAKNA* ✨📖\n*HI MUFRADAT PREMIUM* - By Hi AQLI\n\nSeringkali kita membaca Al-Qur'an, namun hati rindu untuk memahami pesan-pesan indah di dalamnya. Apakah ${fullSalutation} ingin mulai menyelami maknanya dengan langkah yang nyata? 🌿\n\nMari bergabung dalam perjalanan spiritual yang terukur dan bermakna bersama Hi Mufradat.\n\n💎 *KEUNGGULAN PROGRAM:*\n✅ *Langkah Nyata*: Cukup 1 halaman per pekan untuk pemahaman yang mendalam.\n✅ *Bimbingan Intensif*: Dipantau & ditemani dalam grup khusus thalibah 🤝\n✅ *Evaluasi Interaktif*: Quiz seru untuk mengasah ingatan & pemahaman 🎮\n\n💸 *INFAQ PROGRAM:*\n• Pendaftaran: Rp 10.000 (Sekali Seumur Hidup)\n• Infaq Bulanan: Rp 20.000\n\n🎁 *HADIAH UNTUK ${fullSalutation.toUpperCase()}!*\nGunakan kode referral saya: *${userData.referral_code}*\nDapatkan *Keringanan Rp 5.000* untuk pendaftaran pertama ${fullSalutation}! 💸\n\nMulai Perjalanan Makna ${fullSalutation} Sekarang:\n🔗 ${mufradatLink}\n\n---\n💬 *Tanya Admin*: wa.me/6283132582803\n🌐 *Gabung Komunitas*: https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq\n\n*Berhijrah dengan Ilmu, Beramal dengan Itqan.*`,
                  tikrar: `*PROGRAM HI TIKRAR* 📖⭐\n*By Hi AQLI*\n\n*Hafal Al-Qur'an Lebih Itqan & Terjaga!* 🌟\n\nIngin hafalan Al-Qur'an ${fullSalutation} lebih kuat dan tidak mudah lupa? Yuk gabung di program Hi Tikrar dengan metode yang sudah teruji! 🕋\n\n🚀 *Keunggulan Program:*\n✅ *Metode 7 Tahapan*: Sistematis untuk kekuatan memori jangka panjang.\n✅ *Monitoring Harian*: Dipantau langsung perkembangannya.\n\n💰 *Transparansi Biaya:*\n- *Biaya Pendaftaran*: Rp 10.000 (Sekali Seumur Hidup)\n- *Infaq Program*: Sesuai level intensitas yang dipilih.\n\n🎁 *BONUS KHUSUS!*\nGunakan kode referral saya: *${userData.referral_code}* untuk mendapatkan *Keringanan LANGSUNG Rp 5.000!* 💸 (Khusus Pendaftar Baru)\n\nInfo & Pendaftaran:\n🔗 ${origin}/register?ref=${userData.referral_code}&program=tikrar\n\n---\n💬 *Hubungi Admin*: wa.me/6283132582803\n🌐 *Gabung Komunitas Hi AQLI:*\n- WA: https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq\n- Telegram: https://t.me/rq_aqli`,
                  ngaji: `*HI NGAJI - BELAJAR TAHSIN & TAJWID* 📚✨\n*By Hi AQLI*\n\n*Perbaiki Bacaan Al-Qur'an ${fullSalutation} dari Nol!* 🌟\n\nIngin bacaan Al-Qur'an lebih tartil dan sesuai kaidah tajwid? Yuk gabung di Hi Ngaji, belajar bareng muallimah yang kompeten! 🕋\n\n💰 *Transparansi Biaya:*\n- *Biaya Pendaftaran*: Rp 10.000 (Sekali Seumur Hidup)\n- *Infaq Kelas*: Menyesuaikan tingkat kelas.\n\n🎁 *BONUS KHUSUS!*\nGunakan kode referral saya: *${userData.referral_code}* untuk mendapatkan *Keringanan LANGSUNG Rp 5.000!* 💸 (Khusus Pendaftar Baru)\n\nDaftar Sekarang:\n🔗 ${origin}/register?ref=${userData.referral_code}&program=ngaji\n\n---\n💬 *Hubungi Admin*: wa.me/6283132582803\n🌐 *Gabung Komunitas Hi AQLI:*\n- WA: https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq\n- Telegram: https://t.me/rq_aqli`,
                  irab: `*PROGRAM HI IRAB* 🔍📖\n*By Hi AQLI*\n\n*Selami Makna Mendalam Bahasa Al-Qur'an!* 🌟\n\nHi IRAB akan membantu ${fullSalutation} memahami tata bahasa Arab dengan cara yang mudah! 🕋\n\n💰 *Transparansi Biaya:*\n- *Biaya Pendaftaran*: Rp 10.000 (Sekali Seumur Hidup)\n- *Infaq Program*: Sesuai paket yang diambil.\n\n🎁 *BONUS KHUSUS!*\nGunakan kode referral saya: *${userData.referral_code}* untuk mendapatkan *Keringanan LANGSUNG Rp 5.000!* 💸 (Khusus Pendaftar Baru)\n\nDaftar Sekarang:\n🔗 ${origin}/register?ref=${userData.referral_code}&program=irab\n\n---\n💬 *Hubungi Admin*: wa.me/6283132582803\n🌐 *Gabung Komunitas Hi AQLI:*\n- WA: https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq\n- Telegram: https://t.me/rq_aqli`
                };

                const promoItems = [
                  { id: 'mufradat', name: 'Hi Mufradat', icon: Activity, color: 'bg-amber-400', locked: false },
                  { id: 'tikrar', name: 'Hi Tikrar', icon: Award, color: 'bg-indigo-400', locked: true },
                  { id: 'ngaji', name: 'Hi Ngaji', icon: BookOpen, color: 'bg-cyan-400', locked: true },
                  { id: 'irab', name: 'Hi Irab', icon: Search, color: 'bg-emerald-400', locked: true },
                ];
                
                return (
                  <div className="flex flex-col gap-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full rounded-2xl h-16 font-black uppercase text-[12px] tracking-[0.2em] gap-3 bg-[#800000] text-white border-2 border-[#800000] hover:bg-white hover:text-[#800000] transition-all shadow-xl shadow-[#800000]/20 group/btn"
                        >
                          <Share2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                          BAGIKAN PESAN PROMOSI
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-white rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-[#800000] font-black uppercase tracking-widest text-xl">Pilih Program Promosi</DialogTitle>
                          <DialogDescription className="text-[10px] font-bold text-center uppercase tracking-tight text-slate-500">
                            Pilih program yang ingin {fullSalutation} bagikan. Reward saldo berlaku ketika teman mendaftar melalui link promosi ini.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-3 py-4">
                           {promoItems.map((item) => {
                             const isLocked = item.locked;
                             return (
                               <a 
                                 key={item.id}
                                 href={isLocked ? undefined : `https://wa.me/?text=${encodeURIComponent(promoTexts[item.id])}`}
                                 target={isLocked ? undefined : "_blank"}
                                 rel={isLocked ? undefined : "noopener noreferrer"}
                                 className={cn(
                                   "group flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm border-2",
                                   isLocked 
                                     ? "bg-slate-50/50 border-slate-100 opacity-60 cursor-not-allowed" 
                                     : "bg-slate-50 hover:bg-white border-transparent hover:border-[#800000]/10"
                                 )}
                                 onClick={(e) => isLocked && e.preventDefault()}
                               >
                                 <div className="flex items-center gap-4">
                                   <div className={cn(
                                     "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md", 
                                     isLocked ? "bg-slate-300" : item.color
                                   )}>
                                     <item.icon className="w-6 h-6" />
                                   </div>
                                   <div className="flex flex-col">
                                     <div className="flex items-center gap-2">
                                       <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.name}</span>
                                       {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                                     </div>
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Gunakan kode teman & dapatkan keringanan Rp 5.000</p>
                                   </div>
                                 </div>
                                 <div className={cn(
                                   "w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform",
                                   isLocked ? "bg-slate-200" : "bg-[#25D366] group-hover:scale-110"
                                 )}>
                                   {isLocked ? <Lock className="w-4 h-4 text-slate-400" /> : <Share2 className="w-5 h-5" />}
                                 </div>
                               </a>
                             );
                           })}
                        </div>
                        <p className="text-[9px] text-center text-slate-400 font-medium italic">Klik salah satu program untuk membagikan pesan promosi via WhatsApp.</p>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Riwayat Terkini Section - Visible for everyone (including guest demo) */}
      {(user || !user) && (
        <section className="px-1 mb-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-black">
              <Clock className="w-5 h-5 text-[#800000]" /> {user ? "Riwayat Terkini" : "Simulasi Aktivitas"}
            </h2>
            {!user && (
              <Badge variant="outline" className="text-[7px] font-black border-[#800000]/20 text-[#800000] bg-[#800000]/5 px-2">GUEST MODE</Badge>
            )}
          </div>
          <div className="space-y-4">
            {recentActivities.slice(historyPage * 5, (historyPage + 1) * 5).map((activity) => (
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

          {recentActivities.length > 5 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                disabled={historyPage === 0}
                className="text-[10px] font-black uppercase tracking-widest gap-1 hover:text-[#800000]"
              >
                <ChevronLeft className="w-3 h-3" /> SEBELUMNYA
              </Button>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                Halaman {historyPage + 1} dari {Math.ceil(recentActivities.length / 5)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryPage(p => Math.min(Math.ceil(recentActivities.length / 5) - 1, p + 1))}
                disabled={(historyPage + 1) * 5 >= recentActivities.length}
                className="text-[10px] font-black uppercase tracking-widest gap-1 hover:text-[#800000]"
              >
                LANJUT <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Footer: Community Links */}
      <div className="mt-8 mb-4 px-4 py-8 bg-[#800000]/5 rounded-[2.5rem] border border-[#800000]/10 flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black text-[#800000] uppercase tracking-[0.2em]">Gabung Komunitas Kami</p>
          <h3 className="text-lg font-black text-slate-800 font-headline">Lebih Dekat Dengan Al-Qur'an</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-md px-1">
          <a
            href="https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq"
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 shadow-md shadow-emerald-500/10"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span className="text-[8px] font-black uppercase tracking-wider">Grup WA</span>
          </a>

          <a
            href="https://whatsapp.com/channel/0029Vb5sNGZ9mrGkJGzEh421"
            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 shadow-md shadow-emerald-700/10"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span className="text-[8px] font-black uppercase tracking-wider">Channel WA</span>
          </a>

          <a
            href="tg://resolve?domain=rq_aqli"
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 shadow-md shadow-sky-500/10"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">Telegram</span>
          </a>
        </div>

        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">www.hiaqli.pro • Teruslah Istiqomah ✨</p>
      </div>
      {/* Forced Salutation Selection Modal */}
      <Dialog open={showSalutationForcer} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-white rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
           <div className="bg-gradient-to-br from-[#800000] via-[#A52A2A] to-[#800000] p-10 text-center text-white relative">
              <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border-2 border-white/10">
                <Heart className="w-10 h-10 fill-amber-300 text-amber-300 animate-pulse" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tighter text-white">Personalisasi Sapaan</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mt-1">
                  Satu langkah lagi untuk kenyamanan Ukhti
                </DialogDescription>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="space-y-3 text-center">
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  Assalamu'alaikum! Agar pengalaman belajar di Hi AQLI terasa lebih dekat dan nyaman, silakan pilih panggilan akrab yang Ukhti sukai:
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Ukhti', 'Kakak', 'Ummu', 'Ibu', 'Neng', 'Mbak', 'Uni', 'Teteh', 'Bunda', 'Sahabat'].map((choice) => (
                    <button
                      key={choice}
                      onClick={() => setForcedSalutation(choice)}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2",
                        forcedSalutation === choice 
                          ? "bg-[#800000] border-[#800000] text-white shadow-lg scale-[1.02]" 
                          : "bg-slate-50 border-slate-100 text-slate-500 hover:border-[#800000]/20"
                      )}
                    >
                      {choice}
                      {forcedSalutation === choice && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>

                <Button 
                  onClick={handleForceSalutation}
                  disabled={isForcerSaving}
                  className="w-full h-14 bg-[#800000] hover:bg-[#800000]/90 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs mt-4"
                >
                  {isForcerSaving ? <Loader2 className="animate-spin w-5 h-5" /> : "SIMPAN & MULAI BELAJAR"}
                </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
