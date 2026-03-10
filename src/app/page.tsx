
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
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";

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

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: userData } = useDoc(userDocRef);
  const isPaid = userData?.isTikrarPaid;
  const paidJuz = userData?.paidJuz;

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* User Greeting & Rank */}
      <div className="flex items-start justify-between mt-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Semoga harimu penuh berkah</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">
            Assalamu'alaikum,<br />
            {user?.displayName?.split(' ')[0] || 'Sahabat AQLI'}!
          </h1>
        </div>
        <Link href="/leaderboard" className="flex flex-col items-end gap-1 group">
          <Badge className="bg-black text-white gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-black/10 group-hover:bg-[#800000] transition-colors">
            ALIM <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </Badge>
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter flex items-center gap-1">
            <Trophy className="w-2 h-2" /> Peringkat Anda
          </span>
        </Link>
      </div>

      {/* Active Program Shortcut (ONLY FOR PAID USERS) */}
      {isPaid && (
        <Card className="bg-blue-600 text-white border-none shadow-xl overflow-hidden relative group">
          <div className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-110 transition-transform">
            <Zap className="w-32 h-32" />
          </div>
          <CardContent className="p-5 flex items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Program Aktif</p>
              <h3 className="font-bold text-lg">Tikrar Daily: Juz {paidJuz}</h3>
              <p className="text-[10px] opacity-90 max-w-[180px]">Ketuk untuk lanjut menghafal di halaman terakhir.</p>
            </div>
            <Button asChild size="sm" className="bg-white text-blue-600 hover:bg-blue-50 font-bold gap-2 shadow-lg">
              <Link href="/tajweed">MASUK KELAS <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Streak Tracker Card */}
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4 flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <Flame className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <span className="text-sm font-bold text-muted-foreground">0 Hari</span>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              {days.map((day) => (
                <div key={day.label} className="flex flex-col items-center gap-2">
                  <span className={cn("text-[10px] font-bold", day.active ? "text-emerald-500" : "text-muted-foreground/60")}>
                    {day.label}
                  </span>
                  <div className={cn(
                    "w-6 h-6 rotate-45 border-2 rounded-sm flex items-center justify-center transition-all",
                    day.active ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-muted-foreground/20"
                  )}>
                    {day.active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-emerald-500 px-1">Streak Terpanjang 12 Hari</p>
          </div>

          <div className="flex flex-col gap-3">
            <Bell className="w-4 h-4 text-emerald-500 cursor-pointer" />
            <PlusCircle className="w-4 h-4 text-emerald-500 cursor-pointer" />
          </div>
        </CardContent>
      </Card>

      {/* Main Challenge Card */}
      <Card className="overflow-hidden border-none shadow-md">
        <CardContent className="p-0">
          <div className="p-6 flex justify-between items-start gap-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-muted rounded-lg">
                  <Award className="w-4 h-4 text-[#800000]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Tilawah Berkah, Donasi Qur'an</h3>
                  <p className="text-[10px] text-muted-foreground">Ramadhan 1447 — Tantangan</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gunakan Sahabat AQLI untuk melacak khatam 90% atau lebih Al-Qur'an selama Ramadhan dan kami akan mewakafkan satu mushaf atas nama Anda!
              </p>
            </div>

            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full rotate-[-90deg]">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted/30" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="251.2" strokeDashoffset="251.2" className="text-emerald-400" />
              </svg>
              <span className="absolute text-xl font-bold">0%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t divide-x">
            <Button variant="ghost" className="rounded-none h-12 gap-2 text-xs font-bold text-muted-foreground">
              <BarChart3 className="w-4 h-4" /> Insight
            </Button>
            <Button asChild variant="ghost" className="rounded-none h-12 gap-2 text-xs font-bold text-[#800000]">
              <Link href="/tilawah">
                Lanjut Membaca <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Ads Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-headline">Jelajahi Fitur</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Al-Qur'an Ad */}
          <Link href="/tilawah" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-[#800000] to-[#b30000] text-white h-44 transition-transform group-hover:scale-[1.02]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20">
                  <BookMarked className="w-32 h-32" />
                </div>
                <div className="space-y-2 relative z-10">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">UTAMA</Badge>
                  <h4 className="font-bold text-lg">Mushaf Digital</h4>
                  <p className="text-[10px] text-white/70 line-clamp-2 leading-relaxed">Baca Al-Qur'an dengan terjemahan per kata dan tafsir Kemenag RI yang mendalam.</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold relative z-10 uppercase tracking-wider">
                  Mulai Membaca <ChevronRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* AI Scholar Ad */}
          <Link href="/ai-scholar" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-indigo-900 to-indigo-700 text-white h-44 transition-transform group-hover:scale-[1.02]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20">
                  <Globe className="w-32 h-32" />
                </div>
                <div className="space-y-2 relative z-10">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">CERDAS</Badge>
                  <h4 className="font-bold text-lg">Cendekiawan AI</h4>
                  <p className="text-[10px] text-white/70 line-clamp-2 leading-relaxed">Tanyakan apa pun tentang hukum Islam, Tafsir, dan sejarah kepada AI terverifikasi kami.</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold relative z-10 uppercase tracking-wider">
                  Tanya Sekarang <ChevronRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Hafalan Ad */}
          <Link href="/tajweed" className="block group">
            <Card className={cn(
              "overflow-hidden border-none shadow-sm text-white h-44 transition-transform group-hover:scale-[1.02]",
              isPaid ? "bg-gradient-to-br from-blue-800 to-blue-600" : "bg-gradient-to-br from-emerald-800 to-emerald-600"
            )}>
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20">
                  <Award className="w-32 h-32" />
                </div>
                <div className="space-y-2 relative z-10">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">LATIHAN</Badge>
                  <h4 className="font-bold text-lg">{isPaid ? `Tikrar Juz ${paidJuz}` : 'Modul Hafalan'}</h4>
                  <p className="text-[10px] text-white/70 line-clamp-2 leading-relaxed">
                    {isPaid ? 'Lanjutkan repetisi hafalan Anda hari ini sesuai target level.' : 'Perkuat hafalan Anda dengan metode Tikrar harian dan kuis interaktif.'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold relative z-10 uppercase tracking-wider">
                  {isPaid ? 'Buka Counter' : 'Mulai Menghafal'} <ChevronRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Leaderboard Ad */}
          <Link href="/leaderboard" className="block group">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-amber-700 to-amber-500 text-white h-44 transition-transform group-hover:scale-[1.02]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-20">
                  <Trophy className="w-32 h-32" />
                </div>
                <div className="space-y-2 relative z-10">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">KOMPETISI</Badge>
                  <h4 className="font-bold text-lg">Papan Peringkat</h4>
                  <p className="text-[10px] text-white/70 line-clamp-2 leading-relaxed">Lihat peringkat Anda dan bersainglah dalam kebaikan bersama Sahabat AQLI lainnya.</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold relative z-10 uppercase tracking-wider">
                  Lihat Juara <ChevronRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Donation Ad */}
          <Link href="/donate" className="block group sm:col-span-2">
            <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-rose-900 to-rose-700 text-white h-44 transition-transform group-hover:scale-[1.01]">
              <CardContent className="p-5 flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
                  <HeartHandshake className="w-48 h-48" />
                </div>
                <div className="space-y-2 relative z-10">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-bold tracking-widest">WAKAF DIGITAL</Badge>
                  <h4 className="font-bold text-xl">Infaq &amp; Sedekah</h4>
                  <p className="text-sm text-white/70 max-w-sm leading-relaxed">
                    Dukung pemeliharaan infrastruktur AI Sahabat AQLI untuk manfaat umat yang lebih luas dan berkelanjutan.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold relative z-10 uppercase tracking-widest">
                  Berikan Kontribusi <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Today's Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold font-headline">Target Hari Ini</h2>
          <Link href="/progress" className="text-xs font-bold text-muted-foreground hover:text-foreground">Lihat Semua</Link>
        </div>

        <div className="space-y-3">
          {[
            { title: 'Hafalan Juz 30', subtitle: 'An-Naba 1 - 40', progress: 85, icon: Calendar, color: 'emerald' },
            { title: 'Murottal Juz 28', subtitle: 'Al-Mujadilah 1 - 22', progress: 0, icon: CheckCircle2, color: 'slate' }
          ].map((goal) => (
            <Card key={goal.title} className="border shadow-none hover:bg-muted/30 transition-colors cursor-pointer group">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn("p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-white transition-colors")}>
                    <goal.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-bold">{goal.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{goal.subtitle}</p>
                    {goal.progress > 0 && (
                      <div className="pt-2">
                        <Progress value={goal.progress} className="h-1 bg-muted [&>div]:bg-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
