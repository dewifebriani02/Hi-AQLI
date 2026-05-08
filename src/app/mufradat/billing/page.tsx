'use client';

import { parseISO, addMonths } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { useUser, supabase } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  Coffee,
  Heart,
  BookOpen,
  Info,
  Users,
  Target,
  ChevronRight
} from "lucide-react";
import { getMufradatStatus } from "@/lib/mufradat-access";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MufradatBillingPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const { data: userData, refresh: refreshUser } = useDoc("users", user?.id);
  const fullSalutation = userData?.salutation || "Ukhti";
  const registrationsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  }), [user?.id]);

  const { data: registrations, refresh: refreshRegs } = useCollection("halaqah_registrations", registrationsOptions);

  const redemptionsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    select: "*, vouchers(*)"
  }), [user?.id]);

  const { data: redemptions, refresh: refreshRedemptions } = useCollection("voucher_redemptions", redemptionsOptions);

  const { data: groupData } = useDoc(userData?.mufradat_group_id ? "mufradat_groups" : null, userData?.mufradat_group_id);

  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'is_passed', operator: '==', value: true }
    ]
  }), [user?.id]);

  const { data: progress } = useCollection(user ? "quiz_attempts" : null, progressOptions);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'view' | 'pay' | 'leave'>('view');
  
  // Payment Form States
  const [senderName, setSenderName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [amount, setAmount] = useState<string>("20000");
  const [uniqueCode, setUniqueCode] = useState(0);
  
  // Leave Form States
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  // Initialize unique code
  useEffect(() => {
    if (mode === 'pay' && uniqueCode === 0) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [mode, uniqueCode]);

  const access = useMemo(() => {
    return getMufradatStatus({
      user: userData, 
      registrations: registrations || [], 
      redemptions: redemptions || []
    });
  }, [userData, registrations, redemptions]);

  const [voucherCode, setVoucherCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const hasActiveVoucher = useMemo(() => {
    return redemptions?.some(r => r.vouchers?.program_id === 'mufradat' || r.vouchers?.program_id === 'all');
  }, [redemptions]);

  // Combined History: Payments + Cuti + Vouchers
  const combinedHistory = useMemo(() => {
    const history: any[] = [];
    
    // 1. Add Registrations (Payments, Cuti, Initial)
    registrations?.forEach(reg => {
      history.push({
        id: reg.id,
        type: 'registration',
        date: reg.created_at,
        title: reg.payment_type === 'leave_request' ? "Permohonan Cuti" : 
               reg.payment_type === 'monthly' ? `Infaq ${reg.billing_month}` : 
               "Pendaftaran Program",
        amount: reg.amount || 0,
        status: reg.status,
        paymentType: reg.payment_type,
        halaqahId: reg.halaqah_id,
        halaqahTitle: reg.halaqah_title,
        verifiedAt: reg.verified_at
      });
    });

    // 2. Add Voucher Redemptions
    redemptions?.forEach(red => {
      history.push({
        id: red.id,
        type: 'voucher',
        date: red.redeemed_at || red.created_at,
        title: `Aktivasi Voucher: ${red.vouchers?.code || 'Mufradat'}`,
        amount: 0,
        status: 'verified', // Vouchers are instant
        paymentType: 'voucher',
        voucherCode: red.vouchers?.code,
        programId: red.vouchers?.program_id,
        halaqahId: red.vouchers?.program_id
      });
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [registrations, redemptions]);



  const activeVoucher = useMemo(() => {
    return redemptions?.find(r => r.vouchers?.program_id === 'mufradat' || r.vouchers?.program_id === 'all');
  }, [redemptions]);

  const verifiedRegsCount = useMemo(() => {
    return combinedHistory?.filter(h => 
      h.status?.toLowerCase() === 'verified' && 
      (
        h.halaqahId?.toLowerCase().includes('mufradat') || 
        h.halaqahTitle?.toLowerCase().includes('mufradat') || 
        h.halaqahId === 'all' || 
        h.halaqahId === userData?.mufradat_group_id
      ) && 
      h.paymentType !== 'leave_request'
    ).length || 0;
  }, [combinedHistory, userData?.mufradat_group_id]);

  const activationDate = useMemo(() => {
    const verifiedPayments = combinedHistory?.filter(h => 
      h.status?.toLowerCase() === 'verified' && 
      (
        h.halaqahId?.toLowerCase().includes('mufradat') || 
        h.halaqahTitle?.toLowerCase().includes('mufradat') || 
        h.halaqahId === 'all' || 
        h.halaqahId === userData?.mufradat_group_id
      ) && 
      h.paymentType !== 'leave_request'
    ) || [];
    if (verifiedPayments.length === 0) return null;
    const firstVer = [...verifiedPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return firstVer.verifiedAt || firstVer.date;
  }, [combinedHistory, userData?.mufradat_group_id]);

  const displayDueDate = useMemo(() => {
    let finalDueDate = null;

    if (activationDate) {
      const baseDate = new Date(activationDate);
      finalDueDate = addMonths(baseDate, Math.max(1, verifiedRegsCount));
    }

    // Fallback to mufradat_due_date ONLY if no registrations found
    if (!finalDueDate && userData?.mufradat_due_date) {
      finalDueDate = parseISO(userData.mufradat_due_date);
    }

    return finalDueDate;
  }, [activationDate, verifiedRegsCount, userData?.mufradat_due_date]);

  const dueDate = useMemo(() => {
    return displayDueDate;
  }, [displayDueDate]);


  // Target Estimations removed per user request (discouraging dates)


  // Auto-set sender name from profile
  useEffect(() => {
    if (userData?.username && !senderName) {
      setSenderName(userData.username);
    }
    if ((userData?.whatsapp || userData?.phone) && !whatsapp) {
      setWhatsapp(userData.whatsapp || userData.phone || "");
    }
  }, [userData, senderName, whatsapp]);

  const handleUploadProof = async () => {
    if (!senderName || !whatsapp || !proofFile) {
      toast({ variant: "destructive", title: "Mohon lengkapi data pembayaran (Nama, WA, & Bukti)." });
      return;
    }

    if (!user?.id) {
      toast({ variant: "destructive", title: "Sesi Habis", description: "Mohon login kembali." });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get a valid halaqah_id for Hi Mufradat (Must be a UUID from halaqahs table)
      const { data: halaqahData } = await supabase
        .from("halaqahs")
        .select("id")
        .or("program_type.eq.hi_mufradat,programType.eq.hi_mufradat")
        .limit(1)
        .maybeSingle();

      const hId = halaqahData?.id || null;

      // 2. Insert into halaqah_registrations
      const { error } = await supabase.from("halaqah_registrations").insert({
        user_id: user.id,
        user_name: userData?.username || user?.user_metadata?.full_name,
        user_email: user?.email,
        whatsapp: whatsapp,
        halaqah_id: hId, // Now sends a valid UUID or null
        halaqah_title: 'Hi Mufradat (Infaq Bulanan)',
        is_paid: true,
        amount: parseInt(amount) + uniqueCode,
        unique_code: uniqueCode,
        payment_method: "transfer",
        sender_name: senderName,
        proof_file_name: proofFile.name,
        status: "pending_verification",
        payment_type: "monthly",
        billing_month: access.nextBillingMonth || new Date().toISOString().slice(0, 7),
        metadata: {},
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // 3. Update User Profile (Sync WhatsApp)
      await supabase.from("users").update({ 
        whatsapp: whatsapp,
        phone: whatsapp 
      }).eq('id', user.id);

      toast({ 
        title: "Bukti Terkirim", 
        description: "Alhamdulillah, bukti transfer telah kami terima. Mohon tunggu verifikasi Admin." 
      });
      setMode('view');
      refreshRegs();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal mengirim bukti", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestLeave = async () => {
    if (userData?.mufradat_leave_balance <= 0) {
      toast({ variant: "destructive", title: "Kuota Cuti Habis", description: "Ukhti sudah menggunakan batas maksimal 3 bulan cuti." });
      return;
    }

    const today = new Date();
    if (today.getDate() > 10) {
      toast({ 
        variant: "destructive", 
        title: "Batas Waktu Terlewati", 
        description: "Permohonan cuti hanya dapat diajukan sebelum tanggal 10 setiap bulannya." 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get a valid halaqah_id for Hi Mufradat (Must be a UUID)
      const { data: halaqahData } = await supabase
        .from("halaqahs")
        .select("id")
        .or("program_type.eq.hi_mufradat,programType.eq.hi_mufradat")
        .limit(1)
        .maybeSingle();

      const hId = halaqahData?.id || null;

      // 2. Insert into halaqah_registrations
      // If access.nextBillingMonth is not set (e.g. status is already active),
      // we assume the leave is for the NEXT period.
      const targetMonth = access.nextBillingMonth || new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().slice(0, 7);

      const metadata: any = { 
        request_date: new Date().toISOString(), 
        type: 'cuti',
        leave_from: leaveStart ? new Date(leaveStart).toISOString() : null,
        leave_until: leaveEnd ? new Date(leaveEnd).toISOString() : null
      };

      const { error } = await supabase.from("halaqah_registrations").insert({
        user_id: user?.id,
        user_name: userData?.username || user?.user_metadata?.full_name,
        user_email: user?.email,
        whatsapp: userData?.phone,
        halaqah_id: hId, 
        halaqah_title: `Hi Mufradat (Cuti: ${leaveStart || '1 Bln'})`,
        is_paid: false,
        status: "pending_verification",
        payment_type: "leave_request",
        billing_month: targetMonth,
        created_at: new Date().toISOString(),
        metadata: metadata
      });

      if (error) throw error;

      toast({ 
        title: "Permohonan Dikirim", 
        description: "Permohonan cuti Ukhti sedang ditinjau oleh Musyrifah." 
      });
      setMode('view');
      refreshRegs();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal memproses cuti", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) {
      toast({ variant: "destructive", title: "Kode voucher kosong." });
      return;
    }

    setIsRedeeming(true);
    try {
      // 1. Find the voucher
      const { data: voucher, error: vError } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", voucherCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (vError || !voucher) {
        throw new Error("Voucher tidak valid atau sudah tidak aktif.");
      }

      // 2. Check Expiry
      if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
        throw new Error("Voucher sudah kadaluarsa.");
      }

      // 3. Check Program ID
      if (voucher.program_id !== 'all' && voucher.program_id !== 'mufradat') {
        throw new Error(`Voucher ini hanya berlaku untuk program ${voucher.program_id.toUpperCase()}.`);
      }

      // 4. Check if already redeemed by this user
      const { data: existing } = await supabase
        .from("voucher_redemptions")
        .select("id")
        .eq("voucher_id", voucher.id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (existing) {
        throw new Error("Ukhti sudah pernah menggunakan voucher ini sebelumnya.");
      }

      // 5. Check Usage Limit
      if (voucher.usage_limit) {
        const { count } = await supabase
          .from("voucher_redemptions")
          .select("id", { count: 'exact', head: true })
          .eq("voucher_id", voucher.id);
        
        if (count !== null && count >= voucher.usage_limit) {
          throw new Error("Kuota penggunaan voucher ini sudah habis.");
        }
      }

      // 6. Redeem
      const { error: rError } = await supabase
        .from("voucher_redemptions")
        .insert({
          voucher_id: voucher.id,
          user_id: user?.id
        });

      if (rError) throw rError;

      toast({ 
        title: "Voucher Berhasil!", 
        description: `Alhamdulillah, voucher ${voucher.code} berhasil diaktifkan.` 
      });
      setVoucherCode("");
      refreshRedemptions();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal klaim voucher", description: e.message });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isUserLoading || !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Memuat Status Infaq...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/mufradat"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black font-headline tracking-tight text-[#800000]">KELOLA LANGGANAN</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Hi Mufradat • Billing & Cuti</p>
        </div>
      </div>

      {userData?.mufradat_group_id && groupData && (
        <Card className="border-none shadow-xl border-amber-200 bg-amber-50/50 overflow-hidden rounded-3xl">
          <CardHeader className="bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200/50">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-amber-900">Informasi Halaqah</CardTitle>
                    <p className="text-[10px] font-bold text-amber-700/70">{groupData.name}</p>
                  </div>
                </div>
                {groupData.whatsapp_link && (
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] h-9 px-4 rounded-xl shadow-md gap-2">
                    <a href={groupData.whatsapp_link} target="_blank" rel="noopener noreferrer">
                      <CreditCard className="w-4 h-4" /> GRUP WHATSAPP
                    </a>
                  </Button>
                )}
             </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-amber-800/50 uppercase tracking-widest">Musyrifah</span>
                   <p className="text-sm font-black text-amber-900">{groupData.musyrifah_name || '-'}</p>
                   {groupData.musyrifah_phone && (
                     <a href={`https://wa.me/${groupData.musyrifah_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> {groupData.musyrifah_phone}
                     </a>
                   )}
                </div>
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-amber-800/50 uppercase tracking-widest">Mulai Program (Group)</span>
                   <p className="text-sm font-black text-amber-900">
                      {groupData.start_date ? new Date(groupData.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                   </p>
                </div>
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-amber-800/50 uppercase tracking-widest">Tanggal Verifikasi</span>
                   <p className="text-sm font-black text-emerald-700">
                      {activationDate ? new Date(activationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                   </p>
                </div>
             </div>

          </CardContent>
        </Card>
      )}

      {/* Main Status Card */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className={cn(
          "h-2 w-full",
          access.status === 'active' ? "bg-emerald-500" : 
          access.status === 'grace_period' ? "bg-amber-500" :
          "bg-rose-500"
        )} />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Status Keanggotaan</CardTitle>
            <Badge className={cn(
              "font-black text-[10px] px-3 py-1 border-none",
              access.status === 'active' ? "bg-emerald-100 text-emerald-700" : 
              access.status === 'grace_period' ? "bg-amber-100 text-amber-700" :
              "bg-rose-100 text-rose-700"
            )}>
              {access.status.toUpperCase()}
            </Badge>
          </div>
          <CardDescription className="text-xs font-medium leading-relaxed mt-2 flex flex-col gap-1">
            <span>{access.message}</span>
            {hasActiveVoucher && (
              <span className="text-emerald-700 font-black flex items-center gap-1 mt-1 animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5" /> AKSES VOUCHER AKTIF
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-2xl border border-dashed flex flex-col gap-1">
               <span className="text-[9px] font-black text-muted-foreground uppercase">
                 {hasActiveVoucher ? "Masa Berlaku Voucher" : "Batas Aktif Akses"}
               </span>
               <span className="text-xs font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#800000]" />
                  {hasActiveVoucher ? (
                    activeVoucher?.vouchers?.expiry_date ? 
                      new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(activeVoucher.vouchers.expiry_date)) :
                      "Selamanya"
                  ) : dueDate ? (
                    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(dueDate)
                  ) : (
                    "Belum Aktif"
                  )}
               </span>
               {!hasActiveVoucher && displayDueDate && (
                 <span className="text-[8px] text-muted-foreground font-medium italic">
                   *Akses terbuka hingga tanggal di atas.
                 </span>
               )}
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl border border-dashed flex flex-col gap-1 group relative overflow-hidden">
               <span className="text-[9px] font-black text-muted-foreground uppercase">Sisa Kuota Cuti</span>
               <div className="flex items-center justify-between">
                 <span className="text-sm font-bold flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-emerald-600" />
                    {userData.mufradat_leave_balance ?? 3} Bulan
                 </span>
                 <Button 
                    variant="link" 
                    className="h-6 text-[10px] font-black p-0 text-[#800000] hover:no-underline hover:scale-105 transition-all"
                    onClick={() => setMode('leave')}
                    disabled={(userData.mufradat_leave_balance ?? 3) <= 0}
                  >
                    AJUKAN
                 </Button>
               </div>
            </div>
          </div>

          {/* Voucher Section */}
          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-dashed space-y-3">
             <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Punya Kode Voucher?</h4>
             </div>
             <div className="flex gap-2">
                <Input 
                   placeholder="KODE VOUCHER" 
                   value={voucherCode}
                   onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                   className="h-10 border-2 rounded-xl font-bold text-xs"
                />
                <Button 
                   onClick={handleRedeemVoucher}
                   disabled={isRedeeming || !voucherCode.trim()}
                   className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] h-10 px-6 rounded-xl"
                >
                   {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "KLAIM"}
                </Button>
             </div>
              <p className="text-[9px] text-muted-foreground font-black italic mt-1">
                 *Hubungi admin untuk mendapatkan kode voucher atau aktivasi manual.
              </p>
          </div>

          {access.status !== 'active' && mode === 'view' && (
            <div className={cn(
              "p-5 rounded-2xl space-y-3 animate-in fade-in zoom-in border-2",
              access.status === 'inactive' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-center gap-3">
                {access.status === 'inactive' ? <BookOpen className="w-5 h-5 text-emerald-600" /> : <Heart className="w-5 h-5 fill-amber-500" />}
                <h4 className={cn(
                  "font-black text-sm uppercase tracking-tight",
                  access.status === 'inactive' ? "text-emerald-800" : "text-amber-800"
                )}>
                  {registrations?.some(r => r.status === 'pending_verification') 
                    ? "Menunggu Verifikasi Manual" 
                    : access.status === 'inactive' ? "Pendaftaran Diperlukan" : "Dukungan & Konfirmasi"}
                </h4>
              </div>
              <p className={cn(
                "text-xs leading-relaxed font-medium italic",
                access.status === 'inactive' ? "text-emerald-900" : "text-amber-900"
              )}>
                {registrations?.some(r => r.status === 'pending_verification')
                  ? `Sabar menunggu ya ${fullSalutation}. Pendaftaran/pembayaran ${fullSalutation} sedang dalam antrean verifikasi manual oleh Musyrifah. Mohon tunggu maksimal 1x24 jam kerja.`
                  : access.status === 'inactive' ? 
                  `${fullSalutation} belum terdaftar di program Hi Mufradat. Silakan lakukan pendaftaran terlebih dahulu untuk pembukaan akses dan penempatan kelompok (halaqah).` :
                  access.status === 'blocked' ? 
                  `Selesaikan infaq ${fullSalutation} untuk terus mendukung operasional Hi AQLI dan membuka kembali akses ayat.` :
                  `Status Infaq ${fullSalutation} belum terverifikasi untuk periode ini. Silakan lakukan konfirmasi di bawah guna mendukung operasional Hi AQLI.`
                }
              </p>
              <div className="flex gap-2 pt-2">
                {registrations?.some(r => r.status === 'pending_verification') ? (
                  <Button variant="outline" className="flex-1 border-amber-300 text-amber-700 font-black text-[10px] h-10 rounded-xl" disabled>
                    SEDANG DIPROSES...
                  </Button>
                ) : access.status === 'inactive' ? (
                  <Button asChild className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] h-10 rounded-xl">
                    <Link href="/programs">DAFTAR PROGRAM SEKARANG</Link>
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => setMode('pay')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] h-10 rounded-xl">
                      INFAQ SEKARANG
                    </Button>
                    {userData.mufradat_leave_balance > 0 && access.status !== 'blocked' && (
                      <Button onClick={() => setMode('leave')} variant="outline" className="flex-1 border-amber-300 text-amber-700 font-black text-[10px] h-10 rounded-xl">
                        AJUKAN CUTI
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Switches */}
      {mode === 'pay' && (
        <Card className="border-none shadow-xl bg-white animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="bg-[#800000] text-white rounded-t-2xl">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" /> KONFIRMASI PEMBAYARAN
            </CardTitle>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Periode: {access.nextBillingMonth || 'Bulan Ini'}</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
             <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border-2 border-dashed">
                <div className="flex items-center justify-between text-xs font-bold">
                   <span className="text-muted-foreground">Tujuan Transfer:</span>
                   <Badge className="bg-[#800000]">BSI (BANK SYARIAH INDONESIA)</Badge>
                </div>
                  <div className="flex items-center justify-between text-2xl font-black text-[#800000]">
                     <span>Rp {(parseInt(amount) + uniqueCode).toLocaleString('id-ID')}</span>
                     <span className="text-[10px] text-muted-foreground uppercase font-medium">a.n. Dewi Febriani</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold border-t border-dashed border-amber-200 pt-2 mt-2">
                     <span className="text-muted-foreground">No. Rekening:</span>
                     <span className="text-lg">7209432468</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium italic mt-2 leading-relaxed">
                    Selisih nominal dari kode unik verifikasi akan disalurkan sebagai infaq melalui program Hi Berbagi di Hi AQLI.
                  </p>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Pengirim Sesuai Rekening</Label>
                   <Input 
                      placeholder="Contoh: Khadijah Abdullah" 
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="h-12 border-2 rounded-xl font-bold"
                   />
                </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Nomor WhatsApp Aktif</Label>
                    <Input 
                       placeholder="Contoh: 08123456789" 
                       value={whatsapp}
                       onChange={(e) => setWhatsapp(e.target.value)}
                       className="h-12 border-2 rounded-xl font-bold"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Nominal (Tanpa Titik)</Label>
                     <Input 
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         className="h-12 border-2 rounded-xl font-black text-[#800000]"
                     />
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-amber-600 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> + KODE UNIK: {uniqueCode}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold italic flex items-center gap-1">
                          <Info className="w-3 h-3" /> Minimal infaq: Rp 20.000 (Mendukung Operasional)
                        </p>
                       <p className="text-[9px] text-[#800000] font-medium opacity-70 italic leading-relaxed">
                         Hi AQLI membutuhkan dana operasional untuk terus menyediakan layanan ini. Syukran atas dukungan Ukhti tepat waktu.
                       </p>
                     </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Bukti Transfer</Label>
                    <div 
                      onClick={() => document.getElementById('billing-file')?.click()}
                      className={cn(
                        "h-12 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all",
                        proofFile ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white text-muted-foreground hover:bg-slate-50"
                      )}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase truncate max-w-[80px]">
                        {proofFile ? proofFile.name : "Pilih File"}
                      </span>
                    </div>
                    <input type="file" id="billing-file" className="hidden" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                </div>

                {/* Voucher inside Payment Confirmation */}
                <div className="p-5 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-200 space-y-3 mt-4">
                   <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">Punya Kode Voucher?</h4>
                   </div>
                   <div className="flex gap-2">
                      <Input 
                         placeholder="KODE VOUCHER" 
                         value={voucherCode}
                         onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                         className="h-10 border-2 rounded-xl font-bold text-xs bg-white"
                      />
                      <Button 
                         onClick={handleRedeemVoucher}
                         disabled={isRedeeming || !voucherCode.trim()}
                         className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] h-10 px-6 rounded-xl shadow-sm"
                      >
                         {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "KLAIM"}
                      </Button>
                   </div>
                   <p className="text-[9px] text-amber-800/60 font-bold italic">
                     *Kode voucher minta ke admin atau hubungi admin untuk aktivasi manual.
                   </p>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex gap-3 pt-0">
             <Button variant="ghost" className="flex-1 font-bold h-12" onClick={() => setMode('view')}>Batal</Button>
             <Button 
                onClick={handleUploadProof} 
                className="flex-1 bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-12 rounded-xl shadow-lg"
                disabled={isSubmitting}
             >
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                KIRIM BUKTI
             </Button>
          </CardFooter>
        </Card>
      )}

      {mode === 'leave' && (
        <Card className="border-none shadow-xl bg-white animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          <CardHeader className="bg-emerald-600 text-white">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-300" /> PENGAJUAN CUTI (LEAVE)
            </CardTitle>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Sisa Kuota: {userData.mufradat_leave_balance || 3} Bulan</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
             <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 space-y-3">
                <AlertCircle className="w-6 h-6 text-emerald-600" />
                <p className="text-xs text-emerald-900 leading-relaxed font-bold">
                  Pengajuan cuti akan menonaktifkan tagihan dan memblokir akses ayat untuk sementara. Masa cuti dihitung 1 bulan penuh mulai periode berikutnya.
                </p>
             </div>
             
             <div className="space-y-6">
                <div className="p-4 bg-[#800000]/5 rounded-2xl border border-[#800000]/10">
                   <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Sesuai ketentuan, permohonan cuti akan memotong 1 bulan jatah cuti Ukhti (Jatah: 3 bulan per program).
                      Akses ayat akan ditutup otomatis selama rentang tanggal yang Ukhti pilih di bawah ini.
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Mulai Cuti</Label>
                      <Input 
                         type="date" 
                         value={leaveStart}
                         onChange={(e) => setLeaveStart(e.target.value)}
                         className="h-12 rounded-xl"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Hingga Tanggal</Label>
                      <Input 
                         type="date" 
                         value={leaveEnd}
                         onChange={(e) => setLeaveEnd(e.target.value)}
                         className="h-12 rounded-xl"
                      />
                   </div>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex gap-3 pt-0">
             <Button variant="ghost" className="flex-1 font-bold h-12" onClick={() => setMode('view')}>Batal</Button>
             <Button 
                onClick={handleRequestLeave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl shadow-lg"
                disabled={isSubmitting || (userData.mufradat_leave_balance <= 0) || !leaveStart || !leaveEnd}
             >
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                KONFIRMASI PENGAJUAN CUTI
             </Button>
          </CardFooter>
        </Card>
      )}

      {/* History of Payments/Requests */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Riwayat Status & Billing</h3>
        <div className="space-y-2">
          {combinedHistory.slice(0, 5).map((item: any) => (
            <div key={`${item.type}-${item.id}`} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between group hover:shadow-md transition-shadow animate-in slide-in-from-left-4 duration-300">
               <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    item.paymentType === 'leave_request' ? "bg-emerald-100 text-emerald-600" : 
                    item.type === 'voucher' ? "bg-amber-100 text-amber-600" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {item.paymentType === 'leave_request' ? <Coffee className="w-4 h-4" /> : 
                     item.type === 'voucher' ? <ShieldCheck className="w-4 h-4" /> :
                     <CreditCard className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800">{item.title}</span>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                      {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                      {item.amount > 0 && ` • Rp ${item.amount.toLocaleString('id-ID')}`}
                    </span>
                  </div>
               </div>
                <Badge className={cn(
                  "text-[8px] font-black border-none px-2 py-0.5",
                  item.status === 'verified' || item.type === 'voucher' ? "bg-emerald-500" : 
                  item.status === 'pending_verification' ? "bg-amber-500" : 
                  "bg-rose-500"
                )}>
                  {item.status === 'verified' || item.type === 'voucher' ? 'VERIFIED' : 
                   item.status === 'pending_verification' ? 'PENDING' : 'REJECTED'}
                </Badge>
            </div>
          ))}
          {combinedHistory.length === 0 && (
            <div className="text-center py-10 opacity-30 italic text-xs font-bold text-muted-foreground border-2 border-dashed rounded-3xl">
              Belum ada riwayat aktivitas penagihan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
