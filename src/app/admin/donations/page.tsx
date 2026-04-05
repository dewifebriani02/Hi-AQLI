
'use client';

import { useState } from "react";
import { useUser, supabase } from "@/supabase";
import { useCollection, useCount } from "@/supabase/db";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useMemo } from "react";

export default function AdminDonationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const donationOptions = useMemo(() => ({
    orderBy: { column: 'created_at', ascending: false }
  }), []);

  const { data: donations, isLoading } = useCollection("donations", donationOptions);

  const campaignOptions = useMemo(() => ({
    filters: [{ column: 'is_active', operator: '==', value: true }],
    orderBy: { column: 'title', ascending: true }
  }), []);

  const { data: campaigns } = useCollection("campaigns", campaignOptions);

  const filterLearners = useMemo(() => ({
    filters: [{ column: 'role_id', operator: '==', value: 'learner' }]
  }), []);

  const { count: learnersCount } = useCount("users", filterLearners);

  const filteredDonations = donations?.filter(d => {
    const sender = (d?.sender_name || "").toLowerCase();
    const campaign = (d?.campaign_title || "").toLowerCase();
    const s = search.toLowerCase();
    return sender.includes(s) || campaign.includes(s);
  });

  const handleUpdateCampaign = async (donationId: string, campaignTitle: string) => {
    try {
      const { error } = await supabase.from("donations").update({
        campaign_title: campaignTitle,
      }).eq('id', donationId);

      if (error) throw error;

      toast({
        title: "Kampanye Diperbarui",
        description: `Donasi telah ditautkan ke: ${campaignTitle}`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal memperbarui kampanye." });
    }
  };

  const handleVerify = async (donationId: string) => {
    setProcessingId(donationId);
    try {
      const { error } = await supabase.from("donations").update({
        status: "verified",
      }).eq('id', donationId);

      if (error) throw error;

      toast({
        title: "Infaq Terverifikasi",
        description: "Status Infaq telah diperbarui menjadi berhasil.",
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Thalibah</p>
            <p className="text-3xl font-black mt-1">{(learnersCount || 0).toLocaleString('id-ID')}</p>
            <p className="text-[10px] font-bold text-[#800000] mt-4 uppercase">Aktif Beasiswa</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden border-l-4 border-[#D4AF37]">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kampanye Aktif</p>
            <p className="text-3xl font-black mt-1">{campaigns?.length || 0}</p>
            <p className="text-[10px] font-bold text-[#800000] mt-4 uppercase truncate">
              {campaigns?.slice(0, 2).map(c => c.title).join(' & ') || 'Belum Ada Kampanye'}
            </p>
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
                        <div className="flex flex-col gap-1 z-50">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <Select 
                            defaultValue={d.campaign_title || "Infaq Umum"} 
                            onValueChange={(val) => handleUpdateCampaign(d.id, val === "Infaq Umum" ? "" : val)}
                          >
                            <SelectTrigger className={cn(
                              "h-7 w-[180px] text-[10px] font-black uppercase border-none bg-muted/50 hover:bg-muted focus:ring-0 px-2",
                              !d.campaign_title && "text-amber-600 bg-amber-50"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Infaq Umum" className="text-[10px] font-bold uppercase">Infaq Umum (Tanpa Kampanye)</SelectItem>
                              {campaigns?.map((c) => (
                                <SelectItem key={c.id} value={c.title} className="text-[10px] font-bold uppercase">
                                  {c.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{d.sender_name || 'Hamba Allah'}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} • Rp {d.amount?.toLocaleString('id-ID') || '0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {d.payment_method === 'transfer' ? (
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className="text-[10px] font-bold uppercase">{d.payment_method === 'transfer' ? 'BSI' : 'QRIS'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#800000]">Rp {d.amount?.toLocaleString('id-ID')}</span>
                          {d.unique_code && <span className="text-[8px] font-bold text-amber-600 uppercase">Kode Unik: {d.unique_code}</span>}
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
                        <div className="flex items-center justify-end gap-2">
                          {d.proof_file_name && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 font-bold text-[9px] gap-1.5"
                              asChild
                            >
                              <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bukti_transfer/${d.proof_file_name}`} target="_blank" rel="noopener noreferrer">
                                <ArrowUpRight className="w-3 h-3" /> BUKTI
                              </a>
                            </Button>
                          )}
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
                        </div>
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
