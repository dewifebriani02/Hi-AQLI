
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, doc, serverTimestamp, writeBatch, arrayUnion } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Phone, Mail, User, ImageIcon, ArrowLeft, ShieldAlert, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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
    if (!confirm(`Berikan akses ${reg.halaqahTitle} untuk ${reg.userName}?`)) return;
    
    setProcessingId(reg.id);
    try {
      const batch = writeBatch(db);

      // 1. Update Registration Status
      const regRef = doc(db, "halaqah_registrations", reg.id);
      batch.update(regRef, { 
        status: "active",
        verifiedAt: serverTimestamp()
      });

      // 2. Update User Profile Access
      const userRef = doc(db, "users", reg.userId);
      const updateData: any = {
        followedHalaqahs: arrayUnion(reg.halaqahId),
        updatedAt: serverTimestamp()
      };

      // Special logic for Tikrar Premium
      if (reg.halaqahId === 'tikrar-j30-b1') {
        updateData.isTikrarPaid = true;
        updateData.paidJuz = reg.targetJuz;
        updateData.tikrarLevel = reg.level;
      }

      batch.update(userRef, updateData);

      // Commit the batch and wait for it
      await batch.commit();
      
      toast({
        title: "Berhasil Diverifikasi",
        description: `Akses ${reg.halaqahTitle} telah aktif untuk ${reg.userName}.`,
      });
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `halaqah_registrations/${reg.id} & users/${reg.userId}`,
        operation: 'write',
        requestResourceData: { status: 'active', grantAccess: reg.halaqahId }
      }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (regId: string) => {
    if (!confirm("Tolak pendaftaran ini?")) return;
    updateDocumentNonBlocking(doc(db, "halaqah_registrations", regId), { status: "rejected" });
    toast({ title: "Pendaftaran Ditolak" });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-[#800000]" /></div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Akses Ditolak</h2>
        <p className="text-muted-foreground max-w-md">Perlu hak akses administrator untuk melihat daftar ini.</p>
        <Button asChild variant="outline"><Link href="/">Kembali</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 px-1">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline">Verifikasi Pendaftaran</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Semua Program Halaqah</p>
        </div>
      </div>

      <div className="grid gap-4 px-1">
        {!registrations || registrations.length === 0 ? (
          <Card className="border-2 border-dashed py-20">
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 opacity-20" />
              <p className="font-medium italic">Tidak ada pendaftaran baru yang menunggu verifikasi.</p>
            </CardContent>
          </Card>
        ) : (
          registrations.map((reg) => (
            <Card key={reg.id} className="overflow-hidden border-none shadow-md">
              <div className="bg-muted/30 px-6 py-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {reg.halaqahTitle}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Daftar pada: {reg.createdAt?.toDate?.().toLocaleString('id-ID')}
                  </span>
                </div>
                <Badge className={cn("text-white border-none font-bold text-[10px]", reg.isPaid ? "bg-amber-500" : "bg-blue-500")}>
                  {reg.isPaid ? 'BERBAYAR' : 'GRATIS'}
                </Badge>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#800000]" />
                      <span className="text-sm font-bold">{reg.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{reg.whatsapp}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{reg.userEmail}</span>
                    </div>
                  </div>

                  <div className="space-y-3 bg-[#800000]/5 p-4 rounded-xl border border-[#800000]/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Halaqah</span>
                      <span className="text-xs font-bold truncate max-w-[120px]">{reg.halaqahTitle}</span>
                    </div>
                    {reg.isPaid && (
                      <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Infaq</span>
                        <span className="text-sm font-black text-[#800000]">Rp {reg.amount?.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {reg.targetJuz && (
                      <div className="flex items-center justify-between border-t pt-2 border-dashed border-[#800000]/20">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Target</span>
                        <Badge className="bg-[#800000] text-[10px]">JUZ {reg.targetJuz}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 justify-center">
                    {reg.isPaid && (
                      <div className="bg-muted p-2 rounded flex items-center gap-2 text-[10px] mb-2 font-medium overflow-hidden">
                        <ImageIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{reg.proofFileName || "Bukti-Transfer.jpg"}</span>
                      </div>
                    )}
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 gap-2 shadow-sm"
                      onClick={() => handleApprove(reg)}
                      disabled={processingId === reg.id}
                    >
                      {processingId === reg.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      KONFIRMASI & BUKA AKSES
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
