'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser, useCollection } from '@/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Heart,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Search,
  MessageCircle,
  Flame,
  Loader2,
  Download,
  Eye,
  Check,
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const MUHASABAH_ITEMS = [
  { id: 'm_wanita_shalat', label: 'Menjaga Shalat 5 Waktu', sub: '4 Syarat Wanita Surga' },
  { id: 'm_wanita_puasa', label: 'Berpuasa di bulan Ramadhan', sub: '4 Syarat Wanita Surga' },
  { id: 'm_wanita_kehormatan', label: 'Menjaga Kehormatan (Kemaluan)', sub: '4 Syarat Wanita Surga' },
  { id: 'm_wanita_taat', label: 'Mentaati Suami', sub: '4 Syarat Wanita Surga' },
  { id: 'm_dosa_syirik', label: 'Menjauhi Syirik (Ramalan/Zodiak, Jimat, Dukun)', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_dosa_sihir', label: 'Menjauhi Sihir', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_dosa_riba', label: 'Menjauhi Riba', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_lisan_ghibah', label: 'Menjaga Lisan (Ghibah/Fitnah)', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_lisan_suami', label: 'Menghindari Kufur Nikmat pada Suami', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_akhlak_tabarruj', label: 'Menghindari Tabarruj', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_akhlak_niyahah', label: 'Menghindari Niyahah', sub: 'Dosa2 besar yang biasa dilakukan wanita' },
  { id: 'm_akhlak_sabar', label: 'Bersabar & Bersyukur Hari Ini', sub: 'Kebaikan & Akhlak' },
  { id: 'm_akhlak_birrul', label: 'Berbakti kepada Orang Tua (Birrul Walidain)', sub: 'Kebaikan & Akhlak' },
  { id: 'm_akhlak_infaq', label: 'Berinfaq/Sedekah Hari Ini', sub: 'Kebaikan & Akhlak' },
];

function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function normalizeDateStr(raw: any): string {
  if (!raw) return '';
  return String(raw).split('T')[0];
}

