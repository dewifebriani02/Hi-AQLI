
'use client';

import { useState, useEffect, useRef, Suspense } from "react";
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
  Zap, 
  CheckCircle2, 
  Loader2, 
  Landmark, 
  QrCode, 
  Copy, 
  ArrowLeft, 
  ArrowRight,
  User,
  Phone,
  ShieldCheck,
  Image as ImageIcon,
  Check,
  Clock,
  BookOpen,
  PlayCircle
} from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, query, where, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const studyCircles = [
  { id: "tikrar-j30-b1", title: "Tikrar Daily Juz 30 - Batch 1", isPaid: true, basePrice: 50000 },
  { id: "tafsir-j30", title: "Tafsir Juz' Amma", isPaid: false, basePrice: 0 },
  { id: "tajwid-adv", title: "Tajwid Lanjutan: Sifaat", isPaid: false, basePrice: 0 },
  { id: "sirah-nabi", title: "Sirah Nabi (SAW)", isPaid: false, basePrice: 0 },
];

const levels = [
  { id: "1", name: "Intensif", price: 100000 },
  { id: "2", name: "Reguler", price: 75000 },
  { id: "3", name: "Santai", price: 50000 },
];

function RegistrationForm() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const halaqahId = searchParams.get('id');
  const circle = studyCircles.find(c => c.id === halaqahId) || studyCircles[0];

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);

  // Check for ANY existing registration for this halaqah to prevent duplicates
  const regQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !halaqahId) return null;
    return query(
      collection(db, "halaqah_registrations"),
      where("userId", "==", user.uid),
      where("halaqahId", "==", halaqahId),
      limit(1)
    );
  }, [db, user?.uid, halaqahId]);

  const { data: existingRegs, isLoading: isCheckLoading } = useCollection(regQuery);
  const existingReg = existingRegs?.[0];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [level, setLevel] = useState("3");
  const [targetJuz, setTargetJuz] = useState("30");
  const [method, setMethod] = useState("transfer");
  const [uniqueCode, setUniqueCode] = useState(0);
  const [senderName, setSenderName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const PRICE = circle.id === 'tikrar-j30-b1' ? levels.find(l => l.id === level)?.price || 50000 : 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(`/login?redirect=/study-circles/registration?id=${halaqahId}`);
      return;
    }
    if (user && !name) setName(user.displayName || "");
  }, [user, isUserLoading, router, name, halaqahId]);

  useEffect(() => {
    if (step === 2 && circle.isPaid) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [step, circle.isPaid]);

  const handleNext = () => {
    if (!whatsapp || whatsapp.length < 10) {
      toast({ variant: "destructive", title: "Nomor WhatsApp tidak valid" });
      return;
    }
    if (circle.isPaid) setStep(2);
    else setStep(3); // Skip to step 3 for free courses
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
      toast({ title: "Bukti terpilih", description: e.target.files[0].name });
    }
  };

  const handleConfirm = async () => {
    if (circle.isPaid && (!senderName || !proofFile)) {
      toast({ variant: "destructive", title: "Lengkapi data pembayaran" });
      return;
    }

    setLoading(true);
    try {
      const finalAmount = circle.isPaid ? PRICE + uniqueCode : 0;
      
      await addDoc(collection(db, "halaqah_registrations"), {
        userId: user?.uid,
        userName: name,
        userEmail: user?.email,
        whatsapp: whatsapp,
        halaqahId: circle.id,
        halaqahTitle: circle.title,
        isPaid: circle.isPaid,
        level: circle.id === 'tikrar-j30-b1' ? parseInt(level) : null,
        targetJuz: circle.id === 'tikrar-j30-b1' ? parseInt(targetJuz) : null,
        amount: finalAmount,
        paymentMethod: circle.isPaid ? method : "free",
        senderName: circle.isPaid ? senderName : null,
        proofFileName: proofFile?.name || null,
        status: "pending_verification",
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast({ title: "Pendaftaran Dikirim" });
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal mengirim pendaftaran" });
    } finally {
      setLoading(false);
    }
  };

  if (isCheckLoading) return <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="animate-spin text-[#800000]" /><p className="text-xs font-bold uppercase">Memeriksa Status...</p></div>;

  // If already registered, handle based on status
  if (existingReg) {
    const isActive = existingReg.status === 'active';
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl overflow-hidden">
          <div className={cn("py-8 flex flex-col items-center gap-2 text-white", isActive ? "bg-emerald-600" : "bg-amber-500")}>
            {isActive ? <CheckCircle2 className="h-12 w-12" /> : <Clock className="h-12 w-12 animate-pulse" />}
            <h2 className="text-xl font-bold font-headline uppercase tracking-wider">
              {isActive ? "Pendaftaran Aktif" : "Menunggu Verifikasi"}
            </h2>
          </div>
          <CardContent className="pt-8 pb-10 space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Assalamu'alaikum, <strong>{name}</strong>. {isActive 
                ? `Pendaftaran Anda untuk ${circle.title} sudah aktif. Anda dapat langsung masuk ke kelas sekarang.`
                : `Pendaftaran Anda untuk ${circle.title} sedang kami tinjau. Mohon tunggu maksimal 1x24 jam.`}
            </p>
            <Button asChild className={cn("w-full font-bold h-12", isActive ? "bg-emerald-600" : "bg-[#800000]")}>
              <Link href={isActive ? (circle.id === 'tikrar-j30-b1' ? '/tajweed' : `/study-circles/${circle.id}`) : "/"}>
                {isActive ? <><PlayCircle className="mr-2 w-5 h-5" /> MASUK KELAS SEKARANG</> : "Kembali ke Dasbor"}
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
            <h2 className="text-2xl font-bold font-headline text-[#800000]">Berhasil Dikirim!</h2>
            <p className="text-muted-foreground text-sm">Terima kasih, pendaftaran Anda akan diverifikasi admin maksimal 1x24 jam.</p>
            <Button onClick={() => router.push('/')} className="w-full bg-[#800000] font-bold">Kembali ke Beranda</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-6 px-4 pb-20 max-w-2xl mx-auto">
      <Card className="w-full border-none shadow-xl overflow-hidden">
        <CardHeader className="text-center bg-[#800000] text-white py-8 relative">
          {step > 1 && <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-white" onClick={() => setStep(step - 1)}><ArrowLeft className="h-5 w-5" /></Button>}
          <div className="mx-auto bg-white/20 rounded-full p-3 w-fit mb-4"><BookOpen className="h-8 w-8 text-amber-300" /></div>
          <CardTitle className="font-headline text-2xl">Pendaftaran Halaqah</CardTitle>
          <CardDescription className="text-white/80">{circle.title}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-8">
          {step === 1 ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="0812..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="pl-10" />
                </div>
              </div>
              
              {circle.id === 'tikrar-j30-b1' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pilih Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name} - Rp {l.price.toLocaleString('id-ID')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Juz</Label>
                    <Select value={targetJuz} onValueChange={setTargetJuz}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 30}, (_, i) => <SelectItem key={i+1} value={(i+1).toString()}>Juz {i+1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <Button onClick={handleNext} className="w-full h-14 text-lg font-bold bg-[#800000] mt-4">
                {circle.isPaid ? "Lanjut Pembayaran" : "Konfirmasi Pendaftaran"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6">
              <div className="text-center space-y-2 bg-muted/30 p-6 rounded-2xl border-2 border-dashed border-[#800000]/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Infaq</p>
                <div className="text-3xl font-black text-[#800000]">Rp {(PRICE + uniqueCode).toLocaleString('id-ID')}</div>
                <p className="text-[10px] text-amber-700 font-bold italic">*Termasuk kode unik verifikasi {uniqueCode}</p>
              </div>
              <div className="bg-[#800000]/5 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-[#800000] uppercase">Rekening BSI</p>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                  <span className="font-mono font-bold text-lg">7123456789</span>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText("7123456789"); toast({description: "Salin"}) }}>Salin</Button>
                </div>
              </div>
              <Button onClick={() => setStep(3)} className="w-full h-14 bg-[#800000] font-bold">Saya Sudah Transfer</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {circle.isPaid ? (
                <>
                  <div className="space-y-2">
                    <Label>Nama Pengirim Sesuai Rekening</Label>
                    <Input placeholder="Contoh: Abdullah" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unggah Bukti Transfer</Label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer", proofFile ? "bg-emerald-50 border-emerald-500" : "bg-muted/20 border-muted")}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      {proofFile ? <><Check className="h-8 w-8 text-emerald-600" /><span className="text-xs font-bold">{proofFile.name}</span></> : <><ImageIcon className="h-8 w-8 text-muted-foreground" /><span className="text-xs font-bold">Pilih Foto Bukti</span></>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-center space-y-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                  <p className="text-sm font-medium text-emerald-800">Kelas ini gratis. Tekan tombol di bawah untuk mendaftarkan diri Anda.</p>
                </div>
              )}
              <Button onClick={handleConfirm} disabled={loading} className="w-full h-14 bg-[#800000] font-bold">
                {loading ? <Loader2 className="animate-spin" /> : "Kirim Pendaftaran"}
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
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>}>
      <RegistrationForm />
    </Suspense>
  );
}
