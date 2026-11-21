'use client';

import { useUser, db } from "@/db";
import { useCollection } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  User, 
  ImageIcon, 
  ShieldAlert, 
  BookOpen, 
  XCircle, 
  Pencil, 
  AlertCircle,
  History, 
  LayoutList,
  Search,
  RefreshCw,
  MessageCircle,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Ban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo } from "react";
import { addMonths, parseISO, format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

function formatWaLink(phone: string | undefined | null, greetingName?: string, halaqahTitle?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
  else if (!normalized.startsWith('62')) normalized = '62' + normalized;
  const msg = greetingName 
    ? `Assalamu'alaikum Ukhti ${greetingName} 🌸 Terkait pendaftaran ${halaqahTitle || 'program'} di Hi AQLI...`
    : `Assalamu'alaikum Ukhti 🌸`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

export default function AdminRegistrationsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"pending" | "verified" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState("all");

  const [processingId, setProcessingId] = useState<string | null>(null);

  // Edit payment dialog
  const [editingReg, setEditingReg] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>("0");
  const [editMonth, setEditMonth] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Reopen rejected registration dialog
  const [reopenTarget, setReopenTarget] = useState<any | null>(null);
  const [isReopening, setIsReopening] = useState(false);

  // Proof preview dialog
  const [previewProof, setPreviewProof] = useState<{ url?: string; name?: string; user?: string } | null>(null);

  // 1. Pending Registrations
  const regOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'pending_verification' }],
    orderBy: { column: 'created_at', ascending: false }
  }), []);
  const { data: pendingRegistrations, isLoading: isPendingLoading, refresh: refreshPending } = useCollection("halaqah_registrations", regOptions);
  
  // 2. Verified History (limit 100)
  const historyOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'verified' }],
    orderBy: { column: 'verified_at', ascending: false },
    limit: 100
  }), []);
  const { data: verifiedHistory, isLoading: isHistoryLoading, refresh: refreshHistory } = useCollection("halaqah_registrations", historyOptions);

  // 3. Rejected History (limit 50)
  const rejectedOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'rejected' }],
    orderBy: { column: 'updated_at', ascending: false },
    limit: 50
  }), []);
  const { data: rejectedHistory, isLoading: isRejectedLoading, refresh: refreshRejected } = useCollection("halaqah_registrations", rejectedOptions);

  const refreshAll = () => {
    refreshPending();
    refreshHistory();
    refreshRejected();
  };

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const pendingCount = pendingRegistrations?.length || 0;
    const verifiedCount = verifiedHistory?.length || 0;
    const rejectedCount = rejectedHistory?.length || 0;
    const totalFunds = verifiedHistory?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;

    return {
      pending: pendingCount,
      verified: verifiedCount,
      rejected: rejectedCount,
      funds: totalFunds
    };
  }, [pendingRegistrations, verifiedHistory, rejectedHistory]);

  // Unique program titles for filter
  const allPrograms = useMemo(() => {
    const set = new Set<string>();
    [...(pendingRegistrations || []), ...(verifiedHistory || []), ...(rejectedHistory || [])].forEach(r => {
      if (r.halaqah_title) set.add(r.halaqah_title);
    });
    return Array.from(set);
  }, [pendingRegistrations, verifiedHistory, rejectedHistory]);

  // Filter Helper
  const filterList = (list: any[] | null) => {
    if (!list) return [];
    return list.filter(reg => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        reg.user_name?.toLowerCase().includes(q) ||
        reg.user_email?.toLowerCase().includes(q) ||
        reg.whatsapp?.includes(q) ||
        reg.halaqah_title?.toLowerCase().includes(q) ||
        reg.voucher_code_used?.toLowerCase().includes(q);

      const matchProgram = filterProgram === 'all' || reg.halaqah_title === filterProgram;

      return matchSearch && matchProgram;
    });
  };

  const filteredPending = useMemo(() => filterList(pendingRegistrations), [pendingRegistrations, searchQuery, filterProgram]);
  const filteredVerified = useMemo(() => filterList(verifiedHistory), [verifiedHistory, searchQuery, filterProgram]);
  const filteredRejected = useMemo(() => filterList(rejectedHistory), [rejectedHistory, searchQuery, filterProgram]);

  const openEdit = (reg: any) => {
    setEditingReg(reg);
    setEditAmount(reg.amount?.toString() || "0");
    setEditMonth(reg.billing_month || format(new Date(reg.verified_at || reg.created_at || Date.now()), 'yyyy-MM'));
  };

  const handleUpdateReg = async () => {
    if (!editingReg) return;
    setIsSaving(true);
    try {
      const { error } = await db.from("halaqah_registrations").update({
        amount: parseInt(editAmount) || 0,
        billing_month: editMonth.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', editingReg.id);

      if (error) throw error;
      toast({ title: "Data Pembayaran Diperbarui! ✅" });
      refreshHistory();
      setEditingReg(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal memperbarui data", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (reg: any) => {
    if (!reg?.id || !reg?.user_id) {
      toast({ variant: "destructive", title: "Data pendaftaran tidak lengkap." });
      return;
    }

    setProcessingId(reg.id);

    try {
      // 1. Update Registration Status with start date
      const { error: regError } = await db.from("halaqah_registrations").update({
        status: "verified",
        verified_at: new Date().toISOString(),
        start_date: new Date().toISOString()
      }).eq('id', reg.id);

      if (regError) throw regError;

      // 2. Update User Profile Access
      const { data: userData } = await db
        .from("users")
        .select("followed_halaqahs, mufradat_group_id")
        .eq('id', reg.user_id)
        .maybeSingle();

      const currentFollowed = userData?.followed_halaqahs || [];
      const currentGroupId = userData?.mufradat_group_id;

      const updateData: any = {
        followed_halaqahs: currentFollowed.includes(reg.halaqah_id) ? currentFollowed : [...currentFollowed, reg.halaqah_id],
        updated_at: new Date().toISOString()
      };

      // Hi Mufradat Auto-Grouping (Only if NO GROUP assigned yet)
      const isMufradatReg = reg.halaqah_id === 'mufradat-premium' || reg.halaqah_title?.toLowerCase().includes('mufradat');
      if (!currentGroupId && isMufradatReg) {
        try {
          const { data: availableGroups } = await db
            .from('mufradat_groups')
            .select('*')
            .lt('member_count', 50)
            .order('created_at', { ascending: false })
            .limit(1);

          let targetGroupId;

          if (availableGroups && availableGroups.length > 0) {
            targetGroupId = availableGroups[0].id;
            await db
              .from('mufradat_groups')
              .update({ member_count: (availableGroups[0].member_count || 0) + 1 })
              .eq('id', targetGroupId);
          } else {
            const { data: allGroups } = await db.from('mufradat_groups').select('id');
            const nextNum = (allGroups?.length || 0) + 1;
            const { data: newGroup, error: groupError } = await db
              .from('mufradat_groups')
              .insert({ 
                name: `Grup ${nextNum}`, 
                member_count: 1,
                level: 1,
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (groupError) throw groupError;
            targetGroupId = newGroup.id;
          }

          updateData.mufradat_group_id = targetGroupId;
        } catch (groupErr) {
          console.error("Auto-grouping error:", groupErr);
        }
      }

      // Tikrar Premium Setup
      const isTikrarReg = reg.halaqah_id === 'tikrar-j30-b1' || reg.halaqah_id === 'tikrar-premium' || reg.halaqah_title?.toLowerCase().includes('tikrar');
      if (isTikrarReg) {
        updateData.is_tikrar_paid = true;
        updateData.paidJuz = reg.target_juz || reg.targetJuz || 30;
        updateData.tikrar_level = reg.level || 3;
        updateData.tikrar_start_date = new Date().toISOString();
      }

      const { error: userError } = await db.from("users").update(updateData).eq('id', reg.user_id);
      if (userError) throw userError;

      // Hi Mufradat Subscription Extension
      if (isMufradatReg) {
        const type = reg.payment_type || 'initial';
        const { data: currentUsr } = await db
          .from('users')
          .select('mufradat_due_date, mufradat_leave_balance')
          .eq('id', reg.user_id)
          .maybeSingle();

        let subUpdate: any = {
           mufradat_status: 'active',
           updated_at: new Date().toISOString()
        };

        const now = new Date();
        const currentDue = currentUsr?.mufradat_due_date ? parseISO(currentUsr.mufradat_due_date) : null;
        const baseDate = (currentDue && currentDue > now) ? currentDue : now;

        if (type === 'monthly' || type === 'initial' || type === 're_registration') {
          const duration = reg.metadata?.paymentDuration || 1;
          const nextDueDate = addMonths(baseDate, duration);
          subUpdate.mufradat_due_date = nextDueDate.toISOString();
          subUpdate.mufradat_status = 'active';
        } else if (type === 'leave_request') {
          const leaveUntil = addMonths(baseDate, 1);
          subUpdate.mufradat_status = 'on_leave';
          subUpdate.mufradat_leave_until = leaveUntil.toISOString();
          subUpdate.mufradat_leave_balance = Math.max(0, (currentUsr?.mufradat_leave_balance || 3) - 1);
        }

        await db.from("users").update(subUpdate).eq('id', reg.user_id);
      }

      // Referral Reward Logic
      const referralCode = reg.referral_code_used || userData?.referred_by_id;
      if (referralCode && reg.payment_method !== 'voucher') {
        let referrer = null;
        if (reg.referral_code_used) {
          const { data } = await db
            .from("users")
            .select("id, referral_balance, username")
            .eq("referral_code", reg.referral_code_used)
            .maybeSingle();
          referrer = data;
        } else if (userData?.referred_by_id) {
          const { data } = await db
            .from("users")
            .select("id, referral_balance, username")
            .eq("id", userData.referred_by_id)
            .maybeSingle();
          referrer = data;
        }
        
        if (referrer) {
          const { count } = await db
            .from("halaqah_registrations")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", reg.user_id)
            .eq("status", "verified")
            .neq("id", reg.id);
          
          if (count === 0) {
            const newBal = (referrer.referral_balance || 0) + 5000;
            await db
              .from("users")
              .update({ referral_balance: newBal })
              .eq("id", referrer.id);
            
            toast({
              title: "Reward Referral Berhasil! 🎁",
              description: `Saldo Rp 5.000 masuk ke akun ${referrer.username}.`,
            });
          }
        }
      }

      toast({
        title: "Akses Diaktifkan! 🎉",
        description: `Masyallah, akses ${reg.halaqah_title} untuk ${reg.user_name} telah aktif.`,
      });
      refreshAll();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Gagal memproses verifikasi", description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;

    setIsRejecting(true);
    try {
      const { error } = await db.from("halaqah_registrations").update({
        status: "rejected",
        notes: rejectReason.trim() || "Ditolak oleh admin",
        updated_at: new Date().toISOString()
      }).eq('id', rejectTarget.id);

      if (error) throw error;
      toast({ title: "Pendaftaran Telah Ditolak", description: `${rejectTarget.user_name} dipindahkan ke tab Ditolak.` });
      setRejectTarget(null);
      setRejectReason("");
      refreshAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menolak pendaftaran", description: e.message });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenTarget) return;

    setIsReopening(true);
    try {
      const { error } = await db.from("halaqah_registrations").update({
        status: "pending_verification",
        updated_at: new Date().toISOString()
      }).eq('id', reopenTarget.id);

      if (error) throw error;
      toast({ title: "Pendaftaran Dikembalikan ke Antrean! 🔄", description: `${reopenTarget.user_name} siap diverifikasi ulang.` });
      setReopenTarget(null);
      refreshAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal memulihkan pendaftaran", description: e.message });
    } finally {
      setIsReopening(false);
    }
  };

  if (isPendingLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Antrean Pendaftaran...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-28">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-[#6D123F] font-bold">Dashboard Admin</Link>
            <span>/</span>
            <span className="text-[#6D123F] font-bold">Verifikasi Pendaftaran</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-slate-900 flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-[#6D123F]" />
            Verifikasi Pendaftaran & Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Periksa antrean transfer infaq pendaftaran, verifikasi bukti bayar, voucher, serta riwayat aktivasi kelas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button 
            onClick={refreshAll} 
            variant="outline" 
            size="sm" 
            className="rounded-xl gap-1.5 font-bold text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setActiveTab('pending'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all",
            activeTab === 'pending'
              ? "bg-[#6D123F]/5 border-[#6D123F] shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Perlu Verifikasi</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{kpiStats.pending} <span className="text-xs font-normal text-slate-400">antrean</span></p>
        </button>

        <button
          onClick={() => { setActiveTab('verified'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all",
            activeTab === 'verified'
              ? "bg-emerald-50 border-emerald-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Terverifikasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 mt-1">{kpiStats.verified}</p>
        </button>

        <button
          onClick={() => { setActiveTab('rejected'); setSearchQuery(''); }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all",
            activeTab === 'rejected'
              ? "bg-rose-50 border-rose-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Ditolak / Batal</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-900 mt-1">{kpiStats.rejected}</p>
        </button>

        <div className="p-3.5 rounded-2xl border bg-white border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6D123F]">Dana Terkumpul</span>
            <span className="text-[10px] font-black bg-[#6D123F]/10 text-[#6D123F] px-1.5 py-0.5 rounded">IDR</span>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1 truncate">
            Rp {kpiStats.funds.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Search & Program Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari pendaftar (nama, email, WhatsApp, voucher)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select 
            value={filterProgram} 
            onValueChange={setFilterProgram}
          >
            <SelectTrigger className="w-[180px] h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Semua Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Program</SelectItem>
              {allPrograms.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || filterProgram !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(''); setFilterProgram('all'); }}
              className="text-xs text-rose-600 font-bold h-10 px-2.5 rounded-xl hover:bg-rose-50"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-slate-100 p-1 rounded-2xl w-fit">
          <TabsTrigger value="pending" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-[#6D123F] data-[state=active]:text-white">
            <AlertCircle className="w-3.5 h-3.5" />
            Antrean Menunggu ({filteredPending.length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-[#6D123F] data-[state=active]:text-white">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Riwayat Terverifikasi ({filteredVerified.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-[#6D123F] data-[state=active]:text-white">
            <Ban className="w-3.5 h-3.5" />
            Ditolak / Batal ({filteredRejected.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENDING VERIFICATION */}
        <TabsContent value="pending" className="mt-4 space-y-4">
          {filteredPending.length === 0 ? (
            <Card className="border-2 border-dashed rounded-3xl py-16 bg-white">
              <CardContent className="flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mb-2" />
                <p className="text-base font-bold text-slate-800">Antrean Bersih!</p>
                <p className="text-xs text-slate-400">Tidak ada pendaftaran yang sedang menunggu verifikasi saat ini.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPending.map((reg) => {
                const waLink = formatWaLink(reg.whatsapp, reg.user_name, reg.halaqah_title);
                return (
                  <Card key={reg.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden transition-all hover:shadow-md">
                    <div className="bg-slate-50/80 px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-bold border-[#6D123F]/20 text-[#6D123F] bg-white flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" /> {reg.halaqah_title}
                        </Badge>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase border-none px-2 py-0.5",
                          reg.is_paid 
                            ? (reg.payment_method === 'voucher' ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white')
                            : 'bg-blue-600 text-white'
                        )}>
                          {reg.is_paid ? (reg.payment_method === 'voucher' ? 'VOUCHER' : 'TRANSFER BANK') : 'GRATIS'}
                        </Badge>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        Daftar: {reg.created_at ? format(new Date(reg.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                      </span>
                    </div>

                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* User Profile */}
                        <div className="lg:col-span-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-[#6D123F]/10 flex items-center justify-center text-[#6D123F] shrink-0 font-black text-base">
                              {(reg.user_name || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-900 truncate">{reg.user_name}</span>
                              <span className="text-[11px] text-slate-400 truncate">{reg.user_email}</span>
                            </div>
                          </div>

                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{reg.whatsapp}</span>
                              <MessageCircle className="w-3 h-3 ml-1 text-emerald-500" />
                            </a>
                          )}
                        </div>

                        {/* Payment Details */}
                        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">Target Program</span>
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{reg.halaqah_title}</span>
                          </div>

                          {reg.is_paid && (
                            <div className="flex items-center justify-between border-t pt-2 border-slate-200">
                              <span className="text-[10px] font-black uppercase text-slate-400">Nominal Infaq</span>
                              <div className="text-right">
                                <span className="text-base font-black text-[#6D123F]">
                                  Rp {(Number(reg.amount) || 0).toLocaleString('id-ID')}
                                </span>
                                {Number(reg.amount) === 0 && reg.payment_method !== 'voucher' && (
                                  <p className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5 justify-end">
                                    <AlertCircle className="w-2.5 h-2.5" /> Nominal 0 (Perlu Dicek)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {reg.voucher_code_used && (
                            <div className="flex items-center justify-between border-t pt-2 border-slate-200">
                              <span className="text-[10px] font-black uppercase text-slate-400">Kode Voucher</span>
                              <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-black border-none uppercase">
                                {reg.voucher_code_used}
                              </Badge>
                            </div>
                          )}

                          {reg.proof_file_name && (
                            <div className="flex items-center justify-between border-t pt-2 border-slate-200">
                              <span className="text-[10px] font-black uppercase text-slate-400">Bukti Bayar</span>
                              <button
                                type="button"
                                onClick={() => setPreviewProof({
                                  url: reg.proof_url || reg.payment_proof_url,
                                  name: reg.proof_file_name,
                                  user: reg.user_name
                                })}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{reg.proof_file_name}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-4 flex flex-col gap-2">
                          <Button
                            className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold h-11 gap-2 rounded-xl text-xs shadow-sm"
                            onClick={() => handleApprove(reg)}
                            disabled={processingId === reg.id}
                          >
                            {processingId === reg.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            Verifikasi & Aktifkan
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-slate-600 hover:bg-slate-100 text-xs font-bold h-9 rounded-xl"
                              onClick={() => openEdit(reg)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Koreksi Nominal
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50 text-xs font-bold h-9 px-3 rounded-xl"
                              onClick={() => setRejectTarget(reg)}
                              disabled={processingId === reg.id}
                            >
                              Tolak
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: VERIFIED HISTORY */}
        <TabsContent value="verified" className="mt-4">
          <Card className="border shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {filteredVerified.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs italic">
                  Belum ada riwayat pendaftaran terverifikasi yang cocok.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 pl-6">Peserta</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Program</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Metode & Voucher</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Nominal Infaq</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Tgl Verifikasi</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVerified.map((reg) => {
                      const waLink = formatWaLink(reg.whatsapp, reg.user_name, reg.halaqah_title);
                      return (
                        <TableRow key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="py-3 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                                {(reg.user_name || 'U')[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate">{reg.user_name}</span>
                                <span className="text-[10px] text-slate-400 truncate">{reg.whatsapp || reg.user_email}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-xs font-bold text-[#6D123F]">{reg.halaqah_title}</span>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={cn(
                                "text-[9px] font-bold border-none px-2 py-0.5",
                                reg.payment_method === 'voucher' ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                              )}>
                                {reg.payment_method === 'voucher' ? 'VOUCHER' : 'TRANSFER BANK'}
                              </Badge>
                              {reg.voucher_code_used && (
                                <span className="text-[9px] font-mono text-slate-500">({reg.voucher_code_used})</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-xs font-bold text-slate-800">
                              {reg.amount ? `Rp ${Number(reg.amount).toLocaleString('id-ID')}` : '-'}
                            </span>
                            {reg.billing_month && (
                              <span className="text-[9px] text-slate-400 block font-medium">Bln: {reg.billing_month}</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-[10px] text-slate-500 font-medium">
                            {reg.verified_at ? format(new Date(reg.verified_at), 'dd/MM/yyyy HH:mm') : '-'}
                          </TableCell>

                          <TableCell className="py-3 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {waLink && (
                                <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 rounded-lg">
                                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-[#6D123F] rounded-lg"
                                onClick={() => openEdit(reg)}
                                title="Koreksi Nominal / Bulan Tagihan"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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

        {/* TAB 3: REJECTED HISTORY */}
        <TabsContent value="rejected" className="mt-4">
          <Card className="border shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              {filteredRejected.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs italic">
                  Tidak ada pendaftaran dengan status ditolak / batal.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 pl-6">Peserta</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Program</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Alasan / Catatan</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Tgl Ditolak</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right pr-6">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRejected.map((reg) => {
                      const waLink = formatWaLink(reg.whatsapp, reg.user_name, reg.halaqah_title);
                      return (
                        <TableRow key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="py-3 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-black shrink-0">
                                {(reg.user_name || 'U')[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate">{reg.user_name}</span>
                                <span className="text-[10px] text-slate-400 truncate">{reg.whatsapp || reg.user_email}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-xs font-bold text-slate-700">{reg.halaqah_title}</span>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="text-xs text-rose-600 font-medium">
                              {reg.notes || "Ditolak tanpa catatan"}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-[10px] text-slate-400 font-medium">
                            {reg.updated_at ? format(new Date(reg.updated_at), 'dd/MM/yyyy HH:mm') : '-'}
                          </TableCell>

                          <TableCell className="py-3 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {waLink && (
                                <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 rounded-lg">
                                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-lg"
                                onClick={() => setReopenTarget(reg)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" /> Pulihkan
                              </Button>
                            </div>
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
      </Tabs>

      {/* EDIT PAYMENT MODAL */}
      <Dialog open={!!editingReg} onOpenChange={(open) => !open && setEditingReg(null)}>
        <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border shadow-2xl">
          <DialogHeader className="p-6 bg-[#6D123F] text-white">
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Pencil className="w-5 h-5" /> Edit Detail Pembayaran
            </DialogTitle>
            <DialogDescription className="text-white/75 text-xs mt-1">
              Koreksi nominal infaq dan bulan tagihan untuk sinkronisasi laporan keuangan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nama Peserta</Label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-xs text-slate-800">
                {editingReg?.user_name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nominal Infaq (Rp)</Label>
                <Input 
                  type="number" 
                  value={editAmount} 
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-10 rounded-xl font-bold text-[#6D123F]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bulan Tagihan</Label>
                <Input 
                  type="text" 
                  placeholder="YYYY-MM (Contoh: 2026-11)"
                  value={editMonth} 
                  onChange={(e) => setEditMonth(e.target.value)}
                  className="h-10 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Perubahan nominal akan otomatis memperbarui total dana infaq pada dashboard dan laporan keuangan AQLI.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t flex gap-2">
            <Button variant="ghost" className="flex-1 text-xs font-bold h-10 rounded-xl" onClick={() => setEditingReg(null)}>
              Batal
            </Button>
            <Button 
              className="flex-1 bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold h-10 rounded-xl text-xs"
              onClick={handleUpdateReg}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM REJECT MODAL */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" /> Tolak Pendaftaran?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menolak pendaftaran <strong>{rejectTarget?.user_name}</strong> untuk kelas <strong>{rejectTarget?.halaqah_title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Alasan Penolakan (Opsional)</Label>
            <Input
              placeholder="Contoh: Bukti transfer tidak terbaca / salah rekening"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={isRejecting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isRejecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Tolak Pendaftaran
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM REOPEN MODAL */}
      <AlertDialog open={!!reopenTarget} onOpenChange={(open) => !open && setReopenTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Pulihkan Pendaftaran ke Antrean?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kembalikan status pendaftaran <strong>{reopenTarget?.user_name}</strong> ke antrean <em>Menunggu Verifikasi</em> agar dapat diproses kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReopening}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReopen}
              disabled={isReopening}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isReopening ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Pulihkan ke Antrean
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PROOF PREVIEW MODAL */}
      <Dialog open={!!previewProof} onOpenChange={(open) => !open && setPreviewProof(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <ImageIcon className="w-5 h-5 text-[#6D123F]" />
              Bukti Pembayaran Pendaftar
            </DialogTitle>
            <DialogDescription className="text-xs">
              File bukti yang dilampirkan oleh <strong>{previewProof?.user}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center gap-3">
            {previewProof?.url ? (
              <div className="max-h-[350px] overflow-auto rounded-xl border bg-slate-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={previewProof.url} 
                  alt="Bukti Transfer" 
                  className="max-w-full h-auto rounded-lg object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed w-full space-y-2">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">{previewProof?.name || "Bukti Transfer Terdaftar"}</p>
                <p className="text-[11px] text-slate-400">File tersimpan di database lokal / attachment.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full text-xs font-bold rounded-xl" onClick={() => setPreviewProof(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
