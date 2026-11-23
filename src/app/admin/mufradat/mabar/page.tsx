'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trophy,
  Clock,
  Calendar,
  Trash2,
  Play,
  StopCircle,
  Hash,
  Search,
  Users,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "pending" | "finished";

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultScheduledAt(): string {
  return toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000));
}

export default function AdminMabarManagementPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Create / Edit Dialog
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    juz_id: "30",
    scheduled_at: getDefaultScheduledAt(),
    duration_minutes: "60",
  });

  // Delete confirmation dialog
  const [deletingSession, setDeletingSession] = useState<any | null>(null);

  const sessionsOptions = useMemo(
    () => ({ orderBy: { column: "scheduled_at", ascending: false } }),
    []
  );
  const participantsOptions = useMemo(() => ({}), []);

  const {
    data: sessions,
    isLoading,
    refresh,
  } = useCollection("mufradat_mabar_sessions", sessionsOptions);
  const { data: participants } = useCollection(
    "mufradat_mabar_participants",
    participantsOptions
  );

  const participantCountBySession = useMemo(() => {
    const map: Record<string, number> = {};
    (participants || []).forEach((p: any) => {
      if (p.session_id) {
        map[p.session_id] = (map[p.session_id] || 0) + 1;
      }
    });
    return map;
  }, [participants]);

  const kpis = useMemo(() => {
    const list = sessions || [];
    return {
      total: list.length,
      active: list.filter((s: any) => s.status === "active").length,
      pending: list.filter((s: any) => s.status === "pending").length,
      finished: list.filter((s: any) => s.status === "finished").length,
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sessions || []).filter((s: any) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const titleMatch = String(s.title || "").toLowerCase().includes(q);
      const juzMatch = `juz ${s.juz_id}`.includes(q);
      return titleMatch || juzMatch;
    });
  }, [sessions, statusFilter, search]);

  const openCreateDialog = () => {
    setEditingSession(null);
    setFormState({
      title: "",
      juz_id: "30",
      scheduled_at: getDefaultScheduledAt(),
      duration_minutes: "60",
    });
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (session: any) => {
    setEditingSession(session);
    const parsedDate = session.scheduled_at
      ? new Date(session.scheduled_at)
      : new Date();
    setFormState({
      title: session.title || "",
      juz_id: String(session.juz_id || 30),
      scheduled_at: Number.isNaN(parsedDate.getTime())
        ? getDefaultScheduledAt()
        : toLocalDateTimeInput(parsedDate),
      duration_minutes: String(session.duration_minutes || 60),
    });
    setIsFormDialogOpen(true);
  };

  const handleSaveMabar = async () => {
    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      toast({ variant: "destructive", title: "Judul Mabar wajib diisi" });
      return;
    }

    const juzId = parseInt(formState.juz_id, 10);
    if (Number.isNaN(juzId) || juzId < 1 || juzId > 30) {
      toast({
        variant: "destructive",
        title: "Juz tidak valid",
        description: "Masukkan nomor Juz antara 1 sampai 30.",
      });
      return;
    }

    const durationMinutes = parseInt(formState.duration_minutes, 10);
    if (Number.isNaN(durationMinutes) || durationMinutes < 5) {
      toast({
        variant: "destructive",
        title: "Durasi tidak valid",
        description: "Durasi minimal adalah 5 menit.",
      });
      return;
    }

    const parsedSchedule = new Date(formState.scheduled_at);
    if (!formState.scheduled_at || Number.isNaN(parsedSchedule.getTime())) {
      toast({
        variant: "destructive",
        title: "Waktu pelaksanaan tidak valid",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        title: trimmedTitle,
        juz_id: juzId,
        scheduled_at: parsedSchedule.toISOString(),
        duration_minutes: durationMinutes,
      };

      if (editingSession) {
        const { error } = await db
          .from("mufradat_mabar_sessions")
          .update(payload)
          .eq("id", editingSession.id);
        if (error) throw error;
        toast({
          title: "Jadwal Diperbarui",
          description: `Sesi "${trimmedTitle}" berhasil diperbarui.`,
        });
      } else {
        const { error } = await db.from("mufradat_mabar_sessions").insert({
          ...payload,
          status: "pending",
        });
        if (error) throw error;
        toast({
          title: "Mabar Dijadwalkan",
          description: `Sesi "${trimmedTitle}" berhasil dibuat.`,
        });
      }

      setIsFormDialogOpen(false);
      setEditingSession(null);
      await refresh();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan sesi",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStatus = async (id: string, status: "active" | "finished" | "pending") => {
    setIsProcessing(true);
    try {
      const { error } = await db
        .from("mufradat_mabar_sessions")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      const label =
        status === "active"
          ? "Sedang Live"
          : status === "finished"
          ? "Selesai"
          : "Terjadwal";
      toast({
        title: "Status Diperbarui",
        description: `Sesi kini berstatus ${label}.`,
      });
      await refresh();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal update status",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteSession = async () => {
    if (!deletingSession) return;
    setIsProcessing(true);
    try {
      const { error } = await db
        .from("mufradat_mabar_sessions")
        .delete()
        .eq("id", deletingSession.id);

      if (error) throw error;
      toast({
        title: "Sesi Dihapus",
        description: `Sesi "${deletingSession.title}" telah dihapus.`,
      });
      setDeletingSession(null);
      await refresh();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus sesi",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Menyiapkan Ruang Mabar...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-20">
      {/* Header + Clickable KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Kompetisi Hafalan Realtime Hi Mufradat
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Jadwal &amp; Kontrol Sesi Mabar
          </h1>
          <p className="text-xs text-muted-foreground">
            Jadwalkan kompetisi hafalan bersama, mulai atau akhiri sesi secara live, dan pantau jumlah peserta per ruangan.
          </p>
        </div>

        {/* Clickable KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "all"
                ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-white/10 hover:border-primary/40"
            )}
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Total Sesi
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {kpis.total}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "active"
                ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 hover:border-emerald-400"
            )}
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                Sedang Live
              </p>
              <p className="text-lg font-black text-emerald-700 leading-none mt-0.5">
                {kpis.active}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "pending"
                ? "bg-amber-50 border-amber-400 ring-1 ring-amber-300"
                : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 hover:border-amber-400"
            )}
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-800">
                Terjadwal
              </p>
              <p className="text-lg font-black text-amber-700 leading-none mt-0.5">
                {kpis.pending}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("finished")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "finished"
                ? "bg-slate-100 border-slate-400 ring-1 ring-slate-300"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 hover:border-slate-400"
            )}
          >
            <div className="p-2 rounded-xl bg-slate-200/80 text-slate-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                Selesai
              </p>
              <p className="text-lg font-black text-slate-700 dark:text-slate-200 leading-none mt-0.5">
                {kpis.finished}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Filter & Actions Toolbar */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "all", label: `Semua (${kpis.total})` },
                { key: "active", label: `Live (${kpis.active})` },
                { key: "pending", label: `Terjadwal (${kpis.pending})` },
                { key: "finished", label: `Selesai (${kpis.finished})` },
              ] as const
            ).map((st) => (
              <Button
                key={st.key}
                size="sm"
                variant={statusFilter === st.key ? "default" : "outline"}
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  "text-[11px] font-black rounded-xl h-8",
                  statusFilter === st.key &&
                    "bg-primary hover:bg-[#580e33] text-white"
                )}
              >
                {st.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari judul atau juz..."
                className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bold text-xs border-slate-200"
            >
              <Link href="/mufradat/mabar">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Halaman Mabar
              </Link>
            </Button>

            <Button
              onClick={openCreateDialog}
              size="sm"
              className="h-9 bg-primary hover:bg-[#580e33] text-white font-black text-xs px-4 rounded-xl shadow-sm gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Jadwalkan Mabar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Detail Sesi
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Juz Fokus
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Waktu Pelaksanaan
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Peserta
                  </TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Trophy className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-bold">
                          {sessions?.length === 0
                            ? "Belum ada sesi Mabar yang dijadwalkan."
                            : "Tidak ada sesi yang cocok dengan filter ini."}
                        </p>
                        {sessions?.length === 0 && (
                          <Button
                            size="sm"
                            onClick={openCreateDialog}
                            className="mt-1 bg-primary hover:bg-[#580e33] text-white rounded-xl text-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Buat Sesi Pertama
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session: any) => {
                    const count = participantCountBySession[session.id] || 0;
                    const parsedDate = session.scheduled_at
                      ? new Date(session.scheduled_at)
                      : null;
                    const formattedDate =
                      parsedDate && !Number.isNaN(parsedDate.getTime())
                        ? format(parsedDate, "eeee, d MMM yyyy • HH:mm", {
                            locale: idLocale,
                          })
                        : "-";

                    return (
                      <TableRow
                        key={session.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <TableCell className="pl-6">
                          {session.status === "active" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-black text-[10px] uppercase gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                              LIVE
                            </Badge>
                          ) : session.status === "pending" ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-black text-[10px] uppercase">
                              TERJADWAL
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none font-black text-[10px] uppercase">
                              SELESAI
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {session.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              Durasi: {session.duration_minutes || 60} menit
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-bold text-xs text-primary border-primary/20 bg-primary/5 gap-1"
                          >
                            <Hash className="w-3 h-3" />
                            Juz {session.juz_id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-[11px] font-bold rounded-xl border-slate-200"
                              title="Buka ruangan Mabar"
                            >
                              <Link href={`/mufradat/mabar/${session.id}`}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1 text-primary" />
                                Room
                              </Link>
                            </Button>

                            {session.status === "pending" && (
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-[11px] font-black px-3 rounded-xl"
                                onClick={() => updateStatus(session.id, "active")}
                              >
                                <Play className="w-3.5 h-3.5 mr-1" /> Mulai
                              </Button>
                            )}

                            {session.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                className="border-rose-300 text-rose-700 hover:bg-rose-50 h-8 text-[11px] font-black px-3 rounded-xl"
                                onClick={() =>
                                  updateStatus(session.id, "finished")
                                }
                              >
                                <StopCircle className="w-3.5 h-3.5 mr-1" />{" "}
                                Akhiri
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isProcessing}
                              className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl"
                              onClick={() => openEditDialog(session)}
                              title="Edit Jadwal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isProcessing}
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-xl"
                              onClick={() => setDeletingSession(session)}
                              title="Hapus Sesi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unified Create / Edit Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {editingSession ? "Edit Sesi Mabar" : "Jadwalkan Sesi Mabar"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Waktu pelaksanaan mengikuti zona waktu perangkat Anda (WIB/lokal).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Nama Sesi Mabar
              </Label>
              <Input
                placeholder="Contoh: Mabar Malam Minggu Juz 30"
                value={formState.title}
                onChange={(e) =>
                  setFormState((v) => ({ ...v, title: e.target.value }))
                }
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Juz Fokus (1-30)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={formState.juz_id}
                  onChange={(e) =>
                    setFormState((v) => ({ ...v, juz_id: e.target.value }))
                  }
                  className="h-10 font-bold rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Durasi (Menit)
                </Label>
                <Input
                  type="number"
                  min={5}
                  value={formState.duration_minutes}
                  onChange={(e) =>
                    setFormState((v) => ({
                      ...v,
                      duration_minutes: e.target.value,
                    }))
                  }
                  className="h-10 font-bold rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Waktu Mulai (Waktu Lokal)
              </Label>
              <Input
                type="datetime-local"
                value={formState.scheduled_at}
                onChange={(e) =>
                  setFormState((v) => ({ ...v, scheduled_at: e.target.value }))
                }
                className="h-10 font-semibold rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFormDialogOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveMabar}
              disabled={isProcessing}
              className="bg-primary hover:bg-[#580e33] text-white font-black text-xs rounded-xl px-5"
            >
              {isProcessing && (
                <Loader2 className="animate-spin w-3.5 h-3.5 mr-1.5" />
              )}
              {editingSession ? "Simpan Perubahan" : "Jadwalkan Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingSession)}
        onOpenChange={(open) => !open && setDeletingSession(null)}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-700">
              Hapus Sesi Mabar?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sesi <strong>{deletingSession?.title}</strong> beserta data
              partisipannya akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingSession(null)}
              className="rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSession}
              disabled={isProcessing}
              className="rounded-xl text-xs font-black"
            >
              {isProcessing && (
                <Loader2 className="animate-spin w-3.5 h-3.5 mr-1.5" />
              )}
              Ya, Hapus Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
