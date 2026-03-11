
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc, serverTimestamp, writeBatch, arrayUnion } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Phone, Mail, User, ImageIcon, ArrowLeft, ShieldAlert, BookOpen, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

export default function AdminRegistrationsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const regQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "halaqah_registrations"),
      where("status", "==", "pending_verification")
    );
  }, [db, user?.uid]);

  const { data: registrations, isLoading, error } = useCollection(regQuery);

  const handleApprove = async (reg: any) => {
    if (!reg?.id || !reg?.userId) {
      toast({ variant: "destructive", title: "Data pendaftaran tidak lengkap." });
      return;
    }

    setProcessingId(reg.id);
    
    try {
      const batch = writeBatch(db);

      // 1. Update Registration Status with start date
      const regRef = doc(db, "halaqah_registrations", reg.id);
      batch.update(regRef, { 
        status: "active",
        verifiedAt: serverTimestamp(),
        startDate: serverTimestamp()
      });

      // 2. Update User Profile Access
      const userRef = doc(db, "users", reg.userId);
      const updateData: any = {
        followedHalaqahs: arrayUnion(reg.halaqahId),
        updatedAt: serverTimestamp()
      };

      // Special logic for Tikrar Premium Start Date
      if (reg.halaqahId === 'tikrar-j30-b1') {
        updateData.isTikrarPaid = true;
        updateData.paidJuz = reg.targetJuz || 30;
        updateData.tikrarLevel = reg.level || 3;
        updateData.tikrarStartDate = serverTimestamp(); // Admin sets start date here
      }

      batch.set(userRef, updateData, { merge: true });

      // Execute batch
      await batch.commit();
      
      toast({
        title: "Akses Diaktifkan",
        description: `Masyallah, akses ${reg.halaqahTitle} untuk ${reg.userName} telah aktif mulai hari ini.`,
      });
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `halaqah_registrations/${reg.id} & users/${reg.userId}`,
        operation: 'write',
        requestResourceData: { status: 'active', grantAccess: reg.halaqahId }
      }));
      toast({ variant: "destructive", title: "Gagal memproses verifikasi." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (regId: string) => {
    setProcessingId(regId);
    try {
      const regRef = doc(db, "halaqah_registrations", regId);
      const batch = writeBatch(db);
      batch.update(regRef, { status: "rejected", updatedAt: serverTimestamp() });
      await batch.commit();
      toast({ title: "Pendaftaran Ditolak" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menolak pendaftaran." });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Antrean...</p></div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Akses Terbatas</h2>
        <p className="text-muted-foreground max-w-md px-4">Hanya administrator terverifikasi yang dapat mengelola pendaftaran santri.</p>
        <Button asChild variant="outline" className="mt-4"><Link href="/">Kembali ke Beranda</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-32">
      <div className="flex items-center gap-4 px-1 mt-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
          <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Verifikasi Santri</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Antrean Pendaftaran Halaqah</p>
        </div>
      </div>

      <div className="grid gap-4 px-1">
        {!registrations || registrations.length === 0 ? (
          <Card className="border-2 border-dashed py-24 bg-muted/5">
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
              <CheckCircle2 className="w-16 h-16 opacity-10" />
              <div className="space-y-1">
                <p className="font-bold text-lg text-foreground/50">Antrean Bersih!</p>
                <p className="text-sm italic">Semua pendaftaran telah selesai diproses.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          registrations.map((reg) => (
            <Card key={reg.id} className="overflow-hidden border-none shadow-lg bg-card transition-all hover:shadow-xl">
              <div className="bg-muted/30 px-6 py-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] font-black flex items-center gap-1.5 px-2 py-0.5 border-[#800000]/20 text-[#800000] bg-white">
                    <BookOpen className="w-3 h-3" /> {reg.halaqahTitle}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    {reg.createdAt?.toDate?.() ? new Date(reg.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </span>
                </div>
                <Badge className={cn("text-white border-none font-black text-[9px] px-3 py-0.5 tracking-widest", reg.isPaid ? "bg-amber-500 shadow-sm shadow-amber-500/20" : "bg-blue-500 shadow-sm shadow-blue-500/20")}>
                  {reg.isPaid ? 'BERBAYAR' : 'GRATIS'}
                </Badge>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000] shrink-0 font-bold">
                        {reg.userName?.[0] || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">{reg.userName}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{reg.userEmail}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pl-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                        <Phone className="w-3 h-3" />
                        <span>{reg.whatsapp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-[#800000]/5 p-5 rounded-2xl border-2 border-[#800000]/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Detail Kelas</span>
                      <span className="text-xs font-bold text-[#800000] truncate max-w-[120px]">{reg.halaqahTitle}</span>
                    </div>
                    {reg.isPaid && (
                      <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Infaq</span>
                        <span className="text-base font-black text-[#800000]">Rp {reg.amount?.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {reg.targetJuz && (
                      <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Hafalan</span>
                        <Badge className="bg-[#800000] text-[10px] font-black px-2 py-0">JUZ {reg.targetJuz}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-3">
                    {reg.isPaid && (
                      <div className="bg-muted p-2 rounded-xl flex items-center gap-2 text-[10px] mb-1 font-bold text-muted-foreground border-2 border-dashed border-muted-foreground/20 overflow-hidden">
                        <ImageIcon className="w-4 h-4 shrink-0 text-[#800000]" />
                        <span className="truncate">{reg.proofFileName || "Bukti-Transfer.jpg"}</span>
                      </div>
                    )}
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 gap-2 shadow-lg shadow-emerald-600/20 rounded-xl"
                      onClick={() => handleApprove(reg)}
                      disabled={processingId === reg.id}
                    >
                      {processingId === reg.id ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      KONFIRMASI & TENTUKAN TGL MULAI
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-destructive hover:bg-destructive/5 font-bold h-10 text-xs gap-2"
                      onClick={() => handleReject(reg.id)}
                      disabled={processingId === reg.id}
                    >
                      <XCircle className="w-4 h-4" /> TOLAK PENDAFTARAN
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
