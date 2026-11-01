'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useUser } from '@/db';
import { authFetch } from '@/db/client';
import { cn } from '@/lib/utils';
import { QURAN_CHAPTERS } from '@/lib/quran-data';
import { SURAH_START_PAGES } from '@/lib/quran-mapping';
import {
  BLOCK_LETTERS,
  computeMaxUnlockedPageInJuz,
  computeTikrarStreakAndWeekly,
  getJuzPageRange,
  isPageSubmissionCleared,
  TIKRAR_GRADE_LABELS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Loader2,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Video,
} from 'lucide-react';

interface BlockCounterState {
  nadhar: number; // 0..20 (Lihat Mushaf)
  ghaib: number; // 0..20 (Tanpa Mushaf / Hafal)
  checked: boolean;
}

type PageCounterMap = Record<1 | 2 | 3 | 4, BlockCounterState>;

const DEFAULT_COUNTERS: PageCounterMap = {
  1: { nadhar: 0, ghaib: 0, checked: false },
  2: { nadhar: 0, ghaib: 0, checked: false },
  3: { nadhar: 0, ghaib: 0, checked: false },
  4: { nadhar: 0, ghaib: 0, checked: false },
};

interface QuranVerseLite {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

export interface TikrarDailyReportProps {
  onOpenScheduleTab?: () => void;
  onOpenMushafTab?: (page: number, juz: number) => void;
  refreshSignal?: number;
  onDataChanged?: () => void;
}

function getSurahNameForPage(page: number): string {
  let surahId = 1;
  Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
    if (start <= page) surahId = Number(id);
  });
  return QURAN_CHAPTERS.find((c) => c.id === surahId)?.name_simple || "Al-Qur'an";
}

function formatBlockRangeLabel(verses: QuranVerseLite[]): string {
  if (!verses || verses.length === 0) return 'Memuat ayat...';
  const first = verses[0].verse_key;
  const last = verses[verses.length - 1].verse_key;
  const [s1, a1] = first.split(':');
  const [s2, a2] = last.split(':');
  const surah1 = QURAN_CHAPTERS.find((c) => c.id === Number(s1))?.name_simple || `QS ${s1}`;
  if (s1 === s2) {
    return a1 === a2 ? `${surah1}: ${a1}` : `${surah1}: ${a1}–${a2}`;
  }
  const surah2 = QURAN_CHAPTERS.find((c) => c.id === Number(s2))?.name_simple || `QS ${s2}`;
  return `${surah1} ${a1} – ${surah2} ${a2}`;
}

