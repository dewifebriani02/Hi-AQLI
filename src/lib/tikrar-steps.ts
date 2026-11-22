/**
 * Langkah baku Hi Tikrar per halaman mushaf & jadwal per langkah.
 *
 * Urutan langkah mengikuti urutan kartu di tab Mushaf:
 *   Simak TM1 → TM1-1 → TM1-2 → Gabung TM1 →
 *   Simak TM2 → TM2-1 → TM2-2 → Gabung TM2 → Gabung TM1-2 →
 *   Simak TM3 → TM3-1 → TM3-2 → Gabung TM3 → Gabung TM2-3 → Gabung TM1-3 →
 *   Simak TM4 → TM4-1 → TM4-2 → Gabung TM4 → Gabung TM3-4 → Gabung TM2-4 → Gabung TM1-4 →
 *   Ujian halaman 60 soal (30 Hafalan Ayat + 30 Terjemah Per Kata).
 *
 * Indeks langkah global dalam satu target = (page - startPage) * STEPS_PER_PAGE + stepIndex.
 */

import {
  addCalendarDays,
  getJuzPageRange,
  isActiveStudyDay,
  isPageSubmissionCleared,
  parseDateKeyUTC,
  formatDateKeyUTC,
  toDateKeyWIB,
  type SubmissionGateRecord,
} from '@/lib/tikrar-schedule-generator';

export const PASS_THRESHOLD = 40;
export const META_2_BLOCKS_THRESHOLD = 10;
export const META_3_BLOCKS_THRESHOLD = 5;
export const META_4_BLOCKS_THRESHOLD = 5;
/** Default / backwards-compatible threshold */
export const META_PASS_THRESHOLD = 10;
export const PREP_LISTEN_THRESHOLD = 5;
export const QUIZ_PART1_COUNT = 30;
export const QUIZ_PART2_COUNT = 30;
export const QUIZ_QUESTION_COUNT = QUIZ_PART1_COUNT + QUIZ_PART2_COUNT;
export const QUIZ_PASS_PERCENT = 80;

export function createEmptyTikrarBlocks() {
  return {
    1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
  } as Record<1 | 2 | 3 | 4, {
    a: { count: number };
    b: { count: number };
    combined: { count: number };
    listen: { count: number };
    understood?: boolean;
  }>;
}

export function createEmptyTikrarMetaCounts(): Record<string, number> {
  return {
    '1_2': 0,
    '2_3': 0,
    '1_2_3': 0,
    '3_4': 0,
    '2_3_4': 0,
    '1_2_3_4': 0,
  };
}

