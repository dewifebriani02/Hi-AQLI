/**
 * Langkah baku Hi Tikrar per halaman mushaf & jadwal per langkah.
 *
 * Urutan langkah mengikuti urutan kartu di tab Mushaf:
 *   Simak 5x + terjemahan → A1 → A2 → Gabung A → B1 → B2 → Gabung B → Gabung A&B →
 *   C1 → C2 → Gabung C → Gabung B&C → Gabung A–C → D1 → D2 → Gabung D →
 *   Gabung C&D → Gabung B–D → Gabung A–D → Ujian halaman 30 soal.
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
export const META_PASS_THRESHOLD = 10;
export const PREP_LISTEN_THRESHOLD = 5;
export const QUIZ_QUESTION_COUNT = 30;
export const QUIZ_PASS_PERCENT = 80;

export type TikrarStepKind = 'prep' | 'sub' | 'meta' | 'quiz';

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
    { index: 0, key: `${blockNo}.a`, label: `Blok ${letter}-1`, shortLabel: `${letter}1`, kind: 'sub', target: PASS_THRESHOLD },
    { index: 0, key: `${blockNo}.b`, label: `Blok ${letter}-2`, shortLabel: `${letter}2`, kind: 'sub', target: PASS_THRESHOLD },
    {
      index: 0,
      key: `${blockNo}.combined`,
      label: `Gabung Blok ${letter}`,
      shortLabel: `Gab ${letter}`,
      kind: 'sub',
      target: PASS_THRESHOLD,
      completesBlock: blockNo,
    }
  );
});

const meta = (key: string, label: string, shortLabel: string): TikrarStepDef => ({
  index: 0,
  key: `meta.${key}`,
  label,
  shortLabel,
  kind: 'meta',
  target: META_PASS_THRESHOLD,
});

export const TIKRAR_STEPS: readonly TikrarStepDef[] = ([
  { index: 0, key: 'prep', label: 'Simak Audio 5x & Pahami Terjemahan', shortLabel: 'Simak', kind: 'prep', target: PREP_LISTEN_THRESHOLD },
  ...SUB_STEPS.slice(0, 6),
  meta('1_2', 'Gabung Blok A & B', 'Gab A-B'),
  ...SUB_STEPS.slice(6, 9),
  meta('2_3', 'Gabung Blok B & C', 'Gab B-C'),
  meta('1_2_3', 'Gabung Blok A–C', 'Gab A-C'),
  ...SUB_STEPS.slice(9, 12),
  meta('3_4', 'Gabung Blok C & D', 'Gab C-D'),
  meta('2_3_4', 'Gabung Blok B–D', 'Gab B-D'),
  meta('1_2_3_4', 'Gabung Seluruh Halaman (A–D)', 'Gab A-D'),
  { index: 0, key: 'quiz', label: `Ujian Halaman ${QUIZ_QUESTION_COUNT} Soal`, shortLabel: 'Ujian', kind: 'quiz', target: 1 },
] as TikrarStepDef[]).map((s, i) => ({ ...s, index: i }));

export const STEPS_PER_PAGE = TIKRAR_STEPS.length; // 20
/** Langkah terakhir sebelum ujian (Gabung A–D) */
export const MEMORIZED_STEP_COUNT = STEPS_PER_PAGE - 1; // 19

export interface TikrarProgressLike {
  prep_listen_count?: number | null;
  prep_translation_done?: boolean | null;
  blocks?: any;
  meta_counts?: any;
}

function stepValue(step: TikrarStepDef, prog: TikrarProgressLike | null | undefined): number {
  if (!prog) return 0;
  if (step.kind === 'prep') {
    const listened = Number(prog.prep_listen_count) || 0;
    return listened >= PREP_LISTEN_THRESHOLD && prog.prep_translation_done ? step.target : Math.min(listened, step.target - 1);
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

/**
 * Jumlah langkah berurutan yang sudah tuntas pada satu halaman (0..20).
 * `quizCleared` = lulus ujian 30 soal (atau halaman sudah lulus tasmi' lama).
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
  let total = Number(prog.prep_listen_count) || 0;
  for (const b of ['1', '2', '3', '4']) {
    for (const part of ['a', 'b', 'combined']) {
      total += Number(prog.blocks?.[b]?.[part]?.count) || 0;
    }
  }
  for (const v of Object.values(prog.meta_counts || {})) total += Number(v) || 0;
  return total;
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
  const endExclusive = addMonthsToDateKey(startDate, Math.max(1, Math.min(4, Math.floor(durationMonths) || 2)));
  const days: string[] = [];
  let cursor = startDate;
  for (let guard = 0; guard < 400 && cursor < endExclusive; guard++) {
    if (isActiveStudyDay(cursor, activeDaysPerWeek)) days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export function generateTikrarStepSchedule(params: TikrarTargetParams): TikrarStepSchedule {
  const { startPage, endPage } = normalizeTargetRange(params.juz, params.startPage, params.endPage);
  const activeDaysPerWeek = Math.max(1, Math.min(7, Math.floor(params.activeDaysPerWeek) || 5));
  const startDate = toDateKeyWIB(params.startDate || new Date());
  const totalSteps = (endPage - startPage + 1) * STEPS_PER_PAGE;
  const periodDays = listActiveDaysInPeriod(startDate, params.durationMonths, activeDaysPerWeek);
  const dailyQuota = Math.max(1, Math.ceil(totalSteps / Math.max(1, periodDays.length)));
  const endDate = addCalendarDays(addMonthsToDateKey(startDate, Math.max(1, Math.min(4, Math.floor(params.durationMonths) || 2))), -1);

  const days: TikrarScheduleDay[] = [];
  let cursor = 0;
  periodDays.forEach((date, i) => {
    if (cursor >= totalSteps) return;
    const fromStep = cursor;
    const toStep = Math.min(totalSteps, cursor + dailyQuota);
    const items = [];
    for (let g = fromStep; g < toStep; g++) {
      const { page, step } = getStepByGlobalIndex(startPage, g);
      items.push({ page, stepIndex: step.index, label: step.label, shortLabel: step.shortLabel });
    }
    days.push({
      date,
      dayIndex: i + 1,
      weekNumber: Math.floor(i / activeDaysPerWeek) + 1,
      fromStep,
      toStep,
      items,
    });
    cursor = toStep;
  });

  return {
    totalSteps,
    activeDays: periodDays.length,
    dailyQuota,
    endDate,
    estimatedFinishDate: days[days.length - 1]?.date || startDate,
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
// Gerbang halaman: lulus ujian 30 soal membuka halaman berikutnya
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
