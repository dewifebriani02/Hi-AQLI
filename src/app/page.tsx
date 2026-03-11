'use client';

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  TrendingUp,
  PlayCircle,
  BookMarked,
  ChevronRight,
  Award,
  Bell,
  PlusCircle,
  BarChart3,
  Globe,
  Calendar,
  Sparkles,
  Users,
  HeartHandshake,
  Trophy,
  Zap,
  ArrowRight,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const days = [
  { label: 'Jum', active: false },
  { label: 'Sab', active: false },
  { label: 'Ahad', active: false },
  { label: 'Sen', active: true },
  { label: 'Sel', active: false },
  { label: 'Rab', active: false },
  { label: 'Kam', active: false },
];

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [tikrarStats, setTikrarStats] = useState<{ day: number, total: number } | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);
  const isPaid = userData?.isTikrarPaid;
  const paidJuz = userData?.paidJuz;

  useEffect(() => {
    if (isPaid) {
      const startPage = paidJuz ? (paidJuz === 1 ? 1 : (paidJuz - 1) * 20 + 2) : 1;
      const saved = localStorage.getItem(`tikrar_progress_p${startPage}`);
      const savedLevel = localStorage.getItem('tikrar_level');
      if (saved && savedLevel) {
        const data = JSON.parse(saved);
        if (data.startDate) {
          const start = new Date(data.startDate);
          const today = new Date();
          const diff = Math.ceil(Math.abs(today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const levels = [0, 7, 14, 21, 28];
          setTikrarStats({ day: diff, total: levels[parseInt(savedLevel)] || 7 });
        }
      }
    }
  }, [isPaid, paidJuz]);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* User Greeting & Rank */}
      <div className="flex items-start justify-between mt-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <Sparkles className="w-4 h-4 fill-current animate-pulse text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">HI AQLI DIGITAL</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">
            Assalamu'alaikum,<br />
            {user?.displayName?.split(' ')[0] || 'Sahabat'}!
          </h1>
        </div>
        <Link href="/leaderboard" className="flex flex-col items-end gap-1 group">
          <Badge className="bg-[#800000] text-white gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-[#800000]/10 hover:bg-[#800000]/90 transition-colors">
            ALIM <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          </Badge>
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter flex items-center gap-1">
            <Trophy className="w-2 h-2 text-[#D4AF37]" /> Peringkat Anda
          </span>
        </Link>
      </div>

      {/* Active Program Shortcut */}
      {isPaid && (
        <Card className="bg-[#800000] text-white border-none shadow-xl overflow-hidden relative group border-b-4 border-[#D4AF37]">
          <div className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-110 transition-transform">
            <Zap className="w-32 h-32 text-[#D4AF37]" />
          </div>
          <CardContent className="p-5 flex items-center justify-between gap-4 relative z-10">
            <div className="space-y-1 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Program Aktif</p>
              <h3 className="font-bold text-lg text-white">Tikrar Daily: Juz {paidJuz}</h3>
              {tikrarStats ? (
                <div className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 text-[#D4AF37]">
                  <Clock className="w-3 h-3" /> Hari ke-{tikrarStats.day} dari {tikrarStats.total}
                </div>
              ) : (
                <p className="text-[10px] text-white/80">Lanjutkan repetisi hari ini.</p>
              )}
            </div>
            <Button asChild size="sm" className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-black gap-2 shadow-lg border-none">
              <Link href="/tajweed">MASUK KELAS <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feature Ads Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-headline">Layanan HI AQLI</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/tilawah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-[#800000] text-white h-40 transition-transform group-hover:scale-[1.02]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20"><BookMarked className="w-24 h-24" /></div>
                <div className="space-y-1 relative z-10">
                  <Badge className="bg-[#D4AF37] text-black border-none text-[9px] font-black uppercase">Mushaf</Badge>
                  <h4 className="font-bold text-lg text-white leading-tight">Al-Qur'an Digital</h4>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black relative z-10 uppercase tracking-wider text-[#D4AF37]">Mulai Membaca <ChevronRight className="w-3 h-3" /></div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/ai-scholar" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-[#800000] text-white h-40 transition-transform group-hover:scale-[1.02]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20"><Globe className="w-24 h-24" /></div>
                <div className="space-y-1 relative z-10">
                  <Badge className="bg-[#D4AF37] text-black border-none text-[9px] font-black uppercase">AI Scholar</Badge>
                  <h4 className="font-bold text-lg text-white leading-tight">Tanya Ilmu</h4>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black relative z-10 uppercase tracking-wider text-[#D4AF37]">Ajukan Pertanyaan <ChevronRight className="w-3 h-3" /></div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tajweed" className="block group sm:col-span-2">
            <Card className="overflow-hidden border-none shadow-sm bg-[#800000] text-white h-40 transition-transform group-hover:scale-[1.01] border-b-4 border-[#D4AF37]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20"><Award className="w-32 h-32" /></div>
                <div className="space-y-1 relative z-10">
                  <Badge className="bg-[#D4AF37] text-black border-none text-[9px] font-black uppercase">Hafalan</Badge>
                  <h4 className="font-black text-xl text-white">Tikrar Daily & Simulation</h4>
                  <p className="text-[10px] text-white/70 max-w-[200px]">Perkuat kualitas hafalan dengan metode repetisi terstruktur.</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black relative z-10 uppercase tracking-widest text-[#D4AF37]">Buka Modul <ChevronRight className="w-4 h-4" /></div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Donation Ad */}
      <Link href="/donate" className="block group">
        <Card className="overflow-hidden border-2 border-[#800000]/10 bg-white text-[#800000] h-32 transition-all group-hover:border-[#D4AF37] shadow-sm">
          <CardContent className="p-5 flex items-center justify-between h-full gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#800000]/5 flex items-center justify-center text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-colors">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-lg uppercase leading-tight">Infaq & Wakaf</h4>
                <p className="text-[10px] text-muted-foreground font-bold">Dukung operasional server AI HI AQLI.</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
