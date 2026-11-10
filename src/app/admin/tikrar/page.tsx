'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser, useCollection, db } from '@/db';
import { authFetch } from '@/db/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { TikrarGroupHeatmap } from '@/components/tikrar/tikrar-group-heatmap';
import { TikrarManualSetoranForm } from '@/components/tikrar/tikrar-manual-setoran-form';
import { TikrarPriorHafalanAdmin } from '@/components/tikrar/tikrar-prior-hafalan-admin';
import { getJuzPageRange, TIKRAR_GRADE_LABELS, TIKRAR_WA_SALUTATION } from '@/lib/tikrar-schedule-generator';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BellRing,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  MessageCircle,
  Play,
  Repeat,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';

interface HalaqahEditDraft {
  zoom_link: string;
  zoom_passcode: string;
  musyrifah: string;
  schedule: string;
  whatsapp_group_link: string;
}

function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function formatBlocksRangeBadge(range?: string | null): string {
  if (range === 'blok_1_4') return '1 Halaman Penuh (Blok A–D)';
  if (range === 'blok_3_4') return '1/2 Halaman (Blok C & D)';
  return '1/2 Halaman (Blok A & B)';
}

function isPlaceholderZoomLink(url?: string | null): boolean {
  const trimmed = String(url || '').trim();
  if (!trimmed) return true;
  return trimmed.includes('hiaqli-tikrar-');
}

