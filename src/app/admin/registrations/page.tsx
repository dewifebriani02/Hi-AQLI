
'use client';

import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Phone, Mail, User, ImageIcon, ArrowLeft, ShieldAlert, BookOpen, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo } from "react";
import { addMonths, parseISO, format, startOfMonth, addDays } from "date-fns";

export default function AdminRegistrationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const regOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'pending_verification' }]
  }), []);

  const { data: registrations, isLoading, error } = useCollection("halaqah_registrations", regOptions);

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
      if (!currentGroupId && (reg.halaqah_id === 'mufradat-premium' || reg.halaqah_title?.toLowerCase().includes('mufradat'))) {
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
      if (reg.halaqah_id === 'tikrar-j30-b1' || reg.halaqah_id === 'tikrar-premium') {
        updateData.is_tikrar_paid = true;
        updateData.paid_juz = reg.target_juz || 30;
        updateData.tikrar_level = reg.level || 3;
        updateData.tikrar_start_date = new Date().toISOString();
      }

      const { error: userError } = await supabase.from("users").update(updateData).eq('id', reg.user_id);
      if (userError) throw userError;

      // --- HI MUFRADAT SUBSCRIPTION LOGIC ---
      if (reg.halaqah_id === 'mufradat-premium' || reg.halaqah_title?.toLowerCase().includes('mufradat')) {
        const type = reg.payment_type || 'initial';
        const billingMonth = reg.billing_month || format(new Date(), 'yyyy-MM');
        
        let subUpdate: any = {
           mufradat_status: 'active',
           updated_at: new Date().toISOString()
        };

        if (type === 'monthly') {
          // Set due date to the 10th of the month AFTER the billing month
          const monthDate = parseISO(`${billingMonth}-01`);
          const nextDueDate = addDays(addMonths(monthDate, 1), 9); // 10th of next month
          subUpdate.mufradat_due_date = nextDueDate.toISOString();
          subUpdate.mufradat_status = 'active';
        } 
        else if (type === 'leave_request') {
          // Set to on_leave until end of billing month
          const monthDate = parseISO(`${billingMonth}-01`);
          const leaveUntil = addDays(addMonths(monthDate, 1), -1); // End of billing month
          subUpdate.mufradat_status = 'on_leave';
          subUpdate.mufradat_leave_until = leaveUntil.toISOString();
          
          // Decrement leave balance (assuming single month per request)
          const { data: currentUsr } = await supabase.from('users').select('mufradat_leave_balance').eq('id', reg.user_id).single();
          subUpdate.mufradat_leave_balance = Math.max(0, (currentUsr?.mufradat_leave_balance || 3) - 1);
        }
        else if (type === 'initial' || type === 're_registration') {
           // Set initial due date to the 10th of the month following the current month
           const nextD = addDays(addMonths(startOfMonth(new Date()), 1), 9);
           subUpdate.mufradat_due_date = nextD.toISOString();
           subUpdate.mufradat_status = 'active';
        }

        await supabase.from("users").update(subUpdate).eq('id', reg.user_id);
      }
      // --- END HI MUFRADAT ---

      toast({
        title: "Akses Diaktifkan",
        description: `Masyallah, akses ${reg.halaqah_title} untuk ${reg.user_name} telah aktif mulai hari ini.`,
      });
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

      <div className="grid gap-4 px-1">
        {!registrations || registrations.length === 0 ? (
          <Card className="border-2 border-dashed py-24 bg-muted/5">
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
              <CheckCircle2 className="w-16 h-16 opacity-10" />
              <div className="space-y-1">
                <p className="font-bold text-lg text-foreground/50">Antrean Bersih!</p>
                <p className="text-sm italic">Semua pendaftaran telah selesai diproses.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          registrations.map((reg) => (
            <Card key={reg.id} className="overflow-hidden border-none shadow-lg bg-card transition-all hover:shadow-xl">
              <div className="bg-muted/30 px-4 sm:px-6 py-3 flex flex-col gap-3 border-b">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-[10px] font-black flex items-center gap-1.5 px-2 py-0.5 border-[#800000]/20 text-[#800000] bg-white shrink-0">
                    <BookOpen className="w-3 h-3" /> {reg.halaqah_title}
                  </Badge>

                  <Badge className={cn("text-white border-none font-black text-[9px] px-3 py-1 sm:py-0.5 tracking-widest shadow-sm shrink-0", reg.is_paid ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-500 shadow-blue-500/20")}>
                    {reg.is_paid ? (reg.payment_method === 'voucher' ? 'VOUCHER' : 'BERBAYAR') : 'GRATIS'}
                  </Badge>

                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter shrink-0 bg-slate-100 px-2 py-0.5 rounded-md sm:bg-transparent sm:p-0">
                    {reg.created_at ? new Date(reg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </span>
                  
                  {reg.payment_type && (
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black border-none px-2 py-0.5 uppercase shrink-0",
                      reg.payment_type === 'leave_request' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {reg.payment_type === 'leave_request' ? 'PENGAJUAN CUTI' : `INFAQ: ${reg.payment_type}`}
                    </Badge>
                  )}
                  {reg.billing_month && (
                    <Badge className="bg-slate-800 text-white text-[9px] font-black border-none px-2 py-0.5 shrink-0">
                      PERIODE: {reg.billing_month}
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000] shrink-0 font-bold">
                        {reg.user_name?.[0] || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">{reg.user_name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{reg.user_email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pl-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                        <Phone className="w-3 h-3" />
                        <span>{reg.whatsapp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-[#800000]/5 p-5 rounded-2xl border-2 border-[#800000]/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Detail Kelas</span>
                      <span className="text-xs font-bold text-[#800000] truncate max-w-[120px]">{reg.halaqah_title}</span>
                    </div>
                    {reg.is_paid && (
                      <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Infaq</span>
                        <span className="text-base font-black text-[#800000]">Rp {reg.amount?.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {reg.target_juz && (
                      <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Hafalan</span>
                        <Badge className="bg-[#800000] text-[10px] font-black px-2 py-0">JUZ {reg.target_juz}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-3">
                    {reg.is_paid && (
                      <div className="bg-muted p-2 rounded-xl flex items-center gap-2 text-[10px] mb-1 font-bold text-muted-foreground border-2 border-dashed border-muted-foreground/20 overflow-hidden">
                        <ImageIcon className="w-4 h-4 shrink-0 text-[#800000]" />
                        <span className="truncate">{reg.proof_file_name || "Bukti-Transfer.jpg"}</span>
                      </div>
                    )}
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 gap-2 shadow-lg shadow-emerald-600/20 rounded-xl"
                      onClick={() => handleApprove(reg)}
                      disabled={processingId === reg.id}
                    >
                      {processingId === reg.id ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      KONFIRMASI & TENTUKAN TGL MULAI
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/5 font-bold h-10 text-xs gap-2"
                      onClick={() => handleReject(reg.id)}
                      disabled={processingId === reg.id}
                    >
                      <XCircle className="w-4 h-4" /> TOLAK PENDAFTARAN
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
