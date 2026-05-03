"use client";

import { useState, useMemo } from "react";
import { useCollection } from "@/supabase/db";
import { supabase } from "@/supabase";
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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  XCircle,
  Zap,
  Building2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
        // Expected BSI format logic (Flexible for Tanggal, Keterangan, Nominal)
        lines.slice(1).forEach((line) => {
          const columns = line.split(/[,;]/); // Support comma or semicolon
          if (columns.length < 3) return;

          // Cleaning amount (BSI often uses dots as thousands separators and commas as decimals, or vice versa)
          // We'll try to find the numeric column
          let rawAmount = "";
          let description = "";
          let date = columns[0].trim();

          // Search logic for amount and description
          // BSI usually: Date, Desc, DB/CR, Amount
          // or simple: Date, Desc, Amount
          description = columns[1].trim();
          rawAmount = columns[columns.length - 1].trim().replace(/[Rp.\s]/g, "").replace(",", ".");
          
          const amount = parseFloat(rawAmount);

          if (!isNaN(amount) && amount > 0) {
            parsed.push({
              date,
              description,
              amount: Math.round(amount), // We deal with whole numbers in IDR
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

  // 3. Apply Actions
  const handleApplyReconciliation = async () => {
    if (matchedCount === 0) {
      toast({ title: "Tidak ada data yang cocok", variant: "destructive" });
      return;
    }

    if (!confirm(`Konfirmasi Verifikasi Masa: ${matchedCount} Thalibah akan diaktifkan secara permanen. Lanjutkan?`)) return;

    setIsApplying(true);
    try {
      const matchEntries = matches.filter(m => m.bsiEntry);
      
      // We'll perform updates in batches or sequence
      const results = await Promise.all(matchEntries.map(async (m) => {
        const reg = m.registration;
        
        // 1. Update Registration to Verified
        const { error: regError } = await supabase
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

        // 2. We don't need to update mufradat_status because of "Grace Period" logic 
        // (they are already active), but we keep it verified for records.
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
    }
  };

  const handleRevokeUnmatched = async () => {
    const unmatchEntries = matches.filter(m => !m.bsiEntry);
    if (unmatchEntries.length === 0) return;

    if (!confirm(`TINDAKAN TEGAS: ${unmatchEntries.length} thalibah tidak ditemukan di mutasi BSI. Akses mereka akan dicabut. Lanjutkan?`)) return;

    setIsApplying(true);
    try {
      await Promise.all(unmatchEntries.map(async (m) => {
        const reg = m.registration;
        
        // 1. Rejected Registration
        await supabase
          .from("halaqah_registrations")
          .update({ 
            status: "rejected", 
            updated_at: new Date().toISOString(),
            metadata: { ...reg.metadata, reject_reason: "Gagal Rekonsiliasi Rekening Koran" }
          })
          .eq("id", reg.id);

        // 2. Revoke User Access
        await supabase
          .from("users")
          .update({
            mufradat_status: 'suspended',
            mufradat_accessible_juz: [],
            updated_at: new Date().toISOString()
          })
          .eq("id", reg.user_id);
      }));

      toast({
        title: "Selesai",
        description: `${unmatchEntries.length} akses thalibah telah dicabut karena tidak ditemukan bukti transfer.`,
      });
      refreshRegs();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal pencabutan", description: err.message });
    } finally {
      setIsApplying(false);
    }
  };

  if (isRegLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Memuat Antrean Pendaftaran...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8 pb-32">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
        <Link href="/admin" className="hover:text-[#800000] transition-colors">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/admin/finance" className="hover:text-[#800000] transition-colors">Keuangan</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#800000]">Rekonsiliasi BSI</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black font-headline tracking-tighter text-[#800000] uppercase italic">REKONSILIASI BSI</h1>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest flex items-center gap-2">
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
            className="bg-white border-2 border-[#800000] text-[#800000] hover:bg-[#800000]/5 font-black h-12 rounded-xl shadow-sm gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            UNGGAH MUTASI BSI
          </Button>

          {bsiData.length > 0 && (
             <>
               <Button 
                onClick={handleApplyReconciliation}
                disabled={isApplying || matchedCount === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl shadow-lg gap-2"
              >
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                VERIFIKASI ({matchedCount})
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRevokeUnmatched}
                disabled={isApplying || matches.length === matchedCount}
                className="font-black h-12 rounded-xl shadow-lg gap-2"
              >
                <XCircle className="w-4 h-4" /> CABUT AKSES SISANYA
              </Button>
             </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden">
             <CardHeader className="p-8">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Ringkasan Antrean</CardTitle>
                <div className="flex items-end gap-3 mt-4">
                  <span className="text-5xl font-black">{pendingRegs?.length || 0}</span>
                  <span className="text-sm font-bold text-slate-400 uppercase mb-2">Pendaftar</span>
                </div>
             </CardHeader>
             <CardContent className="px-8 pb-8 space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold">Terdeteksi Cocok</span>
                   </div>
                   <span className="text-xl font-black text-emerald-500">{matchedCount}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold">Belum Ada Mutasi</span>
                   </div>
                   <span className="text-xl font-black text-rose-500">{(pendingRegs?.length || 0) - matchedCount}</span>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl bg-amber-50 border-2 border-amber-100">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-700">Panduan BSI</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-amber-900 leading-relaxed font-medium space-y-3">
              <p>1. Ekspor mutasi rekening dari BSI Online / Mobile dalam format **CSV** atau **TXT**.</p>
              <p>2. Pastikan file berisi kolom minimal: **Tanggal, Keterangan, Nominal**.</p>
              <p>3. Sistem akan mencocokkan **Nominal Persis** (termasuk kode unik) dengan antrean pendaftaran.</p>
              <p>4. Tekan **Verifikasi** untuk mengaktifkan thalibah yang datanya ditemukan di mutasi.</p>
              <p>5. Tekan **Cabut Akses** untuk memberhentikan thalibah yang nominal transfernya tidak masuk di rekening yayasan.</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-[#800000]">ANTREAN VS MUTASI</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Hasil analisis sistem</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari thalibah..." 
                  className="rounded-xl pl-10 border-none bg-slate-100 h-10 text-xs font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest">Thalibah</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Tagihan</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Status Pencocokan</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-8">Aksi</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {matches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <FileSpreadsheet className="w-16 h-16" />
                            <p className="font-black uppercase text-sm">Belum ada file mutasi yang diunggah</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : matches
                      .filter(m => m.registration.user_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((m, idx) => (
                      <TableRow key={m.registration.id} className={cn("transition-colors", m.isMatched ? "bg-emerald-50/30" : "bg-white")}>
                        <TableCell className="pl-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-black text-[#800000] text-sm">{m.registration.user_name}</span>
                            <span className="text-[10px] font-bold text-slate-400">{m.registration.halaqah_title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                              <span className="font-black text-slate-800">Rp {m.registration.amount?.toLocaleString('id-ID')}</span>
                              <span className="text-[10px] font-black text-[#800000]">Kode: {m.registration.unique_code || 0}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           {m.isMatched ? (
                             <div className="flex flex-col gap-1">
                                <Badge className="bg-emerald-600 text-white border-none w-fit text-[9px] font-black tracking-widest">COCOK</Badge>
                                <span className="text-[9px] text-emerald-800 font-bold truncate max-w-[200px]">
                                   {m.bsiEntry?.date}: {m.bsiEntry?.description}
                                </span>
                             </div>
                           ) : (
                             <Badge variant="outline" className="text-slate-400 border-slate-200 text-[9px] font-black tracking-widest">TIDAK DITEMUKAN</Badge>
                           )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                           {m.isMatched ? (
                             <CheckCircle2 className="w-6 h-6 text-emerald-500 ml-auto" />
                           ) : (
                             <XCircle className="w-6 h-6 text-slate-100 ml-auto" />
                           )}
                        </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
