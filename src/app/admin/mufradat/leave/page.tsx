'use client';

import { useState, useMemo } from "react";
import { useCollection, db } from "@/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  User,
  Calendar,
  Search,
  RotateCcw,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LeaveTab = "pending" | "active" | "balances";
type QuotaFilter = "all" | "empty" | "available";

export default function AdminLeaveManagementPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<LeaveTab>("pending");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [quotaFilter, setQuotaFilter] = useState<QuotaFilter>("all");

  const requestsOptions = useMemo(
    () => ({
      filters: [
        { column: "payment_type", operator: "==", value: "leave_request" },
        { column: "status", operator: "==", value: "pending_verification" },
      ],
      orderBy: { column: "created_at", ascending: false },
    }),
    []
  );

  const activeLeaveOptions = useMemo(
    () => ({
      filters: [{ column: "mufradat_status", operator: "==", value: "on_leave" }],
    }),
    []
  );

  const membersOptions = useMemo(
    () => ({
      filters: [{ column: "mufradat_group_id", operator: "not_null", value: true }],
      orderBy: { column: "created_at", ascending: false },
    }),
    []
  );

  const groupsOptions = useMemo(
    () => ({ orderBy: { column: "name", ascending: true } }),
    []
  );

  const {
    data: requests,
    isLoading: isRequestsLoading,
    refresh: refreshRequests,
  } = useCollection("halaqah_registrations", requestsOptions);

  const {
    data: activeLeave,
    isLoading: isActiveLoading,
    refresh: refreshActiveLeave,
  } = useCollection("users", activeLeaveOptions);

  const {
    data: allMembers,
    isLoading: isMembersLoading,
    refresh: refreshMembers,
  } = useCollection("users", membersOptions);

  const { data: groups } = useCollection("mufradat_groups", groupsOptions);

  const groupMap = useMemo(() => {
    const map: Record<string, string> = {};
    (groups || []).forEach((g: any) => {
      map[g.id] = g.name;
    });
    return map;
  }, [groups]);

  const kpis = useMemo(() => {
    const members = allMembers || [];
    const emptyQuota = members.filter(
      (m: any) => (m.mufradat_leave_balance ?? 3) <= 0
    ).length;
    return {
      pending: requests?.length || 0,
      onLeave: activeLeave?.length || 0,
      emptyQuota,
      totalMembers: members.length,
    };
  }, [requests, activeLeave, allMembers]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (allMembers || [])
      .filter((m: any) => {
        if (selectedGroupId !== "all" && m.mufradat_group_id !== selectedGroupId) {
          return false;
        }
        const balance = m.mufradat_leave_balance ?? 3;
        if (quotaFilter === "empty" && balance > 0) return false;
        if (quotaFilter === "available" && balance <= 0) return false;

        if (!q) return true;
        const fields = [
          m.full_name,
          m.username,
          m.email,
          m.whatsapp,
          m.phone,
          groupMap[m.mufradat_group_id],
        ];
        return fields.some((f) => String(f || "").toLowerCase().includes(q));
      })
      .sort((a: any, b: any) =>
        (a.full_name || a.username || "").localeCompare(
          b.full_name || b.username || ""
        )
      );
  }, [allMembers, searchTerm, selectedGroupId, quotaFilter, groupMap]);

  const handleApprove = async (request: any) => {
    setIsProcessing(request.id);
    try {
      const { data: userData, error: userError } = await db
        .from("users")
        .select("mufradat_leave_balance")
        .eq("id", request.user_id)
        .single();

      if (userError) throw userError;

      const currentBalance = userData?.mufradat_leave_balance ?? 3;
      if (currentBalance <= 0) {
        throw new Error("Kuota cuti thalibah sudah habis.");
      }

      const meta = request.metadata || {};
      const leaveFrom = meta.leave_from || new Date().toISOString();

      let leaveUntil = meta.leave_until;
      if (!leaveUntil) {
        const createdDate = new Date(request.created_at);
        const billingMonth =
          request.billing_month ||
          new Date(createdDate.getFullYear(), createdDate.getMonth() + 1, 1)
            .toISOString()
            .slice(0, 7);
        const [year, month] = billingMonth.split("-").map(Number);
        const lastDay = new Date(year, month, 0);
        lastDay.setHours(23, 59, 59, 999);
        leaveUntil = lastDay.toISOString();
      }

      const { error: userUpdateError } = await db
        .from("users")
        .update({
          mufradat_status: "on_leave",
          mufradat_leave_from: leaveFrom,
          mufradat_leave_until: leaveUntil,
          mufradat_leave_balance: currentBalance - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.user_id);

      if (userUpdateError) throw userUpdateError;

      const { error: regError } = await db
        .from("halaqah_registrations")
        .update({
          status: "verified",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (regError) throw regError;

      toast({
        title: "Cuti Disetujui",
        description: `Permohonan cuti ${request.user_name} berhasil diverifikasi.`,
      });
      await Promise.all([
        refreshRequests(),
        refreshActiveLeave(),
        refreshMembers(),
      ]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyetujui",
        description: e.message,
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (request: any) => {
    setIsProcessing(request.id);
    try {
      const { error } = await db
        .from("halaqah_registrations")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Permohonan Ditolak",
        description: `Pengajuan cuti ${request.user_name} telah ditolak.`,
      });
      await refreshRequests();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menolak",
        description: e.message,
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReactivateUser = async (usr: any) => {
    setIsProcessing(usr.id);
    try {
      const { error } = await db
        .from("users")
        .update({
          mufradat_status: "active",
          mufradat_leave_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usr.id);

      if (error) throw error;

      toast({
        title: "Peserta Diaktifkan Kembali",
        description: `${usr.full_name || usr.username} kini berstatus aktif kembali.`,
      });
      await Promise.all([refreshActiveLeave(), refreshMembers()]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal mengaktifkan kembali",
        description: e.message,
      });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-20">
      {/* Header + Clickable KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Coffee className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Manajemen Cuti Hi Mufradat
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Permohonan Cuti &amp; Sisa Kuota Thalibah
          </h1>
          <p className="text-xs text-muted-foreground">
            Verifikasi pengajuan cuti, akhiri masa cuti lebih awal jika peserta kembali aktif, dan pantau jatah 3x cuti per program.
          </p>
        </div>

        {/* Clickable KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              activeTab === "pending"
                ? "bg-amber-50 border-amber-400 ring-1 ring-amber-300"
                : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 hover:border-amber-400"
            )}
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-800">
                Antrean
              </p>
              <p className="text-lg font-black text-amber-700 leading-none mt-0.5">
                {kpis.pending}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              activeTab === "active"
                ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 hover:border-emerald-400"
            )}
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                Sedang Cuti
              </p>
              <p className="text-lg font-black text-emerald-700 leading-none mt-0.5">
                {kpis.onLeave}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("balances");
              setQuotaFilter("empty");
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              activeTab === "balances" && quotaFilter === "empty"
                ? "bg-rose-50 border-rose-400 ring-1 ring-rose-300"
                : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 hover:border-rose-400"
            )}
          >
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-800">
                Kuota Habis
              </p>
              <p className="text-lg font-black text-rose-700 leading-none mt-0.5">
                {kpis.emptyQuota}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("balances");
              setQuotaFilter("all");
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              activeTab === "balances" && quotaFilter === "all"
                ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 hover:border-primary/40"
            )}
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Total Peserta
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {kpis.totalMembers}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LeaveTab)}
        className="w-full space-y-4"
      >
        <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1 w-full sm:w-fit shadow-sm">
          <TabsTrigger
            value="pending"
            className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2 gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Antrean ({kpis.pending})
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2 gap-1.5"
          >
            <Coffee className="w-3.5 h-3.5" />
            Sedang Cuti ({kpis.onLeave})
          </TabsTrigger>
          <TabsTrigger
            value="balances"
            className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2 gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Info Saldo ({kpis.totalMembers})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENDING REQUESTS */}
        <TabsContent value="pending" className="mt-0 outline-none">
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b bg-slate-50/70 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  Antrean Permohonan Cuti
                </CardTitle>
                <CardDescription className="text-xs">
                  Menyetujui permohonan akan otomatis memotong 1 kuota cuti &amp; membekukan akses sementara.
                </CardDescription>
              </div>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-black text-[10px]">
                {kpis.pending} MENUNGGU
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {isRequestsLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="text-xs font-bold text-muted-foreground">
                    Memuat antrean cuti...
                  </p>
                </div>
              ) : (requests || []).length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                  <p className="text-sm font-bold text-slate-700">
                    Antrean Kosong
                  </p>
                  <p className="text-xs">
                    Belum ada permohonan cuti baru yang menunggu verifikasi.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                          Thalibah
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Periode Cuti
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Tanggal Pengajuan
                        </TableHead>
                        <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                          Aksi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(requests || []).map((req: any) => (
                        <TableRow
                          key={req.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <TableCell className="py-3.5 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-slate-900 truncate">
                                  {req.user_name}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {req.user_email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className="w-fit bg-primary/5 text-primary border-primary/20 font-bold text-[10px]"
                              >
                                {req.billing_month || "Custom"}
                              </Badge>
                              {req.metadata?.leave_from && req.metadata?.leave_until && (
                                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(
                                    new Date(req.metadata.leave_from),
                                    "dd MMM",
                                    { locale: idLocale }
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(req.metadata.leave_until),
                                    "dd MMM yyyy",
                                    { locale: idLocale }
                                  )}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {format(
                                new Date(req.created_at),
                                "dd MMM yyyy",
                                { locale: idLocale }
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs rounded-xl"
                                onClick={() => handleReject(req)}
                                disabled={isProcessing === req.id}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Tolak
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm"
                                onClick={() => handleApprove(req)}
                                disabled={isProcessing === req.id}
                              >
                                {isProcessing === req.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Setujui
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ACTIVE LEAVE */}
        <TabsContent value="active" className="mt-0 outline-none">
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b bg-emerald-50/60 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-emerald-900">
                  Thalibah Sedang Cuti
                </CardTitle>
                <CardDescription className="text-xs">
                  Akses ayat dibekukan sementara hingga tanggal selesai cuti atau diaktifkan kembali oleh admin.
                </CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white font-black text-[10px]">
                {kpis.onLeave} CUTI
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {isActiveLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  <p className="text-xs font-bold text-muted-foreground">
                    Memuat data peserta cuti...
                  </p>
                </div>
              ) : (activeLeave || []).length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center gap-2 text-muted-foreground">
                  <Coffee className="w-9 h-9 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">
                    Tidak Ada Peserta yang Sedang Cuti
                  </p>
                  <p className="text-xs">
                    Semua peserta Mufradat saat ini dalam status belajar aktif.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                          Thalibah
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Batch / Grup
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Cuti Hingga
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Sisa Kuota
                        </TableHead>
                        <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                          Aksi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activeLeave || []).map((usr: any) => (
                        <TableRow
                          key={usr.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <TableCell className="py-3.5 pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-900">
                                {usr.full_name || usr.username}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {usr.whatsapp || usr.phone || usr.email || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-bold">
                              {groupMap[usr.mufradat_group_id] || "Tanpa Grup"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700">
                            {usr.mufradat_leave_until
                              ? format(
                                  new Date(usr.mufradat_leave_until),
                                  "dd MMM yyyy",
                                  { locale: idLocale }
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-black text-primary">
                              {usr.mufradat_leave_balance ?? 3} / 3
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing === usr.id}
                              onClick={() => handleReactivateUser(usr)}
                              className="h-8 px-3 rounded-xl text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                              {isProcessing === usr.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Aktifkan Kembali
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LEAVE BALANCES */}
        <TabsContent value="balances" className="mt-0 space-y-4 outline-none">
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all", label: `Semua (${kpis.totalMembers})` },
                    { key: "empty", label: `Kuota Habis (${kpis.emptyQuota})` },
                    {
                      key: "available",
                      label: `Tersedia (${kpis.totalMembers - kpis.emptyQuota})`,
                    },
                  ] as const
                ).map((qf) => (
                  <Button
                    key={qf.key}
                    size="sm"
                    variant={quotaFilter === qf.key ? "default" : "outline"}
                    onClick={() => setQuotaFilter(qf.key)}
                    className={cn(
                      "text-[11px] font-black rounded-xl h-8",
                      quotaFilter === qf.key &&
                        "bg-primary hover:bg-[#580e33] text-white"
                    )}
                  >
                    {qf.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Select
                  value={selectedGroupId}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger className="w-full sm:w-48 h-9 border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Filter Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Semua Batch ({groups?.length || 0})
                    </SelectItem>
                    {(groups || []).map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari nama, WA, atau email..."
                    className="pl-8 h-9 bg-slate-50 border-slate-200 rounded-xl text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-0">
              {isMembersLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-16 text-center text-xs font-semibold text-muted-foreground">
                  Tidak ada peserta yang cocok dengan filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                          Thalibah
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Batch
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Saldo Cuti
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider">
                          Progress Kuota
                        </TableHead>
                        <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((usr: any) => {
                        const balance = usr.mufradat_leave_balance ?? 3;
                        return (
                          <TableRow
                            key={usr.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <TableCell className="py-3.5 pl-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-slate-900">
                                  {usr.full_name || usr.username}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {usr.email || usr.whatsapp || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[11px] font-semibold">
                                {groupMap[usr.mufradat_group_id] || "Tanpa Grup"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-black text-sm text-primary">
                                {balance}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 ml-1">
                                / 3 bln
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full transition-all",
                                    balance === 0
                                      ? "bg-rose-500"
                                      : balance >= 3
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  )}
                                  style={{
                                    width: `${Math.min((balance / 3) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge
                                className={cn(
                                  "font-black text-[10px] border-none uppercase",
                                  usr.mufradat_status === "active"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : usr.mufradat_status === "on_leave"
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                                )}
                              >
                                {usr.mufradat_status === "on_leave"
                                  ? "CUTI"
                                  : usr.mufradat_status || "INACTIVE"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compact Admin Note */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-start gap-3">
        <Coffee className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-900/80 leading-relaxed">
          <strong className="font-bold text-emerald-900">Catatan Kebijakan Cuti:</strong>{" "}
          Setiap thalibah mendapatkan jatah 3x cuti per program Hi Mufradat. Menyetujui pengajuan akan otomatis memotong 1 kuota, mempertahankan keanggotaan batch, dan membekukan akses ayat hingga masa cuti selesai atau diaktifkan kembali.
        </p>
      </div>
    </div>
  );
}
