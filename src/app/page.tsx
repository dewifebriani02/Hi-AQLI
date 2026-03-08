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
  Book,
  Moon
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const featureAds = [
  { 
    label: "Mushaf Digital", 
    icon: Book, 
    href: "/tilawah", 
    color: "from-amber-700 via-amber-600 to-amber-500",
    description: "Baca Al-Qur'an dengan terjemahan Kemenag RI dan tafsir per kata.",
    badge: "Utama"
  },
  { 
    label: "Tilawah AI", 
    icon: Mic, 
    href: "/tilawah/ai-assistant", 
    color: "from-red-900 via-red-800 to-[#800000]",
    description: "Koreksi bacaan Anda secara real-time dengan asisten cerdas.",
    badge: "Populer"
  },
  { 
    label: "Modul Tajwid", 
    icon: BookOpen, 
    href: "/tajweed", 
    color: "from-emerald-800 via-emerald-700 to-emerald-600",
    description: "Kuasai hukum bacaan dengan kurikulum interaktif yang mudah.",
    badge: "Baru"
  },
  { 
    label: "Tanya Scholar", 
    icon: Bot, 
    href: "/ai-scholar", 
    color: "from-slate-900 via-slate-800 to-slate-700",
    description: "Diskusikan Tafsir dan Sejarah Islam dengan asisten ahli.",
    badge: "Cerdas"
  },
];

export default function DasborPage() {
  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assalamu'alaikum</span>
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-[#800000]">Sahabat AQLI</h1>
          <p className="text-muted-foreground max-w-md">
            Mari perbaiki tilawah dan perdalam ilmu Al-Qur'an setiap hari.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-muted/50 p-3 rounded-2xl border">
          <div className="bg-[#800000] p-2 rounded-xl text-white">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Waktu Shalat</span>
            <span className="text-sm font-bold">Dzuhur • 12:04</span>
          </div>
        </div>
      </div>

      {/* Feature Ads Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {featureAds.map((ad, index) => (
          <Link key={index} href={ad.href}>
            <Card className="overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all group relative h-full min-h-[180px]">
              <div className={`absolute inset-0 bg-gradient-to-br ${ad.color} opacity-95 group-hover:scale-105 transition-transform duration-500`} />
              {/* Islamic Pattern Overlay Mockup */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/islamic-art.png')] bg-repeat" />
              
              <CardContent className="p-6 relative z-10 text-white flex flex-col justify-between h-full gap-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                    <ad.icon className="w-8 h-8" />
                  </div>
                  <Badge className="bg-white/20 border-none text-white backdrop-blur-md font-bold text-[10px] px-3">{ad.badge}</Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-headline tracking-wide">{ad.label}</h3>
                  <p className="text-sm opacity-90 leading-relaxed font-medium">{ad.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold pt-2 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                  Pelajari Sekarang <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Donation Banner */}
      <Card className="bg-[#800000] text-white border-none shadow-2xl overflow-hidden relative rounded-3xl">
        <div className="absolute right-[-40px] top-[-40px] opacity-10 group-hover:scale-110 transition-transform duration-700">
          <HeartHandshake className="w-64 h-64" />
        </div>
        <div className="absolute left-0 top-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat" />
        
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-left flex-1">
              <Badge variant="secondary" className="bg-amber-500 text-amber-950 font-black px-4 py-1 tracking-widest text-[10px] uppercase">
                WAKAF DIGITAL KHUSUS
              </Badge>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold font-headline leading-tight">Berinvestasi untuk Akhirat</h2>
                <p className="text-base opacity-90 max-w-xl font-medium">
                  Donasi Anda membantu pemeliharaan infrastruktur AI gratis untuk ribuan santri digital di seluruh Indonesia.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <Button asChild size="lg" className="bg-white text-[#800000] hover:bg-amber-50 font-black gap-2 h-14 px-8 shadow-xl">
                <Link href="/donate">
                  Dukung Dakwah Kami <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
              <p className="text-[10px] text-center opacity-70 font-bold uppercase tracking-tighter">Terima kasih atas kemurahan hati Anda</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary Section Header */}
      <div className="flex items-center justify-between mt-4">
        <h2 className="text-xl font-bold font-headline flex items-center gap-2 text-[#800000]">
          <TrendingUp className="w-5 h-5" />
          Ringkasan Progres
        </h2>
        <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-muted-foreground">
          <Link href="/progress">Lihat Detail</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-emerald-500 shadow-lg hover:translate-y-[-4px] transition-transform">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modul Selesai</CardTitle>
                  <ListChecks className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">4 / 6</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[66%]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Konsisten Belajar!</p>
              </CardContent>
          </Card>
           <Card className="border-t-4 border-t-[#800000] shadow-lg hover:translate-y-[-4px] transition-transform">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Akurasi Rata-rata</CardTitle>
                  <Target className="h-5 w-5 text-[#800000]" />
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-[#800000]">88%</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1 font-medium">
                      <TrendingUp className="w-3 h-3 text-emerald-500" /> +5% dari minggu lalu
                  </p>
              </CardContent>
          </Card>
           <Card className="border-t-4 border-t-blue-500 shadow-lg hover:translate-y-[-4px] transition-transform">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Halaqah Aktif</CardTitle>
                  <Users className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-blue-600">2</div>
                  <p className="text-xs text-muted-foreground pt-1 font-medium">
                      Bergabung di "Tafsir Juz' Amma"
                  </p>
              </CardContent>
          </Card>
      </div>

      {/* Accuracy Chart */}
      <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
        <CardHeader className="bg-muted/30 pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Grafik Tilawah
              </CardTitle>
              <CardDescription className="text-xs">
                Perkembangan akurasi mingguan Anda.
              </CardDescription>
            </div>
            <div className="p-2 bg-[#800000]/10 rounded-xl">
               <TrendingUp className="w-5 h-5 text-[#800000]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ProgressClient />
        </CardContent>
      </Card>
    </div>
  );
}
