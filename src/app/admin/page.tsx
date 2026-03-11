
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Users, CheckCircle2, Clock, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  // Fetch Stats - Only if user is logged in
  const pendingQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "tikrar_registrations"),
      where("status", "==", "pending_verification")
    );
  }, [db, user?.uid]);

  const activeQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "tikrar_registrations"),
      where("status", "==", "active")
    );
  }, [db, user?.uid]);

  const { data: pending } = useCollection(pendingQuery);
  const { data: active } = useCollection(activeQuery);

  const stats = [
    { label: "Menunggu Verifikasi", value: pending?.length || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Pendaftaran Aktif", value: active?.length || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Pengguna", value: "...", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#800000]">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Panel Kontrol Utama</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground">Kelola operasional Sahabat AQLI Digital.</p>
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
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline flex items-center justify-between">
              Manajemen Tikrar
              <Badge className="bg-amber-500">{pending?.length || 0} BARU</Badge>
            </CardTitle>
            <CardDescription>Verifikasi pembayaran pendaftaran program Tikrar Daily.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Tinjau bukti transfer dan aktifkan akses Juz pengguna secara manual.</p>
              <Link href="/admin/registrations">
                <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
                  Buka Antrean Verifikasi <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg font-headline">Laporan Donasi</CardTitle>
            <CardDescription>Pantau arus kas infaq dan wakaf digital.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Lihat riwayat donasi umum untuk operasional infrastruktur AI.</p>
              <Button variant="outline" className="w-full font-bold gap-2" disabled>
                Segera Hadir <Clock className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
