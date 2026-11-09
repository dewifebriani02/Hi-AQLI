'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useUser } from '@/db';
import { authFetch } from '@/db/client';
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
  parseDateKeyUTC,
  TIKRAR_GRADE_LABELS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Lock,
  MessageCircle,
  PlayCircle,
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
}

function getSurahNameForPage(page: number): string {
  let surahId = 1;
  Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
    if (start <= page) surahId = Number(id);
  });
  return QURAN_CHAPTERS.find((c) => c.id === surahId)?.name_simple || "Al-Qur'an";
}

function formatRangeLabel(range?: string | null): string {
  if (range === 'blok_1_4') return '1 Halaman Penuh (Blok A–D)';
  if (range === 'blok_3_4') return '1/2 Halaman Kedua (Blok C & D)';
  return '1/2 Halaman Pertama (Blok A & B)';
}

export function TikrarDailyReport({
  onOpenScheduleTab,
  onOpenMushafTab,
  refreshSignal = 0,
}: TikrarDailyReportProps) {
  const { user } = useUser();
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
    const raw = Number(userData?.paidJuz ?? userData?.paid_juz);
    return raw >= 1 && raw <= 30 ? raw : 30;
  }, [userData]);

  const { startPage, endPage, totalPages } = useMemo(
    () => getJuzPageRange(activeJuz),
    [activeJuz]
  );

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
    if (userCurrPage >= startPage && userCurrPage <= endPage) {
      return userCurrPage;
    }
    if (todayScheduledItems.length > 0) {
      const p = Number(todayScheduledItems[0].page_number);
      if (p >= startPage && p <= endPage) return p;
    }
    return startPage;
  }, [todayScheduledItems, userCurrPage, startPage, endPage]);

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

    let clearedPagesCount = 0;
    for (let p = startPage; p <= endPage; p++) {
      if (isPageSubmissionCleared(p, userSubmissions || [], passedExamPages)) {
        clearedPagesCount += 1;
      }
    }

    return {
      totalBlocksInJuz: totalPages * 4,
      completedBlocksInJuz: completedBlockKeys.size,
      clearedPagesCount,
      activePageBlocks,
    };
  }, [userLogs, startPage, endPage, totalPages, recommendedPage, userSubmissions, passedExamPages]);

  // Analisis aktivitas sub-blok terkini dari tikrar_user_progress
  const activeStageInfo = useMemo(() => {
    if (!allUserProgress || allUserProgress.length === 0) return null;

    // Utamakan baris progres pada halaman aktif (recommendedPage), jika tidak ada ambil yang paling baru diupdate
    const matched =
      allUserProgress.find((p: any) => Number(p.page_number) === recommendedPage) ||
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
    const prepListen = Number(matched.prep_listen_count) || 0;
    const prepTrans = Boolean(matched.prep_translation_done);

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
          stageName: `Penggabungan Blok ${letter} (Sub-blok A & B)`,
          subBlockLetter: `Blok ${letter} Gabung`,
          currentCount: combCount,
          targetCount: 40,
          badgeText: `Blok ${letter}`,
          isStarted: true,
        };
        break;
      } else if (bCount > 0) {
        activeSub = {
          stageName: `Blok ${letter}-2 (Sub-blok Bagian Kedua)`,
          subBlockLetter: `Blok ${letter}-2`,
          currentCount: bCount,
          targetCount: 40,
          badgeText: `Blok ${letter}-2`,
          isStarted: true,
        };
        break;
      } else if (aCount > 0) {
        activeSub = {
          stageName: `Blok ${letter}-1 (Sub-blok Bagian Pertama)`,
          subBlockLetter: `Blok ${letter}-1`,
          currentCount: aCount,
          targetCount: 40,
          badgeText: `Blok ${letter}-1`,
          isStarted: true,
        };
        break;
      } else if (!activeSub) {
        activeSub = {
          stageName: `Blok ${letter}-1 (Sub-blok Bagian Pertama)`,
          subBlockLetter: `Blok ${letter}-1`,
          currentCount: 0,
          targetCount: 40,
          badgeText: `Blok ${letter}-1`,
          isStarted: false,
        };
        break;
      }
    }

    if (!activeSub || (!activeSub.isStarted && tuntasCount === 0)) {
      if (prepListen < 5) {
        activeSub = {
          stageName: 'Tahap Persiapan: Simak Murattal 5x',
          subBlockLetter: 'Simak Murattal',
          currentCount: prepListen,
          targetCount: 5,
          badgeText: 'Persiapan',
          isStarted: prepListen > 0,
        };
      } else if (!prepTrans) {
        activeSub = {
          stageName: 'Tahap Persiapan: Baca & Pahami Terjemahan',
          subBlockLetter: 'Terjemahan',
          currentCount: 0,
          targetCount: 1,
          badgeText: 'Persiapan',
          isStarted: true,
        };
      }
    }

    if (tuntasCount === 4) {
      const meta1234 = Number(metaObj['1_2_3_4']) || 0;
      if (meta1234 < 10) {
        activeSub = {
          stageName: 'Penggabungan 1 Halaman Penuh (Blok A–D)',
          subBlockLetter: 'Blok A–D (10x)',
          currentCount: meta1234,
          targetCount: 10,
          badgeText: 'Gabung 1 Hal',
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
      stageName: 'Blok A-1 (Sub-blok Bagian Pertama)',
      subBlockLetter: 'Blok A-1',
      currentCount: 0,
      targetCount: 40,
      badgeText: 'Blok A-1',
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
  }, [allUserProgress, recommendedPage]);

  const recentLogs = useMemo(() => (userLogs || []).slice(0, 6), [userLogs]);
  const recentSubmissions = useMemo(() => (userSubmissions || []).slice(0, 5), [userSubmissions]);

  return (
    <Card className="border border-stone-200 bg-[#fdfbf7] shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Header Rekap Pribadi & Shortcut ke Mushaf */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#800000] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-[#800000] tracking-widest uppercase">
                REKAP PROGRES PRIBADI • JUZ {activeJuz}
              </span>
              <Badge
                variant="outline"
                className="border-[#800000]/20 text-[#800000] bg-white text-[10px] font-bold"
              >
                Target Aktif: Hal. {recommendedPage} (QS. {getSurahNameForPage(recommendedPage)})
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-headline text-[#800000]">
              Ringkasan Laporan &amp; Riwayat Setoran Live Zoom
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                className="h-9 bg-[#800000] hover:bg-[#800000]/90 text-white text-xs font-black px-4 rounded-xl shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                Buka Mushaf &amp; Isi Laporan (Hal. {recommendedPage})
              </Button>
            )}
          </div>
        </div>

        {/* 4 Kartu KPI Ringkas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Keaktifan Pekan Ini
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-xl font-black text-stone-900">
                {consistency.weeklyActiveDays}/{targetDaysPerWeek} Hari
              </span>
              <Badge
                className={cn(
                  'text-[9px] font-black border-none',
                  consistency.weeklyActiveDays >= targetDaysPerWeek
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                )}
              >
                {consistency.weeklyActiveDays >= targetDaysPerWeek ? 'Tercapai' : 'Berjalan'}
              </Badge>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Streak &amp; Total Poin
            </span>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-lg font-black text-orange-700">
                <Flame className="w-4 h-4 fill-orange-500 text-orange-600" />
                {consistency.streak} Hari
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-[#800000]">
                <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
                {Number(userData?.points) || 0} Poin
              </span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
              Blok Tercatat (Juz {activeJuz})
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-xl font-black text-[#800000]">
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
                  {recommendedPage}{letter}
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
                <CalendarDays className="w-4 h-4 text-[#800000]" /> Riwayat Laporan Harian Terakhir
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
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#800000]">
                      Aktivitas Sedang Berjalan (Real-Time)
                    </span>
                  </div>
                  <Badge className="bg-[#800000] text-white hover:bg-[#800000] text-[10px] font-black px-2 py-0.5">
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
                      className="h-8 bg-[#800000] hover:bg-[#800000]/90 text-white text-[11px] font-bold px-3 rounded-xl shadow-sm shrink-0"
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

            {/* Sub-header untuk Log Blok Tuntas */}
            <div className="pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Laporan Blok Tuntas (40x Selesai)
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
                  const prettyDate = parseDateKeyUTC(dk).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  });
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
                <Award className="w-4 h-4 text-[#800000]" /> Status Setoran Tasmi&apos; Live Zoom
              </h3>
              <span className="text-[11px] font-bold text-stone-500">
                {(userSubmissions || []).length} Setoran
              </span>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                Belum ada riwayat setoran. Selesaikan minimal 2 blok (Blok A &amp; B + Gabung A&amp;B
                10x) di tab <strong>Mushaf &amp; Audio</strong> untuk mendaftar setoran Live Zoom.
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
      </CardContent>
    </Card>
  );
}
