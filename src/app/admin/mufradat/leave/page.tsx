'use client';

import { useCollection } from "@/supabase/db";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Coffee,
  User,
  ChevronRight,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/supabase";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AdminLeaveManagementPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data: requests, isLoading, refresh } = useCollection("halaqah_registrations", {
    filters: [
      { column: 'payment_type', operator: '==', value: 'leave_request' },
      { column: 'status', operator: '==', value: 'pending_verification' }
    ],
    orderBy: { column: 'created_at', ascending: false }
  });

  const handleApprove = async (request: any) => {
    setIsProcessing(request.id);
    try {
      // 1. Get user data to calculate current balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('mufradat_leave_balance')
        .eq('id', request.user_id)
        .single();

      if (userError) throw userError;

      const currentBalance = userData?.mufradat_leave_balance ?? 3;
      if (currentBalance <= 0) {
        throw new Error("Kuota cuti thalibah sudah habis.");
      }

      // 2. Determine Leave Dates from metadata or fallback
      const meta = request.metadata || {};
      const leaveFrom = meta.leave_from || new Date().toISOString(); 
      
      let leaveUntil = meta.leave_until;
      if (!leaveUntil) {
        // Fallback: If missing granular until, use end of billing month
        const createdDate = new Date(request.created_at);
        const billingMonth = request.billing_month || new Date(createdDate.getFullYear(), createdDate.getMonth() + 1, 1).toISOString().slice(0, 7);
        const [year, month] = billingMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0); 
        lastDay.setHours(23, 59, 59, 999);
        leaveUntil = lastDay.toISOString();
      }

      // 3. Update User
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          mufradat_status: 'on_leave',
          mufradat_leave_from: leaveFrom,
          mufradat_leave_until: leaveUntil,
          mufradat_leave_balance: currentBalance - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.user_id);

      if (userUpdateError) throw userUpdateError;

      // 4. Update Registration
      const { error: regError } = await supabase
        .from('halaqah_registrations')
        .update({ 
          status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (regError) throw regError;

      toast({ title: "Cuti Disetujui", description: `Permohonan cuti ${request.user_name} berhasil diverifikasi.` });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyetujui", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (request: any) => {
    setIsProcessing(request.id);
    try {
      const { error } = await supabase
        .from('halaqah_registrations')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: "Permohonan Ditolak", description: "Permohonan cuti telah ditolak." });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menolak", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
        <Link href="/admin" className="hover:text-[#800000] transition-colors">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/admin/mufradat" className="hover:text-[#800000] transition-colors">Hi Mufradat</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#800000]">Kelola Cuti</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-headline tracking-tighter text-[#800000]">PERMOHONAN CUTI</h1>
        <p className="text-muted-foreground font-medium text-sm">Tinjau dan proses pengajuan cuti thalibah Hi Mufradat.</p>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black font-headline text-[#800000]">ANTREAN PERMOHONAN</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Menunggu Verifikasi Admin</CardDescription>
            </div>
            <Badge className="bg-amber-500 font-black px-3 py-1">{requests?.length || 0} PENDING</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Memuat data...</p>
            </div>
          ) : requests?.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h3 className="font-black text-slate-400 uppercase tracking-tight">Antrean Kosong</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada permohonan cuti baru.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Thalibah</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Periode Cuti</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Tanggal Pengajuan</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((req: any) => (
                  <TableRow key={req.id} className="hover:bg-slate-50 group transition-colors">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#800000]/10 flex items-center justify-center group-hover:bg-[#800000] transition-colors">
                          <User className="w-5 h-5 text-[#800000] group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800">{req.user_name}</span>
                          <span className="text-[10px] text-muted-foreground">{req.user_email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit bg-[#800000]/5 text-[#800000] border-[#800000]/20 font-black text-[10px]">
                          {req.billing_month || 'Custom'}
                        </Badge>
                        {req.metadata?.leave_from && (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                             <Calendar className="w-3 h-3" />
                             {new Date(req.metadata.leave_from).toLocaleDateString('id-ID', {day:'numeric', month:'short'})} - {new Date(req.metadata.leave_until).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 px-4 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-black text-[10px] rounded-xl"
                          onClick={() => handleReject(req)}
                          disabled={isProcessing === req.id}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> TOLAK
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl shadow-md"
                          onClick={() => handleApprove(req)}
                          disabled={isProcessing === req.id}
                        >
                          {isProcessing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          SETUJUI
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-dashed border-emerald-200">
        <h4 className="flex items-center gap-2 font-black text-emerald-800 mb-2 uppercase tracking-tight">
          <Coffee className="w-5 h-5" /> Catatan Admin:
        </h4>
        <p className="text-xs text-emerald-900/70 leading-relaxed font-bold">
          Menyetujui permohonan cuti akan otomatis memotong sisa kuota cuti thalibah sebanyak 1 bulan dan menonaktifkan tagihan untuk periode yang dipilih. Thalibah akan tetap terdaftar dalam grup namun tidak dapat mengakses ayat hingga periode cuti berakhir.
        </p>
      </div>
    </div>
  );
}
