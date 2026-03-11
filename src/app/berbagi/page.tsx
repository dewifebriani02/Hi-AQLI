
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  HeartHandshake, 
  CheckCircle2, 
  Loader2, 
  Landmark, 
  QrCode, 
  Copy, 
  Calendar, 
  User, 
  ArrowLeft, 
  Image as ImageIcon, 
  ChevronRight,
  Target,
  Users,
  Clock,
  Zap,
  TrendingUp
} from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

const campaigns = [
  {
    id: "wakaf-server-ai",
    title: "Wakaf Server AI HI AQLI",
    description: "Dukung penyediaan infrastruktur GPU untuk asisten tilawah AI yang lebih cepat dan akurat bagi seluruh thalibah.",
    goal: 50000000,
    current: 12450000,
    donors: 142,
    daysLeft: 12,
    image: "https://picsum.photos/seed/server/600/400",
    category: "WAKAF"
  },
  {
    id: "beasiswa-itqan",
    title: "Beasiswa Itqan Thalibah",
    description: "Bantu santriwati kurang mampu untuk mendapatkan akses premium program Tikrar Daily dan bimbingan asatizah.",
    goal: 25000000,
    current: 18750000,
    donors: 89,
    daysLeft: 45,
    image: "https://picsum.photos/seed/learn/600/400",
    category: "BEASISWA"
  },
  {
    id: "dakwah-digital",
    title: "Operasional Dakwah Digital",
    description: "Infaq rutin untuk biaya pemeliharaan sistem, hosting, dan pengembangan fitur baru aplikasi HI AQLI.",
    goal: 15000000,
    current: 5400000,
    donors: 215,
    daysLeft: 0, // Ongoing
    image: "https://picsum.photos/seed/tech/600/400",
    category: "INFAQ"
  }
];

const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank (BSI)', icon: Landmark, detail: 'Bank Syariah Indonesia - 7123456789 a.n. HI AQLI' },
  { id: 'qris', label: 'QRIS / E-Wallet', icon: QrCode, detail: 'Pindai otomatis via Dana, OVO, Gopay' },
];

