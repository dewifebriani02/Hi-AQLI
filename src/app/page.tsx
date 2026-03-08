import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressClient } from "@/components/progress-client";
import { 
  CheckCircle2, 
  ListChecks, 
  Target, 
  Mic, 
  BookOpen, 
  Bot, 
  Users, 
  HeartHandshake, 
  ChevronRight,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const quickActions = [
  { 
    label: "Al-Qur'an", 
    icon: Mic, 
    href: "/tilawah", 
    color: "bg-blue-500/10 text-blue-600",
    description: "Latihan Tilawah AI"
  },
  { 
    label: "Tajwid", 
    icon: BookOpen, 
    href: "/tajweed", 
    color: "bg-green-500/10 text-green-600",
    description: "Modul Interaktif"
  },
  { 
    label: "Tanya AI", 
    icon: Bot, 
    href: "/ai-scholar", 
    color: "bg-purple-500/10 text-purple-600",
    description: "Cendekiawan AI"
  },
  { 
    label: "Komunitas", 
    icon: Users, 
    href: "/study-circles", 
    color: "bg-orange-500/10 text-orange-600",
    description: "Lingkar Studi"
  },
];

export default function DasborPage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-[#800000]">Assalamu'alaikum, Akhi/Ukhti</h1>
        <p className="text-muted-foreground">
          Semoga hari ini penuh keberkahan dengan Al-Qur'an.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <Card className="hover:border-[#800000]/50 transition-all cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">{action.label}</h3>
                  <p className="text-[10px] text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Donation Banner */}
      <Card className="bg-[#800000] text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute right-[-20px] top-[-20px] opacity-10">
          <HeartHandshake className="w-40 h-40" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <Badge variant="secondary" className="bg-accent text-accent-foreground font-bold">WAKAF DIGITAL</Badge>
              <h2 className="text-2xl font-bold font-headline">Dukung Dakwah Digital Kita</h2>
              <p className="text-sm opacity-90 max-w-md">
                Donasi Anda membantu kami membiayai server AI dan mengembangkan fitur-fitur baru untuk umat.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-[#800000] hover:bg-white/90 font-bold gap-2 w-full md:w-auto">
              <Link href="/donate">
                Donasi Sekarang <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pelajaran Selesai</CardTitle>
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-green-600">4 / 6</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" /> +2 bulan ini
                  </p>
              </CardContent>
          </Card>
           <Card className="border-l-4 border-l-[#800000] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Skor Rata-rata</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-[#800000]">88%</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" /> +5% dari minggu lalu
                  </p>
              </CardContent>
          </Card>
           <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Halaqah Diikuti</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-blue-600">2</div>
                  <p className="text-xs text-muted-foreground pt-1">
                      Aktif di "Tafsir Juz' Amma"
                  </p>
              </CardContent>
          </Card>
      </div>

      {/* Progress Chart */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#800000]" />
            Akurasi Tilawah Mingguan
          </CardTitle>
          <CardDescription>
            Grafik ini menunjukkan perkembangan kualitas bacaan Anda berdasarkan analisis AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressClient />
        </CardContent>
      </Card>
    </div>
  );
}
