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
  HeartPulse,
  ChevronLeft,
  Heart,
  Info,
  CheckSquare,
  BarChart3,
  Calendar,
  Zap,
  Sun,
  Flame,
  Utensils,
  Droplets,
  Wind,
  Shield,
  Activity,
  Smile,
  AlertTriangle,
  RotateCcw,
  Scale
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Link from "next/link";
import {useUser, db } from "@/db";
import { useCollection } from "@/db";
import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from 'canvas-confetti';

// Interface definitions
interface SehatItem {
  id: string;
  label: string;
  sub: string;
  category: 'harian' | 'mingguan' | 'bulanan';
  subCategory?: string;
  dalil: string;
  medis: string;
  icon?: any;
}

interface SehatQuote {
  text: string;
  source: string;
  type: 'hadits' | 'ayat';
}

// Healthy lifestyle quotes / Hadith
const sehatQuotes: SehatQuote[] = [
  {
    text: "Dua nikmat yang banyak manusia tertipu di dalamnya: nikmat sehat dan waktu luang.",
    source: "HR. Bukhari no. 6412",
    type: 'hadits'
  },
  {
    text: "Mukmin yang kuat lebih baik dan lebih dicintai Allah daripada Mukmin yang lemah; dan pada keduanya ada kebaikan.",
    source: "HR. Muslim no. 2664",
    type: 'hadits'
  },
  {
    text: "Lambung manusia tidak memenuhi wadah yang lebih buruk daripada perutnya. Cukuplah bagi anak Adam mengonsumsi beberapa suap makanan untuk menegakkan tulang punggungnya. Jika harus melebihi, maka sepertiga untuk makanannya, sepertiga untuk minumannya, dan sepertiga untuk napasnya.",
    source: "HR. Tirmidzi no. 2380 (Shahih)",
    type: 'hadits'
  },
  {
    text: "Gunakanlah zaitun sebagai lauk dan berminyaklah dengannya, karena ia berasal dari pohon yang berkah.",
    source: "HR. Tirmidzi & Ibnu Majah (Shahih)",
    type: 'hadits'
  },
  {
    text: "Sesungguhnya pada jintan hitam (habbatussauda) terdapat obat bagi segala penyakit kecuali kematian.",
    source: "HR. Bukhari no. 5688 & Muslim no. 2215",
    type: 'hadits'
  },
  {
    text: "Barangsiapa mengonsumsi tujuh butir kurma ajwah di pagi hari, maka hari itu ia tidak akan terkena racun maupun sihir.",
    source: "HR. Bukhari no. 5445",
    type: 'hadits'
  }
];

