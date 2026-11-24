'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Headphones,
  Info,
  Languages,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquare,
  Mic2,
  Minus,
  Palette,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Star,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { useUser, useDoc, useCollection, addDocumentNonBlocking, db } from '@/db';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import { useFontSize } from '@/contexts/font-size-context';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { QURAN_CHAPTERS } from '@/lib/quran-data';
import { SURAH_START_PAGES } from '@/lib/quran-mapping';
import { renderTajwidWord, TajwidLegendBar } from '@/lib/tajwid-warna';
import {
  BLOCK_LETTERS,
  computeMaxUnlockedPageInJuz,
  computeTikrarStreakAndWeekly,
  getJuzForPage,
  getJuzPageRange,
  isActiveStudyDay,
  isPageSubmissionCleared,
  JUZ_PAGES,
  formatDateID,
  parseDateKeyUTC,
  TIKRAR_GRADE_LABELS,
  TIKRAR_PACE_OPTIONS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import {
  canUndoStep,
  countCompletedSteps,
  createEmptyTikrarBlocks,
  createEmptyTikrarMetaCounts,
  getStepMinCount,
  estimateClicksForNextSteps,
  getBlockListenCount,
  getMetaThreshold,
  isBlockListenDone,
  generateTikrarStepSchedule,
  MEMORIZED_STEP_COUNT,
  QUIZ_PASS_PERCENT,
  QUIZ_QUESTION_COUNT,
  STEPS_PER_PAGE,
  stepValue,
  TIKRAR_STEPS,
} from '@/lib/tikrar-steps';
import {
  formatVerseRange,
  splitPageInto4Blocks,
  splitBlockIntoSubBlocks,
  SYAAMIL_BLOCK_THEME,
  PageBlockConfig,
  BlockConfig,
} from '@/lib/tikrar-blocks';
import type { TikrarSummary } from '@/lib/tikrar-server';
import {
  isTikrarSoundEnabled,
  playTikrarCount,
  playTikrarDone,
  playTikrarTap,
  playTikrarUndo,
  setTikrarSoundEnabled,
} from '@/lib/tikrar-sound';

interface ReciterOption {
  id: number;
  name: string;
  provider: 'mp3quran' | 'quran_api' | 'everyayah';
  serverUrl?: string;
  timingReadId?: number;
  description?: string;
}

const RECITERS: ReciterOption[] = [
  {
    id: 21203,
    name: 'Dr. Syaikh Ayman Rusydi Suwaid',
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Ayman_Sowaid_64kbps/',
    description: "Audio Per Ayat (Tajwid & Murottal Standar • Sinkron Per Halaman)",
  },
  {
    id: 21001,
    name: 'Syaikh Ibrahim Al-Akhdar',
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Ibrahim_Akhdar_32kbps/',
    description: "Imam Masjid Nabawi (Audio Per Ayat • Sinkron Per Halaman)",
  },
  {
    id: 6,
    name: 'Syaikh Mahmoud Khalil Al-Husary',
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Husary_64kbps/',
    description: "Standar Tahfiz Internasional (Audio Per Ayat • Sinkron Per Halaman)",
  },
  {
    id: 7,
    name: 'Syaikh Mishary Rashid Alafasy',
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Alafasy_64kbps/',
    description: "Audio Per Ayat Populer (Sinkron Per Halaman)",
  },
  {
    id: 3,
    name: 'Syaikh Abdur-Rahman As-Sudais',
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_64kbps/',
    description: "Imam Masjidil Haram (Audio Per Ayat)",
  },
  {
    id: 10,
    name: "Syaikh Sa'ud Ash-Shuraim",
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Saood_ash-Shuraym_64kbps/',
    description: "Imam Masjidil Haram (Audio Per Ayat)",
  },
  {
    id: 9,
    name: 'Syaikh Muhammad Siddiq Al-Minshawi',
    provider: 'everyayah',
    serverUrl: 'https://everyayah.com/data/Minshawy_Murattal_128kbps/',
    description: "Murattal Al-Minshawi (Audio Per Ayat)",
  },
  {
    id: 21136,
    name: 'Syaikh Abdullah Al-Qarafi',
    provider: 'mp3quran',
    serverUrl: 'https://cdn.mp3quran.net/audio/abdullah-qarafi/r1/',
    description: "Streaming 1 Surah Penuh MP3Quran (Tidak sinkron per halaman)",
  },
];

const PASS_THRESHOLD = 40;
const META_PASS_THRESHOLD = 10;
const PREP_LISTEN_THRESHOLD = 5;

interface Word {
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  translation?: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  words: Word[];
  translations?: { text: string }[];
}

export interface TikrarSystemProps {
  targetPage?: number | null;
  targetJuz?: number | null;
  targetTimestamp?: number;
  refreshSignal?: number;
  onDataChanged?: () => void;
  onOpenScheduleTab?: () => void;
  onOpenGroupRecapTab?: () => void;
  summary?: TikrarSummary | null;
}

function getSurahNameForPage(page: number): string {
  let surahId = 1;
  Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
    if (start <= page) surahId = Number(id);
  });
  return QURAN_CHAPTERS.find((c) => c.id === surahId)?.name_simple || "Al-Qur'an";
}

function formatBlockRangeLabel(verses: Verse[], blockCfg?: BlockConfig | null): string {
  if (!verses || verses.length === 0) return 'Memuat ayat...';
  const first = verses[0].verse_key;
  const last = verses[verses.length - 1].verse_key;
  const [s1, a1] = first.split(':');
  const [s2, a2] = last.split(':');
  const surah1 = QURAN_CHAPTERS.find((c) => c.id === Number(s1))?.name_simple || `QS ${s1}`;
  if (blockCfg?.sub_1 && blockCfg?.sub_2) {
    if (s1 === s2 && a1 === a2) {
      return `${surah1}: ${a1} (Kata #${blockCfg.sub_1.start_word_index}–#${blockCfg.sub_2.end_word_index})`;
    }
  }
  if (s1 === s2) {
    return a1 === a2 ? `${surah1}: ${a1}` : `${surah1}: ${a1}–${a2}`;
  }
  const surah2 = QURAN_CHAPTERS.find((c) => c.id === Number(s2))?.name_simple || `QS ${s2}`;
  return `${surah1} ${a1} – ${surah2} ${a2}`;
}

const pageDataCache = new Map<number, { verses: Verse[]; customPageConfig: PageBlockConfig | null }>();

function createEmptyBlocks() {
  return {
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
  };
}

function createEmptyMetaCounts(): Record<string, number> {
  return {
    '1_2': 0,
    '2_3': 0,
    '1_2_3': 0,
    '3_4': 0,
    '2_3_4': 0,
    '1_2_3_4': 0,
  };
}

function readLocalPageProgress(p: number) {
  const blocks = createEmptyBlocks() as any;
  const metaCounts = createEmptyMetaCounts();
  let prepListenCount = 0;
  let prepTranslationDone = false;
  if (typeof window === 'undefined' || !p) {
    return { blocks, metaCounts, prepListenCount, prepTranslationDone };
  }
  try {
    const savedProgressStr = localStorage.getItem(`tikrar_progress_p${p}`);
    if (savedProgressStr) {
      const saved = JSON.parse(savedProgressStr);
      prepListenCount = Number(saved.prepListenCount) || 0;
      prepTranslationDone = Boolean(saved.prepTranslationDone);
      for (const b of [1, 2, 3, 4] as const) {
        if (saved.blocks?.[b]) {
          blocks[b] = {
            a: { count: Number(saved.blocks[b]?.a?.count) || 0 },
            b: { count: Number(saved.blocks[b]?.b?.count) || 0 },
            combined: { count: Number(saved.blocks[b]?.combined?.count) || 0 },
            listen: { count: Number(saved.blocks[b]?.listen?.count) || 0 },
            ...(typeof saved.blocks[b]?.understood === 'boolean'
              ? { understood: saved.blocks[b].understood }
              : {}),
          };
        }
      }
      if (saved.metaCounts) {
        Object.keys(metaCounts).forEach((k) => {
          metaCounts[k] = Number(saved.metaCounts[k]) || 0;
        });
      }
    }
  } catch {}
  return { blocks, metaCounts, prepListenCount, prepTranslationDone };
}

function resolveInitialPageAndJuz(
  targetPage: number | null | undefined,
  targetJuz: number | null | undefined,
  summary: TikrarSummary | null | undefined
): { page: number; juz: number; resolved: boolean } {
  if (targetPage && targetPage >= 1 && targetPage <= 604) {
    const derivedJuz = targetJuz && targetJuz >= 1 && targetJuz <= 30 ? targetJuz : getJuzForPage(targetPage);
    return { page: targetPage, juz: derivedJuz, resolved: true };
  }
  const activeTarget = summary?.target || null;
  if (activeTarget) {
    const cleared = new Set<number>([
      ...(summary?.quizPassedPages || []),
      ...(summary?.tasmiPassedPages || []),
    ]);
    if (typeof window !== 'undefined') {
      const savedPage = Number(localStorage.getItem('aqli_tikrar_last_page'));
      const savedJuz = Number(localStorage.getItem('aqli_tikrar_last_juz'));
      if (
        savedPage >= activeTarget.startPage &&
        savedPage <= activeTarget.endPage &&
        (!savedJuz || savedJuz === activeTarget.juz) &&
        (savedPage <= activeTarget.unlockedPage || cleared.has(savedPage))
      ) {
        return { page: savedPage, juz: activeTarget.juz, resolved: true };
      }
    }
    return { page: activeTarget.unlockedPage, juz: activeTarget.juz, resolved: true };
  }
  if (typeof window !== 'undefined') {
    const savedPage = Number(localStorage.getItem('aqli_tikrar_last_page'));
    const savedJuz = Number(localStorage.getItem('aqli_tikrar_last_juz'));
    if (savedPage >= 1 && savedPage <= 604) {
      return {
        page: savedPage,
        juz: savedJuz >= 1 && savedJuz <= 30 ? savedJuz : getJuzForPage(savedPage),
        resolved: false,
      };
    }
  }
  return { page: targetPage || 582, juz: targetJuz || 30, resolved: false };
}

