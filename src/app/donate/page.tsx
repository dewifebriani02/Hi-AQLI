'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartHandshake, CheckCircle2, Loader2, Landmark, QrCode, Copy, Calendar, User, ArrowLeft, Image as ImageIcon, CreditCard } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank', icon: Landmark, detail: 'Bank Syariah Indonesia (BSI) - 7123456789 a.n. HI AQLI' },
  { id: 'qris', label: 'QRIS / E-Wallet', icon: QrCode, detail: 'Gopay, OVO, ShopeePay, Dana' },
  { id: 'debit', label: 'Kartu Debit', icon: CreditCard, detail: 'Mandiri, BNI, BRI, BCA (GPN/Visa/Mastercard)' },
];

export default function DonatePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1); 
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("transfer");
  const [uniqueCode, setUniqueCode] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [senderName, setSenderName] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [debitNumber, setDebitNumber] = useState("");

  const donationAmounts = [10000, 25000, 50000, 100000];

  useEffect(() => {
    if (step === 2) {
      setUniqueCode(Math.floor(100 + Math.random() * 899));
    }
  }, [step]);

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(0);
  };

  const nextStep = () => {
    const baseAmount = amount || parseInt(customAmount);
    if (!baseAmount || baseAmount < 5000) {
      toast({ variant: "destructive", title: "Minimal donasi adalah Rp 5.000." });
      return;
    }
    setStep(2);
  };

  const handleConfirmDonation = async () => {
    if (!senderName || !transferDate) {
      toast({ variant: "destructive", title: "Mohon isi nama pengirim dan tanggal." });
      return;
    }

    setLoading(true);
    try {
      const baseAmount = amount || parseInt(customAmount);
      const finalAmount = baseAmount + uniqueCode;
      const transactionId = `AQLI-${Date.now()}-${uniqueCode}`;

      addDocumentNonBlocking(collection(db, "donations"), {
        userId: user?.uid || null,
        amount: finalAmount,
        baseAmount: baseAmount,
        uniqueCode: uniqueCode,
        currency: "IDR",
        transactionId: transactionId,
        paymentMethod: method,
        donationDate: serverTimestamp(),
        senderName: senderName,
        transferDate: transferDate,
        debitLastDigits: method === 'debit' ? debitNumber : null,
        isAnonymous: !user,
        status: "pending_verification",
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast({ title: "Konfirmasi Terkirim", description: "Jazakallahu Khairan!" });
    } catch (error) {} finally { setLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Salin berhasil." });
  };

  if (submitted) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl border-b-8 border-[#D4AF37]">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto bg-black text-[#D4AF37] rounded-full p-4 w-fit animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black font-headline text-[#800000]">Jazakallahu Khairan!</h2>
              <p className="text-sm text-muted-foreground">
                Terima kasih, <strong>{senderName}</strong>. Donasi Anda sangat berarti untuk operasional HI AQLI.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full bg-black text-white hover:bg-black/90 font-bold h-12 rounded-xl">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalDisplayAmount = (amount || parseInt(customAmount) || 0) + uniqueCode;

  return (
    <div className="flex justify-center items-start pt-10 px-4 pb-20">
      <Card className="w-full max-w-lg border-none shadow-xl border-t-4 border-[#800000]">
        <CardHeader className="text-center relative">
          {step === 2 && <Button variant="ghost" size="icon" className="absolute left-4 top-4 text-black" onClick={() => setStep(1)}><ArrowLeft className="h-5 w-5" /></Button>}
          <div className="mx-auto bg-black text-[#D4AF37] rounded-full p-3 w-fit mb-4">
            <HeartHandshake className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-2xl text-black uppercase font-black">
            {step === 1 ? "Infaq Digital" : "Pembayaran"}
          </CardTitle>
          <CardDescription className="font-bold text-[#800000] uppercase text-[10px] tracking-widest">
            Dukung HI AQLI Syiarkan Qur'an
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pilih Nominal</Label>
                <div className="grid grid-cols-2 gap-3">
                  {donationAmounts.map((val) => (
                    <Button 
                      key={val} 
                      variant="outline"
                      className={cn(
                        "h-14 text-sm font-black transition-all rounded-xl border-2",
                        amount === val ? "bg-black border-black text-[#D4AF37] shadow-lg" : "border-black/5 text-black hover:border-black"
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
                <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-4 text-muted-foreground">Custom</span></div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-black">Rp</span>
                  <Input type="number" placeholder="Contoh: 150000" className="pl-11 h-14 text-lg font-black border-2 border-black/5 focus-visible:ring-black rounded-xl" value={customAmount} onChange={handleCustomAmountChange} />
                </div>
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
                        method === pm.id ? "border-black bg-black text-white" : "border-black/5 bg-muted/30 hover:border-black/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <pm.icon className={cn("h-5 w-5", method === pm.id ? "text-[#D4AF37]" : "text-black")} />
                        <div className="flex flex-col">
                          <span className="font-black text-xs uppercase">{pm.label}</span>
                          <span className={cn("text-[9px] font-medium truncate max-w-[180px]", method === pm.id ? "text-white/60" : "text-muted-foreground")}>{pm.detail}</span>
                        </div>
                      </div>
                      {method === pm.id && <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-black text-white p-8 rounded-[2rem] border-b-8 border-[#D4AF37] space-y-6 relative overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] opacity-10"><Landmark className="w-32 h-32" /></div>
                <div className="text-center space-y-2 relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Total Infaq</p>
                  <div className="text-4xl font-black flex items-center justify-center gap-2">
                    Rp {finalDisplayAmount.toLocaleString('id-ID')}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#D4AF37]" onClick={() => copyToClipboard(finalDisplayAmount.toString())}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest">*Sudah termasuk kode unik {uniqueCode}</p>
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
                      <Image src="https://placehold.co/400x400/000000/D4AF37?text=QRIS+AQLI" alt="QRIS" width={160} height={160} className="rounded-lg" />
                    </div>
                    <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Pindai menggunakan Aplikasi Bank/E-Wallet</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Konfirmasi</Label>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                      <Input placeholder="Nama Pengirim Sesuai Rekening" className="pl-11 h-12 font-bold border-2 rounded-xl" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                      <Input type="date" className="pl-11 h-12 font-bold border-2 rounded-xl" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            size="lg" 
            className="w-full font-black text-lg bg-black text-[#D4AF37] hover:bg-black/90 shadow-xl h-16 rounded-2xl uppercase tracking-widest"
            disabled={(!amount && !customAmount) || loading}
            onClick={step === 1 ? nextStep : handleConfirmDonation}
          >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : step === 1 ? "Lanjutkan" : "Konfirmasi Sekarang"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}