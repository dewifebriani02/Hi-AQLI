
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
  PlayCircle
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

  // Check for ANY existing registration for this halaqah to prevent duplicates
  const regOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'halaqah_id', operator: '==', value: selectedHalaqahId },
      { column: 'status', operator: 'in', value: ["active", "pending_verification"] }
    ]
  }), [user?.id, selectedHalaqahId]);

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
  const [durationMonths, setDurationMonths] = useState("1");
  const [mufradatTarget, setMufradatTarget] = useState("page"); // 'page' or 'juz'
  const [infaqAmount, setInfaqAmount] = useState<number>(0);
  const [akadAccepted, setAkadAccepted] = useState(false);

  // Program Detection
  const isMufradat = (circle?.program_type === 'hi_mufradat' || selectedHalaqahId === 'mufradat-premium') && (selectedHalaqahId !== 'tikrar-premium' && selectedHalaqahId !== 'tikrar-j30-b1');
  const isTikrar = circle?.program_type === 'tikrar_daily' || selectedHalaqahId === 'tikrar-premium' || selectedHalaqahId === 'tikrar-j30-b1';

  const isPremiumProgram = useMemo(() => {
    return circle?.is_premium === true || isMufradat || isTikrar;
  }, [circle?.is_premium, isMufradat, isTikrar]);

  // Minimum Infaq Calculation
  const minInfaq = useMemo(() => {
    if (isMufradat) {
      const rate = mufradatTarget === 'page' ? 20000 : 50000;
      return rate * parseInt(durationMonths);
    }
    if (isTikrar) {
      return levels.find(l => l.id === level)?.price || 50000;
    }
    return circle?.base_price || 0;
  }, [isMufradat, isTikrar, mufradatTarget, durationMonths, level, circle?.base_price]);

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
    if (step === 2 && isPremiumProgram) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [step, isPremiumProgram]);

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
    if (isPremiumProgram && infaqAmount < minInfaq) {
      toast({ variant: "destructive", title: `Minimal infaq untuk target ini adalah Rp ${minInfaq.toLocaleString('id-ID')}` });
      return;
    }
    if (isPremiumProgram) setStep(2);
    else setStep(3);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
      toast({ title: "Bukti terpilih", description: e.target.files[0].name });
    }
  };

  const handleConfirm = async () => {
    if (isPremiumProgram && (!senderName || !proofFile)) {
      toast({ variant: "destructive", title: "Lengkapi data pembayaran" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("halaqah_registrations").insert({
        user_id: user?.id,
        user_name: name,
        user_email: user?.email,
        whatsapp: whatsapp,
        halaqah_id: selectedHalaqahId,
        halaqah_title: circle?.title || (isMufradat ? 'Hi Mufradat' : 'Halaqah'),
        is_paid: isPremiumProgram,
        level: isTikrar ? parseInt(level) : null,
        target_juz: isTikrar ? parseInt(targetJuz) : null,
        amount: isPremiumProgram ? infaqAmount + uniqueCode : 0,
        payment_method: isPremiumProgram ? "transfer" : "free",
        sender_name: isPremiumProgram ? senderName : null,
        proof_file_name: proofFile?.name || null,
        status: "pending_verification",
        created_at: new Date().toISOString(),
        // Extra metadata for Hi Mufradat
        metadata: isMufradat ? {
          months: parseInt(durationMonths),
          target: mufradatTarget,
          akadAccepted: true,
          unitPrice: mufradatTarget === 'page' ? 20000 : 50000,
          infaqBase: infaqAmount
        } : null
      });

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Pendaftaran Dikirim" });
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal mengirim pendaftaran" });
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
                      <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Pilihan Target</Label>
                      <Select value={mufradatTarget} onValueChange={setMufradatTarget}>
                        <SelectTrigger className="h-12 border-2 font-bold bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="page">Min. 1 Halaman / Pekan (Rp 20rb)</SelectItem>
                          <SelectItem value="juz">Min. 1 Juz / Bulan (Rp 50rb)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-[#800000]">Durasi Belajar</Label>
                      <Select value={durationMonths} onValueChange={setDurationMonths}>
                        <SelectTrigger className="h-12 border-2 font-bold bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Bulan</SelectItem>
                          <SelectItem value="3">3 Bulan</SelectItem>
                          <SelectItem value="6">6 Bulan</SelectItem>
                          <SelectItem value="12">12 Bulan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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
                    <p className="text-[10px] text-muted-foreground font-bold italic flex items-center gap-1">
                      <Info className="w-3 h-3" /> Minimal infaq: Rp {minInfaq.toLocaleString('id-ID')}
                    </p>
                  </div>

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
              {isPremiumProgram ? (
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
