
'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Image as ImageIcon,
  Check,
  Clock,
  BookOpen,
  PlayCircle,
  Plus
} from "lucide-react";
import { useUser, supabase } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ShieldCheck, AlertCircle, Info } from "lucide-react";

const levels = [
  { id: "1", name: "Intensif", price: 100000 },
  { id: "2", name: "Reguler", price: 75000 },
  { id: "3", name: "Santai", price: 50000 },
];

const INFAQ_LEVELS = [50000, 75000, 100000, 125000, 150000];

function RegistrationForm() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const halaqahId = searchParams.get('id');

  // Fetch ALL available halaqahs for selection
  const { data: allHalaqahs, isLoading: isHalaqahsLoading } = useCollection("halaqahs", {
    orderBy: { column: 'created_at', ascending: false }
  });

  const { data: userData, isLoading: isUserDocLoading } = useDoc(user ? "users" : null, user?.id);

  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string | null>(halaqahId);

  // Auto-find the circle if ID is in params
  const circle = useMemo(() => {
    if (!selectedHalaqahId || !allHalaqahs) return null;
    return allHalaqahs.find(h => h.id === selectedHalaqahId);
  }, [selectedHalaqahId, allHalaqahs]);

  // 2. Resolve Virtual IDs to real UUIDs for database operations
  const resolvedHalaqahId = useMemo(() => {
    if (!selectedHalaqahId || !allHalaqahs) return selectedHalaqahId;
    
    // Virtual ID mapping to program_type
    if (selectedHalaqahId === 'mufradat-premium') {
      return allHalaqahs.find(h => h.program_type === 'hi_mufradat')?.id || selectedHalaqahId;
    }
    if (selectedHalaqahId === 'tikrar-premium' || selectedHalaqahId === 'tikrar-j30-b1') {
      return allHalaqahs.find(h => h.program_type === 'tikrar_daily')?.id || selectedHalaqahId;
    }
    
    return selectedHalaqahId;
  }, [selectedHalaqahId, allHalaqahs]);

  // Check for ANY existing registration for this halaqah to prevent duplicates
  const regOptions = useMemo(() => {
    // Only apply halaqah_id filter if it's a valid UUID (not a virtual ID)
    // Virtual IDs should be resolved first
    const isVirtual = resolvedHalaqahId?.includes('-'); // Simple UUID check
    
    return {
      filters: [
        { column: 'user_id', operator: '==', value: user?.id },
        { column: 'halaqah_id', operator: '==', value: resolvedHalaqahId },
        { column: 'status', operator: 'in', value: ["active", "pending_verification"] }
      ].filter(f => f.column !== 'halaqah_id' || (f.value && f.value.length > 20)) // Basic UUID length check to avoid 400
    };
  }, [user?.id, resolvedHalaqahId]);

  const { data: existingRegs, isLoading: isRegLoading } = useCollection("halaqah_registrations", regOptions);

  const [isProcessingAccess, setIsProcessingAccess] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !isUserDocLoading && !isRegLoading && !isHalaqahsLoading) {
      setIsProcessingAccess(false);
    }
  }, [isUserLoading, isUserDocLoading, isRegLoading, isHalaqahsLoading]);

  const isProfileActive = (
    (selectedHalaqahId && userData?.followed_halaqahs?.includes(selectedHalaqahId))
  );

  const existingReg = existingRegs?.[0];
  const isActuallyActive = isProfileActive || existingReg?.status === 'active';
  const isActuallyPending = !isActuallyActive && existingReg?.status === 'pending_verification';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [level, setLevel] = useState("3");
  const [targetJuz, setTargetJuz] = useState("30");
  const [uniqueCode, setUniqueCode] = useState(0);
  const [senderName, setSenderName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Hi Mufradat specific states
  const [durationMonths, setDurationMonths] = useState("harian");
  const [mufradatTarget, setMufradatTarget] = useState("1-halaman"); // 'page' or 'juz'
  const [infaqAmount, setInfaqAmount] = useState<number>(0);
  const [akadAccepted, setAkadAccepted] = useState(false);

  // Voucher States
  const [voucherCode, setVoucherCode] = useState("");
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [showVoucher, setShowVoucher] = useState(false);

  // Program Detection
  const isMufradat = (circle?.program_type === 'hi_mufradat' || selectedHalaqahId === 'mufradat-premium') && (selectedHalaqahId !== 'tikrar-premium' && selectedHalaqahId !== 'tikrar-j30-b1');
  const isTikrar = circle?.program_type === 'tikrar_daily' || selectedHalaqahId === 'tikrar-premium' || selectedHalaqahId === 'tikrar-j30-b1';

  const isPremiumProgram = useMemo(() => {
    return circle?.is_premium === true || isMufradat || isTikrar;
  }, [circle?.is_premium, isMufradat, isTikrar]);

  // Minimum Infaq Calculation
  const minInfaq = useMemo(() => {
    if (isMufradat) {
      return 20000; // Standard minimum infaq for Hi Mufradat
    }
    if (isTikrar) {
      return levels.find(l => l.id === level)?.price || 50000;
    }
    if (circle?.payment_type === 'selectable') {
      return 50000; // Base minimum for selectable
    }
    return circle?.base_price || 0;
  }, [isMufradat, isTikrar, level, circle?.base_price, circle?.payment_type]);

  useEffect(() => {
    // Ensure infaqAmount is at least the minimum
    if (infaqAmount < minInfaq) {
      setInfaqAmount(minInfaq);
    }
  }, [minInfaq, infaqAmount]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/login?redirect=/study-circles/registration?id=${halaqahId || ''}`);
      return;
    }
    if (user && !name) setName(user.user_metadata?.full_name || "");
  }, [user, isUserLoading, router, name, halaqahId]);

  useEffect(() => {
    if (step === 2 && isPremiumProgram && !appliedVoucher) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [step, isPremiumProgram, appliedVoucher]);

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    
    setIsValidatingVoucher(true);
    try {
      // 1. Find Voucher
      const { data: voucher, error: vError } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", voucherCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (vError || !voucher) {
        throw new Error("Voucher tidak ditemukan atau sudah tidak aktif.");
      }

      // 2. Check Expiry
      if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
        throw new Error("Voucher sudah kadaluarsa.");
      }

      // 3. Check Program ID
      const programType = circle?.program_type || (isMufradat ? 'mufradat' : (isTikrar ? 'tikrar' : ''));
      if (voucher.program_id !== 'all' && !programType.includes(voucher.program_id) && voucher.program_id !== 'mufradat') {
         // Fallback check for mufradat-premium id
         if (!(selectedHalaqahId === 'mufradat-premium' && voucher.program_id === 'mufradat')) {
            throw new Error(`Voucher ini hanya berlaku untuk program ${voucher.program_id.toUpperCase()}.`);
         }
      }

      // 4. Check If Already Redeemed by this user
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

      setAppliedVoucher(voucher);
      toast({ title: "Voucher Berhasil!", description: `Kode ${voucher.code} berhasil dipasang.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Voucher Gagal", description: err.message });
      setAppliedVoucher(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleNext = () => {
    if (!selectedHalaqahId) {
      toast({ variant: "destructive", title: "Mohon pilih program terlebih dahulu" });
      return;
    }
    if (!whatsapp || whatsapp.length < 10) {
      toast({ variant: "destructive", title: "Nomor WhatsApp tidak valid" });
      return;
    }
    if (isMufradat && !akadAccepted) {
      toast({ variant: "destructive", title: "Mohon baca dan setujui Akad Commitment Mufradat" });
      return;
    }
    if (isTikrar && !akadAccepted) {
        toast({ variant: "destructive", title: "Mohon baca dan setujui Akad Commitment Tikrar" });
        return;
      }
    if (isPremiumProgram && infaqAmount < minInfaq && !appliedVoucher) {
      toast({ variant: "destructive", title: `Minimal infaq untuk target ini adalah Rp ${minInfaq.toLocaleString('id-ID')}` });
      return;
    }
    
    if (appliedVoucher) {
      // If voucher applied, skip payment info and go straight to final confirmation/submit
      setStep(3);
    } else if (isPremiumProgram) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
      toast({ title: "Bukti terpilih", description: e.target.files[0].name });
    }
  };

  const handleConfirm = async () => {
    if (isPremiumProgram && !appliedVoucher && (!senderName || !proofFile)) {
      toast({ variant: "destructive", title: "Lengkapi data pembayaran" });
      return;
    }

    setLoading(true);
    try {
      // Use the pre-resolved UUID for the database
      const finalHalaqahId = resolvedHalaqahId;

      // SAFETY: If we still don't have a UUID (e.g. allHalaqahs failed to load)
      // perform a last-ditch lookup to avoid the 22P02 error
      let verifiedUuid = finalHalaqahId;
      if (finalHalaqahId && !finalHalaqahId.includes('-')) {
        const pType = finalHalaqahId.includes('mufradat') ? 'hi_mufradat' : 'tikrar_daily';
        const { data: hData } = await supabase.from("halaqahs").select("id").eq("program_type", pType).maybeSingle();
        if (hData?.id) verifiedUuid = hData.id;
      }

      if (!verifiedUuid || !verifiedUuid.includes('-')) {
        throw new Error("Gagal memproses ID Program. Mohon muat ulang halaman.");
      }

      const { error } = await supabase.from("halaqah_registrations").insert({
        user_id: user?.id,
        user_name: name,
        user_email: user?.email,
        whatsapp: whatsapp,
        halaqah_id: verifiedUuid,
        halaqah_title: circle?.title || (isMufradat ? 'Hi Mufradat' : 'Halaqah'),
        is_paid: isPremiumProgram || !!appliedVoucher,
        level: isTikrar ? parseInt(level) : null,
        target_juz: isTikrar ? parseInt(targetJuz) : null,
        amount: appliedVoucher ? 0 : (isPremiumProgram ? infaqAmount + uniqueCode : 0),
        payment_method: appliedVoucher ? "voucher" : (isPremiumProgram ? "transfer" : "free"),
        sender_name: appliedVoucher ? `VOUCHER: ${appliedVoucher.code}` : (isPremiumProgram ? senderName : null),
        proof_file_name: appliedVoucher ? "VOUCHER_ACTIVATED" : (proofFile?.name || null),
        status: "pending_verification",
        created_at: new Date().toISOString(),
        // Extra metadata for Hi Mufradat
        metadata: isMufradat ? {
          schedule: durationMonths,
          target: mufradatTarget,
          akadAccepted: true,
          unitPrice: 0,
          infaqBase: infaqAmount,
          voucher_code: appliedVoucher?.code || null
        } : (appliedVoucher ? { voucher_code: appliedVoucher.code } : null)
      });

      if (error) throw error;

      // RECORD VOUCHER REDEMPTION
      if (appliedVoucher) {
        await supabase.from("voucher_redemptions").insert({
          voucher_id: appliedVoucher.id,
          user_id: user?.id
        });
      }

      setSubmitted(true);
      toast({ title: "Pendaftaran Dikirim" });
    } catch (error: any) {
      console.error("REGISTRATION ERROR:", error);
      toast({ variant: "destructive", title: "Gagal mengirim pendaftaran", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (isProcessingAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="animate-spin text-[#800000] h-10 w-10" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memvalidasi Akses Ukhti...</p>
      </div>
    );
  }

  if (isActuallyActive || isActuallyPending) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          <div className={cn("py-10 flex flex-col items-center gap-3 text-white", isActuallyActive ? "bg-emerald-600" : "bg-amber-500")}>
            {isActuallyActive ? <CheckCircle2 className="h-16 w-16" /> : <Clock className="h-16 w-16 animate-pulse" />}
            <h2 className="text-2xl font-black font-headline uppercase tracking-widest">
              {isActuallyActive ? "Akses Aktif" : "Menunggu Verifikasi"}
            </h2>
          </div>
          <CardContent className="pt-8 pb-10 space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Assalamu'alaikum, <strong>{name}</strong>. {isActuallyActive
                  ? `Pendaftaran Ukhti untuk ${circle?.title} sudah tuntas. Silakan masuk ke dalam kelas.`
                  : `Pendaftaran Ukhti untuk ${circle?.title} sedang dalam antrean verifikasi manual.`}
              </p>
              {isActuallyPending && (
                <div className="p-4 bg-muted/50 rounded-xl text-[10px] font-bold text-amber-700 italic border border-amber-200">
                  Mohon tunggu maksimal 1x24 jam untuk aktivasi akses oleh Admin.
                </div>
              )}
            </div>
            <Button asChild className={cn("w-full font-black h-14 rounded-xl text-lg shadow-lg", isActuallyActive ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#800000]")}>
              <Link href={isActuallyActive ? (halaqahId === 'tikrar-j30-b1' || selectedHalaqahId === 'tikrar-premium' ? '/tikrar' : `/study-circles/${circle?.id}`) : "/"}>
                {isActuallyActive ? <><PlayCircle className="mr-2 w-6 h-6" /> MASUK KELAS</> : "KEMBALI KE DASBOR"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto bg-green-100 text-green-600 rounded-full p-4 w-fit animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-bold font-headline text-[#800000]">Pendaftaran Dikirim</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Jazakallahu Khairan, pendaftaran Ukhti sedang kami proses. Cek status di menu Hi Ngaji secara berkala.</p>
            <Button onClick={() => router.push('/')} className="w-full bg-[#800000] font-bold h-12">Kembali ke Beranda</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-6 px-4 pb-20 max-w-2xl mx-auto">
      <Card className="w-full border-none shadow-2xl overflow-hidden">
        <CardHeader className="text-center bg-[#800000] text-white py-10 relative">
          {step > 1 && <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-white hover:bg-white/10" onClick={() => setStep(step - 1)}><ArrowLeft className="h-5 w-5" /></Button>}
          <div className="mx-auto bg-white/20 rounded-full p-4 w-fit mb-4 border-2 border-white/10"><BookOpen className="h-8 w-8 text-amber-300" /></div>
          <CardTitle className="font-headline text-3xl font-black">Pendaftaran Halaqah</CardTitle>
          <CardDescription className="text-white/80 font-medium tracking-wide uppercase text-[10px] mt-1">
            {circle?.title || (isMufradat ? 'Hi Mufradat' : (isTikrar ? 'Hi Tikrar' : 'Pendaftaran')) || (selectedHalaqahId ? 'Program Terpilih' : 'Silakan Pilih Program')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-10">
          {step === 1 ? (
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-[#800000] tracking-widest">Pilih Program</Label>
                <Select value={selectedHalaqahId || ""} onValueChange={setSelectedHalaqahId}>
                  <SelectTrigger className="h-14 border-2 font-black text-sm">
                    <SelectValue placeholder="-- Pilih Program Halaqah --" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allHalaqahs || []).map(h => (
                      <SelectItem key={h.id} value={h.id} className="font-bold py-3 text-xs">
                        {h.title} {h.is_premium ? '(Premium)' : '(Gratis)'}
                      </SelectItem>
                    ))}
                    {!allHalaqahs?.length && (
                      <>
                        <SelectItem value="mufradat-premium" className="font-bold">Hi Mufradat</SelectItem>
                        <SelectItem value="tikrar-premium" className="font-bold">Hi Tikrar</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nama Peserta</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-[#800000]" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-12 border-2 focus-visible:ring-[#800000] font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nomor WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-[#800000]" />
                    <Input placeholder="0812345..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="pl-10 h-12 border-2 focus-visible:ring-[#800000] font-bold" />
                  </div>
                </div>
              </div>

              {isTikrar && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-muted/30 rounded-2xl border-2 border-dashed">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest">Level</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name} - Rp {l.price.toLocaleString('id-ID')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest">Target Juz</Label>
                      <Select value={targetJuz} onValueChange={setTargetJuz}>
                        <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 30 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>Juz {i + 1}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {circle?.payment_type === 'selectable' ? (
                    <div className="space-y-3">
                       <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Pilih Level Infaq</Label>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {INFAQ_LEVELS.map((lvl) => (
                            <Button
                              key={lvl}
                              type="button"
                              variant={infaqAmount === lvl ? "default" : "outline"}
                              className={cn(
                                "h-12 font-black text-xs transition-all rounded-xl border-2",
                                infaqAmount === lvl ? "bg-[#800000] text-white border-[#800000] scale-105 shadow-md" : "border-[#800000]/10 text-[#800000] hover:bg-[#800000]/5"
                              )}
                              onClick={() => setInfaqAmount(lvl)}
                            >
                              Rp {lvl.toLocaleString('id-ID')}
                            </Button>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Nominal Infaq</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-3.5 text-xs font-black text-muted-foreground">Rp</div>
                        <Input
                          type="number"
                          value={infaqAmount}
                          onChange={(e) => setInfaqAmount(parseInt(e.target.value) || 0)}
                          className="pl-10 h-14 border-2 text-xl font-black text-[#800000] focus-visible:ring-[#800000]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Voucher Section - Tikrar */}
                  {isPremiumProgram && (
                    <div className={cn(
                      "p-6 rounded-2xl border-2 border-dashed space-y-4 animate-in fade-in transition-all",
                      appliedVoucher ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={cn("w-5 h-5", appliedVoucher ? "text-emerald-600" : "text-slate-400")} />
                        <h4 className={cn("font-black text-[10px] uppercase tracking-widest", appliedVoucher ? "text-emerald-800" : "text-slate-500")}>
                          Punya Kode Voucher?
                        </h4>
                      </div>
                      
                      {appliedVoucher ? (
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-100">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Voucher Aktif</span>
                            <span className="text-sm font-black text-[#800000]">{appliedVoucher.code}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-rose-500 font-bold text-[10px]" onClick={() => {setAppliedVoucher(null); setVoucherCode("");}}>HAPUS</Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="KODE VOUCHER" 
                              value={voucherCode}
                              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                              className="h-12 border-2 rounded-xl font-bold uppercase"
                            />
                            <Button 
                              onClick={handleValidateVoucher}
                              disabled={isValidatingVoucher || !voucherCode.trim()}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] h-12 px-6 rounded-xl"
                            >
                              {isValidatingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : "KLAIM"}
                            </Button>
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold italic mt-1">
                            *Kode voucher minta ke admin atau hubungi admin untuk aktivasi manual.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tikrar Akad Section */}
                  <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-200/50 space-y-4 animate-in fade-in zoom-in">
                    <div className="flex items-center gap-2 text-[#800000]">
                      <ShieldCheck className="w-5 h-5" />
                      <h4 className="font-black text-sm uppercase tracking-widest text-[#800000]">Akad Itqan Hi Tikrar</h4>
                    </div>
                    <div className="space-y-3 text-[11px] text-blue-900 leading-relaxed font-medium">
                      <p>Dengan mendaftar Hi Tikrar, saya berkomitmen untuk:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Disiplin</strong>: Mengikuti metode Tikrar 40x sesuai target harian untuk mencapai kualitas Itqan.</li>
                        <li><strong>Fokus</strong>: Menuntaskan satu maqta (halaman) secara sempurna sebelum melanjutkan ke maqta berikutnya.</li>
                        <li><strong>Jujur</strong>: Mengisi mutaba'ah kartu kontrol repetisi secara mandiri dan amanah.</li>
                        <li><strong>Istiqlal</strong>: Mengharap ridho Allah semata dalam perjuangan menjaga Kalam-Nya.</li>
                      </ul>
                    </div>
                    <div className="flex items-start gap-3 pt-2">
                       <div 
                        onClick={() => setAkadAccepted(!akadAccepted)}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5",
                          akadAccepted ? "bg-[#800000] border-[#800000]" : "bg-white border-blue-300"
                        )}
                      >
                        {akadAccepted && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <Label className="text-[10px] font-bold text-blue-900 leading-tight cursor-pointer" onClick={() => setAkadAccepted(!akadAccepted)}>
                        Saya setuju dengan Akad & Komitmen Hi Tikrar di atas.
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {isMufradat && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-[#800000]/5 rounded-2xl border-2 border-[#800000]/10">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Target Hafalan (per Pekan)</Label>
                      <Select value={mufradatTarget} onValueChange={setMufradatTarget}>
                        <SelectTrigger className="h-12 border-2 font-bold bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-halaman">1 Halaman</SelectItem>
                          <SelectItem value="2-halaman">2 Halaman</SelectItem>
                          <SelectItem value="3-halaman">3 Halaman</SelectItem>
                          <SelectItem value="5-halaman">5 Halaman (1/4 Juz)</SelectItem>
                          <SelectItem value="10-halaman">10 Halaman (1/2 Juz)</SelectItem>
                          <SelectItem value="20-halaman">20 Halaman (1 Juz)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Jadwal Belajar</Label>
                      <Select value={durationMonths} onValueChange={setDurationMonths}>
                        <SelectTrigger className="h-12 border-2 font-bold bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="harian">Harian (Senin - Jumat)</SelectItem>
                          <SelectItem value="pekanan">Pekanan (Sabtu - Ahad)</SelectItem>
                          <SelectItem value="fleksibel">Fleksibel (Senin - Ahad)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Nominal Infaq</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-3.5 text-xs font-black text-muted-foreground">Rp</div>
                        <Input
                          type="number"
                          value={infaqAmount}
                          onChange={(e) => setInfaqAmount(parseInt(e.target.value) || 0)}
                          className="pl-10 h-14 border-2 text-xl font-black text-[#800000] focus-visible:ring-[#800000]"
                        />
                      </div>
                      <Button 
                        type="button"
                        onClick={() => setInfaqAmount(prev => prev + 10000)}
                        className="h-14 w-14 rounded-xl border-2 border-[#800000]/20 bg-[#800000]/5 text-[#800000] hover:bg-[#800000] hover:text-white transition-all shadow-sm"
                      >
                        <Plus className="w-6 h-6" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold italic flex items-center gap-1">
                      <Info className="w-3 h-3" /> Minimal infaq: Rp {minInfaq.toLocaleString('id-ID')} {circle?.payment_type === 'selectable' && "(Pilihan Bebas)"}
                    </p>
                  </div>

                  {/* Voucher Section - Mufradat */}
                  {isPremiumProgram && (
                    <div className={cn(
                      "p-6 rounded-2xl border-2 border-dashed space-y-4 animate-in fade-in transition-all",
                      appliedVoucher ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={cn("w-5 h-5", appliedVoucher ? "text-emerald-600" : "text-slate-400")} />
                        <h4 className={cn("font-black text-[10px] uppercase tracking-widest", appliedVoucher ? "text-emerald-800" : "text-slate-500")}>
                          Punya Kode Voucher?
                        </h4>
                      </div>
                      
                      {appliedVoucher ? (
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-100">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Voucher Aktif</span>
                            <span className="text-sm font-black text-[#800000]">{appliedVoucher.code}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-rose-500 font-bold text-[10px]" onClick={() => {setAppliedVoucher(null); setVoucherCode("");}}>HAPUS</Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="KODE VOUCHER" 
                              value={voucherCode}
                              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                              className="h-12 border-2 rounded-xl font-bold uppercase"
                            />
                            <Button 
                              onClick={handleValidateVoucher}
                              disabled={isValidatingVoucher || !voucherCode.trim()}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] h-12 px-6 rounded-xl"
                            >
                              {isValidatingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : "KLAIM"}
                            </Button>
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold italic mt-1">
                            *Kode voucher minta ke admin atau hubungi admin untuk aktivasi manual.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mufradat Akad Section */}
                  <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200 space-y-4 animate-in fade-in zoom-in">
                    <div className="flex items-center gap-2 text-[#800000]">
                      <ShieldCheck className="w-5 h-5" />
                      <h4 className="font-black text-sm uppercase tracking-widest text-[#800000]">Akad Commitment Hi Mufradat</h4>
                    </div>
                    <div className="space-y-3 text-[11px] text-emerald-900 leading-relaxed font-medium">
                      <p>Dengan mendaftar Hi Mufradat, saya berjanji untuk:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Disiplin</strong>: Mengikuti target hafalan sesuai pilihan (min. 1 halaman/pekan).</li>
                        <li><strong>Aktif</strong>: Berpartisipasi dalam Monitoring Group WhatsApp yang telah ditentukan.</li>
                        <li><strong>Konsekuensi</strong>: Jika dalam 2 pekan berturut-turut tidak ada progres tanpa udzur syar'i, saya bersedia menerima teguran atau dikeluarkan dari group sementara demi menjaga semangat belajar thalibah lain.</li>
                        <li><strong>Ikhlas</strong>: Niat semata-mata karena Allah untuk memahami kalam-Nya.</li>
                      </ul>
                    </div>
                    <div className="flex items-start gap-3 pt-2">
                       <div 
                        onClick={() => setAkadAccepted(!akadAccepted)}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5",
                          akadAccepted ? "bg-[#800000] border-[#800000]" : "bg-white border-emerald-300"
                        )}
                      >
                        {akadAccepted && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <Label className="text-[10px] font-bold text-emerald-900 leading-tight cursor-pointer" onClick={() => setAkadAccepted(!akadAccepted)}>
                        Saya setuju dengan Akad & Ketentuan di atas (Ittafaqna).
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleNext} className="w-full h-16 text-lg font-black bg-[#800000] hover:bg-[#800000]/90 rounded-xl shadow-lg shadow-[#800000]/20 mt-4 uppercase tracking-widest">
                {isPremiumProgram ? "Lanjut Pembayaran" : "Konfirmasi Daftar"} <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          ) : step === 2 ? (
            <div className="space-y-8">
              <div className="text-center space-y-2 bg-muted/30 p-8 rounded-3xl border-2 border-dashed border-[#800000]/20 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Infaq Pendaftaran</p>
                <div className="text-4xl font-black text-[#800000]">Rp {(infaqAmount + uniqueCode).toLocaleString('id-ID')}</div>
                <p className="text-[10px] text-amber-700 font-bold italic bg-amber-50 py-1 px-3 rounded-full inline-block mt-2 border border-amber-100">*Termasuk kode unik verifikasi {uniqueCode}</p>
              </div>
              <div className="bg-[#800000]/5 p-6 rounded-2xl border-2 border-[#800000]/10 space-y-4">
                <p className="text-xs font-black text-[#800000] uppercase tracking-widest">Rekening Tujuan (BSI)</p>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2 shadow-sm">
                  <span className="font-mono font-black text-xl tracking-wider">7123456789</span>
                  <Button variant="ghost" size="sm" className="font-black text-[#800000] hover:bg-[#800000]/10" onClick={() => { navigator.clipboard.writeText("7123456789"); toast({ description: "Nomor rekening disalin" }) }}>SALIN</Button>
                </div>
                <p className="text-[10px] font-bold text-center text-muted-foreground">a.n. Sahabat AQLI Digital</p>
              </div>
              <Button onClick={() => setStep(3)} className="w-full h-16 bg-[#800000] hover:bg-[#800000]/90 font-black rounded-xl text-lg uppercase tracking-widest shadow-xl">Saya Sudah Transfer</Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {isPremiumProgram && !appliedVoucher ? (
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nama Pengirim Sesuai Rekening</Label>
                    <Input placeholder="Contoh: Abdullah" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="h-12 border-2 font-bold focus-visible:ring-[#800000]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unggah Bukti Transfer</Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("border-2 border-dashed rounded-3xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all hover:bg-muted/30", proofFile ? "bg-emerald-50 border-emerald-500" : "bg-muted/10 border-muted-foreground/20")}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      {proofFile ? <><Check className="h-12 w-12 text-emerald-600" /><span className="text-xs font-black uppercase tracking-widest text-emerald-700">{proofFile.name}</span></> : <><ImageIcon className="h-12 w-12 text-muted-foreground opacity-30" /><span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pilih Foto Bukti</span></>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-emerald-50 rounded-3xl border-2 border-emerald-100 text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-emerald-800 leading-relaxed">Masyallah! Kelas ini terbuka secara gratis untuk Ukhti. Tekan tombol di bawah untuk aktivasi antrean verifikasi.</p>
                </div>
              )}
              <Button onClick={handleConfirm} disabled={loading} className="w-full h-16 bg-[#800000] hover:bg-[#800000]/90 font-black rounded-xl text-lg uppercase tracking-widest shadow-2xl">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Kirim Pendaftaran"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HalaqahRegistrationPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin text-[#800000] h-10 w-10" /><p className="text-xs font-black uppercase">Menyiapkan Formulir...</p></div>}>
      <RegistrationForm />
    </Suspense>
  );
}
