'use client';

import { useState, useMemo } from "react";
import { useCollection, authFetch, db, useUser } from "@/db";
import { useUserPermissions } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Users,
  Plus,
  Link as LinkIcon,
  ArrowLeft,
  Save,
  ExternalLink,
  Search,
  CheckCircle2,
  Zap,
  Eye,
  UserMinus,
  UserPlus,
  Trash2,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Edit3,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface GroupFormState {
  name: string;
  whatsapp_link: string;
  start_date: string;
  musyrifah_name: string;
  musyrifah_phone: string;
  muallimah_name: string;
  muallimah_phone: string;
  fonnte_group_id: string;
}

const EMPTY_FORM: GroupFormState = {
  name: "",
  whatsapp_link: "",
  start_date: new Date().toISOString().split("T")[0],
  musyrifah_name: "",
  musyrifah_phone: "",
  muallimah_name: "",
  muallimah_phone: "",
  fonnte_group_id: "",
};

export default function MufradatGroupsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { canDelete } = useUserPermissions(user?.id);

  const [search, setSearch] = useState("");
  const [capacityFilter, setCapacityFilter] = useState<"all" | "available" | "full">("all");
  const [isProcessing, setIsProcessing] = useState(false);

  // Create / Edit Group Dialog
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GroupFormState>(EMPTY_FORM);

  // View Members Dialog
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Delete Confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // WatZap group fetcher
  const [fonnteGroups, setFonnteGroups] = useState<any[]>([]);
  const [isFetchingFonnte, setIsFetchingFonnte] = useState(false);

  const groupsOptions = useMemo(
    () => ({ orderBy: { column: "created_at", ascending: true } }),
    []
  );
  const {
    data: groups,
    isLoading,
    refresh: refreshGroups,
  } = useCollection("mufradat_groups", groupsOptions);
  const { data: allUsers, refresh: refreshUsers } = useCollection("users");

  // Live accurate member counts per group from users table
  const liveMemberCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (allUsers || []).forEach((u: any) => {
      if (u.mufradat_group_id) {
        map.set(u.mufradat_group_id, (map.get(u.mufradat_group_id) || 0) + 1);
      }
    });
    return map;
  }, [allUsers]);

  const muallimahList = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .filter((u) => u.role_id === "muallimah")
      .map((u) => ({
        id: u.id,
        displayName: u.full_name || u.username || "Muallimah",
        phone: u.whatsapp || u.phone || "",
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers]);

  const musyrifahList = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .filter((u) => u.role_id === "musyrifah")
      .map((u) => ({
        id: u.id,
        displayName: u.full_name || u.username || "Musyrifah",
        phone: u.whatsapp || u.phone || "",
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers]);

  const groupMembers = useMemo(() => {
    if (!viewingGroupId || !allUsers) return [];
    return allUsers
      .filter((u) => u.mufradat_group_id === viewingGroupId)
      .sort((a, b) =>
        String(a.full_name || a.username || "").localeCompare(
          String(b.full_name || b.username || "")
        )
      );
  }, [viewingGroupId, allUsers]);

  const ungroupedUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u) => !u.mufradat_group_id);
  }, [allUsers]);

  const availableUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return ungroupedUsers.filter((u) => {
      if (!q) return true;
      return (
        String(u.full_name || "").toLowerCase().includes(q) ||
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.whatsapp || u.phone || "").toLowerCase().includes(q)
      );
    });
  }, [ungroupedUsers, userSearch]);

  const enrichedGroups = useMemo(() => {
    return (groups || []).map((g: any) => {
      const liveCount = liveMemberCountMap.get(g.id) ?? g.member_count ?? 0;
      return { ...g, liveCount };
    });
  }, [groups, liveMemberCountMap]);

  const kpis = useMemo(() => {
    const totalBatches = enrichedGroups.length;
    const totalMembers = enrichedGroups.reduce((acc, g) => acc + g.liveCount, 0);
    const totalSlots = enrichedGroups.reduce(
      (acc, g) => acc + Math.max(0, 50 - g.liveCount),
      0
    );
    const fullBatches = enrichedGroups.filter((g) => g.liveCount >= 50).length;
    return { totalBatches, totalMembers, totalSlots, fullBatches };
  }, [enrichedGroups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedGroups.filter((g) => {
      if (capacityFilter === "full" && g.liveCount < 50) return false;
      if (capacityFilter === "available" && g.liveCount >= 50) return false;
      if (!q) return true;
      return (
        String(g.name || "").toLowerCase().includes(q) ||
        String(g.musyrifah_name || "").toLowerCase().includes(q) ||
        String(g.muallimah_name || "").toLowerCase().includes(q)
      );
    });
  }, [enrichedGroups, search, capacityFilter]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingGroupId(null);
    setFormState({
      ...EMPTY_FORM,
      start_date: new Date().toISOString().split("T")[0],
    });
  };

  const openEditDialog = (group: any) => {
    setDialogMode("edit");
    setEditingGroupId(group.id);
    setFormState({
      name: group.name || "",
      whatsapp_link: group.whatsapp_link || "",
      start_date: group.start_date ? String(group.start_date).slice(0, 10) : "",
      musyrifah_name: group.musyrifah_name || "",
      musyrifah_phone: group.musyrifah_phone || "",
      muallimah_name: group.muallimah_name || "",
      muallimah_phone: group.muallimah_phone || "",
      fonnte_group_id: group.fonnte_group_id || "",
    });
  };

  const handleSubmitGroupForm = async () => {
    if (!formState.name.trim()) {
      toast({ variant: "destructive", title: "Nama batch/grup wajib diisi" });
      return;
    }

    setIsProcessing(true);
    try {
      if (dialogMode === "create") {
        const { error } = await db.from("mufradat_groups").insert({
          name: formState.name.trim(),
          whatsapp_link: formState.whatsapp_link.trim() || null,
          member_count: 0,
          start_date: formState.start_date || null,
          musyrifah_name: formState.musyrifah_name.trim() || null,
          musyrifah_phone: formState.musyrifah_phone.trim() || null,
          muallimah_name: formState.muallimah_name.trim() || null,
          muallimah_phone: formState.muallimah_phone.trim() || null,
          fonnte_group_id: formState.fonnte_group_id.trim() || null,
        });
        if (error) throw error;
        toast({
          title: "Batch Baru Dibuat",
          description: `${formState.name} berhasil ditambahkan.`,
        });
      } else if (dialogMode === "edit" && editingGroupId) {
        const { error } = await db
          .from("mufradat_groups")
          .update({
            name: formState.name.trim(),
            whatsapp_link: formState.whatsapp_link.trim() || null,
            start_date: formState.start_date || null,
            musyrifah_name: formState.musyrifah_name.trim() || null,
            musyrifah_phone: formState.musyrifah_phone.trim() || null,
            muallimah_name: formState.muallimah_name.trim() || null,
            muallimah_phone: formState.muallimah_phone.trim() || null,
            fonnte_group_id: formState.fonnte_group_id.trim() || null,
          })
          .eq("id", editingGroupId);
        if (error) throw error;
        toast({
          title: "Batch Diperbarui",
          description: `Detail ${formState.name} berhasil disimpan.`,
        });
      }
      setDialogMode(null);
      await refreshGroups();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan batch",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const syncGroupMemberCount = async (groupId: string) => {
    const { data: members } = await db
      .from("users")
      .select("id")
      .eq("mufradat_group_id", groupId);
    await db
      .from("mufradat_groups")
      .update({ member_count: members?.length || 0 })
      .eq("id", groupId);
  };

  const handleRemoveMember = async (userId: string, groupId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await db
        .from("users")
        .update({ mufradat_group_id: null })
        .eq("id", userId);
      if (error) throw error;

      await syncGroupMemberCount(groupId);
      await Promise.all([refreshGroups(), refreshUsers()]);
      toast({
        title: "Peserta Dikeluarkan",
        description: "Peserta berhasil dikeluarkan dari batch ini.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal mengeluarkan peserta",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinGroup = async (userId: string, groupId: string) => {
    const group = enrichedGroups.find((g) => g.id === groupId);
    if (group && group.liveCount >= 50) {
      toast({
        variant: "destructive",
        title: "Batch Penuh",
        description: "Maksimal 50 thalibah per batch.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await db
        .from("users")
        .update({ mufradat_group_id: groupId })
        .eq("id", userId);
      if (error) throw error;

      await syncGroupMemberCount(groupId);
      await Promise.all([refreshGroups(), refreshUsers()]);
      toast({
        title: "Peserta Ditambahkan",
        description: "Peserta berhasil dimasukkan ke batch ini.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menambahkan peserta",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFillGroupGaps = async () => {
    if (!enrichedGroups.length) {
      toast({
        variant: "destructive",
        title: "Belum Ada Batch",
        description: "Buat minimal satu batch terlebih dahulu.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: ungrouped, error: fetchErr } = await db
        .from("users")
        .select("id")
        .is("mufradat_group_id", null);

      if (fetchErr) throw fetchErr;
      if (!ungrouped || ungrouped.length === 0) {
        toast({
          title: "Semua Sudah Terdistribusi",
          description: "Tidak ada thalibah tanpa batch yang ditemukan.",
        });
        return;
      }

      const remainingUsers = [...ungrouped];
      let updatedCount = 0;

      for (const group of enrichedGroups) {
        if (remainingUsers.length === 0) break;
        const spaceAvailable = 50 - group.liveCount;
        if (spaceAvailable > 0) {
          const batchToMove = remainingUsers.splice(0, spaceAvailable);
          const userIds = batchToMove.map((u: any) => u.id);

          const { error: moveErr } = await db
            .from("users")
            .update({ mufradat_group_id: group.id })
            .in("id", userIds);
          if (moveErr) throw moveErr;

          await syncGroupMemberCount(group.id);
          updatedCount += userIds.length;
        }
      }

      await Promise.all([refreshGroups(), refreshUsers()]);
      toast({
        title: "Optimasi Slot Berhasil",
        description: `${updatedCount} thalibah telah dimasukkan ke slot batch yang masih kosong.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal Optimasi",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    setIsProcessing(true);
    try {
      const { error: memberErr } = await db
        .from("users")
        .update({ mufradat_group_id: null })
        .eq("mufradat_group_id", id);
      if (memberErr) throw memberErr;

      const { error: groupErr } = await db
        .from("mufradat_groups")
        .delete()
        .eq("id", id);
      if (groupErr) throw groupErr;

      setConfirmDeleteId(null);
      await Promise.all([refreshGroups(), refreshUsers()]);
      toast({
        title: "Batch Dihapus",
        description: "Batch telah dihapus dan anggotanya dilepas dari grup.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus batch",
        description: e.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchFonnteGroups = async () => {
    setIsFetchingFonnte(true);
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "fetch_groups" }),
      });
      const data = await res.json();
      if (data.success) {
        setFonnteGroups(data.groups || []);
        toast({
          title: "Daftar Grup WatZap Dimuat",
          description: `${data.groups?.length || 0} grup WhatsApp ditemukan.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menarik grup WatZap",
        description: e.message,
      });
    } finally {
      setIsFetchingFonnte(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Memuat Daftar Batch Hi Mufradat...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-20">
      {/* Header + KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#6D123F]">
            <Layers className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Manajemen Batch &amp; Grup WA Hi Mufradat
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Daftar Batch, Musyrifah &amp; Tautan Grup WA
          </h1>
          <p className="text-xs text-muted-foreground">
            Kelola kapasitas 50 thalibah per batch, tautan grup WhatsApp monitoring, serta penempatan peserta.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setCapacityFilter("all")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              capacityFilter === "all"
                ? "bg-[#6D123F]/5 border-[#6D123F]/40"
                : "bg-slate-50 border-slate-200 hover:border-[#6D123F]/40"
            )}
          >
            <div className="p-2 rounded-xl bg-[#6D123F]/10 text-[#6D123F]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500">Total Batch</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-0.5">
                {kpis.totalBatches}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border bg-blue-50/70 border-blue-200/80">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-blue-800">Total Anggota</p>
              <p className="text-lg font-black text-blue-700 leading-none mt-0.5">
                {kpis.totalMembers}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCapacityFilter("available")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              capacityFilter === "available"
                ? "bg-emerald-50 border-emerald-400"
                : "bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-400"
            )}
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-emerald-800">Slot Tersedia</p>
              <p className="text-lg font-black text-emerald-700 leading-none mt-0.5">
                {kpis.totalSlots}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCapacityFilter("full")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              capacityFilter === "full"
                ? "bg-amber-50 border-amber-400"
                : "bg-amber-50/70 border-amber-200/80 hover:border-amber-400"
            )}
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-amber-800">Batch Penuh</p>
              <p className="text-lg font-black text-amber-700 leading-none mt-0.5">
                {kpis.fullBatches}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "all", label: `Semua (${kpis.totalBatches})` },
                {
                  key: "available",
                  label: `Masih Ada Slot (${kpis.totalBatches - kpis.fullBatches})`,
                },
                { key: "full", label: `Penuh (${kpis.fullBatches})` },
              ] as const
            ).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={capacityFilter === f.key ? "default" : "outline"}
                onClick={() => setCapacityFilter(f.key)}
                className={cn(
                  "h-8 rounded-xl text-[11px] font-black",
                  capacityFilter === f.key && "bg-[#6D123F] hover:bg-[#580e33] text-white"
                )}
              >
                {f.label}
              </Button>
            ))}

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari batch, musyrifah, muallimah..."
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillGroupGaps}
              disabled={isProcessing}
              className="h-9 rounded-xl text-xs font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 gap-1.5"
              title="Isi otomatis slot kosong pada batch lama dari peserta yang belum masuk grup"
            >
              <Zap className="w-3.5 h-3.5" /> Tutup Lubang Slot
            </Button>
            <Button
              size="sm"
              onClick={openCreateDialog}
              className="h-9 rounded-xl text-xs font-black bg-[#6D123F] hover:bg-[#580e33] text-white shadow-sm gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Batch Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                    Nama Batch
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Kapasitas
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Musyrifah &amp; Muallimah
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    WhatsApp &amp; Bot ID
                  </TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-28 text-center text-xs text-muted-foreground"
                    >
                      Tidak ada batch yang cocok dengan filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group) => {
                    const isFull = group.liveCount >= 50;
                    const pct = Math.min((group.liveCount / 50) * 100, 100);
                    return (
                      <TableRow key={group.id} className="hover:bg-slate-50/70">
                        <TableCell className="py-4 pl-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-sm text-[#6D123F]">
                              {group.name}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {group.start_date
                                ? new Date(group.start_date).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Tanggal mulai belum diatur"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-800">
                              {group.liveCount}
                            </span>
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  isFull ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">/ 50</span>
                            {isFull && (
                              <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] font-black">
                                PENUH
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                Musyrifah:{" "}
                              </span>
                              <span className="font-bold text-slate-700">
                                {group.musyrifah_name || "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400">
                                Muallimah:{" "}
                              </span>
                              <span className="font-bold text-[#6D123F]">
                                {group.muallimah_name || "-"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <LinkIcon className="w-3 h-3 text-slate-400 shrink-0" />
                              {group.whatsapp_link ? (
                                <a
                                  href={group.whatsapp_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                                >
                                  Buka Grup WA <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  Link belum diatur
                                </span>
                              )}
                            </div>
                            {group.fonnte_group_id && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono text-slate-500 max-w-[180px] truncate"
                              >
                                Bot: {group.fonnte_group_id}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] font-bold rounded-xl"
                              onClick={() => {
                                setViewingGroupId(group.id);
                                setIsViewMembersOpen(true);
                                setIsAddingMember(false);
                                setUserSearch("");
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Anggota
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[11px] font-black text-[#6D123F] hover:bg-[#6D123F]/10 rounded-xl"
                            >
                              <Link href={`/admin/mufradat?groupId=${group.id}`}>Monitor</Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] font-bold rounded-xl"
                              onClick={() => openEditDialog(group)}
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            {canDelete() && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-xl"
                                onClick={() => setConfirmDeleteId(group.id)}
                                title="Hapus Batch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
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

      {/* CREATE / EDIT GROUP DIALOG */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-[#6D123F] text-white">
            <DialogTitle className="text-xl font-black uppercase">
              {dialogMode === "edit" ? "Edit Detail Batch" : "Tambah Batch Baru"}
            </DialogTitle>
            <DialogDescription className="text-white/75 text-xs">
              Lengkapi nama batch, pengajar, link invite WhatsApp, dan ID Grup WatZap.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Nama Batch *
                </label>
                <Input
                  placeholder="Contoh: Batch 5 - Ummahat"
                  value={formState.name}
                  onChange={(e) => setFormState((v) => ({ ...v, name: e.target.value }))}
                  className="h-10 rounded-xl text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={formState.start_date}
                  onChange={(e) =>
                    setFormState((v) => ({ ...v, start_date: e.target.value }))
                  }
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Link Invite Grup WhatsApp
              </label>
              <Input
                placeholder="https://chat.whatsapp.com/..."
                value={formState.whatsapp_link}
                onChange={(e) =>
                  setFormState((v) => ({ ...v, whatsapp_link: e.target.value }))
                }
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                WhatsApp Group ID (WatZap Bot)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: 1203630239485@g.us"
                  value={formState.fonnte_group_id}
                  onChange={(e) =>
                    setFormState((v) => ({ ...v, fonnte_group_id: e.target.value }))
                  }
                  className="h-10 rounded-xl font-mono text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchFonnteGroups}
                  className="h-10 px-3 rounded-xl"
                  title="Tarik daftar grup dari WatZap"
                >
                  {isFetchingFonnte ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {fonnteGroups.length > 0 && (
                <Select
                  onValueChange={(val) =>
                    setFormState((v) => ({ ...v, fonnte_group_id: val }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                    <SelectValue placeholder="Pilih dari daftar grup WatZap..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fonnteGroups.map((fg) => (
                      <SelectItem key={fg.id} value={fg.id} className="text-xs">
                        {fg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* Musyrifah */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Musyrifah
                </label>
                <Select
                  value={formState.musyrifah_name}
                  onValueChange={(value) => {
                    const selected = musyrifahList.find((m) => m.displayName === value);
                    setFormState((v) => ({
                      ...v,
                      musyrifah_name: value,
                      musyrifah_phone: selected?.phone || v.musyrifah_phone,
                    }));
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-white">
                    <SelectValue placeholder="Pilih Musyrifah" />
                  </SelectTrigger>
                  <SelectContent>
                    {musyrifahList.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        Tidak ada musyrifah
                      </div>
                    ) : (
                      musyrifahList.map((m) => (
                        <SelectItem key={m.id} value={m.displayName}>
                          {m.displayName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="No. WA Musyrifah"
                  value={formState.musyrifah_phone}
                  onChange={(e) =>
                    setFormState((v) => ({ ...v, musyrifah_phone: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Muallimah */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Muallimah
                </label>
                <Select
                  value={formState.muallimah_name}
                  onValueChange={(value) => {
                    const selected = muallimahList.find((m) => m.displayName === value);
                    setFormState((v) => ({
                      ...v,
                      muallimah_name: value,
                      muallimah_phone: selected?.phone || v.muallimah_phone,
                    }));
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-white">
                    <SelectValue placeholder="Pilih Muallimah" />
                  </SelectTrigger>
                  <SelectContent>
                    {muallimahList.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        Tidak ada muallimah
                      </div>
                    ) : (
                      muallimahList.map((m) => (
                        <SelectItem key={m.id} value={m.displayName}>
                          {m.displayName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="No. WA Muallimah"
                  value={formState.muallimah_phone}
                  onChange={(e) =>
                    setFormState((v) => ({ ...v, muallimah_phone: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmitGroupForm}
              className="w-full h-11 bg-[#6D123F] hover:bg-[#580e33] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md mt-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {dialogMode === "edit" ? "Simpan Perubahan" : "Simpan Batch Baru"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm p-6 text-center rounded-3xl border-none shadow-2xl">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-3">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Hapus Batch Ini?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Peserta di dalam batch ini tidak akan dihapus, namun statusnya akan menjadi tanpa grup.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-5">
            <Button
              variant="destructive"
              className="h-10 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700"
              onClick={() => confirmDeleteId && handleDeleteGroup(confirmDeleteId)}
              disabled={isProcessing}
            >
              Ya, Hapus Batch
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-slate-500 font-bold text-xs"
              onClick={() => setConfirmDeleteId(null)}
            >
              Batalkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW & MANAGE MEMBERS MODAL */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent className="max-w-xl max-h-[82vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-5 bg-slate-50 border-b">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-[#6D123F] font-black text-base">
                <Users className="w-5 h-5" />
                {isAddingMember
                  ? "Tambah Peserta ke Batch"
                  : `Anggota ${enrichedGroups.find((g) => g.id === viewingGroupId)?.name || ""} (${groupMembers.length}/50)`}
              </DialogTitle>
              <Button
                variant={isAddingMember ? "ghost" : "outline"}
                size="sm"
                onClick={() => setIsAddingMember(!isAddingMember)}
                className="h-8 font-bold text-xs gap-1.5 rounded-xl"
              >
                {isAddingMember ? (
                  <>
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> Tambah Manual
                  </>
                )}
              </Button>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Perubahan anggota otomatis menyinkronkan kapasitas batch.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/40">
            {isAddingMember ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, WA, atau email peserta tanpa batch..."
                    className="pl-9 h-10 bg-white rounded-xl text-xs"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  {availableUsers.length > 0 ? (
                    availableUsers.slice(0, 50).map((u) => (
                      <div
                        key={u.id}
                        className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.photo_url || u.avatar_url} />
                            <AvatarFallback className="text-xs font-black bg-[#6D123F] text-white">
                              {(u.full_name || u.username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {u.full_name || u.username || "Tanpa Nama"}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {u.whatsapp || u.phone || u.email}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinGroup(u.id, viewingGroupId!)}
                          disabled={isProcessing}
                          className="bg-[#6D123F] hover:bg-[#580e33] text-white font-bold text-xs h-8 px-3 rounded-xl shrink-0"
                        >
                          Tambah
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-white border border-dashed rounded-2xl text-xs text-muted-foreground">
                      Tidak ada peserta tanpa batch yang cocok.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {groupMembers.length > 0 ? (
                  groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.photo_url || member.avatar_url} />
                          <AvatarFallback className="bg-[#6D123F] text-white text-xs font-black">
                            {(member.full_name || member.username || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {member.full_name || member.username || "Tanpa Nama"}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {member.whatsapp || member.phone || member.email}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs h-8 rounded-xl gap-1 shrink-0"
                        onClick={() => handleRemoveMember(member.id, viewingGroupId!)}
                        disabled={isProcessing}
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Keluarkan
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-white border border-dashed rounded-2xl text-xs text-muted-foreground">
                    Belum ada thalibah di batch ini. Klik &ldquo;Tambah Manual&rdquo; untuk memasukkan peserta.
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
