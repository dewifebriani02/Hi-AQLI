'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCollection } from "@/db";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  GraduationCap,
  CheckCircle2,
  TrendingUp,
  Activity,
  Loader2,
  Zap,
  Search,
  BarChart3,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BATCH_CAPACITY = 50;

type SortKey = "name" | "members_desc" | "activity_desc" | "slots_desc";

export default function MufradatReportsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const groupsOptions = useMemo(
    () => ({ orderBy: { column: "name", ascending: true } }),
    []
  );
  const usersOptions = useMemo(() => ({}), []);
  const attemptsOptions = useMemo(() => ({}), []);

  const { data: groups, isLoading: loadingGroups } = useCollection(
    "mufradat_groups",
    groupsOptions
  );
  const { data: users, isLoading: loadingUsers } = useCollection(
    "users",
    usersOptions
  );
  const { data: attempts, isLoading: loadingAttempts } = useCollection(
    "quiz_attempts",
    attemptsOptions
  );

  const analytics = useMemo(() => {
    const safeGroups = groups || [];
    const safeUsers = users || [];
    const safeAttempts = attempts || [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Map user -> group_id
    const userGroupMap = new Map<string, string>();
    const membersByGroup = new Map<string, any[]>();

    safeUsers.forEach((u: any) => {
      if (u.mufradat_group_id) {
        userGroupMap.set(u.id, u.mufradat_group_id);
        const list = membersByGroup.get(u.mufradat_group_id) || [];
        list.push(u);
        membersByGroup.set(u.mufradat_group_id, list);
      }
    });

    const passedByGroup = new Map<string, number>();
    const recent7dByGroup = new Map<string, number>();
    const activeUsers7dByGroup = new Map<string, Set<string>>();
    const globalActiveUsers7d = new Set<string>();

    let totalPassed = 0;
    let totalRecent7d = 0;

    safeAttempts.forEach((a: any) => {
      const gid = a.group_id || userGroupMap.get(a.user_id);
      const isRecent = a.created_at && new Date(a.created_at) > sevenDaysAgo;

      if (a.is_passed) {
        totalPassed += 1;
        if (gid) {
          passedByGroup.set(gid, (passedByGroup.get(gid) || 0) + 1);
        }
      }

      if (isRecent) {
        totalRecent7d += 1;
        if (a.user_id) globalActiveUsers7d.add(a.user_id);
        if (gid) {
          recent7dByGroup.set(gid, (recent7dByGroup.get(gid) || 0) + 1);
          if (a.user_id) {
            if (!activeUsers7dByGroup.has(gid)) {
              activeUsers7dByGroup.set(gid, new Set());
            }
            activeUsers7dByGroup.get(gid)!.add(a.user_id);
          }
        }
      }
    });

    const groupRows = safeGroups.map((g: any) => {
      const members = membersByGroup.get(g.id) || [];
      const liveCount = members.length;
      const onLeaveCount = members.filter(
        (m: any) => m.mufradat_status === "on_leave"
      ).length;
      const activeCount = members.filter(
        (m: any) =>
          m.mufradat_status !== "on_leave" && m.mufradat_status !== "inactive"
      ).length;

      const percent = Math.min((liveCount / MAX_BATCH_CAPACITY) * 100, 100);
      const availableSlots = Math.max(MAX_BATCH_CAPACITY - liveCount, 0);
      const passedQuizzes = passedByGroup.get(g.id) || 0;
      const recent7dAttempts = recent7dByGroup.get(g.id) || 0;
      const activeUsers7d = activeUsers7dByGroup.get(g.id)?.size || 0;
      const dbCountMismatch = (g.member_count ?? 0) !== liveCount;

      return {
        ...g,
        liveCount,
        activeCount,
        onLeaveCount,
        percent,
        availableSlots,
        passedQuizzes,
        recent7dAttempts,
        activeUsers7d,
        dbCountMismatch,
      };
    });

    const totalEnrolled = safeUsers.filter((u: any) =>
      Boolean(u.mufradat_group_id)
    ).length;
    const totalCapacity = safeGroups.length * MAX_BATCH_CAPACITY;
    const avgUtilization =
      totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
    const underfilledCount = groupRows.filter(
      (g) => g.liveCount < MAX_BATCH_CAPACITY
    ).length;

    return {
      totalEnrolled,
      totalGroups: safeGroups.length,
      avgUtilization,
      totalPassed,
      totalRecent7d,
      globalActiveUsers7d: globalActiveUsers7d.size,
      underfilledCount,
      groupRows,
    };
  }, [groups, users, attempts]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = analytics.groupRows.filter((g) =>
      !q ? true : String(g.name || "").toLowerCase().includes(q)
    );

    return [...list].sort((a, b) => {
      if (sortBy === "members_desc") return b.liveCount - a.liveCount;
      if (sortBy === "activity_desc")
        return b.recent7dAttempts - a.recent7dAttempts;
      if (sortBy === "slots_desc") return b.availableSlots - a.availableSlots;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [analytics.groupRows, search, sortBy]);

  if (loadingGroups || loadingUsers || loadingAttempts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Menganalisis Data Performa...
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
            <BarChart3 className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Analitik &amp; Laporan Kinerja Hi Mufradat
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Utilisasi Batch &amp; Aktivitas Belajar Realtime
          </h1>
          <p className="text-xs text-muted-foreground">
            Dihitung langsung dari keanggotaan aktif dan riwayat kuis lulus per batch (maksimal {MAX_BATCH_CAPACITY} peserta/batch).
          </p>
        </div>

        {/* KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border bg-[#6D123F]/5 border-[#6D123F]/20">
            <div className="p-2 rounded-xl bg-[#6D123F]/10 text-[#6D123F]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Peserta Batch
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {analytics.totalEnrolled}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 border-slate-200/80">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Batch ({analytics.avgUtilization}%)
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {analytics.totalGroups}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border bg-emerald-50/70 border-emerald-200/80">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                Kuis Lulus
              </p>
              <p className="text-lg font-black text-emerald-700 leading-none mt-0.5">
                {analytics.totalPassed}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border bg-sky-50/70 border-sky-200/80">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-sky-800">
                7 Hari ({analytics.globalActiveUsers7d} org)
              </p>
              <p className="text-lg font-black text-sky-700 leading-none mt-0.5">
                {analytics.totalRecent7d}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama batch..."
                className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortKey)}
            >
              <SelectTrigger className="w-full sm:w-52 h-9 border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700">
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Urut: Nama Batch (A-Z)</SelectItem>
                <SelectItem value="members_desc">
                  Urut: Anggota Terbanyak
                </SelectItem>
                <SelectItem value="activity_desc">
                  Urut: Paling Aktif (7 Hari)
                </SelectItem>
                <SelectItem value="slots_desc">
                  Urut: Slot Kosong Terbanyak
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            asChild
            size="sm"
            className="h-9 bg-[#6D123F] hover:bg-[#580e33] text-white font-black text-xs px-4 rounded-xl shadow-sm"
          >
            <Link href="/admin/mufradat/groups">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Kelola Batch &amp; Tutup Lubang
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Group Utilization & Performance Table */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b bg-slate-50/70 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-slate-900">
              Utilisasi Kapasitas &amp; Performa per Batch
            </CardTitle>
            <CardDescription className="text-xs">
              Klik <strong>Monitor</strong> untuk melihat progres detail peserta dalam batch tersebut.
            </CardDescription>
          </div>
          <TrendingUp className="w-5 h-5 text-[#6D123F]" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                    Nama Batch
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider min-w-[200px]">
                    Keterisian (Maks {MAX_BATCH_CAPACITY})
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Status Anggota
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Aktivitas 7 Hari
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">
                    Total Kuis Lulus
                  </TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <BarChart3 className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-bold">
                          {analytics.totalGroups === 0
                            ? "Belum ada batch Hi Mufradat yang dibuat."
                            : "Tidak ada batch yang cocok dengan pencarian."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((group) => {
                    const isFull = group.liveCount >= MAX_BATCH_CAPACITY;

                    return (
                      <TableRow
                        key={group.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <TableCell className="py-3.5 pl-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-sm text-slate-900">
                              {group.name}
                            </span>
                            {group.dbCountMismatch && (
                              <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Counter DB ({group.member_count ?? 0}) beda dari aktual
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500 rounded-full",
                                  isFull
                                    ? "bg-amber-500"
                                    : group.percent >= 70
                                    ? "bg-emerald-500"
                                    : "bg-sky-500"
                                )}
                                style={{ width: `${group.percent}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-700 whitespace-nowrap min-w-[72px] text-right">
                              {group.liveCount} / {MAX_BATCH_CAPACITY} ({Math.round(group.percent)}%)
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] font-bold">
                              {group.activeCount} Aktif
                            </Badge>
                            {group.onLeaveCount > 0 && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-[10px] font-bold">
                                {group.onLeaveCount} Cuti
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">
                              {group.recent7dAttempts} kuis
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {group.activeUsers7d} peserta aktif
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm font-black text-emerald-700">
                            {group.passedQuizzes}
                          </span>
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 hover:border-[#6D123F] hover:text-[#6D123F]"
                          >
                            <Link href={`/admin/mufradat?groupId=${group.id}`}>
                              Monitor
                              <ExternalLink className="w-3 h-3 ml-1.5" />
                            </Link>
                          </Button>
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

      {/* Compact Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
              Rekomendasi Pembukaan Batch
            </h4>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              Rata-rata keterisian saat ini adalah{" "}
              <strong>{analytics.avgUtilization}%</strong>. Pembukaan batch baru
              sebaiknya dilakukan ketika utilisasi batch aktif sudah melebihi 90%.
            </p>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3">
          <Zap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
              Optimasi Slot Batch ({analytics.underfilledCount} batch belum penuh)
            </h4>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Gunakan fitur <strong>Tutup Lubang</strong> di halaman Batch &amp;
              Grup WA untuk menyeimbangkan anggota pada batch yang masih memiliki
              slot kosong.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
