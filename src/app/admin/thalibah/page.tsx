'use client';

import { useState, useMemo } from "react";
import { useUser, db } from "@/db";
import { useCollection } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Search, 
  Users, 
  BookOpen, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Loader2, 
  Calendar, 
  MessageCircle, 
  Phone,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  GraduationCap
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function formatWaLink(phone: string | undefined | null, greetingName?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
  else if (!normalized.startsWith('62')) normalized = '62' + normalized;
  const text = greetingName ? `?text=${encodeURIComponent(`Assalamu'alaikum Ukhti ${greetingName} 🌸`)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

const ITEMS_PER_PAGE = 20;

export default function AdminThalibahPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blacklisted">("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Blacklist Confirmation State
  const [blacklistTarget, setBlacklistTarget] = useState<any>(null);
  const [isBlacklistLoading, setIsBlacklistLoading] = useState(false);

  // Remove Registration Confirmation State
  const [removeTarget, setRemoveTarget] = useState<{ regId: string; title: string } | null>(null);
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);

  // Fetch all users
  const { data: allUsers, isLoading: isUsersLoading, refresh: refreshUsers } = useCollection("users");

  // Fetch all registrations
  const { data: allRegistrations, isLoading: isRegistrationsLoading, refresh: refreshRegistrations } = useCollection("halaqah_registrations");

  // Fetch all halaqahs/classes
  const { data: allHalaqahs } = useCollection("halaqahs");

  // Filter and process thalibah data
  const thalibahData = useMemo(() => {
    if (!allUsers || !allRegistrations) return [];

    const learners = allUsers.filter(u => u.role_id === 'learner' || !u.role_id);

    return learners.map(learner => {
      const userRegs = allRegistrations.filter(r => r.user_id === learner.id && ['active', 'verified'].includes(r.status));
      const programs = userRegs.map(r => ({
        id: r.id,
        halaqah_id: r.halaqah_id,
        halaqah_title: r.halaqah_title,
        program_type: allHalaqahs?.find(h => h.id === r.halaqah_id)?.program_type || (r.halaqah_id?.includes('tikrar') ? 'tikrar_daily' : (r.halaqah_id?.includes('mufradat') ? 'hi_mufradat' : 'hi_ngaji')),
        joined_at: r.verified_at || r.created_at,
        is_paid: r.is_paid,
        payment_method: r.payment_method,
      }));

      return {
        ...learner,
        activePrograms: programs,
        totalPrograms: programs.length,
      };
    });
  }, [allUsers, allRegistrations, allHalaqahs]);

  // Unique program types
  const programTypes = useMemo(() => {
    const types = new Set<string>();
    thalibahData.forEach(t => {
      t.activePrograms.forEach((p: any) => {
        if (p.program_type) types.add(p.program_type);
      });
    });
    return Array.from(types);
  }, [thalibahData]);

  // KPI Stats
  const kpiStats = useMemo(() => {
    return {
      total: thalibahData.length,
      active: thalibahData.filter((t: any) => !t.is_blacklisted).length,
      blacklisted: thalibahData.filter((t: any) => t.is_blacklisted).length,
      inPrograms: thalibahData.filter((t: any) => t.totalPrograms > 0).length,
    };
  }, [thalibahData]);

  // Filter thalibah
  const filteredThalibah = useMemo(() => {
    return thalibahData.filter(thalibah => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        thalibah.username?.toLowerCase().includes(q) ||
        thalibah.full_name?.toLowerCase().includes(q) ||
        thalibah.email?.toLowerCase().includes(q) ||
        thalibah.whatsapp?.includes(q) ||
        thalibah.phone?.includes(q);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "blacklisted" && thalibah.is_blacklisted) ||
        (filterStatus === "active" && !thalibah.is_blacklisted);

      const matchesProgram =
        filterProgram === "all" ||
        thalibah.activePrograms.some((p: any) => p.program_type === filterProgram);

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [thalibahData, searchQuery, filterStatus, filterProgram]);

  // Pagination
  const totalPages = Math.ceil((filteredThalibah.length || 1) / ITEMS_PER_PAGE);
  const paginatedThalibah = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredThalibah.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredThalibah, currentPage]);

  const handleConfirmToggleBlacklist = async () => {
    if (!blacklistTarget) return;

    setIsBlacklistLoading(true);
    try {
      const newStatus = !blacklistTarget.is_blacklisted;
      const { error } = await db
        .from("users")
        .update({ is_blacklisted: newStatus, updated_at: new Date().toISOString() })
        .eq('id', blacklistTarget.id);

      if (error) throw error;

      toast({
        title: newStatus ? "Thalibah Di-Blacklist ⚠️" : "Thalibah Diaktifkan ✅",
        description: `${blacklistTarget.username || blacklistTarget.full_name} statusnya sekarang ${newStatus ? 'di-blacklist' : 'aktif'}.`,
      });
      setBlacklistTarget(null);
      refreshUsers();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal update status",
        description: e.message,
      });
    } finally {
      setIsBlacklistLoading(false);
    }
  };

  const handleConfirmRemoveFromProgram = async () => {
    if (!removeTarget) return;

    setIsRemoveLoading(true);
    try {
      const { error } = await db
        .from("halaqah_registrations")
        .delete()
        .eq('id', removeTarget.regId);

      if (error) throw error;

      toast({
        title: "Akses Program Dihapus",
        description: `Thalibah telah dikeluarkan dari program ${removeTarget.title}.`,
      });

      setRemoveTarget(null);
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          activePrograms: selectedUser.activePrograms.filter((p: any) => p.id !== removeTarget.regId)
        });
      }
      refreshRegistrations();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: e.message,
      });
    } finally {
      setIsRemoveLoading(false);
    }
  };

  const refreshAll = () => {
    refreshUsers();
    refreshRegistrations();
  };

  if (isUsersLoading || isRegistrationsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Direktori Thalibah...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-28">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-primary font-bold">Dashboard Admin</Link>
            <span>/</span>
            <Link href="/admin/users" className="hover:text-primary font-bold">Database Pengguna</Link>
            <span>/</span>
            <span className="text-primary font-bold">Direktori Thalibah</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-slate-900 flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-primary" />
            Direktori Thalibah & Blacklist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daftar santriwati / thalibah terdaftar, program yang diikuti, komunikasi WhatsApp, dan kontrol status blacklist.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center border rounded-xl overflow-hidden bg-slate-100 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 px-2.5 rounded-lg text-xs font-bold", viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-500")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Kartu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("h-8 px-2.5 rounded-lg text-xs font-bold", viewMode === "table" ? "bg-white shadow-sm text-primary" : "text-slate-500")}
            >
              <List className="w-3.5 h-3.5 mr-1" /> Tabel
            </Button>
          </div>

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
          onClick={() => { setFilterStatus('all'); setFilterProgram('all'); setCurrentPage(1); }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all",
            filterStatus === 'all' && filterProgram === 'all'
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Thalibah</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{kpiStats.total}</p>
        </button>

        <button
          onClick={() => { setFilterStatus('active'); setCurrentPage(1); }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all",
            filterStatus === 'active'
              ? "bg-emerald-50 border-emerald-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Status Aktif</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 mt-1">{kpiStats.active}</p>
        </button>

        <button
          onClick={() => { setFilterStatus('blacklisted'); setCurrentPage(1); }}
          className={cn(
            "p-3.5 rounded-2xl border text-left transition-all",
            filterStatus === 'blacklisted'
              ? "bg-rose-50 border-rose-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Blacklisted</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-900 mt-1">{kpiStats.blacklisted}</p>
        </button>

        <div className="p-3.5 rounded-2xl border bg-white border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Ikut Kelas Aktif</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-900 mt-1">{kpiStats.inPrograms}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari thalibah (nama, username, email, WhatsApp)..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select 
            value={filterStatus} 
            onValueChange={(v: any) => { setFilterStatus(v); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[140px] h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif Saja</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filterProgram} 
            onValueChange={(v) => { setFilterProgram(v); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[160px] h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Semua Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Program</SelectItem>
              {programTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type === 'hi_mufradat' ? 'Hi Mufradat' :
                   type === 'tikrar_daily' ? 'Hi Tikrar' :
                   type === 'hi_ngaji' ? 'Hi Ngaji' : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || filterStatus !== 'all' || filterProgram !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterProgram('all'); setCurrentPage(1); }}
              className="text-xs text-rose-600 font-bold h-10 px-2.5 rounded-xl hover:bg-rose-50"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Thalibah Content */}
      {filteredThalibah.length === 0 ? (
        <Card className="border-2 border-dashed rounded-3xl py-16 bg-white">
          <CardContent className="flex flex-col items-center justify-center text-center gap-2">
            <Users className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-700">Tidak ada thalibah ditemukan</p>
            <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau sesuaikan opsi filter.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedThalibah.map((thalibah: any) => {
            const waLink = formatWaLink(thalibah.whatsapp || thalibah.phone, thalibah.full_name || thalibah.username);
            return (
              <Card 
                key={thalibah.id} 
                className={cn(
                  "border rounded-2xl shadow-sm transition-all hover:shadow-md bg-white overflow-hidden",
                  thalibah.is_blacklisted && "bg-rose-50/40 border-rose-200"
                )}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  {/* Top: Info */}
                  <div className="flex items-start gap-3.5">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0",
                      thalibah.is_blacklisted 
                        ? "bg-rose-100 text-rose-700" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {(thalibah.full_name || thalibah.username || 'U')[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {thalibah.full_name || thalibah.username}
                        </span>
                        {thalibah.is_blacklisted ? (
                          <Badge className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0 border-none shrink-0">
                            BLACKLISTED
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0 border-none shrink-0">
                            AKTIF
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="text-[11px] truncate">{thalibah.email}</span>
                        {thalibah.username && (
                          <span className="text-[10px] text-slate-400 font-medium">@{thalibah.username}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {thalibah.created_at && (
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {format(new Date(thalibah.created_at), 'dd MMM yyyy')}
                          </span>
                        )}
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100"
                          >
                            <Phone className="w-3 h-3" />
                            {thalibah.whatsapp || thalibah.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Active Programs */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Program Yang Diikuti ({thalibah.totalPrograms})
                    </Label>
                    {thalibah.activePrograms.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum terdaftar di kelas aktif mana pun.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {thalibah.activePrograms.map((prog: any) => (
                          <Badge
                            key={prog.id}
                            className={cn(
                              "text-[9px] font-bold px-2 py-0.5 border-none flex items-center gap-1",
                              prog.program_type === 'hi_mufradat' ? "bg-emerald-100 text-emerald-800" :
                              prog.program_type === 'tikrar_daily' ? "bg-blue-100 text-blue-800" :
                              "bg-purple-100 text-purple-800"
                            )}
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[140px]">{prog.halaqah_title}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {waLink && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
                        >
                          <a href={waLink} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-3.5 h-3.5" /> Chat WA
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                        onClick={() => { setSelectedUser(thalibah); setIsDialogOpen(true); }}
                      >
                        Detail
                      </Button>
                    </div>

                    <Button
                      variant={thalibah.is_blacklisted ? "outline" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 rounded-xl text-xs font-bold",
                        thalibah.is_blacklisted
                          ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          : "text-rose-600 hover:bg-rose-50"
                      )}
                      onClick={() => setBlacklistTarget(thalibah)}
                    >
                      {thalibah.is_blacklisted ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Aktifkan
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Blacklist
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 pl-6">Thalibah</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Program Aktif</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedThalibah.map((thalibah: any) => {
                  const waLink = formatWaLink(thalibah.whatsapp || thalibah.phone, thalibah.full_name || thalibah.username);
                  return (
                    <TableRow key={thalibah.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell className="py-3 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                            thalibah.is_blacklisted ? "bg-rose-100 text-rose-700" : "bg-primary/10 text-primary"
                          )}>
                            {(thalibah.full_name || thalibah.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">
                              {thalibah.full_name || thalibah.username}
                            </span>
                            <span className="text-[10px] text-slate-400">{thalibah.email}</span>
                            {thalibah.whatsapp && (
                              <span className="text-[10px] text-emerald-600 font-bold">{thalibah.whatsapp}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        {thalibah.activePrograms.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Belum ada</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {thalibah.activePrograms.map((p: any) => (
                              <Badge key={p.id} variant="outline" className="text-[9px] font-bold">
                                {p.halaqah_title}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-3">
                        {thalibah.is_blacklisted ? (
                          <Badge className="bg-rose-600 text-white text-[8px] font-black border-none">BLACKLISTED</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black border-none">AKTIF</Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {waLink && (
                            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 rounded-lg">
                              <a href={waLink} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-bold text-slate-600 rounded-lg"
                            onClick={() => { setSelectedUser(thalibah); setIsDialogOpen(true); }}
                          >
                            Detail
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 px-2 text-xs font-bold rounded-lg",
                              thalibah.is_blacklisted ? "text-emerald-700" : "text-rose-600"
                            )}
                            onClick={() => setBlacklistTarget(thalibah)}
                          >
                            {thalibah.is_blacklisted ? 'Aktifkan' : 'Blacklist'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border shadow-sm">
          <span className="text-xs text-slate-500">
            Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredThalibah.length)} dari {filteredThalibah.length} thalibah
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold px-2 text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* DETAIL THALIBAH DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="w-5 h-5 text-primary" />
              Detail Data Thalibah
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap akun dan riwayat keikutsertaan program.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 py-3">
              {/* Profile Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400">Nama Lengkap</Label>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedUser.full_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400">Username</Label>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">@{selectedUser.username || '-'}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400">Status Akun</Label>
                  <div className="mt-0.5">
                    {selectedUser.is_blacklisted ? (
                      <Badge className="bg-rose-600 text-white text-[8px] font-black border-none">BLACKLISTED</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black border-none">AKTIF</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400">Email</Label>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400">Nomor WhatsApp</Label>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">{selectedUser.whatsapp || selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400">Tanggal Terdaftar</Label>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    {selectedUser.created_at ? format(new Date(selectedUser.created_at), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
              </div>

              {/* Programs Enrolled */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Daftar Program / Halaqah Aktif ({selectedUser.activePrograms?.length || 0})
                </Label>
                {selectedUser.activePrograms?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl border">
                    Thalibah ini belum terdaftar di program halaqah aktif.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.activePrograms.map((prog: any) => (
                      <div key={prog.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">{prog.halaqah_title}</p>
                          <p className="text-[10px] text-slate-400">
                            Bergabung: {prog.joined_at ? format(new Date(prog.joined_at), 'dd MMM yyyy') : '-'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-bold">
                            'Gratis'
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                            onClick={() => setRemoveTarget({ regId: prog.id, title: prog.halaqah_title })}
                            title="Keluarkan dari program"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedUser && formatWaLink(selectedUser.whatsapp || selectedUser.phone, selectedUser.full_name || selectedUser.username) && (
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 sm:mr-auto rounded-xl h-10 text-xs"
              >
                <a 
                  href={formatWaLink(selectedUser.whatsapp || selectedUser.phone, selectedUser.full_name || selectedUser.username)!} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-4 h-4" /> Hubungi di WhatsApp
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-10 text-xs font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM TOGGLE BLACKLIST */}
      <AlertDialog open={!!blacklistTarget} onOpenChange={(open) => !open && setBlacklistTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              {blacklistTarget?.is_blacklisted ? 'Aktifkan Kembali Thalibah?' : 'Konfirmasi Blacklist Thalibah'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blacklistTarget?.is_blacklisted
                ? `Apakah Anda yakin ingin memulihkan status aktif untuk ${blacklistTarget?.username || blacklistTarget?.full_name}? Thalibah akan dapat mengakses kembali seluruh fitur.`
                : `Apakah Anda yakin ingin mem-blacklist ${blacklistTarget?.username || blacklistTarget?.full_name}? Thalibah ini akan diblokir dari semua fitur dan latihan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlacklistLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleBlacklist}
              disabled={isBlacklistLoading}
              className={cn(
                "font-bold text-white",
                blacklistTarget?.is_blacklisted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {isBlacklistLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {blacklistTarget?.is_blacklisted ? 'Ya, Aktifkan' : 'Ya, Blacklist'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM REMOVE FROM PROGRAM */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              Keluarkan dari Program?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus akses thalibah dari kelas <strong>{removeTarget?.title}</strong>? Pendaftaran program ini akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoveLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveFromProgram}
              disabled={isRemoveLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isRemoveLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Keluarkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
