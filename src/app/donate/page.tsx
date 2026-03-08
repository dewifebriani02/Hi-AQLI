'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartHandshake, CheckCircle2, Loader2, CreditCard, Landmark, Wallet } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const paymentMethods = [
  { id: 'transfer', label: 'Transfer Bank', icon: Landmark },
  { id: 'qris', label: 'QRIS / E-Wallet', icon: Wallet },
  { id: 'card', label: 'Kartu Kredit', icon: CreditCard },
];

export default function DonatePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("transfer");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const donationAmounts = [10000, 25000, 50000, 100000];

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(0);
  };

  const handleDonate = async () => {
    const finalAmount = amount || parseInt(customAmount);
    
    if (!finalAmount || finalAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Jumlah tidak valid",
        description: "Silakan masukkan jumlah donasi yang valid.",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate transaction ID
      const transactionId = `AQLI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await addDoc(collection(db, "donations"), {
        userId: user?.uid || null,
        amount: finalAmount,
        currency: "IDR",
        transactionId: transactionId,
        paymentMethod: method,
        donationDate: serverTimestamp(),
        isAnonymous: !user,
        status: "completed",
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast({
        title: "Donasi Berhasil",
        description: "Terima kasih atas dukungannya! Semoga menjadi amal jariyah.",
      });
    } catch (error) {
      console.error("Donation Error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Donasi",
        description: "Terjadi kesalahan teknis. Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
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
                Donasi Anda telah kami terima. Dukungan Anda sangat berarti bagi keberlangsungan dakwah digital Sahabat AQLI.
              </p>
            </div>
            <Button onClick={() => setSubmitted(false)} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-bold">
              Kirim Donasi Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-10 px-4 pb-20">
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-[#800000] rounded-full p-3 w-fit mb-4">
            <HeartHandshake className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-2xl text-[#800000]">Dukung Sahabat AQLI</CardTitle>
          <CardDescription>
            Donasi Anda membantu kami memelihara infrastruktur AI dan mengembangkan fitur baru untuk umat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
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
                    <span className={cn("font-bold", method === pm.id ? "text-[#800000]" : "text-foreground")}>{pm.label}</span>
                  </div>
                  {method === pm.id && <div className="h-4 w-4 rounded-full bg-[#800000]" />}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            size="lg" 
            className="w-full font-bold text-lg bg-[#800000] hover:bg-[#800000]/90 shadow-lg h-14"
            disabled={loading || (!amount && !customAmount)}
            onClick={handleDonate}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...
              </>
            ) : (
              `Donasi Rp ${(amount || parseInt(customAmount) || 0).toLocaleString('id-ID')}`
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
