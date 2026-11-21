"use client";

import { useState, useMemo } from "react";
import { useCollection } from "@/db";
import { db } from "@/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  XCircle,
  Building2,
  Search,
  Check,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

// Types for BSI Statement Entry
interface BsiTransaction {
  date: string;
  description: string;
  amount: number;
}

export default function MufradatReconciliationPage() {
  const { toast } = useToast();
  const [bsiData, setBsiData] = useState<BsiTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog confirmation states
  const [showReconDialog, setShowReconDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  // Fetch pending registrations
  const { data: pendingRegs, isLoading: isRegLoading, refresh: refreshRegs } = useCollection("halaqah_registrations", {
    filters: [{ column: "status", operator: "==", value: "pending_verification" }],
  });

  // 1. CSV Parsing Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        const parsed: BsiTransaction[] = [];

        // Simple CSV Parser (Skip header, try to find Date, Desc, Amount)
        lines.slice(1).forEach((line) => {
          const columns = line.split(/[,;]/);
          if (columns.length < 3) return;

          let rawAmount = "";
          let description = "";
          let date = columns[0].trim();

          description = columns[1].trim();
          rawAmount = columns[columns.length - 1].trim().replace(/[Rp.\s]/g, "").replace(",", ".");
          
          const amount = parseFloat(rawAmount);

          if (!isNaN(amount) && amount > 0) {
            parsed.push({
              date,
              description,
              amount: Math.round(amount),
            });
          }
        });

        setBsiData(parsed);
        toast({
          title: "File Berhasil Diproses",
          description: `Ditemukan ${parsed.length} transaksi di rekening koran.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Gagal Membaca File",
          description: "Pastikan format CSV/Excel sesuai (Tanggal, Keterangan, Nominal).",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // 2. Matching Logic
  const matches = useMemo(() => {
    if (!pendingRegs || bsiData.length === 0) return [];

    return pendingRegs.map((reg) => {
      // Find a transaction in bsiData that matches the amount
      const bsiMatch = bsiData.find((t) => t.amount === reg.amount);
      
      return {
        registration: reg,
        bsiEntry: bsiMatch || null,
        isMatched: !!bsiMatch,
      };
    }).sort((a, b) => (a.isMatched === b.isMatched ? 0 : a.isMatched ? -1 : 1));
  }, [pendingRegs, bsiData]);

  const matchedCount = useMemo(() => matches.filter(m => m.bsiEntry).length, [matches]);
  const unmatchedCount = useMemo(() => matches.filter(m => !m.bsiEntry).length, [matches]);

  // 3. Apply Actions
  const handleApplyReconciliation = async () => {
    if (matchedCount === 0) {
      toast({ title: "Tidak ada data yang cocok", variant: "destructive" });
      return;
    }

    setIsApplying(true);
    try {
      const matchEntries = matches.filter(m => m.bsiEntry);
      
      const results = await Promise.all(matchEntries.map(async (m) => {
        const reg = m.registration;
        
        // 1. Update Registration to Verified
        const { error: regError } = await db
          .from("halaqah_registrations")
          .update({
            status: "verified",
            verified_at: new Date().toISOString(),
            start_date: new Date().toISOString(),
            metadata: { 
              ...reg.metadata, 
              recon_match_desc: m.bsiEntry?.description,
              recon_match_date: m.bsiEntry?.date,
              reconciled_at: new Date().toISOString()
            }
          })
          .eq("id", reg.id);

        if (regError) throw regError;
        return true;
      }));

      toast({
        title: "Rekonsiliasi Selesai",
        description: `Alhamdulillah, ${results.length} thalibah telah diverifikasi secara permanen.`,
      });
      refreshRegs();
      setBsiData([]);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal eksekusi",
        description: err.message,
      });
    } finally {
      setIsApplying(false);
      setShowReconDialog(false);
    }
  };

  const handleRevokeUnmatched = async () => {
    const unmatchEntries = matches.filter(m => !m.bsiEntry);
    if (unmatchEntries.length === 0) return;

    setIsApplying(true);
    try {
      await Promise.all(unmatchEntries.map(async (m) => {
        const reg = m.registration;
        
        // 1. Rejected Registration
        await db
          .from("halaqah_registrations")
          .update({ 
            status: "rejected", 
            updated_at: new Date().toISOString(),
            metadata: { ...reg.metadata, reject_reason: "Gagal Rekonsiliasi Rekening Koran" }
          })
          .eq("id", reg.id);

        // 2. Revoke User Access
        await db
          .from("users")
          .update({
            mufradat_status: 'suspended',
            mufradat_accessible_juz: [],
            updated_at: new Date().toISOString()
          })
          .eq("id", reg.user_id);
      }));

      toast({
        title: "Pencabutan Selesai",
        description: `${unmatchEntries.length} akses thalibah telah dicabut karena tidak ditemukan bukti transfer.`,
      });
      refreshRegs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal pencabutan", description: err.message });
    } finally {
      setIsApplying(false);
      setShowRevokeDialog(false);
    }
  };

  if (isRegLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Antrean Pendaftaran...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 mt-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-black font-headline tracking-tight text-[#6D123F] uppercase">
            Rekonsiliasi BSI
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" /> Pencocokan Mutasi Bank Otomatis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input 
            type="file" 
            id="bsi-upload" 
            className="hidden" 
            accept=".csv,.txt"
            onChange={handleFileUpload}
          />
          <Button 
            disabled={isProcessing}
            onClick={() => document.getElementById('bsi-upload')?.click()}
            className="bg-white border-2 border-[#6D123F] text-[#6D123F] hover:bg-[#6D123F]/5 font-black h-11 px-5 rounded-xl shadow-sm gap-2 text-xs"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            UNGGAH MUTASI BSI
          </Button>

          {bsiData.length > 0 && (
            <>
              <Button 
                onClick={() => setShowReconDialog(true)}
                disabled={isApplying || matchedCount === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 px-5 rounded-xl shadow-md gap-2 text-xs uppercase"
              >
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                VERIFIKASI ({matchedCount})
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setShowRevokeDialog(true)}
                disabled={isApplying || matches.length === matchedCount}
                className="font-black h-11 px-5 rounded-xl shadow-md gap-2 text-xs uppercase"
              >
                <XCircle className="w-4 h-4" /> CABUT AKSES SISANYA
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-2xl overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Ringkasan Antrean</CardTitle>
              <div className="flex items-end gap-3 mt-3">
                <span className="text-4xl font-black">{pendingRegs?.length || 0}</span>
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">Pendaftar Menunggu</span>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">Terdeteksi Cocok</span>
                </div>
                <span className="text-lg font-black text-emerald-400">{matchedCount}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">Belum Ada Mutasi</span>
                </div>
                <span className="text-lg font-black text-rose-400">{(pendingRegs?.length || 0) - matchedCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl bg-amber-50/80 border border-amber-200">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-800">
                Panduan Mutasi BSI
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2 text-xs text-amber-900 leading-relaxed font-medium space-y-2">
              <p>1. Ekspor mutasi rekening dari BSI Mobile / Net Banking dalam format <strong>CSV</strong> atau <strong>TXT</strong>.</p>
              <p>2. Pastikan file berisi kolom: <strong>Tanggal, Keterangan, Nominal</strong>.</p>
              <p>3. Sistem otomatis mencocokkan nominal persis termasuk <strong>kode unik</strong> transfer pendaftar.</p>
              <p>4. Tekan <strong>Verifikasi</strong> untuk menyetujui akses secara permanen.</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
              <div>
                <CardTitle className="text-base font-black text-[#6D123F] uppercase">
                  Antrean vs Mutasi Bank
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  {bsiData.length > 0 ? `${bsiData.length} data mutasi dianalisis` : "Unggah file mutasi BSI untuk memulai pencocokan"}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari nama thalibah..." 
                  className="rounded-xl pl-9 border-slate-200 bg-white h-10 text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Thalibah</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Tagihan</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Status Pencocokan</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <FileSpreadsheet className="w-12 h-12 text-slate-300" />
                            <p className="font-black uppercase text-xs text-slate-600">Belum ada file mutasi yang diunggah</p>
                            <p className="text-[11px] text-muted-foreground">Silakan klik tombol &quot;Unggah Mutasi BSI&quot; di kanan atas</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : matches
                      .filter(m => m.registration.user_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((m) => (
                      <TableRow key={m.registration.id} className={cn("transition-colors", m.isMatched ? "bg-emerald-50/40" : "bg-white")}>
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-[#6D123F] text-xs">{m.registration.user_name}</span>
                            <span className="text-[10px] font-bold text-slate-400">{m.registration.halaqah_title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-xs">Rp {m.registration.amount?.toLocaleString('id-ID')}</span>
                            <span className="text-[9px] font-black text-[#6D123F]">Kode: {m.registration.unique_code || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.isMatched ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-emerald-600 text-white border-none w-fit text-[9px] font-black tracking-widest px-2 py-0.5">COCOK</Badge>
                              <span className="text-[9px] text-emerald-800 font-bold truncate max-w-[220px]">
                                {m.bsiEntry?.date}: {m.bsiEntry?.description}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 text-[9px] font-bold tracking-widest px-2 py-0.5">TIDAK DITEMUKAN</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {m.isMatched ? (
                            <div className="flex items-center justify-end text-emerald-600 font-bold text-xs gap-1">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-end text-slate-300">
                              <XCircle className="w-5 h-5" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AlertDialog for Mass Verification */}
      <AlertDialog open={showReconDialog} onOpenChange={setShowReconDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-emerald-700 uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Konfirmasi Verifikasi Massal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Sebanyak <strong className="text-emerald-700 font-black">{matchedCount} thalibah</strong> yang nominal transfernya cocok dengan rekening koran BSI akan diaktifkan secara permanen. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApplyReconciliation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              Ya, Verifikasi ({matchedCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog for Revoking Unmatched Access */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-rose-600 uppercase flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Konfirmasi Pencabutan Akses
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Sebanyak <strong className="text-rose-600 font-black">{unmatchedCount} thalibah</strong> yang tidak ditemukan di mutasi BSI akan dicabut akses pembelajarannya dan status pendaftarannya diubah menjadi ditolak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeUnmatched}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Ya, Cabut Akses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
