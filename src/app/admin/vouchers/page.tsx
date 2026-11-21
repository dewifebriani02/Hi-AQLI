'use client';

import { useState, useMemo } from "react";
import { db } from "@/db";
import { useCollection } from "@/db";
import { useUser } from "@/db";
import { useUserPermissions } from "@/lib/permissions";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Plus, 
  Ticket, 
  Calendar, 
  Users, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ShieldCheck,
  Tag,
  Copy,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function AdminVouchersPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { canDelete } = useUserPermissions(user?.id);
  
  const voucherOptions = useMemo(() => ({
    orderBy: { column: 'created_at', ascending: false }
  }), []);

  const { data: vouchers, isLoading: isVouchersLoading, refresh: refreshVouchers } = useCollection("vouchers", voucherOptions);
  
  const redemptionOptions = useMemo(() => ({
    select: "*, vouchers(*), users(username, email)"
  }), []);

  const { data: redemptions } = useCollection("voucher_redemptions", redemptionOptions);
  
  const { data: registrations } = useCollection("halaqah_registrations", {
    select: "id, metadata, user_id"
  });

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");

  // New Voucher Form State
  const [newVoucher, setNewVoucher] = useState({
    code: "",
    description: "",
    program_id: "mufradat",
    expiry_date: "",
    usage_limit: ""
  });

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucher.code.trim()) {
      toast({ variant: "destructive", title: "Kode voucher wajib diisi." });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await db.from("vouchers").insert({
        code: newVoucher.code.trim().toUpperCase(),
        description: newVoucher.description,
        program_id: newVoucher.program_id,
        expiry_date: newVoucher.expiry_date ? new Date(newVoucher.expiry_date).toISOString() : null,
        usage_limit: newVoucher.usage_limit ? parseInt(newVoucher.usage_limit) : null,
        type: 'free_access',
        is_active: true
      });

      if (error) throw error;

      toast({ title: "Voucher Berhasil Dibuat", description: `Kode ${newVoucher.code.toUpperCase()} telah aktif.` });
      setNewVoucher({ code: "", description: "", program_id: "mufradat", expiry_date: "", usage_limit: "" });
      setShowCreateForm(false);
      refreshVouchers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal membuat voucher", description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDeleteVoucher = async () => {
    if (!deleteTarget) return;
    setIsDeleting(deleteTarget.id);
    try {
      const { error } = await db.from("vouchers").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Voucher Dihapus", description: `Kode ${deleteTarget.code} telah dihapus.` });
      refreshVouchers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: err.message });
    } finally {
      setIsDeleting(null);
      setDeleteTarget(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Kode Disalin",
      description: `Kode voucher "${code}" berhasil disalin ke clipboard.`
    });
  };

  const voucherStats = useMemo(() => {
    if (!vouchers) return [];
    
    return vouchers.map(v => {
      // Hybrid count: from redemption table + registration metadata (avoiding duplicates)
      const redemptionsCount = (redemptions || []).filter(r => r.voucher_id === v.id).length;
      
      const regVoucherCount = (registrations || []).filter(reg => 
        reg.metadata?.voucher_code === v.code && 
        !(redemptions || []).some(red => red.user_id === reg.user_id && red.voucher_id === v.id)
      ).length;

      const totalUsage = redemptionsCount + regVoucherCount;
      const isExpired = v.expiry_date ? new Date(v.expiry_date) < new Date() : false;
      const isLimitReached = v.usage_limit ? totalUsage >= v.usage_limit : false;
      
      return {
        ...v,
        usageCount: totalUsage,
        isExpired,
        isLimitReached,
        status: !v.is_active ? 'inactive' : isExpired ? 'expired' : isLimitReached ? 'limit_reached' : 'active'
      };
    });
  }, [vouchers, redemptions, registrations]);

  const filteredVouchers = useMemo(() => {
    return voucherStats.filter(v => {
      const matchesSearch = !search ||
        v.code.toLowerCase().includes(search.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(search.toLowerCase()));
      const matchesProgram = programFilter === "all" || v.program_id === programFilter;
      return matchesSearch && matchesProgram;
    });
  }, [voucherStats, search, programFilter]);

  if (isVouchersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Data Voucher Promo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mt-2">
        <div>
          <h1 className="text-2xl font-black font-headline tracking-tight text-[#6D123F] uppercase">
            Voucher Promo
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            AQLI Rewards &bull; Generate & Kontrol Akses Promo Program
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={cn(
            "font-black uppercase text-xs h-11 px-5 rounded-xl shadow-md transition-all gap-2",
            showCreateForm
              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
              : "bg-[#6D123F] hover:bg-[#520d2f] text-white"
          )}
        >
          {showCreateForm ? <ChevronLeft className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreateForm ? "BATAL FORM" : "BUAT VOUCHER"}
        </Button>
      </div>

      {/* Form Tambah Voucher */}
      {showCreateForm && (
        <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-2xl animate-in slide-in-from-top-4 duration-300 mx-1">
          <div className="h-2 bg-[#6D123F]" />
          <CardHeader className="p-6">
            <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-slate-900">
              <Ticket className="w-5 h-5 text-[#6D123F]" /> Generate Kode Promo Baru
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              Satu kode voucher dapat dibatasi kuota atau masa berlakunya untuk program tertentu.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateVoucher}>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-0 px-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Kode Voucher (Unique) *
                  </Label>
                  <Input 
                    placeholder="Contoh: AQLIRAMADHAN" 
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})}
                    className="h-12 border-2 rounded-xl font-mono font-bold text-[#6D123F] uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Deskripsi / Judul Promo
                  </Label>
                  <Input 
                    placeholder="Beasiswa Ramadhan 1447H" 
                    value={newVoucher.description}
                    onChange={(e) => setNewVoucher({...newVoucher, description: e.target.value})}
                    className="h-12 border-2 rounded-xl font-medium text-sm"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Program Target
                    </Label>
                    <Select 
                      value={newVoucher.program_id} 
                      onValueChange={(v) => setNewVoucher({...newVoucher, program_id: v})}
                    >
                      <SelectTrigger className="h-12 border-2 rounded-xl font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mufradat" className="text-xs font-bold">Hi Mufradat</SelectItem>
                        <SelectItem value="tikrar" className="text-xs font-bold">Hi Tikrar</SelectItem>
                        <SelectItem value="all" className="text-xs font-bold">Semua Program</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Batas Kuota (Kosong = Unlimited)
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="Contoh: 100" 
                      value={newVoucher.usage_limit}
                      onChange={(e) => setNewVoucher({...newVoucher, usage_limit: e.target.value})}
                      className="h-12 border-2 rounded-xl font-bold text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Masa Berlaku (Expiry Date)
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input 
                      type="date" 
                      value={newVoucher.expiry_date}
                      onChange={(e) => setNewVoucher({...newVoucher, expiry_date: e.target.value})}
                      className="h-12 border-2 rounded-xl pl-11 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-6 flex justify-end gap-3 rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="font-bold text-xs rounded-xl h-12 px-6"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating}
                className="bg-[#6D123F] hover:bg-[#520d2f] text-white font-black px-8 h-12 rounded-xl shadow-lg transition-all text-xs uppercase"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aktifkan Voucher
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {["all", "mufradat", "tikrar"].map((p) => (
            <Badge
              key={p}
              onClick={() => setProgramFilter(p)}
              className={cn(
                "cursor-pointer text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all uppercase",
                programFilter === p
                  ? "bg-[#6D123F] text-white border-[#6D123F] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {p === "all" ? "Semua Program" : p}
            </Badge>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200 text-xs font-bold rounded-xl"
          />
        </div>
      </div>

      {/* Vouchers List Table */}
      <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl mx-1">
        <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#6D123F]" /> Daftar Voucher Aktif & Riwayat
          </h3>
          <Badge variant="outline" className="font-bold text-[10px] bg-white">
            {filteredVouchers.length} Kode
          </Badge>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="py-4 pl-6 text-[10px] font-black uppercase tracking-widest">Kode & Program</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status & Expiry</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Penggunaan</TableHead>
                  <TableHead className="pr-6 text-[10px] font-black uppercase tracking-widest text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Tag className="w-12 h-12 text-slate-300" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Belum Ada Voucher Terdaftar</p>
                        <p className="text-[11px] text-muted-foreground">Klik tombol &quot;Buat Voucher&quot; untuk menambahkan kode baru</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVouchers.map((v) => (
                    <TableRow key={v.id} className="group hover:bg-slate-50 transition-colors">
                      <TableCell className="py-5 pl-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <code className="bg-[#6D123F] text-white px-2.5 py-0.5 rounded-lg font-mono font-black text-xs tracking-wider">
                              {v.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-[#6D123F] hover:bg-slate-100 rounded-md"
                              onClick={() => copyCode(v.code)}
                              title="Salin Kode"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Badge className="bg-slate-100 text-slate-700 border-none font-bold text-[9px] px-2 py-0.5">
                              {v.program_id.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {v.description || 'Tanpa Deskripsi'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge className={cn(
                            "w-fit font-black text-[9px] px-2 py-0.5 border-none",
                            v.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                            v.status === 'expired' ? "bg-rose-100 text-rose-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {v.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {v.expiry_date ? format(new Date(v.expiry_date), 'dd MMM yyyy', { locale: idLocale }) : 'Berlaku Selamanya'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 font-black text-xs text-slate-700">
                            <Users className="w-3.5 h-3.5 text-[#6D123F]" />
                            {v.usageCount} {v.usage_limit ? `/ ${v.usage_limit}` : 'Penggunaan'}
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#6D123F] rounded-full transition-all" 
                              style={{ width: v.usage_limit ? `${Math.min(100, (v.usageCount / v.usage_limit) * 100)}%` : v.usageCount > 0 ? '25%' : '0%' }} 
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {canDelete() && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeleteTarget({ id: v.id, code: v.code })}
                            disabled={isDeleting === v.id}
                            title="Hapus Voucher"
                          >
                            {isDeleting === v.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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

      {/* Audit: Recent Redemptions */}
      <div className="space-y-4 px-1">
        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Riwayat Klaim Terakhir
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          {redemptions?.slice(0, 6).map((r: any) => (
            <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-[#6D123F]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">{r.users?.username || 'Thalibah'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Klaim <strong className="text-[#6D123F]">{r.vouchers?.code}</strong> &bull; {format(new Date(r.redeemed_at), 'dd/MM/yy HH:mm')}
                  </span>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px] px-2 py-0.5">
                SUKSES
              </Badge>
            </div>
          ))}
          {(!redemptions || redemptions.length === 0) && (
            <div className="col-span-2 text-center py-10 text-xs font-bold text-muted-foreground border-2 border-dashed rounded-2xl bg-white/50">
              Belum ada riwayat klaim voucher.
            </div>
          )}
        </div>
      </div>

      {/* AlertDialog for Delete Voucher Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-rose-600 uppercase">
              Hapus Kode Voucher?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus voucher{" "}
              <strong className="text-slate-900 font-mono">&quot;{deleteTarget?.code}&quot;</strong>?
              Tindakan ini permanen dan kode tidak akan dapat digunakan lagi oleh pendaftar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVoucher}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Ya, Hapus Voucher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
