'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser, useCollection } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Search,
  MessageCircle,
  Flame,
  ArrowLeft,
  Loader2,
  BarChart3,
} from 'lucide-react';

const MUTABAAH_ACTIVITIES = [
  { id: 'bangun', label: 'Doa Bangun Tidur', category: 'Malam & Bangun' },
  { id: 'siwak', label: 'Bersiwak', category: 'Malam & Bangun' },
  { id: 'tahajjud', label: 'Shalat Tahajjud', category: 'Malam & Bangun' },
  { id: 'doa_sahur', label: 'Perbanyak Doa di Waktu Sahur', category: 'Malam & Bangun' },
  { id: 'qabliyah_subuh', label: 'Shalat Qabliyah Subuh', category: 'Subuh' },
  { id: 'subuh', label: 'Shalat Subuh', category: 'Subuh' },
  { id: 'dzikir_pagi', label: 'Dzikir Pagi', category: 'Subuh' },
  { id: 'dhuha', label: 'Shalat Dhuha', category: 'Pagi & Dhuha' },
  { id: 'kajian', label: "Menuntut Ilmu Syar'i", category: 'Pagi & Dhuha' },
  { id: 'qabliyah_zhuhur', label: 'Shalat Qabliyah Zhuhur', category: 'Zhuhur & Ashar' },
  { id: 'zhuhur', label: 'Shalat Zhuhur', category: 'Zhuhur & Ashar' },
  { id: 'badiyah_zhuhur', label: "Shalat Ba'diyah Zhuhur", category: 'Zhuhur & Ashar' },
  { id: 'qabliyah_ashar', label: 'Shalat Qabliyah Ashar', category: 'Zhuhur & Ashar' },
  { id: 'ashar', label: 'Shalat Ashar', category: 'Zhuhur & Ashar' },
  { id: 'dzikir_petang', label: 'Dzikir Petang', category: 'Zhuhur & Ashar' },
  { id: 'maghrib', label: 'Shalat Maghrib', category: 'Maghrib & Isya' },
  { id: 'badiyah_maghrib', label: "Shalat Ba'diyah Maghrib", category: 'Maghrib & Isya' },
  { id: 'isya', label: 'Shalat Isya', category: 'Maghrib & Isya' },
  { id: 'badiyah_isya', label: "Shalat Ba'diyah Isya", category: 'Maghrib & Isya' },
  { id: 'witir', label: 'Shalat Witir', category: 'Sebelum Tidur' },
  { id: 'wudhu_tidur', label: 'Wudhu Tidur', category: 'Sebelum Tidur' },
  { id: 'al_mulk', label: 'Membaca Surat Al-Mulk', category: 'Sebelum Tidur' },
  { id: 'ayat_kursi', label: 'Membaca Ayat Kursi', category: 'Sebelum Tidur' },
  { id: 'doa_tidur', label: 'Doa Mau Tidur', category: 'Sebelum Tidur' },
  { id: 'evaluasi', label: 'Evaluasi Diri (Muhasabah)', category: 'Sebelum Tidur' },
  { id: 'quran', label: "Tilawah Al-Qur'an", category: 'Umum' },
  { id: 'doa_harian', label: 'Membaca Doa Harian', category: 'Umum' },
  { id: 'tasbih_100', label: 'Bertasbih 100x', category: 'Umum' },
  { id: 'istighfar', label: 'Beristighfar (70-100x)', category: 'Umum' },
  { id: 'puasa_senin_kamis', label: 'Puasa Sunnah Senin Kamis', category: 'Sunnah' },
  { id: 'ayyamul_bidh', label: 'Puasa Ayyamul Bidh', category: 'Sunnah' },
  { id: 'sunnah_bekam', label: 'Sunnah Berbekam', category: 'Kesehatan' },
];

const DAILY_BASE_TARGET = 28;

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

