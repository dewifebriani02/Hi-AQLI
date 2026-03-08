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
  TrendingUp,
  Sparkles,
  ArrowRight,
  Book
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const featureAds = [
  { 
    label: "Mushaf Digital", 
    icon: Book, 
    href: "/tilawah", 
    color: "from-amber-600 to-amber-400",
    description: "Baca Al-Qur'an dengan terjemahan Kemenag RI dan tafsir per kata.",
    badge: "Utama"
  },
  { 
    label: "Tilawah AI", 
    icon: Mic, 
    href: "/tilawah/ai-assistant", 
    color: "from-blue-600 to-blue-400",
    description: "Koreksi bacaan Anda secara real-time dengan teknologi AI.",
    badge: "Populer"
  },
  { 
    label: "Modul Tajwid", 
    icon: BookOpen, 
    href: "/tajweed", 
    color: "from-emerald-600 to-emerald-400",
    description: "Kuasai hukum bacaan dengan kurikulum interaktif yang mudah.",
    badge: "Baru"
  },
  { 
    label: "Tanya Scholar", 
    icon: Bot, 
    href: "/ai-scholar", 
    color: "from-purple-600 to-purple-400",
    description: "Diskusikan Tafsir dan Sejarah Islam dengan asisten cerdas.",
    badge: "Cerdas"
  },
];

export default function DasborPage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selamat Datang</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-[#800000]">Assalamu'alaikum, Akhi/Ukhti</h1>
        <p className="text-muted-foreground">
          Semoga hari ini penuh keberkahan dengan Al-Qur'an.
        </p>
      </div>

      {/* Feature Ads Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featureAds.map((ad, index) => (
          <Link key={index} href={ad.href}>
            <Card className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all group relative h-full">
              <div className={`absolute inset-0 bg-gradient-to-br ${ad.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="p-6 relative z-10 text-white flex flex-col justify-between h-full gap-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <ad.icon className="w-8 h-8" />
                  </div>
                  <Badge className="bg-white/20 border-none text-white backdrop-blur-sm">{ad.badge}</Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-headline">{ad.label}</h3>
                  <p className="text-sm opacity-90 leading-relaxed">{ad.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold pt-2">
                  Mulai Belajar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
      <Card className="shadow-lg border-none overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#800000]" />
            Akurasi Tilawah Mingguan
          </CardTitle>
          <CardDescription>
            Grafik perkembangan kualitas bacaan Anda berdasarkan analisis AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ProgressClient />
        </CardContent>
      </Card>
    </div>
  );
}