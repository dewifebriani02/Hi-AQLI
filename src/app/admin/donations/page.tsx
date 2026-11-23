'use client';

import { useState, useMemo } from "react";
import { useUser, db } from "@/db";
import { useCollection, useCount } from "@/db";
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
  Loader2,
  TrendingUp,
  Filter,
  ArrowUpRight,
  Landmark,
  QrCode,
  Eye,
  X,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminDonationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Verification AlertDialog state
  const [verifyTarget, setVerifyTarget] = useState<{ id: string; sender: string; amount: number } | null>(null);

  // Proof Image Preview Dialog state
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  const donationOptions = useMemo(() => ({
    orderBy: { column: 'created_at', ascending: false }
  }), []);

  const { data: donations, isLoading, refresh } = useCollection("donations", donationOptions);

  const campaignOptions = useMemo(() => ({
    filters: [{ column: 'is_active', operator: '==', value: true }],
    orderBy: { column: 'title', ascending: true }
  }), []);

  const { data: campaigns } = useCollection("campaigns", campaignOptions);

  const filterLearners = useMemo(() => ({
    filters: [{ column: 'role_id', operator: '==', value: 'learner' }]
  }), []);

  const { count: learnersCount } = useCount("users", filterLearners);

  const filteredDonations = useMemo(() => {
    if (!donations) return [];
    return donations.filter(d => {
      const sender = (d?.sender_name || "").toLowerCase();
      const campaign = (d?.campaign_title || "").toLowerCase();
      const s = search.toLowerCase();
      const matchesSearch = !s || sender.includes(s) || campaign.includes(s) || (d?.amount?.toString() || "").includes(s);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "verified" && d.status === "verified") ||
        (statusFilter === "pending" && d.status === "pending_verification");

      const matchesMethod =
        methodFilter === "all" ||
        d.payment_method === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [donations, search, statusFilter, methodFilter]);

  const handleUpdateCampaign = async (donationId: string, campaignTitle: string) => {
    try {
      const { error } = await db.from("donations").update({
        campaign_title: campaignTitle,
      }).eq('id', donationId);

      if (error) throw error;

      toast({
        title: "Kampanye Diperbarui",
        description: `Donasi telah ditautkan ke: ${campaignTitle || "Infaq Umum"}`,
      });
      refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal memperbarui kampanye." });
    }
  };

  const confirmVerify = async () => {
    if (!verifyTarget) return;
    const donationId = verifyTarget.id;
    setProcessingId(donationId);
    try {
      const { error } = await db.from("donations").update({
        status: "verified",
      }).eq('id', donationId);

      if (error) throw error;

      toast({
        title: "Infaq Terverifikasi",
        description: `Donasi dari ${verifyTarget.sender} berhasil diverifikasi.`,
      });
      refresh();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal memproses verifikasi." });
    } finally {
      setProcessingId(null);
      setVerifyTarget(null);
    }
  };

  const stats = {
    total: donations?.filter(d => d.status === 'verified').reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0,
    pending: donations?.filter(d => d.status === 'pending_verification').length || 0,
    count: donations?.filter(d => d.status === 'verified').length || 0
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Transaksi Infaq...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mt-2">
        <div>
          <h1 className="text-2xl font-black font-headline tracking-tight text-primary uppercase">
            Transaksi Infaq
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Hi Berbagi &bull; Rekapitulasi & Verifikasi Donasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3 py-1 gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {stats.pending} Menunggu Verifikasi
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-1">
        <Card className="border-none shadow-md bg-gradient-to-br from-primary to-[#4A0A2A] text-white overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-15">
            <HeartHandshake className="w-28 h-28" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Total Dana Terkumpul</p>
            <p className="text-2xl xl:text-3xl font-black mt-1 break-words">Rp {stats.total.toLocaleString('id-ID')}</p>
            <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-amber-200">
              <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>DARI {stats.count} TRANSAKSI TERVERIFIKASI</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden border-l-4 border-amber-500">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Penerima Beasiswa</p>
            <p className="text-3xl font-black mt-1 text-slate-800">{(learnersCount || 0).toLocaleString('id-ID')}</p>
            <p className="text-[10px] font-bold text-primary mt-4 uppercase">Thalibah Aktif Belajar</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden border-l-4 border-primary">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kampanye Infaq Aktif</p>
            <p className="text-3xl font-black mt-1 text-slate-800">{campaigns?.length || 0}</p>
            <p className="text-[10px] font-bold text-primary mt-4 uppercase truncate">
              {campaigns?.slice(0, 2).map(c => c.title).join(' & ') || 'Belum Ada Kampanye'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-1">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama pengirim, nominal, atau program..."
            className="pl-11 h-12 bg-white border-slate-200 shadow-sm text-sm font-medium rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 bg-white border-slate-200 shadow-sm text-xs font-bold rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold">Semua Status</SelectItem>
              <SelectItem value="pending" className="text-xs font-bold text-amber-600">Menunggu Verifikasi</SelectItem>
              <SelectItem value="verified" className="text-xs font-bold text-emerald-600">Terverifikasi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="h-12 bg-white border-slate-200 shadow-sm text-xs font-bold rounded-xl">
              <SelectValue placeholder="Metode Pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold">Semua Metode</SelectItem>
              <SelectItem value="transfer" className="text-xs font-bold">Transfer Bank (BSI)</SelectItem>
              <SelectItem value="qris" className="text-xs font-bold">QRIS Instant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="border-none shadow-xl overflow-hidden bg-white mx-1 rounded-2xl">
        <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
            <Filter className="w-4 h-4 text-primary" /> Riwayat Transaksi Infaq
          </CardTitle>
          <Badge variant="outline" className="bg-white text-xs font-bold">
            {filteredDonations.length} Transaksi
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Tgl & Kampanye</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Pengirim / Donatur</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Metode</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Nominal</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HeartHandshake className="w-12 h-12 text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">Tidak ada data infaq yang sesuai</p>
                        <p className="text-xs text-muted-foreground">Coba ubah filter pencarian atau status di atas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDonations.map((d) => (
                    <TableRow key={d.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="py-4 pl-6">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </span>
                          <Select 
                            defaultValue={d.campaign_title || "Infaq Umum"} 
                            onValueChange={(val) => handleUpdateCampaign(d.id, val === "Infaq Umum" ? "" : val)}
                          >
                            <SelectTrigger className={cn(
                              "h-7 w-[200px] text-[10px] font-black uppercase border border-slate-200 bg-white hover:bg-slate-50 px-2 rounded-lg",
                              !d.campaign_title && "text-amber-700 bg-amber-50/60 border-amber-200"
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
                          <span className="text-xs font-bold text-slate-900">{d.sender_name || 'Hamba Allah'}</span>
                          {d.sender_email && (
                            <span className="text-[10px] text-muted-foreground">{d.sender_email}</span>
                          )}
                          {d.notes && (
                            <span className="text-[10px] italic text-slate-500 line-clamp-1 mt-0.5">&quot;{d.notes}&quot;</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {d.payment_method === 'transfer' ? (
                            <Badge variant="outline" className="text-[9px] font-bold gap-1 border-blue-200 text-blue-700 bg-blue-50/50">
                              <Landmark className="w-3 h-3" /> BSI
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-bold gap-1 border-emerald-200 text-emerald-700 bg-emerald-50/50">
                              <QrCode className="w-3 h-3" /> QRIS
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-primary">
                            Rp {d.amount?.toLocaleString('id-ID')}
                          </span>
                          {d.unique_code && (
                            <span className="text-[8px] font-bold text-amber-600 uppercase">
                              Kode Unik: {d.unique_code}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[9px] font-black border-none px-2.5 py-0.5",
                          d.status === 'verified'
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800 animate-pulse"
                        )}>
                          {d.status === 'verified' ? 'BERHASIL' : 'MENUNGGU'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {d.proof_file_name && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 font-bold text-[10px] gap-1 rounded-lg border-slate-200 hover:bg-slate-100"
                              onClick={() => setProofPreviewUrl(`/uploads/donations/${d.proof_file_name}`)}
                            >
                              <Eye className="w-3 h-3" /> Bukti
                            </Button>
                          )}
                          {d.status === 'pending_verification' ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 font-black text-[10px] gap-1.5 rounded-lg shadow-sm"
                              onClick={() => setVerifyTarget({
                                id: d.id,
                                sender: d.sender_name || 'Hamba Allah',
                                amount: d.amount || 0
                              })}
                              disabled={processingId === d.id}
                            >
                              {processingId === d.id ? (
                                <Loader2 className="animate-spin w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              VERIFIKASI
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center h-8 w-8 text-emerald-600" title="Terverifikasi">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
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

      {/* AlertDialog for Verification Confirmation */}
      <AlertDialog open={!!verifyTarget} onOpenChange={(open) => !open && setVerifyTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-slate-900 uppercase">
              Konfirmasi Verifikasi Infaq
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin memverifikasi transaksi infaq dari{" "}
              <strong className="text-slate-900">{verifyTarget?.sender}</strong> sebesar{" "}
              <strong className="text-primary">Rp {verifyTarget?.amount?.toLocaleString('id-ID')}</strong>?
              Status transaksi akan diubah menjadi <strong className="text-emerald-600">Berhasil</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVerify}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              Ya, Verifikasi Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for Proof Preview */}
      <Dialog open={!!proofPreviewUrl} onOpenChange={(open) => !open && setProofPreviewUrl(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Bukti Transfer Infaq
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-200 min-h-[300px]">
            {proofPreviewUrl ? (
              <img
                src={proofPreviewUrl}
                alt="Bukti Transfer"
                className="max-h-[60vh] object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <Button asChild variant="outline" size="sm" className="text-xs font-bold gap-1 rounded-xl">
                <a href={proofPreviewUrl || "#"} target="_blank" rel="noopener noreferrer">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Buka Ukuran Penuh
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
