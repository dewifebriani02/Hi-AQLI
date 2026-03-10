
'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Check
} from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank (BSI)', icon: Landmark, detail: 'Bank Syariah Indonesia - 7123456789 a.n. Sahabat AQLI' },
  { id: 'qris', label: 'QRIS / E-Wallet', icon: QrCode, detail: 'Pindai otomatis via Dana, OVO, Gopay' },
];

const levels = [
  { id: "1", name: "Intensif (1 Hal / Pekan)", price: 100000 },
  { id: "2", name: "Reguler (1 Hal / 2 Pekan)", price: 75000 },
  { id: "3", name: "Santai (1 Hal / 3 Pekan)", price: 50000 },
  { id: "4", name: "Pemula (1 Hal / Bulan)", price: 50000 },
];

export default function TikrarRegistrationPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if user is already registered to prevent double registration
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Confirm
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

  // Dynamic Price based on level
  const getBasePrice = (levelId: string) => {
    const selectedLevel = levels.find(l => l.id === levelId);
    return selectedLevel ? selectedLevel.price : 50000;
  };

  const PRICE = getBasePrice(level);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/study-circles/tikrar-registration');
      return;
    }
    
    // Redirect if already registered/paid
    if (!isUserDataLoading && userData?.isTikrarPaid) {
      toast({
        title: "Sudah Terdaftar",
        description: "Anda sudah memiliki akses aktif ke program Tikrar Daily.",
      });
      router.push('/tajweed');
    }

    if (user && !name) {
      setName(user.displayName || "");
    }
  }, [user, isUserLoading, router, name, userData, isUserDataLoading, toast]);

  useEffect(() => {
    if (step === 2) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [step]);

  const handleNext = () => {
    if (step === 1) {
      if (!whatsapp || whatsapp.length < 10) {
        toast({ variant: "destructive", title: "Nomor WhatsApp tidak valid" });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
      toast({ title: "Bukti terpilih", description: e.target.files[0].name });
    }
  };

  const handleConfirm = async () => {
    if (!senderName) {
      toast({ variant: "destructive", title: "Nama pengirim wajib diisi" });
      return;
    }
    if (!proofFile) {
      toast({ variant: "destructive", title: "Bukti transfer wajib diunggah" });
      return;
    }

    setLoading(true);
    try {
      const finalAmount = PRICE + uniqueCode;
      
      await addDoc(collection(db, "tikrar_registrations"), {
        userId: user?.uid,
        userName: name,
        userEmail: user?.email,
        whatsapp: whatsapp,
        batchName: "BATCH 1",
        level: parseInt(level),
        targetJuz: parseInt(targetJuz),
        amount: finalAmount,
        paymentMethod: method,
        senderName: senderName,
        proofFileName: proofFile.name,
        status: "pending_verification",
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast({
        title: "Pendaftaran Dikirim",
        description: "Mohon tunggu 1x24 jam untuk verifikasi akses counter.",
      });
    } catch (error) {
      console.error("Reg Error:", error);
      toast({ variant: "destructive", title: "Gagal memproses pendaftaran" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Berhasil disalin." });
  };

  if (isUserLoading || isUserDataLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#800000]" /></div>;

  if (submitted) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto bg-green-100 text-green-600 rounded-full p-4 w-fit animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-headline text-[#800000]">Pendaftaran Diterima!</h2>
              <p className="text-muted-foreground text-sm">
                Terima kasih, <strong>{name}</strong>. Tim kami sedang memverifikasi pembayaran Anda untuk <strong>Juz {targetJuz}</strong>. Akses counter akan terbuka otomatis segera setelah verifikasi selesai.
              </p>
            </div>
            <Button onClick={() => router.push('/')} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-6 px-4 pb-20 max-w-2xl mx-auto">
      <Card className="w-full border-none shadow-xl overflow-hidden">
        <CardHeader className="text-center bg-[#800000] text-white py-8 relative">
          {step > 1 && (
            <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-white hover:bg-white/10" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="mx-auto bg-white/20 rounded-full p-3 w-fit mb-4">
            <Zap className="h-8 w-8 text-amber-300 fill-current" />
          </div>
          <CardTitle className="font-headline text-2xl">Tikrar Daily Registration</CardTitle>
          <CardDescription className="text-white/80">Program Itqan Hafalan Bersama Sahabat AQLI</CardDescription>
        </CardHeader>
        
        <div className="flex border-b">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn(
              "flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-widest border-b-4 transition-all",
              step === s ? "border-[#800000] text-[#800000]" : "border-muted text-muted-foreground opacity-50"
            )}>
              Langkah {s}
            </div>
          ))}
        </div>

        <CardContent className="space-y-8 pt-8">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> PAKET PREMIUM</h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Infaq pendaftaran sudah termasuk akses counter hafalan Juz pilihan, bimbingan berkala, dan sertifikat ujian.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wa">Nomor WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="wa" placeholder="0812..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="pl-10" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pilih Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} - Rp {l.price.toLocaleString('id-ID')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Juz</Label>
                    <Select value={targetJuz} onValueChange={setTargetJuz}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Juz" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 30}, (_, i) => (
                          <SelectItem key={i+1} value={(i+1).toString()}>Juz {i+1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6">
              <div className="text-center space-y-2 bg-muted/30 p-6 rounded-2xl border-2 border-dashed border-[#800000]/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Infaq Pendaftaran</p>
                <div className="text-3xl font-black text-[#800000] flex items-center justify-center gap-2">
                  Rp {(PRICE + uniqueCode).toLocaleString('id-ID')}
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard((PRICE + uniqueCode).toString())}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-amber-700 font-bold italic">*Termasuk kode unik verifikasi {uniqueCode}</p>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Pilih Metode Pembayaran</Label>
                {paymentMethods.map((pm) => (
                  <div 
                    key={pm.id}
                    onClick={() => setMethod(pm.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      method === pm.id ? "border-[#800000] bg-[#800000]/5 shadow-sm" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", method === pm.id ? "bg-[#800000] text-white" : "bg-muted text-muted-foreground")}>
                      <pm.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-bold", method === pm.id ? "text-[#800000]" : "text-foreground")}>{pm.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{pm.detail}</p>
                    </div>
                    {method === pm.id && <CheckCircle2 className="h-5 w-5 text-[#800000]" />}
                  </div>
                ))}
              </div>

              {method === 'transfer' ? (
                <div className="bg-[#800000]/5 p-4 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-[#800000] uppercase">Rekening Tujuan</p>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                    <span className="font-mono font-bold text-lg">7123456789</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard("7123456789")} className="text-[#800000]">Salin</Button>
                  </div>
                  <p className="text-[10px] font-medium text-center">a.n. Yayasan Sahabat AQLI (Bank BSI)</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-40 h-40 bg-white p-2 border-2 border-[#800000]/10 rounded-xl relative">
                    <Image src="https://placehold.co/400x400/png?text=QRIS+AQLI" alt="QRIS" width={160} height={160} className="rounded-lg" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Silakan scan QRIS di atas untuk pembayaran instan.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sender">Nama Pengirim Sesuai Rekening</Label>
                <Input 
                  id="sender" 
                  placeholder="Contoh: Abdullah Mansur" 
                  value={senderName} 
                  onChange={(e) => setSenderName(e.target.value)} 
                  className="h-12 border-2 focus-visible:ring-[#800000]"
                />
              </div>

              <div className="space-y-2">
                <Label>Unggah Bukti Transfer</Label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                    proofFile ? "bg-emerald-50 border-emerald-500" : "bg-muted/20 border-muted hover:bg-muted/40"
                  )}
                >
                  {proofFile ? (
                    <>
                      <Check className="h-8 w-8 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">{proofFile.name}</span>
                      <span className="text-[10px] text-emerald-600 uppercase font-bold">Ketuk untuk ganti</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">Pilih Foto Bukti</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[11px] text-emerald-800 leading-relaxed italic">
                  "Barangsiapa yang menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju surga." (HR. Muslim)
                </p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-6 pt-0">
          {step < 3 ? (
            <Button onClick={handleNext} className="w-full h-14 text-lg font-bold bg-[#800000] hover:bg-[#800000]/90 shadow-lg">
              Lanjut ke Langkah {step + 1} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={loading} className="w-full h-14 text-lg font-bold bg-[#800000] hover:bg-[#800000]/90 shadow-lg">
              {loading ? <><Loader2 className="mr-2 animate-spin" /> Mengirim...</> : "Konfirmasi Pendaftaran"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
