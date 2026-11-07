'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser } from "@/db";
import { useCollection } from "@/db";
import {
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  UserCog,
  Library,
  HeartHandshake,
  MessageSquare,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function AdminDashboard() {
  const { user } = useUser();

  // Fetch Stats - Only if user is logged in
  const pendingOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'pending_verification' }]
  }), []);

  const pendingDonationOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'pending_verification' }]
  }), []);

  const pendingTikrarOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'pending' }]
  }), []);

  const { data: pending } = useCollection("halaqah_registrations", pendingOptions);
  const { data: users } = useCollection("users");
  const { data: pendingDonations } = useCollection("donations", pendingDonationOptions);
  const { data: pendingTikrarSubs } = useCollection("tikrar_submissions", pendingTikrarOptions);

  const stats = [
    { label: "Pendaftaran Baru", value: pending?.length || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Infaq Menunggu", value: pendingDonations?.length || 0, icon: HeartHandshake, color: "text-[#800000]", bg: "bg-red-50" },
    { label: "Thalibah Terdaftar", value: users?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#800000]">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Panel Kontrol Utama</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground">Kelola operasional, verifikasi setoran, dan pantau keaktifan peserta Sahabat AQLI Digital.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-3xl font-black">{s.value}</p>
              </div>
              <div className={cn("p-3 rounded-2xl", s.bg)}>
                <s.icon className={cn("w-6 h-6", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monitoring & Verifikasi Hi Tikrar */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-red-50/70 border-b border-red-100/70">
            <CardTitle className="text-lg font-headline flex items-center justify-between text-[#800000]">
              <span className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-[#800000]" />
                Monitoring &amp; Verifikasi Hi Tikrar
              </span>
              <Badge className="bg-[#800000] text-white font-bold text-[10px]">
                {pendingTikrarSubs?.length || 0} ANTREAN TASMI&apos;
              </Badge>
            </CardTitle>
            <CardDescription className="text-red-950/80">
              Pantau heatmap keaktifan 30 hari grup, verifikasi setoran live Zoom, kelola link Zoom halaqah, dan broadcast WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">
              Akses cepat portal Musyrifah &amp; Admin Tikrar untuk memeriksa aktivitas thalibah, validasi kelulusan blok/halaman, dan rekap peserta.
            </p>
            <Link href="/admin/tikrar" className="w-full">
              <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-bold gap-2 shadow-sm">
                Buka Portal Tikrar <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Daftar Grup & Monitor Pesan WhatsApp */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-emerald-50/60 border-b border-emerald-100/60">
            <CardTitle className="text-lg font-headline flex items-center justify-between text-emerald-950">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Daftar Grup &amp; Monitor Pesan
              </span>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]">
                TIKRAR &amp; MUFRADAT
              </Badge>
            </CardTitle>
            <CardDescription className="text-emerald-800/80">
              Pemisahan ketat grup Tikrar &amp; Mufradat, broadcast aman, monitor pesan, dan japri thalibah.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">
              Cegah salah kirim broadcast, pantau riwayat pesan terkirim ke WhatsApp group, dan kirim pesan japri ke nomor peserta.
            </p>
            <Link href="/admin/groups" className="w-full">
              <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 shadow-sm">
                Buka Manajemen Grup <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Monitoring Hi Mufradat */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-indigo-50/60 border-b border-indigo-100/60">
            <CardTitle className="text-lg font-headline flex items-center justify-between text-indigo-950">
              <span className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-700" />
                Monitoring &amp; Laporan Hi Mufradat
              </span>
              <Badge className="bg-indigo-700 text-white font-bold text-[10px]">
                KOSAKATA QURAN
              </Badge>
            </CardTitle>
            <CardDescription className="text-indigo-900/80">
              Pantau laporan mabar, kuis kosakata Quran harian, dan izin cuti thalibah.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">
              Kelola grup halaqah kosakata, tinjau hasil ujian evaluasi juz, dan periksa keaktifan thalibah di kelas Mufradat.
            </p>
            <Link href="/admin/mufradat" className="w-full">
              <Button className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold gap-2 shadow-sm">
                Buka Portal Mufradat <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Monitoring Hi Mutabaah */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-amber-50/60 border-b border-amber-100/60">
            <CardTitle className="text-lg font-headline flex items-center justify-between text-amber-950">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-700" />
                Laporan &amp; Keaktifan Mutabaah
              </span>
              <Badge className="bg-amber-700 text-white font-bold text-[10px]">
                32 AMALAN YAUMIYYAH
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-900/80">
              Pantau pencapaian 32 amalan yaumiyyah harian thalibah dan streak keaktifan ibadah.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">
              Tinjau grafik kepatuhan ibadah harian thalibah (shalat fardhu/sunnah, tilawah, dzikir pagi/petang, dan puasa).
            </p>
            <Link href="/admin/mutabaah" className="w-full">
              <Button className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold gap-2 shadow-sm">
                Buka Laporan Mutabaah <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Verifikasi Pendaftaran */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline flex items-center justify-between">
              Verifikasi Pendaftaran
              <Badge className="bg-amber-500">{pending?.length || 0} BARU</Badge>
            </CardTitle>
            <CardDescription>Tinjau bukti pembayaran dan aktifkan akses kelas.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Aktifkan akun Thalibah setelah validasi infaq atau pendaftaran gratis.</p>
            <Link href="/admin/registrations" className="w-full">
              <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
                Buka Antrean <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Verifikasi Infaq & Wakaf */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-red-50/50">
            <CardTitle className="text-lg font-headline flex items-center justify-between">
              Verifikasi Infaq &amp; Wakaf
              <Badge className="bg-[#800000]">{pendingDonations?.length || 0} BARU</Badge>
            </CardTitle>
            <CardDescription>Kelola kontribusi digital dari thalibah HI AQLI.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Validasi transfer wakaf server AI dan infaq operasional dakwah digital.</p>
            <Link href="/admin/donations" className="w-full">
              <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
                Buka Riwayat Berbagi <HeartHandshake className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Manajemen Peserta */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              Manajemen Peserta
              <UserCog className="w-5 h-5 text-[#800000]" />
            </CardTitle>
            <CardDescription>Edit data Thalibah, target Juz, atau level.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Kelola hak akses dan profil Thalibah yang sudah aktif dalam program.</p>
            <Link href="/admin/users" className="w-full">
              <Button variant="outline" className="w-full font-bold gap-2 border-[#800000] text-[#800000] hover:bg-[#800000]/5">
                Kelola Thalibah <Users className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Manajemen Kelas */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              Manajemen Kelas
              <Library className="w-5 h-5 text-[#800000]" />
            </CardTitle>
            <CardDescription>Tambah program baru atau edit materi.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Update katalog kelas Tahsin, Tafsir, dan Tahfidz di HI AQLI.</p>
            <Link href="/admin/classes" className="w-full">
              <Button variant="secondary" className="w-full font-bold gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
                Atur Katalog <Library className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Manajemen Voucher */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg font-headline flex items-center gap-2 text-slate-800">
              Manajemen Voucher
              <ShieldCheck className="w-5 h-5 text-slate-500" />
            </CardTitle>
            <CardDescription>Generate dan pantau penggunaan voucher promo.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Buat kode akses bebas infaq atau keringanan per program (Mufradat/Tikrar) dengan masa berlaku.</p>
            <Link href="/admin/vouchers" className="w-full">
              <Button variant="outline" className="w-full font-black gap-2 border-slate-300 text-slate-700 hover:bg-slate-100">
                Data Voucher <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
