
'use client';

import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Phone, Mail, User, ImageIcon, ArrowLeft, ShieldAlert, BookOpen, XCircle, Pencil, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo } from "react";
import { addMonths, parseISO, format, startOfMonth, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { History, LayoutList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminRegistrationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>("0");
  const [editMonth, setEditMonth] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const regOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'pending_verification' }]
  }), []);

  const { data: registrations, isLoading, error, refresh: refreshPending } = useCollection("halaqah_registrations", regOptions);
  
  const historyOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'verified' }],
    orderBy: { column: 'verified_at', ascending: false },
    limit: 50
  }), []);
  
  const { data: history, isLoading: isHistoryLoading, refresh: refreshHistory } = useCollection("halaqah_registrations", historyOptions);

  const openEdit = (reg: any) => {
    setEditingReg(reg);
    setEditAmount(reg.amount?.toString() || "0");
    setEditMonth(reg.billing_month || format(new Date(reg.verified_at || reg.created_at), 'yyyy-MM'));
  };

  const handleUpdateReg = async () => {
    if (!editingReg) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("halaqah_registrations").update({
        amount: parseInt(editAmount),
        billing_month: editMonth,
        updated_at: new Date().toISOString()
      }).eq('id', editingReg.id);

      if (error) throw error;
      toast({ title: "Data Diperbarui" });
      refreshHistory();
      setEditingReg(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal memperbarui data." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (reg: any) => {
    if (!reg?.id || !reg?.user_id) {
      toast({ variant: "destructive", title: "Data pendaftaran tidak lengkap." });
      return;
    }

    setProcessingId(reg.id);

    try {
      // 1. Update Registration Status with start date
      const { error: regError } = await supabase.from("halaqah_registrations").update({
        status: "verified",
        verified_at: new Date().toISOString(),
        start_date: new Date().toISOString()
      }).eq('id', reg.id);

      if (regError) throw regError;

      // 2. Update User Profile Access
      const { data: userData } = await supabase.from("users").select("followed_halaqahs, mufradat_group_id").eq('id', reg.user_id).single();
      const currentFollowed = userData?.followed_halaqahs || [];
      const currentGroupId = userData?.mufradat_group_id;

      const updateData: any = {
        followed_halaqahs: currentFollowed.includes(reg.halaqah_id) ? currentFollowed : [...currentFollowed, reg.halaqah_id],
        updated_at: new Date().toISOString()
      };

      // Special logic for Hi Mufradat Auto-Grouping (Only if NO GROUP assigned yet)
      const isMufradatReg = reg.halaqah_id === 'mufradat-premium' || reg.halaqah_title?.toLowerCase().includes('mufradat');
      if (!currentGroupId && isMufradatReg) {
        try {
          // 1. Find latest group with space (< 50)
          const { data: availableGroups } = await supabase
            .from('mufradat_groups')
            .select('*')
            .lt('member_count', 50)
            .order('created_at', { ascending: false })
            .limit(1);

          let targetGroupId;

          if (availableGroups && availableGroups.length > 0) {
            targetGroupId = availableGroups[0].id;
            // Increment member count
            await supabase
              .from('mufradat_groups')
              .update({ member_count: availableGroups[0].member_count + 1 })
              .eq('id', targetGroupId);
          } else {
            // Create new group
            const { data: allGroups } = await supabase.from('mufradat_groups').select('id');
            const nextNum = (allGroups?.length || 0) + 1;
            const { data: newGroup, error: groupError } = await supabase
              .from('mufradat_groups')
              .insert({ name: `Grup ${nextNum}`, member_count: 1 })
              .select()
              .single();
            
            if (groupError) throw groupError;
            targetGroupId = newGroup.id;
          }

          updateData.mufradat_group_id = targetGroupId;
        } catch (groupErr) {
          console.error("Auto-grouping error:", groupErr);
          // Non-blocking error, just log it
        }
      }

      // Special logic for Tikrar Premium Start Date
      const isTikrarReg = reg.halaqah_id === 'tikrar-j30-b1' || reg.halaqah_id === 'tikrar-premium' || reg.halaqah_title?.toLowerCase().includes('tikrar');
      if (isTikrarReg) {
        updateData.is_tikrar_paid = true;
        updateData.paid_juz = reg.target_juz || 30;
        updateData.tikrar_level = reg.level || 3;
        updateData.tikrar_start_date = new Date().toISOString();
      }

      const { error: userError } = await supabase.from("users").update(updateData).eq('id', reg.user_id);
      if (userError) throw userError;

      // --- HI MUFRADAT SUBSCRIPTION LOGIC ---
      if (isMufradatReg) {
        const type = reg.payment_type || 'initial';
        
        // Fetch current user data to see current due date
        const { data: currentUsr } = await supabase
          .from('users')
          .select('mufradat_due_date, mufradat_leave_balance')
          .eq('id', reg.user_id)
          .single();

        let subUpdate: any = {
           mufradat_status: 'active',
           updated_at: new Date().toISOString()
        };

        const now = new Date();
        const currentDue = currentUsr?.mufradat_due_date ? parseISO(currentUsr.mufradat_due_date) : null;
        
        // Base starting point for the new 1-month period
        // If current due date is in the future, we stack. If in the past, we start from now.
        const baseDate = (currentDue && currentDue > now) ? currentDue : now;

        if (type === 'monthly' || type === 'initial' || type === 're_registration') {
          const nextDueDate = addMonths(baseDate, 1);
          subUpdate.mufradat_due_date = nextDueDate.toISOString();
          subUpdate.mufradat_status = 'active';
        } 
        else if (type === 'leave_request') {
          // Leave for 1 month from now or from end of current access
          const leaveUntil = addMonths(baseDate, 1);
          subUpdate.mufradat_status = 'on_leave';
          subUpdate.mufradat_leave_until = leaveUntil.toISOString();
          
          // Decrement leave balance
          subUpdate.mufradat_leave_balance = Math.max(0, (currentUsr?.mufradat_leave_balance || 3) - 1);
        }

        await supabase.from("users").update(subUpdate).eq('id', reg.user_id);
      }
      // --- END HI MUFRADAT ---

      // --- REFERRAL BONUS LOGIC ---
      // No bonus if pendaftar used a voucher
      if (reg.referral_code_used && reg.payment_method !== 'voucher') {
        const { data: referrer } = await supabase
          .from("users")
          .select("id, referral_balance")
          .eq("referral_code", reg.referral_code_used)
          .maybeSingle();
        
        if (referrer) {
          // Check if this is the user's FIRST EVER verified registration
          // We check the count of verified registrations for this user_id
          const { count } = await supabase
            .from("halaqah_registrations")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", reg.user_id)
            .eq("status", "verified");
          
          // If count is 1 (this one), award bonus to referrer
          if (count === 1) {
            const newBal = (referrer.referral_balance || 0) + 5000;
            await supabase
              .from("users")
              .update({ referral_balance: newBal })
              .eq("id", referrer.id);
            console.log("Referral bonus awarded to:", referrer.id);
          }
        }
      }

      toast({
        title: "Akses Diaktifkan",
        description: `Masyallah, akses ${reg.halaqah_title} untuk ${reg.user_name} telah aktif mulai hari ini.`,
      });
      refreshPending();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Gagal memproses verifikasi." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (regId: string) => {
    setProcessingId(regId);
    try {
      const { error } = await supabase.from("halaqah_registrations").update({
        status: "rejected",
        updated_at: new Date().toISOString()
      }).eq('id', regId);

      if (error) throw error;
      toast({ title: "Pendaftaran Ditolak" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menolak pendaftaran." });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Antrean...</p></div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Akses Terbatas</h2>
        <p className="text-muted-foreground max-w-md px-4">Hanya administrator terverifikasi yang dapat mengelola pendaftaran Thalibah.</p>
        <Button asChild variant="outline" className="mt-4"><Link href="/">Kembali ke Beranda</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-32">
      <div className="flex items-center gap-4 px-1 mt-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
          <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Verifikasi Thalibah</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Antrean Pendaftaran Halaqah</p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mb-6">
          <TabsList className="bg-[#800000]/5 p-1 border-2 border-[#800000]/10 rounded-xl h-12 w-full sm:w-auto">
             <TabsTrigger 
                value="pending" 
                className="rounded-lg h-9 font-black uppercase text-[10px] sm:text-[11px] gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white transition-all w-full sm:w-auto px-6"
             >
                <LayoutList className="w-4 h-4" /> Antrean ({registrations.length})
             </TabsTrigger>
             <TabsTrigger 
                value="history" 
                className="rounded-lg h-9 font-black uppercase text-[10px] sm:text-[11px] gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white transition-all w-full sm:w-auto px-6"
             >
                <History className="w-4 h-4" /> Riwayat Verifikasi
             </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="mt-0">
          <div className="grid gap-4 px-1">
            {!registrations || registrations.length === 0 ? (
              <Card className="border-2 border-dashed py-24 bg-muted/5 rounded-3xl">
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
                  <CheckCircle2 className="w-16 h-16 opacity-10" />
                  <div className="space-y-1">
                    <p className="font-bold text-lg text-foreground/50 uppercase tracking-tight">Antrean Bersih!</p>
                    <p className="text-sm italic">Semua pendaftaran telah selesai diproses.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              registrations.map((reg) => (
                <Card key={reg.id} className="overflow-hidden border-none shadow-lg bg-card transition-all hover:shadow-xl rounded-3xl">
                  {/* ... same card content ... */}
                  <div className="bg-muted/30 px-4 sm:px-6 py-4 flex flex-col gap-3 border-b">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="text-[10px] font-black flex items-center gap-1.5 px-3 py-1 border-[#800000]/20 text-[#800000] bg-white">
                        <BookOpen className="w-3.5 h-3.5" /> {reg.halaqah_title}
                      </Badge>

                      <Badge className={cn("text-white border-none font-black text-[9px] px-3 py-1 shadow-sm shrink-0", reg.is_paid ? (reg.payment_method === 'voucher' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-amber-500 shadow-amber-500/20') : "bg-blue-500 shadow-blue-500/20")}>
                        {reg.is_paid ? (reg.payment_method === 'voucher' ? 'VOUCHER' : 'TRANSFER BANK') : 'GRATIS'}
                      </Badge>
                      
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-auto">
                        Mendaftar: {reg.created_at ? format(new Date(reg.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                      <div className="md:col-span-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#800000]/10 flex items-center justify-center text-[#800000] shrink-0 font-black text-lg">
                            {reg.user_name?.[0] || 'U'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-foreground uppercase tracking-tight">{reg.user_name}</span>
                            <span className="text-[10px] text-muted-foreground font-bold tracking-widest">{reg.user_email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-xl border border-emerald-100">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{reg.whatsapp}</span>
                        </div>
                      </div>

                      <div className="md:col-span-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Target Program</span>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{reg.halaqah_title}</span>
                        </div>
                        {reg.is_paid && (
                          <div className="flex items-center justify-between border-t pt-2 border-dashed border-slate-200">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Dana Terkirim</span>
                            <div className="flex flex-col items-end">
                              <span className="text-base font-black text-[#800000]">Rp {reg.amount?.toLocaleString('id-ID')}</span>
                              {Number(reg.amount) === 0 && (
                                <span className="text-[8px] font-black text-rose-500 uppercase flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5" /> Peringatan: Nominal 0
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {reg.billing_month && (
                          <div className="flex items-center justify-between border-t pt-2 border-dashed border-slate-200">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Periode Awal</span>
                            <Badge className="bg-slate-800 text-[10px] font-black px-2 py-0 border-none">{reg.billing_month}</Badge>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-4 flex flex-col gap-3">
                        {reg.is_paid && reg.payment_method !== 'voucher' && (
                          <div className="bg-white p-2.5 rounded-2xl flex items-center gap-3 text-[10px] font-black text-[#800000] border-2 border-[#800000]/10 shadow-sm overflow-hidden">
                            <ImageIcon className="w-5 h-5 shrink-0 text-[#800000]" />
                            <span className="truncate">{reg.proof_file_name || "Bukti-Kwitansi.jpg"}</span>
                          </div>
                        )}
                        {reg.voucher_code_used && (
                          <div className="bg-indigo-50 p-2.5 rounded-2xl flex items-center gap-3 text-[10px] font-black text-indigo-700 border-2 border-indigo-100 shadow-sm">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            <span className="uppercase tracking-widest">VOUCHER: {reg.voucher_code_used}</span>
                          </div>
                        )}
                        <Button
                          className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-14 gap-3 shadow-xl shadow-[#800000]/20 rounded-2xl active:scale-95 transition-all text-xs"
                          onClick={() => handleApprove(reg)}
                          disabled={processingId === reg.id}
                        >
                          {processingId === reg.id ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                          KONFIRMASI & AKTIFKAN
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 font-black h-10 text-[10px] uppercase gap-2 tracking-widest"
                          onClick={() => handleReject(reg.id)}
                          disabled={processingId === reg.id}
                        >
                          Tolak Pendaftaran
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="grid gap-4 px-1">
            {isHistoryLoading ? (
              <div className="py-24 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground/30" /></div>
            ) : (!history || history.length === 0) ? (
              <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl">Belum ada riwayat pendaftaran terverifikasi.</div>
            ) : (
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Peserta</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Program</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Metode</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Dana</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Tgl Verifikasi</TableHead>
                      <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="py-4 pl-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                                {reg.user_name?.[0] || 'U'}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-xs font-black text-slate-800">{reg.user_name}</span>
                                 <span className="text-[9px] text-muted-foreground font-bold">{reg.whatsapp}</span>
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-black text-[#800000] uppercase tracking-tighter">{reg.halaqah_title}</span>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={cn(
                             "text-[9px] font-black border-none px-2 py-0.5 uppercase",
                             reg.payment_method === 'voucher' ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                           )}>
                             {reg.payment_method === 'voucher' ? 'VOUCHER' : 'TRANSFER BANK'}
                           </Badge>
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-black text-slate-800">
                             {reg.amount ? `Rp ${reg.amount.toLocaleString('id-ID')}` : '-'}
                           </span>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase">
                             <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil
                           </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground">
                           {reg.verified_at ? format(new Date(reg.verified_at), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                           <Button 
                             size="icon" 
                             variant="ghost" 
                             className="h-8 w-8 text-slate-400 hover:text-[#800000] hover:bg-slate-100"
                             onClick={() => openEdit(reg)}
                           >
                             <Pencil className="w-4 h-4" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {/* EDIT REGISTRATION DIALOG */}
      <Dialog open={!!editingReg} onOpenChange={(open) => !open && setEditingReg(null)}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-[#800000] text-white">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Pencil className="w-5 h-5" /> Edit Detail Pembayaran
            </DialogTitle>
            <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-1">
              Koreksi data untuk laporan keuangan
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6 bg-white">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Peserta</Label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-sm text-slate-600">
                  {editingReg?.user_name}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nominal Infaq</Label>
                  <Input 
                    type="number" 
                    value={editAmount} 
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="h-12 border-2 rounded-xl font-black text-[#800000]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bulan Tagihan</Label>
                  <Input 
                    type="text" 
                    placeholder="YYYY-MM (Contoh: 2026-04)"
                    value={editMonth} 
                    onChange={(e) => setEditMonth(e.target.value)}
                    className="h-12 border-2 rounded-xl font-black"
                  />
                </div>
             </div>

             <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed italic">
                  Perubahan nominal atau bulan akan langsung merubah angka di Monitor Keuangan pada periode yang dipilih.
                </p>
             </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
             <Button variant="ghost" className="flex-1 font-bold h-12" onClick={() => setEditingReg(null)}>Batal</Button>
             <Button 
               className="flex-[2] bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-12 rounded-xl shadow-lg"
               onClick={handleUpdateReg}
               disabled={isSaving}
             >
               {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PERUBAHAN"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
