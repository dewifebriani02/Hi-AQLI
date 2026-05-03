
'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { getCallSign } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  FileText,
  Upload,
  Calendar,
  AlertTriangle,
  HeartHandshake,
  Zap,
  Clock,
  PlayCircle,
  BookOpen,
  ShieldCheck,
  Check,
  Plus,
  Info,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { useUser, supabase } from "@/supabase";
import { useDoc, useCollection } from "@/supabase/db";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { normalizeWhatsapp, whatsappErrorMessage } from "@/lib/whatsapp";
import Link from "next/link";

const levels = [
  { id: "1", name: "Intensif", price: 100000 },
  { id: "2", name: "Reguler", price: 75000 },
  { id: "3", name: "Santai", price: 50000 },
];

const INFAQ_LEVELS = [50000, 75000, 100000, 250000, 500000, 1000000];

function RegistrationForm() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const halaqahId = searchParams.get('id');
  const programParam = searchParams.get('program'); // e.g., 'hi_ngaji', 'hi_mufradat', 'tikrar_daily'

  // Fetch ALL available halaqahs for selection
  const { data: allHalaqahs, isLoading: isHalaqahsLoading } = useCollection("halaqahs", {
    orderBy: { column: 'created_at', ascending: false }
  });

  // Filter halaqahs based on program parameter
  const filteredHalaqahs = useMemo(() => {
    if (!allHalaqahs) return [];
    if (!programParam) return allHalaqahs;
    return allHalaqahs.filter(h => h.program_type === programParam);
  }, [allHalaqahs, programParam]);

  // Get display name for the program type
  const programDisplayName = useMemo(() => {
    if (!programParam) return null;
    const names: Record<string, string> = {
      'hi_ngaji': 'Hi Ngaji',
      'hi_mufradat': 'Hi Mufradat',
      'tikrar_daily': 'Hi Tikrar',
      'hi_tikrar': 'Hi Tikrar',
      'hi_berbagi': 'Hi Berbagi',
      'hi_mutabaah': 'Hi Mutaba\'ah',
      'hi_muhasabah': 'Hi Muhasabah',
    };
    return names[programParam] || programParam;
  }, [programParam]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(user ? "users" : null, user?.id);
  const fullSalutation = userData?.salutation || "Ukhti";
  const callSign = getCallSign(fullSalutation);

  const { data: userRegistrations } = useCollection("halaqah_registrations", {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  });

  const hasUsedReferral = useMemo(() => {
    return (userRegistrations || []).some(reg => reg.referral_code_used && reg.status !== 'rejected');
  }, [userRegistrations]);

  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string | null>(halaqahId);

  // Auto-find the circle if ID is in params
  const circle = useMemo(() => {
    const searchPool = programParam ? filteredHalaqahs : allHalaqahs;
    if (!selectedHalaqahId || !searchPool) return null;
    return searchPool.find(h => h.id === selectedHalaqahId);
  }, [selectedHalaqahId, allHalaqahs, filteredHalaqahs, programParam]);

  // 2. Resolve Virtual IDs to real UUIDs for database operations
  const { data: mufradatGroups } = useCollection("mufradat_groups", {
    limit: 1,
    orderBy: { column: 'created_at', ascending: true }
  });
  const defaultGroup = mufradatGroups?.[0];

  const resolvedHalaqahId = useMemo(() => {
    const searchPool = programParam ? filteredHalaqahs : allHalaqahs;
    if (!selectedHalaqahId || !searchPool) return selectedHalaqahId;

    // Virtual ID mapping to programType (only applies when not filtered by program)
    if (!programParam) {
      if (selectedHalaqahId === 'mufradat-premium') {
        return allHalaqahs?.find(h => h.program_type === 'hi_mufradat')?.id || selectedHalaqahId;
      }
      if (selectedHalaqahId === 'tikrar-premium' || selectedHalaqahId === 'tikrar-j30-b1') {
        return allHalaqahs?.find(h => h.program_type === 'tikrar_daily')?.id || selectedHalaqahId;
      }
    }

    return selectedHalaqahId;
  }, [selectedHalaqahId, allHalaqahs, filteredHalaqahs, programParam]);

  // Robust Auto-selection based on URL program parameter
  useEffect(() => {
    if (programParam && allHalaqahs && !selectedHalaqahId) {
      let searchId = programParam;
      // Handle keyword mapping to official IDs
      if (programParam.toLowerCase() === 'mufradat') searchId = 'mufradat-premium';
      if (programParam.toLowerCase() === 'tikrar') searchId = 'tikrar-premium';
      if (programParam.toLowerCase() === 'ngaji') searchId = 'hi-ngaji';
      if (programParam.toLowerCase() === 'irab') searchId = 'hi-irab';

      const found = allHalaqahs.find(h => 
        h.id === searchId || 
        h.id === programParam || 
        h.title?.toLowerCase().includes(programParam.toLowerCase())
      );
      
      if (found) {
        setSelectedHalaqahId(found.id);
      }
    }
  }, [programParam, allHalaqahs, selectedHalaqahId]);

  // Check for ANY existing registration for this halaqah to prevent duplicates
  const regOptions = useMemo(() => {
    const isVirtual = resolvedHalaqahId?.includes('-'); 
    
    return {
      filters: [
        { column: 'user_id', operator: '==', value: user?.id },
        { column: 'halaqah_id', operator: '==', value: resolvedHalaqahId },
        { column: 'status', operator: 'in', value: ["active", "pending_verification"] }
      ].filter(f => f.column !== 'halaqah_id' || (f.value && f.value.length > 20)) 
    };
  }, [user?.id, resolvedHalaqahId]);

  const { data: registrationsHistory, isLoading: isAllRegLoading } = useCollection("halaqah_registrations", {
    filters: [
      { column: 'user_id', operator: '==', value: user?.id }
    ]
  });

  const { data: existingRegs, isLoading: isRegLoading } = useCollection("halaqah_registrations", regOptions);

  const [isProcessingAccess, setIsProcessingAccess] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !isUserDocLoading && !isRegLoading && !isHalaqahsLoading && !isAllRegLoading) {
      setIsProcessingAccess(false);
    }
  }, [isUserLoading, isUserDocLoading, isRegLoading, isHalaqahsLoading, isAllRegLoading]);

  const isProfileActive = (
    (selectedHalaqahId && userData?.followed_halaqahs?.includes(selectedHalaqahId))
  );

  const existingReg = existingRegs?.[0];
  const isActuallyActive = isProfileActive || existingReg?.status === 'active';
  const isActuallyPending = !isActuallyActive && existingReg?.status === 'pending_verification';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [forceShowForm, setForceShowForm] = useState(false);

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

  // Referral States
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [appliedReferral, setAppliedReferral] = useState<any>(null);

  // 1. Auto-apply referral (From Profile OR URL)
  useEffect(() => {
    const urlReferral = searchParams.get('ref');
    const effectiveReferralId = userData?.referred_by_id;

    if ((effectiveReferralId || urlReferral) && !appliedReferral) {
      const fetchReferrer = async () => {
        let referrer = null;

        // Priority 1: From URL (Parameters) - explicit intent
        if (urlReferral) {
          const { data } = await supabase
            .from("users")
            .select("id, referral_code, username")
            .eq("referral_code", urlReferral.toUpperCase())
            .maybeSingle();
          referrer = data;
        }

        // Priority 2: From Profile (Persistent) - ALWAYS apply if user has referred_by_id
        if (!referrer && effectiveReferralId) {
          const { data } = await supabase
            .from("users")
            .select("id, referral_code, username")
            .eq("id", effectiveReferralId)
            .maybeSingle();
          referrer = data;
        }

        if (referrer) {
           setAppliedReferral(referrer);
           setReferralCodeInput(referrer.referral_code || "");
           console.log("Auto-applied referral:", referrer.referral_code);
        }
      };
      fetchReferrer();
    }
  }, [userData?.referred_by_id, searchParams, appliedReferral]);

  // Program Detection
  const isMufradat = ((circle?.program_type || circle?.programType) === 'hi_mufradat' || selectedHalaqahId === 'mufradat-premium');
  const isTikrar = (circle?.program_type || circle?.programType) === 'tikrar_daily' || selectedHalaqahId === 'tikrar-premium' || selectedHalaqahId === 'tikrar-j30-b1';
  const isNgaji = (circle?.program_type || circle?.programType) === 'hi_ngaji' || programParam === 'hi_ngaji';

  const isPremiumProgram = useMemo(() => {
    return circle?.is_premium === true || isMufradat || isTikrar;
  }, [circle?.is_premium, isMufradat, isTikrar]);

  // Minimum Infaq Calculation
  const minInfaq = useMemo(() => {
    const adminBase = circle?.base_price || 0;
    
    if (isMufradat) {
      return Math.max(20000, adminBase);
    }
    if (isTikrar) {
      return levels.find(l => l.id === level)?.price || 50000;
    }
    if (circle?.payment_type === 'selectable') {
      return adminBase || 50000;
    }
    return adminBase || 0;
  }, [isMufradat, isTikrar, level, circle]);

  const isFirstRegistration = useMemo(() => {
    if (!user || !registrationsHistory || !circle) return true;
    const sameProgramRegs = registrationsHistory.filter(r => 
      r.user_id === user.id && 
      (r.halaqah_id === circle.id || r.halaqah_title?.toLowerCase().includes(isMufradat ? 'mufradat' : (isTikrar ? 'tikrar' : '---')))
    );
    return sameProgramRegs.length === 0;
  }, [user, registrationsHistory, circle, isMufradat, isTikrar]);

  const registrationFee = isFirstRegistration ? 10000 : 0;
  const referralDiscount = (appliedReferral && !appliedVoucher && !hasUsedReferral) ? 5000 : 0;

  const totalCalculated = useMemo(() => {
    if (!isPremiumProgram || appliedVoucher) return 0;
    return Math.max(0, infaqAmount + registrationFee - referralDiscount + uniqueCode);
  }, [isPremiumProgram, infaqAmount, registrationFee, referralDiscount, uniqueCode, appliedVoucher]);

  useEffect(() => {
    if (infaqAmount < minInfaq) {
      setInfaqAmount(minInfaq);
    }
  }, [minInfaq, infaqAmount]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/login?redirectTo=/study-circles/registration?id=${halaqahId || ''}`);
      return;
    }
    if (user && !name) setName(user.user_metadata?.full_name || "");
  }, [user, isUserLoading, router, name, halaqahId]);

  useEffect(() => {
    if (step === 2 && isPremiumProgram && !appliedVoucher) {
      if (forceShowForm && existingReg?.unique_code) {
        setUniqueCode(existingReg.unique_code);
      } else {
        setUniqueCode(Math.floor(100 + Math.random() * 899));
      }
    }
  }, [step, isPremiumProgram, appliedVoucher, forceShowForm, existingReg]);

  useEffect(() => {
    if (forceShowForm && existingReg) {
      if (existingReg.user_name) setName(existingReg.user_name);
      if (existingReg.whatsapp) setWhatsapp(existingReg.whatsapp);
      if (existingReg.amount) {
        const base = (existingReg.amount || 0) - (existingReg.registration_fee || 0) - (existingReg.unique_code || 0) + (existingReg.referral_discount_amount || 0);
        setInfaqAmount(Math.max(minInfaq, base));
      }
      setStep(2);
    }
  }, [forceShowForm, existingReg, minInfaq]);

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    
    setIsValidatingVoucher(true);
    try {
      const { data: voucher, error: vError } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", voucherCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (vError || !voucher) {
        throw new Error("Voucher tidak ditemukan atau sudah tidak aktif.");
      }

      if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
        throw new Error("Voucher sudah kadaluarsa.");
      }

      const programType = circle?.program_type || (isMufradat ? 'mufradat' : (isTikrar ? 'tikrar' : ''));
      if (voucher.program_id !== 'all' && !programType.includes(voucher.program_id) && voucher.program_id !== 'mufradat') {
         if (!(selectedHalaqahId === 'mufradat-premium' && voucher.program_id === 'mufradat')) {
            throw new Error(`Voucher ini hanya berlaku untuk program ${voucher.program_id.toUpperCase()}.`);
         }
      }

      const { data: existing } = await supabase
        .from("voucher_redemptions")
        .select("id")
        .eq("voucher_id", voucher.id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (existing) {
        throw new Error(`${fullSalutation} sudah pernah menggunakan voucher ini sebelumnya.`);
      }

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

  const handleValidateReferral = async () => {
    if (!referralCodeInput.trim()) return;
    
    if (hasUsedReferral) {
      toast({ 
        title: "Referral Tidak Berlaku", 
        description: "Potongan referral hanya berlaku untuk pendaftaran pertama kali di Hi AQLI.",
        variant: "destructive"
      });
      return;
    }

    setIsValidatingReferral(true);
    try {
      const { data: referrer, error } = await supabase
        .from("users")
        .select("id, referral_code, username")
        .eq("referral_code", referralCodeInput.trim().toUpperCase())
        .maybeSingle();

      if (error || !referrer) {
        throw new Error("Kode Referral tidak valid atau tidak ditemukan.");
      }

      if (referrer.id === user?.id) {
        throw new Error("Tidak bisa menggunakan kode referral milik sendiri.");
      }

      setAppliedReferral(referrer);
      toast({ title: "Referral Berhasil!", description: `${fullSalutation} mendapatkan potongan Rp 5.000 dari ${referrer.referral_code}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Referral Gagal", description: err.message });
      setAppliedReferral(null);
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const handleNext = () => {
    if (!selectedHalaqahId) {
      toast({ variant: "destructive", title: "Mohon pilih program terlebih dahulu" });
      return;
    }
    const waError = whatsappErrorMessage(whatsapp);
    if (waError) {
      toast({ variant: "destructive", title: "Nomor WhatsApp tidak valid", description: waError });
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
    if (isNgaji && !akadAccepted) {
      toast({ variant: "destructive", title: "Mohon baca dan setujui Akad Komitmen Hi Ngaji" });
      return;
    }
    if (isPremiumProgram && infaqAmount < minInfaq && !appliedVoucher) {
      toast({ variant: "destructive", title: `Minimal infaq untuk target ini adalah Rp ${minInfaq.toLocaleString('id-ID')}` });
      return;
    }
    
    if (appliedVoucher) {
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
      const finalHalaqahId = resolvedHalaqahId;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let verifiedUuid = finalHalaqahId;
      
      if (finalHalaqahId && !uuidRegex.test(finalHalaqahId)) {
        const pType = finalHalaqahId.includes('mufradat') ? 'hi_mufradat' : 'tikrar_daily';
        const { data: hData } = await supabase.from("halaqahs").select("id").eq("program_type", pType).maybeSingle();
        if (hData?.id) {
          verifiedUuid = hData.id;
        }
      }

      if (!verifiedUuid || !uuidRegex.test(verifiedUuid)) {
        throw new Error("Gagal memproses ID Program. Mohon muat ulang halaman atau hubungi Admin.");
      }

      const regData = {
        user_id: user?.id,
        user_name: name,
        user_email: user?.email,
        whatsapp: normalizeWhatsapp(whatsapp),
        halaqah_id: verifiedUuid,
        halaqah_title: circle?.title || (isMufradat ? 'Hi Mufradat' : (isTikrar ? 'Hi Tikrar' : (isNgaji ? 'Hi Ngaji' : (programDisplayName || 'Halaqah')))),
        is_paid: isPremiumProgram || !!appliedVoucher,
        level: isTikrar ? parseInt(level) : null,
        target_juz: isTikrar ? parseInt(targetJuz) : null,
        amount: appliedVoucher ? 0 : totalCalculated,
        payment_method: appliedVoucher ? "voucher" : (isPremiumProgram ? "transfer" : "free"),
        sender_name: appliedVoucher ? `VOUCHER: ${appliedVoucher.code}` : (isPremiumProgram ? senderName : null),
        proof_file_name: appliedVoucher ? "VOUCHER_ACTIVATED" : (proofFile?.name || (forceShowForm ? existingReg?.proof_file_name : null)),
        status: "pending_verification",
        created_at: forceShowForm ? existingReg?.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        registration_fee: registrationFee,
        referral_code_used: appliedReferral?.referral_code || null,
        referral_discount_amount: referralDiscount,
        is_first_registration: isFirstRegistration,
        unique_code: uniqueCode,
        metadata: isMufradat ? {
          schedule: durationMonths,
          target: mufradatTarget,
          akadAccepted: true,
          unitPrice: 0,
          infaqBase: infaqAmount,
          voucher_code: appliedVoucher?.code || null,
          referral_code: appliedReferral?.referral_code || null,
          is_resume: forceShowForm
        } : isNgaji ? {
          akadAccepted: true,
          infaqBase: infaqAmount,
          voucher_code: appliedVoucher?.code || null,
          referral_code: appliedReferral?.referral_code || null,
        } : isTikrar ? {
          akadAccepted: true,
          target: targetJuz,
          level: level,
          infaqBase: infaqAmount,
          voucher_code: appliedVoucher?.code || null,
          referral_code: appliedReferral?.referral_code || null,
        } : (appliedVoucher ? { voucher_code: appliedVoucher.code } : null)
      };

      if (forceShowForm && existingReg?.id) {
        const { error } = await supabase
          .from("halaqah_registrations")
          .update(regData)
          .eq('id', existingReg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("halaqah_registrations").insert(regData);
        if (error) throw error;
      }

      if (user?.id) {
        await supabase.from("users").update({ whatsapp: regData.whatsapp }).eq('id', user.id);
      }

      if (appliedVoucher) {
        await supabase.from("voucher_redemptions").insert({
          voucher_id: appliedVoucher.id,
          user_id: user?.id
        });
      }

      if (isMufradat) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('mufradat_accessible_juz')
          .eq('id', user?.id)
          .single();

        let currentJuz = Array.isArray(currentUser?.mufradat_accessible_juz) 
          ? currentUser?.mufradat_accessible_juz 
          : [];
          
        if (!currentJuz.includes(1)) {
           currentJuz.push(1);
           currentJuz.sort((a: number, b: number) => a - b);
        }

        await supabase.from('users').update({
          mufradat_status: 'active',
          mufradat_accessible_juz: currentJuz,
          mufradat_schedule: durationMonths,
          updated_at: new Date().toISOString()
        }).eq('id', user?.id);
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
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memvalidasi Akses {fullSalutation}...</p>
      </div>
    );
  }

  if ((isActuallyActive || isActuallyPending) && !forceShowForm) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          <div className={cn("py-10 flex flex-col items-center gap-3 text-white", isActuallyActive ? "bg-emerald-600" : "bg-amber-500")}>
            {isActuallyActive ? <CheckCircle2 className="h-16 w-16" /> : <Clock className="h-16 w-16 animate-pulse" />}
            <h2 className="text-2xl font-black font-headline uppercase tracking-widest">
              {isActuallyActive ? "Akses Aktif" : "Menunggu Verifikasi"}
            </h2>
          </div>
          <CardContent className="pt-8 pb-10 space-y-8">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Assalamu'alaikum, <strong>{name}</strong>. {isActuallyActive
                  ? `Pendaftaran ${fullSalutation} untuk ${circle?.title} sudah tuntas. Jazakillah khair!`
                  : `Pendaftaran ${fullSalutation} untuk ${circle?.title} sedang dalam antrean verifikasi manual.`}
              </p>
              
              <div className="relative pt-4 pb-8 px-2">
                <div className="absolute top-7 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                <div 
                  className="absolute top-7 left-0 h-0.5 bg-emerald-500 transition-all duration-1000 -z-10" 
                  style={{ width: isActuallyActive ? '100%' : '66%' }}
                />
                
                <div className="flex justify-between items-start">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-white shadow-sm">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-[8px] font-black uppercase text-emerald-600">Terdaftar</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-white shadow-sm">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-[8px] font-black uppercase text-emerald-600">Bukti Diterima</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-all animate-pulse",
                      isActuallyActive ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    )}>
                      {isActuallyActive ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </div>
                    <span className={cn("text-[8px] font-black uppercase", isActuallyActive ? "text-emerald-600" : "text-amber-600")}>
                      {isActuallyActive ? "Verified" : "Verifikasi"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm",
                      isActuallyActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                    )}>
                      <Zap className="w-3 h-3" />
                    </div>
                    <span className={cn("text-[8px] font-black uppercase", isActuallyActive ? "text-emerald-600" : "text-slate-400")}>Aktif</span>
                  </div>
                </div>
              </div>

              {isActuallyPending && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#800000]/5 rounded-xl border border-[#800000]/10 flex gap-3 text-left">
                     <Zap className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                     <p className="text-[10px] font-bold text-[#800000] leading-normal italic">
                        🎁 BONUS AKSES INSTAN: Sambil menunggu verifikasi manual musyrifah, {fullSalutation} sudah bisa mulai belajar sekarang selama 24 jam ke depan. Selamat menghafal!
                     </p>
                  </div>
                  {(!existingReg?.proof_file_name || Number(existingReg.amount) === 0) && (
                    <Button 
                      onClick={() => setForceShowForm(true)} 
                      variant="outline" 
                      className="w-full border-amber-500 text-amber-700 font-black h-12 rounded-xl text-xs gap-2"
                    >
                      <Upload className="w-4 h-4" /> LANJUTKAN UNGGAH BUKTI
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Button asChild className={cn("w-full font-black h-14 rounded-xl text-lg shadow-lg", isActuallyActive ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#800000]")}>
              <Link href={isActuallyActive ? 
                (halaqahId === 'tikrar-j30-b1' || selectedHalaqahId === 'tikrar-premium' ? '/tikrar' : 
                 (selectedHalaqahId === 'mufradat-premium' || isMufradat ? '/mufradat' : '/')) 
                : (isActuallyPending ? '/mufradat' : "/")}>
                {isActuallyActive ? <><PlayCircle className="mr-2 w-6 h-6" /> MASUK KELAS</> : (isActuallyPending ? "MULAI BELAJAR SEKARANG" : "KEMBALI KE DASBOR")}
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
            <div className="space-y-4 px-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Jazakallahu Khairan, pendaftaran {fullSalutation} sedang kami proses. <br/>
                <span className="text-[#800000] font-black italic">🎁 {fullSalutation} sudah bisa mulai belajar sekarang sambil menunggu verifikasi manual kami.</span>
              </p>

              {(isMufradat || selectedHalaqahId === 'mufradat-premium') && (
                <div className="p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 space-y-4 animate-in zoom-in duration-500">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-black text-[9px] px-3 py-1 uppercase tracking-widest">Gabung Grup Monitoring</Badge>
                    <h3 className="text-lg font-black text-emerald-900 leading-tight">{defaultGroup?.name || "Grup Hi Mufradat"}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button asChild className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black h-12 rounded-xl shadow-lg shadow-emerald-500/20 gap-2">
                      <a href={defaultGroup?.whatsapp_link || "https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq"} target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4" /> GABUNG GRUP WHATSAPP
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full border-emerald-600 text-emerald-700 font-black h-12 rounded-xl gap-2">
                      <a href="https://hi-aqli.com/panduan/mufradat" target="_blank" rel="noopener noreferrer">
                        <BookOpen className="w-4 h-4" /> PANDUAN PENGGUNAAN
                      </a>
                    </Button>
                  </div>
                  <p className="text-[10px] text-emerald-700/60 font-medium italic leading-tight">
                    *Silakan bergabung ke grup & baca panduan untuk mulai belajar.
                  </p>
                </div>
              )}

              {(isTikrar || selectedHalaqahId === 'tikrar-premium') && (
                <div className="p-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100 space-y-4 animate-in zoom-in duration-500">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-blue-600 text-white font-black text-[9px] px-3 py-1 uppercase tracking-widest">Komunitas Tikrar</Badge>
                    <h3 className="text-lg font-black text-blue-900 leading-tight">Hi Tikrar</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button asChild className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black h-12 rounded-xl shadow-lg shadow-blue-500/20 gap-2">
                      <a href="https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq" target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4" /> GABUNG GRUP WHATSAPP
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full border-blue-600 text-blue-700 font-black h-12 rounded-xl gap-2">
                      <a href="https://hi-aqli.com/panduan/tikrar" target="_blank" rel="noopener noreferrer">
                        <BookOpen className="w-4 h-4" /> PANDUAN METODE TIKRAR
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {(isNgaji || selectedHalaqahId === 'hi-ngaji') && (
                <div className="p-6 bg-purple-50 rounded-[2rem] border-2 border-purple-100 space-y-4 animate-in zoom-in duration-500">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-purple-600 text-white font-black text-[9px] px-3 py-1 uppercase tracking-widest">Kelas Hi Ngaji</Badge>
                    <h3 className="text-lg font-black text-purple-900 leading-tight">Tahsin & Tajwid</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button asChild className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black h-12 rounded-xl shadow-lg shadow-purple-500/20 gap-2">
                      <a href="https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq" target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4" /> GABUNG GRUP WHATSAPP
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full border-purple-600 text-purple-700 font-black h-12 rounded-xl gap-2">
                      <a href="https://hi-aqli.com/panduan/ngaji" target="_blank" rel="noopener noreferrer">
                        <BookOpen className="w-4 h-4" /> PANDUAN BELAJAR
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-14 rounded-xl shadow-lg">
              <Link href={isMufradat || selectedHalaqahId === 'mufradat-premium' ? "/mufradat" : (isTikrar || selectedHalaqahId === 'tikrar-premium' ? "/tikrar" : "/")}>
                MULAI SEKARANG
              </Link>
            </Button>
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
            {circle?.title || (isMufradat ? 'Hi Mufradat' : (isTikrar ? 'Hi Tikrar' : (isNgaji ? 'Hi Ngaji' : (programDisplayName || 'Pendaftaran')))) || (selectedHalaqahId ? 'Program Terpilih' : 'Silakan Pilih Program')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-10">
          {step === 1 ? (
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-[#800000] tracking-widest">Pilih Program</Label>
                <Select value={selectedHalaqahId || ""} onValueChange={setSelectedHalaqahId}>
                  <SelectTrigger className="h-14 border-2 font-black text-sm">
                    <SelectValue placeholder={programDisplayName ? `-- Pilih Kelas ${programDisplayName} --` : "-- Pilih Program Halaqah --"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(programParam ? filteredHalaqahs : (allHalaqahs || [])).map(h => (
                      <SelectItem key={h.id} value={h.id} className="font-bold py-3 text-xs">
                        {h.title} {h.is_premium ? '(Premium)' : '(Gratis)'}
                      </SelectItem>
                    ))}
                    {(!programParam && !allHalaqahs?.length) && (
                      <>
                        <SelectItem value="mufradat-premium" className="font-bold">Hi Mufradat</SelectItem>
                        <SelectItem value="tikrar-premium" className="font-bold">Hi Tikrar</SelectItem>
                      </>
                    )}
                    {(programParam && filteredHalaqahs?.length === 0) && (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">
                        Belum ada kelas {programParam === 'hi_ngaji' ? 'Hi Ngaji' : programParam.replace('_', ' ')} yang tersedia saat ini.
                      </div>
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
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="08123456xxxx atau 628123456xxxx"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="pl-10 h-12 border-2 focus-visible:ring-[#800000] font-bold"
                    />
                  </div>
                  {whatsapp && (
                    whatsappErrorMessage(whatsapp) ? (
                      <p className="text-[11px] text-red-600 font-bold">⚠ {whatsappErrorMessage(whatsapp)}</p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-bold">✓ Akan disimpan sebagai: {normalizeWhatsapp(whatsapp)}</p>
                    )
                  )}
                </div>
              </div>

              {/* Referral Code Section */}
              <div className={cn(
                "p-6 rounded-3xl border-2 transition-all duration-500",
                appliedReferral 
                  ? "bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-500/10" 
                  : "bg-amber-50/30 border-amber-200 border-dashed"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl transition-colors",
                      appliedReferral ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                    )}>
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-[12px] uppercase tracking-widest text-slate-800">Hadiah Referral</h4>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Gunakan kode teman & dapatkan diskon Rp 5.000</p>
                    </div>
                  </div>
                  {appliedReferral && (
                    <Badge className="bg-emerald-500 text-white border-none animate-pulse">BERHASIL DIPASANG</Badge>
                  )}
                </div>
                
                {appliedReferral ? (
                  <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100 flex items-center justify-between shadow-sm animate-in zoom-in">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-current" /> Potongan Langsung Aktif
                      </span>
                      <span className="text-lg font-black text-[#800000] tracking-wider">{appliedReferral.referral_code}</span>
                      <p className="text-[10px] font-bold text-slate-400 capitalize">Oleh: {appliedReferral.username || "Sahabat AQLI"}</p>
                    </div>
                    {/* Only show Hapus button if NOT a persistent referral from profile or forced link */}
                    {!(userData?.referred_by_id) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-500 hover:bg-rose-50 font-black text-[10px]" 
                        onClick={() => {
                          setAppliedReferral(null); 
                          setReferralCodeInput("");
                          toast({ description: "Kode referral dihapus." });
                        }}
                      >
                        GANTI KODE
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          placeholder="MASUKKAN KODE (CONTOH: AQLI-DEWI01)" 
                          value={referralCodeInput}
                          onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                          className="h-14 border-2 rounded-2xl font-black uppercase text-sm placeholder:text-slate-300 focus-visible:ring-amber-500 bg-white"
                        />
                        {isValidatingReferral && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={handleValidateReferral}
                        disabled={isValidatingReferral || !referralCodeInput.trim()}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 h-14 rounded-2xl shadow-lg shadow-amber-500/20 uppercase text-xs"
                      >
                        CEK KODE
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 px-1">
                       <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-amber-800 font-bold leading-tight italic">
                         "Kehilangan link referral? Jangan khawatir {callSign}, silakan ketik manual kode referral teman {fullSalutation} di atas untuk tetap mendapatkan potongan infaq. (Khusus Pendaftar Baru)"
                       </p>
                    </div>
                  </div>
                )}
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
                            *Hubungi admin untuk mendapatkan kode voucher atau aktivasi manual.
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
                          <SelectItem value="1-halaman">1 Halaman (Min. Target)</SelectItem>
                          <SelectItem value="2-halaman">2 Halaman (Sangat Baik)</SelectItem>
                          <SelectItem value="3-halaman">3 Halaman (Mumtaz)</SelectItem>
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
                    
                    {circle?.payment_type === 'selectable' ? (
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
                    ) : (
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
                    )}
                    
                    <p className="text-[10px] text-muted-foreground font-bold italic flex flex-col gap-1">
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" /> Minimal infaq: Rp {minInfaq.toLocaleString('id-ID')} {circle?.payment_type === 'selectable' && "(Pilihan Terbuka)"}
                      </span>
                      <span className="text-[9px] text-[#800000] opacity-70">Hi AQLI membutuhkan dana operasional untuk terus menyediakan layanan ini. Syukran atas dukungan {fullSalutation} tepat waktu.</span>
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
                            *Hubungi admin untuk mendapatkan kode voucher atau aktivasi manual.
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
                    <div className="space-y-4 text-[11px] text-emerald-900 leading-relaxed font-medium">
                      <div className="p-3 bg-white/50 rounded-xl border border-emerald-100">
                        <p className="font-black text-[#800000] uppercase text-[9px] mb-1">Masa Belajar & Aktivasi:</p>
                        <p>Halaqah dimulai kapan saja. Masa aktif akses & monitoring berlaku selama **30 hari** terhitung sejak tanggal pendaftaran {fullSalutation} diverifikasi (aktif).</p>
                      </div>
                      
                      <p>Dengan mendaftar Hi Mufradat, saya berjanji untuk:</p>
                      <ul className="list-disc pl-4 space-y-2">
                        <li><strong>Disiplin & Istiqomah</strong>: Mengikuti target hafalan sesuai pilihan (min. 1 halaman/pekan).</li>
                        <li><strong>Laporan Harian</strong>: Berkomitmen mengirimkan laporan pencapaian harian (Daily Progress) di dalam group WhatsApp.</li>
                        <li><strong>Terbuka (Japri Admin)</strong>: Bersedia dihubungi secara pribadi (japri) oleh Admin/Musyrifah untuk reminder pekanan jika target belum tercapai.</li>
                        <li><strong>Interaksi Positif</strong>: Bersedia menerima motivasi serta interaksi dari thalibah lain di dalam group terkait pencapaian bersama.</li>
                        <li><strong>Konsekuensi</strong>: Jika dalam 2 pekan berturut-turut tidak ada progres tanpa udzur syar'i, saya bersedia menerima teguran demi menjaga ritme belajar thalibah lain.</li>
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
                        Saya mengerti & setuju dengan **Akad Komitmen** di atas (Ittafaqna).
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* General Payment Section (Hi Ngaji / Other Premium) */}
              {isPremiumProgram && !isTikrar && !isMufradat && (
                <div className="space-y-6 animate-in slide-in-from-top-4 pb-4">
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
                    <div className="p-5 bg-amber-50/50 rounded-2xl border-2 border-dashed border-amber-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Biaya Investasi</span>
                        <p className="text-2xl font-black text-[#800000]">Rp {infaqAmount.toLocaleString('id-ID')}</p>
                      </div>
                      <Badge variant="outline" className="bg-white border-[#800000]/20 text-[#800000] font-black text-[10px]">PROGRAM PREMIUM</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Hi Ngaji Akad Section */}
              {isNgaji && (
                <div className="p-6 bg-purple-50/50 rounded-2xl border-2 border-purple-200/50 space-y-4 animate-in fade-in zoom-in">
                  <div className="flex items-center gap-2 text-[#800000]">
                    <ShieldCheck className="w-5 h-5" />
                    <h4 className="font-black text-sm uppercase tracking-widest text-[#800000]">Akad Belajar Hi Ngaji</h4>
                  </div>
                  <div className="space-y-3 text-[11px] text-purple-900 leading-relaxed font-medium">
                    <p>Dengan mendaftar Hi Ngaji, saya berkomitmen untuk:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Serius</strong>: Mengikuti kelas dengan tertib dan disiplin sesuai jadwal yang telah ditentukan.</li>
                      <li><strong>Aktif</strong>: Berpartisipasi dalam setiap sesi pembelajaran dan mengerjakan tugas yang diberikan muallimah.</li>
                      <li><strong>Sopan</strong>: Memuliakan Al-Qur'an dengan cara membacanya sesuai adab dan kaidah tajwid yang benar.</li>
                      <li><strong>Ikhlas</strong>: Niat semata-mata karena Allah untuk memperbaiki bacaan Al-Qur'an.</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-3 pt-2">
                     <div
                      onClick={() => setAkadAccepted(!akadAccepted)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5",
                        akadAccepted ? "bg-[#800000] border-[#800000]" : "bg-white border-purple-300"
                      )}
                    >
                      {akadAccepted && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <Label className="text-[10px] font-bold text-purple-900 leading-tight cursor-pointer" onClick={() => setAkadAccepted(!akadAccepted)}>
                      Saya setuju dengan Akad & Komitmen Hi Ngaji di atas.
                    </Label>
                  </div>
                </div>
              )}

              <Button onClick={handleNext} className="w-full h-16 text-lg font-black bg-[#800000] hover:bg-[#800000]/90 rounded-xl shadow-lg shadow-[#800000]/20 mt-4 uppercase tracking-widest">
                {isPremiumProgram ? "Lanjut Pembayaran" : "Konfirmasi Daftar"} <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          ) : step === 2 ? (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              {/* Rincian Pembayaran */}
              <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 space-y-4">
                <h3 className="text-sm font-black text-[#800000] uppercase tracking-widest border-b pb-3 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Rincian Pembayaran
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Infaq Bulanan</span>
                    <span className="font-black text-slate-700">Rp {infaqAmount.toLocaleString('id-ID')}</span>
                  </div>
                  
                  {registrationFee > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Biaya Registrasi</span>
                        <span className="text-[9px] text-amber-600 font-black italic">*(Sekali Seumur Hidup - Pendaftaran ke-1)</span>
                      </div>
                      <span className="font-black text-slate-700">Rp {registrationFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {referralDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-emerald-600 font-bold uppercase text-[10px] tracking-wider">Diskon Referral ({appliedReferral?.referral_code})</span>
                      <span className="font-black text-emerald-600">-Rp {referralDiscount.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/50">
                    <div className="flex flex-col">
                      <span className="text-[#800000] font-black uppercase text-[10px] tracking-widest">Kode Unik</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">*Infaq Hi Berbagi</span>
                    </div>
                    <span className="font-black text-[#800000] text-lg">+{uniqueCode}</span>
                  </div>
                </div>

                <div className="bg-amber-100/50 p-4 rounded-2xl border border-amber-200/50 mt-4 flex gap-3">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed italic">
                    Syukran {callSign}. Nominal kode unik & kelebihan transfer {fullSalutation} akan dialokasikan sebagai infaq jariyah melalui <span className="underline font-black">Hi Berbagi</span>. Semoga menjadi asbab keberkahan hafalan {fullSalutation}.
                  </p>
                </div>
              </div>

              <div className="bg-[#800000]/10 p-8 rounded-3xl border-2 border-[#800000]/20 text-center space-y-3 shadow-inner">
                <span className="text-[10px] font-black text-[#800000] uppercase tracking-widest opacity-60">Total yang harus ditransfer</span>
                <div className="flex flex-col gap-1 items-center">
                   <h2 className="text-4xl font-black text-[#800000] tracking-tighter">
                     Rp {totalCalculated.toLocaleString('id-ID')}
                   </h2>
                   <div className="flex items-center gap-1.5 bg-[#800000] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                     <Zap className="w-3 h-3 fill-current" /> Transfer Tepat Nominal
                   </div>
                </div>
              </div>

              <div className="bg-[#800000]/5 p-6 rounded-2xl border-2 border-[#800000]/10 space-y-4">
                <p className="text-xs font-black text-[#800000] uppercase tracking-widest">Rekening Tujuan (BSI)</p>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2 shadow-sm">
                  <span className="font-mono font-black text-xl tracking-wider">7209432468</span>
                  <Button variant="ghost" size="sm" className="font-black text-[#800000] hover:bg-[#800000]/10" onClick={() => { navigator.clipboard.writeText("7209432468"); toast({ description: "Nomor rekening disalin" }) }}>SALIN</Button>
                </div>
                <p className="text-[10px] font-bold text-center text-muted-foreground">a.n. Dewi Febriani</p>
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
                  <p className="text-sm font-bold text-emerald-800 leading-relaxed">Masyallah! Kelas ini terbuka secara gratis untuk {fullSalutation}. Tekan tombol di bawah untuk aktivasi antrean verifikasi.</p>
                </div>
              )}
              <Button onClick={handleConfirm} disabled={loading} className="w-full h-16 bg-[#800000] hover:bg-[#800000]/90 font-black rounded-xl text-lg uppercase tracking-widest shadow-2xl">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Kirim Pendaftaran"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Official Admin Contact Info */}
      <div className="max-w-xl mx-auto mt-8 p-6 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-[#800000]/20 text-center space-y-3">
        <p className="text-[10px] font-black text-[#800000] uppercase tracking-[0.2em]">Informasi Resmi Hi AQLI</p>
        <div className="flex flex-col items-center gap-2">
          <Link 
            href="https://wa.me/6283132582803" 
            target="_blank"
            className="flex items-center gap-2 bg-[#800000]/5 px-4 py-2 rounded-full hover:bg-[#800000]/10 transition-colors"
          >
            <Phone className="w-4 h-4 text-[#800000]" />
            <span className="text-sm font-black text-[#800000]">0831 3258 2803</span>
            <Badge className="bg-[#800000] text-white border-none text-[8px] h-4">ADMIN UTAMA</Badge>
          </Link>
          <p className="text-[10px] text-muted-foreground font-bold italic">
            "Silakan hubungi nomor di atas untuk konfirmasi manual atau pertanyaan seputar program."
          </p>
        </div>
      </div>
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