export default function AdminMuhasabahPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('consistency_desc');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const logsOptions = useMemo(
    () => ({
      filters: [{ column: 'date', operator: '>=', value: thirtyDaysAgoStr }],
    }),
    [thirtyDaysAgoStr]
  );

  const { data: users, isLoading: loadingUsers } = useCollection<any>(user ? 'users' : null);
  const { data: rawLogs, isLoading: loadingLogs } = useCollection<any>(
    user ? 'mutabaah_logs' : null,
    logsOptions
  );

  const muhasabahLogs = useMemo(() => {
    return (rawLogs || []).filter(
      (l: any) => l?.completed && l?.activity_id && String(l.activity_id).startsWith('m_')
    );
  }, [rawLogs]);

  // Pre-index logs by user for fast lookups
  const userLogsMap = useMemo(() => {
    const byUser = new Map<string, any[]>();
    muhasabahLogs.forEach((l: any) => {
      if (!l.user_id) return;
      const arr = byUser.get(l.user_id) || [];
      arr.push(l);
      byUser.set(l.user_id, arr);
    });
    return byUser;
  }, [muhasabahLogs]);

  const userReports = useMemo(() => {
    if (!users) return [];

    return users
      .map((u: any) => {
        const logs = userLogsMap.get(u.id) || [];
        const activeDates = new Set<string>();
        const todaySet = new Set<string>();

        logs.forEach((l: any) => {
          const dStr = normalizeDateStr(l.date);
          if (dStr) activeDates.add(dStr);
          if (dStr === todayStr) todaySet.add(l.activity_id);
        });

        let streak = 0;
        const cursor = new Date();
        for (let i = 0; i < 30; i++) {
          const dStr = cursor.toISOString().split('T')[0];
          if (activeDates.has(dStr)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else if (i === 0) {
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }

        const consistencyPct = Math.min(100, Math.round((activeDates.size / 30) * 100));

        return {
          ...u,
          totalLogs: logs.length,
          activeDays: activeDates.size,
          todayCount: todaySet.size,
          todaySet,
          streak,
          consistencyPct,
        };
      });
  }, [users, userLogsMap, todayStr]);

  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = userReports.filter((u: any) => {
      const name = String(u.full_name || u.username || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q);

      let matchesFilter = true;
      if (statusFilter === 'active_today') {
        matchesFilter = u.todayCount > 0;
      } else if (statusFilter === 'inactive_today') {
        matchesFilter = u.todayCount === 0;
      } else if (statusFilter === 'need_motivation') {
        matchesFilter = u.consistencyPct < 50;
      } else if (statusFilter === 'consistent') {
        matchesFilter = u.consistencyPct >= 70 || u.streak >= 5;
      }

      return matchesSearch && matchesFilter;
    });

    // Sorting
    result.sort((a: any, b: any) => {
      if (sortBy === 'consistency_desc') {
        if (b.consistencyPct !== a.consistencyPct) return b.consistencyPct - a.consistencyPct;
        return b.todayCount - a.todayCount;
      }
      if (sortBy === 'consistency_asc') {
        return a.consistencyPct - b.consistencyPct;
      }
      if (sortBy === 'today_desc') {
        if (b.todayCount !== a.todayCount) return b.todayCount - a.todayCount;
        return b.consistencyPct - a.consistencyPct;
      }
      if (sortBy === 'streak_desc') {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.consistencyPct - a.consistencyPct;
      }
      if (sortBy === 'name_asc') {
        const nameA = String(a.full_name || a.username || '').toLowerCase();
        const nameB = String(b.full_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [userReports, searchTerm, statusFilter, sortBy]);

  const itemBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    const uniqueUsers = new Map<string, Set<string>>();

    muhasabahLogs.forEach((l: any) => {
      const id = String(l.activity_id);
      counts.set(id, (counts.get(id) || 0) + 1);
      if (l.user_id) {
        const s = uniqueUsers.get(id) || new Set<string>();
        s.add(l.user_id);
        uniqueUsers.set(id, s);
      }
    });

    const maxCount = Math.max(1, ...Array.from(counts.values()));

    return MUHASABAH_ITEMS.map((item) => {
      const total = counts.get(item.id) || 0;
      const userCount = uniqueUsers.get(item.id)?.size || 0;
      return {
        ...item,
        total,
        userCount,
        relativePct: total > 0 ? Math.round((total / maxCount) * 100) : 0,
      };
    });
  }, [muhasabahLogs]);

  const kpis = useMemo(() => {
    const active30d = userReports.filter((u: any) => u.activeDays > 0);
    const activeToday = userReports.filter((u: any) => u.todayCount > 0).length;
    const avgConsistency =
      active30d.length > 0
        ? Math.round(
            active30d.reduce((acc: number, curr: any) => acc + curr.consistencyPct, 0) /
              active30d.length
          )
        : 0;

    return {
      active30dCount: active30d.length,
      activeToday,
      avgConsistency,
      totalEvaluations: muhasabahLogs.length,
    };
  }, [userReports, muhasabahLogs]);

  const categories = useMemo(
    () => Array.from(new Set(MUHASABAH_ITEMS.map((i) => i.sub))),
    []
  );

  const handleExportCSV = () => {
    if (userReports.length === 0) {
      toast({ title: 'Tidak ada data untuk diekspor', variant: 'destructive' });
      return;
    }

    const headers = ['Nama', 'Email', 'No. WhatsApp', 'Streak (Hari)', 'Hari Ini (Poin)', 'Aktif 30H (Hari)', 'Total Evaluasi', 'Istiqomah (%)'];
    const rows = userReports.map((u: any) => [
      `"${(u.full_name || u.username || 'Thalibah').replace(/"/g, '""')}"`,
      `"${(u.email || '-').replace(/"/g, '""')}"`,
      `"${(u.whatsapp || u.phone || '-').replace(/"/g, '""')}"`,
      u.streak,
      `${u.todayCount}/${MUHASABAH_ITEMS.length}`,
      u.activeDays,
      u.totalLogs,
      `${u.consistencyPct}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-muhasabah-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Laporan Diekspor',
      description: `${userReports.length} data thalibah berhasil diunduh dalam format CSV.`,
    });
  };

  const isLoading = loadingUsers || loadingLogs;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mt-2">
        <div>
          <div className="flex items-center gap-2 text-[#6D123F]">
            <Shield className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Evaluasi Hati & Akhlak Muslimah (30 Hari Terakhir)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-headline tracking-tight text-[#6D123F] uppercase">
            Laporan HI Muhasabah
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            Rekapitulasi evaluasi diri harian 14 poin penjagaan iman, lisan, dan akhlak thalibah HI AQLI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="font-black text-xs h-11 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 rounded-xl shadow-sm"
          >
            <Download className="w-4 h-4 text-[#6D123F]" /> Ekspor CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Bermuhasabah (30H)
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">{kpis.active30dCount}</p>
              <p className="text-[10px] font-bold text-[#6D123F] mt-1">Thalibah Aktif</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 text-[#6D123F]">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Evaluasi Hari Ini
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1">{kpis.activeToday}</p>
              <p className="text-[10px] font-bold text-amber-700 mt-1">Sudah Mengisi</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Rata-rata Istiqomah
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{kpis.avgConsistency}%</p>
              <p className="text-[10px] font-bold text-emerald-700 mt-1">Skor Keaktifan</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Total Evaluasi (30H)
              </p>
              <p className="text-3xl font-black text-[#6D123F] mt-1">{kpis.totalEvaluations}</p>
              <p className="text-[10px] font-bold text-[#6D123F] mt-1">Poin Terpenuhi</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 text-[#6D123F]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="w-full space-y-4 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-fit shadow-sm">
            <TabsTrigger
              value="participants"
              className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#6D123F] data-[state=active]:text-white px-4 py-2 transition-all"
            >
              Laporan Evaluasi Peserta
            </TabsTrigger>
            <TabsTrigger
              value="points"
              className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#6D123F] data-[state=active]:text-white px-4 py-2 transition-all"
            >
              Rekap 14 Poin Muhasabah
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="participants" className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau email thalibah..."
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div className="sm:col-span-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">Semua Peserta ({userReports.length})</SelectItem>
                  <SelectItem value="active_today" className="text-xs font-bold text-emerald-600">Sudah Evaluasi Hari Ini ({kpis.activeToday})</SelectItem>
                  <SelectItem value="inactive_today" className="text-xs font-bold text-amber-600">Belum Evaluasi Hari Ini ({userReports.length - kpis.activeToday})</SelectItem>
                  <SelectItem value="need_motivation" className="text-xs font-bold text-rose-600">Perlu Motivasi (&lt; 50%)</SelectItem>
                  <SelectItem value="consistent" className="text-xs font-bold text-[#6D123F]">Sangat Istiqomah (&ge; 70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consistency_desc" className="text-xs font-bold">Istiqomah Tertinggi</SelectItem>
                  <SelectItem value="consistency_asc" className="text-xs font-bold">Istiqomah Terendah</SelectItem>
                  <SelectItem value="today_desc" className="text-xs font-bold">Paling Banyak Hari Ini</SelectItem>
                  <SelectItem value="streak_desc" className="text-xs font-bold">Streak Tertinggi</SelectItem>
                  <SelectItem value="name_asc" className="text-xs font-bold">Nama (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <Card className="border-none shadow-sm bg-white rounded-2xl">
              <CardContent className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-[#6D123F]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#6D123F]">Memuat laporan muhasabah...</p>
              </CardContent>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="border-none shadow-sm bg-white rounded-2xl">
              <CardContent className="p-16 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Data peserta tidak ditemukan.</p>
                <p className="text-xs text-muted-foreground mt-1">Coba ubah kata kunci pencarian atau filter status di atas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-muted-foreground">
                <span>Menampilkan {filteredReports.length} peserta</span>
              </div>

              {filteredReports.map((u: any) => {
                const fullName = u.full_name || u.username || 'Thalibah';
                const salutation = u.salutation || 'Ukhti';
                const waNumber = normalizePhone(u.whatsapp || u.phone);
                const waMsg = encodeURIComponent(
                  `Assalamu'alaikum ${salutation} ${fullName}, semoga hari ini penuh berkah. Jangan lupa luangkan sejenak sebelum tidur untuk mengisi HI Muhasabah harian ya!`
                );

                return (
                  <Card key={u.id} className="border-none shadow-sm hover:shadow-md transition-all bg-white rounded-2xl">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-black text-slate-900">{fullName}</p>
                          {u.streak > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] font-black uppercase rounded-lg border-none">
                              <Flame className="w-3 h-3 mr-1 fill-current" /> Streak {u.streak} Hari
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-black rounded-lg border",
                              u.todayCount > 0
                                ? "border-amber-300 text-[#6D123F] bg-amber-50/50"
                                : "border-slate-200 text-slate-500 bg-slate-50"
                            )}
                          >
                            Hari Ini: {u.todayCount} / {MUHASABAH_ITEMS.length} Poin
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {u.email || '-'} &bull; Bermuhasabah {u.activeDays} dari 30 hari ({u.totalLogs} poin tuntas)
                        </p>

                        <div className="max-w-md space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                            <span>Istiqomah 30 Hari</span>
                            <span className="text-[#6D123F] font-bold">{u.consistencyPct}%</span>
                          </div>
                          <Progress
                            value={u.consistencyPct}
                            className="h-2 bg-slate-100 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-[#6D123F] [&>div]:to-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="font-bold text-xs h-9 text-slate-600 hover:text-[#6D123F] hover:bg-rose-50 rounded-xl gap-1"
                          onClick={() => setSelectedUserDetail(u)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Rincian
                        </Button>

                        {waNumber && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="font-bold text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-9"
                          >
                            <a
                              href={`https://wa.me/${waNumber}?text=${waMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Motivasi WA
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="points" className="space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                {category === '4 Syarat Wanita Surga' ? (
                  <Heart className="w-4 h-4 text-[#6D123F]" />
                ) : (
                  <Shield className="w-4 h-4 text-[#6D123F]" />
                )}
                <h3 className="text-xs font-black uppercase tracking-widest text-[#6D123F]">
                  {category}
                </h3>
                <div className="h-[1px] flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {itemBreakdown
                  .filter((item) => item.sub === category)
                  .map((item) => (
                    <Card key={item.id} className="border-none shadow-sm bg-white rounded-2xl">
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-black text-slate-900">{item.label}</p>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-[#6D123F] leading-none">
                              {item.total}x
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                              {item.userCount} thalibah
                            </p>
                          </div>
                        </div>
                        <Progress
                          value={item.relativePct}
                          className="h-1.5 bg-slate-100 rounded-full [&>div]:bg-[#D4AF37]"
                        />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialog Detail Poin Muhasabah Thalibah */}
      <Dialog open={!!selectedUserDetail} onOpenChange={(open) => !open && setSelectedUserDetail(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-[#6D123F] uppercase flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#6D123F]" /> Rincian HI Muhasabah &bull; {selectedUserDetail?.full_name || selectedUserDetail?.username}
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Status evaluasi 14 poin akhlak & hati hari ini ({todayStr}).
            </p>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Poin Hari Ini</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5">
                  {selectedUserDetail?.todayCount || 0} / {MUHASABAH_ITEMS.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Streak</p>
                <p className="text-xl font-black text-orange-600 mt-0.5">
                  {selectedUserDetail?.streak || 0} Hari
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Istiqomah</p>
                <p className="text-xl font-black text-[#6D123F] mt-0.5">
                  {selectedUserDetail?.consistencyPct || 0}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {categories.map((category) => {
                const itemsInCat = MUHASABAH_ITEMS.filter((item) => item.sub === category);
                return (
                  <div key={category} className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#6D123F] flex items-center gap-1.5">
                      {category === '4 Syarat Wanita Surga' ? (
                        <Heart className="w-3.5 h-3.5 text-[#6D123F]" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-[#6D123F]" />
                      )}
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {itemsInCat.map((item) => {
                        const isDone = selectedUserDetail?.todaySet?.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors",
                              isDone
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 font-bold"
                                : "bg-slate-50/50 border-slate-200 text-slate-500"
                            )}
                          >
                            <span>{item.label}</span>
                            {isDone ? (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                            ) : (
                              <span className="text-[10px] text-slate-300 shrink-0 ml-2">-</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
