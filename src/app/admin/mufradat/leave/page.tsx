'use client';

import { useCollection } from "@/db";
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
import { useState, useMemo } from "react";
import {db } from "@/db";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AdminLeaveManagementPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data: requests, isLoading: isRequestsLoading, refresh: refreshRequests } = useCollection("halaqah_registrations", {
    filters: [
      { column: 'payment_type', operator: '==', value: 'leave_request' },
      { column: 'status', operator: '==', value: 'pending_verification' }
    ],
    orderBy: { column: 'created_at', ascending: false }
  });

  const { data: activeLeave, isLoading: isActiveLoading } = useCollection("users", {
    filters: [
      { column: 'mufradat_status', operator: '==', value: 'on_leave' }
    ]
  });

  const { data: allMembers, isLoading: isMembersLoading } = useCollection("users", {
    filters: [
      { column: 'mufradat_group_id', operator: 'not.is', value: null }
    ],
    orderBy: { column: 'username', ascending: true }
  });

  const { data: groups } = useCollection("mufradat_groups");

  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = useMemo(() => {
    if (!allMembers) return [];
    if (!searchTerm) return allMembers;
    return allMembers.filter(m => 
      m.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allMembers, searchTerm]);

  const handleApprove = async (request: any) => {
    setIsProcessing(request.id);
    try {
      // 1. Get user data to calculate current balance
      const { data: userData, error: userError } = await db
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
      const { error: userUpdateError } = await db
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
      const { error: regError } = await db
        .from('halaqah_registrations')
        .update({ 
          status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (regError) throw regError;

      toast({ title: "Cuti Disetujui", description: `Permohonan cuti ${request.user_name} berhasil diverifikasi.` });
      refreshRequests();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyetujui", description: e.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (request: any) => {
    setIsProcessing(request.id);
    try {
      const { error } = await db
        .from('halaqah_registrations')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: "Permohonan Ditolak", description: "Permohonan cuti telah ditolak." });
      refreshRequests();
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

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-[#800000]/10 p-1 rounded-xl h-12 w-full max-w-md border-2 border-[#800000]/10 mb-6">
          <TabsTrigger value="pending" className="h-9 font-black uppercase text-[10px] flex-1 data-[state=active]:bg-[#800000] data-[state=active]:text-white transition-all">
            Antrean ({requests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="active" className="h-9 font-black uppercase text-[10px] flex-1 data-[state=active]:bg-[#800000] data-[state=active]:text-white transition-all">
            Sedang Cuti ({activeLeave?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="balances" className="h-9 font-black uppercase text-[10px] flex-1 data-[state=active]:bg-[#800000] data-[state=active]:text-white transition-all">
            Info Saldo
          </TabsTrigger>
        </TabsList>

        {/* --- TAB: PENDING REQUESTS --- */}
        <TabsContent value="pending" className="mt-0">
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
              {isRequestsLoading ? (
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
                                {format(new Date(req.metadata.leave_from), 'dd MMM', { locale: idLocale })} - {format(new Date(req.metadata.leave_until), 'dd MMM', { locale: idLocale })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(req.created_at), 'dd MMM yyyy', { locale: idLocale })}
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
        </TabsContent>

        {/* --- TAB: ACTIVE LEAVE --- */}
        <TabsContent value="active" className="mt-0">
          <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
            <CardHeader className="border-b bg-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black font-headline text-emerald-800">THALIBAH SEDANG CUTI</CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Akses Ayat Dibekukan Sementara</CardDescription>
                </div>
                <Badge className="bg-emerald-600 font-black px-3 py-1 text-white">{activeLeave?.length || 0} AKTIF</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {isActiveLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Memuat thalibah...</p>
                  </div>
               ) : activeLeave?.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                    <Coffee className="w-16 h-16" />
                    <h3 className="font-black uppercase tracking-tight italic">Tidak Ada Thalibah yang Cuti</h3>
                  </div>
               ) : (
                <Table>
                   <TableHeader className="bg-emerald-50/20">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Thalibah</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Halaqah</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Cuti Hingga</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLeave?.map((usr: any) => {
                      const group = groups?.find(g => g.id === usr.mufradat_group_id);
                      return (
                        <TableRow key={usr.id} className="hover:bg-emerald-50 transition-colors border-emerald-50">
                          <TableCell className="py-4 pl-6 font-bold text-sm text-slate-800">{usr.username}</TableCell>
                          <TableCell className="text-xs font-black text-emerald-700 uppercase">{group?.name || '-'}</TableCell>
                          <TableCell className="text-xs font-medium text-slate-600 italic">
                             {usr.mufradat_leave_until ? format(new Date(usr.mufradat_leave_until), 'dd MMM yyyy', { locale: idLocale }) : '---'}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                             <Badge className="bg-emerald-100 text-emerald-700 font-black text-[9px] px-2 py-0 border-none uppercase">ON LEAVE</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB: LEAVE BALANCES --- */}
        <TabsContent value="balances" className="mt-0">
           <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
            <CardHeader className="border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black font-headline text-slate-800">SISA KUOTA CUTI</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Satu Program Hi Mufradat Berhak 3x Cuti Gratis</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                 <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                 <Input 
                    placeholder="Cari thalibah..." 
                    className="pl-10 h-10 border-2 rounded-xl text-xs font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {isMembersLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
               ) : (
                <Table>
                   <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Thalibah</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Saldo Cuti</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Progress Kuota</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6 font-headline">Keanggotaan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((usr: any) => (
                      <TableRow key={usr.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="py-4 pl-6">
                           <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-800">{usr.username}</span>
                              <span className="text-[9px] text-muted-foreground italic">{groups?.find(g => g.id === usr.mufradat_group_id)?.name || 'Tanpa Grup'}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-[#800000]">{usr.mufradat_leave_balance ?? 3}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">DARI 3 BLN</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                 className={cn(
                                    "h-full transition-all",
                                    (usr.mufradat_leave_balance ?? 3) === 0 ? "bg-rose-500" :
                                    (usr.mufradat_leave_balance ?? 3) === 3 ? "bg-emerald-500" : "bg-amber-500"
                                 )}
                                 style={{ width: `${((usr.mufradat_leave_balance ?? 3) / 3) * 100}%` }}
                              />
                           </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                           <Badge className={cn(
                              "font-black text-[9px] px-2 py-0 border-none uppercase",
                              usr.mufradat_status === 'active' ? "bg-emerald-100 text-emerald-700" :
                              usr.mufradat_status === 'on_leave' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                           )}>
                              {usr.mufradat_status || 'INACTIVE'}
                           </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
               )}
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

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
