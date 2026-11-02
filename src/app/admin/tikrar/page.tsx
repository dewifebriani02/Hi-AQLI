'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser, useDoc, useCollection, db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Bell,
  Send,
  Calendar,
  Video,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  FileCheck2,
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
  const { data: userData } = useDoc(user?.id ? 'users' : null, user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState<'all' | 'pending' | 'passed'>('all');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending' | 'passed' | 'needs_revision'>('pending');
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [submissionFeedback, setSubmissionFeedback] = useState<Record<string, string>>({});
  const [submissionGrades, setSubmissionGrades] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // State untuk Cron & Pengingat WhatsApp Tikrar
  const [isTriggeringReminder, setIsTriggeringReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<any>(null);

  const examOptions = useMemo(
    () => ({
      orderBy: { column: 'created_at', ascending: false },
    }),
    []
  );

  const submissionOptions = useMemo(
    () => ({
      orderBy: { column: 'submitted_at', ascending: false },
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
  const { data: rawSubmissions, isLoading: loadingSubmissions, refresh: refreshSubmissions } = useCollection<any>(
    user ? 'tikrar_submissions' : null,
    submissionOptions
  );
  const { data: registrations } = useCollection<any>(user ? 'halaqah_registrations' : null);
  const { data: halaqahs } = useCollection<any>(user ? 'halaqahs' : null);
  const { data: tajwidAttempts } = useCollection<any>(user ? 'quiz_attempts' : null, quizOptions);

  // WhatsApp Audit Logs
  const { data: rawWaLogs, isLoading: loadingWaLogs, refresh: refreshWaLogs } = useCollection<any>(
    user ? 'whatsapp_logs' : null,
    useMemo(() => ({ orderBy: { column: 'created_at', ascending: false } }), [])
  );

  const tikrarWaLogs = useMemo(() => {
    return (rawWaLogs || []).filter((l: any) => l.type?.startsWith('tikrar'));
  }, [rawWaLogs]);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    (users || []).forEach((u: any) => {
      if (u?.id) map.set(u.id, u);
    });
    return map;
  }, [users]);

  const halaqahMap = useMemo(() => {
    const map = new Map<string, any>();
    (halaqahs || []).forEach((h: any) => {
      if (h?.id) map.set(h.id, h);
    });
    return map;
  }, [halaqahs]);

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
          Boolean(u.tikrar_halaqah_id) ||
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

  const filteredSubmissions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (rawSubmissions || []).filter((sub: any) => {
      if (submissionFilter === 'pending' && sub.status !== 'pending') return false;
      if (submissionFilter === 'passed' && sub.status !== 'passed') return false;
      if (submissionFilter === 'needs_revision' && sub.status !== 'needs_revision') return false;
      if (!q) return true;
      const u = userMap.get(sub.user_id);
      const name = String(sub.user_name || u?.full_name || u?.username || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      const pageStr = String(sub.page_number || '');
      return name.includes(q) || email.includes(q) || pageStr.includes(q);
    });
  }, [rawSubmissions, submissionFilter, searchTerm, userMap]);

  const kpis = useMemo(() => {
    const activeCount = tikrarParticipants.filter((u: any) => u.isParticipant).length;
    const pendingSubmissions = (rawSubmissions || []).filter((s: any) => s.status === 'pending').length;
    const passedSubmissions = (rawSubmissions || []).filter((s: any) => s.status === 'passed').length;
    const passedExams = (pageExams || []).filter((e: any) => Boolean(e.passed)).length;
    return {
      activeCount,
      pendingSubmissions,
      passedSubmissions,
      passedExams,
      tajwidCount: passedTajwidUsers.size,
    };
  }, [tikrarParticipants, rawSubmissions, pageExams, passedTajwidUsers]);

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

  // Handler Verifikasi Setoran Live Zoom Musyrifah
  const handleVerifySubmission = async (sub: any, passStatus: boolean) => {
    setUpdatingId(sub.id);
    const grade = submissionGrades[sub.id] || (passStatus ? 'mumtaz' : null);
    const feedback = submissionFeedback[sub.id] || (passStatus ? 'Masyallah, bacaan lancar dan itqan.' : 'Perlu perbaikan kelancaran tajwid di beberapa baris.');

    try {
      const updatePayload: Record<string, any> = {
        status: passStatus ? 'passed' : 'needs_revision',
        grade: passStatus ? grade : null,
        feedback: feedback.trim(),
        verified_at: new Date().toISOString(),
        musyrifah_id: user?.id || null,
        musyrifah_name: userData?.full_name || userData?.username || 'Musyrifah Tikrar',
      };

      const { error: subErr } = await db
        .from('tikrar_submissions')
        .update(updatePayload)
        .eq('id', sub.id);

      if (subErr) throw subErr;

      // Jika lulus, berikan reward poin dan buka kunci halaman berikutnya
      if (passStatus && sub.user_id) {
        const targetUser = userMap.get(sub.user_id);
        const rewardPoints = sub.blocks_range === 'blok_1_4' ? 250 : 100;
        const currentPoints = Number(targetUser?.points || 0);
        const currentPage = Number(targetUser?.tikrar_current_page || 582);
        const nextUnlockPage = Math.max(currentPage, Number(sub.page_number) + 1);

        await db
          .from('users')
          .update({
            points: currentPoints + rewardPoints,
            tikrar_current_page: nextUnlockPage,
          })
          .eq('id', sub.user_id);
      }

      toast({
        title: passStatus ? 'Setoran Live Zoom Lulus! 🎉' : 'Status Revisi Tersimpan',
        description: `Setoran Halaman ${sub.page_number} (${sub.user_name || 'Thalibah'}) berhasil diverifikasi. ${passStatus ? 'Kunci halaman berikutnya dibuka!' : ''}`,
      });

      refreshSubmissions();
      refreshUsers();
    } catch (err: any) {
      console.error('Gagal memverifikasi setoran:', err);
      toast({
        title: 'Gagal Memproses Setoran',
        description: err.message || 'Terjadi kesalahan teknis saat menyimpan verifikasi setoran.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Trigger Tikrar Reminder Cron Manual
  const handleTriggerReminder = async (type: 'morning' | 'evening', dryRun = false) => {
    setIsTriggeringReminder(true);
    setReminderResult(null);
    try {
      const res = await fetch(`/api/cron/tikrar-reminder?type=${type}&dry_run=${dryRun}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menjalankan cron pengingat');
      }
      setReminderResult(data);
      refreshWaLogs();
      toast({
        title: dryRun ? 'Simulasi Berhasil' : 'Pengingat WhatsApp Terkirim! 🚀',
        description: `Berhasil memproses ${data.processed} peserta (${type === 'morning' ? 'Briefing Pagi' : 'Reminder Malam'}).`,
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menjalankan Pengingat',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsTriggeringReminder(false);
    }
  };

  const popularJuz = [30, 29, 28, 1, 2];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000]">
            <Repeat className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Monitoring Tahfidz, Setoran Live Zoom & Ujian Halaman
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Manajemen HI Tikrar
          </h1>
          <p className="text-sm text-muted-foreground">
            Portal Musyrifah untuk verifikasi Setoran Live Zoom (1/2 s/d 1 Halaman), buka kunci halaman, dan otomasi pengingat WhatsApp.
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
                Antrean Setoran Zoom
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1">{kpis.pendingSubmissions}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <Video className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Setoran Zoom Lulus
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{kpis.passedSubmissions}</p>
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
                Halaman Ujian Lulus
              </p>
              <p className="text-3xl font-black text-[#800000] mt-1">{kpis.passedExams}</p>
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

      <Tabs defaultValue="submissions" className="w-full space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger
            value="submissions"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Setoran Live Zoom ({kpis.pendingSubmissions})
          </TabsTrigger>
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
          <TabsTrigger
            value="reminders"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Pengingat WhatsApp ({tikrarWaLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Setoran Live Zoom (Portal Musyrifah) */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['pending', 'all', 'passed', 'needs_revision'] as const).map((statusKey) => (
              <Button
                key={statusKey}
                size="sm"
                variant={submissionFilter === statusKey ? 'default' : 'outline'}
                onClick={() => setSubmissionFilter(statusKey)}
                className={cn(
                  'text-[11px] font-black uppercase tracking-wider rounded-full h-8',
                  submissionFilter === statusKey && 'bg-[#800000] hover:bg-[#800000]/90 text-white'
                )}
              >
                {statusKey === 'pending'
                  ? 'Menunggu Setoran (Pending)'
                  : statusKey === 'all'
                  ? 'Semua Setoran'
                  : statusKey === 'passed'
                  ? 'Lulus'
                  : 'Perlu Revisi'}
              </Button>
            ))}
          </div>

          {loadingSubmissions ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">Memuat antrean setoran Live Zoom...</p>
              </CardContent>
            </Card>
          ) : filteredSubmissions.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 text-center text-muted-foreground text-sm">
                Tidak ada data setoran Live Zoom yang sesuai filter.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubmissions.map((sub: any) => {
                const u = userMap.get(sub.user_id);
                const h = halaqahMap.get(sub.halaqah_id);
                const name = sub.user_name || u?.full_name || u?.username || 'Thalibah';
                const waNumber = normalizePhone(u?.whatsapp || u?.phone);
                const isPassed = sub.status === 'passed';
                const isRevision = sub.status === 'needs_revision';
                const busy = updatingId === sub.id;

                const rangeLabel =
                  sub.blocks_range === 'blok_1_4'
                    ? '1 Halaman Penuh (Blok A-D)'
                    : sub.blocks_range === 'blok_3_4'
                    ? '1/2 Halaman (Blok C & D)'
                    : '1/2 Halaman (Blok A & B)';

                const zoomLink = sub.zoom_meeting_url || h?.zoom_link;

                return (
                  <Card
                    key={sub.id}
                    className={cn(
                      'border-none shadow-sm bg-white overflow-hidden',
                      isPassed
                        ? 'border-l-4 border-l-emerald-500'
                        : isRevision
                        ? 'border-l-4 border-l-rose-500'
                        : 'border-l-4 border-l-amber-500'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-slate-900">{name}</h3>
                            <Badge
                              className={cn(
                                'text-[9px] font-black uppercase tracking-wider',
                                isPassed
                                  ? 'bg-emerald-500 text-white'
                                  : isRevision
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-500 text-white'
                              )}
                            >
                              {isPassed
                                ? `LULUS (${sub.grade?.toUpperCase() || 'MUMTAZ'})`
                                : isRevision
                                ? 'PERLU REVISI'
                                : 'MENUNGGU SETORAN'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {h?.schedule || h?.title || 'Sesi Live Zoom'} • Diajukan:{' '}
                            {sub.submitted_at
                              ? new Date(sub.submitted_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Halaman
                          </span>
                          <p className="text-2xl font-black text-[#800000] leading-none">
                            {sub.page_number}
                          </p>
                          <span className="text-[9px] font-bold text-muted-foreground">
                            Juz {sub.juz}
                          </span>
                        </div>
                      </div>

                      {/* Satuan Materi & Catatan Thalibah */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          🎯 {rangeLabel}
                        </span>
                        {sub.notes && (
                          <span className="text-slate-600 italic text-[11px]">
                            &ldquo;{sub.notes}&rdquo;
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      {/* Form Penilaian & Feedback Musyrifah */}
                      <div className="p-3 rounded-xl bg-slate-50 border space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700">Predikat:</span>
                          <select
                            value={submissionGrades[sub.id] ?? (sub.grade || 'mumtaz')}
                            onChange={(e) =>
                              setSubmissionGrades((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            disabled={busy}
                            className="text-xs font-bold h-8 rounded-lg border border-slate-200 bg-white px-2 text-slate-800"
                          >
                            <option value="mumtaz">Mumtaz (Istimewa - 100)</option>
                            <option value="jayyid_jiddan">Jayyid Jiddan (Sangat Baik - 90)</option>
                            <option value="jayyid">Jayyid (Baik - 80)</option>
                          </select>

                          {zoomLink && (
                            <Button
                              asChild
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 ml-auto gap-1"
                            >
                              <a href={zoomLink} target="_blank" rel="noopener noreferrer">
                                <Video className="w-3.5 h-3.5" /> Buka Zoom
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            </Button>
                          )}
                        </div>

                        <Input
                          placeholder="Catatan feedback Musyrifah (tajwid, makhraj, kelancaran)..."
                          value={submissionFeedback[sub.id] ?? (sub.feedback || '')}
                          onChange={(e) =>
                            setSubmissionFeedback((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                          disabled={busy}
                          className="h-8 text-xs bg-white"
                        />

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => handleVerifySubmission(sub, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 flex-1 gap-1"
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Luluskan ({sub.blocks_range === 'blok_1_4' ? '+250 Poin' : '+100 Poin'})
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => handleVerifySubmission(sub, false)}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold h-8 gap-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Minta Revisi
                          </Button>

                          {waNumber && (
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs font-bold text-emerald-700 px-2"
                              title="Chat WhatsApp Thalibah"
                            >
                              <a
                                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                  `Assalamu'alaikum ${name}, terkait setoran Tikrar Halaman ${sub.page_number} (${rangeLabel})...`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Ujian Halaman */}
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
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 text-center text-muted-foreground text-sm">
                Tidak ada data ujian halaman yang sesuai filter.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExams.map((exam: any) => {
                const u = userMap.get(exam.user_id);
                const name = u?.full_name || u?.username || 'Thalibah';
                const waNumber = normalizePhone(u?.whatsapp || u?.phone);
                const isPassed = Boolean(exam.passed);
                const busy = updatingId === exam.id;

                return (
                  <Card
                    key={exam.id}
                    className={cn(
                      'border-none shadow-sm bg-white overflow-hidden',
                      isPassed ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900">{name}</h3>
                            <Badge
                              className={cn(
                                'text-[9px] font-black uppercase tracking-wider',
                                isPassed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                              )}
                            >
                              {isPassed ? 'Lulus' : 'Menunggu Verifikasi'}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-0.5">
                            {u?.email || '-'} • Diajukan:{' '}
                            {exam.created_at
                              ? new Date(exam.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '-'}
                          </CardDescription>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Halaman
                          </span>
                          <p className="text-2xl font-black text-[#800000] leading-none">
                            {exam.page_number}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Nilai (0-100)"
                          value={scoreInputs[exam.id] ?? String(exam.score ?? (isPassed ? 90 : 0))}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({ ...prev, [exam.id]: e.target.value }))
                          }
                          className="w-28 h-8 text-xs font-bold"
                          disabled={busy}
                        />

                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => handleApproveExam(exam, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Luluskan'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleApproveExam(exam, false)}
                          className="border-slate-200 text-slate-700 text-xs font-bold h-8"
                        >
                          Tandai Belum Lulus
                        </Button>

                        {waNumber && (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs font-bold text-emerald-700 ml-auto"
                          >
                            <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                `Assalamu'alaikum ${name}, terkait ujian Tikrar Halaman ${exam.page_number}...`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" /> Hubungi WA
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

        {/* Tab 3: Peserta & Akses Juz */}
        <TabsContent value="participants" className="space-y-4">
          {loadingUsers ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">Memuat data peserta...</p>
              </CardContent>
            </Card>
          ) : filteredParticipants.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 text-center text-muted-foreground text-sm">
                Tidak ada peserta yang sesuai dengan pencarian.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredParticipants.map((p: any) => {
                const name = p.full_name || p.username || 'Thalibah';
                const waNumber = normalizePhone(p.whatsapp || p.phone);

                return (
                  <Card key={p.id} className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900">{name}</h3>
                          {p.is_tikrar_paid && (
                            <Badge className="bg-[#800000] text-white text-[9px] font-black uppercase tracking-wider">
                              Full Akses
                            </Badge>
                          )}
                          {p.tajwidPassed && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-black uppercase tracking-wider">
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

        {/* Tab 4: Otomasi Pengingat WhatsApp Tikrar */}
        <TabsContent value="reminders" className="space-y-6">
          {/* Panel Info Jadwal Cron */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#800000]" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Sistem Otomasi Pengingat WhatsApp Hi Tikrar
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Jadwal pengiriman pesan otomatis melalui WatZap Gateway / Fonnte untuk mempertahankan keaktifan 5 hari/pekan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Jadwal Pagi */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      🌅 Morning Briefing Target
                    </span>
                    <Badge className="bg-amber-600 text-white text-[9px] font-black">06:00 WIB</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Mengirimkan briefing target harian (Juz, Halaman, dan Beban Blok) serta motivasi repetisi 40x ke seluruh peserta aktif Tikrar.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      disabled={isTriggeringReminder}
                      onClick={() => handleTriggerReminder('morning', false)}
                      className="bg-[#800000] hover:bg-[#6a0000] text-white text-xs font-bold h-8 gap-1.5"
                    >
                      {isTriggeringReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Kirim Pagi Sekarang
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTriggeringReminder}
                      onClick={() => handleTriggerReminder('morning', true)}
                      className="text-xs font-bold h-8 border-slate-300"
                    >
                      Simulasi (Dry Run)
                    </Button>
                  </div>
                </div>

                {/* Jadwal Malam */}
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      🌙 Evening Reminder (Conditional)
                    </span>
                    <Badge className="bg-indigo-600 text-white text-[9px] font-black">20:00 WIB</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hanya dikirimkan kepada peserta yang <strong>belum mengisi laporan harian</strong> hari ini untuk mempertahankan streak dan kuota 5 hari aktif pekan ini.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      disabled={isTriggeringReminder}
                      onClick={() => handleTriggerReminder('evening', false)}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold h-8 gap-1.5"
                    >
                      {isTriggeringReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Kirim Malam Sekarang
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTriggeringReminder}
                      onClick={() => handleTriggerReminder('evening', true)}
                      className="text-xs font-bold h-8 border-slate-300"
                    >
                      Simulasi (Dry Run)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Endpoint Documentation */}
              <div className="p-3 bg-slate-50 border rounded-xl text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-slate-800">Tautan Cron Eksternal VPS:</p>
                <code className="text-[11px] bg-slate-200 text-slate-900 px-2 py-0.5 rounded font-mono">
                  curl -H &quot;Authorization: Bearer $CRON_SECRET&quot; https://hiaqli.pro/api/cron/tikrar-reminder?type=morning
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Trigger Result Preview */}
          {reminderResult && (
            <Card className="border border-emerald-300 bg-emerald-50/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Hasil Eksekusi Cron ({reminderResult.mode === 'dry_run' ? 'Simulasi' : 'Terkirim'})
                </CardTitle>
                <CardDescription className="text-xs">
                  Tipe: {reminderResult.type} • Total Peserta: {reminderResult.totalParticipants} • Diproses: {reminderResult.processed}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs max-h-60 overflow-y-auto space-y-2">
                {reminderResult.results?.map((r: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border text-xs flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold">{r.name}</span>
                      <span className="text-muted-foreground ml-2">({r.phone || '-'})</span>
                      {r.reason && <p className="text-[11px] text-amber-700 italic">{r.reason}</p>}
                    </div>
                    <Badge variant={r.status === 'sent' ? 'default' : 'outline'} className="text-[9px]">
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tabel Log Pengiriman WhatsApp Tikrar */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Riwayat Log WhatsApp Tikrar
                </CardTitle>
                <CardDescription className="text-xs">
                  Audit trail pengiriman pesan briefing pagi dan pengingat malam.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => refreshWaLogs()} className="text-xs font-bold h-8">
                Refresh Log
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loadingWaLogs ? (
                <div className="p-8 text-center text-muted-foreground text-xs font-bold">
                  Memuat riwayat log...
                </div>
              ) : tikrarWaLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Belum ada catatan log pengiriman WhatsApp untuk Tikrar.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
                  {tikrarWaLogs.map((log: any) => (
                    <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-bold">
                            {log.type === 'tikrar_morning' ? '🌅 Pagi' : '🌙 Malam'}
                          </Badge>
                          <span className="font-bold text-slate-900">{log.recipient}</span>
                          <Badge
                            className={cn(
                              'text-[8px] font-bold',
                              log.status === 'sent' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                            )}
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-slate-600 line-clamp-2 max-w-xl text-[11px]">{log.message}</p>
                      </div>

                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