export function TikrarDailyReport({
  onOpenScheduleTab,
  onOpenMushafTab,
  refreshSignal = 0,
  onDataChanged,
}: TikrarDailyReportProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: userData, refresh: refreshUser } = useDoc<any>(user?.id ? 'users' : null, user?.id);

  const halaqahOptions = useMemo(
    () => ({
      filters: [{ column: 'program_type', operator: '==', value: 'tikrar_daily' }],
    }),
    []
  );
  const { data: tikrarHalaqahs } = useCollection<any>('halaqahs', halaqahOptions);

  const userLogsOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
      orderBy: { column: 'log_date', ascending: false },
    }),
    [user?.id]
  );
  const { data: userLogs, refresh: refreshLogs } = useCollection<any>(
    user?.id ? 'tikrar_daily_logs' : null,
    userLogsOptions
  );

  const userSchedulesOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
      orderBy: { column: 'scheduled_date', ascending: true },
    }),
    [user?.id]
  );
  const { data: userSchedules, refresh: refreshSchedules } = useCollection<any>(
    user?.id ? 'tikrar_user_schedules' : null,
    userSchedulesOptions
  );

  const submissionsOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
      orderBy: { column: 'created_at', ascending: false },
    }),
    [user?.id]
  );
  const { data: userSubmissions, refresh: refreshSubmissions } = useCollection<any>(
    user?.id ? 'tikrar_submissions' : null,
    submissionsOptions
  );

  const pageExamsOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    }),
    [user?.id]
  );
  const { data: userPageExams, refresh: refreshPageExams } = useCollection<any>(
    user?.id ? 'page_exams' : null,
    pageExamsOptions
  );

  useEffect(() => {
    if (refreshSignal > 0 && user?.id) {
      refreshUser();
      refreshLogs();
      refreshSchedules();
      refreshSubmissions();
      refreshPageExams();
    }
  }, [
    refreshSignal,
    user?.id,
    refreshUser,
    refreshLogs,
    refreshSchedules,
    refreshSubmissions,
    refreshPageExams,
  ]);

  const todayKey = useMemo(() => toDateKeyWIB(), []);

  const activeJuz = useMemo(() => {
    const raw = Number(userData?.paidJuz ?? userData?.paid_juz);
    return raw >= 1 && raw <= 30 ? raw : 30;
  }, [userData]);

  const { startPage, endPage } = useMemo(() => getJuzPageRange(activeJuz), [activeJuz]);

  const passedExamPages = useMemo(() => {
    const set = new Set<number>();
    (userPageExams || []).forEach((e: any) => {
      if (e?.passed && e?.page_number) set.add(Number(e.page_number));
    });
    return set;
  }, [userPageExams]);

  // Fase 5 Gatekeeper: Highest unlocked page in activeJuz
  const maxUnlockedPage = useMemo(() => {
    if (!user) return endPage;
    return computeMaxUnlockedPageInJuz(activeJuz, userSubmissions || [], passedExamPages);
  }, [user, activeJuz, userSubmissions, passedExamPages, endPage]);

  // Determine scheduled blocks for today (or earliest pending schedule in activeJuz)
  const todayScheduledItems = useMemo(() => {
    const inJuz = (userSchedules || []).filter(
      (s: any) => Number(s.juz) === activeJuz && Number(s.page_number) <= maxUnlockedPage
    );
    const exactToday = inJuz.filter((s: any) => toDateKeyWIB(s.scheduled_date) === todayKey);
    if (exactToday.length > 0) return exactToday;
    const nextPending = inJuz.filter((s: any) => s.status !== 'completed');
    if (nextPending.length > 0) {
      const firstDate = toDateKeyWIB(nextPending[0].scheduled_date);
      return nextPending.filter((s: any) => toDateKeyWIB(s.scheduled_date) === firstDate);
    }
    return [];
  }, [userSchedules, activeJuz, maxUnlockedPage, todayKey]);

  const recommendedPage = useMemo(() => {
    if (todayScheduledItems.length > 0) {
      const p = Number(todayScheduledItems[0].page_number) || startPage;
      return Math.min(p, maxUnlockedPage);
    }
    const userCurr = Number(userData?.tikrar_current_page);
    if (userCurr >= startPage && userCurr <= endPage) {
      return Math.min(userCurr, maxUnlockedPage);
    }
    return Math.min(startPage, maxUnlockedPage);
  }, [todayScheduledItems, userData?.tikrar_current_page, startPage, endPage, maxUnlockedPage]);

  const [selectedPage, setSelectedPage] = useState<number>(582);
  const [hasSyncedInitialPage, setHasSyncedInitialPage] = useState(false);

  useEffect(() => {
    if (!hasSyncedInitialPage && (userData || !user)) {
      setSelectedPage(recommendedPage);
      setHasSyncedInitialPage(true);
    }
  }, [recommendedPage, userData, user, hasSyncedInitialPage]);

  useEffect(() => {
    if (selectedPage < startPage || selectedPage > endPage) {
      setSelectedPage(recommendedPage);
    }
  }, [startPage, endPage, recommendedPage, selectedPage]);

  const isPageLocked = Boolean(user) && selectedPage > maxUnlockedPage;
  const isSelectedPageCleared = useMemo(
    () => isPageSubmissionCleared(selectedPage, userSubmissions || [], passedExamPages),
    [selectedPage, userSubmissions, passedExamPages]
  );

  const [verses, setVerses] = useState<QuranVerseLite[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [expandedArabicBlock, setExpandedArabicBlock] = useState<number | null>(null);
  const [counters, setCounters] = useState<PageCounterMap>(DEFAULT_COUNTERS);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteringSub, setIsRegisteringSub] = useState(false);

  // Blocks already logged in DB on `selectedPage` (across any date) and specifically today
  const { completedBlocksAllTime, completedBlocksToday } = useMemo(() => {
    const allSet = new Set<number>();
    const todaySet = new Set<number>();
    (userLogs || []).forEach((log: any) => {
      if (!log?.completed || Number(log.page_number) !== selectedPage) return;
      const arr = Array.isArray(log.blocks_completed) ? log.blocks_completed : [];
      const isToday = toDateKeyWIB(log.log_date) === todayKey;
      arr.forEach((b: any) => {
        const bn = Number(b);
        if (bn >= 1 && bn <= 4) {
          allSet.add(bn);
          if (isToday) todaySet.add(bn);
        }
      });
    });
    return { completedBlocksAllTime: allSet, completedBlocksToday: todaySet };
  }, [userLogs, selectedPage, todayKey]);

  // Load saved interactive 20+20 counters per page from localStorage + merge DB completion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const base: PageCounterMap = {
      1: { nadhar: 0, ghaib: 0, checked: false },
      2: { nadhar: 0, ghaib: 0, checked: false },
      3: { nadhar: 0, ghaib: 0, checked: false },
      4: { nadhar: 0, ghaib: 0, checked: false },
    };
    try {
      const raw = localStorage.getItem(`tikrar_daily_counter_p${selectedPage}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const b of [1, 2, 3, 4] as const) {
          if (parsed?.[b]) {
            base[b] = {
              nadhar: Math.max(0, Math.min(20, Number(parsed[b].nadhar) || 0)),
              ghaib: Math.max(0, Math.min(20, Number(parsed[b].ghaib) || 0)),
              checked: Boolean(parsed[b].checked),
            };
          }
        }
      }
    } catch {}

    for (const b of [1, 2, 3, 4] as const) {
      if (completedBlocksAllTime.has(b)) {
        base[b] = { nadhar: 20, ghaib: 20, checked: true };
      }
    }
    setCounters(base);
  }, [selectedPage, completedBlocksAllTime]);

  const persistCounters = useCallback(
    (next: PageCounterMap) => {
      setCounters(next);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`tikrar_daily_counter_p${selectedPage}`, JSON.stringify(next));
        } catch {}
      }
    },
    [selectedPage]
  );

  // Fetch verses for selectedPage so each block shows real Surah:Ayah range & Arabic preview
  useEffect(() => {
    let cancelled = false;
    async function loadPageVerses() {
      setLoadingVerses(true);
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${selectedPage}?fields=text_uthmani`
        );
        if (!res.ok) throw new Error('Gagal memuat ayat');
        const json = await res.json();
        if (!cancelled) {
          setVerses(Array.isArray(json?.verses) ? json.verses : []);
        }
      } catch {
        if (!cancelled) setVerses([]);
      } finally {
        if (!cancelled) setLoadingVerses(false);
      }
    }
    loadPageVerses();
    return () => {
      cancelled = true;
    };
  }, [selectedPage]);

  const blockVerses = useMemo<Record<1 | 2 | 3 | 4, QuranVerseLite[]>>(() => {
    if (verses.length === 0) return { 1: [], 2: [], 3: [], 4: [] };
    const perBlock = Math.max(1, Math.ceil(verses.length / 4));
    return {
      1: verses.slice(0, perBlock),
      2: verses.slice(perBlock, perBlock * 2),
      3: verses.slice(perBlock * 2, perBlock * 3),
      4: verses.slice(perBlock * 3),
    };
  }, [verses]);

  // Active halaqah metadata
  const activeHalaqah = useMemo(() => {
    if (!tikrarHalaqahs || tikrarHalaqahs.length === 0) return null;
    if (userData?.tikrar_halaqah_id) {
      const found = tikrarHalaqahs.find((h: any) => h.id === userData.tikrar_halaqah_id);
      if (found) return found;
    }
    return null;
  }, [tikrarHalaqahs, userData?.tikrar_halaqah_id]);

  // Consistency metrics (weekly active days & streak)
  const consistency = useMemo(() => {
    const dates = (userLogs || [])
      .filter((l: any) => l?.completed && l?.log_date)
      .map((l: any) => toDateKeyWIB(l.log_date));
    return computeTikrarStreakAndWeekly(dates, todayKey);
  }, [userLogs, todayKey]);

  const targetDaysPerWeek = Number(userData?.tikrar_active_days_per_week) || 5;
  const durationMonths = Number(userData?.tikrar_target_duration_months) || 2;
  const targetLabelPerDay =
    durationMonths === 1
      ? 'Target: 1 Halaman (4 Blok)'
      : durationMonths === 2
      ? 'Target: 1/2 Halaman (2 Blok)'
      : durationMonths === 3
      ? 'Target: 1–2 Blok / Hari'
      : 'Target: 1 Blok / Hari';

  const scheduledBlockSetOnPage = useMemo(() => {
    const s = new Set<number>();
    todayScheduledItems.forEach((item: any) => {
      if (Number(item.page_number) === selectedPage) {
        s.add(Number(item.block_number));
      }
    });
    return s;
  }, [todayScheduledItems, selectedPage]);

  const updateBlockCounter = (
    blockNum: 1 | 2 | 3 | 4,
    field: 'nadhar' | 'ghaib',
    delta: number
  ) => {
    if (isPageLocked) return;
    const curr = counters[blockNum];
    const nextVal = Math.max(0, Math.min(20, curr[field] + delta));
    const nextNadhar = field === 'nadhar' ? nextVal : curr.nadhar;
    const nextGhaib = field === 'ghaib' ? nextVal : curr.ghaib;
    const nextChecked = nextNadhar >= 20 && nextGhaib >= 20;
    persistCounters({
      ...counters,
      [blockNum]: {
        nadhar: nextNadhar,
        ghaib: nextGhaib,
        checked: nextChecked,
      },
    });
  };

  const toggleBlockCompleted = (blockNum: 1 | 2 | 3 | 4, checked: boolean) => {
    if (isPageLocked) return;
    persistCounters({
      ...counters,
      [blockNum]: checked
        ? { nadhar: 20, ghaib: 20, checked: true }
        : { nadhar: 0, ghaib: 0, checked: false },
    });
  };

  const checkedBlocks = useMemo(
    () => ([1, 2, 3, 4] as const).filter((b) => counters[b].checked),
    [counters]
  );

  const newlyCheckedBlocks = useMemo(
    () => checkedBlocks.filter((b) => !completedBlocksToday.has(b)),
    [checkedBlocks, completedBlocksToday]
  );

  // Submission milestone check on selectedPage (supports half-page A&B, second-half C&D, and full-page A-D)
  const pageSubmissions = useMemo(
    () => (userSubmissions || []).filter((s: any) => Number(s.page_number) === selectedPage),
    [userSubmissions, selectedPage]
  );

  const milestoneInfo = useMemo(() => {
    const doneCount = completedBlocksAllTime.size;
    const hasFirstHalf = completedBlocksAllTime.has(1) && completedBlocksAllTime.has(2);
    const hasSecondHalf = completedBlocksAllTime.has(3) && completedBlocksAllTime.has(4);
    const hasFullPage = doneCount >= 4;

    if (!hasFirstHalf && !hasSecondHalf && !hasFullPage && pageSubmissions.length === 0) {
      return null;
    }

    const firstHalfPassed = pageSubmissions.some(
      (s: any) => s.blocks_range === 'blok_1_2' && s.status === 'passed'
    );
    const fullPagePassed = pageSubmissions.some(
      (s: any) => s.blocks_range === 'blok_1_4' && s.status === 'passed'
    );

    let targetRange: 'blok_1_4' | 'blok_1_2' | 'blok_3_4' = 'blok_1_2';
    if (fullPagePassed) {
      targetRange = 'blok_1_4';
    } else if (firstHalfPassed && hasSecondHalf) {
      targetRange = 'blok_3_4';
    } else if (hasFullPage && !firstHalfPassed) {
      targetRange = 'blok_1_4';
    } else if (hasFirstHalf) {
      targetRange = 'blok_1_2';
    } else if (hasSecondHalf) {
      targetRange = 'blok_3_4';
    }

    const label =
      targetRange === 'blok_1_4'
        ? '4 Blok (A–D) = 1 Halaman Penuh Selesai'
        : targetRange === 'blok_1_2'
        ? '2 Blok (A & B) = 1/2 Halaman Pertama Selesai'
        : '2 Blok (C & D) = 1/2 Halaman Kedua Selesai';

    const activeOrPassed = pageSubmissions.find(
      (s: any) =>
        (s.blocks_range === targetRange || s.blocks_range === 'blok_1_4') &&
        (s.status === 'pending' || s.status === 'passed')
    );

    const latestRevision = !activeOrPassed
      ? pageSubmissions.find(
          (s: any) =>
            (s.blocks_range === targetRange || s.blocks_range === 'blok_1_4') &&
            s.status === 'needs_revision'
        )
      : null;

    return {
      targetRange,
      label,
      existing: activeOrPassed || null,
      revision: latestRevision || null,
    };
  }, [completedBlocksAllTime, pageSubmissions]);

  const handleSubmitDailyReport = async () => {
    if (!user) {
      toast({
        title: 'Silakan Masuk Terlebih Dahulu',
        description: 'Masuk ke akun Ukhti agar laporan harian & poin keaktifan tercatat di grup.',
        variant: 'destructive',
      });
      return;
    }

    if (isPageLocked) {
      toast({
        title: `Halaman ${selectedPage} Masih Terkunci`,
        description: `Selesaikan dan luluskan setoran tasmi' Halaman ${maxUnlockedPage} bersama Musyrifah terlebih dahulu.`,
        variant: 'destructive',
      });
      return;
    }

    if (checkedBlocks.length === 0) {
      toast({
        title: 'Belum Ada Blok Dicentang',
        description: 'Selesaikan repetisi 40x (20x lihat mushaf + 20x hafal) pada minimal 1 blok.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const totalRep = checkedBlocks.reduce(
        (acc, b) => acc + counters[b].nadhar + counters[b].ghaib,
        0
      );
      const avgRep = Math.max(40, Math.round(totalRep / checkedBlocks.length));

      const res = await authFetch('/api/tikrar/daily-log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit_daily_log',
          juz: activeJuz,
          page_number: selectedPage,
          blocks_completed: checkedBlocks,
          repetition_count: avgRep,
          duration_minutes: durationMinutes,
          notes,
          log_date: todayKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal menyimpan laporan harian.');
      }

      const awarded = Number(json.data?.pointsAwarded) || 0;
      const breakdown: string[] = json.data?.pointBreakdown || [];
      toast({
        title: 'Alhamdulillah, Laporan Harian Tercatat!',
        description:
          awarded > 0
            ? `Halaman ${selectedPage} (${checkedBlocks
                .map((b) => `Blok ${BLOCK_LETTERS[b]}`)
                .join(', ')}) tersimpan • ${breakdown.join(' • ')}`
            : `Progres Halaman ${selectedPage} (${checkedBlocks
                .map((b) => `Blok ${BLOCK_LETTERS[b]}`)
                .join(', ')}) berhasil diperbarui untuk hari ini.`,
      });

      setNotes('');
      await Promise.all([refreshLogs(), refreshSchedules(), refreshUser()]);
      onDataChanged?.();
    } catch (err: any) {
      toast({
        title: 'Gagal Mengirim Laporan',
        description: err?.message || 'Terjadi kendala saat menyimpan laporan.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmission = async () => {
    if (!user || !milestoneInfo || isPageLocked) return;
    setIsRegisteringSub(true);
    try {
      const res = await authFetch('/api/tikrar/daily-log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'register_submission',
          juz: activeJuz,
          page_number: selectedPage,
          blocks_range: milestoneInfo.targetRange,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal mendaftar antrean setoran.');
      }

      toast({
        title: json.data?.alreadyRegistered
          ? 'Sudah Terdaftar di Antrean Setoran'
          : 'Berhasil Masuk Antrean Kelas Setoran!',
        description:
          "Silakan hadir tepat waktu pada sesi Live Zoom Halaqah bersama Musyrifah untuk tasmi'.",
      });
      await refreshSubmissions();
      onDataChanged?.();
    } catch (err: any) {
      toast({
        title: 'Gagal Mendaftar Setoran',
        description: err?.message || 'Silakan coba beberapa saat lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsRegisteringSub(false);
    }
  };

  const headerBlocksText = useMemo(() => {
    if (scheduledBlockSetOnPage.size > 0) {
      const letters = Array.from(scheduledBlockSetOnPage)
        .sort((a, b) => a - b)
        .map((b) => BLOCK_LETTERS[b])
        .join(' & ');
      return `Blok ${letters}`;
    }
    return `QS. ${getSurahNameForPage(selectedPage)}`;
  }, [scheduledBlockSetOnPage, selectedPage]);

  return (
    <Card className="border border-stone-200 bg-[#fdfbf7] shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Header Program (Wireframe Section 1) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#800000] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-[#800000] tracking-widest uppercase">
                HI TIKRAR • PROGRAM ITQAN 1 JUZ
              </span>
              <Badge
                variant="outline"
                className="border-[#800000]/20 text-[#800000] bg-white text-[10px] font-bold"
              >
                QS. {getSurahNameForPage(selectedPage)}
              </Badge>
              {isSelectedPageCleared && (
                <Badge className="bg-amber-500 text-black hover:bg-amber-500 text-[10px] font-black">
                  ★ Halaman Lulus Setoran
                </Badge>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-headline text-[#800000]">
              Juz {activeJuz} (Halaman {selectedPage} • {headerBlocksText})
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
              <span>
                Halaqah:{' '}
                <strong className="text-stone-900">
                  {activeHalaqah ? activeHalaqah.title : 'Belum memilih sesi Live Zoom'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Musyrifah:{' '}
                <strong className="text-stone-900">
                  {activeHalaqah?.musyrifah || 'Tim Musyrifah HI AQLI'}
                </strong>
              </span>
              {activeHalaqah?.zoom_link && (
                <a
                  href={activeHalaqah.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#800000] font-bold hover:underline"
                >
                  <Video className="w-3.5 h-3.5" /> Live Zoom
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {activeHalaqah?.whatsapp_group_link && (
                <a
                  href={activeHalaqah.whatsapp_group_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Grup WA
                </a>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
            <Badge
              className={cn(
                'px-3 py-1 rounded-full text-xs font-extrabold border-none',
                consistency.weeklyActiveDays >= targetDaysPerWeek
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-100'
              )}
            >
              Target Pekan Ini: {consistency.weeklyActiveDays}/{targetDaysPerWeek} Hari Aktif
            </Badge>
            <div className="flex items-center gap-3 text-xs text-stone-600 font-bold">
              <span className="inline-flex items-center gap-1 text-orange-700">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-600" />
                Streak: {consistency.streak} Hari
              </span>
              {onOpenScheduleTab && (
                <button
                  type="button"
                  onClick={onOpenScheduleTab}
                  className="inline-flex items-center gap-1 text-[#800000] hover:underline font-extrabold"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Atur Target
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigasi Halaman & Shortcut Mushaf */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-stone-200"
              disabled={selectedPage <= startPage}
              onClick={() => setSelectedPage((p) => Math.max(startPage, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 text-[#800000]" />
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-500">Halaman:</span>
              <select
                aria-label="Pilih Halaman Mushaf"
                value={selectedPage}
                onChange={(e) => setSelectedPage(Number(e.target.value))}
                className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-2 text-xs font-black text-[#800000]"
              >
                {Array.from({ length: endPage - startPage + 1 }, (_, idx) => {
                  const pNum = startPage + idx;
                  const pLocked = Boolean(user) && pNum > maxUnlockedPage;
                  const pCleared = isPageSubmissionCleared(
                    pNum,
                    userSubmissions || [],
                    passedExamPages
                  );
                  return (
                    <option key={pNum} value={pNum}>
                      {pLocked ? '🔒 ' : pCleared ? '★ ' : ''}Hal. {pNum}
                      {pNum === recommendedPage
                        ? ' (Target Aktif)'
                        : pLocked
                        ? ` (Terkunci - Wajib Setoran Hal. ${maxUnlockedPage})`
                        : pCleared
                        ? ' (Lulus Setoran)'
                        : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title={
                user && selectedPage >= maxUnlockedPage && selectedPage < endPage
                  ? `Halaman ${selectedPage + 1} terkunci hingga setoran Halaman ${maxUnlockedPage} lulus`
                  : 'Halaman berikutnya'
              }
              className="h-8 w-8 rounded-lg border-stone-200"
              disabled={selectedPage >= endPage}
              onClick={() => setSelectedPage((p) => Math.min(endPage, p + 1))}
            >
              <ChevronRight className="w-4 h-4 text-[#800000]" />
            </Button>
            {selectedPage !== recommendedPage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPage(recommendedPage)}
                className="h-8 text-[11px] font-bold text-[#800000]"
              >
                Ke Target Hari Ini (Hal. {recommendedPage})
              </Button>
            )}
          </div>

          {onOpenMushafTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenMushafTab(selectedPage, activeJuz)}
              className="h-8 text-xs font-bold border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Buka Mushaf &amp; Audio Simak 5x
            </Button>
          )}
        </div>

        {/* Fase 5 Gatekeeper Banner jika peserta mencoba membuka halaman yang terkunci */}
        {isPageLocked && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-black text-amber-950">
                <Lock className="w-4 h-4 text-[#800000] shrink-0" />
                Halaman {selectedPage} Terkunci (Gatekeeper Kelas Setoran)
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Sesuai aturan itqan HI Tikrar, peserta tidak diperkenankan melompati ke halaman baru
                sebelum menyetorkan dan lulus verifikasi Musyrifah pada{' '}
                <strong>Halaman {maxUnlockedPage}</strong> via Live Zoom.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setSelectedPage(maxUnlockedPage)}
              className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4 rounded-lg shrink-0"
            >
              Kembali ke Halaman {maxUnlockedPage}
            </Button>
          </div>
        )}

        {/* Kartu Tugas Tikrar Hari Ini (Wireframe Section 2) */}
        <div
          className={cn(
            'bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-5',
            isPageLocked && 'opacity-65'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#800000]" />
              <h3 className="text-base font-black text-stone-900">
                Tugas Tikrar Hari Ini (Halaman {selectedPage})
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-none text-[11px] font-extrabold">
                {targetLabelPerDay}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold"
              >
                {completedBlocksAllTime.size}/4 Blok Tersimpan
              </Badge>
            </div>
          </div>

          {/* 4 Kartu Blok (Blok 1/A s/d Blok 4/D) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {([1, 2, 3, 4] as const).map((blockNum) => {
              const letter = BLOCK_LETTERS[blockNum];
              const state = counters[blockNum];
              const totalRep = state.nadhar + state.ghaib;
              const isSavedInDb = completedBlocksAllTime.has(blockNum);
              const isScheduledToday = scheduledBlockSetOnPage.has(blockNum);
              const bVerses = blockVerses[blockNum];
              const verseRangeLabel = loadingVerses
                ? 'Memuat ayat...'
                : formatBlockRangeLabel(bVerses);
              const isPreviewOpen = expandedArabicBlock === blockNum;

              return (
                <div
                  key={blockNum}
                  className={cn(
                    'rounded-xl p-4 border transition-all border-l-4 flex flex-col justify-between gap-3',
                    state.checked
                      ? 'bg-emerald-50/50 border-emerald-200 border-l-emerald-600'
                      : isScheduledToday
                      ? 'bg-amber-50/30 border-amber-200 border-l-[#800000]'
                      : 'bg-stone-50/80 border-stone-200 border-l-[#800000]'
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-stone-900">
                            Blok {letter} ({selectedPage}
                            {letter})
                          </span>
                          <span className="text-xs font-bold text-[#800000]">
                            • {verseRangeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Metode: 20x Lihat Mushaf (Bith-Nadhar) + 20x Hafal (Bil-Ghaib)
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isScheduledToday && !isSavedInDb && (
                          <Badge className="bg-[#D4AF37] text-black hover:bg-[#D4AF37] text-[9px] font-black uppercase">
                            Target Hari Ini
                          </Badge>
                        )}
                        {isSavedInDb && (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[9px] font-black uppercase">
                            Tercatat
                          </Badge>
                        )}
                      </div>
                    </div>

                    {bVerses.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedArabicBlock(isPreviewOpen ? null : blockNum)
                          }
                          className="text-[11px] font-bold text-[#800000] hover:underline"
                        >
                          {isPreviewOpen ? 'Sembunyikan Ayat Blok Ini' : 'Lihat Teks Ayat Blok Ini'}
                        </button>
                        {isPreviewOpen && (
                          <div
                            dir="rtl"
                            className="mt-2 p-3 rounded-lg bg-white border border-stone-200 text-right font-arabic text-lg leading-loose text-stone-900 max-h-44 overflow-y-auto"
                          >
                            {bVerses.map((v) => (
                              <span key={v.id} className="inline">
                                {v.text_uthmani}{' '}
                                <span className="inline-block text-[11px] font-sans font-bold text-[#800000] px-1.5 py-0.5 rounded-full bg-red-50 mx-1">
                                  {v.verse_key.split(':')[1]}
                                </span>{' '}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive 20x + 20x Counters */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white rounded-lg p-2 border border-stone-200 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase text-stone-500">
                          Lihat Mushaf
                        </span>
                        <span className="text-xs font-black text-[#800000]">
                          {state.nadhar}/20
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateBlockCounter(blockNum, 'nadhar', -1)}
                          disabled={isPageLocked || state.nadhar <= 0}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateBlockCounter(blockNum, 'nadhar', 1)}
                          disabled={isPageLocked || state.nadhar >= 20}
                          className="h-7 flex-1 bg-[#800000] hover:bg-[#800000]/90 text-white text-[11px] font-black"
                        >
                          +1
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateBlockCounter(blockNum, 'nadhar', 5)}
                          disabled={isPageLocked || state.nadhar >= 20}
                          className="h-7 px-2 text-[10px] font-black border-[#800000]/20 text-[#800000]"
                        >
                          +5
                        </Button>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-2 border border-stone-200 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase text-stone-500">
                          Tanpa Mushaf
                        </span>
                        <span className="text-xs font-black text-emerald-700">
                          {state.ghaib}/20
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateBlockCounter(blockNum, 'ghaib', -1)}
                          disabled={isPageLocked || state.ghaib <= 0}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateBlockCounter(blockNum, 'ghaib', 1)}
                          disabled={isPageLocked || state.ghaib >= 20}
                          className="h-7 flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black"
                        >
                          +1
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateBlockCounter(blockNum, 'ghaib', 5)}
                          disabled={isPageLocked || state.ghaib >= 20}
                          className="h-7 px-2 text-[10px] font-black border-emerald-200 text-emerald-700"
                        >
                          +5
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Selesai 40x Repetisi */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/70">
                    <label
                      htmlFor={`check-block-${selectedPage}-${blockNum}`}
                      className={cn(
                        'flex items-center gap-2.5 select-none',
                        isPageLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      <Checkbox
                        id={`check-block-${selectedPage}-${blockNum}`}
                        disabled={isPageLocked}
                        checked={state.checked}
                        onCheckedChange={(val) =>
                          toggleBlockCompleted(blockNum, Boolean(val))
                        }
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <span
                        className={cn(
                          'text-xs font-extrabold',
                          state.checked ? 'text-emerald-700' : 'text-stone-700'
                        )}
                      >
                        Selesai 40x Repetisi ({totalRep}/40)
                      </span>
                    </label>
                    {state.checked && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Durasi, Catatan & Tombol Submit Laporan Harian */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#800000]" /> Durasi Latihan (Menit)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    disabled={isPageLocked}
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(Math.max(5, parseInt(e.target.value, 10) || 30))
                    }
                    className="h-9 w-24 bg-white font-bold text-sm"
                  />
                  <div className="flex items-center gap-1">
                    {[20, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={isPageLocked}
                        onClick={() => setDurationMinutes(m)}
                        className={cn(
                          'px-2 py-1 rounded-md text-[11px] font-bold border transition-colors',
                          durationMinutes === m
                            ? 'bg-[#800000] text-white border-[#800000]'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                        )}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600">
                  Catatan Evaluasi Mandiri (Opsional)
                </label>
                <Textarea
                  rows={1}
                  disabled={isPageLocked}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Ayat 5–7 perlu penguatan makhraj saat bil-ghaib..."
                  className="min-h-[36px] bg-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="text-xs text-stone-600">
                {user ? (
                  isPageLocked ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-900 font-bold">
                      <Lock className="w-3.5 h-3.5 text-[#800000]" />
                      Selesaikan setoran Halaman {maxUnlockedPage} untuk membuka pengisian halaman ini.
                    </span>
                  ) : (
                    <span>
                      Blok siap dikirim:{' '}
                      <strong className="text-[#800000]">
                        {checkedBlocks.length > 0
                          ? checkedBlocks.map((b) => `Blok ${BLOCK_LETTERS[b]}`).join(', ')
                          : 'Belum ada blok dicentang'}
                      </strong>{' '}
                      {newlyCheckedBlocks.length > 0 && (
                        <span className="text-emerald-700 font-bold">
                          (+20 Poin Harian &amp; nyalakan Heatmap Grup)
                        </span>
                      )}
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    Silakan{' '}
                    <Link href="/login" className="underline font-extrabold text-[#800000]">
                      Masuk
                    </Link>{' '}
                    agar laporan harian &amp; poin tersimpan ke grup.
                  </span>
                )}
              </div>

              <Button
                type="button"
                disabled={isPageLocked || isSubmitting || checkedBlocks.length === 0}
                onClick={handleSubmitDailyReport}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-10 px-5 rounded-xl shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-2" /> Kirim Laporan Hari Ini
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Banner Ambang Batas Setoran Live Zoom & Evaluasi Musyrifah (Fase 3 & Fase 5) */}
          {milestoneInfo && (
            <div
              className={cn(
                'rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                milestoneInfo.revision
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              )}
            >
              <div className="space-y-1.5">
                {milestoneInfo.revision ? (
                  <>
                    <div className="text-sm font-black text-rose-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      Evaluasi Musyrifah: Perlu Perbaikan Tajwid/Kelancaran
                    </div>
                    {milestoneInfo.revision.feedback && (
                      <p className="text-xs text-rose-800 bg-white/80 border border-rose-200 rounded-lg px-3 py-2 italic">
                        &ldquo;{milestoneInfo.revision.feedback}&rdquo; —{' '}
                        <strong>{milestoneInfo.revision.musyrifah_name || 'Musyrifah'}</strong>
                      </p>
                    )}
                    <p className="text-xs text-rose-800">
                      Silakan kuatkan kembali repetisi blok ini, lalu daftar ulang antrean Live Zoom.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-black text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      {milestoneInfo.existing?.status === 'passed'
                        ? `Alhamdulillah Lulus Tasmi' (${milestoneInfo.label})`
                        : `Syarat Setoran Terpenuhi! (${milestoneInfo.label})`}
                    </div>
                    {milestoneInfo.existing?.feedback && (
                      <p className="text-xs text-emerald-900 bg-white/80 border border-emerald-200 rounded-lg px-3 py-1.5 italic">
                        &ldquo;{milestoneInfo.existing.feedback}&rdquo; —{' '}
                        <strong>{milestoneInfo.existing.musyrifah_name || 'Musyrifah'}</strong>
                      </p>
                    )}
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {isSelectedPageCleared && selectedPage < endPage ? (
                        <>
                          Kunci <strong>Halaman {selectedPage + 1}</strong> telah terbuka! Ukhti
                          dapat melanjutkan ke halaman berikutnya.
                        </>
                      ) : (
                        <>
                          Setoran tasmi&apos; wajib dilaksanakan secara{' '}
                          <strong>Live Zoom tatap muka</strong> bersama Musyrifah sebelum berpindah
                          ke Halaman {Math.min(endPage, selectedPage + 1)}.
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {milestoneInfo.existing?.status === 'passed' ? (
                  <>
                    <Badge className="bg-amber-500 text-black hover:bg-amber-500 font-black px-3 py-1.5 text-xs">
                      ★{' '}
                      {TIKRAR_GRADE_LABELS[milestoneInfo.existing.grade] ||
                        milestoneInfo.existing.grade ||
                        'Mumtaz'}
                    </Badge>
                    {isSelectedPageCleared && selectedPage < endPage && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setSelectedPage(selectedPage + 1)}
                        className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-3.5 rounded-lg"
                      >
                        Lanjut Hal. {selectedPage + 1} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </>
                ) : milestoneInfo.existing?.status === 'pending' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-700 text-white hover:bg-emerald-700 font-bold px-3 py-1.5 text-xs">
                      Terdaftar di Antrean Live Zoom
                    </Badge>
                    {(milestoneInfo.existing.zoom_meeting_url || activeHalaqah?.zoom_link) && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border-emerald-600 text-emerald-800 font-bold text-xs h-8"
                      >
                        <a
                          href={milestoneInfo.existing.zoom_meeting_url || activeHalaqah?.zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video className="w-3.5 h-3.5 mr-1" /> Ruang Zoom
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isRegisteringSub || isPageLocked}
                    onClick={handleRegisterSubmission}
                    className={cn(
                      'text-white font-extrabold text-xs h-9 px-4 rounded-lg shadow-sm',
                      milestoneInfo.revision
                        ? 'bg-[#800000] hover:bg-[#800000]/90'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    )}
                  >
                    {isRegisteringSub ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : null}
                    {milestoneInfo.revision
                      ? 'Daftar Ulang Setoran Live Zoom'
                      : 'Daftar Antrean Setoran'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
