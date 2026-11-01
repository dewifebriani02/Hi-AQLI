'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser, useCollection, db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Repeat,
  Users,
  Clock,
  CheckCircle2,
  Award,
  Search,
  MessageCircle,
  BookOpen,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export default function AdminTikrarPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState<'all' | 'pending' | 'passed'>('all');
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const examOptions = useMemo(
    () => ({
      orderBy: { column: 'created_at', ascending: false },
    }),
    []
  );

  const quizOptions = useMemo(
    () => ({
      filters: [{ column: 'quiz_id', operator: '==', value: 'tikrar_tajwid_theory' }],
    }),
    []
  );

  const { data: users, isLoading: loadingUsers, refresh: refreshUsers } = useCollection<any>(
    user ? 'users' : null
  );
  const { data: pageExams, isLoading: loadingExams, refresh: refreshExams } = useCollection<any>(
    user ? 'page_exams' : null,
    examOptions
  );
  const { data: registrations } = useCollection<any>(user ? 'halaqah_registrations' : null);
  const { data: halaqahs } = useCollection<any>(user ? 'halaqahs' : null);
  const { data: tajwidAttempts } = useCollection<any>(user ? 'quiz_attempts' : null, quizOptions);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    (users || []).forEach((u: any) => {
      if (u?.id) map.set(u.id, u);
    });
    return map;
  }, [users]);

  const tikrarHalaqahIds = useMemo(() => {
    const ids = new Set<string>();
    (halaqahs || []).forEach((h: any) => {
      const title = String(h?.title || '').toLowerCase();
      const prog = String(h?.program_type || '').toLowerCase();
      if (prog.includes('tikrar') || prog.includes('tahfidz') || title.includes('tikrar')) {
        ids.add(h.id);
      }
    });
    return ids;
  }, [halaqahs]);

  const passedTajwidUsers = useMemo(() => {
    const ids = new Set<string>();
    (tajwidAttempts || []).forEach((a: any) => {
      if (a?.is_passed && a?.user_id) ids.add(a.user_id);
    });
    return ids;
  }, [tajwidAttempts]);

  const tikrarParticipants = useMemo(() => {
    if (!users) return [];

    const regUserIds = new Set<string>();
    (registrations || []).forEach((r: any) => {
      const title = String(r?.halaqah_title || '').toLowerCase();
      if (
        r?.user_id &&
        (tikrarHalaqahIds.has(r.halaqah_id) || title.includes('tikrar') || title.includes('tahfidz'))
      ) {
        regUserIds.add(r.user_id);
      }
    });

    const examCounts = new Map<string, { passed: number; pending: number }>();
    (pageExams || []).forEach((e: any) => {
      if (!e?.user_id) return;
      const prev = examCounts.get(e.user_id) || { passed: 0, pending: 0 };
      if (e.passed) prev.passed += 1;
      else prev.pending += 1;
      examCounts.set(e.user_id, prev);
    });

    return users
      .map((u: any) => {
        const paidJuzArr = Array.isArray(u.paidJuz)
          ? u.paidJuz
          : Array.isArray(u.paid_juz)
          ? u.paid_juz
          : [];
        const stats = examCounts.get(u.id) || { passed: 0, pending: 0 };
        const isParticipant =
          Boolean(u.is_tikrar_paid) ||
          paidJuzArr.length > 0 ||
          Boolean(u.tikrar_level) ||
          regUserIds.has(u.id) ||
          stats.passed > 0 ||
          stats.pending > 0 ||
          passedTajwidUsers.has(u.id);

        return {
          ...u,
          paidJuzList: paidJuzArr.map((j: any) => Number(j)).filter((j: number) => !isNaN(j)),
          passedPages: stats.passed,
          pendingPages: stats.pending,
          tajwidPassed: passedTajwidUsers.has(u.id),
          isParticipant,
        };
      })
      .sort((a: any, b: any) => {
        if (a.isParticipant !== b.isParticipant) return a.isParticipant ? -1 : 1;
        return b.passedPages - a.passedPages;
      });
  }, [users, registrations, tikrarHalaqahIds, pageExams, passedTajwidUsers]);

  const filteredParticipants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return tikrarParticipants.filter((u: any) => {
      if (!q) return true;
      const name = String(u.full_name || u.username || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const phone = String(u.whatsapp || u.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [tikrarParticipants, searchTerm]);

  const filteredExams = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (pageExams || []).filter((exam: any) => {
      if (examFilter === 'pending' && exam.passed) return false;
      if (examFilter === 'passed' && !exam.passed) return false;
      if (!q) return true;
      const u = userMap.get(exam.user_id);
      const name = String(u?.full_name || u?.username || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      const pageStr = String(exam.page_number || '');
      return name.includes(q) || email.includes(q) || pageStr.includes(q);
    });
  }, [pageExams, examFilter, searchTerm, userMap]);

  const kpis = useMemo(() => {
    const activeCount = tikrarParticipants.filter((u: any) => u.isParticipant).length;
    const pendingCount = (pageExams || []).filter((e: any) => !e.passed).length;
    const passedCount = (pageExams || []).filter((e: any) => Boolean(e.passed)).length;
    return {
      activeCount,
      pendingCount,
      passedCount,
      tajwidCount: passedTajwidUsers.size,
    };
  }, [tikrarParticipants, pageExams, passedTajwidUsers]);

  const handleToggleTikrarPaid = async (participant: any) => {
    setUpdatingId(participant.id);
    const nextVal = !participant.is_tikrar_paid;
    const { error } = await db
      .from('users')
      .update({ is_tikrar_paid: nextVal })
      .eq('id', participant.id);
    setUpdatingId(null);

    if (error) {
      toast({
        title: 'Gagal Memperbarui Akses',
        description: error.message || 'Terjadi kesalahan saat menyimpan status Tikrar.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: nextVal ? 'Akses Tikrar Diaktifkan' : 'Akses Tikrar Dinonaktifkan',
      description: `Status akses ${participant.full_name || participant.username || 'peserta'} berhasil diperbarui.`,
    });
    refreshUsers();
  };

  const handleToggleJuzAccess = async (participant: any, juzNum: number) => {
    setUpdatingId(`${participant.id}-${juzNum}`);
    const current: number[] = participant.paidJuzList || [];
    const exists = current.includes(juzNum);
    const updated = exists
      ? current.filter((j) => j !== juzNum)
      : [...current, juzNum].sort((a, b) => a - b);

    const { error } = await db
      .from('users')
      .update({ paidJuz: updated })
      .eq('id', participant.id);
    setUpdatingId(null);

    if (error) {
      toast({
        title: 'Gagal Menyimpan Juz',
        description: error.message || 'Tidak dapat memperbarui daftar Juz aktif.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Akses Juz Diperbarui',
      description: `Juz ${juzNum} ${exists ? 'dihapus dari' : 'ditambahkan ke'} akun ${participant.full_name || participant.username || 'peserta'}.`,
    });
    refreshUsers();
  };

  const handleApproveExam = async (exam: any, passStatus: boolean) => {
    setUpdatingId(exam.id);
    const rawScore = scoreInputs[exam.id] ?? String(exam.score || (passStatus ? 90 : 0));
    const parsedScore = Math.max(0, Math.min(100, parseInt(rawScore, 10) || 0));

    const { error } = await db
      .from('page_exams')
      .update({ passed: passStatus, score: parsedScore })
      .eq('id', exam.id);
    setUpdatingId(null);

    if (error) {
      toast({
        title: 'Gagal Memproses Ujian',
        description: error.message || 'Terjadi kendala saat menyimpan hasil ujian halaman.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: passStatus ? 'Ujian Halaman Lulus' : 'Status Ujian Diperbarui',
      description: `Halaman ${exam.page_number} disimpan dengan nilai ${parsedScore}.`,
    });
    refreshExams();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000]">
            <Repeat className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Monitoring Tahfidz & Ujian Halaman
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Manajemen HI Tikrar
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akses Juz peserta, validasi antrean ujian halaman Mushaf, dan pantau kelulusan teori Tajwid.
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
                Peserta Tikrar
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">{kpis.activeCount}</p>
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
                Ujian Menunggu
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1">{kpis.pendingCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Halaman Lulus
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{kpis.passedCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Lulus Kuis Tajwid
              </p>
              <p className="text-3xl font-black text-[#800000] mt-1">{kpis.tajwidCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-[#D4AF37]">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama thalibah, email, nomor WhatsApp, atau nomor halaman..."
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="text-xs font-bold">
              Reset
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="exams" className="w-full space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger
            value="exams"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Ujian Halaman ({pageExams?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Peserta & Akses Juz ({filteredParticipants.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ujian Halaman */}
        <TabsContent value="exams" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'pending', 'passed'] as const).map((statusKey) => (
              <Button
                key={statusKey}
                size="sm"
                variant={examFilter === statusKey ? 'default' : 'outline'}
                onClick={() => setExamFilter(statusKey)}
                className={cn(
                  'text-[11px] font-black uppercase tracking-wider rounded-full h-8',
                  examFilter === statusKey && 'bg-[#800000] hover:bg-[#800000]/90 text-white'
                )}
              >
                {statusKey === 'all'
                  ? 'Semua Pengajuan'
                  : statusKey === 'pending'
                  ? 'Menunggu Verifikasi'
                  : 'Sudah Lulus'}
              </Button>
            ))}
          </div>

          {loadingExams ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">Memuat data ujian halaman...</p>
              </CardContent>
            </Card>
          ) : filteredExams.length === 0 ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-black uppercase text-slate-600">Belum Ada Pengajuan Ujian</p>
                <p className="text-xs text-muted-foreground">
                  Pengajuan ujian halaman dari fitur HI Tikrar akan muncul di sini untuk dinilai Musyrifah/Admin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredExams.map((exam: any) => {
                const participant = userMap.get(exam.user_id);
                const fullName = participant?.full_name || participant?.username || 'Thalibah HI AQLI';
                const salutation = participant?.salutation || 'Ukhti';
                const waNumber = normalizePhone(participant?.whatsapp || participant?.phone);
                const currentScore =
                  scoreInputs[exam.id] !== undefined
                    ? scoreInputs[exam.id]
                    : String(exam.score ?? 90);
                const waText = encodeURIComponent(
                  `Assalamu'alaikum ${salutation} ${fullName}, terkait pengajuan Ujian Tikrar Halaman ${exam.page_number} di HI AQLI...`
                );

                return (
                  <Card key={exam.id} className="border-none shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-[#800000] text-white font-black text-[10px] uppercase">
                            Halaman {exam.page_number}
                          </Badge>
                          {exam.passed ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-black text-[10px] uppercase">
                              LULUS • Nilai {exam.score ?? 100}
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-black text-[10px] uppercase">
                              MENUNGGU SIMAK
                            </Badge>
                          )}
                        </div>
                        <p className="text-base font-black text-slate-900">{fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {participant?.email || 'Email tidak tersedia'} • Diajukan{' '}
                          {exam.created_at
                            ? new Date(exam.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500">Nilai:</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={currentScore}
                            onChange={(e) =>
                              setScoreInputs((prev) => ({ ...prev, [exam.id]: e.target.value }))
                            }
                            className="w-20 h-9 text-center font-black text-sm"
                          />
                        </div>

                        <Button
                          size="sm"
                          disabled={updatingId === exam.id}
                          onClick={() => handleApproveExam(exam, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                        >
                          {updatingId === exam.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Luluskan
                            </>
                          )}
                        </Button>

                        {exam.passed && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === exam.id}
                            onClick={() => handleApproveExam(exam, false)}
                            className="text-xs font-bold h-9 border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            Set Menunggu
                          </Button>
                        )}

                        {waNumber && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            <a
                              href={`https://wa.me/${waNumber}?text=${waText}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Japri WA
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

        {/* Tab 2: Peserta & Akses Juz */}
        <TabsContent value="participants" className="space-y-4">
          {loadingUsers ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">Memuat daftar thalibah...</p>
              </CardContent>
            </Card>
          ) : filteredParticipants.length === 0 ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-sm font-bold text-slate-500">Tidak ada peserta yang cocok dengan pencarian.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredParticipants.slice(0, 50).map((p: any) => {
                const fullName = p.full_name || p.username || 'Thalibah';
                const waNumber = normalizePhone(p.whatsapp || p.phone);
                const popularJuz = [30, 29, 28, 1, 2, 3];

                return (
                  <Card key={p.id} className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-black text-slate-900">{fullName}</CardTitle>
                          {p.is_tikrar_paid && (
                            <Badge className="bg-[#D4AF37] text-black hover:bg-[#D4AF37] text-[9px] font-black uppercase">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> Tikrar Aktif
                            </Badge>
                          )}
                          {p.tajwidPassed && (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[9px] font-black uppercase">
                              Lulus Tajwid
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {p.email || '-'} • Lulus {p.passedPages} Hal • Menunggu {p.pendingPages} Hal
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={p.is_tikrar_paid ? 'outline' : 'default'}
                          disabled={updatingId === p.id}
                          onClick={() => handleToggleTikrarPaid(p)}
                          className={cn(
                            'text-xs font-bold h-8',
                            !p.is_tikrar_paid && 'bg-[#800000] hover:bg-[#800000]/90 text-white'
                          )}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                          {p.is_tikrar_paid ? 'Nonaktifkan Full Akses' : 'Aktifkan Full Akses'}
                        </Button>

                        {waNumber && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold border-emerald-200 text-emerald-700"
                          >
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" /> WA
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Akses Juz Terbuka (Klik untuk Toggle Juz Populer)
                          </span>
                          <span className="text-[10px] font-bold text-[#800000]">
                            Total: {p.paidJuzList.length} Juz
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {popularJuz.map((juzNum) => {
                            const active = p.paidJuzList.includes(juzNum);
                            const busy = updatingId === `${p.id}-${juzNum}`;
                            return (
                              <Button
                                key={juzNum}
                                size="sm"
                                variant={active ? 'default' : 'outline'}
                                disabled={busy}
                                onClick={() => handleToggleJuzAccess(p, juzNum)}
                                className={cn(
                                  'h-7 px-2.5 text-[10px] font-black rounded-lg',
                                  active
                                    ? 'bg-[#800000] hover:bg-[#800000]/90 text-white'
                                    : 'bg-white text-slate-600 border-slate-200'
                                )}
                              >
                                Juz {juzNum}
                              </Button>
                            );
                          })}
                          {p.paidJuzList
                            .filter((j: number) => !popularJuz.includes(j))
                            .map((juzNum: number) => (
                              <Badge
                                key={juzNum}
                                variant="secondary"
                                className="text-[10px] font-black cursor-pointer"
                                onClick={() => handleToggleJuzAccess(p, juzNum)}
                              >
                                Juz {juzNum} ×
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