export function computeTikrarPageTotalProgress(blocks: any, metaCounts: Record<string, any>): number {
  let totalDone = 0;
  [1, 2, 3, 4].forEach((id) => {
    const b = blocks?.[id] || {};
    totalDone += (Math.min(Number(b?.listen?.count) || 0, PREP_LISTEN_THRESHOLD) / PREP_LISTEN_THRESHOLD) * 2.5;
    totalDone += (Math.min(Number(b?.a?.count) || 0, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
    totalDone += (Math.min(Number(b?.b?.count) || 0, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
    totalDone += (Math.min(Number(b?.combined?.count) || 0, PASS_THRESHOLD) / PASS_THRESHOLD) * 10;
  });
  const metaWeight = 5;
  const metaKeys = ['1_2', '2_3', '1_2_3', '3_4', '2_3_4', '1_2_3_4'];
  metaKeys.forEach((k) => {
    const th = getMetaThreshold(k);
    totalDone += (Math.min(Number(metaCounts?.[k]) || 0, th) / th) * metaWeight;
  });
  const totalWeight = 10 + 4 * 30 + metaKeys.length * metaWeight;
  return Math.min(100, (totalDone / totalWeight) * 100);
}

/** Minimal repetisi penggabungan antar blok: 2 blok min. 10x, 3 blok min. 5x, 4 blok min. 5x */
export function getMetaThreshold(key: string): number {
  const cleanKey = key.startsWith('meta.') ? key.slice(5) : key;
  if (cleanKey === '1_2_3_4') return META_4_BLOCKS_THRESHOLD; // 5x
  if (cleanKey === '1_2_3' || cleanKey === '2_3_4') return META_3_BLOCKS_THRESHOLD; // 5x
  return META_2_BLOCKS_THRESHOLD; // 10x (1_2, 2_3, 3_4)
}

export type TikrarStepKind = 'prep' | 'listen' | 'sub' | 'meta' | 'quiz';

export interface TikrarStepDef {
  index: number;
  key: string;
  label: string;
  shortLabel: string;
  kind: TikrarStepKind;
  target: number;
  /** Blok (1..4) yang dituntaskan oleh langkah ini, untuk sinkron jadwal per blok lama */
  completesBlock?: 1 | 2 | 3 | 4;
}

const SUB_STEPS: TikrarStepDef[] = [];
(['A', 'B', 'C', 'D'] as const).forEach((letter, i) => {
  const blockNo = (i + 1) as 1 | 2 | 3 | 4;
  SUB_STEPS.push(
    {
      index: 0,
      key: `${blockNo}.a`,
      label: `TM ${blockNo}-1 (Blok ${letter}-1)`,
      shortLabel: `TM${blockNo}-1`,
      kind: 'sub',
      target: PASS_THRESHOLD,
    },
    {
      index: 0,
      key: `${blockNo}.b`,
      label: `TM ${blockNo}-2 (Blok ${letter}-2)`,
      shortLabel: `TM${blockNo}-2`,
      kind: 'sub',
      target: PASS_THRESHOLD,
    },
    {
      index: 0,
      key: `${blockNo}.combined`,
      label: `Gabung TM ${blockNo} (Blok ${letter})`,
      shortLabel: `Gab TM${blockNo}`,
      kind: 'sub',
      target: PASS_THRESHOLD,
      completesBlock: blockNo,
    }
  );
});

const meta = (key: string, label: string, shortLabel: string, target = getMetaThreshold(key)): TikrarStepDef => ({
  index: 0,
  key: `meta.${key}`,
  label,
  shortLabel,
  kind: 'meta',
  target,
});

const listenStep = (blockNo: 2 | 3 | 4, letter: 'B' | 'C' | 'D'): TikrarStepDef => ({
  index: 0,
  key: `${blockNo}.listen`,
  label: `Simak Audio TM ${blockNo} (Blok ${letter}) 5x`,
  shortLabel: `Simak TM${blockNo}`,
  kind: 'listen',
  target: PREP_LISTEN_THRESHOLD,
});

export const TIKRAR_STEPS: readonly TikrarStepDef[] = ([
  { index: 0, key: 'prep', label: 'Simak Audio TM 1 (Blok A) 5x', shortLabel: 'Simak TM1', kind: 'prep', target: PREP_LISTEN_THRESHOLD },
  ...SUB_STEPS.slice(0, 3),
  listenStep(2, 'B'),
  ...SUB_STEPS.slice(3, 6),
  meta('1_2', 'Gabung TM 1 & 2 (Blok A & B)', 'Gab TM1-2', 10),
  listenStep(3, 'C'),
  ...SUB_STEPS.slice(6, 9),
  meta('2_3', 'Gabung TM 2 & 3 (Blok B & C)', 'Gab TM2-3', 10),
  meta('1_2_3', 'Gabung TM 1–3 (Blok A–C)', 'Gab TM1-3', 5),
  listenStep(4, 'D'),
  ...SUB_STEPS.slice(9, 12),
  meta('3_4', 'Gabung TM 3 & 4 (Blok C & D)', 'Gab TM3-4', 10),
  meta('2_3_4', 'Gabung TM 2–4 (Blok B–D)', 'Gab TM2-4', 5),
  meta('1_2_3_4', 'Gabung Seluruh Halaman (TM 1–4)', 'Gab TM1-4', 5),
  {
    index: 0,
    key: 'quiz',
    label: `Ujian Halaman ${QUIZ_QUESTION_COUNT} Soal (Hafalan & Terjemah Per Kata)`,
    shortLabel: 'Ujian',
    kind: 'quiz',
    target: 1,
  },
] as TikrarStepDef[]).map((s, i) => ({ ...s, index: i }));

export const STEPS_PER_PAGE = TIKRAR_STEPS.length; // 23
/** Langkah terakhir sebelum ujian (Gabung A–D) */
export const MEMORIZED_STEP_COUNT = STEPS_PER_PAGE - 1; // 22

export interface TikrarProgressLike {
  prep_listen_count?: number | null;
  prep_translation_done?: boolean | null;
  blocks?: any;
  meta_counts?: any;
}

export function stepValue(step: TikrarStepDef, prog: TikrarProgressLike | null | undefined): number {
  if (!prog) return 0;
  if (step.kind === 'prep') {
    // Simak TM 1 (Blok A): pakai hitungan simak Blok A, simak versi lama, atau jika TM 1-1 sudah mulai dikerjakan
    if ((Number(prog?.blocks?.[1]?.a?.count) || 0) > 0) return step.target;
    return Math.min(step.target, Math.max(getBlockListenCount(prog, 1), Number(prog.prep_listen_count) || 0));
  }
  if (step.kind === 'listen') {
    const block = Number(step.key.split('.')[0]) as 1 | 2 | 3 | 4;
    if ((Number(prog?.blocks?.[block]?.a?.count) || 0) > 0) return step.target;
    return Math.min(step.target, getBlockListenCount(prog, block));
  }
  if (step.kind === 'sub') {
    const [b, part] = step.key.split('.');
    return Number(prog.blocks?.[b]?.[part]?.count) || 0;
  }
  if (step.kind === 'meta') {
    return Number(prog.meta_counts?.[step.key.slice(5)]) || 0;
  }
  return 0;
}

/** Hitungan simak audio satu blok (0..5) */
export function getBlockListenCount(prog: TikrarProgressLike | null | undefined, block: 1 | 2 | 3 | 4): number {
  return Number(prog?.blocks?.[block]?.listen?.count) || 0;
}

/**
 * Counter blok terbuka bila blok sudah disimak 5x. Blok yang sudah mulai dihafal (versi lama)
 * dan Blok A yang sudah tuntas simak satu halaman versi lama tidak dikunci ulang.
 */
export function isBlockListenDone(prog: TikrarProgressLike | null | undefined, block: 1 | 2 | 3 | 4): boolean {
  if (getBlockListenCount(prog, block) >= PREP_LISTEN_THRESHOLD) return true;
  if ((Number(prog?.blocks?.[block]?.a?.count) || 0) > 0) return true;
  return block === 1 && (Number(prog?.prep_listen_count) || 0) >= PREP_LISTEN_THRESHOLD;
}

/**
 * Jumlah langkah berurutan yang sudah tuntas pada satu halaman (0..23).
 * `quizCleared` = lulus ujian 60 soal (atau halaman sudah lulus tasmi' / ujian versi sebelumnya).
 */
export function countCompletedSteps(prog: TikrarProgressLike | null | undefined, quizCleared = false): number {
  let done = 0;
  for (const step of TIKRAR_STEPS) {
    const ok = step.kind === 'quiz' ? quizCleared : stepValue(step, prog) >= step.target;
    if (!ok) break;
    done += 1;
  }
  return done;
}

/** Langkah aktif (pertama yang belum tuntas) beserta hitungan saat ini */
export function getActiveStep(
  prog: TikrarProgressLike | null | undefined,
  quizCleared = false
): { step: TikrarStepDef; current: number; completedSteps: number } | null {
  const completed = countCompletedSteps(prog, quizCleared);
  if (completed >= STEPS_PER_PAGE) return null;
  const step = TIKRAR_STEPS[completed];
  return { step, current: step.kind === 'quiz' ? 0 : stepValue(step, prog), completedSteps: completed };
}

/** Total klik counter pada satu baris progres (untuk menghitung klik harian) */
export function countTotalClicks(prog: TikrarProgressLike | null | undefined): number {
  if (!prog) return 0;
  // Simak dicatat per blok (blocks[n].listen); kolom simak satu halaman versi lama tidak dihitung
  let total = 0;
  for (const b of ['1', '2', '3', '4']) {
    for (const part of ['a', 'b', 'combined', 'listen']) {
      total += Number(prog.blocks?.[b]?.[part]?.count) || 0;
    }
  }
  for (const v of Object.values(prog.meta_counts || {})) total += Number(v) || 0;
  return total;
}

/** Batas minimal yang diizinkan untuk pengurangan (-1):
 * Bila langkah berikutnya sudah dimulai, batas minimal adalah step.target (tidak boleh di bawah target agar tidak mengunci langkah berikutnya).
 * Bila langkah berikutnya belum dimulai, batas minimal adalah 0.
 */
export function getStepMinCount(key: string, prog: TikrarProgressLike | null | undefined): number {
  const i = TIKRAR_STEPS.findIndex((s) => s.key === key);
  const step = TIKRAR_STEPS[i];
  if (!step) return 0;
  const next = TIKRAR_STEPS[i + 1];
  const nextStarted = next && next.kind !== 'quiz' && stepValue(next, prog) > 0;
  return nextStarted ? step.target : 0;
}

/** Langkah boleh dikurangi (-1) bila sudah ada hitungannya dan langkah berikutnya belum dimulai,
 * ATAU bila hitungannya melebihi target minimal (kelebihan klik) */
export function canUndoStep(key: string, prog: TikrarProgressLike | null | undefined): boolean {
  const i = TIKRAR_STEPS.findIndex((s) => s.key === key);
  const step = TIKRAR_STEPS[i];
  if (!step || step.kind === 'prep' || step.kind === 'listen' || step.kind === 'quiz') return false;
  const val = stepValue(step, prog);
  if (val <= 0) return false;

  // Bila kelebihan klik di atas target (misal 45/40 atau 22/10), selalu boleh dikurangi kembali sampai minimal target
  if (val > step.target) return true;

  const next = TIKRAR_STEPS[i + 1];
  return !next || next.kind === 'quiz' || stepValue(next, prog) <= 0;
}

/**
 * Perkiraan sisa klik untuk menuntaskan `stepsNeeded` langkah berikutnya, mulai dari langkah aktif
 * di halaman `fromPage` (berlanjut ke halaman berikutnya sampai `endPage`). Ujian dihitung 0 klik.
 * Simak 5x Blok B/C/D yang belum tuntas ikut dihitung saat langkah pertama blok itu (B-1/C-1/D-1)
 * termasuk dalam langkah yang dihitung (simak Blok A sudah menjadi langkah "Simak").
 * Dipakai bersama oleh bar "Target hari ini" (tab Mushaf) dan kartu heatmap grup.
 */
export function estimateClicksForNextSteps(
  progressByPage: Record<number, TikrarProgressLike | undefined>,
  fromPage: number,
  endPage: number,
  clearedPages: Set<number>,
  stepsNeeded: number
): number {
  let remaining = Math.max(0, Math.floor(stepsNeeded));
  let clicks = 0;
  for (let p = fromPage; p <= endPage && remaining > 0; p++) {
    const prog = progressByPage[p];
    const done = countCompletedSteps(prog, clearedPages.has(p));
    for (let i = done; i < STEPS_PER_PAGE && remaining > 0; i++) {
      const step = TIKRAR_STEPS[i];
      if (step.kind !== 'quiz') {
        const current = Math.min(stepValue(step, prog), step.target);
        clicks += Math.max(0, step.target - current);
      }

      remaining -= 1;
    }
  }
  return clicks;
}

export function getStepByGlobalIndex(startPage: number, globalIndex: number) {
  const page = startPage + Math.floor(globalIndex / STEPS_PER_PAGE);
  const step = TIKRAR_STEPS[globalIndex % STEPS_PER_PAGE];
  return { page, step };
}

// ---------------------------------------------------------------------------
// Jadwal per langkah
// ---------------------------------------------------------------------------

export interface TikrarTargetParams {
  juz: number;
  startPage: number;
  endPage: number;
  startDate: string; // YYYY-MM-DD
  durationMonths: number;
  activeDaysPerWeek: number;
}

export interface TikrarScheduleDay {
  date: string;
  dayIndex: number; // 1-based hari aktif
  weekNumber: number;
  /** Langkah global [fromStep, toStep) yang dijadwalkan pada hari ini */
  fromStep: number;
  toStep: number;
  items: { page: number; stepIndex: number; label: string; shortLabel: string }[];
}

export interface TikrarStepSchedule {
  totalSteps: number;
  activeDays: number;
  dailyQuota: number;
  endDate: string;
  estimatedFinishDate: string;
  days: TikrarScheduleDay[];
}

export function normalizeTargetRange(juz: number, startPage: number, endPage: number) {
  const range = getJuzPageRange(juz);
  const s = Math.min(range.endPage, Math.max(range.startPage, Math.floor(Number(startPage) || range.startPage)));
  const e = Math.min(range.endPage, Math.max(s, Math.floor(Number(endPage) || range.endPage)));
  return { juz: range.juz, startPage: s, endPage: e };
}

export function addMonthsToDateKey(dateKey: string, months: number): string {
  const d = parseDateKeyUTC(dateKey);
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatDateKeyUTC(d);
}

/** Hari aktif dalam periode [startDate, startDate + durasi) */
export function listActiveDaysInPeriod(startDate: string, durationMonths: number, activeDaysPerWeek: number): string[] {
  const endExclusive = addMonthsToDateKey(dateKeyOf(startDate), Math.max(1, Math.min(4, Math.floor(durationMonths) || 2)));
  const days: string[] = [];
  let cursor = startDate;
  for (let guard = 0; guard < 400 && cursor < endExclusive; guard++) {
    if (isActiveStudyDay(cursor, activeDaysPerWeek)) days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

function dateKeyOf(s: string) {
  return s;
}

export function getDailyQuotaForPace(durationMonths: number): number {
  const m = Math.max(1, Math.min(4, Math.floor(durationMonths) || 2));
  if (m === 1) return STEPS_PER_PAGE; // 1 halaman (23 langkah) / hari aktif
  if (m === 2) return 11;             // 1/2 halaman (11 langkah) / hari aktif (~42 hari)
  if (m === 3) return 8;              // ~1.4 TM (8 langkah) / hari aktif (~58 hari)
  return 6;                           // 1/4 halaman (6 langkah) / hari aktif (~77 hari)
}

export function generateTikrarStepSchedule(params: TikrarTargetParams): TikrarStepSchedule {
  const { startPage, endPage } = normalizeTargetRange(params.juz, params.startPage, params.endPage);
  const activeDaysPerWeek = Math.max(1, Math.min(7, Math.floor(params.activeDaysPerWeek) || 5));
  const startDate = toDateKeyWIB(params.startDate || new Date());
  const totalSteps = (endPage - startPage + 1) * STEPS_PER_PAGE;
  const dailyQuota = getDailyQuotaForPace(params.durationMonths);

  const days: TikrarScheduleDay[] = [];
  let cursorDate = startDate;
  let cursor = 0;
  let dayIdx = 0;

  for (let guard = 0; guard < 2000 && cursor < totalSteps; guard++) {
    if (isActiveStudyDay(cursorDate, activeDaysPerWeek)) {
      dayIdx += 1;
      const fromStep = cursor;
      const toStep = Math.min(totalSteps, cursor + dailyQuota);
      const items = [];
      for (let g = fromStep; g < toStep; g++) {
        const { page, step } = getStepByGlobalIndex(startPage, g);
        items.push({ page, stepIndex: step.index, label: step.label, shortLabel: step.shortLabel });
      }
      days.push({
        date: cursorDate,
        dayIndex: dayIdx,
        weekNumber: Math.floor((dayIdx - 1) / activeDaysPerWeek) + 1,
        fromStep,
        toStep,
        items,
      });
      cursor = toStep;
    }
    if (cursor < totalSteps) {
      cursorDate = addCalendarDays(cursorDate, 1);
    }
  }

  const estimatedFinishDate = days[days.length - 1]?.date || startDate;
  const endDate = estimatedFinishDate;

  return {
    totalSteps,
    activeDays: days.length,
    dailyQuota,
    endDate,
    estimatedFinishDate,
    days,
  };
}

/** Langkah global yang seharusnya sudah tercapai pada akhir `dateKey` */
export function expectedStepsByDate(schedule: TikrarStepSchedule, dateKey: string): number {
  let expected = 0;
  for (const d of schedule.days) {
    if (d.date > dateKey) break;
    expected = d.toStep;
  }
  return expected;
}

// ---------------------------------------------------------------------------
// Gerbang halaman: lulus ujian halaman membuka halaman berikutnya
// ---------------------------------------------------------------------------

export function buildClearedPageSet(
  quizPassedPages: Iterable<number>,
  submissions: SubmissionGateRecord[] = [],
  passedExamPages?: Set<number>
): Set<number> {
  const set = new Set<number>();
  for (const p of quizPassedPages) set.add(Number(p));
  const pages = new Set<number>(submissions.map((s) => Number(s.page_number)));
  pages.forEach((p) => {
    if (isPageSubmissionCleared(p, submissions, passedExamPages)) set.add(p);
  });
  passedExamPages?.forEach((p) => set.add(p));
  return set;
}

/** Halaman tertinggi yang boleh dilatih dalam target (halaman pertama yang belum lulus ujian) */
export function computeUnlockedPage(startPage: number, endPage: number, clearedPages: Set<number>): number {
  for (let p = startPage; p <= endPage; p++) {
    if (!clearedPages.has(p)) return p;
  }
  return endPage;
}

// ---------------------------------------------------------------------------
// Streak & poin
// ---------------------------------------------------------------------------

export const TIKRAR_POINTS = {
  active: 5,
  targetMet: 20,
  quizPassed: 30,
  tasmiPassed: 100,
  streakBonus: 50,
  streakBonusEvery: 7,
} as const;

/**
 * Streak = hari terjadwal berturut-turut dengan target tercapai.
 * Hari yang bukan hari aktif pilihan thalibah dilewati tanpa memutus streak;
 * hari ini yang belum tercapai juga belum memutus streak.
 */
export function computeTargetStreak(
  metDates: Iterable<string>,
  activeDaysPerWeek: number,
  referenceDateKey: string = toDateKeyWIB()
): number {
  const set = new Set<string>(metDates);
  let streak = 0;
  let cursor = referenceDateKey;
  for (let guard = 0; guard < 400; guard++) {
    if (set.has(cursor)) {
      streak += 1;
    } else if (cursor === referenceDateKey || !isActiveStudyDay(cursor, activeDaysPerWeek)) {
      // hari ini masih berjalan / hari libur: lewati
    } else {
      break;
    }
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export type HeatmapLevel = 'none' | 'active' | 'met' | 'tasmi';

export const HEATMAP_COLORS: Record<HeatmapLevel, string> = {
  none: 'transparent',
  active: '#bbf7d0',
  met: '#15803d',
  tasmi: '#8b5a2b',
};