export function TikrarSystem({
  targetPage,
  targetJuz,
  targetTimestamp,
  refreshSignal = 0,
  onDataChanged,
  onOpenScheduleTab,
  onOpenGroupRecapTab,
  summary = null,
}: TikrarSystemProps = {}) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const {
    data: userData,
    isLoading: isUserDataLoading,
    refresh: refreshUser,
  } = useDoc<any>(user ? 'users' : null, user?.id);

  // Semua juz terbuka (program gratis); paid_juz / "paidJuz" hanya menjadi juz awal.
  const paidJuz = useMemo(() => {
    const raw = Number(userData?.paid_juz ?? userData?.paidJuz);
    return raw >= 1 && raw <= 30 ? raw : 30;
  }, [userData]);

  const initialResolved = useMemo(
    () => resolveInitialPageAndJuz(targetPage, targetJuz, summary),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialCachedPageData = pageDataCache.get(initialResolved.page);
  const initialLocalProgress = useMemo(
    () => readLocalPageProgress(initialResolved.page),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [juz, setJuz] = useState<number>(initialResolved.juz);
  const [page, setPage] = useState<number>(initialResolved.page);
  const [customPageConfig, setCustomPageConfig] = useState<PageBlockConfig | null>(
    initialCachedPageData?.customPageConfig ?? null
  );
  const [verses, setVerses] = useState<Verse[]>(initialCachedPageData?.verses || []);
  const [loading, setLoading] = useState(!initialCachedPageData);
  const { fontSize } = useFontSize();
  const [hasInitializedPage, setHasInitializedPage] = useState(initialResolved.resolved);
  const [isRequestingExam, setIsRequestingExam] = useState(false);
  const [tasmiQueue, setTasmiQueue] = useState<any[]>([]);
  const [serverMySubmissions, setServerMySubmissions] = useState<any[] | null>(null);
  const [loadingTasmiQueue, setLoadingTasmiQueue] = useState(false);

  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  // State & audio ref

  // Tahap 0 & Sub-repetisi state
  const [prepListenCount, setPrepListenCount] = useState(initialLocalProgress.prepListenCount);
  const [prepTranslationDone, setPrepTranslationDone] = useState(initialLocalProgress.prepTranslationDone);

  const [selectedReciterId, setSelectedReciterId] = useState<number | null>(21203);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const isAutoPlayingRef = useRef(false);
  const [playingVerseIndex, setPlayingVerseIndex] = useState<number | null>(null);
  const [currentSurahPlaying, setCurrentSurahPlaying] = useState<number | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [manualVerseIdx, setManualVerseIdx] = useState(0);
  const ayahTimingRef = useRef<Record<number, { ayah: number; start_time: number }[]>>({});
  const [showReciterDialog, setShowReciterDialog] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio simak per blok: memutar ayat-ayat satu blok, 5 putaran, menambah hitungan simak blok
  const [blockPlayback, setBlockPlayback] = useState<{ block: 1 | 2 | 3 | 4; verseIdx: number; loop: number } | null>(null);
  const blockPlaybackRef = useRef<{ block: 1 | 2 | 3 | 4; played?: boolean } | null>(null);
  const [simakPromptedBlocks, setSimakPromptedBlocks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!activeVerseKey) return;
    document
      .getElementById(`verse-card-${activeVerseKey.replace(':', '-')}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeVerseKey]);
  const nextAudioUrlRef = useRef<string | null>(null);

  const currentReciter = useMemo(
    () => RECITERS.find((r) => r.id === selectedReciterId) || RECITERS[0],
    [selectedReciterId]
  );
  const isMp3Quran = currentReciter.provider === "mp3quran";

  useEffect(() => {
    setManualVerseIdx(0);
  }, [page]);

  // Cleanup audio saat unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Collections for Halaqah, Logs, Schedules, Submissions & Page Exams
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
      orderBy: { column: 'created_at', ascending: false },
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
  // Target aktif dari Target & Jadwal: menentukan rentang halaman & gerbang ujian 60 soal
  const activeTarget = summary?.target || null;
  const juzPageRange = useMemo(() => getJuzPageRange(juz), [juz]);
  const { startPage, endPage } = useMemo(
    () =>
      activeTarget && juz === activeTarget.juz
        ? { startPage: activeTarget.startPage, endPage: activeTarget.endPage }
        : juzPageRange,
    [activeTarget, juz, juzPageRange]
  );
  const clearedPages = useMemo(
    () => new Set<number>([...(summary?.quizPassedPages || []), ...(summary?.tasmiPassedPages || [])]),
    [summary?.quizPassedPages, summary?.tasmiPassedPages]
  );
  const quizPassedPages = useMemo(() => new Set<number>(summary?.quizPassedPages || []), [summary?.quizPassedPages]);
  const priorMemorizedSet = useMemo(
    () => new Set<number>(summary?.priorMemorizedPages || []),
    [summary?.priorMemorizedPages]
  );
  const isPriorMemorizedPage = priorMemorizedSet.has(page);
  const fetchTasmiQueue = useCallback(async () => {
    if (!user?.id) {
      setTasmiQueue([]);
      setServerMySubmissions(null);
      return;
    }
    setLoadingTasmiQueue(true);
    try {
      const res = await authFetch('/api/tikrar/submissions');
      const json = await res.json();
      if (res.ok && json?.data) {
        setTasmiQueue(Array.isArray(json.data.queue) ? json.data.queue : []);
        setServerMySubmissions(Array.isArray(json.data.mySubmissions) ? json.data.mySubmissions : []);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoadingTasmiQueue(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTasmiQueue();
  }, [fetchTasmiQueue, refreshSignal]);

  const isPageInActiveTarget = Boolean(
    activeTarget && page >= activeTarget.startPage && page <= activeTarget.endPage
  );
  const navigateToPage = useCallback(
    (targetP: number) => {
      const pNum = Math.max(1, Math.min(604, Math.floor(targetP)));
      const targetJuzForP =
        activeTarget && pNum >= activeTarget.startPage && pNum <= activeTarget.endPage
          ? activeTarget.juz
          : getJuzForPage(pNum);
      setJuz(targetJuzForP);
      setPage(pNum);
    },
    [activeTarget]
  );

  const pageLockReason = useMemo(() => {
    if (!user) return null;
    if (!activeTarget) return 'Isi Target & Jadwal terlebih dahulu sebelum mulai berlatih.';
    // Halaman di luar target aktif (pindah juz / murajaah / coba juz baru) selalu terbuka tanpa mengunci counter
    if (!isPageInActiveTarget) return null;
    if (clearedPages.has(page) || isPriorMemorizedPage) return null;
    if (page > activeTarget.unlockedPage) {
      return `Halaman ${page} masih terkunci. Luluskan ujian ${QUIZ_QUESTION_COUNT} soal Halaman ${activeTarget.unlockedPage} terlebih dahulu.`;
    }
    return null;
  }, [user, activeTarget, isPageInActiveTarget, clearedPages, isPriorMemorizedPage, page]);
  const lastQuizOnPage = useMemo(
    () => (summary?.recentQuizzes || []).find((q) => q.page === page) || null,
    [summary?.recentQuizzes, page]
  );

  const passedExamPages = useMemo(() => {
    const set = new Set<number>();
    (userPageExams || []).forEach((e: any) => {
      if (e?.passed && e?.page_number) set.add(Number(e.page_number));
    });
    return set;
  }, [userPageExams]);

  const activeExam = useMemo(
    () => (userPageExams || []).find((e: any) => Number(e?.page_number) === page) || null,
    [userPageExams, page]
  );

  const effectiveSubmissions = serverMySubmissions ?? userSubmissions ?? [];
  const activeSubmissionForPage = useMemo(() => {
    const matching = effectiveSubmissions.filter((s: any) => Number(s?.page_number) === page);
    if (matching.length === 0) return null;
    return (
      matching.find((s: any) => s.status === 'passed') ||
      matching.find((s: any) => s.status === 'pending') ||
      matching[0]
    );
  }, [effectiveSubmissions, page]);

  const myPendingQueueEntry = useMemo(
    () => tasmiQueue.find((q) => q.isMe && Number(q.pageNumber) === page) || null,
    [tasmiQueue, page]
  );

  // Target Aktif di Juz Ini
  const userCurrentTarget = Number(userData?.tikrar_current_page);

  // Scheduled items for today (or earliest pending schedule in current Juz)
  const todayScheduledItems = useMemo(() => {
    const inJuz = (userSchedules || []).filter(
      (s: any) => Number(s.juz) === juz
    );
    const exactToday = inJuz.filter((s: any) => toDateKeyWIB(s.scheduled_date) === todayKey);
    if (exactToday.length > 0) return exactToday;
    const nextPending = inJuz.filter((s: any) => s.status !== 'completed');
    if (nextPending.length > 0) {
      const firstDate = toDateKeyWIB(nextPending[0].scheduled_date);
      return nextPending.filter((s: any) => toDateKeyWIB(s.scheduled_date) === firstDate);
    }
    return [];
  }, [userSchedules, juz, todayKey]);

  const recommendedPage = useMemo(() => {
    if (activeTarget) return activeTarget.unlockedPage;
    if (todayScheduledItems.length > 0) {
      const p = Number(todayScheduledItems[0].page_number);
      if (p >= startPage && p <= endPage) return p;
    }
    if (userCurrentTarget >= startPage && userCurrentTarget <= endPage) {
      return userCurrentTarget;
    }
    return startPage;
  }, [activeTarget, todayScheduledItems, userCurrentTarget, startPage, endPage]);
  const isSelectedPageCleared = useMemo(
    () => clearedPages.has(page) || isPageSubmissionCleared(page, userSubmissions || [], passedExamPages),
    [clearedPages, page, userSubmissions, passedExamPages]
  );

  const [blocks, setBlocks] = useState<any>(() => initialLocalProgress.blocks);
  const [metaCounts, setMetaCounts] = useState<Record<string, number>>(() => initialLocalProgress.metaCounts);

  // Blocks already logged in DB on `page` (across any date) and specifically today
  const { completedBlocksAllTime, completedBlocksToday } = useMemo(() => {
    const allSet = new Set<number>();
    const todaySet = new Set<number>();
    (userLogs || []).forEach((log: any) => {
      if (!log?.completed || Number(log.page_number) !== page) return;
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
  }, [userLogs, page, todayKey]);

  const completedBlocksKey = useMemo(
    () => Array.from(completedBlocksAllTime).sort((a, b) => a - b).join(','),
    [completedBlocksAllTime]
  );

  // Listen for targetPage & targetJuz updates (e.g. from saving schedule or clicking Open Target Page)
  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= 604) {
      const derivedJuz =
        targetJuz && targetJuz >= 1 && targetJuz <= 30 ? targetJuz : getJuzForPage(targetPage);
      setJuz(derivedJuz);
      setPage(targetPage);
      setHasInitializedPage(true);
    }
  }, [targetPage, targetJuz, targetTimestamp]);

  // Inisialisasi halaman & juz awal untuk pengguna (atau pemulihan dari target / sesi terakhir)
  useEffect(() => {
    // 1. Tunggu status login selesai diperiksa
    if (isUserLoading) return;
    // 2. Jika user login, tunggu sampai data profil & target selesai dimuat
    if (user && (isUserDataLoading || !userData)) return;

    if (!hasInitializedPage && !targetPage) {
      const activeJuz = activeTarget?.juz ?? paidJuz;
      const range = activeTarget
        ? { startPage: activeTarget.startPage, endPage: activeTarget.endPage }
        : getJuzPageRange(activeJuz);

      let initialPage: number | null = null;

      // Prioritas 1: Tempat terakhir di localStorage (jika berada dalam range juz target aktif)
      if (typeof window !== 'undefined') {
        const savedPage = Number(localStorage.getItem('aqli_tikrar_last_page'));
        const savedJuz = Number(localStorage.getItem('aqli_tikrar_last_juz'));
        if (
          savedPage >= range.startPage &&
          savedPage <= range.endPage &&
          (!savedJuz || savedJuz === activeJuz) &&
          (!activeTarget || savedPage <= activeTarget.unlockedPage || clearedPages.has(savedPage))
        ) {
          initialPage = savedPage;
        }
      }

      // Prioritas 1b: halaman target yang sedang terbuka
      if (!initialPage && activeTarget) {
        initialPage = activeTarget.unlockedPage;
      }

      // Prioritas 2: Terakhir berhenti di database pengguna (tikrar_current_page)
      if (!initialPage) {
        const dbCurrPage = Number(userData?.tikrar_current_page);
        if (dbCurrPage >= range.startPage && dbCurrPage <= range.endPage) {
          initialPage = dbCurrPage;
        }
      }

      // Prioritas 3: Target schedule pending hari ini / schedule terdekat berikutnya di Juz ini
      if (!initialPage && todayScheduledItems.length > 0) {
        const schedPage = Number(todayScheduledItems[0].page_number);
        if (schedPage >= range.startPage && schedPage <= range.endPage) {
          initialPage = schedPage;
        }
      }

      // Prioritas 4: Halaman awal juz aktif
      if (!initialPage || initialPage < range.startPage || initialPage > range.endPage) {
        initialPage = range.startPage;
      }

      setJuz(activeJuz);
      setPage(initialPage);
      setHasInitializedPage(true);
    }

    if (typeof window !== 'undefined') {
      const savedReciter = localStorage.getItem('aqli_reciter_id');
      const parsed = parseInt(savedReciter || "", 10);
      // Migrasi otomatis pengguna dari 21136 (Al-Qarafi surah utuh) ke 21203 (Ayman Suwaid per halaman)
      if (parsed === 21136 || !parsed) {
        setSelectedReciterId(21203);
        localStorage.setItem('aqli_reciter_id', '21203');
      } else if (!isNaN(parsed) && RECITERS.some((r) => r.id === parsed)) {
        setSelectedReciterId(parsed);
      } else {
        setSelectedReciterId(21203);
        localStorage.setItem('aqli_reciter_id', '21203');
      }
    }
  }, [
    userData,
    user,
    paidJuz,
    isUserLoading,
    isUserDataLoading,
    hasInitializedPage,
    targetPage,
    todayScheduledItems,
    activeTarget,
    clearedPages,
  ]);

  // Simpan posisi halaman & juz terakhir ke localStorage setiap kali berganti halaman
  useEffect(() => {
    if (typeof window !== 'undefined' && page >= 1 && page <= 604) {
      localStorage.setItem('aqli_tikrar_last_page', String(page));
      if (juz >= 1 && juz <= 30) {
        localStorage.setItem('aqli_tikrar_last_juz', String(juz));
      }
    }
  }, [page, juz]);

  const [showTrialCounter, setShowTrialCounter] = useState(false);

  // Reset prompt per-sesi & kembalikan default Mode Tilawah saat halaman berubah
  useEffect(() => {
    setSimakPromptedBlocks({});
    setShowTrialCounter(false);
    setActiveVerseKey(null);
  }, [page]);

  // Fetch verses + custom block config secara atomik dan manfaatkan cache agar tidak berkedip
  useEffect(() => {
    if (!hasInitializedPage) return;
    let active = true;

    if (audioRef.current) audioRef.current.pause();
    blockPlaybackRef.current = null;
    setBlockPlayback(null);
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
    setPlayingVerseIndex(null);

    const cached = pageDataCache.get(page);
    if (cached) {
      setVerses(cached.verses);
      setCustomPageConfig(cached.customPageConfig);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    async function fetchPageData() {
      setLoading(true);
      try {
        const [versesRes, blocksRes] = await Promise.all([
          fetch(
            `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani,text_uthmani_tajweed&words=true&word_fields=text_uthmani,text_uthmani_tajweed&word_translation_language=id&translations=33`
          ),
          fetch(`/api/tikrar/blocks?page=${page}`).catch(() => null),
        ]);

        if (!versesRes.ok) throw new Error('Gagal memuat ayat');
        const data = await versesRes.json();
        const blocksJson = blocksRes && blocksRes.ok ? await blocksRes.json().catch(() => null) : null;
        const nextConfig: PageBlockConfig | null =
          blocksJson?.success && blocksJson?.config ? blocksJson.config : null;

        if (active && data && data.verses && data.verses.length > 0) {
          pageDataCache.set(page, { verses: data.verses, customPageConfig: nextConfig });
          setCustomPageConfig(nextConfig);
          setVerses(data.verses);
          const rec = RECITERS.find((r) => r.id === selectedReciterId);
          if (rec && rec.provider !== "mp3quran") {
            getAudioUrlByVerseKey(data.verses[0].verse_key, rec.id).then((url) => {
              nextAudioUrlRef.current = url;
            });
          }
        }
      } catch (error) {
        console.error('Tikrar Maqta Fetch Error:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPageData();
    return () => {
      active = false;
    };
  }, [page, hasInitializedPage]);

  const isHydratedRef = useRef(false);
  const skipNextDbSyncRef = useRef(false);
  const [userSaveTick, setUserSaveTick] = useState(0);
  const lastSyncedTickRef = useRef(0);
  const dirtyPageRef = useRef<number | null>(null);
  const markUserProgressDirty = useCallback(() => {
    dirtyPageRef.current = page;
    setUserSaveTick((t) => t + 1);
  }, [page]);
  const updateBlocksByUser = useCallback(
    (updater: any) => {
      setBlocks(updater);
      markUserProgressDirty();
    },
    [markUserProgressDirty]
  );
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => setSoundOn(isTikrarSoundEnabled()), []);
  const [showTajwid, setShowTajwid] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aqli_tikrar_tajwid');
      if (saved === '0' || saved === 'false') setShowTajwid(false);
    } catch {
      // ignore storage errors
    }
  }, []);
  const toggleTajwid = useCallback(() => {
    setShowTajwid((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aqli_tikrar_tajwid', next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);
  const lockToastShownRef = useRef(false);
  const pendingUndoKeysRef = useRef<Set<string>>(new Set());
  // Klik hari ini dari respons simpan terakhir (lebih baru daripada ringkasan sampai ringkasan dimuat ulang)
  const [liveTodayClicks, setLiveTodayClicks] = useState<number | null>(null);
  useEffect(() => setLiveTodayClicks(null), [summary]);
  const lastStepsTodayRef = useRef<number>(-1);

  // Hydrate progress from DB + localStorage + merge DB completed blocks
  useEffect(() => {
    let isCancelled = false;

    async function loadProgress() {
      if (typeof window === 'undefined') return;
      isHydratedRef.current = false;

      let nextPrepListen = 0;
      let hasDbProgress = false;
      let nextPrepTrans = false;
      let hasExplicitMeta = false;
      const nextBlocks: any = {
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
      };
      const nextMeta: Record<string, number> = {
        '1_2': 0,
        '2_3': 0,
        '1_2_3': 0,
        '3_4': 0,
        '2_3_4': 0,
        '1_2_3_4': 0,
      };

      // 1. Ambil dari localStorage terlebih dahulu untuk respon instan
      const savedProgressStr = localStorage.getItem(`tikrar_progress_p${page}`);
      if (savedProgressStr) {
        try {
          const saved = JSON.parse(savedProgressStr);
          nextPrepListen = Number(saved.prepListenCount) || 0;
          nextPrepTrans = Boolean(saved.prepTranslationDone);
          for (const b of [1, 2, 3, 4] as const) {
            if (saved.blocks?.[b]) {
              nextBlocks[b] = {
                a: { count: Number(saved.blocks[b]?.a?.count) || 0 },
                b: { count: Number(saved.blocks[b]?.b?.count) || 0 },
                combined: { count: Number(saved.blocks[b]?.combined?.count) || 0 },
                listen: { count: Number(saved.blocks[b]?.listen?.count) || 0 },
                ...(typeof saved.blocks[b]?.understood === 'boolean'
                  ? { understood: saved.blocks[b].understood }
                  : {}),
              };
            }
          }
          if (saved.metaCounts && typeof saved.metaCounts === 'object' && Object.keys(saved.metaCounts).length > 0) {
            hasExplicitMeta = true;
            Object.keys(nextMeta).forEach((k) => {
              nextMeta[k] = Number(saved.metaCounts[k]) || 0;
            });
          }
        } catch {}
      }

      if (!isCancelled) {
        setPrepListenCount(nextPrepListen);
        setPrepTranslationDone(nextPrepTrans);
        setBlocks({ ...nextBlocks });
        setMetaCounts({ ...nextMeta });
      }

      // 2. Ambil dari Database jika user sudah login (Database adalah sumber kebenaran utama antar perangkat HP & Laptop)
      if (user?.id) {
        try {
          const res = await authFetch(`/api/tikrar/progress?page=${page}`, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const dbProg = json.data;
            if (dbProg) {
              hasDbProgress = true;
              nextPrepListen = Number(dbProg.prep_listen_count) || 0;
              nextPrepTrans = Boolean(dbProg.prep_translation_done);
              for (const b of [1, 2, 3, 4] as const) {
                const dbB = dbProg.blocks?.[b];
                const dbUnderstood = dbB?.understood;
                nextBlocks[b] = {
                  a: { count: Number(dbB?.a?.count) || 0 },
                  b: { count: Number(dbB?.b?.count) || 0 },
                  combined: { count: Number(dbB?.combined?.count) || 0 },
                  listen: { count: Number(dbB?.listen?.count) || 0 },
                  ...(typeof dbUnderstood === 'boolean' ? { understood: dbUnderstood } : {}),
                };
              }
              hasExplicitMeta = true;
              Object.keys(nextMeta).forEach((k) => {
                nextMeta[k] = Number(dbProg.meta_counts?.[k]) || 0;
              });
            } else {
              // Bila di database belum ada / sudah di-reset dari perangkat lain, bersihkan cache lokal perangkat ini
              nextPrepListen = 0;
              nextPrepTrans = false;
              for (const b of [1, 2, 3, 4] as const) {
                nextBlocks[b] = { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } };
              }
              Object.keys(nextMeta).forEach((k) => {
                nextMeta[k] = 0;
              });
            }
            // Sinkronkan localStorage perangkat ini dengan kondisi terbaru dari Database
            try {
              localStorage.setItem(
                `tikrar_progress_p${page}`,
                JSON.stringify({
                  prepListenCount: nextPrepListen,
                  prepTranslationDone: nextPrepTrans,
                  blocks: nextBlocks,
                  metaCounts: nextMeta,
                })
              );
            } catch {}
          }
        } catch (e) {
          console.warn('Gagal memuat progres dari database:', e);
        }
      }

      // 3. Gabungkan DB completed blocks agar kunci berurutan konsisten (hanya bila belum ada baris eksplisit di DB)
      if (!hasDbProgress && completedBlocksAllTime.size > 0) {
        for (const b of [1, 2, 3, 4] as const) {
          if (completedBlocksAllTime.has(b)) {
            nextBlocks[b] = {
              ...nextBlocks[b],
              a: { count: Math.max(nextBlocks[b].a.count, PASS_THRESHOLD) },
              b: { count: Math.max(nextBlocks[b].b.count, PASS_THRESHOLD) },
              combined: { count: Math.max(nextBlocks[b].combined.count, PASS_THRESHOLD) },
              listen: { count: Math.max(nextBlocks[b].listen.count, PREP_LISTEN_THRESHOLD) },
            };
          }
        }
      }

      // Gabungan antar blok wajib diklik 10x sendiri. Hanya diisi otomatis bila halaman sudah lulus,
      // atau (data lama) blok sesudahnya sudah mulai dikerjakan agar blok itu tidak terkunci lagi.
      const blockDone = (b: 1 | 2 | 3 | 4) =>
        nextBlocks[b].a.count >= PASS_THRESHOLD &&
        nextBlocks[b].b.count >= PASS_THRESHOLD &&
        nextBlocks[b].combined.count >= PASS_THRESHOLD;
      const blockStarted = (b: 1 | 2 | 3 | 4) =>
        nextBlocks[b].a.count > 0 || nextBlocks[b].b.count > 0 || nextBlocks[b].combined.count > 0;
      if (!hasExplicitMeta) {
        if (blockDone(1) && blockDone(2) && blockStarted(3)) {
          nextMeta['1_2'] = Math.max(nextMeta['1_2'], getMetaThreshold('1_2'));
        }
        if (blockDone(1) && blockDone(2) && blockDone(3) && blockStarted(4)) {
          nextMeta['1_2'] = Math.max(nextMeta['1_2'], getMetaThreshold('1_2'));
          nextMeta['2_3'] = Math.max(nextMeta['2_3'], getMetaThreshold('2_3'));
          nextMeta['1_2_3'] = Math.max(nextMeta['1_2_3'], getMetaThreshold('1_2_3'));
        }
      }
      if (isSelectedPageCleared && !hasExplicitMeta && blockDone(1) && blockDone(2) && blockDone(3) && blockDone(4)) {
        Object.keys(nextMeta).forEach((k) => {
          nextMeta[k] = Math.max(nextMeta[k], getMetaThreshold(k));
        });
      }

      if (!isCancelled) {
        setPrepListenCount(nextPrepListen);
        setPrepTranslationDone(nextPrepTrans);
        setBlocks(nextBlocks);
        setMetaCounts(nextMeta);
        setTimeout(() => {
          isHydratedRef.current = true;
        }, 150);
      }
    }

    dirtyPageRef.current = null;
    loadProgress();

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (dirtyPageRef.current !== null) return;
      loadProgress();
      onDataChanged?.();
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [page, isSelectedPageCleared, user?.id, refreshSignal]);

  const totalProgress = useMemo(() => {
    let totalDone = 0;
    [1, 2, 3, 4].forEach((id) => {
      totalDone += (Math.min(blocks[id].listen?.count || 0, PREP_LISTEN_THRESHOLD) / PREP_LISTEN_THRESHOLD) * 2.5;
      totalDone += (Math.min(blocks[id].a.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
      totalDone += (Math.min(blocks[id].b.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
      totalDone += (Math.min(blocks[id].combined.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
    });
    const metaWeight = 5;
    Object.keys(metaCounts).forEach((k) => {
      const th = getMetaThreshold(k);
      totalDone += (Math.min(metaCounts[k], th) / th) * metaWeight;
    });
    const totalWeight = 10 + 4 * 30 + 6 * metaWeight;
    return Math.min(100, (totalDone / totalWeight) * 100);
  }, [prepListenCount, prepTranslationDone, blocks, metaCounts]);

  // Simpan progres ke localStorage dan database HANYA saat user aktif menekan counter / simak / paham
  useEffect(() => {
    isHydratedRef.current = false;
    dirtyPageRef.current = null;
  }, [page]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userSaveTick <= lastSyncedTickRef.current || dirtyPageRef.current !== page) return;

    // 1. Simpan ke localStorage instan saat user klik
    try {
      const existing = localStorage.getItem(`tikrar_progress_p${page}`);
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(
        `tikrar_progress_p${page}`,
        JSON.stringify({
          ...parsed,
          prepListenCount,
          prepTranslationDone,
          blocks,
          metaCounts,
        })
      );
    } catch {}

    // 2. Simpan ke database hanya dari aksi user
    let timerDb: NodeJS.Timeout | null = null;
    if (user?.id && !pageLockReason) {
      if (skipNextDbSyncRef.current) {
        skipNextDbSyncRef.current = false;
        lastSyncedTickRef.current = userSaveTick;
        dirtyPageRef.current = null;
      } else {
      const tickToSync = userSaveTick;
      timerDb = setTimeout(async () => {
        lastSyncedTickRef.current = tickToSync;
        if (dirtyPageRef.current === page) dirtyPageRef.current = null;
        const undoKeys = Array.from(pendingUndoKeysRef.current);
        pendingUndoKeysRef.current.clear();
        try {
          const res = await authFetch('/api/tikrar/progress', {
            method: 'POST',
            body: JSON.stringify({
              page_number: page,
              juz,
              prep_listen_count: prepListenCount,
              prep_translation_done: prepTranslationDone,
              blocks,
              meta_counts: metaCounts,
              total_progress: Math.round(totalProgress),
              undo_keys: undoKeys,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) undoKeys.forEach((k) => pendingUndoKeysRef.current.add(k));
          if (res.status === 403) {
            if (!lockToastShownRef.current) {
              lockToastShownRef.current = true;
              toast({
                variant: 'destructive',
                title: 'Halaman Terkunci',
                description: json.error?.message || 'Progres tidak tersimpan karena halaman masih terkunci.',
              });
            }
          } else if (res.ok) {
            const awarded = Number(json.data?.pointsAwarded) || 0;
            const act = json.data?.activity;
            if (act?.justMetTarget) {
              toast({
                title: 'Target Hari Ini Tercapai!',
                description: `Masya Allah, ${act.stepsToday}/${act.dailyQuota} langkah tuntas hari ini.${awarded > 0 ? ` +${awarded} Poin.` : ''}`,
              });
            } else if (awarded > 0) {
              toast({
                title: 'Aktif Hari Ini Tercatat',
                description: `+${awarded} Poin keaktifan. Lanjutkan sampai ${act?.dailyQuota || 1} langkah untuk mencapai target hari ini.`,
              });
            }
            if (act) {
              if (typeof act.clicks === 'number') setLiveTodayClicks(act.clicks);
              const stepsToday = Number(act.stepsToday) || 0;
              if (awarded > 0 || stepsToday !== lastStepsTodayRef.current) {
                lastStepsTodayRef.current = stepsToday;
                await Promise.all([refreshLogs(), refreshSchedules(), refreshUser()]);
                // Hanya panggil onDataChanged jika target harian baru saja tercapai untuk mencegah refresh berulang
                if (act.justMetTarget) {
                  onDataChanged?.();
                }
              }
            }
          }
        } catch (e) {
          undoKeys.forEach((k) => pendingUndoKeysRef.current.add(k));
          console.error('Gagal sync progres ke database:', e);
        }
      }, 400);
      }
    }

    return () => {
      if (timerDb) clearTimeout(timerDb);
    };
  }, [userSaveTick, prepListenCount, prepTranslationDone, blocks, metaCounts, page, juz, user?.id, totalProgress, pageLockReason]);

  const blockVerses = useMemo<Record<1 | 2 | 3 | 4, Verse[]>>(() => {
    return splitPageInto4Blocks(page, verses, customPageConfig);
  }, [page, verses, customPageConfig]);

  // Active halaqah & consistency metrics
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

  const targetDaysPerWeek = activeTarget?.activeDaysPerWeek || Number(userData?.tikrar_active_days_per_week) || 5;
  const durationMonths = activeTarget?.durationMonths || Number(userData?.tikrar_target_duration_months) || 2;
  const activePace = useMemo(
    () => TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === durationMonths) || TIKRAR_PACE_OPTIONS[0],
    [durationMonths]
  );
  const targetLabelPerDay = `Target: ${activePace.monthlyPagesLabel} (${activePace.dailyPortionLabel})`;

  const scheduledBlockSetOnPage = useMemo(() => {
    const s = new Set<number>();
    todayScheduledItems.forEach((item: any) => {
      if (Number(item.page_number) === page) {
        s.add(Number(item.block_number));
      }
    });
    return s;
  }, [todayScheduledItems, page]);

  const surahsOnPage = useMemo(() => {
    if (verses.length === 0) return [];
    return Array.from(new Set(verses.map((v) => parseInt(v.verse_key.split(':')[0], 10))));
  }, [verses]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getAudioUrlByVerseKey = async (verseKey: string, reciterId: number) => {
    try {
      const rec = RECITERS.find((r) => r.id === reciterId);
      if (rec?.provider === "mp3quran" && rec.serverUrl) {
        const surahId = parseInt(verseKey.split(':')[0], 10);
        return `${rec.serverUrl}${String(surahId).padStart(3, '0')}.mp3`;
      }

      if (rec?.provider === "everyayah") {
        const [surahStr, ayahStr] = verseKey.split(':');
        const surahPad = String(surahStr).padStart(3, '0');
        const ayahPad = String(ayahStr).padStart(3, '0');
        const baseUrl = rec.serverUrl || 'https://everyayah.com/data/Ayman_Sowaid_64kbps/';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        return `${cleanBase}${surahPad}${ayahPad}.mp3`;
      }

      const res = await fetch(
        `https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${verseKey}`
      );
      const data = await res.json();
      const audioUrl = data.audio_files[0]?.url;
      if (!audioUrl) return null;
      return audioUrl.startsWith('//')
        ? `https:${audioUrl}`
        : audioUrl.startsWith('http')
        ? audioUrl
        : `https://audio.qurancdn.com/${audioUrl}`;
    } catch {
      return null;
    }
  };

  const getAudioUrl = async (vIndex: number) => {
    if (vIndex < 0 || vIndex >= verses.length || !selectedReciterId) return null;
    return getAudioUrlByVerseKey(verses[vIndex].verse_key, selectedReciterId);
  };

  const stopAutoPlay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
    }
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
    setPlayingVerseIndex(null);
    setCurrentSurahPlaying(null);
    setActiveVerseKey(null);
    nextAudioUrlRef.current = null;
  };

  const playTilawahVerseAt = async (vIdx: number) => {
    if (!isAutoPlayingRef.current) return;
    if (vIdx >= verses.length) {
      stopAutoPlay();
      return;
    }
    const v = verses[vIdx];
    setPlayingVerseIndex(vIdx);
    setActiveVerseKey(v.verse_key);
    const url = await getAudioUrlByVerseKey(v.verse_key, blockReciterIdRef.current);
    if (!isAutoPlayingRef.current) return;
    if (!url) {
      stopAutoPlay();
      toast({ variant: 'destructive', title: 'Audio gagal dimuat', description: 'Coba lagi atau pilih qari lain.' });
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.ontimeupdate = null;
    audio.src = url;
    audio.onended = () => {
      if (isAutoPlayingRef.current) {
        playTilawahVerseAt(vIdx + 1);
      }
    };
    audio.play().catch(() => stopAutoPlay());
  };

  const startTilawahAudio = (startIdx = 0) => {
    stopBlockAudio(false);
    stopAutoPlay();
    if (verses.length === 0) return;
    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;
    playTilawahVerseAt(Math.max(0, Math.min(verses.length - 1, startIdx)));
  };

  // Qari MP3Quran hanya punya audio per surah; simak per blok memakai audio per ayat
  const blockReciterId = currentReciter.provider === 'mp3quran' ? 21203 : currentReciter.id;
  const blockReciterIdRef = useRef(blockReciterId);
  blockReciterIdRef.current = blockReciterId;
  const blockVersesRef = useRef(blockVerses);
  blockVersesRef.current = blockVerses;

  const stopBlockAudio = (triggerComprehensionPrompt = false) => {
    const prevBlock = blockPlaybackRef.current?.block;
    const wasPlayed = Boolean(blockPlaybackRef.current?.played);
    blockPlaybackRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    setBlockPlayback(null);
    if (triggerComprehensionPrompt && prevBlock && wasPlayed) {
      setSimakPromptedBlocks((prev) => ({ ...prev, [prevBlock]: true }));
    }
  };

  const handleBlockComprehension = (block: 1 | 2 | 3 | 4, understood: boolean) => {
    setBlocks((prev: any) => ({
      ...prev,
      [block]: {
        ...prev[block],
        understood,
      },
    }));
    markUserProgressDirty();
    if (understood) {
      setSimakPromptedBlocks((prev) => ({ ...prev, [block]: false }));
      playTikrarTap();
      setTimeout(() => {
        document.getElementById(`step-${block}.a`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else {
      setSimakPromptedBlocks((prev) => ({ ...prev, [block]: true }));
    }
  };

  const playBlockVerse = async (block: 1 | 2 | 3 | 4, vIdx: number, loop: number) => {
    if (blockPlaybackRef.current?.block !== block) return;
    const list = blockVersesRef.current[block] || [];
    if (vIdx >= list.length) {
      // Satu putaran blok selesai
      setBlocks((p: any) => ({
        ...p,
        [block]: {
          ...p[block],
          listen: { count: Math.min(PREP_LISTEN_THRESHOLD, (p[block]?.listen?.count || 0) + 1) },
        },
      }));
      markUserProgressDirty();
      const next = loop + 1;
      if (next < PREP_LISTEN_THRESHOLD) {
        playBlockVerse(block, 0, next);
      } else {
        stopBlockAudio(true);
        playTikrarDone();
        toast({
          title: `Simak TM ${block} (Blok ${BLOCK_LETTERS[block]}) Tuntas 5x`,
          description: 'Konfirmasi pemahaman makna blok ini terlebih dahulu sebelum mulai menghafal.',
        });
        setTimeout(() => {
          const targetEl =
            document.getElementById(`comprehension-${block}`) ||
            document.getElementById(`step-${block}.a`);
          targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
      return;
    }
    setBlockPlayback({ block, verseIdx: vIdx, loop });
    const url = await getAudioUrlByVerseKey(list[vIdx].verse_key, blockReciterIdRef.current);
    if (blockPlaybackRef.current?.block !== block) return;
    if (!url) {
      stopBlockAudio(false);
      toast({ variant: 'destructive', title: 'Audio gagal dimuat', description: 'Coba lagi atau pilih qari lain.' });
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.ontimeupdate = null;
    audio.src = url;
    audio.onended = () => playBlockVerse(block, vIdx + 1, loop);
    audio.play().catch(() => stopBlockAudio(false));
  };

  const startBlockAudio = (block: 1 | 2 | 3 | 4) => {
    stopBlockAudio(false);
    setSimakPromptedBlocks((prev) => ({ ...prev, [block]: false }));
    const listened = blocks[block]?.listen?.count || 0;
    blockPlaybackRef.current = { block, played: true };
    playBlockVerse(block, 0, listened >= PREP_LISTEN_THRESHOLD ? 0 : listened);
  };

  const handleRequestExam = async () => {
    if (!user || isRequestingExam) return;
    setIsRequestingExam(true);
    try {
      const res = await authFetch('/api/tikrar/submissions', {
        method: 'POST',
        body: JSON.stringify({
          page_number: page,
          blocks_range: 'blok_1_4',
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Gagal mendaftarkan antrean tasmi'.");
      }

      const d = json.data || {};
      if (Array.isArray(d.queue)) {
        setTasmiQueue(d.queue);
      } else {
        fetchTasmiQueue();
      }
      if (d.submission) {
        setServerMySubmissions((prev) => {
          const base = prev ?? userSubmissions ?? [];
          const filtered = base.filter((s: any) => s.id !== d.submission.id);
          return [d.submission, ...filtered];
        });
      }
      await refreshSubmissions();
      onDataChanged?.();

      const posLabel = d.queuePosition ? `Antrean #${d.queuePosition}` : 'Antrean Tasmi';
      if (d.alreadyPassed) {
        toast({
          title: "Sudah Lulus Tasmi'",
          description: `Halaman ${page} sudah tercatat lulus tasmi' oleh muallimah.`,
        });
      } else if (d.alreadyQueued) {
        toast({
          title: `Sudah Terdaftar (${posLabel})`,
          description: `Halaman ${page} sudah berada di daftar antrean setoran tasmi'.`,
        });
      } else if (d.whatsappSent) {
        toast({
          title: `Masuk ${posLabel} & WA Admin Terkirim!`,
          description: `Permohonan setoran Hal. ${page} otomatis masuk ke WhatsApp Admin HI AQLI dan daftar antrean.`,
        });
      } else {
        toast({
          title: `Masuk ${posLabel}`,
          description: 'Membuka WhatsApp Admin HI AQLI sebagai konfirmasi cadangan...',
        });
        if (d.adminWaUrl) {
          window.open(d.adminWaUrl, '_blank');
        }
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: "Gagal Mengajukan Tasmi'",
        description: err?.message || 'Silakan coba lagi.',
      });
    } finally {
      setIsRequestingExam(false);
    }
  };

  const isPrepTuntas = isBlockListenDone({ prep_listen_count: prepListenCount, blocks }, 1);
  const blockListenDone = (b: 1 | 2 | 3 | 4) => isBlockListenDone({ prep_listen_count: prepListenCount, blocks }, b);
  const isBlockSelfTuntas = (mid: 1 | 2 | 3 | 4) =>
    blockListenDone(mid) &&
    (blocks[mid]?.a?.count || 0) >= PASS_THRESHOLD &&
    (blocks[mid]?.b?.count || 0) >= PASS_THRESHOLD &&
    (blocks[mid]?.combined?.count || 0) >= PASS_THRESHOLD;
  const isTuntasTM = (mid: 1 | 2 | 3 | 4): boolean => {
    if (mid === 1) return isBlockSelfTuntas(1);
    if (mid === 2) return isTuntasTM(1) && isBlockSelfTuntas(2);
    if (mid === 3) return isMetaTuntas('1_2') && isBlockSelfTuntas(3);
    return isMetaTuntas('1_2_3') && isBlockSelfTuntas(4);
  };
  const isMetaTuntas = (key: string): boolean => {
    if ((metaCounts[key] || 0) < getMetaThreshold(key)) return false;
    if (key === '1_2') return isTuntasTM(2);
    if (key === '2_3') return isTuntasTM(3);
    if (key === '1_2_3') return isMetaTuntas('2_3');
    if (key === '3_4') return isTuntasTM(4);
    if (key === '2_3_4') return isMetaTuntas('3_4');
    if (key === '1_2_3_4') return isMetaTuntas('2_3_4');
    return true;
  };
  const isExamStageOpen = isMetaTuntas('1_2_3_4');
  const isPageInItqan = Boolean(
    isPriorMemorizedPage ||
      clearedPages.has(page) ||
      isSelectedPageCleared ||
      (summary?.stepsByPage?.[page] ?? 0) >= MEMORIZED_STEP_COUNT ||
      isExamStageOpen
  );
  const isOutOfTarget = Boolean(activeTarget && !isPageInActiveTarget);
  const isOutOfTargetMurajaah = isOutOfTarget && isPageInItqan;
  const isOutOfTargetUnmemorized = isOutOfTarget && !isPageInItqan;
  const isTilawahMode = isOutOfTargetUnmemorized && !showTrialCounter;
  const isTrialCounterMode = isOutOfTargetUnmemorized && showTrialCounter;
  const [globalShowVerses, setGlobalShowVerses] = useState(() => !isExamStageOpen);
  const [examRevealSeq, setExamRevealSeq] = useState(0);
  useEffect(() => {
    setGlobalShowVerses(!isExamStageOpen);
    setExamRevealSeq((s) => s + 1);
  }, [page, isExamStageOpen]);

  // Tombol -1: hanya untuk counter yang langkah berikutnya belum dimulai
  const canUndoKey = (key: string) =>
    !pageLockReason &&
    !clearedPages.has(page) &&
    canUndoStep(key, { prep_listen_count: prepListenCount, prep_translation_done: prepTranslationDone, blocks, meta_counts: metaCounts });
  const markUndo = (key: string) => {
    pendingUndoKeysRef.current.add(key);
    playTikrarUndo();
  };

  const [resetConfirm, setResetConfirm] = useState<{
    scope: 'juz' | 'page' | 'block' | 'counter';
    block?: 1 | 2 | 3 | 4;
    key?: string;
    title: string;
    description: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const executeReset = async () => {
    if (!resetConfirm || isResetting) return;
    const targetReset = resetConfirm;
    setIsResetting(true);
    try {
      if (user?.id) {
        const res = await authFetch('/api/tikrar/progress/reset', {
          method: 'POST',
          body: JSON.stringify({
            scope: targetReset.scope,
            page_number: page,
            juz,
            block: targetReset.block,
            key: targetReset.key,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error?.message || 'Gagal mereset counter.');
        }
      }

      stopBlockAudio(false);
      pendingUndoKeysRef.current.clear();
      skipNextDbSyncRef.current = true;
      dirtyPageRef.current = null;
      lastSyncedTickRef.current = userSaveTick;
      playTikrarUndo();

      if (targetReset.scope === 'juz') {
        const range = getJuzPageRange(juz);
        if (typeof window !== 'undefined') {
          for (let p = range.startPage; p <= range.endPage; p++) {
            localStorage.removeItem(`tikrar_progress_p${p}`);
          }
        }
        setPrepListenCount(0);
        setPrepTranslationDone(false);
        setBlocks(createEmptyTikrarBlocks());
        setMetaCounts(createEmptyTikrarMetaCounts());
        setSimakPromptedBlocks({});
      } else if (targetReset.scope === 'page') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`tikrar_progress_p${page}`);
        }
        setPrepListenCount(0);
        setPrepTranslationDone(false);
        setBlocks(createEmptyTikrarBlocks());
        setMetaCounts(createEmptyTikrarMetaCounts());
        setSimakPromptedBlocks({});
      } else if (targetReset.scope === 'block' && targetReset.block) {
        const b = targetReset.block;
        if (b === 1) setPrepListenCount(0);
        setSimakPromptedBlocks((prev) => ({ ...prev, [b]: false }));
        setBlocks((prev: any) => ({
          ...prev,
          [b]: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
        }));
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(`tikrar_progress_p${page}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (b === 1) parsed.prepListenCount = 0;
              if (!parsed.blocks) parsed.blocks = {};
              parsed.blocks[b] = { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } };
              localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify(parsed));
            }
          } catch {}
        }
      } else if (targetReset.scope === 'counter' && targetReset.key) {
        const k = targetReset.key === 'prep' ? '1.listen' : targetReset.key;
        if (k.startsWith('meta.')) {
          const mk = k.slice(5);
          setMetaCounts((prev) => ({ ...prev, [mk]: 0 }));
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(`tikrar_progress_p${page}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (!parsed.metaCounts) parsed.metaCounts = {};
                parsed.metaCounts[mk] = 0;
                localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify(parsed));
              }
            } catch {}
          }
        } else {
          const [bStr, part] = k.split('.');
          const b = Number(bStr) as 1 | 2 | 3 | 4;
          if (part === 'listen') {
            if (b === 1) setPrepListenCount(0);
            setSimakPromptedBlocks((prev) => ({ ...prev, [b]: false }));
            setBlocks((prev: any) => {
              const nextB = { ...prev[b], listen: { count: 0 } };
              delete nextB.understood;
              return { ...prev, [b]: nextB };
            });
            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem(`tikrar_progress_p${page}`);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (b === 1) parsed.prepListenCount = 0;
                  if (parsed.blocks?.[b]) {
                    parsed.blocks[b].listen = { count: 0 };
                    delete parsed.blocks[b].understood;
                  }
                  localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify(parsed));
                }
              } catch {}
            }
          } else if (part === 'a' || part === 'b' || part === 'combined') {
            setBlocks((prev: any) => ({
              ...prev,
              [b]: {
                ...prev[b],
                [part]: { count: 0 },
              },
            }));
            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem(`tikrar_progress_p${page}`);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (parsed.blocks?.[b]) {
                    parsed.blocks[b][part] = { count: 0 };
                  }
                  localStorage.setItem(`tikrar_progress_p${page}`, JSON.stringify(parsed));
                }
              } catch {}
            }
          }
        }
      }

      if (user?.id) {
        lastStepsTodayRef.current = -1;
        setLiveTodayClicks(null);
        await Promise.all([refreshLogs(), refreshSchedules(), refreshUser()]);
        onDataChanged?.();
      }

      toast({
        title: 'Counter Berhasil Direset',
        description:
          targetReset.scope === 'juz'
            ? `Semua counter pada Juz ${juz} (Hal. ${juzPageRange.startPage}–${juzPageRange.endPage}) telah dikembalikan ke 0.`
            : targetReset.scope === 'page'
            ? `Semua counter pada Halaman ${page} telah dikembalikan ke 0.`
            : targetReset.scope === 'block' && targetReset.block
            ? `Semua counter Blok ${BLOCK_LETTERS[targetReset.block]} (TM ${targetReset.block}) dikembalikan ke 0.`
            : 'Counter pilihan telah dikembalikan ke 0.',
      });
      setResetConfirm(null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Reset Counter',
        description: err?.message || 'Silakan coba lagi.',
      });
    } finally {
      setIsResetting(false);
    }
  };
  const adjustMeta = (key: string, delta: number) => {
    if (delta < 0) {
      if (!canUndoKey(`meta.${key}`)) return;
      markUndo(`meta.${key}`);
    }
    const currentCount = metaCounts[key] || 0;
    const nextCount = currentCount + delta;
    const threshold = getMetaThreshold(key);

    if (delta > 0) {
      if (currentCount < threshold && nextCount >= threshold) playTikrarDone();
      else playTikrarTap();
    }

    setMetaCounts((p) => {
      const minFloor =
        delta < 0
          ? getStepMinCount(`meta.${key}`, {
              prep_listen_count: prepListenCount,
              prep_translation_done: prepTranslationDone,
              blocks,
              meta_counts: p,
            })
          : 0;
      return {
        ...p,
        // Penambahan (+1 / +5) selalu naik dari posisi saat ini; minFloor hanya berlaku saat pengurangan (-1)
        [key]: Math.max(minFloor, (p[key] || 0) + delta),
      };
    });
    markUserProgressDirty();

    // Auto-advance / smooth scroll ke step berikutnya saat tuntas meta repetisi
    if (delta > 0 && currentCount < threshold && nextCount >= threshold) {
      const nextMetaMap: Record<string, string> = {
        '1_2': 'step-3.listen',
        '2_3': 'step-meta.1_2_3',
        '1_2_3': 'step-4.listen',
        '3_4': 'step-meta.2_3_4',
        '2_3_4': 'step-meta.1_2_3_4',
        '1_2_3_4': 'step-quiz',
      };
      const nextTargetId = nextMetaMap[key];
      if (nextTargetId) {
        setTimeout(() => {
          document.getElementById(nextTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
    }
  };

  // ---- Target hari ini per langkah: bintang mengikuti posisi sekarang (N langkah berikutnya),
  // tanggal dari jadwal per langkah sebagai keterangan ----
  const localProgress = {
    prep_listen_count: prepListenCount,
    prep_translation_done: prepTranslationDone,
    blocks,
    meta_counts: metaCounts,
  };
  const stepSchedule = useMemo(() => {
    if (!activeTarget) return null;
    return generateTikrarStepSchedule({
      juz: activeTarget.juz,
      startPage: activeTarget.startPage,
      endPage: activeTarget.endPage,
      startDate: activeTarget.startDate,
      durationMonths: activeTarget.durationMonths,
      activeDaysPerWeek: activeTarget.activeDaysPerWeek,
    });
  }, [activeTarget]);

  const stepDates = useMemo(() => {
    const map: Record<string, string> = {};
    if (!stepSchedule) return map;
    for (const d of stepSchedule.days) {
      for (const it of d.items) {
        if (it.page === page) map[TIKRAR_STEPS[it.stepIndex].key] = d.date;
      }
    }
    return map;
  }, [stepSchedule, page]);

  // Jadwal aktif untuk hari ini (atau jadwal hari aktif berikutnya jika hari ini libur/di luar jadwal)
  const todayScheduleDay = useMemo(() => {
    if (!stepSchedule) return null;
    const exact = stepSchedule.days.find((d) => d.date === todayKey);
    if (exact) return exact;
    return stepSchedule.days.find((d) => d.date > todayKey) || null;
  }, [stepSchedule, todayKey]);

  // Target yang dijadwalkan hari ini (pada blok/halaman hari ini) yang belum tuntas
  const todayTargets: { page: number; key: string; label: string }[] = useMemo(() => {
    if (!activeTarget || !summary || summary.today.targetMet || !todayScheduleDay) return [];
    const list: { page: number; key: string; label: string }[] = [];
    for (const it of todayScheduleDay.items) {
      const step = TIKRAR_STEPS[it.stepIndex];
      const isDone =
        it.page === page
          ? step.kind === 'quiz'
            ? clearedPages.has(it.page)
            : stepValue(step, localProgress) >= step.target
          : clearedPages.has(it.page) || (summary?.stepsByPage?.[it.page] || 0) > it.stepIndex;
      if (!isDone) {
        list.push({ page: it.page, key: step.key, label: step.shortLabel });
      }
    }
    return list;
  }, [activeTarget, summary, todayScheduleDay, page, localProgress, clearedPages]);

  // Langkah-langkah dari jadwal lampau yang belum selesai (terlewat)
  const overdueTargets: { page: number; key: string; label: string; date: string }[] = useMemo(() => {
    if (!activeTarget || !stepSchedule) return [];
    const list: { page: number; key: string; label: string; date: string }[] = [];
    for (const d of stepSchedule.days) {
      if (d.date >= todayKey) break;
      for (const it of d.items) {
        const step = TIKRAR_STEPS[it.stepIndex];
        const isDone =
          it.page === page
            ? step.kind === 'quiz'
              ? clearedPages.has(it.page)
              : stepValue(step, localProgress) >= step.target
            : clearedPages.has(it.page) || (summary?.stepsByPage?.[it.page] || 0) > it.stepIndex;
        if (!isDone) {
          list.push({ page: it.page, key: step.key, label: step.shortLabel, date: d.date });
        }
      }
    }
    return list;
  }, [activeTarget, stepSchedule, todayKey, page, localProgress, clearedPages, summary?.stepsByPage]);

  const starredKeysOnPage = useMemo(() => {
    return new Set(todayTargets.filter((t) => t.page === page).map((t) => t.key));
  }, [todayTargets, page]);

  // Progres klik hari ini: klik sudah dilakukan vs perkiraan total klik untuk target hari ini
  const todayClicks = liveTodayClicks ?? summary?.today.clicks ?? 0;
  const remainingTargetClicks = useMemo(() => {
    if (!activeTarget || !summary || summary.today.targetMet || todayTargets.length === 0) return 0;
    let clicks = 0;
    for (const t of todayTargets) {
      const step = TIKRAR_STEPS.find((s) => s.key === t.key);
      if (!step || step.kind === 'quiz') continue;
      if (t.page === page) {
        const current = Math.min(stepValue(step, localProgress), step.target);
        clicks += Math.max(0, step.target - current);
        const block = Number(step.key.split('.')[0]) as 1 | 2 | 3 | 4;
        if (
          step.kind === 'sub' &&
          step.key.endsWith('.a') &&
          block > 1 &&
          !isBlockListenDone(localProgress, block) &&
          !todayTargets.some((x) => x.page === t.page && x.key === `${block}.listen`)
        ) {
          clicks += Math.max(0, PREP_LISTEN_THRESHOLD - getBlockListenCount(localProgress, block));
        }
      } else {
        clicks += step.target;
      }
    }
    return clicks;
  }, [activeTarget, summary, todayTargets, page, localProgress]);

  const targetTotalClicks = todayClicks + remainingTargetClicks;
  const todayClicksPct = targetTotalClicks > 0 ? Math.min(100, Math.round((todayClicks / targetTotalClicks) * 100)) : 0;

  const completedStepsCount = countCompletedSteps(localProgress, clearedPages.has(page));
  const stepInfo = (key: string): StepInfo | null => {
    if (!activeTarget || !user) return null;
    const step = TIKRAR_STEPS.find((st) => st.key === key);
    if (!step) return null;
    const done = step.kind === 'quiz' ? clearedPages.has(page) : step.index < completedStepsCount;
    const stepDate = stepDates[key] || null;
    const isOverdue = !done && !!stepDate && stepDate < todayKey;
    return {
      key,
      isTarget: starredKeysOnPage.has(key) && !done && !isOverdue,
      isOverdue,
      done,
      date: stepDate,
      todayKey,
    };
  };

  const scrollToStep = (key: string) => {
    let el = document.getElementById(`step-${key}`);
    if (!el && key === '1.listen') el = document.getElementById('step-prep');
    if (!el && key === 'prep') el = document.getElementById('step-1.listen') || document.getElementById('step-prep');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Blocks that have reached TUNTAS (40x on A-1, A-2, and Gabung A)
  const tuntasBlockNumbers = useMemo(
    () => ([1, 2, 3, 4] as const).filter((id) => isTuntasTM(id)),
    [blocks, metaCounts, prepListenCount]
  );

  const newlyTuntasToday = useMemo(
    () => tuntasBlockNumbers.filter((b) => !completedBlocksToday.has(b)),
    [tuntasBlockNumbers, completedBlocksToday]
  );





  const handleSetAsActiveTarget = async () => {
    if (!user || isUpdatingTarget) return;
    setIsUpdatingTarget(true);
    try {
      const { error } = await db
        .from('users')
        .update({
          tikrar_current_page: page,
          tikrar_current_block: 1,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Target Aktif Diperbarui',
        description: `Target belajar Tikrar diatur mulai dari Halaman ${page}.`,
      });
      await refreshUser();
      onDataChanged?.();
    } catch (err: any) {
      toast({
        title: 'Gagal Mengubah Target',
        description: err?.message || 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingTarget(false);
    }
  };



  if (user && isUserDataLoading && !userData && !hasInitializedPage) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const activeExamStatusLabel = activeExam
    ? activeExam.passed
      ? `LULUS (Skor ${activeExam.score || 100})`
      : 'MENUNGGU JADWAL ADMIN'
    : null;

  const scheduledLettersText =
    isOutOfTarget
      ? isPageInItqan
        ? `Mode Murajaah (Target Aktif: Juz ${activeTarget!.juz})`
        : showTrialCounter
        ? `Mode Uji Coba Counter (Target Aktif: Juz ${activeTarget!.juz})`
        : `Mode Tilawah (Target Aktif: Juz ${activeTarget!.juz})`
      : scheduledBlockSetOnPage.size > 0
      ? `Target Jadwal: Blok ${Array.from(scheduledBlockSetOnPage)
          .sort((a, b) => a - b)
          .map((b) => BLOCK_LETTERS[b])
          .join(' & ')}`
      : targetLabelPerDay;

  return (
    <div className="space-y-6 pb-32">
      {/* Header Program, Halaqah Live Zoom & Progres Halaman */}
      <Card className="border-none bg-primary text-white shadow-xl overflow-hidden relative border-b-4 border-[#D4AF37]">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <CalendarDays className="w-40 h-40 text-[#D4AF37]" />
        </div>
        <CardContent className="p-5 sm:p-6 relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Badge className="bg-[#D4AF37] text-black border-none text-[10px] font-black uppercase tracking-widest">
                  HI AQLI Tikrar System
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/30 text-white bg-white/10 text-[10px] font-bold"
                >
                  Juz {juz} • {scheduledLettersText}
                </Badge>
                {isSelectedPageCleared && (
                  <Badge className="bg-amber-400 text-black hover:bg-amber-400 text-[10px] font-black">
                    ★ Halaman Lulus Setoran
                  </Badge>
                )}
              </div>

              <div className="flex flex-col">
                <h3 className="text-2xl sm:text-3xl font-black font-headline">
                  Halaman {page} • QS. {getSurahNameForPage(page)}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85 mt-1.5">
                  <span>
                    Halaqah:{' '}
                    <strong className="text-white">
                      {activeHalaqah ? activeHalaqah.title : 'Belum memilih sesi Live Zoom'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Musyrifah:{' '}
                    <strong className="text-white">
                      {activeHalaqah?.musyrifah || 'Tim Musyrifah HI AQLI'}
                    </strong>
                  </span>
                  {activeHalaqah?.zoom_link && (
                    <a
                      href={activeHalaqah.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#D4AF37] font-black hover:underline"
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
                      className="inline-flex items-center gap-1 text-emerald-300 font-black hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Grup WA
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full md:w-auto md:flex md:items-center self-start md:self-center">
              <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-3.5 py-2.5 rounded-2xl border border-white/15 flex flex-col justify-center min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/75 truncate">
                  Target Hari Ini
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-black text-[#D4AF37] truncate">
                    {summary?.today.stepsToday || 0}/{summary?.today.dailyQuota || activeTarget?.dailyQuota || 1} Lgkh
                    {summary?.today.targetMet ? ' ✓' : ''}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-extrabold text-orange-300 shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-300" />
                    {summary?.streak ?? consistency.streak}h
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2.5 rounded-2xl border border-white/15 flex flex-col justify-center items-end text-right min-w-0">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/75 truncate">
                  <Clock className="w-3 h-3 text-[#D4AF37] shrink-0" /> Progres Halaman
                </div>
                <div className="text-base sm:text-lg font-black truncate">
                  {Math.round(totalProgress)}%{' '}
                  <span className="text-[11px] sm:text-xs font-medium opacity-75">
                    ({tuntasBlockNumbers.length}/4 Blok)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Progress value={totalProgress} className="h-1.5 bg-white/15 [&>div]:bg-[#D4AF37]" />
        </CardContent>
      </Card>

      {/* Dialog Pilih Qari Murattal */}
      <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[85dvh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-2 shrink-0 border-b border-stone-100">
            <DialogTitle className="text-primary font-black">Pilih Qari Al-Qur&apos;an</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih qari untuk audio simak per blok.
            </DialogDescription>
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-700">Efek Bunyi Klik Counter</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = !soundOn;
                  setTikrarSoundEnabled(next);
                  setSoundOn(next);
                  if (next) playTikrarTap();
                }}
                className={cn(
                  "h-7 px-2.5 text-[11px] font-bold rounded-lg",
                  soundOn ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800 hover:text-white" : "text-stone-600"
                )}
              >
                {soundOn ? <Volume2 className="w-3.5 h-3.5 mr-1" /> : <VolumeX className="w-3.5 h-3.5 mr-1" />}
                Bunyi {soundOn ? "On" : "Off"}
              </Button>
            </div>
          </DialogHeader>
          <div className="grid gap-2 p-4 overflow-y-auto flex-1">
            {RECITERS.filter((r) => r.provider !== 'mp3quran').map((r) => {
              const isSelected = selectedReciterId === r.id;
              return (
                <Button
                  key={r.id}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => {
                    stopBlockAudio();
                    setSelectedReciterId(r.id);
                    localStorage.setItem('aqli_reciter_id', r.id.toString());
                    setShowReciterDialog(false);
                  }}
                  className={cn(
                    'justify-between items-center p-3 h-auto font-bold rounded-2xl text-left transition-all',
                    isSelected
                      ? 'bg-primary text-white hover:bg-[#6b0000] hover:text-white border-primary'
                      : 'border-muted-foreground/20 hover:border-primary/30 hover:bg-primary/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                        isSelected
                          ? 'bg-white text-primary'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Mic2 className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-bold leading-tight text-sm">{r.name}</div>
                      {r.provider === 'everyayah' ? (
                        <div
                          className={cn(
                            'text-[10px] font-normal mt-0.5',
                            isSelected ? 'text-white/80' : 'text-emerald-700'
                          )}
                        >
                          {r.description || "Audio Per Ayat (EveryAyah • Sinkron Otomatis)"}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'text-[10px] font-normal mt-0.5',
                            isSelected ? 'text-white/80' : 'text-muted-foreground'
                          )}
                        >
                          Audio Per Ayat (Quran.com)
                        </div>
                      )}
                    </div>
                  </div>
                  {r.provider === 'everyayah' && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] uppercase px-2 py-0.5 font-bold',
                        isSelected ? 'border-white/40 text-white' : 'border-emerald-500/50 text-emerald-800'
                      )}
                    >
                      Sinkron
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bar Navigasi Juz, Halaman & Aksi Cepat */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 sm:gap-3 bg-white p-2.5 sm:p-4 rounded-2xl border shadow-sm sm:sticky sm:top-20 z-20 backdrop-blur-md border-primary/10">
        {/* Baris 1: Kontrol Halaman Terkunci 1 Baris (Juz, <, Hal, >) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto flex-nowrap min-w-0">
          <select
            aria-label="Pilih Juz"
            value={juz}
            disabled={loading}
            onChange={(e) => {
              const j = Number(e.target.value);
              setJuz(j);
              if (activeTarget && j === activeTarget.juz) {
                setPage(activeTarget.unlockedPage);
              } else {
                setPage(JUZ_PAGES[j - 1] || 1);
              }
            }}
            className="h-10 rounded-xl border-2 border-primary/20 bg-white px-2.5 text-xs sm:text-sm font-black text-primary shrink-0 w-[92px] sm:w-auto"
          >
            {JUZ_PAGES.map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Juz {i + 1}{activeTarget && activeTarget.juz === i + 1 ? ' ★' : ''}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(juzPageRange.startPage, p - 1))}
            disabled={loading || page <= juzPageRange.startPage}
            className="rounded-xl h-10 w-9 sm:w-10 shrink-0 border-primary/20 hover:bg-primary/5"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </Button>

          <select
            aria-label="Pilih Halaman Mushaf"
            value={page}
            disabled={loading}
            onChange={(e) => setPage(Number(e.target.value))}
            title={page === recommendedPage ? `Hal. ${page} (Halaman Aktif)` : `Hal. ${page}`}
            className="h-10 rounded-xl border-2 border-primary/20 bg-stone-50 px-2.5 text-xs sm:text-sm font-black text-primary flex-1 min-w-0 truncate"
          >
            {Array.from({ length: juzPageRange.endPage - juzPageRange.startPage + 1 }, (_, idx) => {
              const pNum = juzPageRange.startPage + idx;
              const pCleared = clearedPages.has(pNum);
              const pMemorized = (summary?.stepsByPage?.[pNum] ?? 0) >= MEMORIZED_STEP_COUNT;
              const isPriorPage =
                priorMemorizedSet.has(pNum) ||
                (Boolean(activeTarget) && juz === activeTarget!.juz && pNum < activeTarget!.startPage);
              const pInTarget = Boolean(
                activeTarget &&
                  juz === activeTarget.juz &&
                  pNum >= activeTarget.startPage &&
                  pNum <= activeTarget.endPage
              );
              const pLocked =
                pInTarget &&
                !pCleared &&
                !isPriorPage &&
                pNum > (activeTarget?.unlockedPage || 0);
              const statusSuffix =
                pNum === recommendedPage
                  ? ' • ★'
                  : pCleared
                  ? ' • ✓'
                  : isPriorPage || pMemorized
                  ? ' • ✓'
                  : pLocked
                  ? ' • 🔒'
                  : '';
              return (
                <option key={pNum} value={pNum}>
                  Hal. {pNum}{statusSuffix}
                </option>
              );
            })}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(juzPageRange.endPage, p + 1))}
            disabled={loading || page >= juzPageRange.endPage}
            className="rounded-xl h-10 w-9 sm:w-10 shrink-0 border-primary/20 hover:bg-primary/5"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
        </div>

        {/* Baris 2: Aksi Cepat (1 Baris Sejajar: Tampilkan Ayat, Tajwid, Bunyi) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 min-w-0">
          {activeTarget && (juz !== activeTarget.juz || page !== recommendedPage) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (activeTarget) setJuz(activeTarget.juz);
                setPage(recommendedPage);
              }}
              className="h-8 px-2 text-[11px] font-black text-primary hover:bg-primary/10 truncate self-start sm:self-center"
            >
              {juz !== activeTarget.juz ? `Ke Target (Juz ${activeTarget.juz} Hal. ${recommendedPage})` : `Ke Hal. ${recommendedPage}`} →
            </Button>
          )}

          <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 w-full sm:w-auto flex-nowrap">
            {!isTilawahMode && (
              <Button
                type="button"
                variant={globalShowVerses ? 'outline' : 'default'}
                size="sm"
                onClick={() => {
                  setGlobalShowVerses((v) => !v);
                  setExamRevealSeq((s) => s + 1);
                }}
                className={cn(
                  'h-9 flex-1 sm:flex-initial px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap',
                  globalShowVerses
                    ? 'border-primary/20 text-primary hover:bg-primary/5'
                    : 'bg-stone-900 hover:bg-stone-800 text-white border-stone-900'
                )}
                aria-label={globalShowVerses ? 'Sembunyikan teks ayat' : 'Tampilkan teks ayat'}
                title={globalShowVerses ? 'Sembunyikan teks ayat saat counter' : 'Tampilkan kembali teks ayat'}
              >
                {globalShowVerses ? <Eye className="w-3.5 h-3.5 mr-1 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 mr-1 shrink-0" />}
                <span>Tampilkan Ayat</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleTajwid}
              className={cn(
                'h-9 flex-1 sm:flex-initial px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap',
                showTajwid
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white hover:text-white border-emerald-700'
                  : 'border-primary/20 text-primary'
              )}
              title={showTajwid ? 'Nonaktifkan warna tajwid' : 'Aktifkan warna tajwid'}
            >
              <Palette className="w-3.5 h-3.5 mr-1 shrink-0" />
              <span>Tajwid {showTajwid ? 'On' : 'Off'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowReciterDialog(true)}
              className="h-9 flex-1 sm:flex-initial px-2 sm:px-3 text-[11px] sm:text-xs font-bold border-primary/20 text-primary rounded-xl whitespace-nowrap shrink-0"
              title={`Pilih Qari Murattal (${RECITERS.find((r) => r.id === selectedReciterId)?.name || "Qari"})`}
            >
              <Mic2 className="w-3.5 h-3.5 mr-1 shrink-0 text-primary" />
              <span>Pilih Qari</span>
              <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-70" />
            </Button>
            {onOpenScheduleTab && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenScheduleTab}
                className="h-9 text-xs font-bold border-primary/20 text-primary rounded-xl hidden sm:inline-flex whitespace-nowrap"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Atur Target
              </Button>
            )}

          </div>
        </div>
      </div>

            {(summary?.pendingQuizPages?.length || 0) > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3 sm:p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs font-black text-amber-950">
                {summary!.pendingQuizPages.length} halaman sudah dihafal tetapi belum lulus ujian halaman (60 soal):
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary!.pendingQuizPages.slice(0, 12).map((pg) => (
              <Link
                key={pg.page}
                href={`/tikrar/ujian?page=${pg.page}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-300 text-[11px] font-black text-primary hover:bg-primary hover:text-white transition-colors"
              >
                Hal. {pg.page}
                {pg.lastScore !== null && pg.lastScore !== undefined ? ` (${pg.lastScore}%)` : ''}
              </Link>
            ))}
            {summary!.pendingQuizPages.length > 12 && (
              <span className="text-[11px] font-bold text-amber-900 px-2 py-1">
                +{summary!.pendingQuizPages.length - 12} halaman lainnya di tab Rekap &amp; Laporan
              </span>
            )}
          </div>
        </div>
      )}

      {isOutOfTargetMurajaah && activeTarget && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-950 leading-relaxed">
              {juz !== activeTarget.juz
                ? `Mode Murajaah • Juz ${juz} Hal. ${page} sudah masuk Tab Itqan (di luar Target Aktif Juz ${activeTarget.juz} Hal. ${activeTarget.startPage}–${activeTarget.endPage}). Hitungan murajaah tetap tersimpan, sedangkan keaktifan & poin harian hanya mencatat progres Target dan Jadwal aktif.`
                : `Mode Murajaah • Halaman ${page} sudah masuk Tab Itqan (di luar rentang Target Aktif Juz ${activeTarget.juz} Hal. ${activeTarget.startPage}–${activeTarget.endPage}). Boleh dimurajaah kapan saja; keaktifan & poin tetap hanya mencatat target aktif.`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigateToPage(activeTarget.unlockedPage)}
            className="border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-bold text-xs h-8 px-3 rounded-xl shrink-0"
          >
            Ke Target (Juz {activeTarget.juz} Hal. {activeTarget.unlockedPage}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {isTilawahMode && activeTarget && (
        <div className="bg-sky-50/95 border border-sky-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-black text-sky-950 leading-relaxed">
                Mode Tilawah • Juz {juz} Hal. {page} belum masuk Tab Itqan (di luar Target Aktif Juz {activeTarget.juz} Hal. {activeTarget.startPage}–{activeTarget.endPage}).
              </p>
              <p className="text-[11px] font-medium text-sky-900/85 leading-relaxed">
                Mushaf dibuka untuk bacaan, terjemah &amp; simak audio tanpa memengaruhi poin Target Aktif. Ingin mencoba metode 4 Blok Tikrar di halaman ini?
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                stopAutoPlay();
                setShowTrialCounter(true);
              }}
              className="border-sky-300 bg-white text-sky-900 hover:bg-sky-100 font-black text-xs h-8 px-3 rounded-xl shrink-0"
            >
              {totalProgress > 0
                ? `Lanjutkan Counter Uji Coba (${Math.round(totalProgress)}%)`
                : 'Buka Counter Uji Coba'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigateToPage(activeTarget.unlockedPage)}
              className="border-primary/25 bg-white text-primary hover:bg-primary/10 font-bold text-xs h-8 px-3 rounded-xl shrink-0"
            >
              Ke Target (Juz {activeTarget.juz} Hal. {activeTarget.unlockedPage}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {isTrialCounterMode && activeTarget && (
        <div className="bg-amber-50/95 border border-amber-300 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-black text-amber-950 leading-relaxed">
                Mode Uji Coba Counter • Juz {juz} Hal. {page} belum masuk Tab Itqan (di luar Target Aktif Juz {activeTarget.juz} Hal. {activeTarget.startPage}–{activeTarget.endPage}).
              </p>
              <p className="text-[11px] font-medium text-amber-900/85 leading-relaxed">
                Hitungan counter tetap tersimpan (dan masuk Tab Itqan bila dituntaskan sampai Gabung A–D), sedangkan keaktifan &amp; poin harian tetap hanya mencatat Target dan Jadwal aktif.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                stopBlockAudio(false);
                setShowTrialCounter(false);
              }}
              className="border-amber-400 bg-white text-amber-950 hover:bg-amber-100 font-black text-xs h-8 px-3 rounded-xl shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1" /> Kembali ke Mode Tilawah
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigateToPage(activeTarget.unlockedPage)}
              className="border-primary/25 bg-white text-primary hover:bg-primary/10 font-bold text-xs h-8 px-3 rounded-xl shrink-0"
            >
              Ke Target (Juz {activeTarget.juz} Hal. {activeTarget.unlockedPage}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {pageLockReason && (
        <div className="bg-stone-100 border-2 border-stone-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-stone-600 shrink-0" />
            <p className="text-xs font-bold text-stone-800">{pageLockReason}</p>
          </div>
          {activeTarget ? (
            <Button
              type="button"
              size="sm"
              onClick={() => navigateToPage(activeTarget.unlockedPage)}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
            >
              Ke Halaman {activeTarget.unlockedPage}
            </Button>
          ) : (
            onOpenScheduleTab && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenScheduleTab}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
              >
                Isi Target &amp; Jadwal
              </Button>
            )
          )}
        </div>
      )}

      {activeTarget && user && summary && (
        <div
          className={cn(
            'rounded-2xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
            summary.today.targetMet ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-[#D4AF37]'
          )}
        >
          <div className="space-y-1.5 min-w-0">
            {summary.today.targetMet ? (
              <p className="text-sm font-black text-emerald-800">
                ✓ Target hari ini tercapai ({summary.today.stepsToday}/{summary.today.dailyQuota} langkah • {todayClicks} klik)
              </p>
            ) : todayTargets.length === 0 ? (
              <p className="text-sm font-black text-stone-800">Semua langkah target sudah tuntas. Masya Allah!</p>
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" /> Target hari ini ({activePace.dailyPortionLabel}) •{' '}
                  {summary.today.stepsToday}/{summary.today.dailyQuota} langkah tuntas
                </p>
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-stone-700">
                    <span>
                      Hari ini: <span className="font-black text-primary">{todayClicks}/{targetTotalClicks} klik</span>
                    </span>
                    {remainingTargetClicks > 0 && (
                      <span className="text-stone-500">±{remainingTargetClicks} klik lagi untuk hijau pekat</span>
                    )}
                  </div>
                  <div className="h-2 w-full rounded-full bg-white border border-[#D4AF37]/40 overflow-hidden">
                    <div className="h-full rounded-full bg-[#4ade80] transition-all" style={{ width: `${todayClicksPct}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {todayTargets.map((t) => (
                    <button
                      key={`${t.page}-${t.key}`}
                      type="button"
                      onClick={() => (t.page === page ? scrollToStep(t.key) : navigateToPage(t.page))}
                      className="px-2.5 py-1 rounded-full bg-white border border-[#D4AF37] text-[11px] font-black text-stone-800 hover:bg-[#D4AF37]/20"
                    >
                      Hal. {t.page} • {t.label}
                    </button>
                  ))}
                </div>
                {overdueTargets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-rose-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold">
                      {overdueTargets.length} langkah terlewat dari jadwal sebelumnya:
                    </span>
                    {overdueTargets.slice(0, 3).map((ot) => (
                      <button
                        key={`overdue-${ot.page}-${ot.key}`}
                        type="button"
                        onClick={() => (ot.page === page ? scrollToStep(ot.key) : navigateToPage(ot.page))}
                        className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-[10px] font-black hover:bg-rose-200 text-rose-800"
                      >
                        Hal. {ot.page} • {ot.label}
                      </button>
                    ))}
                    {overdueTargets.length > 3 && (
                      <span className="text-[10px] text-rose-600 font-bold">+{overdueTargets.length - 3} lainnya</span>
                    )}
                  </div>
                )}
              </>
            )}
            {!isActiveStudyDay(todayKey, activeTarget.activeDaysPerWeek) && !summary.today.targetMet && (
              <p className="text-[11px] text-stone-600">Hari ini bukan hari aktif jadwal Ukhti, boleh mencicil langkah berikutnya.</p>
            )}
          </div>
          {todayTargets.length > 0 && !summary.today.targetMet && (
            <Button
              type="button"
              size="sm"
              onClick={() => (todayTargets[0].page === page ? scrollToStep(todayTargets[0].key) : navigateToPage(todayTargets[0].page))}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs h-10 px-4 rounded-xl shrink-0"
            >
              {todayTargets[0].page === page ? 'Ke Counter Target ↓' : `Buka Hal. ${todayTargets[0].page}`}
            </Button>
          )}
        </div>
      )}

      <div className={cn(pageLockReason && 'pointer-events-none opacity-50 select-none')} aria-disabled={Boolean(pageLockReason)}>
      <TooltipProvider delayDuration={0}>
        {isTilawahMode ? (
          <div className="mt-6">
            <TilawahMushafCard
              page={page}
              juz={juz}
              showTajwid={showTajwid}
              onToggleTajwid={toggleTajwid}
              surahName={getSurahNameForPage(page)}
              verses={verses}
              loading={loading}
              fontSize={fontSize}
              isPlaying={isAutoPlaying}
              playingVerseKey={activeVerseKey}
              onTogglePlayAll={() => (isAutoPlaying ? stopAutoPlay() : startTilawahAudio(0))}
              onPlayFromVerse={(idx: number) => startTilawahAudio(idx)}
              totalProgress={totalProgress}
              onOpenTrialCounter={() => {
                stopAutoPlay();
                setShowTrialCounter(true);
              }}
            />
          </div>
        ) : (
        /* Alur Kunci Berurutan: Blok A..D & Sub-Repetisi Gabungan (Opsi B) */
        <div className="flex flex-col gap-8 mt-8">
          <div className="bg-primary text-white p-4 rounded-2xl border-2 border-[#D4AF37] flex items-start gap-3 shadow-lg">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#D4AF37]" />
            <div className="text-[11px] leading-relaxed font-bold">
              <span className="uppercase tracking-wider text-[#D4AF37] block mb-0.5">
                Metode Itqan HI Tikrar (Otomatis Tersimpan)
              </span>
              Setiap blok <strong>disimak 5x dulu</strong> (audio per blok + arti per kata &amp; kalimat), lalu dibagi menjadi 2 bagian teks berwarna:{' '}
              <strong>Bagian 1 (Maroon) min. 40x</strong> → <strong>Bagian 2 (Hitam) min. 40x</strong>{' '}
              → <strong>Gabung Blok min. 40x</strong>, lalu dilanjutkan{' '}
              <strong>Sub-Repetisi Gabungan Antar Blok (2 blok min. 10x, 3–4 blok min. 5x)</strong> (seluruhnya boleh lebih sampai berapa saja) secara berurutan. Setiap klik
              hitungan repetisi <strong>otomatis tersimpan ke sistem</strong> &amp; langsung
              memperbarui keaktifan harian serta heatmap grup!
            </div>
          </div>

          {(isExamStageOpen || !globalShowVerses) && (
            <div className="bg-amber-50/90 border-2 border-[#D4AF37] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {globalShowVerses ? (
                  <Eye className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <EyeOff className="w-5 h-5 text-primary shrink-0" />
                )}
                <div>
                  <p className="text-xs font-black text-primary">
                    {isExamStageOpen
                      ? globalShowVerses
                        ? 'Mode Murajaah: Teks ayat pada blok TM sedang ditampilkan'
                        : 'Mode Siap Ujian: Teks ayat pada blok TM disembunyikan'
                      : 'Mode Uji Hafalan: Teks ayat disembunyikan saat counter'}
                  </p>
                  <p className="text-[11px] text-stone-700 font-medium">
                    {isExamStageOpen
                      ? 'Tahap Ujian Halaman sudah terbuka. Tampilkan atau sembunyikan teks ayat kapan saja.'
                      : 'Lanjutkan hitungan counter dari hafalan, atau tampilkan kembali ayat kapan saja jika perlu mengintip.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setGlobalShowVerses((v) => !v);
                  setExamRevealSeq((s) => s + 1);
                }}
                className="h-9 px-3.5 rounded-xl bg-white hover:bg-primary hover:text-white border-primary/30 text-primary text-xs font-black shrink-0"
              >
                {globalShowVerses ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" /> Sembunyikan Semua Ayat
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Tampilkan Semua Ayat
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <MaqtaCard
              id={1}
              canUndo={(part: string) => canUndoKey('1.' + part)}
              getMinCount={(part: string) => getStepMinCount('1.' + part, localProgress)}
              stepInfoFor={(part: string) => stepInfo('1.' + part)}
              listenCount={getBlockListenCount({ blocks }, 1)}
              listenDone={blockListenDone(1)}
              listenStepInfo={stepInfo('prep')}
              playback={blockPlayback?.block === 1 ? blockPlayback : null}
              onPlayAudio={() => startBlockAudio(1)}
              onStopAudio={() => stopBlockAudio(true)}
              simakPrompted={Boolean(simakPromptedBlocks[1])}
              onAnswerComprehension={(understood: boolean) => handleBlockComprehension(1, understood)}
              salutation={userData?.salutation || 'Ukhti'}
              onUndo={(part: string) => markUndo('1.' + part)}
              page={page}
              state={blocks[1]}
              verses={blockVerses[1]}
              rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[1], customPageConfig?.[1])}
              customConfig={customPageConfig}
              allPageVerses={verses}
              isSavedInDb={completedBlocksAllTime.has(1)}
              isScheduledToday={scheduledBlockSetOnPage.has(1)}
              isLocked={false}
              onIncrement={updateBlocksByUser}
              fontSize={fontSize}
              letter="A"
              isExamStageOpen={isExamStageOpen}
              globalShowVerses={globalShowVerses}
              examRevealSeq={examRevealSeq}
              showTajwid={showTajwid}
              onToggleTajwid={toggleTajwid}
              canReset={!pageLockReason}
              onResetBlock={() =>
                setResetConfirm({
                  scope: 'block',
                  block: 1,
                  title: `Reset Counter Blok A (TM 1) Hal. ${page}?`,
                  description: 'Seluruh hitungan Simak TM 1, TM 1-1, TM 1-2, dan Gabung TM 1 pada halaman ini akan dikembalikan ke 0.',
                })
              }
              onResetCounter={(key: string, label: string) =>
                setResetConfirm({
                  scope: 'counter',
                  key,
                  title: `Reset Counter ${label}?`,
                  description: `Hitungan ${label} pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
            />
            <MaqtaCard
              id={2}
              canUndo={(part: string) => canUndoKey('2.' + part)}
              getMinCount={(part: string) => getStepMinCount('2.' + part, localProgress)}
              stepInfoFor={(part: string) => stepInfo('2.' + part)}
              listenCount={getBlockListenCount({ blocks }, 2)}
              listenDone={blockListenDone(2)}
              listenStepInfo={stepInfo('2.listen')}
              playback={blockPlayback?.block === 2 ? blockPlayback : null}
              onPlayAudio={() => startBlockAudio(2)}
              onStopAudio={() => stopBlockAudio(true)}
              simakPrompted={Boolean(simakPromptedBlocks[2])}
              onAnswerComprehension={(understood: boolean) => handleBlockComprehension(2, understood)}
              salutation={userData?.salutation || 'Ukhti'}
              onUndo={(part: string) => markUndo('2.' + part)}
              page={page}
              state={blocks[2]}
              verses={blockVerses[2]}
              rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[2], customPageConfig?.[2])}
              customConfig={customPageConfig}
              allPageVerses={verses}
              isSavedInDb={completedBlocksAllTime.has(2)}
              isScheduledToday={scheduledBlockSetOnPage.has(2)}
              isLocked={!isTuntasTM(1)}
              onIncrement={updateBlocksByUser}
              fontSize={fontSize}
              letter="B"
              isExamStageOpen={isExamStageOpen}
              globalShowVerses={globalShowVerses}
              examRevealSeq={examRevealSeq}
              showTajwid={showTajwid}
              onToggleTajwid={toggleTajwid}
              canReset={!pageLockReason}
              onResetBlock={() =>
                setResetConfirm({
                  scope: 'block',
                  block: 2,
                  title: `Reset Counter Blok B (TM 2) Hal. ${page}?`,
                  description: 'Seluruh hitungan Simak TM 2, TM 2-1, TM 2-2, dan Gabung TM 2 pada halaman ini akan dikembalikan ke 0.',
                })
              }
              onResetCounter={(key: string, label: string) =>
                setResetConfirm({
                  scope: 'counter',
                  key,
                  title: `Reset Counter ${label}?`,
                  description: `Hitungan ${label} pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
            />
          </div>

          <MetaStep
            stepKey="1_2"
            label="GABUNG TM 1 & TM 2 (BLOK A & B) • SYARAT SETORAN 1/2 HALAMAN PERTAMA"
            count={metaCounts['1_2']}
            threshold={10}
            isLocked={!isTuntasTM(1) || !isTuntasTM(2)}
            onIncrement={(delta = 1) => adjustMeta('1_2', delta)}
            canUndo={canUndoKey('meta.1_2')}
            stepInfo={stepInfo('meta.1_2')}
            canReset={!pageLockReason}
            onReset={() =>
              setResetConfirm({
                scope: 'counter',
                key: 'meta.1_2',
                title: 'Reset Counter Gabung TM 1 & 2?',
                description: `Hitungan Gabung TM 1 & TM 2 (Blok A & B) pada Halaman ${page} akan dikembalikan ke 0.`,
              })
            }
          />

          <MaqtaCard
            id={3}
              canUndo={(part: string) => canUndoKey('3.' + part)}
              getMinCount={(part: string) => getStepMinCount('3.' + part, localProgress)}
              stepInfoFor={(part: string) => stepInfo('3.' + part)}
              listenCount={getBlockListenCount({ blocks }, 3)}
              listenDone={blockListenDone(3)}
              listenStepInfo={stepInfo('3.listen')}
              playback={blockPlayback?.block === 3 ? blockPlayback : null}
              onPlayAudio={() => startBlockAudio(3)}
              onStopAudio={() => stopBlockAudio(true)}
              simakPrompted={Boolean(simakPromptedBlocks[3])}
              onAnswerComprehension={(understood: boolean) => handleBlockComprehension(3, understood)}
              salutation={userData?.salutation || 'Ukhti'}
              onUndo={(part: string) => markUndo('3.' + part)}
            page={page}
            state={blocks[3]}
            verses={blockVerses[3]}
            rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[3], customPageConfig?.[3])}
            customConfig={customPageConfig}
            allPageVerses={verses}
            isSavedInDb={completedBlocksAllTime.has(3)}
            isScheduledToday={scheduledBlockSetOnPage.has(3)}
            isLocked={!isMetaTuntas('1_2')}
            onIncrement={updateBlocksByUser}
            fontSize={fontSize}
            letter="C"
            isExamStageOpen={isExamStageOpen}
            globalShowVerses={globalShowVerses}
            examRevealSeq={examRevealSeq}
            showTajwid={showTajwid}
            onToggleTajwid={toggleTajwid}
            canReset={!pageLockReason}
            onResetBlock={() =>
              setResetConfirm({
                scope: 'block',
                block: 3,
                title: `Reset Counter Blok C (TM 3) Hal. ${page}?`,
                description: 'Seluruh hitungan Simak TM 3, TM 3-1, TM 3-2, dan Gabung TM 3 pada halaman ini akan dikembalikan ke 0.',
              })
            }
            onResetCounter={(key: string, label: string) =>
              setResetConfirm({
                scope: 'counter',
                key,
                title: `Reset Counter ${label}?`,
                description: `Hitungan ${label} pada Halaman ${page} akan dikembalikan ke 0.`,
              })
            }
          />

          <div className="space-y-4">
            <MetaStep
              stepKey="2_3"
              label="GABUNG TM 2 & TM 3 (BLOK B & C)"
              count={metaCounts['2_3']}
              threshold={10}
              isLocked={!isTuntasTM(3)}
              onIncrement={(delta = 1) => adjustMeta('2_3', delta)}
              canUndo={canUndoKey('meta.2_3')}
              stepInfo={stepInfo('meta.2_3')}
              canReset={!pageLockReason}
              onReset={() =>
                setResetConfirm({
                  scope: 'counter',
                  key: 'meta.2_3',
                  title: 'Reset Counter Gabung TM 2 & 3?',
                  description: `Hitungan Gabung TM 2 & TM 3 (Blok B & C) pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
            />
            <MetaStep
              stepKey="1_2_3"
              label="GABUNG TM 1–3 (BLOK A–C)"
              count={metaCounts['1_2_3']}
              threshold={5}
              isLocked={!isMetaTuntas('2_3')}
              onIncrement={(delta = 1) => adjustMeta('1_2_3', delta)}
              canUndo={canUndoKey('meta.1_2_3')}
              stepInfo={stepInfo('meta.1_2_3')}
              canReset={!pageLockReason}
              onReset={() =>
                setResetConfirm({
                  scope: 'counter',
                  key: 'meta.1_2_3',
                  title: 'Reset Counter Gabung TM 1–3?',
                  description: `Hitungan Gabung TM 1–3 (Blok A–C) pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
            />
          </div>

          <MaqtaCard
            id={4}
              canUndo={(part: string) => canUndoKey('4.' + part)}
              getMinCount={(part: string) => getStepMinCount('4.' + part, localProgress)}
              stepInfoFor={(part: string) => stepInfo('4.' + part)}
              listenCount={getBlockListenCount({ blocks }, 4)}
              listenDone={blockListenDone(4)}
              listenStepInfo={stepInfo('4.listen')}
              playback={blockPlayback?.block === 4 ? blockPlayback : null}
              onPlayAudio={() => startBlockAudio(4)}
              onStopAudio={() => stopBlockAudio(true)}
              simakPrompted={Boolean(simakPromptedBlocks[4])}
              onAnswerComprehension={(understood: boolean) => handleBlockComprehension(4, understood)}
              salutation={userData?.salutation || 'Ukhti'}
              onUndo={(part: string) => markUndo('4.' + part)}
            page={page}
            state={blocks[4]}
            verses={blockVerses[4]}
            rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[4], customPageConfig?.[4])}
            customConfig={customPageConfig}
            allPageVerses={verses}
            isSavedInDb={completedBlocksAllTime.has(4)}
            isScheduledToday={scheduledBlockSetOnPage.has(4)}
            isLocked={!isMetaTuntas('1_2_3')}
            onIncrement={updateBlocksByUser}
            fontSize={fontSize}
            letter="D"
            isExamStageOpen={isExamStageOpen}
            globalShowVerses={globalShowVerses}
            examRevealSeq={examRevealSeq}
            showTajwid={showTajwid}
            onToggleTajwid={toggleTajwid}
            canReset={!pageLockReason}
            onResetBlock={() =>
              setResetConfirm({
                scope: 'block',
                block: 4,
                title: `Reset Counter Blok D (TM 4) Hal. ${page}?`,
                description: 'Seluruh hitungan Simak TM 4, TM 4-1, TM 4-2, dan Gabung TM 4 pada halaman ini akan dikembalikan ke 0.',
              })
            }
            onResetCounter={(key: string, label: string) =>
              setResetConfirm({
                scope: 'counter',
                key,
                title: `Reset Counter ${label}?`,
                description: `Hitungan ${label} pada Halaman ${page} akan dikembalikan ke 0.`,
              })
            }
          />

          <div className="space-y-4">
            <MetaStep
              stepKey="3_4"
              label="GABUNG TM 3 & TM 4 (BLOK C & D)"
              count={metaCounts['3_4']}
              threshold={10}
              isLocked={!isTuntasTM(4)}
              onIncrement={(delta = 1) => adjustMeta('3_4', delta)}
              canUndo={canUndoKey('meta.3_4')}
              stepInfo={stepInfo('meta.3_4')}
              canReset={!pageLockReason}
              onReset={() =>
                setResetConfirm({
                  scope: 'counter',
                  key: 'meta.3_4',
                  title: 'Reset Counter Gabung TM 3 & 4?',
                  description: `Hitungan Gabung TM 3 & TM 4 (Blok C & D) pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
            />
            <MetaStep
              stepKey="2_3_4"
              label="GABUNG TM 2–4 (BLOK B–D)"
              count={metaCounts['2_3_4']}
              threshold={5}
              isLocked={!isMetaTuntas('3_4')}
              onIncrement={(delta = 1) => adjustMeta('2_3_4', delta)}
              canUndo={canUndoKey('meta.2_3_4')}
              stepInfo={stepInfo('meta.2_3_4')}
              canReset={!pageLockReason}
              onReset={() =>
                setResetConfirm({
                  scope: 'counter',
                  key: 'meta.2_3_4',
                  title: 'Reset Counter Gabung TM 2–4?',
                  description: `Hitungan Gabung TM 2–4 (Blok B–D) pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
            />
            <MetaStep
              stepKey="1_2_3_4"
              label="GABUNG SELURUH HALAMAN (TM 1–4 / BLOK A–D)"
              count={metaCounts['1_2_3_4']}
              threshold={5}
              isLocked={!isMetaTuntas('2_3_4')}
              onIncrement={(delta = 1) => adjustMeta('1_2_3_4', delta)}
              canUndo={canUndoKey('meta.1_2_3_4')}
              stepInfo={stepInfo('meta.1_2_3_4')}
              canReset={!pageLockReason}
              onReset={() =>
                setResetConfirm({
                  scope: 'counter',
                  key: 'meta.1_2_3_4',
                  title: 'Reset Counter Gabung Seluruh Halaman (TM 1–4)?',
                  description: `Hitungan Gabung Seluruh Halaman (Blok A–D) pada Halaman ${page} akan dikembalikan ke 0.`,
                })
              }
              highlight
            />
          </div>

          {/* Tahap Ujian Halaman (Terbuka setelah Gabung Seluruh Halaman A-D 10x Tuntas) */}
          {user && (
            <div className="flex flex-col gap-6 mt-2">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h4 className="text-xl font-black font-headline text-black uppercase tracking-widest">
                  Tahap Ujian Halaman
                </h4>
              </div>
              <div id="step-quiz" className={cn('rounded-xl', stepInfo('quiz')?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2 p-2')}>
                <StepTag info={stepInfo('quiz')} />
              </div>
              {!isMetaTuntas('1_2_3_4') && !isPriorMemorizedPage && !clearedPages.has(page) && !isSelectedPageCleared ? (
                <Card className="border-2 border-dashed bg-muted py-10">
                  <CardContent className="flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-dashed">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest max-w-[260px]">
                      Selesaikan repetisi gabungan seluruh halaman (A–D min. 5x) untuk membuka
                      ujian halaman 60 soal (30 Hafalan + 30 Terjemah Per Kata) &amp; setoran Tasmi&apos; ke muallimah.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-none bg-primary text-white shadow-xl overflow-hidden border-b-4 border-[#D4AF37]">
                    <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] flex items-center justify-center mb-4">
                          <ClipboardCheck className="w-6 h-6 text-black" />
                        </div>
                        <h5 className="text-lg font-black leading-tight uppercase">
                          {quizPassedPages.has(page)
                            ? 'Ujian Halaman Lulus'
                            : `Ujian Halaman ${QUIZ_QUESTION_COUNT} Soal`}
                        </h5>
                        <p className="text-[11px] opacity-80 leading-relaxed">
                          Part 1 (30 Hafalan Ayat): sambung ayat, tebak nomor &amp; arti ayat. Part 2 (30 Terjemah Per Kata ala Hi Mufradat).
                          Lulus minimal {QUIZ_PASS_PERCENT}% untuk membuka halaman berikutnya.
                        </p>
                        {lastQuizOnPage && (
                          <p className="text-[11px] font-black text-[#D4AF37]">
                            Hasil terakhir: {lastQuizOnPage.correct}/{lastQuizOnPage.total} ({lastQuizOnPage.score}%)
                            {lastQuizOnPage.part1Correct !== null && lastQuizOnPage.part1Correct !== undefined && lastQuizOnPage.part2Correct !== null && lastQuizOnPage.part2Correct !== undefined
                              ? ` • Hafalan ${lastQuizOnPage.part1Correct}/${lastQuizOnPage.part1Total ?? 30} • Per Kata ${lastQuizOnPage.part2Correct}/${lastQuizOnPage.part2Total ?? 30}`
                              : ""}
                            {lastQuizOnPage.passed ? ' • LULUS' : ' • Belum lulus'}
                          </p>
                        )}
                      </div>
                      <Button
                        asChild
                        className="bg-[#D4AF37] text-black font-black w-full rounded-xl hover:bg-[#D4AF37]/90 h-12 shadow-lg"
                      >
                        <Link href={`/tikrar/ujian?page=${page}`}>
                          {quizPassedPages.has(page) ? 'ULANGI UJIAN (LATIHAN)' : 'MULAI UJIAN'}{' '}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                  {(() => {
                    const isSubPassed =
                      activeSubmissionForPage?.status === 'passed' ||
                      Boolean(activeExam?.passed) ||
                      Boolean(summary?.tasmiPassedPages?.includes(page));
                    const isSubPending = !isSubPassed && (activeSubmissionForPage?.status === 'pending' || Boolean(activeExam && !activeExam.passed));
                    const isSubRevision = !isSubPassed && activeSubmissionForPage?.status === 'needs_revision';
                    const gradeLabel = activeSubmissionForPage?.grade
                      ? TIKRAR_GRADE_LABELS[activeSubmissionForPage.grade] || activeSubmissionForPage.grade
                      : null;
                    const manualWaUrl = `https://wa.me/628567712914?text=${encodeURIComponent(
                      `Assalamu'alaikum Admin HI AQLI, saya ${userData?.full_name || userData?.username || 'Thalibah'} sudah masuk antrean Setoran Tasmi' Halaman ${page} (Juz ${juz}). Mohon izin konfirmasi jadwal.`
                    )}`;

                    return (
                      <Card
                        className={cn(
                          'border-none shadow-xl overflow-hidden transition-all border-b-4',
                          isSubPassed || isSubPending
                            ? 'bg-primary text-white border-[#D4AF37]'
                            : isSubRevision
                            ? 'bg-rose-50 text-rose-950 border-rose-400 border-2'
                            : 'bg-white text-primary border-[#D4AF37] border-2'
                        )}
                      >
                        <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div
                                className={cn(
                                  'w-12 h-12 rounded-2xl flex items-center justify-center',
                                  isSubPassed || isSubPending ? 'bg-white/15' : 'bg-primary/10'
                                )}
                              >
                                {isSubPassed ? (
                                  <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
                                ) : isSubPending ? (
                                  <Clock className="w-6 h-6 text-[#D4AF37]" />
                                ) : (
                                  <MessageSquare className="w-6 h-6 text-primary" />
                                )}
                              </div>
                              {isSubPending && myPendingQueueEntry && (
                                <Badge className="bg-[#D4AF37] text-black font-black text-[10px] uppercase">
                                  Antrean #{myPendingQueueEntry.queueNumber}
                                </Badge>
                              )}
                              {isSubPassed && gradeLabel && (
                                <Badge className="bg-emerald-400 text-stone-950 font-black text-[10px] uppercase">
                                  {gradeLabel}
                                </Badge>
                              )}
                            </div>
                            <h5 className="text-lg font-black leading-tight uppercase">
                              {isSubPassed
                                ? "Tasmi' Lulus"
                                : isSubPending
                                ? "Dalam Antrean Tasmi'"
                                : isSubRevision
                                ? "Perlu Perbaikan Tasmi'"
                                : "Setoran Tasmi' ke Muallimah"}
                            </h5>
                            <p className="text-[11px] opacity-85 leading-relaxed">
                              {isSubPassed
                                ? `Alhamdulillah, Halaman ${page} sudah disimak dan lulus tasmi' oleh ${activeSubmissionForPage?.musyrifah_name || 'Muallimah'}.`
                                : isSubPending
                                ? `Terdaftar di antrean simak Live Zoom${myPendingQueueEntry ? ` (urutan #${myPendingQueueEntry.queueNumber} dari ${tasmiQueue.length} menunggu)` : ''}. Notifikasi otomatis telah dikirim ke Admin HI AQLI.`
                                : isSubRevision
                                ? activeSubmissionForPage?.feedback ||
                                  "Muallimah memberi catatan perbaikan tajwid/kelancaran. Silakan murajaah lalu ajukan tasmi' ulang."
                                : "Saat diklik, permohonan otomatis masuk daftar Antrean Tasmi' & langsung mengirim notifikasi ke WhatsApp Admin HI AQLI."}
                            </p>
                            {isSubPassed && activeSubmissionForPage?.feedback && (
                              <p className="text-[11px] italic bg-white/10 rounded-lg px-2.5 py-1.5">
                                &ldquo;{activeSubmissionForPage.feedback}&rdquo;
                              </p>
                            )}
                          </div>

                          {isSubPending ? (
                            <div className="flex flex-wrap gap-2">
                              {activeHalaqah?.zoom_link && !String(activeHalaqah.zoom_link).includes('hiaqli-tikrar-') && (
                                <Button
                                  asChild
                                  className="bg-[#D4AF37] text-black font-black flex-1 rounded-xl hover:bg-[#D4AF37]/90 h-11 shadow-lg"
                                >
                                  <a href={activeHalaqah.zoom_link} target="_blank" rel="noopener noreferrer">
                                    <Video className="mr-2 w-4 h-4" /> Buka Zoom Halaqah
                                  </a>
                                </Button>
                              )}
                              <Button
                                asChild
                                variant="outline"
                                className="border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold text-xs h-11 rounded-xl"
                              >
                                <a href={manualWaUrl} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle className="mr-1.5 w-4 h-4" /> Chat Admin WA
                                </a>
                              </Button>
                            </div>
                          ) : !isSubPassed ? (
                            <Button
                              onClick={handleRequestExam}
                              disabled={isRequestingExam}
                              className="bg-primary text-white font-black w-full rounded-xl hover:bg-primary/90 h-12 shadow-lg"
                            >
                              {isRequestingExam ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <>
                                  <Zap className="mr-2 w-4 h-4 fill-current text-[#D4AF37]" />{' '}
                                  {isSubRevision ? "AJUKAN TASMI' ULANG" : "HUBUNGI MUALLIMAH & MASUK ANTREAN"}
                                </>
                              )}
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              )}

              {/* Daftar Antrean Setoran Tasmi' Saat Ini */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-stone-900">
                      Antrean Setoran Tasmi&apos; Saat Ini
                    </h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-none text-[10px] font-black">
                      {tasmiQueue.length} Thalibah Menunggu
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={fetchTasmiQueue}
                      disabled={loadingTasmiQueue}
                      className="h-7 px-2 text-[11px] font-bold text-primary"
                    >
                      {loadingTasmiQueue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Segarkan'}
                    </Button>
                  </div>
                </div>
                {tasmiQueue.length === 0 ? (
                  <p className="text-xs text-stone-500 bg-stone-50 border border-dashed border-stone-200 rounded-xl p-3 text-center">
                    Belum ada thalibah yang sedang menunggu di antrean tasmi&apos; saat ini.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {tasmiQueue.map((q) => (
                      <div
                        key={q.id}
                        className={cn(
                          'flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs',
                          q.isMe
                            ? 'bg-amber-50 border-[#D4AF37]'
                            : 'bg-stone-50 border-stone-200/80'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-primary text-white font-black text-[11px] flex items-center justify-center shrink-0">
                            #{q.queueNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-stone-900 truncate">{q.name}</span>
                              {q.isMe && (
                                <Badge className="bg-primary text-white text-[9px] font-black h-4 px-1.5">
                                  Anda
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-600 truncate">
                              Juz {q.juz} • Hal. {q.pageNumber} (QS. {q.surahName})
                              {q.halaqahTitle ? ` • ${String(q.halaqahTitle).replace('Hi Tikrar - ', '')}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-stone-500 shrink-0">
                          {new Date(q.submittedAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigasi Lanjut ke Halaman Berikutnya setelah Lulus */}
          {clearedPages.has(page) && page < endPage && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm mt-4">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Alhamdulillah, Halaman {page} Telah Lulus Ujian!</span>
              </div>
              <Button
                type="button"
                onClick={() => setPage(page + 1)}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
              >
                Lanjut ke Halaman {page + 1} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

        </div>
        )}
      </TooltipProvider>
      </div>

      <AlertDialog open={Boolean(resetConfirm)} onOpenChange={(open) => { if (!open && !isResetting) setResetConfirm(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary font-black text-base">
              {resetConfirm?.title || 'Konfirmasi Reset Counter'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed">
              {resetConfirm?.description}
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
                executeReset();
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black gap-1.5"
            >
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Ya, Reset ke 0
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TilawahMushafCard({
  page,
  juz,
  surahName,
  verses,
  loading,
  fontSize,
  isPlaying,
  playingVerseKey,
  onTogglePlayAll,
  onPlayFromVerse,
  totalProgress,
  onOpenTrialCounter,
  showTajwid = true,
  onToggleTajwid,
}: {
  page: number;
  juz: number;
  surahName: string;
  verses: Verse[];
  loading: boolean;
  fontSize: number;
  isPlaying: boolean;
  playingVerseKey: string | null;
  onTogglePlayAll: () => void;
  onPlayFromVerse: (idx: number) => void;
  totalProgress: number;
  onOpenTrialCounter: () => void;
  showTajwid?: boolean;
  onToggleTajwid?: () => void;
}) {
  const [showPerKata, setShowPerKata] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [pinnedWord, setPinnedWord] = useState<string | null>(null);
  const hideWordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpenWord(null);
    setPinnedWord(null);
  }, [page]);

  useEffect(() => {
    return () => {
      if (hideWordTimerRef.current) clearTimeout(hideWordTimerRef.current);
    };
  }, []);

  const showWord = (wid: string) => {
    if (hideWordTimerRef.current) clearTimeout(hideWordTimerRef.current);
    setOpenWord(wid);
  };
  const hideWordLater = (wid: string) => {
    if (hideWordTimerRef.current) clearTimeout(hideWordTimerRef.current);
    hideWordTimerRef.current = setTimeout(() => {
      setOpenWord((cur) => (cur === wid ? null : cur));
    }, 120);
  };

  const pageRangeLabel = useMemo(() => {
    if (!verses || verses.length === 0) return 'Memuat ayat...';
    const first = verses[0].verse_key;
    const last = verses[verses.length - 1].verse_key;
    const [s1, a1] = first.split(':');
    const [s2, a2] = last.split(':');
    const name1 = QURAN_CHAPTERS.find((c) => c.id === Number(s1))?.name_simple || `QS ${s1}`;
    if (s1 === s2) {
      return a1 === a2 ? `${name1}: ${a1}` : `${name1}: ${a1}–${a2}`;
    }
    const name2 = QURAN_CHAPTERS.find((c) => c.id === Number(s2))?.name_simple || `QS ${s2}`;
    return `${name1} ${a1} – ${name2} ${a2}`;
  }, [verses]);

  return (
    <Card className="border-2 border-sky-200 bg-white shadow-md overflow-hidden">
      <div className="py-3 px-4 bg-sky-50/90 border-b border-sky-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className="bg-sky-700 text-white hover:bg-sky-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border-none shrink-0">
            Mode Tilawah
          </Badge>
          <span className="text-xs font-black text-sky-950 truncate">
            Juz {juz} • Hal. {page} • {surahName} ({pageRangeLabel})
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenTrialCounter}
          className="h-8 px-3 rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50 font-black text-[11px] shrink-0"
        >
          {totalProgress > 0
            ? `Lanjutkan Counter Uji Coba (${Math.round(totalProgress)}%)`
            : 'Buka Counter Uji Coba'}
        </Button>
      </div>

      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={loading || verses.length === 0}
              onClick={onTogglePlayAll}
              className={cn(
                'h-9 px-3.5 rounded-xl font-black text-xs gap-1.5',
                isPlaying
                  ? 'bg-primary hover:bg-primary/90 text-white'
                  : 'bg-sky-700 hover:bg-sky-800 text-white'
              )}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Hentikan Murottal' : 'Putar Murottal Halaman'}
            </Button>
            {isPlaying && playingVerseKey && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-black">
                Memutar QS {playingVerseKey}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onToggleTajwid}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black border transition-colors touch-manipulation',
                showTajwid
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-primary border-primary/25 hover:bg-primary/5'
              )}
            >
              <Palette className="w-3.5 h-3.5" />
              Tajwid
            </button>
            <button
              type="button"
              onClick={() => setShowPerKata((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black border transition-colors touch-manipulation',
                showPerKata
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-primary/25 hover:bg-primary/5'
              )}
            >
              <Languages className="w-3.5 h-3.5" />
              Per Kata
            </button>
            <button
              type="button"
              onClick={() => setShowTranslation((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black border transition-colors touch-manipulation',
                showTranslation
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-primary/25 hover:bg-primary/5'
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Terjemah
            </button>
          </div>
        </div>

        {showTajwid && <TajwidLegendBar />}

        {loading || verses.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-sky-700" />
            <span className="text-xs font-bold">Memuat ayat mushaf Halaman {page}...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {verses.map((v, vIdx) => {
              const isCur = v.verse_key === playingVerseKey;
              const ayahNo = v.verse_key.split(':')[1];
              const transText = v.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '') || '';
              return (
                <div
                  key={v.verse_key}
                  id={`verse-card-${v.verse_key.replace(':', '-')}`}
                  className={cn(
                    'rounded-2xl border p-3.5 sm:p-4 transition-colors space-y-2.5',
                    isCur
                      ? 'bg-amber-50/90 border-amber-400 shadow-sm'
                      : 'bg-[#FAF7F5]/60 border-stone-200/80'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-primary bg-white px-2.5 py-0.5 rounded-full border border-primary/15">
                      QS {v.verse_key}
                    </span>
                    <button
                      type="button"
                      onClick={() => (isCur && isPlaying ? onTogglePlayAll() : onPlayFromVerse(vIdx))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 hover:text-sky-950 px-2 py-0.5 rounded-lg hover:bg-sky-100/70 transition-colors"
                      title={isCur && isPlaying ? 'Hentikan audio' : `Putar murottal mulai ayat ${ayahNo}`}
                    >
                      {isCur && isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isCur && isPlaying ? 'Berhenti' : `Putar Ayat ${ayahNo}`}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-start items-start gap-x-1.5 gap-y-2" dir="rtl">
                    {v.words.map((w: any, idx: number) => {
                      const wid = `tilawah-${v.verse_key}-${idx}`;
                      const isActualWord = w?.char_type_name !== 'end';
                      if (isActualWord && (showPerKata || isCur)) {
                        return (
                          <Tooltip key={wid} open={openWord === wid || pinnedWord === wid} onOpenChange={() => {}}>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={0}
                                onMouseEnter={() => showWord(wid)}
                                onMouseLeave={() => hideWordLater(wid)}
                                onFocus={() => showWord(wid)}
                                onBlur={() => hideWordLater(wid)}
                                onClick={() => {
                                  setPinnedWord((cur) => (cur === wid ? null : wid));
                                  showWord(wid);
                                }}
                                className={cn(
                                  'inline-flex flex-col items-center justify-start cursor-help rounded-lg px-1.5 py-1 outline-none transition-colors',
                                  isCur ? 'bg-amber-200/75 ring-1 ring-amber-400/70' : 'bg-white/80 hover:bg-[#D4AF37]/20',
                                  pinnedWord === wid && 'ring-2 ring-primary/40'
                                )}
                              >
                                <span style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }} className="font-arabic text-stone-950">
                                  {renderTajwidWord(w, showTajwid)}
                                </span>
                                <span
                                  dir="ltr"
                                  className="text-[10px] font-sans font-semibold text-primary leading-tight text-center mt-0.5 max-w-[92px] break-words"
                                >
                                  {w.translation?.text || '-'}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipContent className="bg-primary text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                                <p className="text-xs font-bold">{w.translation?.text || '...'}</p>
                              </TooltipContent>
                            </TooltipPortal>
                          </Tooltip>
                        );
                      }
                      return (
                        <Tooltip key={wid} open={openWord === wid || pinnedWord === wid} onOpenChange={() => {}}>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              onMouseEnter={() => showWord(wid)}
                              onMouseLeave={() => hideWordLater(wid)}
                              onFocus={() => showWord(wid)}
                              onBlur={() => hideWordLater(wid)}
                              onClick={() => {
                                setPinnedWord((cur) => (cur === wid ? null : wid));
                                showWord(wid);
                              }}
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                              className={cn(
                                'font-arabic text-stone-950 cursor-help hover:bg-[#D4AF37]/20 rounded px-0.5 outline-none transition-colors',
                                pinnedWord === wid && 'bg-[#D4AF37]/30'
                              )}
                            >
                              {renderTajwidWord(w, showTajwid)}
                            </span>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent className="bg-primary text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                              <p className="text-xs font-bold">{w.translation?.text || '...'}</p>
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      );
                    })}
                    <span className="inline-flex items-center justify-center px-2 rounded-full border border-primary/20 text-[10px] font-bold mx-1 bg-white self-center">
                      ({ayahNo})
                    </span>
                  </div>

                  {showTranslation && transText && (
                    <p className="text-xs leading-relaxed text-stone-700 bg-white/80 rounded-xl px-3 py-2 border-l-4 border-primary/30">
                      &ldquo;{transText}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p className="text-xs font-semibold text-amber-950 leading-relaxed">
            Ingin mencoba metode 4 Blok Tikrar pada halaman ini? Hitungan counter tetap tersimpan, sementara poin &amp; keaktifan harian tetap fokus pada Target Aktif.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onOpenTrialCounter}
            className="bg-primary hover:bg-primary/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
          >
            {totalProgress > 0
              ? `Lanjutkan Uji Coba (${Math.round(totalProgress)}%)`
              : 'Buka Counter Uji Coba'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MaqtaCard({
  id,
  page,
  state,
  verses,
  rangeLabel,
  isSavedInDb,
  isScheduledToday,
  onIncrement,
  fontSize,
  isLocked,
  letter,
  canUndo,
  onUndo,
  stepInfoFor,
  listenCount = 0,
  listenDone = true,
  listenStepInfo,
  playback,
  onPlayAudio,
  onStopAudio,
  simakPrompted = false,
  onAnswerComprehension,
  salutation = 'Ukhti',
  getMinCount,
  customConfig,
  allPageVerses,
  isExamStageOpen = false,
  globalShowVerses = false,
  examRevealSeq = 0,
  showTajwid = true,
  onToggleTajwid,
  canReset = true,
  onResetBlock,
  onResetCounter,
}: any) {
  // isCombinedDone computed after countersLocked & isCombinedLocked
  const isPlaying = Boolean(playback);
  const playingVerse = isPlaying ? verses[playback.verseIdx] : null;
  const playingVerseKey = playingVerse?.verse_key || null;
  // Counter blok baru terbuka setelah blok disimak 5x DAN dikonfirmasi sudah paham
  const needsComprehensionConfirm =
    listenDone &&
    state?.understood !== true &&
    (state?.understood === false || (state?.a?.count || 0) === 0);
  const countersLocked = isLocked || !listenDone || needsComprehensionConfirm;

  // Arti kata: tetap tampil 2,5 detik setelah kursor pergi; ketuk untuk menahan/menutup
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [pinnedWord, setPinnedWord] = useState<string | null>(null);
  const [showPerKata, setShowPerKata] = useState(() => state?.understood === false);
  const [showTranslation, setShowTranslation] = useState(() => state?.understood === false);
  useEffect(() => {
    if (state?.understood === false) {
      setShowPerKata(true);
      setShowTranslation(true);
    }
  }, [state?.understood, page]);
  const [revealInExam, setRevealInExam] = useState(globalShowVerses);
  useEffect(() => {
    setRevealInExam(globalShowVerses);
  }, [globalShowVerses, examRevealSeq]);
  const isVerseHidden = !revealInExam;
  const closeWordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (closeWordTimer.current) clearTimeout(closeWordTimer.current);
  }, []);
  const showWord = (wid: string) => {
    if (closeWordTimer.current) clearTimeout(closeWordTimer.current);
    setOpenWord(wid);
  };
  const hideWordLater = (wid: string) => {
    if (closeWordTimer.current) clearTimeout(closeWordTimer.current);
    closeWordTimer.current = setTimeout(() => setOpenWord((cur) => (cur === wid ? null : cur)), 2500);
  };
  const theme = SYAAMIL_BLOCK_THEME[id as 1 | 2 | 3 | 4] || SYAAMIL_BLOCK_THEME[1];

  const subSplit = useMemo(() => {
    return splitBlockIntoSubBlocks(id as 1 | 2 | 3 | 4, page, verses, customConfig, allPageVerses);
  }, [id, page, verses, customConfig, allPageVerses]);

  const part1Range = useMemo(() => {
    if (subSplit.isSingleVerseSplit) {
      const aNum = verses[0]?.verse_key?.split(':')[1] || '';
      return aNum ? `Ayat ${aNum} (Bag. 1)` : 'Bagian 1';
    }
    return formatVerseRange(subSplit.subAVerses) || 'Bagian 1';
  }, [subSplit, verses]);

  const part2Range = useMemo(() => {
    if (subSplit.isSingleVerseSplit) {
      const aNum = verses[0]?.verse_key?.split(':')[1] || '';
      return aNum ? `Ayat ${aNum} (Bag. 2)` : 'Bagian 2';
    }
    return formatVerseRange(subSplit.subBVerses) || 'Bagian 2';
  }, [subSplit, verses]);

  const { tokensA, tokensB } = useMemo(() => {
    if (subSplit.isSingleVerseSplit) {
      const items: any[] = [];
      verses.forEach((v: any) => {
        v.words.forEach((w: any, idx: number) => {
          items.push({ type: 'word', data: w, verse_key: v.verse_key, word_idx: idx });
        });
        items.push({ type: 'marker', text: `(${v.verse_key.split(':')[1]})`, verse_key: v.verse_key });
      });
      const mid = Math.ceil(items.length / 2);
      return { tokensA: items.slice(0, mid), tokensB: items.slice(mid) };
    }

    const itemsA: any[] = [];
    subSplit.subAVerses.forEach((v: any) => {
      v.words.forEach((w: any, idx: number) => {
        itemsA.push({ type: 'word', data: w, verse_key: v.verse_key, word_idx: idx });
      });
      itemsA.push({ type: 'marker', text: `(${v.verse_key.split(':')[1]})`, verse_key: v.verse_key });
    });

    const itemsB: any[] = [];
    subSplit.subBVerses.forEach((v: any) => {
      v.words.forEach((w: any, idx: number) => {
        itemsB.push({ type: 'word', data: w, verse_key: v.verse_key, word_idx: idx });
      });
      itemsB.push({ type: 'marker', text: `(${v.verse_key.split(':')[1]})`, verse_key: v.verse_key });
    });

    return { tokensA: itemsA, tokensB: itemsB };
  }, [verses, subSplit]);

  const addSubCount = (part: 'a' | 'b' | 'combined', delta: number) => {
    if (countersLocked) return;
    const currentCount = state?.[part]?.count || 0;
    const nextCount = currentCount + delta;
    if (delta > 0) {
      if (currentCount < PASS_THRESHOLD && nextCount >= PASS_THRESHOLD) playTikrarDone();
      else playTikrarTap();
    }
    if (delta < 0) {
      if (!canUndo?.(part)) return;
      onUndo?.(part);
    }
    onIncrement((p: any) => {
      const minFloor = delta < 0 && getMinCount ? getMinCount(part) : 0;
      return {
        ...p,
        [id]: {
          ...p[id],
          [part]: {
            // Penambahan (+1 / +5) selalu naik dari posisi saat ini; minFloor hanya berlaku saat pengurangan (-1)
            count: Math.max(minFloor, (p[id]?.[part]?.count || 0) + delta),
          },
        },
      };
    });

    // Auto-advance / smooth scroll ke step berikutnya saat tuntas
    if (delta > 0 && currentCount < PASS_THRESHOLD && nextCount >= PASS_THRESHOLD) {
      if (part === 'a') {
        setTimeout(() => {
          document.getElementById(`step-${id}.b`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      } else if (part === 'b') {
        setTimeout(() => {
          document.getElementById(`step-${id}.combined`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      } else if (part === 'combined') {
        const nextTargetId =
          id === 1 ? 'step-2.listen' :
          id === 2 ? 'step-meta.1_2' :
          id === 3 ? 'step-meta.2_3' :
          'step-meta.3_4';
        setTimeout(() => {
          document.getElementById(nextTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
    }
  };

  const renderToken = (token: any, colorClass: string) => {
    if (token.type === 'word') {
      const wid = `${token.verse_key}-${token.word_idx}`;
      const isActualWord = token.data?.char_type_name !== 'end';
      const isActiveVerse = token.verse_key === playingVerseKey;
      const showInlineMeaning = isActualWord && (showPerKata || isActiveVerse);

      if (showInlineMeaning) {
        return (
          <Tooltip key={wid} open={openWord === wid || pinnedWord === wid} onOpenChange={() => {}}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                onMouseEnter={() => showWord(wid)}
                onMouseLeave={() => hideWordLater(wid)}
                onFocus={() => showWord(wid)}
                onBlur={() => hideWordLater(wid)}
                onClick={() => {
                  setPinnedWord((cur) => (cur === wid ? null : wid));
                  showWord(wid);
                }}
                className={cn(
                  'inline-flex flex-col items-center justify-start cursor-help rounded-lg px-1.5 py-1 outline-none transition-colors',
                  isActiveVerse
                    ? 'bg-amber-200/80 ring-1 ring-amber-400/70'
                    : 'bg-white/60 hover:bg-[#D4AF37]/20',
                  pinnedWord === wid && 'ring-2 ring-primary/40'
                )}
              >
                <span
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }}
                  className={cn('font-arabic', colorClass)}
                >
                  {renderTajwidWord(token.data, showTajwid)}
                </span>
                <span
                  dir="ltr"
                  className="text-[10px] font-sans font-semibold text-primary leading-tight text-center mt-0.5 max-w-[92px] break-words"
                >
                  {token.data.translation?.text || '-'}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="bg-primary text-white border-none shadow-lg py-1.5 px-3 z-[100]">
                <p className="text-xs font-bold">{token.data.translation?.text || '...'}</p>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        );
      }

      return (
        <Tooltip key={wid} open={openWord === wid || pinnedWord === wid} onOpenChange={() => {}}>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              onMouseEnter={() => showWord(wid)}
              onMouseLeave={() => hideWordLater(wid)}
              onFocus={() => showWord(wid)}
              onBlur={() => hideWordLater(wid)}
              onClick={() => {
                setPinnedWord((cur) => (cur === wid ? null : wid));
                showWord(wid);
              }}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
              className={cn(
                'font-arabic cursor-help hover:bg-[#D4AF37]/20 rounded px-0.5 outline-none transition-colors',
                colorClass,
                isActiveVerse && 'bg-amber-200/70',
                pinnedWord === wid && 'bg-[#D4AF37]/30'
              )}
            >
              {renderTajwidWord(token.data, showTajwid)}
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="bg-primary text-white border-none shadow-lg py-1.5 px-3 z-[100]">
              <p className="text-xs font-bold">{token.data.translation?.text || '...'}</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      );
    }
    return (
      <span
        key={`${token.verse_key}-m`}
        className="inline-flex items-center justify-center px-2 rounded-full border border-primary/20 text-[10px] font-bold mx-1 bg-white translate-y-[-2px]"
      >
        {token.text}
      </span>
    );
  };

  const isCombinedLocked = countersLocked || state.a.count < PASS_THRESHOLD || state.b.count < PASS_THRESHOLD;
  const isCombinedDone = !isCombinedLocked && state.combined.count >= PASS_THRESHOLD;
  const hasBlockActivity =
    listenCount > 0 ||
    state.a.count > 0 ||
    state.b.count > 0 ||
    state.combined.count > 0 ||
    state.understood !== undefined;

  return (
    <Card
      className={cn(
        'border-2 transition-all shadow-md overflow-hidden flex flex-col h-full',
        isCombinedDone ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[#D4AF37]/10' : theme.cardBorder,
        isLocked && 'opacity-50 grayscale select-none'
      )}
    >
      <div className={cn("py-2.5 px-4 border-b flex justify-between items-center gap-2 shrink-0", theme.softHeaderBg)}>
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 border-none shrink-0", theme.badgeClass)}>
            {theme.badgeText}
          </Badge>
          <span className="text-[10px] font-black uppercase tracking-wider opacity-80 truncate">
            Hal. {page} {rangeLabel ? `• ${rangeLabel}` : ''} {isLocked && '• TERKUNCI'}
          </span>
        </div>
        <div className="flex items-center flex-wrap justify-end gap-1.5 shrink-0">
          {(['a', 'b', 'combined'] as const).some((part) => stepInfoFor?.(part)?.isTarget) && (
            <Badge className="bg-[#D4AF37] text-black hover:bg-[#D4AF37] font-black text-[8px] tracking-widest h-4 gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> TARGET HARI INI
            </Badge>
          )}
          {!isLocked && isCombinedDone && isSavedInDb ? (
            <Badge className="bg-emerald-400 text-black font-black text-[8px] tracking-widest h-4">
              TERCATAT
            </Badge>
          ) : !isLocked && isCombinedDone ? (
            <Badge className="bg-[#D4AF37] text-black font-black text-[8px] tracking-widest h-4">
              TUNTAS
            </Badge>
          ) : null}
          {hasBlockActivity && !isLocked && canReset && onResetBlock && (
            <button
              type="button"
              onClick={onResetBlock}
              title={`Reset seluruh counter Blok ${letter} (TM ${id})`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-300/80 bg-white/95 text-[10px] font-black text-rose-700 hover:bg-rose-50 active:scale-95 transition-all shrink-0"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset Blok</span>
            </button>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-4 overflow-hidden">
        {/* Simak audio per blok (wajib 5x sebelum counter blok terbuka) */}
        <div
          id={id === 1 ? 'step-prep' : `step-${id}.listen`}
          className={cn(
            'rounded-2xl border-2 p-3 space-y-2 scroll-mt-24',
            listenDone ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-primary/20 bg-white',
            listenStepInfo?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2'
          )}
        >
          <Button
            type="button"
            disabled={isLocked}
            onClick={isPlaying ? onStopAudio : onPlayAudio}
            className={cn(
              'w-full h-12 rounded-xl font-black text-xs uppercase tracking-wider gap-2 touch-manipulation',
              isPlaying
                ? 'bg-primary text-white hover:bg-primary/90'
                : listenDone
                ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" /> Jeda • Putaran {playback.loop + 1}/5
              </>
            ) : (
              <>
                <Headphones className="w-5 h-5" />
                {listenCount >= PREP_LISTEN_THRESHOLD ? `Ulangi Simak TM ${id} (Blok ${letter})` : `Simak TM ${id} (${listenCount}/5)`}
              </>
            )}
          </Button>
          {!listenDone && !isLocked && (
            <p className="text-[10px] font-bold text-center text-stone-600">
              Simak audio blok ini 5x dulu untuk membuka counter.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <StepTag info={listenStepInfo} className="justify-start" />
            {(listenCount > 0 || state?.understood !== undefined) && !isLocked && canReset && onResetCounter && (
              <button
                type="button"
                onClick={() => onResetCounter(`${id}.listen`, `Simak TM ${id} (Blok ${letter})`)}
                title={`Reset hitungan Simak TM ${id} ke 0`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-stone-200 bg-stone-50 hover:bg-rose-50 hover:border-rose-200 text-[10px] font-bold text-stone-600 hover:text-rose-700 transition-colors ml-auto"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset Simak ({listenCount}/5)
              </button>
            )}
          </div>

          {!isLocked && !isPlaying && (
            simakPrompted ||
            state?.understood === false ||
            (listenDone && state?.understood === undefined && (state?.a?.count || 0) === 0)
          ) ? (
            <div
              id={`comprehension-${id}`}
              className={cn(
                'mt-2 rounded-xl border-2 p-3 space-y-2.5 scroll-mt-24',
                state?.understood === false
                  ? 'bg-amber-50 border-amber-400 text-amber-950'
                  : 'bg-primary/5 border-primary/25 text-stone-900'
              )}
            >
              {state?.understood === false ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-primary">
                      Belum paham isi Blok {letter} (TM {id})? Yuk pahami dulu!
                    </p>
                    <p className="text-[11px] font-medium text-stone-700 leading-relaxed">
                      <strong>Per Kata</strong> dan <strong>Terjemah</strong> sudah dibuka di bawah. Kotak hafalan <strong>TM {id}-1</strong> tetap terkunci sampai klik <strong>Sekarang Sudah Paham</strong>.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAnswerComprehension?.(true)}
                      className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sekarang Sudah Paham
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onPlayAudio}
                      className="h-9 rounded-lg border-primary/30 text-primary hover:bg-primary/10 font-bold text-[11px] gap-1.5"
                    >
                      <Headphones className="w-3.5 h-3.5" /> Putar Ulang
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-black text-primary text-center leading-snug">
                    Apakah {salutation} sudah paham apa yang akan dihafal pada Blok {letter} (TM {id}) ini?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAnswerComprehension?.(true)}
                      className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Paham
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowPerKata(true);
                        setShowTranslation(true);
                        setRevealInExam(true);
                        onAnswerComprehension?.(false);
                      }}
                      className="h-9 rounded-lg border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-950 font-black text-[11px] gap-1.5"
                    >
                      <Languages className="w-3.5 h-3.5" /> Belum Paham
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : !isLocked && !isPlaying && state?.understood === true ? (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px]">
              <span className="font-black text-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Paham makna Blok {letter}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPerKata(true);
                  setShowTranslation(true);
                  setRevealInExam(true);
                }}
                className="font-bold text-primary hover:underline"
              >
                Buka Arti &amp; Terjemah
              </button>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "p-3 sm:p-4 rounded-2xl border-2 flex-1 overflow-y-auto no-scrollbar space-y-3",
            theme.verseBg
          )}
        >
          {isVerseHidden ? (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 gap-3 bg-white/60 rounded-xl border border-dashed border-primary/25">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-primary/15">
                <EyeOff className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-black text-primary">
                  {isExamStageOpen ? 'Teks Ayat Disembunyikan (Siap Ujian)' : 'Teks Ayat Disembunyikan (Mode Counter)'}
                </p>
                <p className="text-[11px] font-medium text-stone-700 leading-relaxed">
                  {isExamStageOpen
                    ? 'Tahap Ujian Halaman sudah terbuka. Tampilkan kembali teks ayat kapan saja jika ingin murajaah ulang.'
                    : `Uji hafalan Blok ${letter} sambil menekan counter di bawah. Tampilkan kembali ayat kapan saja jika perlu mengintip.`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevealInExam(true)}
                className="h-8 px-3.5 rounded-full bg-white hover:bg-primary hover:text-white border-primary/30 text-primary text-[11px] font-black transition-colors touch-manipulation"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                {isExamStageOpen ? 'Tampilkan Ayat (Murajaah)' : 'Tampilkan Ayat'}
              </Button>
            </div>
          ) : (
            <>
          {/* Kontrol tampilan Tajwid, Per Kata & Terjemahan di dalam kotak atas */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
            <span className="text-[10px] font-bold text-stone-600 truncate min-w-0 hidden sm:inline">
              Ketuk kata untuk arti
            </span>
            <div className="flex items-center gap-1 shrink-0 flex-nowrap ml-auto">
              <button
                type="button"
                onClick={onToggleTajwid}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black border transition-colors touch-manipulation whitespace-nowrap',
                  showTajwid
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white/80 text-primary border-primary/20 hover:bg-white'
                )}
              >
                <Palette className="w-3 h-3 shrink-0" />
                Tajwid
              </button>
              <button
                type="button"
                onClick={() => setShowPerKata((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black border transition-colors touch-manipulation whitespace-nowrap',
                  showPerKata
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/80 text-primary border-primary/20 hover:bg-white'
                )}
              >
                <Languages className="w-3 h-3 shrink-0" />
                Per Kata
              </button>
              <button
                type="button"
                onClick={() => setShowTranslation((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black border transition-colors touch-manipulation whitespace-nowrap',
                  showTranslation
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/80 text-primary border-primary/20 hover:bg-white'
                )}
              >
                <BookOpen className="w-3 h-3 shrink-0" />
                Terjemah
              </button>
              <button
                type="button"
                onClick={() => setRevealInExam(false)}
                aria-label="Sembunyikan teks ayat blok ini"
                title="Sembunyikan teks ayat"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border bg-stone-900 text-white border-stone-900 hover:bg-stone-800 transition-colors touch-manipulation shrink-0"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-blok 1 (TM x-1) */}
          <div
            className={cn(
              'rounded-xl p-3 border border-white/60 border-r-4 border-r-[#B91C1C] shadow-sm space-y-2 transition-colors',
              showTajwid ? 'bg-white/95' : 'bg-white/40'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B91C1C] text-white text-[10px] font-black tracking-wide">
                TM {id}-1 ({letter}-1)
              </span>
              <span className="text-[11px] font-extrabold text-[#991B1B]">
                {part1Range}
              </span>
            </div>
            {verses.length === 0 ? (
              <div className="min-h-[120px] flex flex-col justify-center gap-2 py-2 animate-pulse">
                <div className="h-5 bg-primary/10 rounded-lg w-5/6 mx-auto" />
                <div className="h-5 bg-primary/10 rounded-lg w-4/6 mx-auto" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center items-start gap-x-1 gap-y-2" dir="rtl">
                {tokensA.map((t) => renderToken(t, showTajwid ? 'text-stone-950' : 'text-[#991B1B]'))}
              </div>
            )}
          </div>

          {/* Sub-blok 2 (TM x-2) */}
          {tokensB.length > 0 && (
            <div
              className={cn(
                'rounded-xl p-3 border border-white/50 border-r-4 border-r-stone-900 shadow-sm space-y-2 transition-colors',
                showTajwid ? 'bg-white/90' : 'bg-white/25'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-black tracking-wide">
                  TM {id}-2 ({letter}-2)
                </span>
                <span className="text-[11px] font-extrabold text-stone-800">
                  {part2Range}
                </span>
              </div>
              <div className="flex flex-wrap justify-center items-start gap-x-1 gap-y-2" dir="rtl">
                {tokensB.map((t) => renderToken(t, 'text-stone-950'))}
              </div>
            </div>
          )}

          {showTajwid && <TajwidLegendBar />}

          {/* Terjemahan kalimat terintegrasi di dalam kotak atas (tanpa mengulang teks Arab) */}
          {(playingVerse || showTranslation) && (
            <div className="bg-white/75 rounded-xl p-3 border border-[#D4AF37]/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                  {playingVerse ? `Terjemahan Ayat ${playingVerse.verse_key}` : `Terjemahan TM ${id} (Blok ${letter})`}
                </span>
                {playingVerse && (
                  <span className="text-[10px] font-black text-primary">
                    Putaran {playback.loop + 1}/5
                  </span>
                )}
              </div>
              {showTranslation ? (
                <div className="space-y-1.5">
                  {verses.map((v: any) => {
                    const isCur = v.verse_key === playingVerseKey;
                    const text = v.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '') || 'Memuat terjemahan...';
                    return (
                      <p
                        key={v.verse_key}
                        className={cn(
                          'text-xs leading-relaxed rounded-lg px-2.5 py-1.5 border-l-4 transition-colors',
                          isCur
                            ? 'bg-amber-100/90 border-[#D4AF37] text-stone-950 font-semibold'
                            : 'bg-white/80 border-primary/40 text-stone-800'
                        )}
                      >
                        <span className="font-black text-primary mr-1.5">({v.verse_key.split(':')[1]})</span>
                        &ldquo;{text}&rdquo;
                      </p>
                    );
                  })}
                </div>
              ) : playingVerse ? (
                <p className="text-xs sm:text-sm text-stone-900 leading-relaxed italic font-medium bg-white/85 rounded-lg p-2.5 border-l-4 border-primary">
                  &ldquo;{playingVerse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '') || 'Memuat terjemahan...'}&rdquo;
                </p>
              ) : null}
            </div>
          )}
            </>
          )}
        </div>

        {!isLocked && needsComprehensionConfirm && (
          <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-[10px] font-black text-amber-950 text-center">
            <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              {state?.understood === false
                ? `Pahami arti dulu lalu klik "Sekarang Sudah Paham" di atas untuk membuka kotak TM ${id}-1.`
                : `Jawab "Sudah Paham" di atas terlebih dahulu untuk membuka kotak TM ${id}-1.`}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0 items-stretch">
          <CounterBox
            id={`step-${id}.a`}
            label={`TM ${id}-1 (${letter}-1) • ${part1Range}`}
            count={state.a.count}
            isLocked={countersLocked}
            onInc={(delta = 1) => addSubCount('a', delta)}
            canUndo={canUndo?.('a')}
            canReset={canReset && !isLocked}
            onReset={() => onResetCounter?.(`${id}.a`, `TM ${id}-1 (Blok ${letter}-1)`)}
            stepInfo={stepInfoFor?.('a')}
            color="maroon"
            threshold={PASS_THRESHOLD}
          />
          <CounterBox
            id={`step-${id}.b`}
            label={`TM ${id}-2 (${letter}-2) • ${part2Range}`}
            count={state.b.count}
            isLocked={countersLocked || state.a.count < PASS_THRESHOLD}
            onInc={(delta = 1) => addSubCount('b', delta)}
            canUndo={canUndo?.('b')}
            canReset={canReset && !isLocked}
            onReset={() => onResetCounter?.(`${id}.b`, `TM ${id}-2 (Blok ${letter}-2)`)}
            stepInfo={stepInfoFor?.('b')}
            color="darkMaroon"
            threshold={PASS_THRESHOLD}
          />
        </div>

        <div id={`step-${id}.combined`} className="flex flex-col gap-1.5 shrink-0 scroll-mt-24">
          <div className="relative">
          <LongPressCounterButton
            disabled={isCombinedLocked}
            onStep={(delta) => addSubCount('combined', delta)}
            className={cn(
              'w-full min-h-[5rem] h-auto flex flex-col items-center justify-center rounded-2xl font-black uppercase tracking-wider py-2.5 px-3 transition-all relative touch-manipulation select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
              stepInfoFor?.('combined')?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2',
              isCombinedDone
                ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-lg'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            <span className="text-[9.5px] sm:text-[10px] flex flex-wrap items-center justify-center gap-x-1 leading-tight opacity-85 mb-1 text-center px-7">
              {isCombinedLocked ? <Lock className="w-3 h-3 shrink-0" /> : null}
              <span>GABUNG TM {id} (BLOK {letter})</span>
              <span>• {isCombinedLocked ? 'TERKUNCI' : (isCombinedDone ? '+1 LAGI • TAHAN +5' : 'KETUK +1 • TAHAN +5')}</span>
            </span>
            <span className="text-2xl leading-none">
              {state.combined.count} <span className="text-sm opacity-70">/ {PASS_THRESHOLD}</span>
            </span>
            {isCombinedDone && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-black" />
              </div>
            )}
          </LongPressCounterButton>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <StepTag info={stepInfoFor?.('combined')} className="justify-start" />
            {(canUndo?.('combined') || (state.combined.count > 0 && canReset && !isLocked && onResetCounter)) && (
              <div className="flex items-center gap-1.5 ml-auto">
                {canUndo?.('combined') && (
                  <button
                    type="button"
                    onClick={() => addSubCount('combined', -1)}
                    title="Kurangi 1 (kelebihan pencet)"
                    aria-label="Kurangi 1"
                    className="h-6 px-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-black text-[11px] hover:bg-stone-100 active:scale-95 transition-all touch-manipulation"
                  >
                    −1
                  </button>
                )}
                {state.combined.count > 0 && canReset && !isLocked && onResetCounter && (
                  <button
                    type="button"
                    onClick={() => onResetCounter(`${id}.combined`, `Gabung TM ${id} (Blok ${letter})`)}
                    title={`Reset counter Gabung TM ${id} ke 0`}
                    className="h-6 px-2 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-700 font-bold text-[10px] inline-flex items-center gap-1 hover:bg-rose-100 active:scale-95 transition-all touch-manipulation"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaStep({ id: customId, stepKey, label, count, isLocked, onIncrement, highlight, canUndo, canReset, onReset, stepInfo, threshold = 10 }: any) {
  const isDone = !isLocked && count >= threshold;
  const elementId = customId || (stepKey ? `step-meta.${stepKey}` : (stepInfo ? `step-${stepInfo.key}` : undefined));
  return (
    <div
      id={elementId}
      className={cn(
        'relative p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between transition-all gap-3 scroll-mt-24',
        isDone ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-white border-primary/10',
        highlight && !isDone && 'border-primary bg-primary/5',
        isLocked && 'opacity-40 grayscale select-none'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0',
            isDone
              ? 'bg-[#D4AF37] text-black shadow-md'
              : highlight
              ? 'bg-primary text-white'
              : 'bg-primary/10 text-primary'
          )}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-current" />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest truncate">
            Sub-Repetisi Gabungan Antar Blok
          </span>
          <span
            className={cn(
              'text-[11px] font-black uppercase tracking-tight leading-snug break-words',
              highlight ? 'text-primary' : 'text-black'
            )}
          >
            {label}
          </span>
          <span className="text-[8px] font-bold text-muted-foreground">
            WAJIB MIN. {threshold}x SEBELUM MEMBUKA TAHAP BERIKUTNYA
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
        <div className="text-right flex flex-col items-end mr-1">
          <span className="text-base font-black text-black uppercase">
            {count} / {threshold}
          </span>
          <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all"
              style={{ width: `${Math.min(100, (count / threshold) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex-1 sm:flex-none sm:w-40 flex flex-col gap-1.5">
          <div className="relative">
            <LongPressCounterButton
              onStep={(delta) => onIncrement(delta)}
              disabled={isLocked}
              className={cn(
                'h-16 w-full rounded-2xl p-0 font-black transition-all shadow-md touch-manipulation select-none active:scale-[0.95] flex flex-col items-center justify-center disabled:pointer-events-none disabled:opacity-50',
                !isLocked && stepInfo?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2',
                isDone
                  ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 border-none'
                  : 'bg-primary text-white hover:bg-primary/90'
              )}
            >
              <span className="flex items-center justify-center gap-1.5 text-xl leading-none">
                {isDone && <Check className="w-5 h-5 stroke-[3]" />}
                +1
              </span>
              {!isLocked && (
                <span className="text-[9px] font-bold opacity-80 leading-none mt-1 tracking-wide">
                  Tahan +5
                </span>
              )}
            </LongPressCounterButton>
          </div>
          {(canUndo || (count > 0 && canReset && onReset)) && (
            <div className="flex items-center justify-center gap-1.5">
              {canUndo && (
                <button
                  type="button"
                  onClick={() => onIncrement(-1)}
                  title="Kurangi 1 (kelebihan pencet)"
                  aria-label="Kurangi 1"
                  className="h-7 px-3 rounded-lg border border-stone-300 bg-white text-stone-700 font-black text-[11px] hover:bg-stone-100 active:scale-95 transition-all touch-manipulation"
                >
                  −1
                </button>
              )}
              {count > 0 && canReset && onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  title={`Reset counter ${label} ke 0`}
                  className="h-7 px-2.5 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-700 font-bold text-[10px] inline-flex items-center gap-1 hover:bg-rose-100 active:scale-95 transition-all touch-manipulation"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset Counter
                </button>
              )}
            </div>
          )}
          <StepTag info={stepInfo} className="justify-center" />
        </div>
      </div>
    </div>
  );
}

function LongPressCounterButton({
  disabled,
  onStep,
  initialDelayMs = 450,
  repeatIntervalMs = 220,
  className,
  children,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onBlur,
  onContextMenu,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onStep: (delta: number) => void;
  initialDelayMs?: number;
  repeatIntervalMs?: number;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const onStepRef = useRef(onStep);
  const disabledRef = useRef(disabled);

  onStepRef.current = onStep;
  disabledRef.current = disabled;

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (disabled) clearTimers();
  }, [disabled, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (resetClickTimerRef.current !== null) clearTimeout(resetClickTimerRef.current);
    };
  }, [clearTimers]);

  const stopAndScheduleClickReset = () => {
    clearTimers();
    if (didLongPressRef.current) {
      if (resetClickTimerRef.current !== null) clearTimeout(resetClickTimerRef.current);
      resetClickTimerRef.current = setTimeout(() => {
        didLongPressRef.current = false;
      }, 120);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (disabledRef.current) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (resetClickTimerRef.current !== null) {
          clearTimeout(resetClickTimerRef.current);
          resetClickTimerRef.current = null;
        }
        clearTimers();
        didLongPressRef.current = false;
        timerRef.current = setTimeout(() => {
          if (disabledRef.current) return;
          didLongPressRef.current = true;
          onStepRef.current(5);
          intervalRef.current = setInterval(() => {
            if (disabledRef.current) {
              clearTimers();
              return;
            }
            onStepRef.current(5);
          }, repeatIntervalMs);
        }, initialDelayMs);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        stopAndScheduleClickReset();
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        stopAndScheduleClickReset();
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        stopAndScheduleClickReset();
      }}
      onBlur={(e) => {
        onBlur?.(e);
        stopAndScheduleClickReset();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e);
      }}
      onClick={(e) => {
        if (disabledRef.current) return;
        if (didLongPressRef.current) {
          e.preventDefault();
          e.stopPropagation();
          didLongPressRef.current = false;
          return;
        }
        onStepRef.current(1);
      }}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}

function CounterBox({ id: customId, label, count, isLocked, onInc, color, threshold, canUndo, canReset, onReset, stepInfo }: any) {
  const isDone = !isLocked && count >= threshold;
  const themes: any = {
    maroon: isDone
      ? 'bg-[#991B1B] text-white border-[#991B1B]'
      : 'bg-white border-[#B91C1C]/35 text-[#991B1B] hover:bg-rose-50/70',
    darkMaroon: isDone
      ? 'bg-stone-900 text-white border-stone-900'
      : 'bg-white border-stone-800/35 text-stone-900 hover:bg-stone-100/70',
  };
  const elementId = customId || (stepInfo ? `step-${stepInfo.key}` : undefined);
  return (
    <div id={elementId} className="flex flex-col gap-1.5 h-full scroll-mt-24">
    <div className="relative">
    <LongPressCounterButton
      disabled={isLocked}
      onStep={(delta) => onInc(delta)}
      className={cn(
        'rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative px-2 py-3 h-[98px] sm:h-[104px] w-full shadow-sm gap-1 touch-manipulation select-none',
        isLocked ? 'opacity-50 grayscale cursor-not-allowed bg-muted shadow-none' : themes[color],
        !isLocked && 'active:scale-[0.96] cursor-pointer',
        stepInfo?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2'
      )}
    >
      <span className="text-[10px] font-black uppercase opacity-70 tracking-wider truncate w-full text-center leading-none px-6">
        {label}
      </span>
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-3xl font-black">{count}</span>
        <span className="text-xs font-bold opacity-50">/ {threshold}</span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-black opacity-75 leading-tight text-center">
        {isLocked ? 'TERKUNCI' : isDone ? '+1 LAGI • TAHAN +5' : 'KETUK +1 • TAHAN +5'}
      </span>

      {isLocked && <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground" />}
      {isDone && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-current" />}
    </LongPressCounterButton>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-1">
      <StepTag info={stepInfo} className="justify-start" />
      {(canUndo || (count > 0 && canReset && onReset)) && (
        <div className="flex items-center gap-1 ml-auto">
          {canUndo && (
            <button
              type="button"
              onClick={() => onInc(-1)}
              title="Kurangi 1 (kelebihan pencet)"
              aria-label="Kurangi 1"
              className="h-6 px-2 rounded-lg border border-stone-300 bg-white text-stone-700 font-black text-[11px] hover:bg-stone-100 active:scale-95 transition-all touch-manipulation"
            >
              −1
            </button>
          )}
          {count > 0 && canReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              title={`Reset counter ${label} ke 0`}
              className="h-6 px-2 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-700 font-bold text-[10px] inline-flex items-center gap-1 hover:bg-rose-100 active:scale-95 transition-all touch-manipulation"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

interface StepInfo {
  key: string;
  isTarget: boolean;
  isOverdue?: boolean;
  done: boolean;
  date: string | null;
  todayKey: string;
}

/** Bintang "target hari ini" + keterangan tanggal jadwal langkah */
function StepTag({ info, className }: { info?: StepInfo | null; className?: string }) {
  if (!info) return null;
  const pretty = info.date ? formatDateID(info.date, { withDay: true, shortYear: true }) : null;
  const todayPretty = info.todayKey ? formatDateID(info.todayKey, { withDay: true, shortYear: true }) : null;
  const isOverdue = info.isOverdue ?? (!info.done && !!info.date && info.date < info.todayKey);
  const dateLabel = pretty || todayPretty;
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {info.isTarget && !isOverdue && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#D4AF37] text-black text-[9px] font-black">
          <Star className="w-2.5 h-2.5 fill-current" /> TARGET HARI INI
        </span>
      )}
      {info.done ? (
        <span className="text-[9px] font-black text-emerald-700">
          ✓ Tuntas{dateLabel ? ` • ${dateLabel}` : ''}
        </span>
      ) : isOverdue ? (
        <span className="px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[9px] font-black text-rose-700">
          Terlewat • {pretty}
        </span>
      ) : pretty ? (
        <span className="text-[9px] font-bold text-stone-500">
          Jadwal: {info.date === info.todayKey ? `hari ini (${pretty})` : pretty}
        </span>
      ) : null}
    </div>
  );
}
