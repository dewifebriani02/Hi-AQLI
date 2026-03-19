
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { Users, CheckCircle2, Clock, ArrowUpRight, ShieldCheck, BookOpen, UserCog, Library, HeartHandshake } from "lucide-react";
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

  const { data: pending } = useCollection("halaqah_registrations", pendingOptions);
  const { data: halaqahs } = useCollection("halaqahs");
  const { data: users } = useCollection("users");
  const { data: pendingDonations } = useCollection("donations", pendingDonationOptions);

  const stats = [
    { label: "Pendaftaran Baru", value: pending?.length || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Donasi Menunggu", value: pendingDonations?.length || 0, icon: HeartHandshake, color: "text-[#800000]", bg: "bg-red-50" },
    { label: "Santri Terdaftar", value: users?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#800000]">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Panel Kontrol Utama</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground">Kelola operasional dan data peserta Sahabat AQLI Digital.</p>
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
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline flex items-center justify-between">
              Verifikasi Pendaftaran
              <Badge className="bg-amber-500">{pending?.length || 0} BARU</Badge>
            </CardTitle>
            <CardDescription>Tinjau bukti pembayaran dan aktifkan akses kelas.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Aktifkan akun santri setelah validasi infaq atau pendaftaran gratis.</p>
            <Link href="/admin/registrations" className="w-full">
              <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
                Buka Antrean <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-red-50/50">
            <CardTitle className="text-lg font-headline flex items-center justify-between">
              Verifikasi Infaq & Wakaf
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

        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              Manajemen Peserta
              <UserCog className="w-5 h-5 text-[#800000]" />
            </CardTitle>
            <CardDescription>Edit data santri, target Juz, atau level.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground mb-4">Kelola hak akses dan profil santri yang sudah aktif dalam program.</p>
            <Link href="/admin/users" className="w-full">
              <Button variant="outline" className="w-full font-bold gap-2 border-[#800000] text-[#800000] hover:bg-[#800000]/5">
                Kelola Santri <Users className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
