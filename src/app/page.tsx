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
  Zap as ZapIcon,
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
import { useUser, db, authFetch } from "@/db";
import { toDateKeyWIB } from "@/lib/tikrar-schedule-generator";
import {
  computeActivity7Days,
  computeCombinedPageStats,
  computeCombinedStreak,
  getWeekStartKeyWIB,
  type CombinedPageStats,
} from "@/lib/dashboard-stats";
import { useDoc, useCollection } from "@/db";
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
  const [isInstalled, setIsInstalled] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkInstalled = () => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches 
          || (window.navigator as any).standalone 
          || document.referrer.includes('android-app://');
        setIsInstalled(standalone);
      };
      checkInstalled();
      window.addEventListener('focus', checkInstalled);
      return () => window.removeEventListener('focus', checkInstalled);
    }
  }, []);

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
      const { error } = await db
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
  const [combinedStats, setCombinedStats] = useState<{
    streakDays: number;
    activity7Days: boolean[];
    pageStats: CombinedPageStats;
  } | null>(null);
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
      
      // 1. Try to load from cache first for instant display
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setNextPrayer(JSON.parse(cached));
          // If it's not auto-detecting (manual city), we can stop here
          if (!isAuto) return;
        }
      }

      let locationName = isAuto ? "Mendeteksi..." : (manualCity || `Lokasi ${fullSalutation}`);
      
      // Save last location for faster subsequent loads
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_lat', lat.toString());
        localStorage.setItem('last_lon', lon.toString());
        if (manualCity) localStorage.setItem('last_manual_city', manualCity);
      }

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
      // 1. Try to load last known location from cache for instant display
      if (typeof window !== 'undefined') {
        const lastLat = localStorage.getItem('last_lat');
        const lastLon = localStorage.getItem('last_lon');
        const lastManualCity = localStorage.getItem('last_manual_city');
        
        if (lastManualCity && !manualCity) {
           setManualCity(lastManualCity);
           return;
        }

        if (lastLat && lastLon) {
          fetchPrayerTimes(parseFloat(lastLat), parseFloat(lastLon), true);
        }
      }
      
      // 2. Then trigger auto-detect in the background
      handleAutoDetect();
    }
  }, [manualCity]);

  // Ambil statistik gabungan Hi Mufradat + Hi Tikrar dari server
  useEffect(() => {
    if (!user?.id) {
      setCombinedStats(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/dashboard/stats', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json?.data) {
          setCombinedStats({
            streakDays: Number(json.data.streakDays) || 0,
            activity7Days: Array.isArray(json.data.activity7Days)
              ? json.data.activity7Days
              : Array(7).fill(false),
            pageStats: json.data.pageStats,
          });
        }
      } catch (err) {
        console.error('Failed to fetch combined dashboard stats:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Fallback lokal dari quiz_attempts sementara menunggu respon /api/dashboard/stats
  const fallbackStats = useMemo(() => {
    const todayKey = toDateKeyWIB();
    const weekStartKey = getWeekStartKeyWIB(todayKey);
    const activeDates = new Set<string>();
    const passedMufradat: any[] = [];

    quizAttempts?.forEach((a: any) => {
      if (a.created_at) {
        activeDates.add(toDateKeyWIB(a.created_at));
      }
      if (a.quiz_id?.startsWith('mufradat_page_') && a.is_passed) {
        passedMufradat.push(a);
      }
    });

    return {
      streakDays: computeCombinedStreak(activeDates, todayKey),
      activity7Days: computeActivity7Days(activeDates, todayKey),
      pageStats: computeCombinedPageStats({
        mufradatPassedAttempts: passedMufradat,
        tikrarQuizPassed: [],
        tikrarSubmissionsPassed: [],
        pageExamsPassed: [],
        weekStartKey,
      }),
    };
  }, [quizAttempts]);

  const streakDays = combinedStats ? combinedStats.streakDays : fallbackStats.streakDays;
  const activity7Days = combinedStats ? combinedStats.activity7Days : fallbackStats.activity7Days;
  const pageStats = combinedStats ? combinedStats.pageStats : fallbackStats.pageStats;

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
          const { data: existing } = await db
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
        await db
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
        subtitle: `Rp ${(d.amount || 0).toLocaleString('id-ID')}`,
        timestamp: d.created_at || d.createdAt || new Date().toISOString(),
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

  const [activePromoTab, setActivePromoTab] = useState<'mufradat' | 'tikrar'>('mufradat');
  const [isPromoPaused, setIsPromoPaused] = useState(false);

  useEffect(() => {
    if (isPromoPaused) return;
    const timer = setInterval(() => {
      setActivePromoTab((prev) => (prev === 'mufradat' ? 'tikrar' : 'mufradat'));
    }, 5000);
    return () => clearInterval(timer);
  }, [isPromoPaused]);

  // ONBOARDING CHECKLIST LOGIC

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
              <ZapIcon className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37] animate-pulse" />
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



      {/* PWA Install Banner (Visible if not installed) */}
      {!isInstalled && (
        <div className="mx-1 mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
           <button 
             onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
             className="w-full relative group overflow-hidden rounded-3xl bg-white border-2 border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-slate-100/50 hover:border-emerald-200 transition-all active:scale-[0.98]"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
              <div className="flex items-center gap-5 relative z-10">
                 <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner group-hover:rotate-12 transition-transform">
                    <Download className="w-7 h-7" />
                 </div>
                 <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                       <Badge className="bg-emerald-500 text-white text-[8px] font-black tracking-widest uppercase py-0.5 h-4">RECOMMENDED</Badge>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Install App</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Pasang Aplikasi Hi AQLI</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-1.5 opacity-80">Akses lebih cepat & stabil langsung dari layar utama HP {fullSalutation}.</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl text-[10px] shadow-lg group-hover:scale-105 transition-all self-stretch sm:self-auto justify-center uppercase tracking-widest">
                 PASANG SEKARANG <ArrowRight className="w-4 h-4 ml-1" />
              </div>
           </button>
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
            <div className="flex items-center justify-between gap-1 mt-auto">
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-black">{streakDays} Hari</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Streak Belajar</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Mufradat &bull; Tikrar</p>
              </div>
              <div className="flex gap-0.5 shrink-0">
                {activity7Days.map((active, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      active ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "bg-slate-200"
                    )} 
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-b-4 border-[#D4AF37]">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center justify-between">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-50 text-[#D4AF37]"><Target className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black border-amber-200 text-amber-700 bg-amber-50 px-1 h-3 sm:h-4">TARGET</Badge>
            </div>
            <div className="flex items-center justify-between gap-1 mt-auto">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl sm:text-2xl font-black text-black">{pageStats.weekly}</p>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase">/ {pageStats.total} Total</p>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Halaman Pekan Ini</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">
                  Muf {pageStats.mufradat.total} &bull; Tik {pageStats.tikrar.total}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[8px] font-black text-amber-600 uppercase">Min. 1 Hlm</p>
                {pageStats.weekly >= 1 ? (
                  <Badge className="bg-emerald-500 text-white text-[7px] h-3.5 px-1 font-black">TERCAPAI</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400 border-slate-200 text-[7px] h-3.5 px-1 font-black">PROSES</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. POSTER PROMO AUTO-SLIDER: HI MUFRADAT <-> HI TIKRAR 40X (MAROON & GOLD THEME) */}
      {(!user || !isRegistered) && (
        <div
          className="mx-1 mt-2 mb-2 space-y-2.5"
          onMouseEnter={() => setIsPromoPaused(true)}
          onMouseLeave={() => setIsPromoPaused(false)}
          onTouchStart={() => setIsPromoPaused(true)}
          onTouchEnd={() => setIsPromoPaused(false)}
        >
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActivePromoTab('mufradat')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black tracking-wide transition-all",
                activePromoTab === 'mufradat'
                  ? "bg-white text-[#800000] shadow-sm"
                  : "text-slate-600 hover:text-[#800000]"
              )}
            >
              <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Hi Mufradat</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePromoTab('tikrar')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black tracking-wide transition-all",
                activePromoTab === 'tikrar'
                  ? "bg-white text-[#800000] shadow-sm"
                  : "text-slate-600 hover:text-[#800000]"
              )}
            >
              <Award className="w-3.5 h-3.5 text-[#800000]" />
              <span>Hi Tikrar 40x</span>
            </button>
          </div>

          {/* Sliding Track */}
          <div className="overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: activePromoTab === 'mufradat' ? "translateX(0%)" : "translateX(-100%)" }}
            >
              {/* Slide 1: Hi Mufradat */}
              <Link
                href={user ? "/study-circles/registration?id=mufradat-premium" : "/register"}
                className="w-full shrink-0 block"
              >
                <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-[#800000] to-[#500000] shadow-2xl transition-all duration-500 border border-[#D4AF37]/30 h-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-3xl -mr-20 -mt-20 rounded-full animate-pulse" />
                  <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <div className="flex-1 text-center sm:text-left">
                      <Badge className="bg-amber-400 text-[#800000] mb-4 font-black tracking-widest uppercase py-1 px-3 animate-bounce">
                        PROGRAM GRATIS!
                      </Badge>
                      <h2 className="text-3xl sm:text-4xl font-black text-white font-headline leading-tight mb-3">
                        Level Up Hafalan<br />
                        <span className="text-amber-400">Hi Mufradat</span>
                      </h2>
                      <p className="text-slate-100 text-sm font-medium leading-relaxed mb-6 opacity-90 max-w-md">
                        Bukan sekadar setoran, tapi menguasai setiap kata! Gabung sekarang dan dapatkan sistem mentoring harian yang asyik bersama Admin AQLI.
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">Ajak Teman Belajar Bareng</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">100% Gratis • Semua Juz Terbuka!</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <div className="flex items-center justify-center gap-2 bg-[#D4AF37] text-[#800000] font-black px-6 py-3 rounded-xl text-xs shadow-lg group-hover:scale-105 transition-all">
                        DAFTAR HI MUFRADAT <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Slide 2: Hi Tikrar 40x (Maroon & Gold Theme — No Green) */}
              <Link
                href={user ? "/study-circles/registration?id=tikrar-premium" : "/register"}
                className="w-full shrink-0 block"
              >
                <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-[#800000] via-[#600000] to-[#3b0000] shadow-2xl transition-all duration-500 border border-[#D4AF37]/40 h-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-3xl -mr-20 -mt-20 rounded-full animate-pulse" />
                  <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                        <Badge className="bg-amber-400 text-[#800000] font-black tracking-widest uppercase py-1 px-3 animate-bounce">
                          METODE ITQAN 40X • GRATIS!
                        </Badge>
                        <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-amber-300">
                          <span className="w-2 h-2 rounded-xs bg-amber-400 inline-block" />
                          <span className="w-2 h-2 rounded-xs bg-sky-400 inline-block" />
                          <span className="w-2 h-2 rounded-xs bg-rose-400 inline-block" />
                          4 Blok &amp; Tajwid Warna
                        </span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black text-white font-headline leading-tight mb-3">
                        Mutqin Hafalan<br />
                        <span className="text-amber-400">Hi Tikrar 40x</span>
                      </h2>
                      <p className="text-slate-100 text-sm font-medium leading-relaxed mb-6 opacity-90 max-w-md">
                        Hafalan kuat &amp; terstruktur dengan Mushaf 4 Blok Warna Syaamil, Tajwid Warna, audio simak 5x, counter repetisi 40x otomatis, hingga simulasi &amp; setoran ujian halaman.
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">Counter 4 Blok &amp; Tajwid Warna</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">100% Gratis • Semua 30 Juz!</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <div className="flex items-center justify-center gap-2 bg-[#D4AF37] text-[#800000] font-black px-6 py-3 rounded-xl text-xs shadow-lg group-hover:scale-105 transition-all">
                        MULAI HI TIKRAR <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            <button
              type="button"
              aria-label="Poster Hi Mufradat"
              onClick={() => setActivePromoTab('mufradat')}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activePromoTab === 'mufradat' ? "w-6 bg-[#800000]" : "w-1.5 bg-slate-300"
              )}
            />
            <button
              type="button"
              aria-label="Poster Hi Tikrar"
              onClick={() => setActivePromoTab('tikrar')}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activePromoTab === 'tikrar' ? "w-6 bg-[#800000]" : "w-1.5 bg-slate-300"
              )}
            />
          </div>
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

          {/* Hi Sehat */}
          <Link href="/sehat" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] font-bold text-center tracking-tight text-slate-700 leading-tight">Hi Sehat</span>
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
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ajak Teman Belajar Al-Qur&apos;an</h3>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Syiar Kebaikan &amp; Pahala Jariyah</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kode Undangan {fullSalutation}</p>
                  <div className="text-2xl font-black text-[#800000] tracking-[0.3em] font-mono">
                    {userData.referral_code}
                  </div>
                </div>
              </div>

              {/* Common Invite Text Generator */}
              {(() => {
                const origin = "https://hiaqli.pro";
                const mufradatLink = `${origin}/register?ref=${userData.referral_code}&program=mufradat`;
                
                const promoTexts: Record<string, string> = {
                  mufradat: `*NAIK LEVEL PAHAM AL-QUR'AN DENGAN KUIS SERU!* 📈✨\n*HI MUFRADAT* - By AQLI\n\nIngin bacaan Al-Qur'anmu tak sekadar lewat di lisan, tapi juga meresap dalam ke hati? Yuk, naikkan level pemahamanmu dengan cara yang seru dan bikin nagih! 🌿\n\nDi Hi Mufradat, setiap ayat adalah tantangan baru untuk dimenangkan! ✨\n\n🚀 *MISI SPESIAL UNTUKMU:*\n✅ *Kuasai Mufradat Al-Qur'an*: Pecahkan kuis harian yang dirancang khusus untuk mengasah hafalan maknamu! 🕹️\n✅ *Panjat Leaderboard*: Kumpulkan poin dari setiap jawaban benar dan jadilah yang terbaik di grup thalibah! 🏆\n✅ *Progress Bertahap*: Minimal 1 halaman per pekan, rasakan kedekatan yang berbeda saat berinteraksi dengan Kalam-Nya. 📈\n✅ *Komunitas Aktif*: Berjuang bareng teman-teman dengan visi yang sama untuk jadi Ahlul Qur'an. 🤝\n\n🤝 *YUK BELAJAR BARENG DI HI AQLI!*\nGunakan kode undangan saya: *${userData.referral_code}* saat mendaftar agar kita bisa saling menyemangati! 🌿\n\nSiap Menjadi Master Mufradat? Mulai Petualanganmu Sekarang:\n🔗 ${mufradatLink}\n\n---\n*Berhijrah dengan Ilmu, Beramal dengan Itqan.*`,
                  tikrar: `*HAFAL AL-QUR'AN JADI PETUALANGAN SERU!* 📖🚀\n*HI TIKRAR* - By AQLI\n\nIngin hafalan Al-Qur'an ${fullSalutation} sekuat karang dan anti-lupa? Yuk, taklukkan tantangan hafalan dengan sistem monitoring harian yang bikin semangat! 🕋\n\n🚀 *MISI HAFALANMU:*\n✅ *7 Tahapan Itqan*: Metode sistematis yang bikin hafalan nempel terus! 🧠\n✅ *Daily Monitoring*: Progressmu dipantau setiap hari, gak bakal melenceng! 🎯\n✅ *Teman Murojaah*: Semangat bareng thalibah lain agar istiqomah terjaga! 🤝\n\n🤝 *YUK BELAJAR BARENG DI HI AQLI!*\nGunakan kode undangan saya: *${userData.referral_code}* saat mendaftar agar kita bisa saling menyemangati! 🌿\n\nSiap Jadi Penjaga Al-Qur'an? Join Sekarang:\n🔗 ${origin}/register?ref=${userData.referral_code}&program=tikrar\n\n---\n*Berhijrah dengan Ilmu, Beramal dengan Itqan.*`,
                  ngaji: `*BACA AL-QUR'AN JADI LEBIH TARTIL & PERCAYA DIRI!* 📚✨\n*HI NGAJI* - By AQLI\n\nIngin memperbaiki bacaan dari nol sampai mahir? Yuk, rasakan asyiknya belajar tahsin & tajwid bareng muallimah yang sabar & kompeten! 🕋\n\n🌟 *PENGALAMAN BELAJARMU:*\n✅ *Bimbingan Intensif*: Belajar dari dasar sampai tartil sesuai kaidah tajwid! 🎓\n✅ *Koreksi Detail*: Tajwid & makhroj diperbaiki sampai benar-benar fasih! 🗣️\n\n🤝 *YUK BELAJAR BARENG DI HI AQLI!*\nGunakan kode undangan saya: *${userData.referral_code}* saat mendaftar agar kita bisa saling menyemangati! 🌿\n\nDaftar Sekarang:\n🔗 ${origin}/register?ref=${userData.referral_code}&program=ngaji\n\n---\n*Berhijrah dengan Ilmu, Beramal dengan Itqan.*`,
                  irab: `*SELAMI RAHASIA BAHASA LANGIT DENGAN MUDAH!* 🔍📖\n*HI IRAB* - By AQLI\n\nIngin memahami alasan di balik setiap harokat dan keindahan tata bahasa Al-Qur'an? Yuk, pecahkan misteri I'rab dengan cara yang simpel dan menyenangkan! 🕋\n\n✨ *LEVEL UP PEMAHAMANMU:*\n✅ *Analisis Mendalam*: Pahami struktur kalimat Al-Qur'an secara detail. 🧐\n✅ *Simpel & Praktis*: Metode yang dirancang khusus agar mudah dipahami siapa saja! 🎓\n\n🤝 *YUK BELAJAR BARENG DI HI AQLI!*\nGunakan kode undangan saya: *${userData.referral_code}* saat mendaftar agar kita bisa saling menyemangati! 🌿\n\nDaftar Sekarang:\n🔗 ${origin}/register?ref=${userData.referral_code}&program=irab\n\n---\n*Berhijrah dengan Ilmu, Beramal dengan Itqan.*`
                };

                const promoItems = [
                  { id: 'mufradat', name: 'Hi Mufradat', icon: Activity, color: 'bg-amber-400', locked: false },
                  { id: 'tikrar', name: 'Hi Tikrar', icon: Award, color: 'bg-indigo-400', locked: false },
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
                          BAGIKAN AJAKAN KE TEMAN
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-white rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="text-center text-[#800000] font-black uppercase tracking-widest text-xl">Ajak Teman Belajar</DialogTitle>
                          <DialogDescription className="text-[10px] font-bold text-center uppercase tracking-tight text-slate-500">
                            Pilih program yang ingin {fullSalutation} bagikan untuk mengajak teman belajar Al-Qur&apos;an bersama di Hi AQLI.
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
                                     <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Bagikan link ajakan belajar bareng dari {fullSalutation}</p>
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
                        <p className="text-[9px] text-center text-slate-400 font-medium italic">Klik salah satu program untuk membagikan ajakan belajar via WhatsApp.</p>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer: Community Links */}
      <div className="mt-8 mb-4 px-4 py-8 bg-[#800000]/5 rounded-[2.5rem] border border-[#800000]/10 flex flex-col items-center gap-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black text-[#800000] uppercase tracking-[0.2em]">Gabung Komunitas Kami</p>
          <h3 className="text-lg font-black text-slate-800 font-headline">Lebih Dekat Dengan Al-Qur'an</h3>
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full max-w-md px-1">
          <a
            href="https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 shadow-md shadow-[#25D366]/20"
          >
            {/* Official WhatsApp Logo SVG */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.459 3.474 1.332 4.988L2 22l5.182-1.359c1.464.799 3.111 1.221 4.849 1.221h.004c5.515 0 9.969-4.453 9.969-9.969 0-2.664-1.037-5.168-2.921-7.051C17.199 3.037 14.695 2 12.031 2zm5.823 14.281c-.246.693-1.432 1.326-1.995 1.411-.513.077-1.162.109-1.876-.118-.433-.138-.988-.321-1.7-.628-2.992-1.291-4.946-4.303-5.095-4.502-.149-.199-1.216-1.618-1.216-3.086 0-1.469.769-2.191 1.043-2.489.273-.299.596-.374.795-.374.199 0 .397.002.571.01.183.009.428-.07.67.511.248.597.844 2.065.919 2.214.074.149.124.324.025.523-.099.199-.149.323-.298.498-.149.174-.313.389-.447.523-.149.149-.304.311-.131.609.174.299.772 1.274 1.658 2.063 1.139 1.015 2.099 1.329 2.397 1.479.298.149.472.124.646-.075.174-.199.745-.871.944-1.169.199-.299.397-.249.67-.149.274.099 1.739.821 2.037.97.298.149.497.224.571.348.075.125.075.722-.171 1.415z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-wider">Grup WA</span>
          </a>

          <a
            href="https://whatsapp.com/channel/0029Vb5sNGZ9mrGkJGzEh421"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#075E54] hover:bg-[#064e46] text-white rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 shadow-md shadow-[#075E54]/20"
          >
            {/* Official WhatsApp Channel Logo SVG (WhatsApp Badge + Broadcast Waves) */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.459 3.474 1.332 4.988L2 22l5.182-1.359c1.464.799 3.111 1.221 4.849 1.221h.004c5.515 0 9.969-4.453 9.969-9.969 0-2.664-1.037-5.168-2.921-7.051C17.199 3.037 14.695 2 12.031 2zm4.324 12.893l-4.53-1.51v2.115c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-2.615l-1.92-.64c-.483-.161-.809-.613-.809-1.122v-1.222c0-.509.326-.961.809-1.122l8.15-2.717c.486-.162.986.2 1.986.712v6.41c0 .512-.5.874-.986.711z" />
              <path d="M17.5 8.5c.828 0 1.5 1.343 1.5 3s-.672 3-1.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-wider">Channel WA</span>
          </a>

          <a
            href="https://t.me/rq_aqli"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#229ED9] hover:bg-[#1c8ec4] text-white rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 shadow-md shadow-[#229ED9]/20"
          >
            {/* Official Telegram Paper Plane Logo SVG */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-wider">Telegram</span>
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
