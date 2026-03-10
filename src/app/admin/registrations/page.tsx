
'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Phone, Mail, User, CreditCard, ImageIcon, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useState } from "react";

export default function AdminRegistrationsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const regQuery = useMemoFirebase(() => query(
    collection(db, "tikrar_registrations"),
    where("status", "==", "pending_verification"),
    orderBy("createdAt", "desc")
  ), [db]);

  const { data: registrations, isLoading } = useCollection(regQuery);

  const handleApprove = async (reg: any) => {
    if (!confirm(`Aktifkan akses Juz ${reg.targetJuz} untuk ${reg.userName}?`)) return;
    
    setProcessingId(reg.id);
    try {
      const batch = writeBatch(db);

      // 1. Update Registration Status
      const regRef = doc(db, "tikrar_registrations", reg.id);
      batch.update(regRef, { 
        status: "active",
        verifiedAt: serverTimestamp()
      });

      // 2. Update User Profile
      const userRef = doc(db, "users", reg.userId);
      batch.update(userRef, {
        isTikrarPaid: true,
        paidJuz: reg.targetJuz,
        tikrarLevel: reg.level,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      
      toast({
        title: "Pendaftaran Berhasil Diverifikasi",
        description: `Akses Juz ${reg.targetJuz} telah dibuka untuk ${reg.userName}.`,
      });
    } catch (error) {
      console.error("Approve Error:", error);
      toast({
        variant: "destructive",
        title: "Gagal memproses",
        description: "Terjadi kesalahan saat memperbarui database.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (regId: string) => {
    if (!confirm("Tolak pendaftaran ini?")) return;
    try {
      await updateDoc(doc(db, "tikrar_registrations", regId), { status: "rejected" });
      toast({ title: "Pendaftaran Ditolak" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menolak" });
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-[#800000]" /></div>;

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline">Antrean Verifikasi</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Program Tikrar Daily</p>
        </div>
      </div>

      <div className="grid gap-4">
        {!registrations || registrations.length === 0 ? (
          <Card className="border-2 border-dashed py-20">
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 opacity-20" />
              <p className="font-medium italic">Tidak ada pendaftaran yang perlu diverifikasi saat ini.</p>
            </CardContent>
          </Card>
        ) : (
          registrations.map((reg) => (
            <Card key={reg.id} className="overflow-hidden border-none shadow-md">
              <div className="bg-muted/30 px-6 py-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold">BATCH 1</Badge>
                  <span className="text-[10px] text-muted-foreground font-medium">Daftar pada: {reg.createdAt?.toDate?.().toLocaleString('id-ID')}</span>
                </div>
                <Badge className="bg-amber-500 text-white border-none font-bold text-[10px]">PENDING</Badge>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* User Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#800000]" />
                      <span className="text-sm font-bold">{reg.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`https://wa.me/${reg.whatsapp.replace(/^0/, '62')}`} target="_blank" className="hover:underline text-blue-600 font-bold">{reg.whatsapp}</a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{reg.userEmail}</span>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-3 bg-[#800000]/5 p-4 rounded-xl border border-[#800000]/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Juz</span>
                      <Badge className="bg-[#800000]">JUZ {reg.targetJuz}</Badge>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Level</span>
                      <span className="text-xs font-bold text-[#800000]">{reg.level === 1 ? 'Intensif' : reg.level === 2 ? 'Reguler' : reg.level === 3 ? 'Santai' : 'Pemula'}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Infaq</span>
                      <span className="text-sm font-black text-[#800000]">Rp {reg.amount?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 justify-center">
                    <div className="bg-muted p-2 rounded flex items-center gap-2 text-[10px] mb-2 font-medium overflow-hidden">
                      <ImageIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{reg.proofFileName || "No-File.jpg"}</span>
                    </div>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 gap-2"
                      onClick={() => handleApprove(reg)}
                      disabled={processingId === reg.id}
                    >
                      {processingId === reg.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      VERIFIKASI PEMBAYARAN
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-destructive hover:bg-destructive/10 font-bold h-9 text-xs"
                      onClick={() => handleReject(reg.id)}
                      disabled={processingId === reg.id}
                    >
                      TOLAK PENDAFTARAN
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