export default function AdminMutabaahPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

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

  const mutabaahLogs = useMemo(() => {
    return (rawLogs || []).filter(
      (l: any) => l?.completed && l?.activity_id && !String(l.activity_id).startsWith('m_')
    );
  }, [rawLogs]);

  const userReports = useMemo(() => {
    if (!users) return [];

    const byUser = new Map<string, any[]>();
    mutabaahLogs.forEach((l: any) => {
      if (!l.user_id) return;
      const arr = byUser.get(l.user_id) || [];
      arr.push(l);
      byUser.set(l.user_id, arr);
    });

    return users
      .map((u: any) => {
        const logs = byUser.get(u.id) || [];
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
          streak,
          consistencyPct,
        };
      })
      .sort((a: any, b: any) => {
        if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
        return b.totalLogs - a.totalLogs;
      });
  }, [users, mutabaahLogs, todayStr]);

  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return userReports.filter((u: any) => {
      if (!q) return true;
      const name = String(u.full_name || u.username || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [userReports, searchTerm]);

  const activityBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    const uniqueUsersPerAct = new Map<string, Set<string>>();

    mutabaahLogs.forEach((l: any) => {
      const actId = String(l.activity_id);
      counts.set(actId, (counts.get(actId) || 0) + 1);
      if (l.user_id) {
        const set = uniqueUsersPerAct.get(actId) || new Set<string>();
        set.add(l.user_id);
        uniqueUsersPerAct.set(actId, set);
      }
    });

    const maxCount = Math.max(1, ...Array.from(counts.values()));

    return MUTABAAH_ACTIVITIES.map((act) => {
      const total = counts.get(act.id) || 0;
      const participantCount = uniqueUsersPerAct.get(act.id)?.size || 0;
      return {
        ...act,
        total,
        participantCount,
        relativePct: total > 0 ? Math.round((total / maxCount) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [mutabaahLogs]);

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
      totalCheckins: mutabaahLogs.length,
    };
  }, [userReports, mutabaahLogs]);

  const isLoading = loadingUsers || loadingLogs;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000]">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Monitoring Ibadah Yaumiyah (30 Hari Terakhir)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Laporan Mutaba&apos;ah Peserta
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau keistiqomahan amalan harian thalibah dan berikan sapaan motivasi bagi peserta yang mulai renggang.
          </p>
        </div>

        <Button asChild variant="outline" className="font-bold border-slate-200 self-start">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard Admin
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Aktif (30 Hari)
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">{kpis.active30dCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-red-50 text-[#800000]">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Mengisi Hari Ini
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{kpis.activeToday}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Rata-rata Konsistensi
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1">{kpis.avgConsistency}%</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Total Amalan (30H)
              </p>
              <p className="text-3xl font-black text-[#800000] mt-1">{kpis.totalCheckins}</p>
            </div>
            <div className="p-3 rounded-2xl bg-orange-50 text-[#800000]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="w-full space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger
            value="participants"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Rekap Konsistensi Peserta
          </TabsTrigger>
          <TabsTrigger
            value="activities"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Statistik Amalan ({MUTABAAH_ACTIVITIES.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama atau email thalibah..."
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">Memuat rekap mutaba&apos;ah...</p>
              </CardContent>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-sm font-bold text-slate-500">Data peserta tidak ditemukan.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredReports.slice(0, 60).map((u: any) => {
                const fullName = u.full_name || u.username || 'Thalibah';
                const salutation = u.salutation || 'Ukhti';
                const waNumber = normalizePhone(u.whatsapp || u.phone);
                const waMsg = encodeURIComponent(
                  `Assalamu'alaikum ${salutation} ${fullName}, semoga senantiasa dalam lindungan Allah. Yuk semangat mengisi lembar Mutaba'ah harian di aplikasi HI AQLI hari ini!`
                );

                return (
                  <Card key={u.id} className="border-none shadow-sm bg-white">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-black text-slate-900">{fullName}</p>
                          {u.streak > 0 && (
                            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-[10px] font-black uppercase">
                              <Flame className="w-3 h-3 mr-1 fill-current" /> Streak {u.streak} Hari
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] font-black border-emerald-200 text-emerald-700"
                          >
                            Hari Ini: {u.todayCount} / {DAILY_BASE_TARGET} Amalan
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {u.email || '-'} • Aktif {u.activeDays} dari 30 hari ({u.totalLogs} checklist tercatat)
                        </p>

                        <div className="max-w-md space-y-1">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                            <span>Konsistensi 30 Hari</span>
                            <span className="text-[#800000]">{u.consistencyPct}%</span>
                          </div>
                          <Progress
                            value={u.consistencyPct}
                            className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[#800000] [&>div]:to-[#D4AF37]"
                          />
                        </div>
                      </div>

                      {waNumber && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="font-bold text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 self-start md:self-center"
                        >
                          <a
                            href={`https://wa.me/${waNumber}?text=${waMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Sapa via WA
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activityBreakdown.map((act) => (
              <Card key={act.id} className="border-none shadow-sm bg-white">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-500 mb-1">
                        {act.category}
                      </Badge>
                      <p className="text-sm font-black text-slate-900">{act.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-[#800000] leading-none">{act.total}x</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                        {act.participantCount} thalibah
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={act.relativePct}
                    className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