export default function HiSehatPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [localLogs, setLocalLogs] = useState<any[]>([]); // Guest local persistence
  const [optimisticLogs, setOptimisticLogs] = useState<Record<string, boolean>>({});
  const [activePlateSection, setActivePlateSection] = useState<'makanan' | 'minuman' | 'udara' | null>(null);
  
  // Random quotes
  const [quoteIndex, setQuoteIndex] = useState(0);
  const currentQuote = useMemo(() => sehatQuotes[quoteIndex], [quoteIndex]);

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % sehatQuotes.length);
  };

  // Checklist data
  const sehatItems = useMemo<SehatItem[]>(() => [
    // A. Pola Tidur & Bangun (Siklus Sirkadian)
    {
      id: 'sehat_tidur_awal',
      label: 'Tidur Awal (Setelah Isya)',
      sub: 'Menghindari begadang untuk regenerasi sel.',
      category: 'harian',
      subCategory: 'Tidur & Sirkadian',
      dalil: 'Kebiasaan Nabi setelah Isya (HR. Bukhari & Muslim)',
      medis: 'Menjaga keseimbangan hormon pembakar lemak, mempercepat regenerasi otot/sendi pasca-cedera, dan mencegah rasa lapar tengah malam yang memicu GERD.'
    },
    {
      id: 'sehat_tidur_kanan',
      label: 'Tidur Miring ke Kanan',
      sub: 'Posisi tidur anatomis sesuai Sunnah.',
      category: 'harian',
      subCategory: 'Tidur & Sirkadian',
      dalil: 'Sunnah tidur Nabi (HR. Bukhari no. 247)',
      medis: 'Mengurangi tekanan mekanis pada jantung, melindungi hati (liver), serta mencegah refluks asam lambung ke kerongkongan.'
    },
    {
      id: 'sehat_bangun_subuh',
      label: 'Bangun Sebelum Subuh',
      sub: 'Memulai aktivitas di waktu pagi yang berkah.',
      category: 'harian',
      subCategory: 'Tidur & Sirkadian',
      dalil: 'Doa keberkahan pagi Nabi (HR. Abu Dawud)',
      medis: 'Meningkatkan kesegaran paru-paru dengan udara pagi beroksigen tinggi, Tahajjud sebagai sarana relaksasi kortisol (stres) & peregangan sendi secara perlahan.'
    },

    // B. Pola Makan & Adab Makan
    {
      id: 'sehat_sepertiga_lambung',
      label: 'Aturan Sepertiga Lambung',
      sub: 'Makan saat lapar & berhenti sebelum kenyang.',
      category: 'harian',
      subCategory: 'Pola & Adab Makan',
      dalil: 'Proporsi makan Nabi (HR. Tirmidzi no. 2380)',
      medis: 'Kunci mutlak mencegah lambung terisi terlalu penuh. Pembagian 1/3 makanan, 1/3 air, dan 1/3 kosong mencegah naiknya asam lambung (refluks GERD).'
    },
    {
      id: 'sehat_mengunyah_perlahan',
      label: 'Mengunyah Makanan Perlahan',
      sub: 'Mengunyah hingga halus (30-40 kali).',
      category: 'harian',
      subCategory: 'Pola & Adab Makan',
      dalil: 'Adab makan tenang & tidak terburu-buru',
      medis: 'Membantu kerja enzim ptialin mulut, meringankan beban kerja mekanik lambung yang sensitif GERD, serta menstimulasi rasa kenyang alami agar tidak makan berlebih.'
    },
    {
      id: 'sehat_makan_duduk',
      label: 'Makan & Minum Sambil Duduk',
      sub: 'Adab makan yang tenang dan tertib.',
      category: 'harian',
      subCategory: 'Pola & Adab Makan',
      dalil: 'Larangan minum berdiri (HR. Muslim no. 2026)',
      medis: 'Menjaga cairan tubuh agar terserap merata (penting bagi Anda dengan darah rendah) serta merilekskan sfingter lambung guna mencegah dispepsia.'
    },
    {
      id: 'sehat_tidak_tidur_makan',
      label: 'Tidak Tidur Setelah Makan',
      sub: 'Jeda minimal 2-3 jam sebelum berbaring.',
      category: 'harian',
      subCategory: 'Pola & Adab Makan',
      dalil: 'Dianjurkan berjalan/shalat setelah makan',
      medis: 'Gaya gravitasi membantu menjaga makanan tetap di lambung. Berbaring langsung setelah makan mempercepat naiknya asam lambung ke esofagus.'
    },
    {
      id: 'sehat_makan_sederhana',
      label: 'Konsumsi Makanan Sederhana',
      sub: 'Diet rendah purin & rendah kolesterol.',
      category: 'harian',
      subCategory: 'Pola & Adab Makan',
      dalil: 'Nabi menyukai makanan sederhana & nabati',
      medis: 'Menghindari konsumsi jeroan (ati ampela), gorengan, dan daging merah berlemak tinggi. Utamakan protein nabati, sayur rendah purin, untuk menurunkan kolesterol jahat (LDL) & asam urat.'
    },

    // C. Konsumsi Thibbun Nabawi
    {
      id: 'sehat_kurma_pagi',
      label: '3 Butir Kurma di Pagi Hari',
      sub: 'Sarapan pagi ganjil dengan kurma ajwah/biasa.',
      category: 'harian',
      subCategory: 'Thibbun Nabawi',
      dalil: 'Konsumsi kurma pagi hari (HR. Bukhari no. 5445)',
      medis: 'Kaya akan kalium dan serat larut. Membantu regulasi tekanan darah (darah rendah) dan melancarkan pencernaan tanpa memicu asam lambung berlebih.'
    },
    {
      id: 'sehat_minyak_zaitun',
      label: 'Minyak Zaitun (Olive Oil)',
      sub: '1 sendok teh langsung atau dicampur ke sayur hangat.',
      category: 'harian',
      subCategory: 'Thibbun Nabawi',
      dalil: 'Minyak dari pohon yang berkah (HR. Tirmidzi)',
      medis: 'Mengandung lemak tak jenuh tunggal tinggi (MUFA) yang efektif menaikkan kolesterol baik (HDL) dan menurunkan kolesterol jahat (LDL).'
    },
    {
      id: 'sehat_air_hangat',
      label: 'Minum Air Putih Hangat Cukup',
      sub: 'Minimal 2 liter air putih sepanjang hari.',
      category: 'harian',
      subCategory: 'Thibbun Nabawi',
      dalil: 'Sunnah minum air secara bertahap & tenang',
      medis: 'Sangat vital untuk melarutkan kristal asam urat agar terbuang melalui urin, serta menjaga volume plasma darah agar tekanan darah tidak drop.'
    },
    {
      id: 'sehat_habbatussauda',
      label: 'Habbatussauda (Jintan Hitam)',
      sub: 'Konsumsi 1-2 kapsul minyak atau bubuk.',
      category: 'harian',
      subCategory: 'Thibbun Nabawi',
      dalil: 'Obat segala penyakit kecuali mati (HR. Bukhari)',
      medis: 'Bertindak sebagai antiinflamasi (anti-radang) alami, membantu meredakan rasa gatal-gatal pada kulit akibat respons imun berlebih.'
    },

    // D. Aktivitas Fisik & Kebersihan
    {
      id: 'sehat_jalan_cepat',
      label: 'Jalan Kaki Cepat Ringan',
      sub: 'Jalan kaki pasca-Subuh selama 20 menit di tempat datar.',
      category: 'harian',
      subCategory: 'Aktivitas & Kebersihan',
      dalil: 'Langkah jalan kaki Nabi yang tegap & cepat',
      medis: 'Melatih sendi kaki secara aman tanpa beban berlebih (low-impact) yang aman bagi riwayat cedera sendi/otot Anda.'
    },
    {
      id: 'sehat_wudhu_siwak',
      label: 'Menjaga Wudhu & Bersiwak',
      sub: 'Menjaga kebersihan mulut & fisik berkala.',
      category: 'harian',
      subCategory: 'Aktivitas & Kebersihan',
      dalil: 'Bersiwak membersihkan mulut (HR. Bukhari)',
      medis: 'Menjaga higiene oral mencegah masuknya bakteri patogen, serta kebersihan kulit meminimalkan infeksi pemicu gatal-gatal peradangan.'
    },

    // E. Kesehatan Mental & Emosional
    {
      id: 'sehat_dzikir_pagi_petang',
      label: 'Dzikir Pagi & Petang',
      sub: 'Spiritual mindfulness penenang jiwa.',
      category: 'harian',
      subCategory: 'Spiritual Mindfulness',
      dalil: 'Dzikir pagi petang (QS. Al-Ahzab: 42-43)',
      medis: 'Meditasi spiritual yang terbukti menurunkan hormon stres (kortisol). Sangat meredakan stres psikosomatis yang sering memicu naiknya asam lambung.'
    },
    {
      id: 'sehat_shalat_waktu',
      label: 'Shalat Tepat Waktu dengan Tuma\'ninah',
      sub: 'Shalat 5 waktu dan peregangan sendi.',
      category: 'harian',
      subCategory: 'Spiritual Mindfulness',
      dalil: 'Shalat tepat waktu (HR. Bukhari)',
      medis: 'Gerakan ruku dan sujud yang tenang bertindak sebagai terapi peregangan sendi/otot pasca-cedera secara bertahap dan aman.'
    },

    // 2. Mingguan
    {
      id: 'sehat_puasa_senin_kamis',
      label: 'Puasa Sunnah Senin & Kamis',
      sub: 'Detoksifikasi mingguan & kontrol kolesterol.',
      category: 'mingguan',
      dalil: 'Amalan disodorkan Senin & Kamis (HR. Tirmidzi)',
      medis: 'Membantu menurunkan LDL & mengontrol berat badan. Catatan GERD: WAJIB sahur. Saat berbuka hindari gorengan/makanan pedas langsung. Awali air hangat & kurma.'
    },
    {
      id: 'sehat_camilan_mingguan',
      label: 'Evaluasi Camilan Sehat Pekanan',
      sub: 'Bebas gorengan & kue kering kalengan.',
      category: 'mingguan',
      dalil: 'Makan dari makanan yang baik-baik (QS. Al-Baqarah: 172)',
      medis: 'Memastikan tidak ada asupan lemak trans/jenuh pekanan. Ganti camilan dengan edamame rebus atau buah non-asam seperti pepaya/pisang.'
    },

    // 3. Bulanan
    {
      id: 'sehat_ayyamul_bidh',
      label: 'Puasa Ayyamul Bidh (13, 14, 15 Hijriah)',
      sub: 'Pembatasan kalori berkala bulanan.',
      category: 'bulanan',
      dalil: 'Wasiat puasa tiga hari sebulan (HR. Bukhari & Muslim)',
      medis: 'Mengurangi beban metabolik tubuh, membantu penurunan berat badan secara konsisten dan menyeimbangkan kadar kolesterol tubuh.'
    },
    {
      id: 'sehat_bekam_hijamah',
      label: 'Terapi Bekam (Hijamah) Berkala',
      sub: 'Dilakukan di pertengahan bulan Hijriah.',
      category: 'bulanan',
      dalil: 'Bekam kesembuhan bagi umatku (HR. Bukhari)',
      medis: 'Membantu detoksifikasi sirkulasi mikro. PENTING: Karena Anda memiliki riwayat darah rendah, wajib berkonsultasi dengan dokter medis & lakukan bekam steril untuk cegah hipotensi mendadak.'
    }
  ], []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }, []);

  // Database connection options
  const logsOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'date', operator: '>=', value: thirtyDaysAgoStr }
    ]
  }), [user?.id, thirtyDaysAgoStr]);

  const { data: dbLogs, refresh: reloadDbLogs } = useCollection("mutabaah_logs", logsOptions);

  // Combine database logs with local logs / optimistic updates
  const todayLogs = useMemo(() => {
    const fetched = dbLogs?.filter((l: any) => l.date === todayStr) || [];
    const result = [...fetched];
    
    // Apply optimistic updates
    Object.entries(optimisticLogs).forEach(([activityId, completed]) => {
      const idx = result.findIndex(l => l.activity_id === activityId);
      if (idx !== -1) {
        result[idx] = { ...result[idx], completed };
      } else if (completed) {
        result.push({ activity_id: activityId, completed: true, date: todayStr });
      }
    });

    return result;
  }, [dbLogs, todayStr, optimisticLogs]);

  // Load guest logs from local storage
  const [guestHistoricalLogs, setGuestHistoricalLogs] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sehat_guest_logs_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setGuestHistoricalLogs(parsed);
        // Set local logs for today
        const todayLocal = parsed.filter((l: any) => l.date === todayStr);
        setLocalLogs(todayLocal);
      }
    }
  }, [todayStr]);

  const saveToGuestHistory = (activityId: string, completed: boolean, date: string) => {
    setGuestHistoricalLogs(prev => {
      const newHistory = completed 
        ? [...prev, { activity_id: activityId, completed, date }]
        : prev.filter(l => !(l.activity_id === activityId && l.date === date));
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filtered = newHistory.filter(l => new Date(l.date) >= thirtyDaysAgo);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('sehat_guest_logs_history', JSON.stringify(filtered));
      }
      return filtered;
    });

    setLocalLogs(prev => {
      return completed
        ? [...prev, { activity_id: activityId, completed, date }]
        : prev.filter(l => l.activity_id !== activityId);
    });
  };

  const toggleChecklist = async (activityId: string) => {
    const isDone = user
      ? !!todayLogs.find((l: any) => l.activity_id === activityId)?.completed
      : !!localLogs.find((l: any) => l.activity_id === activityId)?.completed;

    const completed = !isDone;

    // Check confetti trigger (if all daily items except this one were completed and now we complete this one)
    const dailyItems = sehatItems.filter(item => item.category === 'harian');
    const logs = user ? todayLogs : localLogs;
    const completedCountBefore = dailyItems.filter(m => {
      if (m.id === activityId) return false;
      return logs.find((l: any) => l.activity_id === m.id)?.completed;
    }).length;

    if (completed && completedCountBefore === dailyItems.length - 1) {
      // Trigger canvas-confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      toast({
        title: "Masya Allah! Sempurna!",
        description: "Ukhti telah menyelesaikan seluruh checklist pola hidup sehat hari ini!",
        variant: "default",
      });
    }

    if (!user) {
      // Guest local persistence
      saveToGuestHistory(activityId, completed, todayStr);
      toast({
        title: "Langkah Tersimpan secara Lokal",
        description: "Masya Allah! Silakan masuk (login) untuk simpan permanen & meraih HI Poin.",
      });
      return;
    }

    // Optimistic Update
    setOptimisticLogs(prev => ({ ...prev, [activityId]: completed }));

    const { error } = await db
      .from("mutabaah_logs")
      .upsert({
        user_id: user.id,
        activity_id: activityId,
        date: todayStr,
        completed
      }, { onConflict: 'user_id,activity_id,date' });

    if (error) {
       // Rollback optimistic update
       setOptimisticLogs(prev => {
        const next = { ...prev };
        delete next[activityId];
        return next;
      });
      console.error("DEBUG [Hi Sehat]: Save failed", error);
      toast({
        title: "Gagal Menyimpan",
        description: `Terjadi galat: ${error.message}. Hubungi admin.`,
        variant: "destructive"
      });
      return;
    }

    reloadDbLogs();
  };

  // Progress counts for daily items
  const dailyChecklistItems = useMemo(() => sehatItems.filter(item => item.category === 'harian'), [sehatItems]);
  
  const dailyProgressCount = useMemo(() => {
    const logs = user ? todayLogs : localLogs;
    return dailyChecklistItems.filter(m => logs.find((l: any) => l.activity_id === m.id)?.completed).length;
  }, [user, todayLogs, localLogs, dailyChecklistItems]);

  const dailyProgressPercent = Math.min(100, Math.round((dailyProgressCount / dailyChecklistItems.length) * 100)) || 0;

  // Streak, Heatmap and Trends
  const history30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const monitoringStats = useMemo(() => {
    const logsData = user ? dbLogs : guestHistoricalLogs;
    if (!logsData) return { averageMonthly: 0, currentStreak: 0, heatmap: [], dailyTrend: [] };

    // Calculate current streak
    let currentStreak = 0;
    let tempDate = new Date();
    for (let i = 0; i < 30; i++) {
      const dStr = tempDate.toISOString().split('T')[0];
      const completedDayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && l.activity_id.startsWith('sehat_'));
      if (completedDayLogs.length > 0) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        if (i === 0) {
          tempDate.setDate(tempDate.getDate() - 1);
          continue; 
        }
        break;
      }
    }

    // Heatmap data
    const heatmap = history30Days.map(dStr => {
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && l.activity_id.startsWith('sehat_'));
      const uniqueDay = new Set(dayLogs.map((l: any) => l.activity_id));
      const percent = dailyChecklistItems.length > 0 ? (uniqueDay.size / dailyChecklistItems.length) : 0;
      
      let level = 0;
      if (percent > 0) level = 1;
      if (percent > 0.3) level = 2;
      if (percent > 0.6) level = 3;
      if (percent > 0.8) level = 4;

      return { date: dStr, level, count: uniqueDay.size };
    });

    // 7-day trend
    const dailyTrend = history30Days.slice(-7).map(dStr => {
      const dayLogs = logsData.filter((l: any) => l.date === dStr && l.completed && l.activity_id.startsWith('sehat_'));
      const uniqueDay = new Set(dayLogs.map((l: any) => l.activity_id));
      return {
        date: dStr,
        percent: dailyChecklistItems.length > 0 ? Math.min(100, Math.round((uniqueDay.size / dailyChecklistItems.length) * 100)) : 0
      };
    });

    const averageMonthly = Math.round(
      heatmap.reduce((acc, curr) => acc + curr.count, 0) / 30
    ) || 0;

    return {
      averageMonthly,
      currentStreak,
      heatmap,
      dailyTrend
    };
  }, [user, dbLogs, guestHistoricalLogs, dailyChecklistItems, history30Days]);

  return (
    <div className="flex flex-col min-h-screen bg-emerald-50/20 pb-20">
      <Tabs defaultValue="evaluasi" className="w-full">
        {/* Guest Preview Banner */}
        {!user && (
          <div className="bg-gradient-to-r from-emerald-600 to-[#800000] p-4 text-white text-center animate-in slide-in-from-top-2 duration-500 sticky top-0 z-50 shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse text-amber-300 fill-amber-300" /> 
              Masuk akun untuk sinkronisasi amalan Sunnah sehat Ukhti secara permanen
              <Sparkles className="w-4 h-4 animate-pulse text-amber-300 fill-amber-300" />
            </p>
            <Button asChild variant="link" className="text-white font-bold p-0 h-auto text-[10px] uppercase underline mt-0.5">
              <Link href="/login">Klik di sini untuk login</Link>
            </Button>
          </div>
        )}

        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" className="rounded-full text-[#800000] hover:bg-emerald-50">
                <Link href="/"><ChevronLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="text-lg font-black text-[#800000] leading-none uppercase tracking-tight">Hi Sehat</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Sunnah & Thibbun Nabawi Medis</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
              {user ? `${dailyProgressPercent}% TUNTAS HARI INI` : 'PREVIEW TAMU'}
            </Badge>
          </div>

          <TabsList className="w-full h-12 bg-transparent border-t border-emerald-50 rounded-none p-0">
            <TabsTrigger 
              value="evaluasi" 
              className="flex-1 h-full rounded-none data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 font-black text-[10px] uppercase tracking-widest text-slate-500"
            >
              Evaluasi
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring" 
              className="flex-1 h-full rounded-none data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 font-black text-[10px] uppercase tracking-widest text-slate-500"
            >
              Monitoring & Info
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Evaluasi (Checklist & Stomach Plate) */}
        <TabsContent value="evaluasi" className="mt-0 outline-none">
          <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
            
            {/* Progress Card */}
            <Card className="border-none shadow-xl bg-white overflow-hidden relative border-b-4 border-emerald-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-end mb-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Target Hidup Sehat</p>
                    <h2 className="text-3xl font-black text-slate-900 leading-none">
                      {dailyProgressCount} <span className="text-sm font-bold text-muted-foreground">/ {dailyChecklistItems.length} Poin Harian</span>
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">{dailyProgressPercent}%</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Tingkat Kepatuhan</p>
                  </div>
                </div>
                <Progress value={dailyProgressPercent} className="h-3 bg-emerald-50 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#800000] [&>div]:to-emerald-500" />
              </CardContent>
            </Card>

            {/* Piring Makan Sepertiga Lambung (Interactive UI Component) */}
            <Card className="border-none shadow-lg bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Utensils className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Piring Makan Sunnah-Medis (Aturan Sepertiga Lambung)
                  </h3>
                </div>
                
                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                  Nabi Muhammad SAW mengajarkan pembagian lambung demi kesehatan jasmani. Klik bagian lambung di bawah untuk melihat rincian medis serta rekomendasi porsinya:
                </p>

                {/* SVG Plate representation */}
                <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md select-none">
                      {/* Section 1: Makanan (1/3) */}
                      <path
                        d="M 50 50 L 50 10 A 40 40 0 0 1 84.6 70 Z"
                        fill={activePlateSection === 'makanan' ? '#10b981' : '#a7f3d0'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all duration-300 hover:opacity-90"
                        onClick={() => setActivePlateSection('makanan')}
                      />
                      {/* Section 2: Minuman (1/3) */}
                      <path
                        d="M 50 50 L 84.6 70 A 40 40 0 0 1 15.4 70 Z"
                        fill={activePlateSection === 'minuman' ? '#0ea5e9' : '#bae6fd'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all duration-300 hover:opacity-90"
                        onClick={() => setActivePlateSection('minuman')}
                      />
                      {/* Section 3: Udara / Kosong (1/3) */}
                      <path
                        d="M 50 50 L 15.4 70 A 40 40 0 0 1 50 10 Z"
                        fill={activePlateSection === 'udara' ? '#f59e0b' : '#fef3c7'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all duration-300 hover:opacity-90"
                        onClick={() => setActivePlateSection('udara')}
                      />
                      {/* Central core */}
                      <circle cx="50" cy="50" r="8" fill="#ffffff" />
                      <circle cx="50" cy="50" r="5" fill="#800000" />
                    </svg>

                    {/* Quick Labels inside SVG circles */}
                    <div className="absolute top-8 right-8 text-[9px] font-black text-emerald-800 bg-white/90 px-1.5 py-0.5 rounded-full border border-emerald-200">1/3 Makanan</div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-sky-800 bg-white/90 px-1.5 py-0.5 rounded-full border border-sky-200">1/3 Minuman</div>
                    <div className="absolute top-8 left-6 text-[9px] font-black text-amber-800 bg-white/90 px-1.5 py-0.5 rounded-full border border-amber-200">1/3 Kosong</div>
                  </div>

                  {/* Interactive Details Panel */}
                  <div className="flex-1 w-full">
                    {activePlateSection === null && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 min-h-[140px]">
                        <Info className="w-8 h-8 text-emerald-600 mb-2 animate-bounce" />
                        <p className="text-xs font-bold text-slate-600">Klik bagian piring untuk melihat detail nutrisi medis Ukhti.</p>
                      </div>
                    )}

                    {activePlateSection === 'makanan' && (
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Utensils className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">1/3 Makanan (Diet Rendah Purin & Kolesterol)</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Nabi sangat jarang mengonsumsi daging merah berlemak tinggi. Utamakan konsumsi sayur-sayuran rendah purin, biji-bijian, protein nabati, dan karbohidrat kompleks.
                        </p>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 text-[10px] space-y-1">
                          <p className="font-bold text-emerald-800">✅ REKOMENDASI:</p>
                          <p className="text-slate-600">• Kurma ganjil di pagi hari (3 butir) untuk kalium.</p>
                          <p className="text-slate-600">• Edamame rebus, minyak zaitun hangat pada makanan.</p>
                          <p className="font-bold text-rose-700 mt-1">❌ HINDARI JEROAN & GORENGAN:</p>
                          <p className="text-slate-500">• Hati, ampela, gorengan lemak tinggi memicu asam urat & kolesterol jahat (LDL) naik.</p>
                        </div>
                      </div>
                    )}

                    {activePlateSection === 'minuman' && (
                      <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-sky-700">
                          <Droplets className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">1/3 Minuman (Air Putih Hangat / Madu)</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Penting untuk hidrasi tubuh yang cukup. Air hangat melarutkan kristal asam urat yang menumpuk di persendian dan meluruhkannya melalui air seni.
                        </p>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100 text-[10px] space-y-1">
                          <p className="font-bold text-sky-800">✅ ATURAN MINUM:</p>
                          <p className="text-slate-600">• Minum minimal 2 liter air putih hangat setiap hari secara bertahap.</p>
                          <p className="text-slate-600">• Sangat membantu menjaga volume darah agar tensi tidak terlalu drop (mengatasi darah rendah).</p>
                          <p className="text-slate-600">• Air hangat juga menenangkan sfingter kerongkongan untuk meredakan GERD.</p>
                        </div>
                      </div>
                    )}

                    {activePlateSection === 'udara' && (
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-amber-700">
                          <Wind className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">1/3 Udara (Kosongkan Sebelum Kenyang)</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Mengosongkan sepertiga lambung memberikan ruang bagi gas lambung untuk berproses. Ini adalah perlindungan utama dari refluks asam lambung akut.
                        </p>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-[10px] space-y-1">
                          <p className="font-bold text-amber-800">💡 DISIPLIN SUNNAH:</p>
                          <p className="text-slate-600">• Makanlah hanya saat mulai lapar dan berhentilah makan sebelum kenyang.</p>
                          <p className="text-slate-600">• Mengunyah perlahan (30-40 kali) membantu sinyal kenyang alami mencapai otak sebelum lambung terlanjur penuh.</p>
                          <p className="text-slate-600">• Mencegah tekanan mekanik naik ke arah dada yang memperparah sesak napas GERD.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist Sections */}
            <div className="space-y-8">
              {/* Daily Checklist */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[11px] font-black text-emerald-800 uppercase tracking-[0.2em]">1. Ceklist Harian (Siklus Sirkadian & Diet)</h3>
                  <div className="h-[1px] flex-1 bg-emerald-100" />
                </div>

                {/* Sub-categories of Daily */}
                {Array.from(new Set(dailyChecklistItems.map(m => m.subCategory))).map(subCat => (
                  <div key={subCat} className="space-y-2">
                    <h4 className="text-[9px] font-black text-emerald-600/80 uppercase tracking-widest pl-1">{subCat}</h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {dailyChecklistItems.filter(m => m.subCategory === subCat).map(item => {
                        const isDone = user
                          ? !!todayLogs.find((l: any) => l.activity_id === item.id)?.completed
                          : !!localLogs.find((l: any) => l.activity_id === item.id)?.completed;

                        return (
                          <Card 
                            key={item.id}
                            className={cn(
                              "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98] group overflow-hidden relative",
                              isDone ? "bg-emerald-50/40" : "bg-white hover:bg-white/80"
                            )}
                            onClick={() => toggleChecklist(item.id)}
                          >
                            {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />}
                            <CardContent className="p-4 flex items-start gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border-2 mt-0.5",
                                isDone 
                                  ? "bg-emerald-600 border-emerald-600 text-white scale-105" 
                                  : "bg-emerald-50/30 border-emerald-100 text-emerald-200 group-hover:border-emerald-300"
                              )}>
                                {isDone ? (
                                  <CheckCircle2 className="w-5 h-5 fill-current text-white" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-current opacity-30" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={cn("text-xs font-black transition-all", isDone ? "text-emerald-900" : "text-slate-900")}>
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{item.sub}</p>
                                
                                <div className="flex flex-col gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                                      SUNNAH: {item.dalil}
                                    </p>
                                  </div>
                                  <div className="flex items-start gap-1.5 border-t border-slate-200/60 pt-1">
                                    <Scale className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                    <p className="text-[8px] text-emerald-800/90 font-bold leading-normal uppercase">
                                      MEDIS: {item.medis}
                                    </p>
                                  </div>
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

              {/* Weekly Checklist */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[11px] font-black text-emerald-800 uppercase tracking-[0.2em]">2. Ceklist Mingguan</h3>
                  <div className="h-[1px] flex-1 bg-emerald-100" />
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {sehatItems.filter(m => m.category === 'mingguan').map(item => {
                    const isDone = user
                      ? !!todayLogs.find((l: any) => l.activity_id === item.id)?.completed
                      : !!localLogs.find((l: any) => l.activity_id === item.id)?.completed;

                    return (
                      <Card 
                        key={item.id}
                        className={cn(
                          "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98] group overflow-hidden relative",
                          isDone ? "bg-emerald-50/40" : "bg-white hover:bg-white/80"
                        )}
                        onClick={() => toggleChecklist(item.id)}
                      >
                        {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />}
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border-2 mt-0.5",
                            isDone 
                              ? "bg-emerald-600 border-emerald-600 text-white scale-105" 
                              : "bg-emerald-50/30 border-emerald-100 text-emerald-200 group-hover:border-emerald-300"
                          )}>
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 fill-current text-white" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-current opacity-30" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-black transition-all", isDone ? "text-emerald-900" : "text-slate-900")}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{item.sub}</p>
                            
                            <div className="flex flex-col gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                                  SUNNAH: {item.dalil}
                                </p>
                              </div>
                              <div className="flex items-start gap-1.5 border-t border-slate-200/60 pt-1">
                                <Scale className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                <p className="text-[8px] text-emerald-800/90 font-bold leading-normal uppercase">
                                  MEDIS: {item.medis}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Checklist */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[11px] font-black text-emerald-800 uppercase tracking-[0.2em]">3. Ceklist Bulanan</h3>
                  <div className="h-[1px] flex-1 bg-emerald-100" />
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {sehatItems.filter(m => m.category === 'bulanan').map(item => {
                    const isDone = user
                      ? !!todayLogs.find((l: any) => l.activity_id === item.id)?.completed
                      : !!localLogs.find((l: any) => l.activity_id === item.id)?.completed;

                    return (
                      <Card 
                        key={item.id}
                        className={cn(
                          "border-none shadow-sm transition-all cursor-pointer active:scale-[0.98] group overflow-hidden relative",
                          isDone ? "bg-emerald-50/40" : "bg-white hover:bg-white/80"
                        )}
                        onClick={() => toggleChecklist(item.id)}
                      >
                        {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />}
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border-2 mt-0.5",
                            isDone 
                              ? "bg-emerald-600 border-emerald-600 text-white scale-105" 
                              : "bg-emerald-50/30 border-emerald-100 text-emerald-200 group-hover:border-emerald-300"
                          )}>
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 fill-current text-white" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-current opacity-30" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-black transition-all", isDone ? "text-emerald-900" : "text-slate-900")}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{item.sub}</p>
                            
                            <div className="flex flex-col gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                                  SUNNAH: {item.dalil}
                                </p>
                              </div>
                              <div className="flex items-start gap-1.5 border-t border-slate-200/60 pt-1">
                                <Scale className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                <p className="text-[8px] text-emerald-800/90 font-bold leading-normal uppercase">
                                  MEDIS: {item.medis}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Nutrisi Qolbu & Sehat Box */}
            <Card className="border-none shadow-sm bg-white overflow-hidden relative border-t-4 border-emerald-600 mt-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-emerald-50 p-2 rounded-xl">
                    <Heart className="w-4 h-4 text-emerald-600 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Nutrisi Qolbu & Sehat</h4>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">Renungan Thibb & Spiritual</p>
                  </div>
                </div>

                <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100 flex gap-4">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0 mt-1 animate-pulse" />
                  <div className="space-y-3 flex-1">
                    <Badge variant="outline" className="text-[7px] h-3.5 px-1 font-black uppercase border-emerald-200 text-emerald-600 bg-emerald-50/50">
                      {currentQuote.type === 'ayat' ? 'Al-Qur\'an' : 'Hadits Shahih'}
                    </Badge>
                    <p className="text-xs font-bold italic leading-relaxed text-slate-700">
                      "{currentQuote.text}"
                    </p>
                    <div className="flex items-center justify-between pt-2">
                       <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">{currentQuote.source}</p>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-6 text-[9px] font-black uppercase text-emerald-700 hover:bg-emerald-50"
                         onClick={handleNextQuote}
                       >
                         Hikmah Selanjutnya
                       </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Tab 2: Monitoring */}
        <TabsContent value="monitoring" className="mt-0 outline-none">
          <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Streak Card */}
              <Card className="bg-gradient-to-br from-[#800000] to-emerald-800 border-none shadow-lg p-6 text-white relative overflow-hidden h-full flex flex-col justify-between">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 opacity-95">
                    <Flame className="w-4 h-4 text-amber-400 fill-current animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Istiqomah Hidup Sehat</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black">{monitoringStats.currentStreak}</span>
                    <span className="text-sm font-bold opacity-80 uppercase tracking-tighter">Hari Beruntun</span>
                  </div>
                </div>
                <div className="relative z-10 mt-6">
                  <p className="text-[10px] font-medium leading-relaxed opacity-95">
                    Masya Allah! Terus pertahankan pola sehat ala Sunnah Nabi. 
                    {monitoringStats.currentStreak > 3 ? ' Tubuh kuat mempermudah Ukhti beribadah dengan khusyuk!' : ' Ayo mulai disiplin sehat dari hari ini.'}
                  </p>
                </div>
                {/* Background design */}
                <HeartPulse className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 rotate-12" />
              </Card>

              {/* Total Points Card */}
              <Card className="bg-gradient-to-r from-emerald-600 to-teal-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/90 mb-1">Total HI Poin Sehat</p>
                   <h3 className="text-3xl font-black">
                     {(user ? dbLogs : guestHistoricalLogs)?.filter((l: any) => l.completed && l.activity_id.startsWith('sehat_')).length * 5 || 0}
                     <span className="text-sm font-bold opacity-80 ml-2">POIN</span>
                   </h3>
                </div>
                <div className="relative z-10 mt-6 flex justify-between items-center">
                  <p className="text-[9px] font-bold text-emerald-200">5 POIN per Checklist yang diselesaikan</p>
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Zap className="w-6 h-6 text-amber-200 fill-current" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Kalender Konsistensi (Heatmap) */}
            <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kalender Hi Sehat (30 Hari Terakhir)</span>
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
                {monitoringStats.heatmap.map((day, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-[calc(100%/10-6px)] aspect-square rounded-sm transition-all duration-500",
                      day.level === 0 ? "bg-slate-100" : 
                      day.level === 1 ? "bg-emerald-100" :
                      day.level === 2 ? "bg-emerald-300" :
                      day.level === 3 ? "bg-emerald-500" : "bg-emerald-700"
                    )}
                    title={`${day.date}: ${day.count} kebiasaan sehat`}
                  />
                ))}
              </div>
            </Card>

            {/* Daily Trend Chart (Simple Recharts Bar replacement for light weight React) */}
            <Card className="border-none shadow-sm p-6 overflow-hidden">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4 text-emerald-600" /> Tren Kepatuhan Sehat 7 Hari
               </h3>
               <div className="flex items-end justify-between h-32 gap-2">
                 {monitoringStats.dailyTrend.map((day, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                     <div className="w-full bg-slate-50 rounded-t-lg relative h-full flex items-end">
                       <div 
                        className="w-full bg-gradient-to-t from-[#800000] to-emerald-500 rounded-t-lg transition-all duration-500 group-hover:opacity-80" 
                        style={{ height: `${day.percent}%` }}
                       >
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                           {day.percent}%
                         </div>
                       </div>
                     </div>
                     <span className="text-[8px] font-bold text-muted-foreground group-hover:text-slate-800 transition-colors">
                       {day.date.split('-').slice(1).reverse().join('/')}
                     </span>
                   </div>
                 ))}
               </div>
            </Card>

            {/* Medical Disclaimer Alert */}
            <Card className="border-none shadow-sm bg-[#800000]/5 border-l-4 border-[#800000]">
              <CardContent className="p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-[#800000] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Catatan Penting Layanan Kesehatan</h4>
                  <p className="text-[10px] font-bold text-slate-700 leading-normal">
                    Program Hi Sehat ini dirancang berdasarkan anjuran umum Thibbun Nabawi dan disinkronkan secara umum dengan kaidah medis. Tetap konsultasikan kebiasaan puasa atau bekam Anda dengan dokter Ukhti, terutama apabila merasakan hipotensi berat (darah rendah drop) atau keluhan pencernaan yang berlanjut.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
