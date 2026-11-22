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
  Pause,
  Play,
  Plus,
  Radio,
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
import { cn } from '@/lib/utils';
import { useUser, useDoc, useCollection, addDocumentNonBlocking, db } from '@/db';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import { useFontSize } from '@/contexts/font-size-context';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { QURAN_CHAPTERS } from '@/lib/quran-data';
import { SURAH_START_PAGES } from '@/lib/quran-mapping';
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
  getStepMinCount,
  estimateClicksForNextSteps,
  getBlockListenCount,
  getMetaThreshold,
  isBlockListenDone,
  generateTikrarStepSchedule,
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
  translation?: {
    text: string;
  };
}

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
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

  const [juz, setJuz] = useState<number>(targetJuz || 30);
  const [page, setPage] = useState<number>(targetPage || 582);
  const [customPageConfig, setCustomPageConfig] = useState<PageBlockConfig | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/tikrar/blocks?page=${page}`)
      .then((r) => r.json())
      .then((res) => {
        if (active) {
          setCustomPageConfig(res?.success && res?.config ? res.config : null);
        }
      })
      .catch(() => {
        if (active) setCustomPageConfig(null);
      });
    return () => {
      active = false;
    };
  }, [page]);
  const { fontSize } = useFontSize();
  const [hasInitializedPage, setHasInitializedPage] = useState(false);
  const [isRequestingExam, setIsRequestingExam] = useState(false);
  const [tasmiQueue, setTasmiQueue] = useState<any[]>([]);
  const [serverMySubmissions, setServerMySubmissions] = useState<any[] | null>(null);
  const [loadingTasmiQueue, setLoadingTasmiQueue] = useState(false);

  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  // State & audio ref

  // Tahap 0 & Sub-repetisi state
  const [prepListenCount, setPrepListenCount] = useState(0);
  const [prepTranslationDone, setPrepTranslationDone] = useState(false);

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
  const blockPlaybackRef = useRef<{ block: number } | null>(null);

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
  // Target aktif dari Target & Jadwal: menentukan rentang halaman & gerbang ujian 30 soal
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

  const pageLockReason = useMemo(() => {
    if (!user) return null;
    if (!activeTarget) return 'Isi Target & Jadwal terlebih dahulu sebelum mulai berlatih.';
    if (clearedPages.has(page) || isPriorMemorizedPage) return null;
    if (page < activeTarget.startPage && page >= juzPageRange.startPage) return null;
    if (page > activeTarget.unlockedPage) {
      return `Halaman ${page} masih terkunci. Luluskan ujian ${QUIZ_QUESTION_COUNT} soal Halaman ${activeTarget.unlockedPage} terlebih dahulu.`;
    }
    return null;
  }, [user, activeTarget, clearedPages, isPriorMemorizedPage, page, juzPageRange]);
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

  const [blocks, setBlocks] = useState<any>({
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
  });

  const [metaCounts, setMetaCounts] = useState<Record<string, number>>({
    '1_2': 0,
    '2_3': 0,
    '1_2_3': 0,
    '3_4': 0,
    '2_3_4': 0,
    '1_2_3_4': 0,
  });

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

  // Fetch verses for `page`
  useEffect(() => {
    async function fetchVerses() {
      setLoading(true);
      if (audioRef.current) audioRef.current.pause();
      blockPlaybackRef.current = null;
      setBlockPlayback(null);
      setIsAutoPlaying(false);
      isAutoPlayingRef.current = false;
      setPlayingVerseIndex(null);

      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_page/${page}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33`
        );
        if (!res.ok) throw new Error('Gagal memuat ayat');
        const data = await res.json();

        if (data && data.verses && data.verses.length > 0) {
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
        setLoading(false);
      }
    }

    fetchVerses();
  }, [page]);

  const isHydratedRef = useRef(false);
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => setSoundOn(isTikrarSoundEnabled()), []);
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

      let nextPrepListen = 0;
      let nextPrepTrans = false;
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
              };
            }
          }
          if (saved.metaCounts) {
            Object.keys(nextMeta).forEach((k) => {
              nextMeta[k] = Number(saved.metaCounts[k]) || 0;
            });
          }
        } catch {}
      }

      // 2. Ambil dari Database jika user sudah login
      if (user?.id) {
        try {
          const res = await authFetch(`/api/tikrar/progress?page=${page}`);
          if (res.ok) {
            const json = await res.json();
            const dbProg = json.data;
            if (dbProg) {
              nextPrepListen = Math.max(nextPrepListen, Number(dbProg.prep_listen_count) || 0);
              nextPrepTrans = nextPrepTrans || Boolean(dbProg.prep_translation_done);
              if (dbProg.blocks) {
                for (const b of [1, 2, 3, 4] as const) {
                  if (dbProg.blocks[b]) {
                    nextBlocks[b] = {
                      a: { count: Math.max(nextBlocks[b].a.count, Number(dbProg.blocks[b]?.a?.count) || 0) },
                      b: { count: Math.max(nextBlocks[b].b.count, Number(dbProg.blocks[b]?.b?.count) || 0) },
                      combined: { count: Math.max(nextBlocks[b].combined.count, Number(dbProg.blocks[b]?.combined?.count) || 0) },
                      listen: { count: Math.max(nextBlocks[b].listen.count, Number(dbProg.blocks[b]?.listen?.count) || 0) },
                    };
                  }
                }
              }
              if (dbProg.meta_counts) {
                Object.keys(nextMeta).forEach((k) => {
                  nextMeta[k] = Math.max(nextMeta[k], Number(dbProg.meta_counts[k]) || 0);
                });
              }
            }
          }
        } catch (e) {
          console.warn('Gagal memuat progres dari database:', e);
        }
      }

      // 3. Gabungkan DB completed blocks agar kunci berurutan konsisten
      if (completedBlocksAllTime.size > 0) {
        for (const b of [1, 2, 3, 4] as const) {
          if (completedBlocksAllTime.has(b)) {
            nextBlocks[b] = {
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
      const blockStarted = (b: 1 | 2 | 3 | 4) =>
        nextBlocks[b].a.count > 0 || nextBlocks[b].b.count > 0 || nextBlocks[b].combined.count > 0;
      if (blockStarted(3)) {
        nextMeta['1_2'] = Math.max(nextMeta['1_2'], getMetaThreshold('1_2'));
      }
      if (blockStarted(4)) {
        nextMeta['1_2'] = Math.max(nextMeta['1_2'], getMetaThreshold('1_2'));
        nextMeta['2_3'] = Math.max(nextMeta['2_3'], getMetaThreshold('2_3'));
        nextMeta['1_2_3'] = Math.max(nextMeta['1_2_3'], getMetaThreshold('1_2_3'));
      }
      if (isSelectedPageCleared) {
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

    loadProgress();

    return () => {
      isCancelled = true;
    };
  }, [page, isSelectedPageCleared, user?.id]);

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

  // Simpan progres ke localStorage dan database setiap user klik angka setiap tahapan
  useEffect(() => {
    isHydratedRef.current = false;
  }, [page]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;

    // 1. Simpan ke localStorage instan
    const timerLocal = setTimeout(() => {
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
    }, 200);

    // 2. Simpan ke database jika sudah melewati inisialisasi awal
    let timerDb: NodeJS.Timeout | null = null;
    if (user?.id && isHydratedRef.current && !pageLockReason) {
      timerDb = setTimeout(async () => {
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
            if (act && typeof act.clicks === 'number') setLiveTodayClicks(act.clicks);
            const stepsToday = Number(act?.stepsToday) || 0;
            if (awarded > 0 || stepsToday !== lastStepsTodayRef.current) {
              lastStepsTodayRef.current = stepsToday;
              await Promise.all([refreshLogs(), refreshSchedules(), refreshUser()]);
              // Hanya panggil onDataChanged jika target harian baru saja tercapai untuk mencegah refresh berulang
              if (act?.justMetTarget) {
                onDataChanged?.();
              }
            }
          }
        } catch (e) {
          undoKeys.forEach((k) => pendingUndoKeysRef.current.add(k));
          console.error('Gagal sync progres ke database:', e);
        }
      }, 400);
    }

    return () => {
      clearTimeout(timerLocal);
      if (timerDb) clearTimeout(timerDb);
    };
  }, [prepListenCount, prepTranslationDone, blocks, metaCounts, page, juz, loading, user?.id, totalProgress, pageLockReason]);

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

  // Qari MP3Quran hanya punya audio per surah; simak per blok memakai audio per ayat
  const blockReciterId = currentReciter.provider === 'mp3quran' ? 21203 : currentReciter.id;
  const blockReciterIdRef = useRef(blockReciterId);
  blockReciterIdRef.current = blockReciterId;
  const blockVersesRef = useRef(blockVerses);
  blockVersesRef.current = blockVerses;

  const stopBlockAudio = () => {
    blockPlaybackRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    setBlockPlayback(null);
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
      const next = loop + 1;
      if (next < PREP_LISTEN_THRESHOLD) {
        playBlockVerse(block, 0, next);
      } else {
        stopBlockAudio();
        playTikrarDone();
        toast({
          title: `Simak TM ${block} (Blok ${BLOCK_LETTERS[block]}) Tuntas 5x`,
          description: 'Counter blok ini sudah terbuka. Bismillah, mulai menghafal!',
        });
        setTimeout(() => {
          document.getElementById(`step-${block}.a`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
      return;
    }
    setBlockPlayback({ block, verseIdx: vIdx, loop });
    const url = await getAudioUrlByVerseKey(list[vIdx].verse_key, blockReciterIdRef.current);
    if (blockPlaybackRef.current?.block !== block) return;
    if (!url) {
      stopBlockAudio();
      toast({ variant: 'destructive', title: 'Audio gagal dimuat', description: 'Coba lagi atau pilih qari lain.' });
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.ontimeupdate = null;
    audio.src = url;
    audio.onended = () => playBlockVerse(block, vIdx + 1, loop);
    audio.play().catch(() => stopBlockAudio());
  };

  const startBlockAudio = (block: 1 | 2 | 3 | 4) => {
    stopBlockAudio();
    const listened = blocks[block]?.listen?.count || 0;
    blockPlaybackRef.current = { block };
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
  const isTuntasTM = (mid: number) => blocks[mid].combined.count >= PASS_THRESHOLD;
  const isMetaTuntas = (key: string) => (metaCounts[key] || 0) >= getMetaThreshold(key);
  const isExamStageOpen = isMetaTuntas('1_2_3_4');
  const [globalShowVerses, setGlobalShowVerses] = useState(false);
  const [examRevealSeq, setExamRevealSeq] = useState(0);
  useEffect(() => {
    setGlobalShowVerses(false);
    setExamRevealSeq((s) => s + 1);
  }, [page]);

  // Tombol -1: hanya untuk counter yang langkah berikutnya belum dimulai
  const canUndoKey = (key: string) =>
    !pageLockReason &&
    !clearedPages.has(page) &&
    canUndoStep(key, { prep_listen_count: prepListenCount, prep_translation_done: prepTranslationDone, blocks, meta_counts: metaCounts });
  const markUndo = (key: string) => {
    pendingUndoKeysRef.current.add(key);
    playTikrarUndo();
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
      playTikrarCount(nextCount, threshold);
    }

    setMetaCounts((p) => {
      const minFloor = getStepMinCount(`meta.${key}`, {
        prep_listen_count: prepListenCount,
        prep_translation_done: prepTranslationDone,
        blocks,
        meta_counts: p,
      });
      return {
        ...p,
        // Boleh lebih sampai berapa saja, bila langkah berikutnya sudah berjalan minimal minFloor
        [key]: Math.max(minFloor, (p[key] || 0) + delta),
      };
    });

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

  const stepInfo = (key: string): StepInfo | null => {
    if (!activeTarget || !user) return null;
    const step = TIKRAR_STEPS.find((st) => st.key === key);
    if (!step) return null;
    const done = step.kind === 'quiz' ? clearedPages.has(page) : stepValue(step, localProgress) >= step.target;
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
    () => ([1, 2, 3, 4] as const).filter((id) => blocks[id]?.combined?.count >= PASS_THRESHOLD),
    [blocks]
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



  if (isUserDataLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#6D123F]" />
      </div>
    );
  }

  const activeExamStatusLabel = activeExam
    ? activeExam.passed
      ? `LULUS (Skor ${activeExam.score || 100})`
      : 'MENUNGGU JADWAL ADMIN'
    : null;

  const scheduledLettersText =
    scheduledBlockSetOnPage.size > 0
      ? `Target Jadwal: Blok ${Array.from(scheduledBlockSetOnPage)
          .sort((a, b) => a - b)
          .map((b) => BLOCK_LETTERS[b])
          .join(' & ')}`
      : targetLabelPerDay;

  return (
    <div className="space-y-6 pb-32">
      {/* Header Program, Halaqah Live Zoom & Progres Halaman */}
      <Card className="border-none bg-[#6D123F] text-white shadow-xl overflow-hidden relative border-b-4 border-[#D4AF37]">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <CalendarDays className="w-40 h-40 text-[#D4AF37]" />
        </div>
        <CardContent className="p-5 sm:p-6 relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
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

      {/* Bar Navigasi Juz, Halaman & Audio */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-4 rounded-2xl border shadow-sm sm:sticky sm:top-20 z-20 backdrop-blur-md border-[#6D123F]/10">
        {/* Baris 1: Kontrol Halaman Terkunci 1 Baris (Juz, <, Hal, >) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto flex-nowrap min-w-0">
          <select
            aria-label="Pilih Juz"
            value={juz}
            disabled={loading || Boolean(activeTarget)}
            onChange={(e) => {
              const j = Number(e.target.value);
              setJuz(j);
              setPage(JUZ_PAGES[j - 1] || 1);
            }}
            className="h-10 rounded-xl border-2 border-[#6D123F]/20 bg-white px-2 sm:px-2.5 text-xs sm:text-sm font-black text-[#6D123F] shrink-0 w-[78px] sm:w-auto"
          >
            {JUZ_PAGES.map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Juz {i + 1}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(juzPageRange.startPage, p - 1))}
            disabled={loading || page <= juzPageRange.startPage}
            className="rounded-xl h-10 w-9 sm:w-10 shrink-0 border-[#6D123F]/20 hover:bg-[#6D123F]/5"
          >
            <ChevronLeft className="h-5 w-5 text-[#6D123F]" />
          </Button>

          <select
            aria-label="Pilih Halaman Mushaf"
            value={page}
            disabled={loading}
            onChange={(e) => setPage(Number(e.target.value))}
            className="h-10 rounded-xl border-2 border-[#6D123F]/20 bg-stone-50 px-2 sm:px-2.5 text-xs sm:text-sm font-black text-[#6D123F] flex-1 min-w-0 truncate"
          >
            {Array.from({ length: juzPageRange.endPage - juzPageRange.startPage + 1 }, (_, idx) => {
              const pNum = juzPageRange.startPage + idx;
              const pCleared = clearedPages.has(pNum);
              const isPriorPage =
                priorMemorizedSet.has(pNum) ||
                (Boolean(activeTarget) && juz === activeTarget!.juz && pNum < activeTarget!.startPage);
              const pLocked =
                Boolean(activeTarget) &&
                !pCleared &&
                !isPriorPage &&
                (juz !== activeTarget!.juz || pNum > (activeTarget?.unlockedPage || 0));
              return (
                <option key={pNum} value={pNum}>
                  {pCleared ? '★ ' : isPriorPage ? '✓ ' : pLocked ? '🔒 ' : ''}Hal. {pNum}
                  {pNum === recommendedPage
                    ? ' (Halaman Aktif)'
                    : pCleared
                    ? ' (Lulus Ujian)'
                    : isPriorPage
                    ? ' (Hafalan Awal)'
                    : pLocked
                    ? ' (Terkunci)'
                    : ''}
                </option>
              );
            })}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(juzPageRange.endPage, p + 1))}
            disabled={loading || page >= juzPageRange.endPage}
            className="rounded-xl h-10 w-9 sm:w-10 shrink-0 border-[#6D123F]/20 hover:bg-[#6D123F]/5"
          >
            <ChevronRight className="h-5 w-5 text-[#6D123F]" />
          </Button>
        </div>

        {/* Baris 2 Audio & Quick Action */}
        <div className="flex items-center justify-between md:justify-end gap-1.5 sm:gap-2 w-full md:w-auto shrink-0 flex-nowrap min-w-0">
          {activeTarget && (juz !== activeTarget.juz || page !== recommendedPage) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (activeTarget) setJuz(activeTarget.juz);
                setPage(recommendedPage);
              }}
              className="h-9 px-2 sm:px-2.5 text-[11px] sm:text-xs font-black text-[#6D123F] hover:bg-[#6D123F]/10 truncate"
            >
              Ke Hal. {recommendedPage} →
            </Button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 gap-2 font-bold border-[#6D123F]/20 text-[#6D123F]"
                >
                  <Mic2 className="w-4 h-4" />
                  <span className="max-w-[140px] truncate text-xs">
                    {RECITERS.find((r) => r.id === selectedReciterId)?.name || 'Pilih Qari'}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[85dvh] flex flex-col p-0 overflow-hidden rounded-2xl">
                <DialogHeader className="p-5 pb-2 shrink-0 border-b border-stone-100">
                  <DialogTitle className="text-[#6D123F] font-black">Pilih Qari Al-Qur&apos;an</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Pilih qari untuk audio simak per blok.
                  </DialogDescription>
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
                            ? 'bg-[#6D123F] text-white hover:bg-[#6b0000] hover:text-white border-[#6D123F]'
                            : 'border-muted-foreground/20 hover:border-[#6D123F]/30 hover:bg-[#6D123F]/5'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                              isSelected
                                ? 'bg-white text-[#6D123F]'
                                : 'bg-[#6D123F]/10 text-[#6D123F]'
                            )}
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : <Mic2 className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-bold leading-tight text-sm">{r.name}</div>
                            {r.provider === 'mp3quran' ? (
                              <div
                                className={cn(
                                  'text-[10px] font-normal mt-0.5',
                                  isSelected ? 'text-amber-200' : 'text-amber-800'
                                )}
                              >
                                {r.description || "Streaming CDN Resmi MP3Quran"}
                              </div>
                            ) : r.provider === 'everyayah' ? (
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
                        {r.provider === 'mp3quran' && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] uppercase px-2 py-0.5 font-bold',
                              isSelected ? 'border-white/40 text-white' : 'border-amber-500/50 text-amber-800'
                            )}
                          >
                            CDN Resmi
                          </Badge>
                        )}
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
            className="h-9 text-xs font-bold border-[#6D123F]/20 text-[#6D123F]"
            title={soundOn ? 'Matikan bunyi counter' : 'Nyalakan bunyi counter'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 mr-1.5" /> : <VolumeX className="w-3.5 h-3.5 mr-1.5" />}
            Bunyi {soundOn ? 'On' : 'Off'}
          </Button>
          {onOpenScheduleTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenScheduleTab}
              className="h-9 text-xs font-bold border-[#6D123F]/20 text-[#6D123F] hidden sm:inline-flex"
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
              <ClipboardCheck className="w-4 h-4 text-[#6D123F] shrink-0" />
              <p className="text-xs font-black text-amber-950">
                {summary!.pendingQuizPages.length} halaman sudah dihafal tetapi belum lulus ujian pilihan ganda (30 soal):
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary!.pendingQuizPages.slice(0, 12).map((pg) => (
              <Link
                key={pg.page}
                href={`/tikrar/ujian?page=${pg.page}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-300 text-[11px] font-black text-[#6D123F] hover:bg-[#6D123F] hover:text-white transition-colors"
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

      {activeTarget && page < activeTarget.startPage && page >= juzPageRange.startPage && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-950">
              Halaman {page} adalah bagian awal Juz {activeTarget.juz} (sebelum target aktif Hal. {activeTarget.startPage}–{activeTarget.endPage}). Boleh dibaca dan dimurajaah kapan saja.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPage(activeTarget.unlockedPage)}
            className="border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-bold text-xs h-8 px-3 rounded-xl shrink-0"
          >
            Ke Halaman Aktif ({activeTarget.unlockedPage}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
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
              onClick={() => setPage(activeTarget.unlockedPage)}
              className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
            >
              Ke Halaman {activeTarget.unlockedPage}
            </Button>
          ) : (
            onOpenScheduleTab && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenScheduleTab}
                className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
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
                <p className="text-xs font-black uppercase tracking-wider text-[#6D123F] flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" /> Target hari ini ({activePace.dailyPortionLabel}) •{' '}
                  {summary.today.stepsToday}/{summary.today.dailyQuota} langkah tuntas
                </p>
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-stone-700">
                    <span>
                      Hari ini: <span className="font-black text-[#6D123F]">{todayClicks}/{targetTotalClicks} klik</span>
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
                      onClick={() => (t.page === page ? scrollToStep(t.key) : setPage(t.page))}
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
                        onClick={() => (ot.page === page ? scrollToStep(ot.key) : setPage(ot.page))}
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
              onClick={() => (todayTargets[0].page === page ? scrollToStep(todayTargets[0].key) : setPage(todayTargets[0].page))}
              className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-black text-xs h-10 px-4 rounded-xl shrink-0"
            >
              {todayTargets[0].page === page ? 'Ke Counter Target ↓' : `Buka Hal. ${todayTargets[0].page}`}
            </Button>
          )}
        </div>
      )}

      <div className={cn(pageLockReason && 'pointer-events-none opacity-50 select-none')} aria-disabled={Boolean(pageLockReason)}>
      <TooltipProvider delayDuration={0}>
        {/* Alur Kunci Berurutan: Blok A..D & Sub-Repetisi Gabungan (Opsi B) */}
        <div className="flex flex-col gap-8 mt-8">
          <div className="bg-[#6D123F] text-white p-4 rounded-2xl border-2 border-[#D4AF37] flex items-start gap-3 shadow-lg">
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

          {isExamStageOpen && (
            <div className="bg-amber-50/90 border-2 border-[#D4AF37] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-5 h-5 text-[#6D123F] shrink-0" />
                <div>
                  <p className="text-xs font-black text-[#6D123F]">
                    Mode Siap Ujian: Teks ayat pada blok TM disembunyikan
                  </p>
                  <p className="text-[11px] text-stone-700 font-medium">
                    Tahap Ujian Halaman sudah terbuka. Tampilkan kembali teks ayat kapan saja jika ingin murajaah ulang.
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
                className="h-9 px-3.5 rounded-xl bg-white hover:bg-[#6D123F] hover:text-white border-[#6D123F]/30 text-[#6D123F] text-xs font-black shrink-0"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              onStopAudio={stopBlockAudio}
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
              onIncrement={setBlocks}
              fontSize={fontSize}
              letter="A"
              isExamStageOpen={isExamStageOpen}
              globalShowVerses={globalShowVerses}
              examRevealSeq={examRevealSeq}
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
              onStopAudio={stopBlockAudio}
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
              onIncrement={setBlocks}
              fontSize={fontSize}
              letter="B"
              isExamStageOpen={isExamStageOpen}
              globalShowVerses={globalShowVerses}
              examRevealSeq={examRevealSeq}
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
              onStopAudio={stopBlockAudio}
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
            onIncrement={setBlocks}
            fontSize={fontSize}
            letter="C"
            isExamStageOpen={isExamStageOpen}
            globalShowVerses={globalShowVerses}
            examRevealSeq={examRevealSeq}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetaStep
              stepKey="2_3"
              label="GABUNG TM 2 & TM 3 (BLOK B & C)"
              count={metaCounts['2_3']}
              threshold={10}
              isLocked={!isTuntasTM(3)}
              onIncrement={(delta = 1) => adjustMeta('2_3', delta)}
              canUndo={canUndoKey('meta.2_3')}
              stepInfo={stepInfo('meta.2_3')}
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
              onStopAudio={stopBlockAudio}
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
            onIncrement={setBlocks}
            fontSize={fontSize}
            letter="D"
            isExamStageOpen={isExamStageOpen}
            globalShowVerses={globalShowVerses}
            examRevealSeq={examRevealSeq}
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
                      ujian halaman 30 soal &amp; setoran Tasmi&apos; ke muallimah.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in duration-500">
                  <Card className="border-none bg-[#6D123F] text-white shadow-xl overflow-hidden border-b-4 border-[#D4AF37]">
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
                          Sambung ayat, tebak nomor ayat, lengkapi potongan kata, urutan ayat &amp; arti.
                          Lulus minimal {QUIZ_PASS_PERCENT}% untuk membuka halaman berikutnya.
                        </p>
                        {lastQuizOnPage && (
                          <p className="text-[11px] font-black text-[#D4AF37]">
                            Hasil terakhir: {lastQuizOnPage.correct}/{lastQuizOnPage.total} ({lastQuizOnPage.score}%)
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
                            ? 'bg-[#6D123F] text-white border-[#D4AF37]'
                            : isSubRevision
                            ? 'bg-rose-50 text-rose-950 border-rose-400 border-2'
                            : 'bg-white text-[#6D123F] border-[#D4AF37] border-2'
                        )}
                      >
                        <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div
                                className={cn(
                                  'w-12 h-12 rounded-2xl flex items-center justify-center',
                                  isSubPassed || isSubPending ? 'bg-white/15' : 'bg-[#6D123F]/10'
                                )}
                              >
                                {isSubPassed ? (
                                  <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
                                ) : isSubPending ? (
                                  <Clock className="w-6 h-6 text-[#D4AF37]" />
                                ) : (
                                  <MessageSquare className="w-6 h-6 text-[#6D123F]" />
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
                              className="bg-[#6D123F] text-white font-black w-full rounded-xl hover:bg-[#6D123F]/90 h-12 shadow-lg"
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
                    <Clock className="w-4 h-4 text-[#6D123F]" />
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
                      className="h-7 px-2 text-[11px] font-bold text-[#6D123F]"
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
                          <span className="w-6 h-6 rounded-lg bg-[#6D123F] text-white font-black text-[11px] flex items-center justify-center shrink-0">
                            #{q.queueNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-stone-900 truncate">{q.name}</span>
                              {q.isMe && (
                                <Badge className="bg-[#6D123F] text-white text-[9px] font-black h-4 px-1.5">
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
                className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
              >
                Lanjut ke Halaman {page + 1} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

        </div>
      </TooltipProvider>
      </div>
    </div>
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
  getMinCount,
  customConfig,
  allPageVerses,
  isExamStageOpen = false,
  globalShowVerses = false,
  examRevealSeq = 0,
}: any) {
  const isDoneG = state.combined.count >= PASS_THRESHOLD;
  const isPlaying = Boolean(playback);
  const playingVerse = isPlaying ? verses[playback.verseIdx] : null;
  const playingVerseKey = playingVerse?.verse_key || null;
  // Counter blok terbuka setelah blok disimak 5x
  const countersLocked = isLocked || !listenDone;

  // Arti kata: tetap tampil 2,5 detik setelah kursor pergi; ketuk untuk menahan/menutup
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [pinnedWord, setPinnedWord] = useState<string | null>(null);
  const [showPerKata, setShowPerKata] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [revealInExam, setRevealInExam] = useState(false);
  useEffect(() => {
    setRevealInExam(globalShowVerses);
  }, [globalShowVerses, examRevealSeq]);
  const isVerseHidden = Boolean(isExamStageOpen && !revealInExam);
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
    const currentCount = state?.[part]?.count || 0;
    const nextCount = currentCount + delta;
    if (delta > 0) playTikrarCount(nextCount, PASS_THRESHOLD);
    if (delta < 0) {
      if (!canUndo?.(part)) return;
      onUndo?.(part);
    }
    onIncrement((p: any) => {
      const minFloor = getMinCount ? getMinCount(part) : 0;
      return {
        ...p,
        [id]: {
          ...p[id],
          [part]: {
            // Boleh lebih sampai berapa saja, bila langkah berikutnya sudah dimulai minimal minFloor
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
                  pinnedWord === wid && 'ring-2 ring-[#6D123F]/40'
                )}
              >
                <span
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.55 }}
                  className={cn('font-arabic', colorClass)}
                >
                  {token.data.text_uthmani}
                </span>
                <span
                  dir="ltr"
                  className="text-[10px] font-sans font-semibold text-[#6D123F] leading-tight text-center mt-0.5 max-w-[92px] break-words"
                >
                  {token.data.translation?.text || '-'}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="bg-[#6D123F] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
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
              {token.data.text_uthmani}
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="bg-[#6D123F] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
              <p className="text-xs font-bold">{token.data.translation?.text || '...'}</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      );
    }
    return (
      <span
        key={`${token.verse_key}-m`}
        className="inline-flex items-center justify-center px-2 rounded-full border border-[#6D123F]/20 text-[10px] font-bold mx-1 bg-white translate-y-[-2px]"
      >
        {token.text}
      </span>
    );
  };

  const isCombinedLocked = countersLocked || state.b.count < PASS_THRESHOLD;

  return (
    <Card
      className={cn(
        'border-2 transition-all shadow-md overflow-hidden flex flex-col h-full',
        isDoneG ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[#D4AF37]/10' : theme.cardBorder,
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
        <div className="flex items-center gap-1.5 shrink-0">
          {(['a', 'b', 'combined'] as const).some((part) => stepInfoFor?.(part)?.isTarget) && (
            <Badge className="bg-[#D4AF37] text-black hover:bg-[#D4AF37] font-black text-[8px] tracking-widest h-4 gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> TARGET HARI INI
            </Badge>
          )}
          {isSavedInDb ? (
            <Badge className="bg-emerald-400 text-black font-black text-[8px] tracking-widest h-4">
              TERCATAT
            </Badge>
          ) : isDoneG ? (
            <Badge className="bg-[#D4AF37] text-black font-black text-[8px] tracking-widest h-4">
              TUNTAS
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-4 overflow-hidden">
        {/* Simak audio per blok (wajib 5x sebelum counter blok terbuka) */}
        <div
          id={id === 1 ? 'step-prep' : `step-${id}.listen`}
          className={cn(
            'rounded-2xl border-2 p-3 space-y-2 scroll-mt-24',
            listenDone ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-[#6D123F]/20 bg-white',
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
                ? 'bg-[#6D123F] text-white hover:bg-[#6D123F]/90'
                : listenDone
                ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90'
                : 'bg-[#6D123F] text-white hover:bg-[#6D123F]/90'
            )}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" /> Jeda • Putaran {playback.loop + 1}/5
              </>
            ) : (
              <>
                <Headphones className="w-5 h-5" />
                {listenDone ? `Ulangi Simak TM ${id} (Blok ${letter})` : `Simak TM ${id} (${listenCount}/5)`}
              </>
            )}
          </Button>
          {!listenDone && !isLocked && (
            <p className="text-[10px] font-bold text-center text-stone-600">
              Simak audio blok ini 5x dulu untuk membuka counter.
            </p>
          )}
          <StepTag info={listenStepInfo} className="justify-center" />
        </div>

        <div
          className={cn(
            "p-3 sm:p-4 rounded-2xl border-2 flex-1 overflow-y-auto no-scrollbar space-y-3",
            theme.verseBg
          )}
        >
          {isVerseHidden ? (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 gap-3 bg-white/60 rounded-xl border border-dashed border-[#6D123F]/25">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#6D123F]/15">
                <EyeOff className="w-5 h-5 text-[#6D123F]" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-black text-[#6D123F]">
                  Teks Ayat Disembunyikan (Siap Ujian)
                </p>
                <p className="text-[11px] font-medium text-stone-700 leading-relaxed">
                  Tahap Ujian Halaman sudah terbuka. Teks ayat disembunyikan agar hafalan benar-benar teruji.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevealInExam(true)}
                className="h-8 px-3.5 rounded-full bg-white hover:bg-[#6D123F] hover:text-white border-[#6D123F]/30 text-[#6D123F] text-[11px] font-black transition-colors touch-manipulation"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Tampilkan Ayat (Murajaah)
              </Button>
            </div>
          ) : (
            <>
          {/* Kontrol tampilan Per Kata & Terjemahan di dalam kotak atas */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-stone-600">
              Ketuk kata untuk arti
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPerKata((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-colors touch-manipulation',
                  showPerKata
                    ? 'bg-[#6D123F] text-white border-[#6D123F]'
                    : 'bg-white/80 text-[#6D123F] border-[#6D123F]/20 hover:bg-white'
                )}
              >
                <Languages className="w-3 h-3" />
                Per Kata
              </button>
              <button
                type="button"
                onClick={() => setShowTranslation((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-colors touch-manipulation',
                  showTranslation
                    ? 'bg-[#6D123F] text-white border-[#6D123F]'
                    : 'bg-white/80 text-[#6D123F] border-[#6D123F]/20 hover:bg-white'
                )}
              >
                <BookOpen className="w-3 h-3" />
                Terjemah
              </button>
              {isExamStageOpen && (
                <button
                  type="button"
                  onClick={() => setRevealInExam(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border bg-stone-900 text-white border-stone-900 hover:bg-stone-800 transition-colors touch-manipulation"
                >
                  <EyeOff className="w-3 h-3" />
                  Sembunyikan
                </button>
              )}
            </div>
          </div>

          {/* Sub-blok 1 (TM x-1) */}
          <div className="bg-white/40 rounded-xl p-3 border border-white/60 border-r-4 border-r-[#B91C1C] shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B91C1C] text-white text-[10px] font-black tracking-wide">
                TM {id}-1 ({letter}-1)
              </span>
              <span className="text-[11px] font-extrabold text-[#991B1B]">
                {part1Range}
              </span>
            </div>
            <div className="flex flex-wrap justify-center items-start gap-x-1 gap-y-2" dir="rtl">
              {tokensA.map((t) => renderToken(t, 'text-[#991B1B]'))}
            </div>
          </div>

          {/* Sub-blok 2 (TM x-2) */}
          {tokensB.length > 0 && (
            <div className="bg-white/25 rounded-xl p-3 border border-white/50 border-r-4 border-r-stone-900 shadow-sm space-y-2">
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

          {/* Terjemahan kalimat terintegrasi di dalam kotak atas (tanpa mengulang teks Arab) */}
          {(playingVerse || showTranslation) && (
            <div className="bg-white/75 rounded-xl p-3 border border-[#D4AF37]/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6D123F]">
                  {playingVerse ? `Terjemahan Ayat ${playingVerse.verse_key}` : `Terjemahan TM ${id} (Blok ${letter})`}
                </span>
                {playingVerse && (
                  <span className="text-[10px] font-black text-[#6D123F]">
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
                            : 'bg-white/80 border-[#6D123F]/40 text-stone-800'
                        )}
                      >
                        <span className="font-black text-[#6D123F] mr-1.5">({v.verse_key.split(':')[1]})</span>
                        &ldquo;{text}&rdquo;
                      </p>
                    );
                  })}
                </div>
              ) : playingVerse ? (
                <p className="text-xs sm:text-sm text-stone-900 leading-relaxed italic font-medium bg-white/85 rounded-lg p-2.5 border-l-4 border-[#6D123F]">
                  &ldquo;{playingVerse.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '') || 'Memuat terjemahan...'}&rdquo;
                </p>
              ) : null}
            </div>
          )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0">
          <CounterBox
            id={`step-${id}.a`}
            label={`TM ${id}-1 (${letter}-1) • ${part1Range}`}
            count={state.a.count}
            isLocked={countersLocked}
            onInc={(delta = 1) => addSubCount('a', delta)}
            canUndo={canUndo?.('a')}
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
            stepInfo={stepInfoFor?.('b')}
            color="darkMaroon"
            threshold={PASS_THRESHOLD}
          />
        </div>

        <div id={`step-${id}.combined`} className="flex flex-col gap-1.5 shrink-0 scroll-mt-24">
          <div className="relative">
          <Button
            type="button"
            onClick={() => addSubCount('combined', 1)}
            disabled={isCombinedLocked}
            className={cn(
              'w-full h-20 flex-col rounded-2xl font-black uppercase tracking-widest py-2 transition-all relative touch-manipulation select-none active:scale-[0.97]',
              stepInfoFor?.('combined')?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2',
              isDoneG
                ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-lg'
                : 'bg-[#6D123F] text-white hover:bg-[#6D123F]/90'
            )}
          >
            <span className="text-[10px] flex items-center gap-1 leading-none opacity-80 mb-1">
              {isCombinedLocked ? <Lock className="w-3 h-3" /> : null} GABUNG TM {id} (BLOK {letter}) • {isDoneG ? '+1 LAGI' : 'KETUK +1'}
            </span>
            <span className="text-2xl leading-none">
              {state.combined.count} <span className="text-sm opacity-70">/ {PASS_THRESHOLD}</span>
            </span>
            {isDoneG && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-black" />
              </div>
            )}
          </Button>
          {canUndo?.('combined') && (
            <InlineUndoButton onClick={() => addSubCount('combined', -1)} className="left-2 top-1/2 -translate-y-1/2" />
          )}
          </div>
          <StepTag info={stepInfoFor?.('combined')} className="justify-center" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Tombol -1 kecil (seukuran jari) yang diletakkan di dalam kotak counter */
function InlineUndoButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Kurangi 1 (kelebihan pencet)"
      aria-label="Kurangi 1"
      className={cn(
        'absolute z-10 h-10 w-10 rounded-xl border-2 border-stone-300 bg-white/95 text-stone-700 font-black text-sm flex items-center justify-center shadow-sm touch-manipulation select-none active:scale-95',
        className
      )}
    >
      −1
    </button>
  );
}

function MetaStep({ id: customId, stepKey, label, count, isLocked, onIncrement, highlight, canUndo, stepInfo, threshold = 10 }: any) {
  const isDone = count >= threshold;
  const elementId = customId || (stepKey ? `step-meta.${stepKey}` : (stepInfo ? `step-${stepInfo.key}` : undefined));
  return (
    <div
      id={elementId}
      className={cn(
        'relative p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between transition-all gap-3 scroll-mt-24',
        isDone ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-white border-[#6D123F]/10',
        highlight && !isDone && 'border-[#6D123F] bg-[#6D123F]/5',
        isLocked && 'opacity-40 grayscale select-none'
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0',
            isDone
              ? 'bg-[#D4AF37] text-black shadow-md'
              : highlight
              ? 'bg-[#6D123F] text-white'
              : 'bg-[#6D123F]/10 text-[#6D123F]'
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
              'text-[11px] font-black uppercase tracking-tight truncate',
              highlight ? 'text-[#6D123F]' : 'text-black'
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
            <Button
              type="button"
              onClick={() => {
                playTikrarCount(count + 1, threshold);
                onIncrement(1);
              }}
              disabled={isLocked}
              className={cn(
                'h-16 w-full rounded-2xl p-0 font-black text-xl transition-all shadow-md touch-manipulation select-none active:scale-[0.95]',
                stepInfo?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2',
                isDone
                  ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 border-none'
                  : 'bg-[#6D123F] text-white hover:bg-[#6D123F]/90'
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                {isDone && <Check className="w-5 h-5 stroke-[3]" />}
                +1
              </span>
            </Button>
            {canUndo && (
              <InlineUndoButton onClick={() => onIncrement(-1)} className="left-2 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <StepTag info={stepInfo} className="justify-center" />
        </div>
      </div>
    </div>
  );
}

function CounterBox({ id: customId, label, count, isLocked, onInc, color, threshold, canUndo, stepInfo }: any) {
  const isDone = count >= threshold;
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
    <div id={elementId} className="flex flex-col gap-1.5 scroll-mt-24">
    <div className="relative">
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onInc(1)}
      className={cn(
        'rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative px-2 py-3 min-h-[88px] w-full shadow-sm gap-1 touch-manipulation select-none',
        isLocked ? 'opacity-50 grayscale cursor-not-allowed bg-muted shadow-none' : themes[color],
        !isLocked && 'active:scale-[0.96] cursor-pointer',
        stepInfo?.isTarget && 'ring-2 ring-[#D4AF37] ring-offset-2'
      )}
    >
      <span className="text-[10px] font-black uppercase opacity-70 tracking-wider truncate w-full text-center leading-none">
        {label}
      </span>
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-3xl font-black">{count}</span>
        <span className="text-xs font-bold opacity-50">/ {threshold}</span>
      </div>
      {!isLocked && (
        <span className="text-[10px] font-black opacity-70 leading-none">
          {isDone ? '+1 LAGI' : 'KETUK +1'}
        </span>
      )}

      {isLocked && <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground" />}
      {isDone && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-current" />}
    </button>
    {canUndo && <InlineUndoButton onClick={() => onInc(-1)} className="left-2 top-1/2 -translate-y-1/2" />}
    </div>
    <StepTag info={stepInfo} className="justify-center" />
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
