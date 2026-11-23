'use client';

import { db, useCollection } from "@/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Search,
  ShieldCheck,
  Settings2,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Users,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AccessFilter = "all" | "missing_juz1" | "has_juz1";

export default function MufradatJuzAccessPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const usersOptions = useMemo(
    () => ({
      filters: [{ column: "mufradat_group_id", operator: "not_null", value: null }],
      orderBy: { column: "username", ascending: true },
    }),
    []
  );
  const groupsOptions = useMemo(
    () => ({ orderBy: { column: "name", ascending: true } }),
    []
  );

  const { data: users, isLoading, refresh } = useCollection("users", usersOptions);
  const { data: groups } = useCollection("mufradat_groups", groupsOptions);

  const groupMap = useMemo(() => {
    const map = new Map<string, string>();
    (groups || []).forEach((g: any) => map.set(g.id, g.name));
    return map;
  }, [groups]);

  const kpis = useMemo(() => {
    const list = users || [];
    const hasJuz1 = list.filter(
      (u) => Array.isArray(u.mufradat_accessible_juz) && u.mufradat_accessible_juz.includes(1)
    ).length;
    return {
      total: list.length,
      hasJuz1,
      missingJuz1: list.length - hasJuz1,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = searchTerm.trim().toLowerCase();
    return users
      .filter((u) => {
        if (groupFilter !== "all" && u.mufradat_group_id !== groupFilter) return false;
        const juzList = Array.isArray(u.mufradat_accessible_juz)
          ? u.mufradat_accessible_juz
          : [];
        if (accessFilter === "missing_juz1" && juzList.includes(1)) return false;
        if (accessFilter === "has_juz1" && !juzList.includes(1)) return false;
        if (!q) return true;
        return (
          String(u.full_name || "").toLowerCase().includes(q) ||
          String(u.username || "").toLowerCase().includes(q) ||
          String(u.email || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        String(a.full_name || a.username || "").localeCompare(
          String(b.full_name || b.username || "")
        )
      );
  }, [users, searchTerm, groupFilter, accessFilter]);

  // Auto-select first visible user when none selected
  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [selectedUserId, filteredUsers]);

  const selectedUser = useMemo(() => {
    return users?.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const updateUserJuzList = async (userId: string, nextList: number[], label: string) => {
    const target = users?.find((u) => u.id === userId);
    setIsSaving(userId);
    try {
      const sorted = Array.from(new Set(nextList)).sort((a, b) => a - b);
      const { error } = await db
        .from("users")
        .update({
          mufradat_accessible_juz: sorted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;
      await refresh();
      toast({
        title: "Hak Akses Diperbarui",
        description: `${label} untuk ${target?.full_name || target?.username || "peserta"} berhasil disimpan.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal memperbarui akses",
        description: err.message,
      });
    } finally {
      setIsSaving(null);
    }
  };

  const toggleJuz = async (userId: string, juzNum: number) => {
    const target = users?.find((u) => u.id === userId);
    if (!target) return;

    setIsSaving(`${userId}-${juzNum}`);
    let currentAccessible = Array.isArray(target.mufradat_accessible_juz)
      ? [...target.mufradat_accessible_juz]
      : [];

    if (currentAccessible.includes(juzNum)) {
      currentAccessible = currentAccessible.filter((j) => j !== juzNum);
    } else {
      currentAccessible.push(juzNum);
      currentAccessible.sort((a, b) => a - b);
    }

    try {
      const { error } = await db
        .from("users")
        .update({ mufradat_accessible_juz: currentAccessible })
        .eq("id", userId);
      if (error) throw error;

      await refresh();
      toast({
        title: "Akses Diperbarui",
        description: `Hak akses Juz ${juzNum} untuk ${target.full_name || target.username || "peserta"} telah diubah.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal memperbarui akses",
        description: err.message,
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleSyncJuz1All = async () => {
    setIsSaving("bulk-sync");
    try {
      const { data: mufradatUsers, error: fetchError } = await db
        .from("users")
        .select("id, mufradat_accessible_juz, username")
        .not("mufradat_group_id", "is", null);

      if (fetchError) throw fetchError;
      if (!mufradatUsers) return;

      const usersToUpdate = mufradatUsers.filter((u: any) => {
        const juzArray = Array.isArray(u.mufradat_accessible_juz)
          ? u.mufradat_accessible_juz
          : [];
        return !juzArray.includes(1);
      });

      if (usersToUpdate.length === 0) {
        toast({
          title: "Sudah Sinkron",
          description: "Semua thalibah terdaftar sudah memiliki akses Juz 1.",
        });
        return;
      }

      let successCount = 0;
      for (const u of usersToUpdate) {
        const current = Array.isArray(u.mufradat_accessible_juz)
          ? u.mufradat_accessible_juz
          : [];
        const { error: upError } = await db
          .from("users")
          .update({
            mufradat_accessible_juz: [1, ...current].sort((a, b) => a - b),
            updated_at: new Date().toISOString(),
          })
          .eq("id", u.id);
        if (!upError) successCount++;
      }

      await refresh();
      toast({
        title: "Sinkronisasi Berhasil",
        description: `${successCount} thalibah kini telah memiliki akses ke Juz 1.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Sinkronisasi",
        description: err.message,
      });
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Memuat Hak Akses Juz...
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
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Manajemen Konten Hi Mufradat
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Hak Akses Juz Peserta (Juz 1–30)
          </h1>
          <p className="text-xs text-muted-foreground">
            Buka atau kunci akses Juz per thalibah secara instan, atau sinkronkan akses Juz 1 secara massal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setAccessFilter("all")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              accessFilter === "all"
                ? "bg-primary/5 border-primary/40"
                : "bg-slate-50 border-slate-200 hover:border-primary/40"
            )}
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500">Total Peserta</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-0.5">
                {kpis.total}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccessFilter("missing_juz1")}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              accessFilter === "missing_juz1"
                ? "bg-amber-50 border-amber-400"
                : "bg-amber-50/70 border-amber-200 hover:border-amber-400"
            )}
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-amber-800">Belum Juz 1</p>
              <p className="text-lg font-black text-amber-700 leading-none mt-0.5">
                {kpis.missingJuz1}
              </p>
            </div>
          </button>

          <Button
            onClick={handleSyncJuz1All}
            disabled={isSaving === "bulk-sync"}
            className="bg-primary hover:bg-[#580e33] text-white font-black text-xs h-11 px-4 rounded-2xl shadow-sm gap-2"
          >
            {isSaving === "bulk-sync" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings2 className="w-4 h-4" />
            )}
            Sinkron Juz 1 Semua
          </Button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Filter + User List */}
        <div className="md:col-span-4 space-y-3">
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-3.5 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Cari nama atau email thalibah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                />
              </div>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-9 text-xs font-bold rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Filter Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Batch ({groups?.length || 0})</SelectItem>
                  {groups?.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[65vh] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                Tidak ada thalibah ditemukan pada filter ini.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const count = Array.isArray(u.mufradat_accessible_juz)
                  ? u.mufradat_accessible_juz.length
                  : 0;
                const isSelected = selectedUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      "w-full p-3.5 flex items-center justify-between transition-all text-left",
                      isSelected
                        ? "bg-primary/5 border-l-4 border-l-primary"
                        : "hover:bg-slate-50 border-l-4 border-l-transparent"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {u.full_name || u.username || "Tanpa Nama"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">
                          {groupMap.get(u.mufradat_group_id) || "Batch"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-4 px-1.5 font-black",
                            count > 0
                              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                              : "text-amber-700 border-amber-200 bg-amber-50"
                          )}
                        >
                          {count} Juz
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform",
                        isSelected ? "translate-x-0.5 text-primary" : "text-slate-300"
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Juz 1-30 Access Matrix */}
        <div className="md:col-span-8">
          {selectedUser ? (
            <div className="space-y-4">
              <Card className="border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
                <CardHeader className="bg-slate-900 text-white p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black leading-tight truncate">
                          {selectedUser.full_name || selectedUser.username}
                        </h2>
                        <p className="text-white/65 text-xs mt-0.5 truncate">
                          {selectedUser.email} •{" "}
                          {groupMap.get(selectedUser.mufradat_group_id) || "Batch Mufradat"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-8 text-[11px] font-bold rounded-xl"
                        onClick={() =>
                          updateUserJuzList(
                            selectedUser.id,
                            Array.from({ length: 30 }, (_, i) => i + 1),
                            "Semua Juz (1–30)"
                          )
                        }
                        disabled={isSaving === selectedUser.id}
                      >
                        Buka Semua (30)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-8 text-[11px] font-bold rounded-xl"
                        onClick={() =>
                          updateUserJuzList(
                            selectedUser.id,
                            [
                              ...(Array.isArray(selectedUser.mufradat_accessible_juz)
                                ? selectedUser.mufradat_accessible_juz
                                : []),
                              1,
                              29,
                              30,
                            ],
                            "Juz 1, 29, 30"
                          )
                        }
                        disabled={isSaving === selectedUser.id}
                      >
                        + Juz 1, 29, 30
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/10 border-white/20 text-white hover:bg-rose-600 hover:border-rose-600 h-8 text-[11px] font-bold rounded-xl"
                        onClick={() =>
                          updateUserJuzList(selectedUser.id, [], "Reset semua akses Juz")
                        }
                        disabled={isSaving === selectedUser.id}
                      >
                        Tutup Semua
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 bg-slate-50/50">
                  <p className="text-[11px] font-bold text-slate-500 mb-3">
                    Klik kartu Juz di bawah untuk langsung mengaktifkan atau mengunci akses:
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
                      const isActive = selectedUser.mufradat_accessible_juz?.includes(juz);
                      const key = `${selectedUser.id}-${juz}`;
                      const loading = isSaving === key;

                      return (
                        <button
                          key={juz}
                          type="button"
                          onClick={() => toggleJuz(selectedUser.id, juz)}
                          disabled={loading || isSaving === selectedUser.id}
                          className={cn(
                            "group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all h-20",
                            isActive
                              ? "bg-white border-primary text-primary shadow-sm scale-[1.01]"
                              : "bg-white/60 border-slate-200/70 text-slate-400 hover:border-slate-300 hover:bg-white"
                          )}
                        >
                          <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">
                            Juz
                          </span>
                          <span className="text-xl font-black leading-none mt-0.5">{juz}</span>
                          {loading ? (
                            <Loader2 className="absolute top-2 right-2 w-3 h-3 animate-spin opacity-60" />
                          ) : isActive ? (
                            <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-28 bg-white rounded-3xl border-2 border-dashed border-slate-200 gap-3">
              <BookOpen className="w-12 h-12 text-slate-300" />
              <p className="text-xs font-bold text-slate-500 text-center px-8">
                Pilih thalibah di sebelah kiri untuk mengelola hak akses Juz 1–30.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
