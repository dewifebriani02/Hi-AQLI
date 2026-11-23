'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useUser } from '@/db';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { QURAN_CHAPTERS } from '@/lib/quran-data';
import { SURAH_START_PAGES } from '@/lib/quran-mapping';
import {
  BLOCK_LETTERS,
  computeMaxUnlockedPageInJuz,
  computeTikrarStreakAndWeekly,
  getJuzForPage,
  getJuzPageRange,
  isPageSubmissionCleared,
  formatDateID,
  parseDateKeyUTC,
  TIKRAR_GRADE_LABELS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import { getBlockListenCount, isBlockListenDone, TIKRAR_STEPS } from '@/lib/tikrar-steps';
import type { TikrarSummary } from '@/lib/tikrar-server';
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Flame,
  Loader2,
  Lock,
  MessageCircle,
  PlayCircle,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  Video,
} from 'lucide-react';

export interface TikrarDailyReportProps {
  onOpenScheduleTab?: () => void;
  onOpenMushafTab?: (page: number, juz: number) => void;
  refreshSignal?: number;
  onDataChanged?: () => void;
  summary?: TikrarSummary | null;
}

// Langkah (jumlah langkah tuntas) yang menandai Blok A/B/C/D tuntas
const BLOCK_DONE_AT_STEPS: Record<number, number> = TIKRAR_STEPS.reduce((acc, s) => {
  if (s.completesBlock) acc[s.completesBlock] = s.index + 1;
  return acc;
}, {} as Record<number, number>);

function getSurahNameForPage(page: number): string {
  let surahId = 1;
  Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
    if (start <= page) surahId = Number(id);
  });
  return QURAN_CHAPTERS.find((c) => c.id === surahId)?.name_simple || "Al-Qur'an";
}

function formatRangeLabel(range?: string | null): string {
  if (range === 'blok_1_4') return '1 Halaman Penuh (TM 1–4 / Blok A–D)';
  if (range === 'blok_3_4') return '1/2 Halaman Akhir (TM 3 & 4 / Blok C & D)';
  return '1/2 Halaman Pertama (TM 1 & 2 / Blok A & B)';
}

