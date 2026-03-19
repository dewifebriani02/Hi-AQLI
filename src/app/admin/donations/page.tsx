
'use client';

import { useState } from "react";
import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Filter,
  ArrowUpRight,
  Landmark,
  QrCode
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

export default function AdminDonationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const donationOptions = useMemo(() => ({
    orderBy: { column: 'createdAt', ascending: false }
  }), []);

  const { data: donations, isLoading } = useCollection("donations", donationOptions);

  const filteredDonations = donations?.filter(d =>
    d.senderName?.toLowerCase().includes(search.toLowerCase()) ||
    d.campaignTitle?.toLowerCase().includes(search.toLowerCase())
  );

  const handleVerify = async (donationId: string) => {
    setProcessingId(donationId);
    try {
      const { error } = await supabase.from("donations").update({
        status: "verified",
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).eq('id', donationId);

      if (error) throw error;

      toast({
        title: "Infaq Terverifikasi",
        description: "Status donasi telah diperbarui menjadi berhasil.",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal memproses verifikasi." });
    } finally {
      setProcessingId(null);
    }
  };

  const stats = {
    total: donations?.filter(d => d.status === 'verified').reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0,
    pending: donations?.filter(d => d.status === 'pending_verification').length || 0,
    count: donations?.filter(d => d.status === 'verified').length || 0
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Transaksi...</p></div>;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      <div className="flex items-center justify-between gap-4 px-1 mt-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Laporan Infaq</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Manajemen Hi Berbagi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1">
        <Card className="border-none shadow-sm bg-[#800000] text-white overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-10"><HeartHandshake className="w-24 h-24" /></div>
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Total Dana Terkumpul</p>
            <p className="text-3xl font-black mt-1">Rp {stats.total.toLocaleString('id-ID')}</p>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
              <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
              <span>DARI {stats.count} DONATUR</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden border-l-4 border-amber-500">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Menunggu Verifikasi</p>
            <p className="text-3xl font-black mt-1">{stats.pending}</p>
            <p className="text-[10px] font-bold text-amber-600 mt-4 uppercase">Butuh Konfirmasi Admin</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden border-l-4 border-[#D4AF37]">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kampanye Aktif</p>
            <p className="text-3xl font-black mt-1">3</p>
            <p className="text-[10px] font-bold text-[#800000] mt-4 uppercase">Infrastruktur & Beasiswa</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama pengirim atau kampanye..."
          className="pl-11 h-12 bg-white border-none shadow-sm text-sm font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-white mx-1">
        <CardHeader className="bg-muted/30 px-6 py-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#800000]" /> Riwayat Transaksi
          </CardTitle>
          <Badge variant="outline" className="bg-white">{filteredDonations?.length || 0} Data</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="text-[10px] font-black uppercase py-4">Tgl & Kampanye</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Pengirim</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Metode</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Nominal</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredDonations || filteredDonations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic text-sm">
                      Belum ada data infaq yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDonations.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/5 transition-colors group">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span className="text-xs font-black text-[#800000] uppercase mt-0.5">{d.campaignTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{d.senderName || 'Hamba Allah'}</span>
                          <span className="text-[9px] text-muted-foreground">ID: {d.userId?.slice(0, 8) || 'Anonim'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {d.paymentMethod === 'transfer' ? (
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className="text-[10px] font-bold uppercase">{d.paymentMethod === 'transfer' ? 'BSI' : 'QRIS'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#800000]">Rp {d.amount?.toLocaleString('id-ID')}</span>
                          {d.uniqueCode && <span className="text-[8px] font-bold text-amber-600 uppercase">Kode Unik: {d.uniqueCode}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[8px] font-black border-none px-2 py-0.5 tracking-tighter",
                          d.status === 'verified' ? "bg-emerald-500" : "bg-amber-500"
                        )}>
                          {d.status === 'verified' ? 'BERHASIL' : 'MENUNGGU'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.status === 'pending_verification' ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 h-8 font-black text-[9px] gap-1.5"
                            onClick={() => handleVerify(d.id)}
                            disabled={processingId === d.id}
                          >
                            {processingId === d.id ? <Loader2 className="animate-spin w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            VERIFIKASI
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 pointer-events-none">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