export default function BerbagiPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1); // 1: List, 2: Amount, 3: Payment
  const [selectedCampaign, setSelectedCampaign] = useState<typeof campaigns[0] | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("transfer");
  const [uniqueCode, setUniqueCode] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [senderName, setSenderName] = useState("");
  const [transferDate, setTransferDate] = useState("");

  const donationAmounts = [25000, 50000, 100000, 250000];

  useEffect(() => {
    if (step === 3) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [step]);

  const handleCampaignSelect = (campaign: typeof campaigns[0]) => {
    setSelectedCampaign(campaign);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(0);
  };

  const goToPayment = () => {
    const baseAmount = amount || parseInt(customAmount);
    if (!baseAmount || baseAmount < 10000) {
      toast({ variant: "destructive", title: "Minimal donasi Rp 10.000." });
      return;
    }
    setStep(3);
  };

  const handleConfirmDonation = async () => {
    if (!senderName) {
      toast({ variant: "destructive", title: "Mohon isi nama pengirim." });
      return;
    }

    setLoading(true);
    try {
      const baseAmount = amount || parseInt(customAmount);
      const finalAmount = baseAmount + uniqueCode;

      addDocumentNonBlocking(collection(db, "donations"), {
        userId: user?.uid || null,
        campaignId: selectedCampaign?.id,
        campaignTitle: selectedCampaign?.title,
        amount: finalAmount,
        baseAmount: baseAmount,
        uniqueCode: uniqueCode,
        paymentMethod: method,
        senderName: senderName,
        status: "pending_verification",
        createdAt: serverTimestamp(),
        donationDate: serverTimestamp(),
      });

      setSubmitted(true);
      toast({ title: "Konfirmasi Terkirim", description: "Jazakallahu Khairan!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Terjadi kesalahan." });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Teks disalin." });
  };

  if (submitted) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl overflow-hidden">
          <div className="bg-[#800000] py-12 flex flex-col items-center gap-4 text-white">
            <CheckCircle2 className="h-20 w-20 text-[#D4AF37] animate-bounce" />
            <h2 className="text-3xl font-black font-headline uppercase tracking-widest">Jazakallahu Khairan!</h2>
          </div>
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Terima kasih, <strong>{senderName}</strong>. Donasi Anda untuk <strong>{selectedCampaign?.title}</strong> sedang dalam proses verifikasi.
              </p>
              <p className="text-xs italic bg-muted p-4 rounded-xl">"Harta tidak akan berkurang karena sedekah." (HR. Muslim)</p>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full bg-[#800000] text-white hover:bg-[#800000]/90 font-black h-14 rounded-2xl shadow-xl">
              KEMBALI KE BERANDA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-32">
      {/* HEADER */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <HeartHandshake className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">Hi Berbagi • Infaq Digital</span>
        </div>
        <h1 className="text-3xl font-black font-headline tracking-tight uppercase text-[#800000]">Jembatan Kebaikan</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Salurkan infaq dan wakaf terbaik Anda untuk mendukung keberlangsungan infrastruktur AI penghafal Qur'an.
        </p>
      </div>

      {/* STEP 1: CAMPAIGN LIST */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
          {campaigns.map((camp) => {
            const progress = (camp.current / camp.goal) * 100;
            return (
              <Card key={camp.id} className="overflow-hidden border-none shadow-lg bg-white flex flex-col group hover:scale-[1.02] transition-transform">
                <div className="relative h-48 w-full">
                  <Image src={camp.image} alt={camp.title} fill className="object-cover" data-ai-hint="charity campaign" />
                  <Badge className="absolute top-3 left-3 bg-[#800000] text-white font-black text-[9px] px-2 py-0.5 tracking-widest border-none">
                    {camp.category}
                  </Badge>
                </div>
                <CardContent className="p-5 flex-1 flex flex-col gap-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-sm uppercase leading-tight text-[#800000] group-hover:underline">{camp.title}</h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{camp.description}</p>
                  </div>
                  
                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Terkumpul</span>
                        <span className="text-sm font-black text-[#800000]">Rp {camp.current.toLocaleString('id-ID')}</span>
                      </div>
                      <span className="text-[10px] font-black text-[#D4AF37]">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-muted [&>div]:bg-[#D4AF37]" />
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                        <Users className="w-3 h-3 text-[#800000]" />
                        <span>{camp.donors} Donatur</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                        <Clock className="w-3 h-3 text-[#800000]" />
                        <span>{camp.daysLeft > 0 ? `${camp.daysLeft} Hari Lagi` : 'Ongoing'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-0 border-t">
                  <Button 
                    onClick={() => handleCampaignSelect(camp)}
                    className="w-full rounded-none h-12 bg-white text-[#800000] hover:bg-[#800000] hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors gap-2"
                  >
                    Donasi Sekarang <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* STEP 2: AMOUNT SELECTION */}
      {step === 2 && selectedCampaign && (
        <div className="max-w-lg mx-auto w-full px-1">
          <Card className="border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-[#800000] text-white relative py-8">
              <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-white" onClick={() => setStep(1)}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="text-center space-y-2">
                <Badge className="bg-[#D4AF37] text-black font-black text-[9px] mx-auto border-none uppercase">{selectedCampaign.category}</Badge>
                <CardTitle className="font-headline text-xl font-black uppercase leading-tight px-8">{selectedCampaign.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pilih Nominal Donasi</Label>
                <div className="grid grid-cols-2 gap-3">
                  {donationAmounts.map((val) => (
                    <Button 
                      key={val} 
                      variant="outline"
                      className={cn(
                        "h-14 text-sm font-black transition-all rounded-xl border-2",
                        amount === val ? "bg-[#800000] border-[#800000] text-white shadow-lg" : "border-[#800000]/5 text-[#800000] hover:border-[#800000]"
                      )}
                      onClick={() => handleAmountSelect(val)}
                    >
                      Rp {val.toLocaleString('id-ID')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-4 text-muted-foreground">Atau Nominal Lain</span></div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#800000] font-black">Rp</span>
                  <Input type="number" placeholder="Contoh: 150000" className="pl-11 h-14 text-lg font-black border-2 border-[#800000]/5 focus-visible:ring-[#800000] rounded-xl" value={customAmount} onChange={handleCustomAmountChange} />
                </div>
                <p className="text-[9px] text-muted-foreground font-bold italic">*Minimal donasi Rp 10.000</p>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metode Pembayaran</Label>
                <div className="flex flex-col gap-2">
                  {paymentMethods.map((pm) => (
                    <div 
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        method === pm.id ? "border-[#800000] bg-[#800000]/5 text-[#800000]" : "border-[#800000]/5 bg-muted/30 hover:border-[#800000]/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <pm.icon className={cn("h-5 w-5", method === pm.id ? "text-[#D4AF37]" : "text-[#800000]")} />
                        <div className="flex flex-col">
                          <span className="font-black text-xs uppercase">{pm.label}</span>
                          <span className={cn("text-[9px] font-medium truncate max-w-[180px]", method === pm.id ? "text-[#800000]/60" : "text-muted-foreground")}>{pm.detail}</span>
                        </div>
                      </div>
                      {method === pm.id && <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button onClick={goToPayment} className="w-full h-16 bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-lg rounded-2xl uppercase tracking-widest shadow-xl">
                Lanjut Donasi <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 3: PAYMENT DETAILS */}
      {step === 3 && selectedCampaign && (
        <div className="max-w-lg mx-auto w-full px-1">
          <Card className="border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-[#800000] text-white relative py-8 text-center">
              <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-white" onClick={() => setStep(2)}><ArrowLeft className="h-5 w-5" /></Button>
              <CardTitle className="font-headline text-2xl font-black uppercase">Instruksi Pembayaran</CardTitle>
              <CardDescription className="text-white/60 font-bold uppercase text-[9px] tracking-widest">Hi Berbagi • Digital Receipt</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="bg-[#800000] text-white p-8 rounded-[2rem] border-b-8 border-[#D4AF37] space-y-6 relative overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] opacity-10"><Landmark className="w-32 h-32 text-[#D4AF37]" /></div>
                <div className="text-center space-y-2 relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Total Donasi</p>
                  <div className="text-4xl font-black flex items-center justify-center gap-2">
                    Rp {((amount || parseInt(customAmount) || 0) + uniqueCode).toLocaleString('id-ID')}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#D4AF37]" onClick={() => copyToClipboard(((amount || parseInt(customAmount) || 0) + uniqueCode).toString())}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest animate-pulse">*Sudah termasuk kode unik {uniqueCode}</p>
                </div>

                <Separator className="bg-white/10" />

                {method === 'transfer' && (
                  <div className="space-y-3 relative z-10">
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest text-center">Rekening Tujuan (BSI)</p>
                    <div className="flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/20">
                      <span className="font-mono font-black text-xl tracking-widest">7123456789</span>
                      <Button variant="ghost" size="sm" className="text-[#D4AF37] font-black" onClick={() => copyToClipboard("7123456789")}>SALIN</Button>
                    </div>
                    <p className="text-[10px] text-center font-bold uppercase tracking-tighter">Yayasan HI AQLI</p>
                  </div>
                )}

                {method === 'qris' && (
                  <div className="space-y-4 text-center relative z-10">
                    <div className="mx-auto w-44 h-44 bg-white p-2 border-4 border-[#D4AF37] rounded-3xl flex items-center justify-center">
                      <Image src="https://placehold.co/400x400/png?text=QRIS+AQLI" alt="QRIS" width={160} height={160} className="rounded-lg" />
                    </div>
                    <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Pindai menggunakan Aplikasi Bank/E-Wallet</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Konfirmasi Pengirim</Label>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#800000]" />
                      <Input placeholder="Nama Sesuai Rekening / Nama Anda" className="pl-11 h-12 font-bold border-2 rounded-xl focus-visible:ring-[#800000]" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button 
                onClick={handleConfirmDonation} 
                disabled={loading} 
                className="w-full h-16 bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-lg rounded-2xl uppercase tracking-widest shadow-xl"
              >
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "SAYA SUDAH TRANSFER"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* FOOTER STATS */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 px-1">
        {[
          { label: "Donasi Terkumpul", value: "Rp 36.6M", icon: TrendingUp },
          { label: "Total Donatur", value: "446", icon: Users },
          { label: "Kampanye Aktif", value: "3", icon: Target },
          { label: "Pemanfaat AI", value: "1.2K", icon: Zap },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-[#800000]/5 flex flex-col items-center text-center gap-1">
            <stat.icon className="w-5 h-5 text-[#D4AF37] mb-1" />
            <span className="text-lg font-black text-[#800000]">{stat.value}</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
