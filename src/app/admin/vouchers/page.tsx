'use client';

import { useState, useMemo } from "react";
import { supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { useUser } from "@/supabase";
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
  ArrowRight,
  ShieldCheck,
  Tag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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

  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection("voucher_redemptions", redemptionOptions);
  
  const { data: registrations } = useCollection("halaqah_registrations", {
    select: "id, metadata, user_id"
  });

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      const { error } = await supabase.from("vouchers").insert({
        code: newVoucher.code.trim().toUpperCase(),
        description: newVoucher.description,
        program_id: newVoucher.program_id,
        expiry_date: newVoucher.expiry_date ? new Date(newVoucher.expiry_date).toISOString() : null,
        usage_limit: newVoucher.usage_limit ? parseInt(newVoucher.usage_limit) : null,
        type: 'free_access',
        is_active: true
      });

      if (error) throw error;

      toast({ title: "Voucher Berhasil Dibuat", description: `Kode ${newVoucher.code.toUpperCase()} aktif.` });
      setNewVoucher({ code: "", description: "", program_id: "mufradat", expiry_date: "", usage_limit: "" });
      setShowCreateForm(false);
      refreshVouchers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal membuat voucher", description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    setIsDeleting(id);
    try {
      const { error } = await supabase.from("vouchers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Voucher Dihapus" });
      refreshVouchers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: err.message });
    } finally {
      setIsDeleting(null);
    }
  };

  const voucherStats = useMemo(() => {
    if (!vouchers || !redemptions) return [];
    
    return vouchers.map(v => {
      // Hybrid count: from redemption table + registration metadata (avoiding duplicates)
      const redemptionsCount = redemptions.filter(r => r.voucher_id === v.id).length;
      
      const regVoucherCount = registrations?.filter(reg => 
        reg.metadata?.voucher_code === v.code && 
        !redemptions.some(red => red.user_id === reg.user_id && red.voucher_id === v.id)
      ).length || 0;

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

  if (isVouchersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Memuat Data Voucher...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
            <Link href="/admin" className="hover:text-[#800000]">Admin</Link>
            <ArrowRight className="w-2 h-2" />
            <span className="text-[#800000]">Voucher</span>
          </div>
          <h1 className="text-3xl font-black font-headline tracking-tight text-[#800000]">MANAJEMEN VOUCHER</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Generate & Kontrol Akses Promo</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={cn(
            "font-black uppercase text-[10px] h-12 px-6 rounded-xl shadow-lg transition-all",
            showCreateForm ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-[#800000] hover:bg-[#800000]/90 text-white"
          )}
        >
          {showCreateForm ? <ChevronLeft className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showCreateForm ? "BATAL" : "BUAT VOUCHER"}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="border-none shadow-2xl bg-white overflow-hidden animate-in slide-in-from-top-4 duration-300">
           <div className="h-1.5 bg-[#800000]" />
           <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                 <Ticket className="w-5 h-5 text-[#800000]" /> GENERATE KODE BARU
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Satu kode untuk satu program, dapat digunakan banyak peserta.</CardDescription>
           </CardHeader>
           <form onSubmit={handleCreateVoucher}>
              <CardContent className="grid md:grid-cols-2 gap-6 pt-0">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kode Voucher (Unique)</Label>
                       <Input 
                          placeholder="CONTOH: HIABRILFREE" 
                          value={newVoucher.code}
                          onChange={(e) => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})}
                          className="h-12 border-2 rounded-xl font-bold text-[#800000]"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deskripsi / Judul Promo</Label>
                       <Input 
                          placeholder="Akses Gratis April 2026" 
                          value={newVoucher.description}
                          onChange={(e) => setNewVoucher({...newVoucher, description: e.target.value})}
                          className="h-12 border-2 rounded-xl font-medium"
                       />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Program</Label>
                          <Select 
                            value={newVoucher.program_id} 
                            onValueChange={(v) => setNewVoucher({...newVoucher, program_id: v})}
                          >
                             <SelectTrigger className="h-12 border-2 rounded-xl font-bold">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="mufradat">Hi Mufradat</SelectItem>
                                <SelectItem value="tikrar">Hi Tikrar</SelectItem>
                                <SelectItem value="all">Semua Program</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limit (Kosong = Unlimited)</Label>
                          <Input 
                             type="number" 
                             placeholder="Misal: 100" 
                             value={newVoucher.usage_limit}
                             onChange={(e) => setNewVoucher({...newVoucher, usage_limit: e.target.value})}
                             className="h-12 border-2 rounded-xl font-bold"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Berlaku Sampai (Expiry)</Label>
                       <div className="relative">
                          <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                          <Input 
                             type="date" 
                             value={newVoucher.expiry_date}
                             onChange={(e) => setNewVoucher({...newVoucher, expiry_date: e.target.value})}
                             className="h-12 border-2 rounded-xl pl-11 font-bold"
                          />
                       </div>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t p-6 flex justify-end">
                 <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black px-10 h-14 rounded-2xl shadow-xl transition-all active:scale-95"
                 >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-3" />}
                    AKTIFKAN KODE SEKARANG
                 </Button>
              </CardFooter>
           </form>
        </Card>
      )}

      {/* Vouchers List */}
      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Ticket className="w-4 h-4" /> Daftar Kode Aktif & Riwayat
           </h3>
           <Badge variant="outline" className="font-black text-[9px] uppercase tracking-tighter">TOTAL: {vouchers?.length || 0} KODE</Badge>
        </div>
        <CardContent className="p-0">
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
              {voucherStats.map((v) => (
                <TableRow key={v.id} className="group hover:bg-slate-50 transition-colors">
                  <TableCell className="py-5 pl-6">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                          <code className="bg-[#800000] text-white px-2 py-0.5 rounded font-mono font-black text-sm">{v.code}</code>
                          <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] px-2 py-0">
                             {v.program_id.toUpperCase()}
                          </Badge>
                       </div>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">{v.description || 'Tanpa Deskripsi'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                       <Badge className={cn(
                          "w-fit font-black text-[9px] px-2 py-0",
                          v.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                          v.status === 'expired' ? "bg-rose-100 text-rose-700" :
                          "bg-slate-100 text-slate-700"
                       )}>
                          {v.status.replace('_', ' ').toUpperCase()}
                       </Badge>
                       <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {v.expiry_date ? format(new Date(v.expiry_date), 'dd MMM yyyy', { locale: idLocale }) : 'Unlimited Time'}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-1.5 font-black text-xs text-slate-700">
                          <Users className="w-3.5 h-3.5 text-[#800000]" />
                          {v.usageCount} {v.usage_limit ? `/ ${v.usage_limit}` : 'Usage'}
                       </div>
                       <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-[#800000]" 
                             style={{ width: v.usage_limit ? `${(v.usageCount / v.usage_limit) * 100}%` : v.usageCount > 0 ? '10%' : '0%' }} 
                          />
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {canDelete() && (
                      <Button
                         variant="ghost"
                         size="icon"
                         className="rounded-full text-rose-300 hover:text-rose-600 hover:bg-rose-50"
                         onClick={() => {
                            if (confirm(`Hapus voucher ${v.code}? Tindakan ini tidak dapat dibatalkan.`)) {
                               handleDeleteVoucher(v.id);
                            }
                         }}
                         disabled={isDeleting === v.id}
                      >
                         {isDeleting === v.id ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {voucherStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-20 text-center">
                     <div className="flex flex-col items-center gap-3 opacity-20">
                        <Tag className="w-12 h-12" />
                        <p className="text-xs font-black uppercase tracking-widest italic">Belum Ada Voucher Terdaftar</p>
                     </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit: Recent Redemptions */}
      <div className="space-y-4">
         <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Riwayat Klaim Terakhir</h4>
         <div className="grid md:grid-cols-2 gap-3">
            {redemptions?.slice(0, 6).map(r => (
               <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#800000]">
                        <CheckCircle2 className="w-5 h-5" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">{r.users?.username || 'User'}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Mengklaim {r.vouchers?.code} • {format(new Date(r.redeemed_at), 'dd/MM/yy HH:mm')}</span>
                     </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[8px] px-2 py-0">SUCCESS</Badge>
               </div>
            ))}
            {(!redemptions || redemptions.length === 0) && (
               <div className="col-span-2 text-center py-10 opacity-30 italic text-xs font-bold text-muted-foreground border-2 border-dashed rounded-3xl">
                  Belum ada riwayat klaim.
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
