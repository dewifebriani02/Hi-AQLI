
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartHandshake, CheckCircle2, Loader2, CreditCard, Landmark, Wallet, QrCode, Copy, Calendar, User, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank', icon: Landmark, detail: 'Bank Syariah Indonesia (BSI) - 7123456789 a.n. Sahabat AQLI' },
  { id: 'qris', label: 'QRIS / E-Wallet', icon: QrCode, detail: 'Gopay, OVO, ShopeePay, Dana' },
  { id: 'debit', label: 'Kartu Debit', icon: CreditCard, detail: 'Mandiri, BNI, BRI, BCA (GPN/Visa/Mastercard)' },
];

export default function DonatePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  // States
  const [step, setStep] = useState(1); // 1: Amount/Method, 2: Instruction/Confirm
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("transfer");
  const [uniqueCode, setUniqueCode] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Confirmation Form States
  const [senderName, setSenderName] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [debitNumber, setDebitNumber] = useState("");

  const donationAmounts = [10000, 25000, 50000, 100000];

  useEffect(() => {
    // Generate unique code once when entering step 2
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
      toast({
        variant: "destructive",
        title: "Jumlah tidak valid",
        description: "Minimal donasi adalah Rp 5.000.",
      });
      return;
    }
    setStep(2);
  };

  const handleConfirmDonation = async () => {
    if (!senderName || !transferDate) {
      toast({
        variant: "destructive",
        title: "Data tidak lengkap",
        description: "Mohon isi nama pengirim dan tanggal transfer.",
      });
      return;
    }

    if (method === 'debit' && !debitNumber) {
      toast({
        variant: "destructive",
        title: "Nomor kartu kosong",
        description: "Mohon masukkan 4 digit terakhir nomor kartu debit Anda.",
      });
      return;
    }

    setLoading(true);
    try {
      const baseAmount = amount || parseInt(customAmount);
      const finalAmount = baseAmount + uniqueCode;
      const transactionId = `AQLI-${Date.now()}-${uniqueCode}`;

      await addDoc(collection(db, "donations"), {
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
      toast({
        title: "Konfirmasi Terkirim",
        description: "Donasi Anda sedang kami verifikasi. Jazakallahu Khairan!",
      });
    } catch (error) {
      console.error("Donation Error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Konfirmasi",
        description: "Terjadi kesalahan teknis. Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Berhasil disalin ke clipboard.",
    });
  };

  if (submitted) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto bg-green-100 text-green-600 rounded-full p-4 w-fit animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-headline text-[#800000]">Jazakallahu Khairan!</h2>
              <p className="text-muted-foreground">
                Terima kasih, <strong>{senderName}</strong>. Konfirmasi donasi Anda telah kami terima dan sedang dalam proses verifikasi manual oleh tim AQLI Digital.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold">
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
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardHeader className="text-center relative">
          {step === 2 && (
            <Button variant="ghost" size="icon" className="absolute left-4 top-4" onClick={() => setStep(1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="mx-auto bg-primary/10 text-[#800000] rounded-full p-3 w-fit mb-4">
            <HeartHandshake className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-2xl text-[#800000]">
            {step === 1 ? "Dukung Sahabat AQLI" : "Instruksi Pembayaran"}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? "Donasi Anda membantu kami memelihara infrastruktur AI untuk umat." 
              : "Silakan selesaikan pembayaran sesuai instruksi di bawah ini."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {step === 1 ? (
            <>
              {/* Amount Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pilih Nominal</Label>
                <div className="grid grid-cols-2 gap-3">
                  {donationAmounts.map((val) => (
                    <Button 
                      key={val} 
                      variant={amount === val ? "default" : "outline"} 
                      className={cn(
                        "h-12 text-sm font-bold transition-all",
                        amount === val && "bg-[#800000] border-[#800000] text-white"
                      )}
                      onClick={() => handleAmountSelect(val)}
                    >
                      Rp {val.toLocaleString('id-ID')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-bold">Atau Jumlah Khusus</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Rp</span>
                  <Input 
                    type="number" 
                    placeholder="Contoh: 150000" 
                    className="pl-9 h-12 text-lg font-bold border-2 focus-visible:ring-[#800000]" 
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Metode Pembayaran</Label>
                <div className="flex flex-col gap-2">
                  {paymentMethods.map((pm) => (
                    <div 
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                        method === pm.id ? "border-[#800000] bg-[#800000]/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <pm.icon className={cn("h-5 w-5", method === pm.id ? "text-[#800000]" : "text-muted-foreground")} />
                        <div className="flex flex-col">
                          <span className={cn("font-bold text-sm", method === pm.id ? "text-[#800000]" : "text-foreground")}>{pm.label}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{pm.detail}</span>
                        </div>
                      </div>
                      {method === pm.id && <div className="h-4 w-4 rounded-full bg-[#800000]" />}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Payment Instructions Step 2 */}
              <div className="bg-muted/30 p-6 rounded-2xl border-2 border-dashed border-[#800000]/20 space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Pembayaran</p>
                  <div className="text-3xl font-bold text-[#800000] flex items-center justify-center gap-2">
                    Rp {finalDisplayAmount.toLocaleString('id-ID')}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(finalDisplayAmount.toString())}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-[#800000] font-bold italic">*Termasuk kode unik {uniqueCode} untuk verifikasi otomatis</p>
                </div>

                <Separator />

                {method === 'transfer' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Rekening Tujuan (BSI)</p>
                    <div className="flex items-center justify-between bg-background p-3 rounded-lg border">
                      <span className="font-mono font-bold text-lg tracking-wider">7123456789</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard("7123456789")}>
                        Salin
                      </Button>
                    </div>
                    <p className="text-xs text-center font-medium">a.n. Yayasan Sahabat AQLI Digital</p>
                  </div>
                )}

                {method === 'qris' && (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto w-48 h-48 bg-white p-2 border rounded-xl flex items-center justify-center relative">
                      <Image 
                        src="https://placehold.co/400x400/png?text=QRIS+AQLI" 
                        alt="QRIS AQLI" 
                        width={200} 
                        height={200}
                        className="rounded-lg"
                        data-ai-hint="qr code"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Pindai menggunakan aplikasi bank atau e-wallet (Gopay, OVO, Dana, dll)</p>
                  </div>
                )}

                {method === 'debit' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="debit-code">4 Digit Terakhir Kartu Debit</Label>
                      <Input 
                        id="debit-code" 
                        placeholder="XXXX" 
                        maxLength={4}
                        className="h-12 font-mono text-center text-xl tracking-widest"
                        value={debitNumber}
                        onChange={(e) => setDebitNumber(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Form */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Konfirmasi Pengiriman</Label>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender-name" className="text-xs">Nama Pengirim Sesuai Rekening</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="sender-name" 
                        placeholder="Contoh: Abdullah Mansur" 
                        className="pl-10"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-date" className="text-xs">Tanggal Transfer</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="transfer-date" 
                        type="date"
                        className="pl-10"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Unggah Bukti Transfer (Opsional)</Label>
                    <div className="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-4 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">Ketuk untuk pilih gambar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter>
          {step === 1 ? (
            <Button 
              size="lg" 
              className="w-full font-bold text-lg bg-[#800000] hover:bg-[#800000]/90 shadow-lg h-14"
              disabled={(!amount && !customAmount)}
              onClick={nextStep}
            >
              Lanjutkan Pembayaran
            </Button>
          ) : (
            <Button 
              size="lg" 
              className="w-full font-bold text-lg bg-[#800000] hover:bg-[#800000]/90 shadow-lg h-14"
              disabled={loading}
              onClick={handleConfirmDonation}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim...
                </>
              ) : (
                "Konfirmasi Sekarang"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-border w-full" />;
}
