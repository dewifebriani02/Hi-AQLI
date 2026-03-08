
'use client';

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
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
  Youtube,
  Globe,
  CheckCircle2,
  Calendar,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";

const days = [
  { label: 'Fri', active: false },
  { label: 'Sat', active: false },
  { label: 'Sun', active: false },
  { label: 'Mon', active: true },
  { label: 'Tue', active: false },
  { label: 'Wed', active: false },
  { label: 'Thu', active: false },
];

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* User Greeting & Rank */}
      <div className="flex items-start justify-between mt-2 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <Sparkles className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Semoga harimu penuh berkah</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">
            Assalamu'alaikum,<br />
            {user?.displayName?.split(' ')[0] || 'Sahabat AQLI'}!
          </h1>
        </div>
        <Badge className="bg-black text-white gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-black/10">
          ALIM <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </Badge>
      </div>

      {/* Streak Tracker Card */}
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4 flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <Flame className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <span className="text-sm font-bold text-muted-foreground">0 Days</span>
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
            <p className="text-[10px] font-bold text-emerald-500 px-1">Longest Streak 12 Days</p>
          </div>

          <div className="flex flex-col gap-3">
            <Bell className="w-4 h-4 text-emerald-500" />
            <PlusCircle className="w-4 h-4 text-emerald-500" />
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

      {/* Highlights Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-headline">Sorotan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="overflow-hidden border-none shadow-sm bg-black group cursor-pointer">
            <div className="relative h-48 w-full opacity-60 group-hover:opacity-80 transition-opacity">
               <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
               <img src="https://picsum.photos/seed/wahy/600/400" alt="Wahy" className="w-full h-full object-cover" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-white/80" />
               </div>
            </div>
            <CardContent className="p-4 relative -mt-16">
              <div className="flex items-center gap-2 mb-2">
                <Youtube className="w-3 h-3 text-red-500" />
                <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Serial Ramadhan</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Wahy: Kisah Turunnya Wahyu</h4>
              <p className="text-[10px] text-white/60 line-clamp-2 italic">Episode harian bagaimana Al-Qur'an sampai kepada kita!</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-sm group cursor-pointer">
            <div className="p-4 bg-blue-50/50 h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Target Tercapai 🎉</span>
                </div>
                <div className="flex justify-center py-4">
                  <div className="grid grid-cols-2 gap-2">
                    {['EN', 'AR', 'ID', 'IN'].map(l => (
                      <div key={l} className="w-8 h-8 rounded-lg bg-[#800000] text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-[#800000]/20">{l}</div>
                    ))}
                  </div>
                </div>
                <h4 className="text-sm font-bold">Studi Komparatif Terjemahan</h4>
                <p className="text-[10px] text-muted-foreground">Unduh dan bandingkan berbagai tafsir bahasa dunia.</p>
              </div>
              <div className="pt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                LIHAT DETAIL <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </Card>
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
