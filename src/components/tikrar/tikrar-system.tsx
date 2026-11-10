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
  Video,
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
  isPageSubmissionCleared,
  JUZ_PAGES,
  TIKRAR_GRADE_LABELS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import { QUIZ_PASS_PERCENT, QUIZ_QUESTION_COUNT } from '@/lib/tikrar-steps';
import type { TikrarSummary } from '@/lib/tikrar-server';

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

function formatBlockRangeLabel(verses: Verse[]): string {
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
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const { fontSize } = useFontSize();
  const [hasInitializedPage, setHasInitializedPage] = useState(false);
  const [isRequestingExam, setIsRequestingExam] = useState(false);

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
  const { startPage, endPage } = useMemo(
    () =>
      activeTarget
        ? { startPage: activeTarget.startPage, endPage: activeTarget.endPage }
        : getJuzPageRange(juz),
    [activeTarget, juz]
  );
  const clearedPages = useMemo(
    () => new Set<number>([...(summary?.quizPassedPages || []), ...(summary?.tasmiPassedPages || [])]),
    [summary?.quizPassedPages, summary?.tasmiPassedPages]
  );
  const quizPassedPages = useMemo(() => new Set<number>(summary?.quizPassedPages || []), [summary?.quizPassedPages]);
  const pageLockReason = useMemo(() => {
    if (!user) return null;
    if (!activeTarget) return 'Isi Target & Jadwal terlebih dahulu sebelum mulai berlatih.';
    if (clearedPages.has(page)) return null;
    if (page > activeTarget.unlockedPage) {
      return `Halaman ${page} masih terkunci. Luluskan ujian ${QUIZ_QUESTION_COUNT} soal Halaman ${activeTarget.unlockedPage} terlebih dahulu.`;
    }
    return null;
  }, [user, activeTarget, clearedPages, page]);
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
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
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
      const parsed = parseInt(savedReciter, 10);
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
  const lockToastShownRef = useRef(false);
  const lastStepsTodayRef = useRef<number>(-1);

  // Hydrate progress from DB + localStorage + merge DB completed blocks
  useEffect(() => {
    let isCancelled = false;

    async function loadProgress() {
      if (typeof window === 'undefined') return;

      let nextPrepListen = 0;
      let nextPrepTrans = false;
      const nextBlocks: any = {
        1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
        4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 } },
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
        nextPrepListen = Math.max(nextPrepListen, PREP_LISTEN_THRESHOLD);
        nextPrepTrans = true;
        for (const b of [1, 2, 3, 4] as const) {
          if (completedBlocksAllTime.has(b)) {
            nextBlocks[b] = {
              a: { count: Math.max(nextBlocks[b].a.count, PASS_THRESHOLD) },
              b: { count: Math.max(nextBlocks[b].b.count, PASS_THRESHOLD) },
              combined: { count: Math.max(nextBlocks[b].combined.count, PASS_THRESHOLD) },
            };
          }
        }
        if (
          completedBlocksAllTime.has(3) ||
          completedBlocksAllTime.has(4) ||
          (completedBlocksAllTime.has(1) && completedBlocksAllTime.has(2))
        ) {
          nextMeta['1_2'] = Math.max(nextMeta['1_2'], META_PASS_THRESHOLD);
        }
        if (completedBlocksAllTime.has(4)) {
          nextMeta['2_3'] = Math.max(nextMeta['2_3'], META_PASS_THRESHOLD);
          nextMeta['1_2_3'] = Math.max(nextMeta['1_2_3'], META_PASS_THRESHOLD);
        }
        if (isSelectedPageCleared) {
          Object.keys(nextMeta).forEach((k) => {
            nextMeta[k] = Math.max(nextMeta[k], META_PASS_THRESHOLD);
          });
        }
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
  }, [page, completedBlocksKey, isSelectedPageCleared, user?.id]);

  const totalProgress = useMemo(() => {
    let totalDone = 0;
    if (prepListenCount >= PREP_LISTEN_THRESHOLD) totalDone += 5;
    if (prepTranslationDone) totalDone += 5;
    [1, 2, 3, 4].forEach((id) => {
      totalDone += (Math.min(blocks[id].a.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
      totalDone += (Math.min(blocks[id].b.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
      totalDone += (Math.min(blocks[id].combined.count, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
    });
    const metaWeight = 5;
    Object.keys(metaCounts).forEach((k) => {
      totalDone +=
        (Math.min(metaCounts[k], META_PASS_THRESHOLD) / META_PASS_THRESHOLD) * metaWeight;
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
            }),
          });
          const json = await res.json().catch(() => ({}));
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
            const stepsToday = Number(act?.stepsToday) || 0;
            if (awarded > 0 || stepsToday !== lastStepsTodayRef.current) {
              lastStepsTodayRef.current = stepsToday;
              await Promise.all([refreshLogs(), refreshSchedules(), refreshUser()]);
              onDataChanged?.();
            }
          }
        } catch (e) {
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
    if (verses.length === 0) return { 1: [], 2: [], 3: [], 4: [] };
    const perBlock = Math.max(1, Math.ceil(verses.length / 4));
    return {
      1: verses.slice(0, perBlock),
      2: verses.slice(perBlock, perBlock * 2),
      3: verses.slice(perBlock * 2, perBlock * 3),
      4: verses.slice(perBlock * 3),
    };
  }, [verses]);

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

  const targetDaysPerWeek = Number(userData?.tikrar_active_days_per_week) || 5;
  const durationMonths = Number(userData?.tikrar_target_duration_months) || 2;
  const targetLabelPerDay =
    durationMonths === 1
      ? 'Target: 1 Halaman (4 Blok) / Hari'
      : durationMonths === 2
      ? 'Target: 1/2 Halaman (2 Blok) / Hari'
      : durationMonths === 3
      ? 'Target: 1–2 Blok / Hari'
      : 'Target: 1 Blok / Hari';

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

  const playMp3QuranSurah = useCallback(
    (surahIndex: number, loopNum: number) => {
      if (!isAutoPlayingRef.current || surahsOnPage.length === 0) return;

      if (surahIndex >= surahsOnPage.length) {
        if (loopNum < 4) {
          setPrepListenCount((p) => Math.min(5, p + 1));
          setCurrentLoop(loopNum + 1);
          playMp3QuranSurah(0, loopNum + 1);
        } else {
          setPrepListenCount(5);
          stopAutoPlay();
          toast({
            title: 'Simak Tuntas',
            description: `Alhamdulillah, persiapan 5x simak bersama ${currentReciter.name} selesai!`,
          });
        }
        return;
      }

      const surahId = surahsOnPage[surahIndex];
      setCurrentSurahPlaying(surahId);
      const serverBase = currentReciter.serverUrl || "https://cdn.mp3quran.net/audio/abdullah-qarafi/r1/";
      const audioUrl = `${serverBase}${String(surahId).padStart(3, '0')}.mp3`;

      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.src = audioUrl;

      const timingReadId = currentReciter.timingReadId;
      if (timingReadId && !ayahTimingRef.current[surahId]) {
        fetch(`https://www.mp3quran.net/api/v3/ayat_timing?surah=${surahId}&read=${timingReadId}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((rows) => {
            if (Array.isArray(rows)) ayahTimingRef.current[surahId] = rows;
          })
          .catch(() => {});
      }

      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
        setAudioDuration(audio.duration || 0);
        const rows = ayahTimingRef.current[surahId];
        if (!timingReadId || !rows?.length) return;
        const ms = audio.currentTime * 1000;
        let cur = 0;
        for (const row of rows) {
          if (row.start_time <= ms) cur = row.ayah;
          else break;
        }
        const key = cur > 0 ? `${surahId}:${cur}` : null;
        setActiveVerseKey((prev) => (prev === key ? prev : key));
      };
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || 0);
      };
      audio.onended = () => {
        playMp3QuranSurah(surahIndex + 1, loopNum);
      };

      audio.play().catch((err) => {
        console.error('MP3Quran audio play error:', err);
        stopAutoPlay();
      });
    },
    [surahsOnPage, currentReciter, toast]
  );

  const playVerse = useCallback(
    async (vIndex: number, loopNum: number) => {
      if (!isAutoPlayingRef.current) return;

      // Saat ayat melebihi jumlah ayat di halaman ini: 1 HALAMAN PENUH SELESAI
      if (vIndex >= verses.length) {
        setPlayingVerseIndex(null);
        // Tambah siklus simak untuk halaman ini
        setPrepListenCount((p) => Math.min(5, p + 1));

        const nextLoop = loopNum + 1;
        if (nextLoop < 5) {
          setCurrentLoop(nextLoop);
          toast({
            title: `Putaran Simak Selesai (${nextLoop}/5)`,
            description: `Alhamdulillah, putaran ke-${nextLoop} selesai. Mengulang Halaman ${page} (putaran ke-${nextLoop + 1})...`,
          });
          playVerse(0, nextLoop);
        } else {
          setPrepListenCount(5);
          stopAutoPlay();
          toast({
            title: '5x Simak Selesai! 🎉',
            description: `Alhamdulillah, 5x siklus simak Halaman ${page} tuntas bersama ${currentReciter.name}. Silakan konfirmasi pemahaman untuk membuka kunci Blok A!`,
          });
        }
        return;
      }

      setPlayingVerseIndex(vIndex);
      const fullUrl = nextAudioUrlRef.current || (await getAudioUrl(vIndex));

      if (!fullUrl) {
        stopAutoPlay();
        return;
      }

      // Preload ayat berikutnya di halaman ini, atau preload ayat pertama jika putaran belum selesai
      if (vIndex + 1 < verses.length) {
        getAudioUrl(vIndex + 1).then((url) => {
          nextAudioUrlRef.current = url;
        });
      } else if (loopNum < 4) {
        getAudioUrl(0).then((url) => {
          nextAudioUrlRef.current = url;
        });
      }

      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = fullUrl;
      audioRef.current.onended = () => {
        playVerse(vIndex + 1, loopNum);
      };
      audioRef.current.play().catch(() => stopAutoPlay());
    },
    [verses, selectedReciterId, currentReciter, page, toast]
  );

  const startAutoPlay = async () => {
    if (!selectedReciterId) {
      setShowReciterDialog(true);
      return;
    }
    if (verses.length === 0) return;
    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;

    // Jika sudah tuntas 5x atau pengguna klik "Ulangi Audio Simak", mulai dari putaran awal
    let loopToStart = prepListenCount;
    if (prepListenCount >= 5) {
      setPrepListenCount(0);
      loopToStart = 0;
    }
    setCurrentLoop(loopToStart);
    nextAudioUrlRef.current = null;

    if (isMp3Quran) {
      playMp3QuranSurah(0, loopToStart);
    } else {
      playVerse(0, loopToStart);
    }
  };

  const handleRequestExam = async () => {
    if (!user || isRequestingExam) return;
    setIsRequestingExam(true);
    try {
      await addDocumentNonBlocking('page_exams', {
        user_id: user.id,
        page_number: page,
        score: 0,
        passed: false,
        created_at: new Date().toISOString(),
      });
      const text = `Assalamu'alaikum Admin HI AQLI, saya ${
        userData?.username || user.user_metadata?.full_name || 'Thalibah'
      } telah tuntas Tikrar Halaman ${page} Juz ${juz}. Mohon jadwal ujian lisan. Syukron.`;
      window.open(`https://wa.me/628567712914?text=${encodeURIComponent(text)}`, '_blank');
      toast({
        title: 'Permohonan Dikirim',
        description: 'Admin HI AQLI akan segera menjadwalkan ujian lisan Ukhti.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Gagal mengajukan ujian' });
    } finally {
      setIsRequestingExam(false);
    }
  };

  const isPrepTuntas = prepListenCount >= PREP_LISTEN_THRESHOLD && prepTranslationDone;
  const isTuntasTM = (mid: number) => blocks[mid].combined.count >= PASS_THRESHOLD;
  const isMetaTuntas = (key: string) => (metaCounts[key] || 0) >= META_PASS_THRESHOLD;

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
        <Loader2 className="animate-spin text-[#800000]" />
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
      <Card className="border-none bg-[#800000] text-white shadow-xl overflow-hidden relative border-b-4 border-[#D4AF37]">
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

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start md:self-center">
              <div className="bg-white/10 backdrop-blur-sm px-3.5 py-2.5 rounded-2xl border border-white/15 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                  Target Hari Ini
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-[#D4AF37]">
                    {summary?.today.stepsToday || 0}/{summary?.today.dailyQuota || activeTarget?.dailyQuota || 1} Langkah
                    {summary?.today.targetMet ? ' ✓' : ''}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-orange-300">
                    <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-300" />
                    {summary?.streak ?? consistency.streak}h
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/15 flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75">
                  <Clock className="w-3 h-3 text-[#D4AF37]" /> Progres Halaman
                </div>
                <div className="text-lg font-black">
                  {Math.round(totalProgress)}%{' '}
                  <span className="text-xs font-medium opacity-75">
                    ({tuntasBlockNumbers.length}/4 Blok)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Progress value={totalProgress} className="h-1.5 bg-white/15 [&>div]:bg-[#D4AF37]" />
        </CardContent>
      </Card>

      {/* Bar Navigasi Juz, Halaman & Font Size */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-2xl border shadow-sm sm:sticky sm:top-20 z-20 backdrop-blur-md border-[#800000]/10">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <select
            aria-label="Pilih Juz"
            value={juz}
            disabled={loading || Boolean(activeTarget)}
            onChange={(e) => {
              const j = Number(e.target.value);
              setJuz(j);
              setPage(JUZ_PAGES[j - 1] || 1);
            }}
            className="h-10 rounded-xl border-2 border-[#800000]/20 bg-white px-2.5 text-xs sm:text-sm font-black text-[#800000]"
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
            onClick={() => setPage((p) => Math.max(startPage, p - 1))}
            disabled={loading || page <= startPage}
            className="rounded-xl h-10 w-10 border-[#800000]/20 hover:bg-[#800000]/5"
          >
            <ChevronLeft className="h-5 w-5 text-[#800000]" />
          </Button>

          <select
            aria-label="Pilih Halaman Mushaf"
            value={page}
            disabled={loading}
            onChange={(e) => setPage(Number(e.target.value))}
            className="h-10 rounded-xl border-2 border-[#800000]/20 bg-stone-50 px-2.5 text-xs sm:text-sm font-black text-[#800000]"
          >
            {Array.from({ length: endPage - startPage + 1 }, (_, idx) => {
              const pNum = startPage + idx;
              const pCleared = clearedPages.has(pNum);
              const pLocked = Boolean(activeTarget) && !pCleared && pNum > (activeTarget?.unlockedPage || 0);
              return (
                <option key={pNum} value={pNum}>
                  {pCleared ? '★ ' : pLocked ? '🔒 ' : ''}Hal. {pNum}
                  {pNum === recommendedPage
                    ? ' (Halaman Aktif)'
                    : pCleared
                    ? ' (Lulus Ujian)'
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
            onClick={() => setPage((p) => Math.min(endPage, p + 1))}
            disabled={loading || page >= endPage}
            className="rounded-xl h-10 w-10 border-[#800000]/20 hover:bg-[#800000]/5"
          >
            <ChevronRight className="h-5 w-5 text-[#800000]" />
          </Button>

          {page !== recommendedPage && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPage(recommendedPage)}
                className="h-9 text-xs font-extrabold text-[#800000]"
              >
                Ke Halaman Aktif (Hal. {recommendedPage})
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenScheduleTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenScheduleTab}
              className="h-9 text-xs font-bold border-[#800000]/20 text-[#800000] hidden sm:inline-flex"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Atur Target
            </Button>
          )}

        </div>
      </div>

      

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
              className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
            >
              Ke Halaman {activeTarget.unlockedPage}
            </Button>
          ) : (
            onOpenScheduleTab && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenScheduleTab}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
              >
                Isi Target &amp; Jadwal
              </Button>
            )
          )}
        </div>
      )}

      <div className={cn(pageLockReason && 'pointer-events-none opacity-50 select-none')} aria-disabled={Boolean(pageLockReason)}>
      <TooltipProvider delayDuration={0}>
        {/* Tahap 0: Persiapan (Simak 5x & Konfirmasi Pemahaman) */}
        <Card
          className={cn(
            'border-2 transition-all shadow-md overflow-hidden',
            isPrepTuntas ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#800000]/30 bg-white'
          )}
        >
          <div className="bg-[#800000] py-2 px-4 border-b flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Tahap 0: Persiapan (Prasyarat Buka Blok A)
            </span>
            {isPrepTuntas && (
              <Badge className="bg-[#D4AF37] text-black font-black text-[8px] tracking-widest h-4">
                SIAP MENGHAFAL
              </Badge>
            )}
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                        prepListenCount >= 5
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-white text-[#800000] border-2 border-[#800000]/20'
                      )}
                    >
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#800000]">
                        Simak Murattal &amp; Tadabbur
                      </h4>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Wajib 5x siklus simak sebelum membuka kunci Blok A
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-[#800000]/20 shadow-sm">
                      <span className="text-xs font-black text-[#800000] px-1.5" title="Bertambah otomatis setiap audio simak selesai satu halaman">
                        {prepListenCount} / 5
                      </span>
                    </div>

                    <Dialog open={showReciterDialog} onOpenChange={setShowReciterDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 gap-2 font-bold border-[#800000]/20 text-[#800000]"
                        >
                          <Mic2 className="w-4 h-4" />
                          <span className="max-w-[140px] truncate text-xs">
                            {RECITERS.find((r) => r.id === selectedReciterId)?.name || 'Pilih Qari'}
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-[#800000] font-black">Pilih Qari Al-Qur&apos;an</DialogTitle>
                          <DialogDescription className="text-xs text-muted-foreground">
                            Pilih qari favorit Ukhti untuk mendengarkan audio persiapan simak Tikrar.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 py-3 max-h-[60vh] overflow-y-auto pr-1">
                          {RECITERS.map((r) => {
                            const isSelected = selectedReciterId === r.id;
                            return (
                              <Button
                                key={r.id}
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => {
                                  if (isAutoPlaying) stopAutoPlay();
                                  setSelectedReciterId(r.id);
                                  localStorage.setItem('aqli_reciter_id', r.id.toString());
                                  setShowReciterDialog(false);
                                }}
                                className={cn(
                                  'justify-between items-center p-3 h-auto font-bold rounded-2xl text-left transition-all',
                                  isSelected
                                    ? 'bg-[#800000] text-white hover:bg-[#6b0000] hover:text-white border-[#800000]'
                                    : 'border-muted-foreground/20 hover:border-[#800000]/30 hover:bg-[#800000]/5'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                                      isSelected
                                        ? 'bg-white text-[#800000]'
                                        : 'bg-[#800000]/10 text-[#800000]'
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
                  </div>
                </div>

                <Button
                  onClick={isAutoPlaying ? stopAutoPlay : startAutoPlay}
                  className={cn(
                    'w-full h-14 font-black rounded-2xl border-2 transition-all gap-3 shadow-md uppercase tracking-widest',
                    isAutoPlaying
                      ? 'bg-[#800000] text-white border-white'
                      : prepListenCount >= 5
                      ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                      : 'bg-[#800000] text-white border-transparent'
                  )}
                >
                  {isAutoPlaying ? (
                    <>
                      <Pause className="w-6 h-6 fill-current" /> Berhenti
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 fill-current" />{' '}
                      {prepListenCount >= 5 ? 'Ulangi Audio Simak' : 'Putar Audio Simak Otomatis'}
                    </>
                  )}
                </Button>

                {/* Card Player Khusus Qari MP3Quran CDN (Al-Qarafi, Ibrahim Al-Akhdar) */}
                {isAutoPlaying && isMp3Quran && (
                  <div className="mt-6 p-6 sm:p-8 bg-gradient-to-br from-white via-[#800000]/5 to-amber-50/40 rounded-[2.5rem] border-2 border-[#D4AF37] shadow-xl animate-in fade-in zoom-in duration-500 overflow-hidden">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#800000] text-white text-[9px] font-black uppercase tracking-[0.2em]">
                            Siklus {currentLoop + 1} / 5
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] font-black border-amber-600/30 text-amber-900 bg-amber-500/10 flex items-center gap-1"
                          >
                            <Radio className="w-3 h-3 text-amber-700 animate-pulse" /> MP3Quran CDN Resmi
                          </Badge>
                        </div>
                        <span className="text-[11px] font-bold text-[#800000]">
                          Halaman {page} • Juz {juz}
                        </span>
                      </div>

                      <div className="text-center space-y-1">
                        <h3 className="text-lg sm:text-xl font-black text-[#800000]">
                          {currentReciter.name}
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-black/70">
                          {currentSurahPlaying ? (
                            <>
                              Surah {QURAN_CHAPTERS.find((c) => c.id === currentSurahPlaying)?.name_simple || `Surah ${currentSurahPlaying}`}
                              {' '}
                              <span className="font-arabic font-bold text-[#800000]">
                                ({QURAN_CHAPTERS.find((c) => c.id === currentSurahPlaying)?.name_arabic})
                              </span>
                            </>
                          ) : (
                            'Memuat tilawah surah...'
                          )}
                        </p>
                      </div>

                      {/* Seekbar and Timeline */}
                      <div className="space-y-2 bg-white/80 p-4 rounded-2xl border border-amber-200/50 shadow-inner">
                        <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                          <div
                            className="h-full bg-[#800000] transition-all"
                            style={{ width: `${audioDuration ? Math.min(100, (audioCurrentTime / audioDuration) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono font-bold text-black/60">
                          <span>{formatTime(audioCurrentTime)}</span>
                          <span className="text-[#800000] font-sans font-bold text-[9px] uppercase tracking-wider">
                            {currentReciter.description || "Streaming CDN Resmi MP3Quran"}
                          </span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button
                          type="button"
                          onClick={stopAutoPlay}
                          className="rounded-xl h-10 px-5 gap-2 font-bold bg-[#800000] text-white hover:bg-[#6b0000]"
                        >
                          <Pause className="w-4 h-4" /> Pause Audio
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isAutoPlaying && isMp3Quran && verses.length > 0 && (
                  <div className="mt-4 p-5 sm:p-6 bg-white rounded-[2rem] border-2 border-[#D4AF37]/60 shadow-md space-y-5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[#800000] uppercase tracking-widest">
                      <Languages className="w-3.5 h-3.5" /> Arti Per Kata &amp; Terjemahan Halaman {page}
                    </div>
                    {!currentReciter.timingReadId && verses.length > 1 && (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={manualVerseIdx <= 0}
                          onClick={() => setManualVerseIdx((i) => Math.max(0, i - 1))}
                          className="h-8 text-xs font-bold border-[#800000]/20 text-[#800000]"
                        >
                          ‹ Sebelumnya
                        </Button>
                        <span className="text-[10px] font-black text-[#800000]">
                          Ayat {Math.min(manualVerseIdx, verses.length - 1) + 1} / {verses.length}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={manualVerseIdx >= verses.length - 1}
                          onClick={() => setManualVerseIdx((i) => Math.min(verses.length - 1, i + 1))}
                          className="h-8 text-xs font-bold border-[#800000]/20 text-[#800000]"
                        >
                          Berikutnya ›
                        </Button>
                      </div>
                    )}
                    {currentReciter.timingReadId && !verses.some((v) => v.verse_key === activeVerseKey) && (
                      <p className="text-xs text-center text-muted-foreground">
                        {activeVerseKey
                          ? `Audio sedang membacakan ayat ${activeVerseKey}. Terjemahan tampil saat bacaan mencapai ayat di halaman ini.`
                          : 'Menunggu bacaan ayat...'}
                      </p>
                    )}
                    {(currentReciter.timingReadId
                      ? verses.filter((v) => v.verse_key === activeVerseKey)
                      : [verses[Math.min(manualVerseIdx, verses.length - 1)]]
                    ).map((verse) => (
                      <div
                        key={verse.verse_key}
                        id={`verse-card-${verse.verse_key.replace(':', '-')}`}
                        className={cn(
                          'space-y-3 border-t border-muted-foreground/10 pt-4 first:border-t-0 first:pt-0 rounded-2xl transition-colors',
                          activeVerseKey === verse.verse_key && 'bg-amber-100/70 ring-2 ring-[#D4AF37] p-3'
                        )}
                      >
                        <Badge variant="outline" className="text-[9px] font-black border-[#800000]/20 text-[#800000]">
                          Ayat {verse.verse_key}
                        </Badge>
                        <div className="flex flex-wrap justify-start gap-2" dir="rtl">
                          {verse.words
                            .filter((w) => w.text_uthmani)
                            .map((word, wIdx) => (
                              <div
                                key={wIdx}
                                dir="ltr"
                                className="bg-muted border-2 border-muted-foreground/10 rounded-xl px-3 py-1.5 flex flex-col items-center gap-0.5 shadow-sm min-w-[60px]"
                              >
                                <span className="font-arabic text-black text-sm font-bold leading-none">
                                  {word.text_uthmani}
                                </span>
                                <span className="text-[9px] font-medium text-[#800000] leading-none">
                                  {word.translation?.text || '-'}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div className="bg-[#800000]/5 p-4 rounded-2xl border-l-4 border-[#800000]">
                          <p className="text-sm text-black leading-relaxed italic font-medium">
                            &ldquo;
                            {verse.translations?.[0]?.text.replace(/<[^>]*>?/gm, '') || 'Memuat terjemahan...'}
                            &rdquo;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isMp3Quran && playingVerseIndex !== null && verses[playingVerseIndex] && (
                  <div className="mt-6 p-6 sm:p-8 bg-white rounded-[2.5rem] border-2 border-[#D4AF37] shadow-xl animate-in fade-in zoom-in duration-500 overflow-hidden">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#800000] text-white text-[9px] font-black uppercase tracking-[0.2em]">
                            Siklus {currentLoop + 1} / 5
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] font-black border-[#800000]/20 text-[#800000]"
                          >
                            Ayat {verses[playingVerseIndex].verse_key}
                          </Badge>
                          {currentReciter.provider === 'everyayah' && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold text-emerald-800 border-emerald-500/30 bg-emerald-500/10"
                            >
                              EveryAyah Sinkron
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-[#800000]">
                          {currentReciter.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-start gap-x-2 gap-y-4" dir="rtl">
                        {verses[playingVerseIndex].words.map((word, wIdx) => (
                          <span
                            key={wIdx}
                            style={{ fontSize: `${fontSize * 1.4}px`, lineHeight: 1.6 }}
                            className="font-arabic text-[#800000] font-bold"
                          >
                            {word.text_uthmani}
                          </span>
                        ))}
                      </div>
                      <Separator className="bg-[#D4AF37]/20" />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2">
                          <Languages className="w-3 h-3" /> Arti Per Kata
                        </div>
                        <div className="flex flex-wrap justify-start gap-2" dir="rtl">
                          {verses[playingVerseIndex].words
                            .filter((w) => w.text_uthmani)
                            .map((word, wIdx) => (
                              <div
                                key={wIdx}
                                dir="ltr"
                                className="bg-muted border-2 border-muted-foreground/10 rounded-xl px-3 py-1.5 flex flex-col items-center gap-0.5 shadow-sm min-w-[60px]"
                              >
                                <span className="font-arabic text-black text-sm font-bold leading-none">
                                  {word.text_uthmani}
                                </span>
                                <span className="text-[9px] font-medium text-[#800000] leading-none text-center">
                                  {word.translation?.text || '-'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="bg-[#800000]/5 p-5 rounded-3xl border-l-4 border-[#800000]">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#800000] uppercase tracking-widest mb-2">
                          <BookOpen className="w-3 h-3" /> Terjemahan Kalimat
                        </div>
                        <p className="text-sm sm:text-base text-black leading-relaxed italic font-medium">
                          &ldquo;
                          {verses[playingVerseIndex].translations?.[0]?.text.replace(
                            /<[^>]*>?/gm,
                            ''
                          ) || 'Memuat terjemahan...'}
                          &rdquo;
                        </p>
                      </div>

                      {/* Control buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-muted-foreground/10">
                        <Button
                          type="button"
                          onClick={stopAutoPlay}
                          className="rounded-xl h-10 px-5 gap-2 font-bold bg-[#800000] text-white hover:bg-[#6b0000]"
                        >
                          <Pause className="w-4 h-4" /> Pause Audio
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted p-5 rounded-3xl border-2 border-dashed border-muted-foreground/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0',
                      prepTranslationDone
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-white text-[#800000] border-2 border-[#800000]/20'
                    )}
                  >
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#800000]">
                      Konfirmasi Pemahaman Terjemahan
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Klik kata Arab pada mushaf di bawah untuk melihat arti per kata
                    </p>
                  </div>
                </div>
                <Button
                  variant={prepTranslationDone ? 'default' : 'outline'}
                  disabled={prepListenCount < PREP_LISTEN_THRESHOLD && !prepTranslationDone}
                  onClick={() => setPrepTranslationDone(!prepTranslationDone)}
                  className={cn(
                    'h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed font-black rounded-xl border-2 uppercase tracking-widest text-[10px] shrink-0',
                    prepTranslationDone
                      ? 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 border-transparent text-black'
                      : 'border-[#800000] text-[#800000] hover:bg-[#800000]/5'
                  )}
                >
                  {prepTranslationDone
                    ? 'SUDAH DIPAHAMI ✓'
                    : prepListenCount < PREP_LISTEN_THRESHOLD
                    ? `SELESAIKAN ${PREP_LISTEN_THRESHOLD}X SIMAK DULU`
                    : 'KONFIRMASI PEMAHAMAN'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alur Kunci Berurutan: Blok A..D & Sub-Repetisi Gabungan (Opsi B) */}
        <div className="flex flex-col gap-8 mt-8">
          <div className="bg-[#800000] text-white p-4 rounded-2xl border-2 border-[#D4AF37] flex items-start gap-3 shadow-lg">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#D4AF37]" />
            <div className="text-[11px] leading-relaxed font-bold">
              <span className="uppercase tracking-wider text-[#D4AF37] block mb-0.5">
                Metode Itqan HI Tikrar (Otomatis Tersimpan)
              </span>
              Setiap Blok dibagi menjadi 2 bagian teks berwarna:{' '}
              <strong>Bagian 1 (Maroon) 40x</strong> → <strong>Bagian 2 (Hitam) 40x</strong>{' '}
              → <strong>Gabung Blok 40x</strong>, lalu dilanjutkan{' '}
              <strong>Sub-Repetisi Gabungan Antar Blok (10x)</strong> secara berurutan. Setiap klik
              hitungan repetisi <strong>otomatis tersimpan ke sistem</strong> &amp; langsung
              memperbarui keaktifan harian serta heatmap grup!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MaqtaCard
              id={1}
              page={page}
              state={blocks[1]}
              verses={blockVerses[1]}
              rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[1])}
              isSavedInDb={completedBlocksAllTime.has(1)}
              isScheduledToday={scheduledBlockSetOnPage.has(1)}
              isLocked={!isPrepTuntas}
              onIncrement={setBlocks}
              fontSize={fontSize}
              letter="A"
            />
            <MaqtaCard
              id={2}
              page={page}
              state={blocks[2]}
              verses={blockVerses[2]}
              rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[2])}
              isSavedInDb={completedBlocksAllTime.has(2)}
              isScheduledToday={scheduledBlockSetOnPage.has(2)}
              isLocked={!isTuntasTM(1)}
              onIncrement={setBlocks}
              fontSize={fontSize}
              letter="B"
            />
          </div>

          <MetaStep
            label="GABUNG BLOK A & B (SYARAT SETORAN 1/2 HALAMAN PERTAMA)"
            count={metaCounts['1_2']}
            isLocked={!isTuntasTM(1) || !isTuntasTM(2)}
            onIncrement={(delta = 1) =>
              setMetaCounts((p) => ({
                ...p,
                '1_2': Math.min(META_PASS_THRESHOLD, p['1_2'] + delta),
              }))
            }
          />

          <MaqtaCard
            id={3}
            page={page}
            state={blocks[3]}
            verses={blockVerses[3]}
            rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[3])}
            isSavedInDb={completedBlocksAllTime.has(3)}
            isScheduledToday={scheduledBlockSetOnPage.has(3)}
            isLocked={!isMetaTuntas('1_2')}
            onIncrement={setBlocks}
            fontSize={fontSize}
            letter="C"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetaStep
              label="GABUNG BLOK B & C"
              count={metaCounts['2_3']}
              isLocked={!isTuntasTM(3)}
              onIncrement={(delta = 1) =>
                setMetaCounts((p) => ({
                  ...p,
                  '2_3': Math.min(META_PASS_THRESHOLD, p['2_3'] + delta),
                }))
              }
            />
            <MetaStep
              label="GABUNG BLOK A s/d C"
              count={metaCounts['1_2_3']}
              isLocked={!isMetaTuntas('2_3')}
              onIncrement={(delta = 1) =>
                setMetaCounts((p) => ({
                  ...p,
                  '1_2_3': Math.min(META_PASS_THRESHOLD, p['1_2_3'] + delta),
                }))
              }
            />
          </div>

          <MaqtaCard
            id={4}
            page={page}
            state={blocks[4]}
            verses={blockVerses[4]}
            rangeLabel={loading ? 'Memuat...' : formatBlockRangeLabel(blockVerses[4])}
            isSavedInDb={completedBlocksAllTime.has(4)}
            isScheduledToday={scheduledBlockSetOnPage.has(4)}
            isLocked={!isMetaTuntas('1_2_3')}
            onIncrement={setBlocks}
            fontSize={fontSize}
            letter="D"
          />

          <div className="space-y-4">
            <MetaStep
              label="GABUNG BLOK C & D"
              count={metaCounts['3_4']}
              isLocked={!isTuntasTM(4)}
              onIncrement={(delta = 1) =>
                setMetaCounts((p) => ({
                  ...p,
                  '3_4': Math.min(META_PASS_THRESHOLD, p['3_4'] + delta),
                }))
              }
            />
            <MetaStep
              label="GABUNG BLOK B s/d D"
              count={metaCounts['2_3_4']}
              isLocked={!isMetaTuntas('3_4')}
              onIncrement={(delta = 1) =>
                setMetaCounts((p) => ({
                  ...p,
                  '2_3_4': Math.min(META_PASS_THRESHOLD, p['2_3_4'] + delta),
                }))
              }
            />
            <MetaStep
              label="GABUNG SELURUH HALAMAN (A - D)"
              count={metaCounts['1_2_3_4']}
              isLocked={!isMetaTuntas('2_3_4')}
              onIncrement={(delta = 1) =>
                setMetaCounts((p) => ({
                  ...p,
                  '1_2_3_4': Math.min(META_PASS_THRESHOLD, p['1_2_3_4'] + delta),
                }))
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
              {!isMetaTuntas('1_2_3_4') ? (
                <Card className="border-2 border-dashed bg-muted py-10">
                  <CardContent className="flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-dashed">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest max-w-[240px]">
                      Selesaikan repetisi gabungan seluruh halaman (A–D 10x) untuk membuka
                      simulasi &amp; ujian halaman.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in duration-500">
                  <Card className="border-none bg-[#800000] text-white shadow-xl overflow-hidden border-b-4 border-[#D4AF37]">
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
                  <Card
                    className={cn(
                      'border-none shadow-xl overflow-hidden transition-all border-b-4',
                      activeExam
                        ? 'bg-[#800000] text-white border-white'
                        : 'bg-white text-[#800000] border-[#D4AF37] border-2'
                    )}
                  >
                    <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#800000]/10 flex items-center justify-center mb-4">
                          {activeExam ? (
                            <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
                          ) : (
                            <MessageSquare className="w-6 h-6 text-[#800000]" />
                          )}
                        </div>
                        <h5 className="text-lg font-black leading-tight uppercase">
                          {activeExam
                            ? activeExam.passed
                              ? "Tasmi' Lulus"
                              : "Tasmi' Diajukan"
                            : "Setoran Tasmi' ke Muallimah"}
                        </h5>
                        <p className="text-[11px] opacity-80 leading-relaxed">
                          {activeExam
                            ? `Status: ${activeExamStatusLabel}.`
                            : "Tasmi' dinilai & diisi oleh muallimah. Tidak mengunci halaman berikutnya, tetapi tercatat sebagai \"sudah diuji\" di Itqan 30 Juz."}
                        </p>
                      </div>
                      {!activeExam && (
                        <Button
                          onClick={handleRequestExam}
                          disabled={isRequestingExam}
                          className="bg-[#800000] text-white font-black w-full rounded-xl hover:bg-[#800000]/90 h-12 shadow-lg"
                        >
                          {isRequestingExam ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <>
                              <Zap className="mr-2 w-4 h-4 fill-current text-[#D4AF37]" /> HUBUNGI MUALLIMAH
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
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
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0"
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
}: any) {
  const isDoneG = state.combined.count >= PASS_THRESHOLD;
  const tokens = useMemo(() => {
    const items: any[] = [];
    verses.forEach((v: any) => {
      v.words.forEach((w: any, idx: number) => {
        items.push({ type: 'word', data: w, verse_key: v.verse_key, word_idx: idx });
      });
      items.push({ type: 'marker', text: `(${v.verse_key.split(':')[1]})`, verse_key: v.verse_key });
    });
    return items;
  }, [verses]);
  const mid = Math.ceil(tokens.length / 2);
  const tokensA = tokens.slice(0, mid);
  const tokensB = tokens.slice(mid);

  const addSubCount = (part: 'a' | 'b' | 'combined', delta: number) => {
    onIncrement((p: any) => ({
      ...p,
      [id]: {
        ...p[id],
        [part]: {
          count: Math.max(0, Math.min(PASS_THRESHOLD, (p[id]?.[part]?.count || 0) + delta)),
        },
      },
    }));
  };

  const renderToken = (token: any, colorClass: string) => {
    if (token.type === 'word') {
      return (
        <Tooltip key={`${token.verse_key}-${token.word_idx}`}>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
              className={cn(
                'font-arabic cursor-help hover:bg-[#D4AF37]/20 rounded px-0.5 outline-none transition-colors',
                colorClass
              )}
            >
              {token.data.text_uthmani}
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="bg-[#800000] text-white border-none shadow-lg py-1.5 px-3 z-[100]">
              <p className="text-xs font-bold">{token.data.translation?.text || '...'}</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      );
    }
    return (
      <span
        key={`${token.verse_key}-m`}
        className="inline-flex items-center justify-center px-2 rounded-full border border-[#800000]/20 text-[10px] font-bold mx-1 bg-white translate-y-[-2px]"
      >
        {token.text}
      </span>
    );
  };

  const isCombinedLocked = isLocked || state.b.count < PASS_THRESHOLD;

  return (
    <Card
      className={cn(
        'border-2 transition-all shadow-md overflow-hidden flex flex-col h-full',
        isDoneG ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[#D4AF37]/10' : 'border-[#800000]/20',
        isLocked && 'opacity-50 grayscale select-none'
      )}
    >
      <div className="bg-[#800000] py-2 px-4 border-b flex justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-white truncate">
            BLOK {letter} ({page}
            {letter}) {isLocked && '• LOCK'}
          </span>
          {rangeLabel && (
            <span className="text-[10px] font-bold text-[#D4AF37] truncate hidden sm:inline">
              • {rangeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isScheduledToday && !isSavedInDb && (
            <Badge className="bg-white/20 text-white hover:bg-white/20 font-black text-[8px] tracking-widest h-4">
              TARGET HARI INI
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
        <div
          className="bg-white p-4 rounded-xl border-2 border-[#800000]/5 flex-1 overflow-y-auto no-scrollbar"
          dir="rtl"
        >
          <div className="flex flex-wrap justify-center gap-x-1 gap-y-2">
            {tokensA.map((t) => renderToken(t, 'text-[#800000]'))}
            {tokensB.map((t) => renderToken(t, 'text-black'))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0">
          <CounterBox
            label={`${page}${letter}-1 (Maroon)`}
            count={state.a.count}
            isLocked={isLocked}
            onInc={(delta = 1) => addSubCount('a', delta)}
            color="maroon"
            threshold={PASS_THRESHOLD}
          />
          <CounterBox
            label={`${page}${letter}-2 (Hitam)`}
            count={state.b.count}
            isLocked={isLocked || state.a.count < PASS_THRESHOLD}
            onInc={(delta = 1) => addSubCount('b', delta)}
            color="darkMaroon"
            threshold={PASS_THRESHOLD}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            onClick={() => addSubCount('combined', 1)}
            disabled={isCombinedLocked}
            className={cn(
              'flex-1 h-12 flex-col rounded-xl font-black uppercase tracking-widest py-1 transition-all relative',
              isDoneG
                ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-lg'
                : 'bg-[#800000] text-white hover:bg-[#800000]/90'
            )}
          >
            <span className="text-[8px] flex items-center gap-1 leading-none opacity-80 mb-0.5">
              {isCombinedLocked ? <Lock className="w-2 h-2" /> : null} GABUNG {page}
              {letter} (+1)
            </span>
            <span className="text-sm leading-none">
              {state.combined.count} / {PASS_THRESHOLD}
            </span>
            {isDoneG && (
              <div className="absolute top-1 right-1">
                <CheckCircle2 className="w-3 h-3 text-black" />
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaStep({ label, count, isLocked, onIncrement, highlight }: any) {
  const isDone = count >= META_PASS_THRESHOLD;
  const TARGET_MAX_LOCAL = 10;
  return (
    <div
      className={cn(
        'relative p-4 rounded-2xl border-2 flex items-center justify-between transition-all gap-3',
        isDone ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-white border-[#800000]/10',
        highlight && !isDone && 'border-[#800000] bg-[#800000]/5',
        isLocked && 'opacity-40 grayscale select-none'
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0',
            isDone
              ? 'bg-[#D4AF37] text-black'
              : highlight
              ? 'bg-[#800000] text-white'
              : 'bg-[#800000]/10 text-[#800000]'
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
              highlight ? 'text-[#800000]' : 'text-black'
            )}
          >
            {label}
          </span>
          <span className="text-[8px] font-bold text-muted-foreground">
            WAJIB {META_PASS_THRESHOLD}x SEBELUM MEMBUKA TAHAP BERIKUTNYA
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right flex flex-col items-end mr-1">
          <span className="text-[10px] font-bold text-black uppercase">
            {count} / {TARGET_MAX_LOCAL}
          </span>
          <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all"
              style={{ width: `${(count / TARGET_MAX_LOCAL) * 100}%` }}
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={() => onIncrement(1)}
          disabled={isLocked || isDone}
          className={cn(
            'h-9 w-9 rounded-lg p-0 font-black text-xs shrink-0 transition-all shadow-sm',
            isDone
              ? 'bg-[#D4AF37] text-black border-none'
              : 'bg-[#800000] text-white hover:bg-[#800000]/90'
          )}
        >
          {isDone ? <CheckCircle2 className="w-4 h-4" /> : '+1'}
        </Button>
      </div>
    </div>
  );
}

function CounterBox({ label, count, isLocked, onInc, color, threshold }: any) {
  const isDone = count >= threshold;
  const themes: any = {
    maroon: isDone
      ? 'bg-[#800000] text-white border-[#800000]'
      : 'bg-white border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5',
    darkMaroon: isDone
      ? 'bg-[#4d0000] text-white border-[#4d0000]'
      : 'bg-white border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5',
  };
  return (
    <div
      className={cn(
        'rounded-xl border-2 flex flex-col justify-between transition-all relative p-2 shadow-sm gap-1.5',
        isLocked ? 'opacity-50 grayscale cursor-not-allowed bg-muted shadow-none' : themes[color]
      )}
    >
      <div
        onClick={isLocked || isDone ? undefined : () => onInc(1)}
        className={cn(
          'flex flex-col items-center justify-center py-0.5',
          !isLocked && !isDone && 'cursor-pointer'
        )}
      >
        <span className="text-[9px] font-black uppercase opacity-70 tracking-wider truncate w-full text-center leading-none mb-1">
          {label}
        </span>
        <div className="flex items-baseline gap-0.5 leading-none">
          <span className="text-base font-black">{count}</span>
          <span className="text-[8px] font-bold opacity-50">/ {threshold}</span>
        </div>
      </div>

      {!isLocked && !isDone && (
        <div className="flex items-center justify-center gap-1 pt-1 border-t border-current/10">
          <button
            type="button"
            onClick={() => onInc(1)}
            className="flex-1 py-0.5 rounded bg-[#800000]/10 hover:bg-[#800000]/20 text-[9px] font-black"
          >
            +1
          </button>
        </div>
      )}

      {isLocked && <Lock className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-muted-foreground" />}
      {isDone && <CheckCircle2 className="absolute top-1.5 right-1.5 w-3 h-3 text-current" />}
    </div>
  );
}
