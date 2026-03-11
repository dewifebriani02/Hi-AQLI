'use client';

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  Award,
  Sparkles,
  HeartHandshake,
  Trophy,
  Zap,
  ArrowRight,
  Clock,
  BookOpen,
  LayoutGrid,
  Bot,
  Flame,
  Target,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [tikrarStats, setTikrarStats] = useState<{ day: number, total: number, percent: number } | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);
  const isPaid = userData?.isTikrarPaid;
  const paidJuz = userData?.paidJuz;
  const points = userData?.points || 0;

  useEffect(() => {
    if (isPaid) {
      const startPage = paidJuz ? (paidJuz === 1 ? 1 : (paidJuz - 1) * 20 + 2) : 1;
      const saved = localStorage.getItem(`tikrar_progress_p${startPage}`);
      const savedLevel = localStorage.getItem('tikrar_level');
      
      if (saved) {
        const data = JSON.parse(saved);
        if (data.startDate) {
          const start = new Date(data.startDate);
          const today = new Date();
          const diff = Math.ceil(Math.abs(today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const levels = [0, 7, 14, 21, 28];
          const totalDays = levels[parseInt(savedLevel || "3")] || 21;
          
          // Calculate progress percentage based on block completions
          let done = 0;
          if (data.blocks) {
            Object.values(data.blocks).forEach((b: any) => {
              if (b.combined?.count >= 40) done++;
            });
          }
          const percent = (done / 4) * 100;

          setTikrarStats({ 
            day: diff, 
            total: totalDays,
            percent: percent
          });
        }
      } else {
        // Default values if no local storage yet
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
            <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">HI AQLI DIGITAL</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">
            Assalamu'alaikum,<br />
            {user?.displayName?.split(' ')[0] || 'Sahabat'}!
          </h1>
        </div>
        <Link href="/leaderboard" className="flex flex-col items-end gap-1 group">
          <Badge className="bg-[#800000] text-white gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-[#800000]/10 hover:bg-[#800000]/90 transition-colors">
            {points.toLocaleString()} POIN <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          </Badge>
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter flex items-center gap-1">
            <Trophy className="w-2 h-2 text-[#D4AF37]" /> Papan Juara
          </span>
        </Link>
      </div>

      {/* Stats Grid: Streak & Target */}
      <div className="grid grid-cols-2 gap-4 px-1">
        <Card className="border-none shadow-sm bg-white overflow-hidden relative border-b-4 border-[#800000]">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <Badge variant="outline" className="text-[8px] font-black border-orange-200 text-orange-700 bg-orange-50 px-1.5 h-4">ISTIQOMAH</Badge>
            </div>
            <div>
              <p className="text-2xl font-black text-black">{tikrarStats?.day || 0} Hari</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Streak Belajar</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative border-b-4 border-[#D4AF37]">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-50 text-[#D4AF37]">
                <Target className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[8px] font-black border-amber-200 text-amber-700 bg-amber-50 px-1.5 h-4">TARGET</Badge>
            </div>
            <div>
              <p className="text-2xl font-black text-black">{tikrarStats ? Math.round(tikrarStats.percent) : 0}%</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Repetisi Hari Ini</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Program Shortcut */}
      {isPaid ? (
        <Card className="bg-[#800000] text-white border-none shadow-xl overflow-hidden relative group border-b-4 border-[#D4AF37] mx-1">
          <div className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-110 transition-transform">
            <Zap className="w-32 h-32 text-[#D4AF37]" />
          </div>
          <CardContent className="p-5 flex items-center justify-between gap-4 relative z-10">
            <div className="space-y-1 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Lanjutkan Tikrar</p>
              <h3 className="font-bold text-lg text-white">Juz {paidJuz} • Halaman {paidJuz === 1 ? '1' : (paidJuz-1)*20+2}</h3>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={tikrarStats?.percent || 0} className="h-1.5 flex-1 bg-white/10 [&>div]:bg-[#D4AF37]" />
                <span className="text-[10px] font-bold text-[#D4AF37]">{Math.round(tikrarStats?.percent || 0)}%</span>
              </div>
            </div>
            <Button asChild size="sm" className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-black gap-2 shadow-lg border-none shrink-0">
              <Link href="/hafal">MULAI <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-[#800000]/20 bg-[#800000]/5 mx-1 p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-[#800000]/10 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-[#800000]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-black uppercase text-sm">Mulai Program Itqan</h3>
            <p className="text-xs text-muted-foreground">Aktifkan modul Tikrar Daily untuk memulai hafalan terstruktur 40x repetisi.</p>
          </div>
          <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 font-bold w-full rounded-xl h-12 shadow-md">
            <Link href="/ngaji">DAFTAR TIKRAR SEKARANG</Link>
          </Button>
        </Card>
      )}

      {/* Feature Grid */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[#800000]" /> Layanan Utama
        </h2>
        <div className="grid grid-cols-2 gap-4">
          
          {/* HI MUFRADAT */}
          <Link href="/mufradat" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-36 transition-all group-hover:shadow-md relative border-l-4 border-[#800000]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-[#800000]/5 w-fit">
                  <BookOpen className="w-5 h-5 text-[#800000]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm text-[#800000] uppercase">Hi Mufradat</h4>
                  <p className="text-[9px] text-muted-foreground font-bold">Mushaf & Arti Per Kata</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* HI NGAJI */}
          <Link href="/ngaji" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-36 transition-all group-hover:shadow-md relative border-l-4 border-[#D4AF37]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-amber-50 w-fit">
                  <LayoutGrid className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm text-black uppercase">Hi Ngaji</h4>
                  <p className="text-[9px] text-muted-foreground font-bold">Pendaftaran Kelas</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* HI HAFAL */}
          <Link href="/hafal" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-36 transition-all group-hover:shadow-md relative border-l-4 border-[#800000]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-[#800000]/5 w-fit">
                  <Award className="w-5 h-5 text-[#800000]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm text-[#800000] uppercase">Hi Hafal</h4>
                  <p className="text-[9px] text-muted-foreground font-bold">Pusat Itqan & Tikrar</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* HI BERBAGI */}
          <Link href="/berbagi" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-white h-36 transition-all group-hover:shadow-md relative border-l-4 border-[#D4AF37]">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="p-2 rounded-lg bg-amber-50 w-fit">
                  <HeartHandshake className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-sm text-black uppercase">Hi Berbagi</h4>
                  <p className="text-[9px] text-muted-foreground font-bold">Infaq & Wakaf Digital</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* AI ASSISTANT SHORTCUT */}
      <div className="space-y-4 px-1">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#800000]" /> Asisten Cerdas
        </h2>
        <Link href="/ai-scholar" className="block group">
          <Card className="overflow-hidden border-2 border-[#D4AF37]/30 bg-white text-[#800000] h-28 transition-all group-hover:border-[#800000] shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between h-full gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#800000] flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black text-base uppercase leading-tight">Asisten AI</h4>
                  <p className="text-[10px] text-muted-foreground font-bold">Tanya jawab Tafsir, Tajwid, & Sejarah.</p>
                </div>
              </div>
              <div className="bg-[#800000]/10 p-2 rounded-full text-[#800000]">
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