export default function AdminTikrarPage() {
  const { user } = useUser();
  const { isSuperUser } = useUserPermissions(user?.id);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('submissions');
  // Dari tab Hafalan Lama: isi otomatis form setoran tasmi' manual
  const [setoranPrefill, setSetoranPrefill] = useState<{ userId: string; page: number; name: string; nonce: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [subStatusFilter, setSubStatusFilter] = useState<
    'pending' | 'needs_revision' | 'passed' | 'all'
  >('pending');
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [notifyWaMap, setNotifyWaMap] = useState<Record<string, boolean>>({});
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);

  // Legacy page_exams & participant state
  const [examFilter, setExamFilter] = useState<'all' | 'pending' | 'passed'>('all');
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [participantScope, setParticipantScope] = useState<'registered' | 'all'>('registered');

  // Fase 4 Cron Reminder Preview & Dispatch state
  const [reminderMode, setReminderMode] = useState<'morning' | 'sunday_closing' | 'evening' | 'friday_weekly'>(
    'morning'
  );
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState<any | null>(null);

  // Halaqah Tikrar Session & Zoom Link editor state
  const [sessionEdits, setSessionEdits] = useState<Record<string, HalaqahEditDraft>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

  const submissionsOptions = useMemo(
    () => ({
      orderBy: { column: 'submitted_at', ascending: false },
    }),
    []
  );
  const examOptions = useMemo(
    () => ({
      orderBy: { column: 'created_at', ascending: false },
    }),
    []
  );

  const { data: users, isLoading: loadingUsers, refresh: refreshUsers } = useCollection<any>(
    user ? 'users' : null
  );
  const {
    data: submissions,
    isLoading: loadingSubmissions,
    refresh: refreshSubmissions,
  } = useCollection<any>(user ? 'tikrar_submissions' : null, submissionsOptions);
  const { data: pageExams, refresh: refreshExams } = useCollection<any>(
    user ? 'page_exams' : null,
    examOptions
  );
  const { data: halaqahs, refresh: refreshHalaqahs } = useCollection<any>(
    user ? 'halaqahs' : null
  );
  const waLogsOptions = useMemo(
    () => ({
      orderBy: { column: 'created_at', ascending: false },
      limit: 100,
    }),
    []
  );
  const { data: waLogs, refresh: refreshWaLogs } = useCollection<any>(
    user ? 'whatsapp_logs' : null,
    waLogsOptions
  );
  const tikrarWaLogs = useMemo(
    () => (waLogs || []).filter((l: any) => String(l?.type || '').startsWith('tikrar_')),
    [waLogs]
  );

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    (users || []).forEach((u: any) => {
      if (u?.id) map.set(u.id, u);
    });
    return map;
  }, [users]);

  const tikrarHalaqahs = useMemo(
    () =>
      (halaqahs || [])
        .filter((h: any) => {
          const prog = String(h?.program_type || '').toLowerCase();
          return prog === 'tikrar_daily' || prog.includes('tikrar');
        })
        .sort((a: any, b: any) => String(a.id || '').localeCompare(String(b.id || ''))),
    [halaqahs]
  );

  const placeholderZoomCount = useMemo(
    () => tikrarHalaqahs.filter((h: any) => isPlaceholderZoomLink(h.zoom_link)).length,
    [tikrarHalaqahs]
  );

  const halaqahParticipantCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    (users || []).forEach((u: any) => {
      const hid = u?.tikrar_halaqah_id;
      if (hid) counts.set(hid, (counts.get(hid) || 0) + 1);
    });
    return counts;
  }, [users]);

  const halaqahMap = useMemo(() => {
    const m = new Map<string, any>();
    (halaqahs || []).forEach((h: any) => {
      if (h?.id) m.set(h.id, h);
    });
    return m;
  }, [halaqahs]);

  const tikrarParticipants = useMemo(() => {
    if (!users) return [];

    const subStats = new Map<string, { passed: number; pending: number; revision: number }>();
    (submissions || []).forEach((s: any) => {
      if (!s?.user_id) return;
      const prev = subStats.get(s.user_id) || { passed: 0, pending: 0, revision: 0 };
      if (s.status === 'passed') prev.passed += 1;
      else if (s.status === 'needs_revision') prev.revision += 1;
      else prev.pending += 1;
      subStats.set(s.user_id, prev);
    });

    return users
      .map((u: any) => {
        const activeJuz = Number(u.paidJuz ?? u.paid_juz) || 0;
        const st = subStats.get(u.id) || { passed: 0, pending: 0, revision: 0 };
        const isParticipant =
          (Boolean(u.is_tikrar_paid) && Boolean(u.tikrar_halaqah_id)) ||
          Boolean(u.is_tikrar_paid) ||
          st.passed + st.pending + st.revision > 0;

        return {
          ...u,
          activeJuz: activeJuz >= 1 && activeJuz <= 30 ? activeJuz : 30,
          passedSubmissions: st.passed,
          pendingSubmissions: st.pending,
          revisionSubmissions: st.revision,
          isParticipant,
        };
      })
      .sort((a: any, b: any) => {
        if (a.isParticipant !== b.isParticipant) return a.isParticipant ? -1 : 1;
        return b.passedSubmissions - a.passedSubmissions;
      });
  }, [users, submissions]);

  const kpis = useMemo(() => {
    const activeCount = tikrarParticipants.filter((u: any) => u.isParticipant).length;
    const pendingSubCount = (submissions || []).filter((s: any) => s.status === 'pending').length;
    const passedSubCount = (submissions || []).filter((s: any) => s.status === 'passed').length;
    const revisionSubCount = (submissions || []).filter(
      (s: any) => s.status === 'needs_revision'
    ).length;
    return {
      activeCount,
      pendingSubCount,
      passedSubCount,
      revisionSubCount,
    };
  }, [tikrarParticipants, submissions]);

  const filteredSubmissions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (submissions || []).filter((s: any) => {
      if (subStatusFilter !== 'all' && s.status !== subStatusFilter) return false;
      if (sessionFilter !== 'all' && s.halaqah_id !== sessionFilter) return false;
      if (!q) return true;
      const u = userMap.get(s.user_id);
      const name = String(s.user_name || u?.full_name || u?.username || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      const pageStr = String(s.page_number || '');
      return name.includes(q) || email.includes(q) || pageStr.includes(q);
    });
  }, [submissions, subStatusFilter, sessionFilter, searchTerm, userMap]);

  const filteredParticipants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return tikrarParticipants.filter((u: any) => {
      if (participantScope === 'registered' && !u.isParticipant) return false;
      if (!q) return true;
      const name = String(u.full_name || u.username || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const phone = String(u.whatsapp || u.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [tikrarParticipants, participantScope, searchTerm]);

  const filteredExams = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (pageExams || []).filter((exam: any) => {
      if (examFilter === 'pending' && exam.passed) return false;
      if (examFilter === 'passed' && !exam.passed) return false;
      if (!q) return true;
      const u = userMap.get(exam.user_id);
      const name = String(u?.full_name || u?.username || '').toLowerCase();
      const pageStr = String(exam.page_number || '');
      return name.includes(q) || pageStr.includes(q);
    });
  }, [pageExams, examFilter, searchTerm, userMap]);

  const getSessionDraft = (h: any): HalaqahEditDraft => {
    if (sessionEdits[h.id]) return sessionEdits[h.id];
    return {
      zoom_link: String(h.zoom_link || ''),
      zoom_passcode: String(h.zoom_passcode || ''),
      musyrifah: String(h.musyrifah || ''),
      schedule: String(h.schedule || ''),
      whatsapp_group_link: String(h.whatsapp_group_link || ''),
    };
  };

  const updateSessionDraftField = (
    h: any,
    field: keyof HalaqahEditDraft,
    value: string
  ) => {
    setSessionEdits((prev) => {
      const current = prev[h.id] || {
        zoom_link: String(h.zoom_link || ''),
        zoom_passcode: String(h.zoom_passcode || ''),
        musyrifah: String(h.musyrifah || ''),
        schedule: String(h.schedule || ''),
        whatsapp_group_link: String(h.whatsapp_group_link || ''),
      };
      return {
        ...prev,
        [h.id]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSaveHalaqahSession = async (h: any) => {
    const draft = getSessionDraft(h);
    const zoomLink = draft.zoom_link.trim();
    const waLink = draft.whatsapp_group_link.trim();

    if (zoomLink && !/^https?:\/\//i.test(zoomLink)) {
      toast({
        variant: 'destructive',
        title: 'Format Tautan Zoom Belum Valid',
        description: 'Gunakan URL lengkap yang diawali https:// (mis. https://us06web.zoom.us/j/...).',
      });
      return;
    }

    if (waLink && !/^https?:\/\//i.test(waLink)) {
      toast({
        variant: 'destructive',
        title: 'Format Tautan Grup WA Belum Valid',
        description: 'Gunakan URL lengkap yang diawali https:// (mis. https://chat.whatsapp.com/...).',
      });
      return;
    }

    setSavingSessionId(h.id);
    try {
      const { error } = await db
        .from('halaqahs')
        .update({
          zoom_link: zoomLink || null,
          zoom_passcode: draft.zoom_passcode.trim() || null,
          musyrifah: draft.musyrifah.trim() || 'Musyrifah Tikrar',
          schedule: draft.schedule.trim() || h.schedule,
          whatsapp_group_link: waLink || null,
        })
        .eq('id', h.id);

      if (error) {
        throw new Error(error.message || 'Gagal memperbarui sesi Halaqah Tikrar.');
      }

      toast({
        title: 'Tautan Zoom & Sesi Tersimpan!',
        description: `${h.title} berhasil diperbarui dan langsung aktif untuk seluruh peserta.`,
      });

      await refreshHalaqahs();
      setSessionEdits((prev) => {
        const next = { ...prev };
        delete next[h.id];
        return next;
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan Sesi Halaqah',
        description: err?.message || 'Pastikan akun memiliki akses Musyrifah/Admin.',
      });
    } finally {
      setSavingSessionId(null);
    }
  };

  const handleVerifySubmission = async (
    sub: any,
    grade: 'mumtaz' | 'jayyid_jiddan' | 'perlu_perbaikan'
  ) => {
    const key = `${sub.id}:${grade}`;
    setVerifyingKey(key);
    try {
      const feedback =
        feedbackInputs[sub.id] !== undefined ? feedbackInputs[sub.id] : sub.feedback || '';
      const sendWhatsapp = notifyWaMap[sub.id] ?? true;

      const res = await authFetch('/api/tikrar/submissions/verify', {
        method: 'POST',
        body: JSON.stringify({
          submission_id: sub.id,
          grade,
          feedback,
          send_whatsapp: sendWhatsapp,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal memverifikasi setoran.');
      }

      const d = json.data || {};
      const gradeLabel = TIKRAR_GRADE_LABELS[grade] || grade;
      toast({
        title:
          grade === 'perlu_perbaikan'
            ? 'Evaluasi Perbaikan Tersimpan'
            : `Setoran Lulus (${gradeLabel})!`,
        description:
          grade === 'perlu_perbaikan'
            ? `Catatan perbaikan Halaman ${sub.page_number} telah dikirim ke profil peserta.`
            : `Halaman ${sub.page_number} disetujui${
                d.pointsAwarded ? ` (+${d.pointsAwarded} Poin)` : ''
              }${d.pageCleared ? ' • tercatat sudah diuji' : ''}.`,
      });

      await Promise.all([refreshSubmissions(), refreshUsers(), refreshExams(), refreshWaLogs()]);
    } catch (err: any) {
      toast({
        title: 'Gagal Memverifikasi Setoran',
        description: err?.message || 'Terjadi kendala saat menyimpan verifikasi.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingKey(null);
    }
  };

  const handleRunReminderCron = async (dryRun: boolean) => {
    setReminderLoading(true);
    try {
      const res = await authFetch('/api/cron/tikrar-reminder', {
        method: 'POST',
        body: JSON.stringify({
          mode: reminderMode,
          dryRun,
          force: dryRun, // Allow previewing even on weekend/after send when dryRun=true
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Gagal menjalankan cron pengingat Tikrar.');
      }
      setReminderResult(json);
      if (!dryRun) refreshWaLogs();
      toast({
        title: dryRun ? 'Pratinjau Pesan Siap' : 'Pengingat WhatsApp Terkirim!',
        description: dryRun
          ? `Ditemukan ${json.summary?.eligible || 0} peserta target untuk mode ${reminderMode}.`
          : `Berhasil mengirim ${json.summary?.sent || 0} pesan WhatsApp (Gagal: ${
              json.summary?.failed || 0
            }).`,
      });
    } catch (err: any) {
      toast({
        title: 'Kendala Pengingat WhatsApp',
        description: err?.message || 'Silakan periksa konfigurasi WatZap.',
        variant: 'destructive',
      });
    } finally {
      setReminderLoading(false);
    }
  };

  const handleToggleTikrarPaid = async (participant: any) => {
    setUpdatingId(participant.id);
    const nextVal = !participant.is_tikrar_paid;
    const updatePayload: any = { is_tikrar_paid: nextVal };
    if (nextVal) {
      if (!participant.tikrar_halaqah_id) {
        updatePayload.tikrar_halaqah_id = 'a1111111-1111-4000-8000-000000000001';
      }
      if (!participant.tikrar_start_date) {
        updatePayload.tikrar_start_date = new Date().toISOString();
      }
    } else {
      updatePayload.tikrar_halaqah_id = null;
    }
    const { error } = await db
      .from('users')
      .update(updatePayload)
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

  const handleChangeParticipantJuz = async (participant: any, juzNum: number) => {
    setUpdatingId(`${participant.id}-juz`);
    const { startPage } = getJuzPageRange(juzNum);
    const { error } = await db
      .from('users')
      .update({ paidJuz: juzNum, tikrar_current_page: startPage, tikrar_current_block: 1 })
      .eq('id', participant.id);
    setUpdatingId(null);

    if (error) {
      toast({
        title: 'Gagal Menyimpan Juz',
        description: error.message || 'Tidak dapat memperbarui Juz aktif peserta.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Target Juz Diperbarui',
      description: `${participant.full_name || participant.username || 'Peserta'} kini diatur ke Juz ${juzNum} (mulai Hal. ${startPage}).`,
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

  const selectedHalaqahObj = sessionFilter !== 'all' ? halaqahMap.get(sessionFilter) : null;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#800000]">
            <Repeat className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Portal Musyrifah &amp; Administrator HI Tikrar
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Verifikasi Tasmi&apos; Live Zoom &amp; Monitoring Grup
          </h1>
          <p className="text-sm text-muted-foreground">
            Simak antrean setoran 1/2 halaman &amp; 1 halaman via Live Zoom, buka kunci halaman
            berikutnya, pantau heatmap grup, dan kelola tautan Zoom serta pengingat WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <Button asChild variant="outline" className="font-bold border-slate-200">
            <Link href="/tikrar">
              <BookOpen className="w-4 h-4 mr-2 text-[#800000]" /> Halaman Peserta
            </Link>
          </Button>
          <Button asChild variant="outline" className="font-bold border-slate-200">
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard Admin
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Peserta Tikrar Aktif
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
                Antrean Tasmi&apos; Zoom
              </p>
              <p className="text-3xl font-black text-amber-600 mt-1">{kpis.pendingSubCount}</p>
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
                Setoran Lulus
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{kpis.passedSubCount}</p>
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
                Perlu Perbaikan
              </p>
              <p className="text-3xl font-black text-rose-600 mt-1">{kpis.revisionSubCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="text-xs font-bold"
            >
              Reset
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger
            value="submissions"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Antrean Tasmi&apos; Live Zoom ({kpis.pendingSubCount})
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2 gap-1.5"
          >
            Sesi &amp; Link Zoom ({tikrarHalaqahs.length})
            {placeholderZoomCount > 0 && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-black">
                {placeholderZoomCount} Placeholder
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="prior"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Hafalan Lama
          </TabsTrigger>
          <TabsTrigger
            value="heatmap"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Heatmap Grup
          </TabsTrigger>
          <TabsTrigger
            value="reminders"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Pengingat WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="rounded-lg font-black text-xs uppercase tracking-wider data-[state=active]:bg-[#800000] data-[state=active]:text-white px-4 py-2"
          >
            Peserta &amp; Akses Juz ({filteredParticipants.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Verifikasi Kelas Setoran Live Zoom (Fase 5) */}
        <TabsContent value="submissions" className="space-y-4 outline-none">
          <div id="manual-setoran-form">
            <TikrarManualSetoranForm
              participants={tikrarParticipants}
              prefill={setoranPrefill}
              onSaved={() => Promise.all([refreshSubmissions(), refreshUsers(), refreshExams()])}
            />
          </div>
          {placeholderZoomCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5 text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-black uppercase tracking-wider text-amber-900">
                    {placeholderZoomCount} Sesi Halaqah Masih Menggunakan Tautan Zoom Placeholder
                  </p>
                  <p className="text-amber-800">
                    Perbarui tautan Zoom asli dan jadwal resmi Hi Tikrar agar tombol Ruang
                    Zoom peserta &amp; Musyrifah mengarah ke ruang meeting resmi HI AQLI.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab('sessions')}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs shrink-0"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Perbarui Link Zoom
              </Button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Filter Sesi Halaqah Live Zoom
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSessionFilter('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                    sessionFilter === 'all'
                      ? 'bg-[#800000] text-white border-[#800000]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  Semua Sesi
                </button>
                {tikrarHalaqahs.map((h: any) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSessionFilter(h.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                      sessionFilter === h.id
                        ? 'bg-[#800000] text-white border-[#800000]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {String(h.title || '').replace('Hi Tikrar - ', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('sessions')}
                className="font-bold text-xs h-10 border-slate-200"
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5 text-[#800000]" />
                Kelola Link Zoom
              </Button>

              {selectedHalaqahObj?.zoom_link && (
                <Button
                  asChild
                  className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-10 shrink-0"
                >
                  <a href={selectedHalaqahObj.zoom_link} target="_blank" rel="noopener noreferrer">
                    <Video className="w-4 h-4 mr-2 text-[#D4AF37]" />
                    Buka Ruang Zoom Sesi Ini
                    <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                { key: 'pending', label: `Menunggu Simak (${kpis.pendingSubCount})` },
                { key: 'needs_revision', label: `Perlu Perbaikan (${kpis.revisionSubCount})` },
                { key: 'passed', label: `Lulus Tasmi' (${kpis.passedSubCount})` },
                { key: 'all', label: 'Semua Riwayat' },
              ] as const
            ).map((st) => (
              <Button
                key={st.key}
                size="sm"
                variant={subStatusFilter === st.key ? 'default' : 'outline'}
                onClick={() => setSubStatusFilter(st.key)}
                className={cn(
                  'text-[11px] font-black uppercase tracking-wider rounded-full h-8',
                  subStatusFilter === st.key && 'bg-[#800000] hover:bg-[#800000]/90 text-white'
                )}
              >
                {st.label}
              </Button>
            ))}
          </div>

          {loadingSubmissions ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Memuat antrean setoran Live Zoom...
                </p>
              </CardContent>
            </Card>
          ) : filteredSubmissions.length === 0 ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 text-center space-y-2">
                <Video className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-black uppercase text-slate-600">
                  Tidak Ada Antrean pada Filter Ini
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Thalibah yang telah menyelesaikan minimal 2 blok (40x repetisi/blok) dan menekan
                  &ldquo;Daftar Antrean Setoran&rdquo; akan muncul di sini untuk disimak secara Live
                  Zoom.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSubmissions.map((sub: any) => {
                const participant = userMap.get(sub.user_id);
                const fullName =
                  sub.user_name ||
                  participant?.full_name ||
                  participant?.username ||
                  'Thalibah HI AQLI';
                const salutation = TIKRAR_WA_SALUTATION;
                const waNumber = normalizePhone(participant?.whatsapp || participant?.phone);
                const halaqahObj = sub.halaqah_id ? halaqahMap.get(sub.halaqah_id) : null;
                const zoomUrl = sub.zoom_meeting_url || halaqahObj?.zoom_link || null;
                const feedbackVal =
                  feedbackInputs[sub.id] !== undefined
                    ? feedbackInputs[sub.id]
                    : sub.feedback || '';
                const notifyWa = notifyWaMap[sub.id] ?? Boolean(waNumber);
                const isRowBusy = verifyingKey?.startsWith(`${sub.id}:`);

                return (
                  <Card
                    key={sub.id}
                    className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-[#800000] text-white font-black text-[10px] uppercase">
                              Juz {sub.juz} • Halaman {sub.page_number}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-[#800000]/30 text-[#800000] font-black text-[10px]"
                            >
                              {formatBlocksRangeBadge(sub.blocks_range)}
                            </Badge>
                            {sub.status === 'passed' ? (
                              <Badge className="bg-amber-500 text-black hover:bg-amber-500 font-black text-[10px] uppercase">
                                ★ LULUS • {TIKRAR_GRADE_LABELS[sub.grade] || sub.grade || 'Mumtaz'}
                              </Badge>
                            ) : sub.status === 'needs_revision' ? (
                              <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 font-black text-[10px] uppercase">
                                PERLU PERBAIKAN TAJWID/KELANCARAN
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 font-black text-[10px] uppercase">
                                MENUNGGU SIMAK LIVE ZOOM
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-black text-slate-900">{fullName}</h3>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              Sesi:{' '}
                              <strong className="text-slate-700">
                                {halaqahObj?.title || 'Belum memilih sesi'}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Diajukan:{' '}
                              {sub.submitted_at
                                ? new Date(sub.submitted_at).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </span>
                            {sub.verified_at && sub.musyrifah_name && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold">
                                  Disimak oleh {sub.musyrifah_name}
                                </span>
                              </>
                            )}
                          </div>

                          {sub.notes && (
                            <p className="text-xs bg-amber-50/70 border border-amber-200 text-amber-950 rounded-lg px-3 py-2 mt-1">
                              <strong>Catatan Peserta:</strong> {sub.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {zoomUrl && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs font-bold border-[#800000]/30 text-[#800000] hover:bg-red-50"
                            >
                              <a href={zoomUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="w-3.5 h-3.5 mr-1.5" /> Ruang Zoom
                              </a>
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
                                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                  `Assalamu'alaikum ${salutation} ${fullName}, silakan bersiap untuk giliran setoran tasmi' Live Zoom Halaman ${sub.page_number} ya.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Panggil WA
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Form Evaluasi Musyrifah */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                            Catatan Evaluasi Tajwid, Makharijul Huruf &amp; Kelancaran (Opsional)
                          </label>
                          <Textarea
                            rows={2}
                            value={feedbackVal}
                            onChange={(e) =>
                              setFeedbackInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            placeholder="Contoh: Bacaan tartil dan mutqin, perhatikan panjang mad wajib muttashil pada ayat ke-6..."
                            className="bg-white text-xs resize-none"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                            <Checkbox
                              checked={notifyWa}
                              disabled={!waNumber}
                              onCheckedChange={(v) =>
                                setNotifyWaMap((prev) => ({ ...prev, [sub.id]: Boolean(v) }))
                              }
                            />
                            <span>
                              Kirim notifikasi hasil setoran otomatis ke WhatsApp peserta
                              {!waNumber ? ' (Nomor WA belum diisi)' : ''}
                            </span>
                          </label>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={Boolean(isRowBusy)}
                              onClick={() => handleVerifySubmission(sub, 'mumtaz')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-3.5"
                            >
                              {verifyingKey === `${sub.id}:mumtaz` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Mumtaz (Lulus)
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              disabled={Boolean(isRowBusy)}
                              onClick={() => handleVerifySubmission(sub, 'jayyid_jiddan')}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs h-9 px-3.5"
                            >
                              {verifyingKey === `${sub.id}:jayyid_jiddan` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Jayyid Jiddan (Lulus)
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Boolean(isRowBusy)}
                              onClick={() => handleVerifySubmission(sub, 'perlu_perbaikan')}
                              className="border-rose-300 text-rose-700 hover:bg-rose-50 font-black text-xs h-9 px-3.5"
                            >
                              {verifyingKey === `${sub.id}:perlu_perbaikan` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Perlu Perbaikan Tajwid/Kelancaran
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Pengaturan Sesi Halaqah & Tautan Zoom Asli */}
        <TabsContent value="sessions" className="space-y-4 outline-none">
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-[#800000] text-xs font-black uppercase tracking-wider">
                <Video className="w-4 h-4" /> Manajemen Ruang Live Zoom &amp; Grup WhatsApp Halaqah
              </div>
              <CardTitle className="text-lg font-black">
                Pengaturan 3 Sesi Halaqah HI Tikrar
              </CardTitle>
              <CardDescription className="text-xs">
                Perbarui tautan Zoom Meeting asli, passcode, Musyrifah pengampu, jadwal sesi, dan
                tautan Grup WhatsApp. Perubahan langsung tampil pada halaman peserta{' '}
                <code>/tikrar</code> dan panel verifikasi tasmi&apos;.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {tikrarHalaqahs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">
                  Belum ada sesi Halaqah Tikrar terdaftar pada tabel <code>halaqahs</code>.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {tikrarHalaqahs.map((h: any) => {
                    const draft = getSessionDraft(h);
                    const isPlaceholder = isPlaceholderZoomLink(draft.zoom_link);
                    const assignedCount = halaqahParticipantCountMap.get(h.id) || 0;
                    const isSavingRow = savingSessionId === h.id;
                    const hasChanges =
                      draft.zoom_link !== String(h.zoom_link || '') ||
                      draft.zoom_passcode !== String(h.zoom_passcode || '') ||
                      draft.musyrifah !== String(h.musyrifah || '') ||
                      draft.schedule !== String(h.schedule || '') ||
                      draft.whatsapp_group_link !== String(h.whatsapp_group_link || '');

                    return (
                      <div
                        key={h.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-slate-900">{h.title}</h3>
                              {isPlaceholder ? (
                                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px] font-black uppercase">
                                  Tautan Placeholder
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-black uppercase">
                                  Link Zoom Aktif
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {assignedCount} Thalibah Terdaftar
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              ID Sesi: <code>{h.id}</code>
                            </p>
                          </div>

                          {draft.zoom_link.trim() && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-bold border-[#800000]/30 text-[#800000] self-start"
                            >
                              <a
                                href={draft.zoom_link.trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Uji Buka Link Zoom
                              </a>
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5 md:col-span-2">
                            <label
                              htmlFor={`zoom-link-${h.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-700"
                            >
                              Tautan Zoom Meeting Resmi (zoom_link)
                            </label>
                            <Input
                              id={`zoom-link-${h.id}`}
                              value={draft.zoom_link}
                              onChange={(e) =>
                                updateSessionDraftField(h, 'zoom_link', e.target.value)
                              }
                              placeholder="https://us06web.zoom.us/j/81234567890?pwd=..."
                              className="bg-white font-medium text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label
                              htmlFor={`zoom-pass-${h.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-700"
                            >
                              Passcode Zoom (Opsional)
                            </label>
                            <Input
                              id={`zoom-pass-${h.id}`}
                              value={draft.zoom_passcode}
                              onChange={(e) =>
                                updateSessionDraftField(h, 'zoom_passcode', e.target.value)
                              }
                              placeholder="Contoh: HIAQLI2026"
                              className="bg-white text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label
                              htmlFor={`musyrifah-${h.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-700"
                            >
                              Nama Musyrifah Pengampu
                            </label>
                            <Input
                              id={`musyrifah-${h.id}`}
                              value={draft.musyrifah}
                              onChange={(e) =>
                                updateSessionDraftField(h, 'musyrifah', e.target.value)
                              }
                              placeholder="Contoh: Ustadzah Musyrifah Tikrar"
                              className="bg-white text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label
                              htmlFor={`schedule-${h.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-700"
                            >
                              Jadwal Sesi Live Zoom
                            </label>
                            <Input
                              id={`schedule-${h.id}`}
                              value={draft.schedule}
                              onChange={(e) =>
                                updateSessionDraftField(h, 'schedule', e.target.value)
                              }
                              placeholder="Senin - Jumat, 05:30 - 06:30 WIB"
                              className="bg-white text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label
                              htmlFor={`wa-group-${h.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-700"
                            >
                              Tautan Grup WhatsApp Sesi
                            </label>
                            <Input
                              id={`wa-group-${h.id}`}
                              value={draft.whatsapp_group_link}
                              onChange={(e) =>
                                updateSessionDraftField(h, 'whatsapp_group_link', e.target.value)
                              }
                              placeholder="https://chat.whatsapp.com/..."
                              className="bg-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          {hasChanges && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSavingRow}
                              onClick={() =>
                                setSessionEdits((prev) => {
                                  const next = { ...prev };
                                  delete next[h.id];
                                  return next;
                                })
                              }
                              className="text-xs font-bold h-9"
                            >
                              Batal Ubah
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSavingRow}
                            onClick={() => handleSaveHalaqahSession(h)}
                            className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4"
                          >
                            {isSavingRow ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Save className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Simpan Pengaturan Sesi
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hafalan sebelum bergabung per thalibah: halaman yang perlu diuji tasmi' */}
        <TabsContent value="prior" className="outline-none">
          <TikrarPriorHafalanAdmin
            onTestPage={(userId, page, name) => {
              setSetoranPrefill({ userId, page, name, nonce: Date.now() });
              setActiveTab('submissions');
              setTimeout(
                () => document.getElementById('manual-setoran-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                150
              );
            }}
          />
        </TabsContent>

        {/* TAB 3: Heatmap Keaktifan Grup 30 Hari */}
        <TabsContent value="heatmap" className="outline-none">
          <TikrarGroupHeatmap />
        </TabsContent>

        {/* TAB 4: Pengingat Otomatis WhatsApp (Fase 4 Cron) */}
        <TabsContent value="reminders" className="space-y-4 outline-none">
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-[#800000] text-xs font-black uppercase tracking-wider">
                <BellRing className="w-4 h-4" /> Otomasi Pengingat WhatsApp (WatZap Gateway)
              </div>
              <CardTitle className="text-lg font-black">
                Cron Pengingat Harian &amp; Evaluasi Pekanan HI Tikrar
              </CardTitle>
              <CardDescription className="text-xs">
                Sistem mengirim pengingat otomatis 1x sehari pukul 05.00 WIB (ba&apos;da Shubuh untuk target harian) dan akhir pekan Ahad pukul 20.00 WIB (closing &amp; evaluasi pekanan).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  [
                    {
                      id: 'morning',
                      title: '05.00 WIB • Morning Briefing (Habis Shubuh)',
                      desc: 'Mengirim target Halaman, Blok & Surah hari ini (Senin–Jumat) 1x sehari.',
                    },
                    {
                      id: 'sunday_closing',
                      title: 'Ahad 20.00 WIB • Closing & Evaluasi Pekanan',
                      desc: 'Rekap capaian pekanan peserta (Tuntas/Kurang) dan persiapan menyambut pekan baru.',
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setReminderMode(m.id)}
                    className={cn(
                      'text-left p-4 rounded-xl border-2 transition-all space-y-1',
                      reminderMode === m.id
                        ? 'border-[#800000] bg-red-50/40'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    )}
                  >
                    <p className="text-xs font-black text-[#800000]">{m.title}</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{m.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-900">
                    Endpoint Cron VPS: <code>/api/cron/tikrar-reminder?mode={reminderMode}</code>
                  </p>
                  <p>
                    Dilengkapi proteksi anti-duplikat harian pada tabel <code>whatsapp_logs</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reminderLoading}
                    onClick={() => handleRunReminderCron(true)}
                    className="font-black text-xs h-9 border-[#800000]/30 text-[#800000]"
                  >
                    {reminderLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Pratinjau Pesan (Dry-Run)
                  </Button>

                  {isSuperUser && (
                    <Button
                      type="button"
                      disabled={reminderLoading}
                      onClick={() => handleRunReminderCron(false)}
                      className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9"
                    >
                      {reminderLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Kirim Sekarang via WatZap
                    </Button>
                  )}
                </div>
              </div>

              {reminderResult && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">
                      Hasil {reminderResult.dryRun ? 'Pratinjau Dry-Run' : 'Pengiriman Langsung'} (
                      {reminderResult.dateKey} • {reminderResult.mode})
                    </span>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Badge variant="outline">
                        Kandidat: {reminderResult.summary?.candidates || 0}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Target Memenuhi Syarat: {reminderResult.summary?.eligible || 0}
                      </Badge>
                    </div>
                  </div>

                  {Array.isArray(reminderResult.items) && reminderResult.items.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {reminderResult.items.map((item: any) => (
                        <div
                          key={item.userId}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>
                              {item.name} ({item.phone})
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              Hal. {item.page} • Blok {item.blocks}
                            </Badge>
                          </div>
                          {item.message && (
                            <p className="text-slate-600 leading-relaxed">{item.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      {reminderResult.message ||
                        'Tidak ada peserta yang perlu dikirimi pengingat pada mode ini saat ini.'}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base font-black">
                    Audit Trail Pengiriman WhatsApp Tikrar ({tikrarWaLogs.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Log otomatis pengingat harian, evaluasi pekanan, dan notifikasi hasil setoran
                    tasmi&apos;.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refreshWaLogs()}
                  className="text-xs font-bold h-8"
                >
                  Muat Ulang Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tikrarWaLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Belum ada riwayat pengiriman WhatsApp Tikrar pada tabel <code>whatsapp_logs</code>.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {tikrarWaLogs.map((log: any) => {
                    const u = userMap.get(log.user_id);
                    const name = u?.full_name || u?.username || log.recipient || 'Peserta';
                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {name}{' '}
                            <span className="text-slate-500 font-normal">({log.recipient})</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {log.type}
                            </Badge>
                            <Badge
                              className={cn(
                                'text-[10px] font-black uppercase',
                                log.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                              )}
                            >
                              {log.status}
                            </Badge>
                            <span className="text-[11px] text-slate-400">
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
                        </div>
                        {log.message && (
                          <p className="text-slate-600 line-clamp-2 leading-relaxed">
                            {log.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Peserta, Target Juz & Ujian Halaman */}
        <TabsContent value="participants" className="space-y-6 outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-900">
                Penyaringan Peserta Hi Tikrar vs Akun Lain
              </h3>
              <p className="text-xs text-muted-foreground">
                Secara default hanya menampilkan peserta resmi Hi Tikrar agar tidak bercampur dengan pendaftar Hi Mufradat / akun umum.
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <Button
                type="button"
                size="sm"
                variant={participantScope === 'registered' ? 'default' : 'ghost'}
                onClick={() => setParticipantScope('registered')}
                className={cn(
                  'text-xs font-bold h-8 rounded-lg',
                  participantScope === 'registered' && 'bg-[#800000] text-white shadow-sm hover:bg-[#800000]/90'
                )}
              >
                Hanya Peserta Tikrar ({kpis.activeCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={participantScope === 'all' ? 'default' : 'ghost'}
                onClick={() => setParticipantScope('all')}
                className={cn(
                  'text-xs font-bold h-8 rounded-lg',
                  participantScope === 'all' && 'bg-[#800000] text-white shadow-sm hover:bg-[#800000]/90'
                )}
              >
                Semua Akun Sistem ({(users || []).length})
              </Button>
            </div>
          </div>
          {loadingUsers ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Memuat daftar thalibah...
                </p>
              </CardContent>
            </Card>
          ) : filteredParticipants.length === 0 ? (
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Tidak ada peserta yang cocok dengan pencarian.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredParticipants.slice(0, 50).map((p: any) => {
                const fullName = p.full_name || p.username || 'Thalibah';
                const waNumber = normalizePhone(p.whatsapp || p.phone);

                return (
                  <Card key={p.id} className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-black text-slate-900">
                            {fullName}
                          </CardTitle>
                          {p.isParticipant ? (
                            <Badge className="bg-[#D4AF37] text-black hover:bg-[#D4AF37] text-[9px] font-black uppercase">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> Tikrar Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 text-[9px] font-bold">
                              Non-Tikrar (Hi Mufradat / Umum)
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] font-bold">
                            Juz {p.activeJuz} • Hal. {p.tikrar_current_page || '-'}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                          {p.email || '-'} • Setoran Lulus: {p.passedSubmissions} • Antrean:{' '}
                          {p.pendingSubmissions} • Poin: {p.points || 0}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            Target Juz:
                          </span>
                          <select
                            aria-label={`Target Juz ${fullName}`}
                            value={p.activeJuz}
                            disabled={updatingId === `${p.id}-juz`}
                            onChange={(e) =>
                              handleChangeParticipantJuz(p, Number(e.target.value))
                            }
                            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-black text-[#800000]"
                          >
                            {Array.from({ length: 30 }, (_, idx) => (
                              <option key={idx + 1} value={idx + 1}>
                                Juz {idx + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Button
                          size="sm"
                          variant={p.isParticipant ? 'outline' : 'default'}
                          disabled={updatingId === p.id}
                          onClick={() => handleToggleTikrarPaid(p)}
                          className={cn(
                            'text-xs font-bold h-8',
                            !p.isParticipant && 'bg-[#800000] hover:bg-[#800000]/90 text-white'
                          )}
                        >
                          {p.isParticipant ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                              Nonaktifkan Akses
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                              Daftarkan ke Tikrar
                            </>
                          )}
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
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WA
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Riwayat page_exams legacy jika ada */}
          {filteredExams.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Riwayat Ujian Halaman Mushaf ({filteredExams.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  {(['all', 'pending', 'passed'] as const).map((statusKey) => (
                    <Button
                      key={statusKey}
                      size="sm"
                      variant={examFilter === statusKey ? 'default' : 'outline'}
                      onClick={() => setExamFilter(statusKey)}
                      className={cn(
                        'text-[10px] font-black uppercase rounded-full h-7',
                        examFilter === statusKey && 'bg-[#800000] text-white'
                      )}
                    >
                      {statusKey === 'all' ? 'Semua' : statusKey === 'pending' ? 'Menunggu' : 'Lulus'}
                    </Button>
                  ))}
                </div>
              </div>

              {filteredExams.slice(0, 20).map((exam: any) => {
                const participant = userMap.get(exam.user_id);
                const fullName =
                  participant?.full_name || participant?.username || 'Thalibah HI AQLI';
                const currentScore =
                  scoreInputs[exam.id] !== undefined
                    ? scoreInputs[exam.id]
                    : String(exam.score ?? 90);
                return (
                  <Card key={exam.id} className="border-none shadow-sm bg-white">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#800000] text-white text-[10px] font-black">
                            Hal. {exam.page_number}
                          </Badge>
                          <span className="text-sm font-black text-slate-900">{fullName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={currentScore}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({ ...prev, [exam.id]: e.target.value }))
                          }
                          className="w-20 h-8 text-center font-black text-xs"
                        />
                        <Button
                          size="sm"
                          disabled={updatingId === exam.id}
                          onClick={() => handleApproveExam(exam, !exam.passed)}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {exam.passed ? 'Set Menunggu' : 'Luluskan'}
                        </Button>
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