export function TikrarDailyReport({
  onOpenScheduleTab,
  onOpenMushafTab,
  refreshSignal = 0,
  onDataChanged,
  summary = null,
}: TikrarDailyReportProps) {
  const target = summary?.target || null;
  const { user } = useUser();
  const { toast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'page' | 'juz'>('page');
  const [selectedResetPage, setSelectedResetPage] = useState<number>(582);
  const [selectedResetJuz, setSelectedResetJuz] = useState<number>(30);
  const [isResetting, setIsResetting] = useState(false);
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

  // Progres real-time dari tabel tikrar_user_progress (menampung repetisi sub-blok A-1, A-2, dst.)
  const [allUserProgress, setAllUserProgress] = useState<any[]>([]);
  const [tasmiQueue, setTasmiQueue] = useState<any[]>([]);

  const fetchTasmiQueue = useCallback(async () => {
    if (!user?.id) {
      setTasmiQueue([]);
      return;
    }
    try {
      const res = await authFetch('/api/tikrar/submissions');
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data?.queue)) {
        setTasmiQueue(json.data.queue);
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchTasmiQueue();
  }, [fetchTasmiQueue, refreshSignal]);

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authFetch('/api/tikrar/progress');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setAllUserProgress(json.data);
        }
      }
    } catch (e) {
      console.warn('Gagal mengambil data progres pengguna:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, refreshSignal]);

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
    if (target) return target.juz;
    const raw = Number(userData?.paidJuz ?? userData?.paid_juz);
    return raw >= 1 && raw <= 30 ? raw : 30;
  }, [target, userData]);

  // Rentang = halaman mulai sampai halaman akhir target terbaru
  const { startPage, endPage, totalPages } = useMemo(() => {
    if (target) {
      return {
        startPage: target.startPage,
        endPage: target.endPage,
        totalPages: target.endPage - target.startPage + 1,
      };
    }
    return getJuzPageRange(activeJuz);
  }, [target, activeJuz]);

  const passedExamPages = useMemo(() => {
    const set = new Set<number>();
    (userPageExams || []).forEach((e: any) => {
      if (e?.passed && e?.page_number) set.add(Number(e.page_number));
    });
    return set;
  }, [userPageExams]);

  const userCurrPage = Number(userData?.tikrar_current_page);

  const todayScheduledItems = useMemo(() => {
    const inJuz = (userSchedules || []).filter(
      (s: any) => Number(s.juz) === activeJuz
    );
    const exactToday = inJuz.filter((s: any) => toDateKeyWIB(s.scheduled_date) === todayKey);
    if (exactToday.length > 0) return exactToday;
    const nextPending = inJuz.filter((s: any) => s.status !== 'completed');
    if (nextPending.length > 0) {
      const firstDate = toDateKeyWIB(nextPending[0].scheduled_date);
      return nextPending.filter((s: any) => toDateKeyWIB(s.scheduled_date) === firstDate);
    }
    return [];
  }, [userSchedules, activeJuz, todayKey]);

  // Prioritaskan halaman target pengguna jika berada dalam rentang Juz aktif
  const recommendedPage = useMemo(() => {
    if (target) return target.unlockedPage;
    if (userCurrPage >= startPage && userCurrPage <= endPage) {
      return userCurrPage;
    }
    if (todayScheduledItems.length > 0) {
      const p = Number(todayScheduledItems[0].page_number);
      if (p >= startPage && p <= endPage) return p;
    }
    return startPage;
  }, [target, todayScheduledItems, userCurrPage, startPage, endPage]);

  const progressByPageMap = useMemo(() => {
    const map = new Map<number, { totalProgress: number; hasActivity: boolean }>();
    (allUserProgress || []).forEach((p: any) => {
      const pageNum = Number(p?.page_number);
      if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > 604) return;
      const bObj = typeof p?.blocks === 'object' && p?.blocks !== null ? p.blocks : {};
      const mObj = typeof p?.meta_counts === 'object' && p?.meta_counts !== null ? p.meta_counts : {};
      const hasBlockCount = [1, 2, 3, 4].some(
        (b) =>
          Number(bObj[b]?.listen?.count) > 0 ||
          Number(bObj[b]?.a?.count) > 0 ||
          Number(bObj[b]?.b?.count) > 0 ||
          Number(bObj[b]?.combined?.count) > 0
      );
      const hasMetaCount = Object.values(mObj).some((v) => Number(v) > 0);
      const totalProg = Number(p?.total_progress) || 0;
      const hasActivity =
        totalProg > 0 ||
        Number(p?.prep_listen_count) > 0 ||
        Boolean(p?.prep_translation_done) ||
        hasBlockCount ||
        hasMetaCount;
      map.set(pageNum, { totalProgress: totalProg, hasActivity });
    });
    (userLogs || []).forEach((l: any) => {
      const pageNum = Number(l?.page_number);
      if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > 604 || !l?.completed) return;
      const existing = map.get(pageNum);
      if (!existing || !existing.hasActivity) {
        map.set(pageNum, { totalProgress: existing?.totalProgress || 0, hasActivity: true });
      }
    });
    return map;
  }, [allUserProgress, userLogs]);

  const resetPageOptions = useMemo(() => {
    const activeJuzRange = getJuzPageRange(activeJuz);
    const pageSet = new Set<number>([recommendedPage]);
    for (let p = activeJuzRange.startPage; p <= activeJuzRange.endPage; p++) {
      pageSet.add(p);
    }
    for (let p = startPage; p <= endPage; p++) {
      pageSet.add(p);
    }
    progressByPageMap.forEach((info, p) => {
      if (info.hasActivity) pageSet.add(p);
    });
    return Array.from(pageSet)
      .sort((a, b) => a - b)
      .map((p) => {
        const info = progressByPageMap.get(p);
        return {
          page: p,
          surah: getSurahNameForPage(p),
          isActive: p === recommendedPage,
          totalProgress: info?.totalProgress || 0,
          hasActivity: Boolean(info?.hasActivity),
        };
      });
  }, [activeJuz, startPage, endPage, recommendedPage, progressByPageMap]);

  const resetJuzOptions = useMemo(() => {
    return Array.from({ length: 30 }, (_, idx) => {
      const juzNum = idx + 1;
      const range = getJuzPageRange(juzNum);
      let pagesWithProgress = 0;
      for (let p = range.startPage; p <= range.endPage; p++) {
        if (progressByPageMap.get(p)?.hasActivity) pagesWithProgress += 1;
      }
      return {
        juz: juzNum,
        startPage: range.startPage,
        endPage: range.endPage,
        isActive: juzNum === activeJuz,
        pagesWithProgress,
      };
    });
  }, [activeJuz, progressByPageMap]);

  const selectedJuzRange = useMemo(
    () => getJuzPageRange(selectedResetJuz),
    [selectedResetJuz]
  );

  const openResetDialog = (mode: 'page' | 'juz') => {
    setResetMode(mode);
    setSelectedResetPage(recommendedPage);
    setSelectedResetJuz(activeJuz);
    setResetDialogOpen(true);
  };

  const handleResetScope = async () => {
    if (!user?.id || isResetting) return;
    setIsResetting(true);
    try {
      if (resetMode === 'page') {
        const targetPage = Math.max(1, Math.min(604, Math.floor(Number(selectedResetPage) || recommendedPage)));
        const targetJuz = getJuzForPage(targetPage);
        const res = await authFetch('/api/tikrar/progress/reset', {
          method: 'POST',
          body: JSON.stringify({
            scope: 'page',
            page_number: targetPage,
            juz: targetJuz,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error?.message || `Gagal mereset counter Halaman ${targetPage}.`);
        }
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`tikrar_progress_p${targetPage}`);
        }
        await Promise.all([fetchProgress(), refreshLogs(), refreshSchedules(), refreshUser()]);
        onDataChanged?.();
        toast({
          title: `Counter Halaman ${targetPage} Direset`,
          description: `Semua counter pengulangan dan catatan pada Halaman ${targetPage} telah dikembalikan ke 0.`,
        });
      } else {
        const targetJuz = Math.max(1, Math.min(30, Math.floor(Number(selectedResetJuz) || activeJuz)));
        const juzRange = getJuzPageRange(targetJuz);
        const res = await authFetch('/api/tikrar/progress/reset', {
          method: 'POST',
          body: JSON.stringify({
            scope: 'juz',
            juz: targetJuz,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error?.message || `Gagal mereset counter Juz ${targetJuz}.`);
        }
        if (typeof window !== 'undefined') {
          for (let p = juzRange.startPage; p <= juzRange.endPage; p++) {
            localStorage.removeItem(`tikrar_progress_p${p}`);
          }
        }
        await Promise.all([fetchProgress(), refreshLogs(), refreshSchedules(), refreshUser()]);
        onDataChanged?.();
        toast({
          title: `Counter Juz ${targetJuz} Direset`,
          description: `Seluruh counter pengulangan pada Juz ${targetJuz} (Hal. ${juzRange.startPage}–${juzRange.endPage}) telah dikembalikan ke 0.`,
        });
      }
      setResetDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: resetMode === 'page' ? 'Gagal Reset Halaman' : 'Gagal Reset Juz',
        description: err?.message || 'Silakan coba lagi.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const activeHalaqah = useMemo(() => {
    if (!tikrarHalaqahs || tikrarHalaqahs.length === 0) return null;
    if (userData?.tikrar_halaqah_id) {
      const found = tikrarHalaqahs.find((h: any) => h.id === userData.tikrar_halaqah_id);
      if (found) return found;
    }
    return null;
  }, [tikrarHalaqahs, userData?.tikrar_halaqah_id]);

  const consistency = useMemo(() => {
    const dates = (userLogs || [])
      .filter((l: any) => l?.completed && l?.log_date)
      .map((l: any) => toDateKeyWIB(l.log_date));
    return computeTikrarStreakAndWeekly(dates, todayKey);
  }, [userLogs, todayKey]);

  const targetDaysPerWeek = Number(userData?.tikrar_active_days_per_week) || 5;

  // Aggregate progress across the active Juz
  const juzRecap = useMemo(() => {
    const completedBlockKeys = new Set<string>();
    const activePageBlocks = new Set<number>();

    (userLogs || []).forEach((log: any) => {
      if (!log?.completed) return;
      const pNum = Number(log.page_number);
      if (pNum < startPage || pNum > endPage) return;
      const arr = Array.isArray(log.blocks_completed) ? log.blocks_completed : [];
      arr.forEach((b: any) => {
        const bn = Number(b);
        if (bn >= 1 && bn <= 4) {
          completedBlockKeys.add(`${pNum}:${bn}`);
          if (pNum === recommendedPage) activePageBlocks.add(bn);
        }
      });
    });

    // Blok tuntas menurut langkah klik counter (tidak bergantung log harian)
    for (let p = startPage; p <= endPage; p++) {
      const steps = summary?.stepsByPage?.[p] || 0;
      for (const b of [1, 2, 3, 4]) {
        if (steps >= BLOCK_DONE_AT_STEPS[b]) {
          completedBlockKeys.add(`${p}:${b}`);
          if (p === recommendedPage) activePageBlocks.add(b);
        }
      }
    }

    const tasmiSet = new Set<number>(summary?.tasmiPassedPages || []);
    let clearedPagesCount = 0;
    for (let p = startPage; p <= endPage; p++) {
      if (tasmiSet.has(p) || isPageSubmissionCleared(p, userSubmissions || [], passedExamPages)) {
        clearedPagesCount += 1;
      }
    }

    return {
      totalBlocksInJuz: totalPages * 4,
      completedBlocksInJuz: completedBlockKeys.size,
      clearedPagesCount,
      activePageBlocks,
    };
  }, [userLogs, startPage, endPage, totalPages, recommendedPage, userSubmissions, passedExamPages, summary]);

  // Analisis aktivitas sub-blok terkini dari tikrar_user_progress
  const activeStageInfo = useMemo(() => {
    if (!allUserProgress || allUserProgress.length === 0) return null;

    const hasActivity = (p: any) => {
      if (!p) return false;
      if (Number(p.prep_listen_count) > 0 || Boolean(p.prep_translation_done)) return true;
      if (Number(p.total_progress) > 0) return true;
      const bObj = typeof p.blocks === 'object' && p.blocks !== null ? p.blocks : {};
      for (const b of [1, 2, 3, 4] as const) {
        if (
          Number(bObj[b]?.listen?.count) > 0 ||
          Number(bObj[b]?.a?.count) > 0 ||
          Number(bObj[b]?.b?.count) > 0 ||
          Number(bObj[b]?.combined?.count) > 0
        ) {
          return true;
        }
      }
      return false;
    };

    const recProg = allUserProgress.find((p: any) => Number(p.page_number) === recommendedPage);
    const inTargetActive = allUserProgress.find(
      (p: any) => Number(p.page_number) >= startPage && Number(p.page_number) <= endPage && hasActivity(p)
    );
    const matched =
      (hasActivity(recProg) ? recProg : null) ||
      inTargetActive ||
      allUserProgress.find(hasActivity) ||
      recProg ||
      allUserProgress[0];

    if (!matched) return null;

    const pageNumber = Number(matched.page_number) || recommendedPage;
    const juzNum = Number(matched.juz) || getJuzForPage(pageNumber);
    const totalProg = Number(matched.total_progress) || 0;
    const blocksObj =
      typeof matched.blocks === 'object' && matched.blocks !== null ? matched.blocks : {};
    const metaObj =
      typeof matched.meta_counts === 'object' && matched.meta_counts !== null
        ? matched.meta_counts
        : {};

    let tuntasCount = 0;
    let activeSub: {
      stageName: string;
      subBlockLetter: string;
      currentCount: number;
      targetCount: number;
      badgeText: string;
      isStarted: boolean;
    } | null = null;

    for (const b of [1, 2, 3, 4] as const) {
      const letter = BLOCK_LETTERS[b];
      const bData = blocksObj[b] || {};
      const aCount = Number(bData.a?.count) || 0;
      const bCount = Number(bData.b?.count) || 0;
      const combCount = Number(bData.combined?.count) || 0;

      if (combCount >= 40) {
        tuntasCount += 1;
        continue;
      }

      if (combCount > 0) {
        activeSub = {
          stageName: `Penggabungan TM ${b} (Blok ${letter})`,
          subBlockLetter: `Gabung TM ${b}`,
          currentCount: combCount,
          targetCount: 40,
          badgeText: `TM ${b}`,
          isStarted: true,
        };
        break;
      } else if (bCount > 0) {
        activeSub = {
          stageName: `TM ${b}-2 (Blok ${letter}-2 Hitam)`,
          subBlockLetter: `TM ${b}-2`,
          currentCount: bCount,
          targetCount: 40,
          badgeText: `TM ${b}-2`,
          isStarted: true,
        };
        break;
      } else if (aCount === 0 && !isBlockListenDone(matched, b)) {
        // Simak audio blok 5x sebelum counter blok terbuka
        const listen = getBlockListenCount(matched, b);
        activeSub = {
          stageName: `Simak Audio TM ${b} (Blok ${letter}) 5x`,
          subBlockLetter: `Simak TM ${b}`,
          currentCount: listen,
          targetCount: 5,
          badgeText: `Simak TM ${b}`,
          isStarted: listen > 0,
        };
        break;
      } else if (aCount > 0) {
        activeSub = {
          stageName: `TM ${b}-1 (Blok ${letter}-1 Maroon)`,
          subBlockLetter: `TM ${b}-1`,
          currentCount: aCount,
          targetCount: 40,
          badgeText: `TM ${b}-1`,
          isStarted: true,
        };
        break;
      } else if (!activeSub) {
        activeSub = {
          stageName: `TM ${b}-1 (Blok ${letter}-1 Maroon)`,
          subBlockLetter: `TM ${b}-1`,
          currentCount: 0,
          targetCount: 40,
          badgeText: `TM ${b}-1`,
          isStarted: false,
        };
        break;
      }
    }

    if (tuntasCount === 4) {
      const meta1234 = Number(metaObj['1_2_3_4']) || 0;
      if (meta1234 < 5) {
        activeSub = {
          stageName: 'Penggabungan 1 Halaman Penuh (TM 1–4 / Blok A–D)',
          subBlockLetter: 'TM 1–4 (5x)',
          currentCount: meta1234,
          targetCount: 5,
          badgeText: 'Gabung TM 1–4',
          isStarted: true,
        };
      } else if (!(summary?.quizPassedPages || []).includes(pageNumber)) {
        activeSub = {
          stageName: 'Ujian Halaman 60 Soal (syarat buka halaman berikutnya)',
          subBlockLetter: 'Ujian Halaman',
          currentCount: 0,
          targetCount: 1,
          badgeText: 'Ujian',
          isStarted: true,
        };
      } else {
        activeSub = {
          stageName: '1 Halaman Penuh Tuntas Mutqin!',
          subBlockLetter: 'Tuntas Mutqin',
          currentCount: 10,
          targetCount: 10,
          badgeText: 'Tuntas',
          isStarted: true,
        };
      }
    }

    const stage = activeSub || {
      stageName: 'TM 1-1 (Blok A-1 Maroon)',
      subBlockLetter: 'TM 1-1',
      currentCount: 0,
      targetCount: 40,
      badgeText: 'TM 1-1',
      isStarted: false,
    };

    const percent =
      stage.targetCount > 0
        ? Math.min(100, Math.round((stage.currentCount / stage.targetCount) * 100))
        : 0;

    return {
      pageNumber,
      juz: juzNum,
      stageName: stage.stageName,
      subBlockLetter: stage.subBlockLetter,
      badgeText: stage.badgeText,
      currentCount: stage.currentCount,
      targetCount: stage.targetCount,
      percent,
      totalProgress: totalProg,
      tuntasCount,
      blocksObj,
    };
  }, [allUserProgress, recommendedPage, summary?.quizPassedPages]);

  // Laporan Blok Tuntas: hanya blok pada rentang target terbaru
  const recentLogs = useMemo(
    () =>
      (userLogs || [])
        .filter((l: any) => {
          const p = Number(l.page_number);
          return l?.completed && p >= startPage && p <= endPage;
        })
        .slice(0, 6),
    [userLogs, startPage, endPage]
  );

  const weeklyMet = useMemo(() => {
    const dow = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
    const monday = new Date(`${todayKey}T12:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    const mondayKey = monday.toISOString().slice(0, 10);
    return (summary?.activity || []).filter((a) => a.targetMet && a.date >= mondayKey && a.date <= todayKey).length;
  }, [summary?.activity, todayKey]);
  const recentActivity = useMemo(() => (summary?.activity || []).slice(0, 5), [summary?.activity]);
  const recentSubmissions = useMemo(() => (userSubmissions || []).slice(0, 5), [userSubmissions]);

  return (
    <Card className="border border-stone-200 bg-[#fdfbf7] shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Header Rekap Pribadi & Shortcut ke Mushaf */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-primary pb-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-primary tracking-widest uppercase">
                REKAP PROGRES PRIBADI • JUZ {activeJuz} • HAL. {startPage}–{endPage}
              </span>
              <Badge
                variant="outline"
                className="border-primary/20 text-primary bg-white text-[10px] font-bold"
              >
                Halaman Aktif: Hal. {recommendedPage} (QS. {getSurahNameForPage(recommendedPage)})
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-headline text-primary">
              Ringkasan Laporan &amp; Riwayat Setoran Tasmi&apos;
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
                  className="inline-flex items-center gap-1 text-primary font-bold hover:underline"
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isResetting}
                    className="h-9 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  >
                    {isResetting ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Reset Counter
                    <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-stone-500 px-2 py-1">
                    Pilih Cakupan Reset
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => openResetDialog('page')}
                    className="rounded-lg text-xs font-bold text-stone-800 cursor-pointer gap-2 py-2 items-start"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span>Reset Per Halaman</span>
                      <span className="text-[10px] font-medium text-stone-500">
                        Default Hal. {recommendedPage} (atau pilih halaman)
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openResetDialog('juz')}
                    className="rounded-lg text-xs font-bold text-rose-700 focus:text-rose-800 focus:bg-rose-50 cursor-pointer gap-2 py-2 items-start"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span>Reset Per Juz</span>
                      <span className="text-[10px] font-medium text-rose-600/80">
                        Default Juz {activeJuz} (atau pilih juz)
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onOpenScheduleTab && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenScheduleTab}
                className="h-9 text-xs font-bold border-stone-300 text-stone-700"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Atur Target
              </Button>
            )}
            {onOpenMushafTab && (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenMushafTab(recommendedPage, activeJuz)}
                className="h-9 bg-primary hover:bg-primary/90 text-white text-xs font-black px-4 rounded-xl shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                Buka Mushaf (Hal. {recommendedPage})
              </Button>
            )}
          </div>
        </div>

        {/* 4 Kartu KPI Ringkas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Keaktifan Hari Ini
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-xl font-black text-stone-900">
                {summary?.today.stepsToday || 0}/{summary?.today.dailyQuota || 1} Langkah
              </span>
              <Badge
                className={cn(
                  'text-[9px] font-black border-none',
                  summary?.today.targetMet
                    ? 'bg-emerald-100 text-emerald-800'
                    : summary?.today.clicks
                    ? 'bg-lime-100 text-lime-900'
                    : 'bg-stone-100 text-stone-600'
                )}
              >
                {summary?.today.targetMet ? 'Target Tercapai' : summary?.today.clicks ? 'Aktif' : 'Belum Aktif'}
              </Badge>
            </div>
            <span className="text-[11px] font-bold text-stone-500">
              Pekan ini: {weeklyMet}/{target?.activeDaysPerWeek || targetDaysPerWeek} hari target tercapai
            </span>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Streak &amp; Total Poin
            </span>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-lg font-black text-orange-700">
                <Flame className="w-4 h-4 fill-orange-500 text-orange-600" />
                {summary?.streak ?? 0} Hari
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-primary">
                <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
                {summary?.points ?? (Number(userData?.points) || 0)} Poin
              </span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Blok Tercatat (Hal. {startPage}–{endPage})
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-xl font-black text-primary">
                {juzRecap.completedBlocksInJuz}/{juzRecap.totalBlocksInJuz}
              </span>
              <span className="text-[11px] font-bold text-stone-500">Blok Selesai</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Lulus Setoran Tasmi&apos;
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-xl font-black text-emerald-700">
                {juzRecap.clearedPagesCount}/{totalPages}
              </span>
              <span className="text-[11px] font-bold text-stone-500">Halaman Lulus</span>
            </div>
          </div>
        </div>

        {/* Status Blok Halaman Aktif (Read-Only Summary dengan Progres Repetisi Real-Time) */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Status Halaman Aktif (Hal. {recommendedPage})
            </span>
            <p className="text-xs text-stone-600">
              Pengisian repetisi sub-blok (40x), penggabungan antar blok (10x), dan pengiriman
              laporan dilakukan langsung di tab <strong>Mushaf &amp; Audio</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {([1, 2, 3, 4] as const).map((b) => {
              const letter = BLOCK_LETTERS[b];
              const isTuntas = juzRecap.activePageBlocks.has(b);
              const bData = activeStageInfo?.pageNumber === recommendedPage ? activeStageInfo?.blocksObj?.[b] : null;
              const repCount = Math.max(
                Number(bData?.combined?.count) || 0,
                Number(bData?.b?.count) || 0,
                Number(bData?.a?.count) || 0
              );
              const inProgress = !isTuntas && repCount > 0;

              return (
                <Badge
                  key={b}
                  variant="outline"
                  className={cn(
                    'px-2.5 py-1 text-xs font-black transition-all',
                    isTuntas
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : inProgress
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300/50'
                      : 'bg-stone-50 border-stone-200 text-stone-500'
                  )}
                >
                  {isTuntas ? (
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  ) : inProgress ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-1.5 animate-pulse" />
                  ) : (
                    <Lock className="w-3 h-3 mr-1 opacity-50" />
                  )}
                  TM {b} ({letter})
                  {inProgress && (
                    <span className="ml-1 text-[10px] font-extrabold text-amber-700">
                      ({repCount}/40)
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Dua Kolom Riwayat: Laporan Harian Terakhir & Status Setoran Live Zoom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kolom 1: Riwayat Laporan Harian & Aktivitas Berjalan */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" /> Riwayat Laporan Harian Terakhir
              </h3>
              <span className="text-[11px] font-bold text-stone-500">
                {(userLogs || []).length} Laporan Tuntas
              </span>
            </div>

            {/* KARTU AKTIVITAS BERJALAN (SUB-BLOK TERKINI) */}
            {activeStageInfo && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/90 via-[#fffdfa] to-stone-50 border-2 border-[#D4AF37]/60 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                      Aktivitas Sedang Berjalan (Real-Time)
                    </span>
                  </div>
                  <Badge className="bg-primary text-white hover:bg-primary text-[10px] font-black px-2 py-0.5">
                    Hal. {activeStageInfo.pageNumber}
                  </Badge>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{activeStageInfo.stageName}</span>
                    </div>
                    <div className="text-[11px] text-stone-600 font-medium">
                      Hitungan: <strong className="text-stone-900">{activeStageInfo.currentCount}</strong> dari{' '}
                      {activeStageInfo.targetCount} repetisi ({activeStageInfo.percent}%)
                    </div>
                  </div>
                  {onOpenMushafTab && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenMushafTab(activeStageInfo.pageNumber, activeStageInfo.juz)}
                      className="h-8 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold px-3 rounded-xl shadow-sm shrink-0"
                    >
                      Lanjutkan
                    </Button>
                  )}
                </div>

                {/* Progress Bar Repetisi Sub-Blok */}
                <div className="space-y-1">
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(4, activeStageInfo.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-stone-500 font-medium">
                    <span>Tersimpan di Cloud Database</span>
                    <span>Total Progres Halaman: {activeStageInfo.totalProgress}%</span>
                  </div>
                </div>
              </div>
            )}

            {recentActivity.length > 0 && (
              <div className="space-y-1.5">
                {recentActivity.map((a) => (
                  <div
                    key={a.date}
                    className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-stone-50 border border-stone-200/80"
                  >
                    <span className="font-bold text-stone-800">
                      {formatDateID(a.date, { withDay: true, withYear: false })}
                    </span>
                    <span className="text-[11px] text-stone-600">
                      {a.clicks} klik • {a.stepsToday} langkah
                    </span>
                    <Badge
                      className={cn(
                        'text-[10px] font-black border-none',
                        a.targetMet ? 'bg-emerald-700 text-white hover:bg-emerald-700' : 'bg-lime-100 text-lime-900 hover:bg-lime-100'
                      )}
                    >
                      {a.targetMet ? 'Target Tercapai' : 'Aktif'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-header untuk Log Blok Tuntas */}
            <div className="pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Laporan Blok Tuntas • Juz {activeJuz} (Hal. {startPage}–{endPage})
              </span>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-5 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                Belum ada blok yang tuntas 40x. Terus lakukan repetisi di tab{' '}
                <strong>Mushaf &amp; Audio</strong>.
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log: any) => {
                  const dk = toDateKeyWIB(log.log_date);
                  const prettyDate = formatDateID(dk, { withDay: true, shortYear: false });
                  const blocksArr: number[] = Array.isArray(log.blocks_completed)
                    ? log.blocks_completed
                    : [];
                  const letters = blocksArr
                    .map((n) => BLOCK_LETTERS[Number(n)])
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <div
                      key={log.id || `${dk}-${log.page_number}`}
                      className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-black text-stone-900">
                          Hal. {log.page_number} • Blok {letters || 'A'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {prettyDate} • {log.duration_minutes || 30} menit
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] font-black">
                        ✓ Tuntas
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kolom 2: Riwayat Antrean & Hasil Verifikasi Setoran Live Zoom */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" /> Status Setoran Tasmi&apos; (Diisi Muallimah)
              </h3>
              <span className="text-[11px] font-bold text-stone-500">
                {(userSubmissions || []).length} Setoran
              </span>
            </div>

            <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" /> Antrean Tasmi&apos; Berjalan
                </span>
                <Badge className="bg-amber-200 text-amber-950 hover:bg-amber-200 border-none text-[10px] font-black">
                  {tasmiQueue.length} Menunggu
                </Badge>
              </div>
              {tasmiQueue.length === 0 ? (
                <p className="text-[11px] text-amber-900/80">
                  Belum ada thalibah yang sedang mengantri setoran tasmi&apos;.
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {tasmiQueue.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-[11px]',
                        q.isMe ? 'bg-white border-primary/40 font-bold' : 'bg-white/70 border-amber-200/80'
                      )}
                    >
                      <span className="truncate text-stone-900">
                        <strong className="text-primary">#{q.queueNumber}</strong> {q.name}
                        {q.isMe ? ' (Anda)' : ''} • Juz {q.juz} Hal. {q.pageNumber}
                      </span>
                      <span className="text-[10px] text-stone-500 shrink-0">
                        {new Date(q.submittedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                Belum ada riwayat setoran. Hasil setoran Tasmi&apos; diisi langsung oleh muallimah/admin
                setelah Ukhti menyetorkan hafalan.
              </div>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((sub: any) => {
                  const isPassed = sub.status === 'passed';
                  const isRevision = sub.status === 'needs_revision';
                  return (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-stone-900">
                          Hal. {sub.page_number} • {formatRangeLabel(sub.blocks_range)}
                        </span>
                        {isPassed ? (
                          <Badge className="bg-amber-400 text-black hover:bg-amber-400 text-[10px] font-black">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {TIKRAR_GRADE_LABELS[sub.grade] || sub.grade || 'Mumtaz'}
                          </Badge>
                        ) : isRevision ? (
                          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px] font-black">
                            Perlu Perbaikan
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px] font-black">
                            <Clock className="w-3 h-3 mr-1" /> Antrean Zoom
                          </Badge>
                        )}
                      </div>
                      {sub.feedback && (
                        <p className="text-[11px] text-stone-600 italic bg-white px-2.5 py-1.5 rounded border border-stone-200">
                          &ldquo;{sub.feedback}&rdquo; —{' '}
                          <strong>{sub.musyrifah_name || 'Musyrifah'}</strong>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ujian Halaman 60 Soal (30 Hafalan + 30 Terjemah Per Kata): Daftar Halaman Belum Ujian & Riwayat Skor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-primary" /> Belum Ujian Halaman (60 Soal)
              </h3>
              <Badge
                className={cn(
                  'text-[10px] font-black border-none',
                  (summary?.pendingQuizPages?.length || 0) > 0
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-emerald-100 text-emerald-800'
                )}
              >
                {summary?.pendingQuizPages?.length || 0} Halaman
              </Badge>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Halaman yang sudah dihafal (termasuk hafalan di luar aplikasi / sebelum jadwal) tetapi belum
              memiliki skor lulus ujian pilihan ganda di aplikasi.
            </p>
            {(summary?.pendingQuizPages || []).length === 0 ? (
              <div className="py-5 text-center text-xs text-emerald-700 font-bold bg-emerald-50/70 rounded-lg border border-emerald-200">
                Semua halaman yang sudah dihafal sudah lulus ujian pilihan ganda!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {(summary?.pendingQuizPages || []).map((item) => (
                  <div
                    key={item.page}
                    className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-black text-stone-900">
                        Hal. {item.page} • {getSurahNameForPage(item.page)} (Juz {item.juz})
                      </p>
                      <p className="text-[11px] text-stone-600">
                        {item.source === 'prior' ? 'Hafalan luar / sebelum jadwal' : 'Hafalan di aplikasi'}
                        {item.lastScore !== null && item.lastScore !== undefined
                          ? ` • Skor terakhir: ${item.lastScore}% (${item.lastCorrect}/${item.lastTotal})`
                          : ' • Belum ada skor ujian'}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="h-8 bg-primary hover:bg-primary/90 text-white text-[11px] font-black rounded-lg shrink-0"
                    >
                      <Link href={`/tikrar/ujian?page=${item.page}`}>
                        {item.lastScore !== null && item.lastScore !== undefined ? 'Ulangi Ujian' : 'Ujian 60 Soal'}
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#D4AF37]" /> Riwayat Skor Ujian Pilihan Ganda
              </h3>
              <span className="text-[11px] font-bold text-stone-500">
                {summary?.quizPassedPages?.length || 0} Hal. Lulus
              </span>
            </div>
            {(summary?.recentQuizzes || []).length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                Belum ada skor ujian halaman 60 soal yang tersimpan di database.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {(summary?.recentQuizzes || []).slice(0, 20).map((q, idx) => (
                  <div
                    key={`${q.page}-${q.createdAt}-${idx}`}
                    className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-black text-stone-900">
                        Hal. {q.page} • {getSurahNameForPage(q.page)}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {q.correct}/{q.total} benar
                        {q.part1Correct !== null && q.part1Correct !== undefined && q.part2Correct !== null && q.part2Correct !== undefined
                          ? ` (Hafalan ${q.part1Correct}/${q.part1Total ?? 30} • Kata ${q.part2Correct}/${q.part2Total ?? 30})`
                          : ""} •{" "}
                        {new Date(q.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'text-[10px] font-black border-none shrink-0',
                        q.passed
                          ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                      )}
                    >
                      {q.score}% • {q.passed ? 'LULUS' : 'Belum Lulus'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <AlertDialog open={resetDialogOpen} onOpenChange={(open) => { if (!open && !isResetting) setResetDialogOpen(false); }}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-black text-base">
              {resetMode === 'page' ? 'Reset Counter Per Halaman' : 'Reset Counter Per Juz'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-xs text-stone-600 leading-relaxed pt-1">
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setResetMode('page')}
                    className={cn(
                      'py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all',
                      resetMode === 'page'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    )}
                  >
                    Per Halaman
                  </button>
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setResetMode('juz')}
                    className={cn(
                      'py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all',
                      resetMode === 'juz'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    )}
                  >
                    Per Juz
                  </button>
                </div>

                {resetMode === 'page' ? (
                  <div className="space-y-1.5">
                    <label htmlFor="reset-page-select" className="block text-[11px] font-bold text-stone-700">
                      Pilih Halaman yang Akan Direset:
                    </label>
                    <select
                      id="reset-page-select"
                      disabled={isResetting}
                      value={selectedResetPage}
                      onChange={(e) => setSelectedResetPage(Number(e.target.value))}
                      className="w-full h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {resetPageOptions.map((opt) => (
                        <option key={opt.page} value={opt.page}>
                          Hal. {opt.page} — {opt.surah}
                          {opt.isActive ? ' (Halaman Aktif)' : ''}
                          {opt.totalProgress > 0
                            ? ` • ${opt.totalProgress}% progres`
                            : opt.hasActivity
                            ? ' • Ada progres'
                            : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-stone-600 bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
                      Semua counter (Simak, TM 1–4, dan gabungan antar blok) serta catatan harian pada{' '}
                      <strong className="text-stone-900">
                        Halaman {selectedResetPage} (QS. {getSurahNameForPage(selectedResetPage)})
                      </strong>{' '}
                      akan dikembalikan ke 0. Halaman lain, nilai ujian, &amp; riwayat tasmi&apos; tetap aman.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label htmlFor="reset-juz-select" className="block text-[11px] font-bold text-stone-700">
                      Pilih Juz yang Akan Direset:
                    </label>
                    <select
                      id="reset-juz-select"
                      disabled={isResetting}
                      value={selectedResetJuz}
                      onChange={(e) => setSelectedResetJuz(Number(e.target.value))}
                      className="w-full h-9 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    >
                      {resetJuzOptions.map((opt) => (
                        <option key={opt.juz} value={opt.juz}>
                          Juz {opt.juz} (Hal. {opt.startPage}–{opt.endPage})
                          {opt.isActive ? ' • Juz Aktif' : ''}
                          {opt.pagesWithProgress > 0 ? ` • ${opt.pagesWithProgress} hal. ada progres` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                      Seluruh counter pengulangan dan catatan progres harian pada{' '}
                      <strong>
                        Juz {selectedResetJuz} (Hal. {selectedJuzRange.startPage}–{selectedJuzRange.endPage})
                      </strong>{' '}
                      akan dikembalikan ke 0. Juz lain, nilai ujian, &amp; riwayat tasmi&apos; tetap aman.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isResetting} className="rounded-xl text-xs font-bold">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isResetting}
              onClick={(e) => {
                e.preventDefault();
                handleResetScope();
              }}
              className={cn(
                'rounded-xl text-white text-xs font-black gap-1.5',
                resetMode === 'page'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {resetMode === 'page' ? `Ya, Reset Hal. ${selectedResetPage}` : `Ya, Reset Juz ${selectedResetJuz}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
