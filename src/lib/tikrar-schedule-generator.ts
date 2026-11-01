/**
 * Core schedule generator, consistency metrics & setoran gatekeeper for HI Tikrar (Fase 2–5).
 *
 * Implements `generateTikrarSchedule` from the `alur-sistem-tikrar` specification:
 * - Maps 15-line Madani Mushaf page range for Juz 1..30
 * - Splits each page into 4 logical blocks (1=A, 2=B, 3=C, 4=D)
 * - Allocates blocks strictly onto active weekdays (default 5 days/week: Mon-Fri),
 *   leaving weekends for murajaah, tolerance catch-up, and Live Zoom tasmi'
 */

export const JUZ_PAGES: readonly number[] = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const BLOCK_LETTERS: Record<number, 'A' | 'B' | 'C' | 'D'> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
};

export const TIKRAR_GRADE_LABELS: Record<string, string> = {
  mumtaz: 'Mumtaz',
  jayyid_jiddan: 'Jayyid Jiddan',
  perlu_perbaikan: 'Perlu Perbaikan Tajwid/Kelancaran',
};

export interface TikrarPaceOption {
  durationMonths: 1 | 2 | 3 | 4;
  name: string;
  badge: string;
  targetLabel: string;
  description: string;
  tikrarLevel: number;
}

export const TIKRAR_PACE_OPTIONS: readonly TikrarPaceOption[] = [
  {
    durationMonths: 1,
    name: 'Intensif (1 Bulan)',
    badge: '4 Blok / Hari',
    targetLabel: '1 Halaman Penuh / Hari Aktif',
    description: '4 pekan × 5 hari aktif (~20–23 hari kerja). Cocok untuk fokus mutqin cepat.',
    tikrarLevel: 1,
  },
  {
    durationMonths: 2,
    name: 'Reguler (2 Bulan)',
    badge: '2 Blok / Hari',
    targetLabel: '1/2 Halaman (2 Blok) / Hari Aktif',
    description: '8 pekan × 5 hari aktif (~40–46 hari kerja). Ritme standar paling seimbang.',
    tikrarLevel: 2,
  },
  {
    durationMonths: 3,
    name: 'Santai Terukur (3 Bulan)',
    badge: '1–2 Blok / Hari',
    targetLabel: '7 Blok / Pekan (~1,4 Blok / Hari)',
    description: '12 pekan × 5 hari aktif (~58 hari kerja). Nyaman untuk ibu rumah tangga & pekerja.',
    tikrarLevel: 3,
  },
  {
    durationMonths: 4,
    name: 'Santai Pemula (4 Bulan)',
    badge: '1 Blok / Hari',
    targetLabel: '1/4 Halaman (1 Blok) / Hari Aktif',
    description: '16 pekan × 5 hari aktif (~80–92 hari kerja). Ringan & bertahap setiap hari.',
    tikrarLevel: 4,
  },
];

export function getJuzPageRange(juzInput: number): {
  juz: number;
  startPage: number;
  endPage: number;
  totalPages: number;
} {
  const juz = Math.max(1, Math.min(30, Math.floor(Number(juzInput) || 30)));
  const startPage = JUZ_PAGES[juz - 1] || 582;
  const endPage = juz < 30 ? (JUZ_PAGES[juz] || 605) - 1 : 604;
  return {
    juz,
    startPage,
    endPage,
    totalPages: endPage - startPage + 1,
  };
}

export function getJuzForPage(pageInput: number): number {
  const p = Math.max(1, Math.min(604, Math.floor(Number(pageInput) || 1)));
  let juz = 1;
  for (let i = 0; i < JUZ_PAGES.length; i++) {
    if (JUZ_PAGES[i] <= p) juz = i + 1;
    else break;
  }
  return juz;
}

/** Format Date to YYYY-MM-DD in Asia/Jakarta (WIB) or local calendar safely */
export function toDateKeyWIB(input: Date | string = new Date()): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value || '2026';
  const m = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${y}-${m}-${day}`;
}

/** Current hour (0..23) in Asia/Jakarta (WIB) */
export function getHourWIB(input: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(input);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '6', 10);
  return Number.isNaN(h) ? 6 : h % 24;
}

export function parseDateKeyUTC(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0));
}

export function formatDateKeyUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addCalendarDays(dateKey: string, deltaDays: number): string {
  const d = parseDateKeyUTC(dateKey);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return formatDateKeyUTC(d);
}

/** 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
export function getDayOfWeekFromKey(dateKey: string): number {
  return parseDateKeyUTC(dateKey).getUTCDay();
}

export function isActiveStudyDay(dateKey: string, activeDaysPerWeek = 5): boolean {
  const dow = getDayOfWeekFromKey(dateKey); // 0=Sun..6=Sat
  const clamped = Math.max(1, Math.min(7, Math.floor(activeDaysPerWeek || 5)));
  if (clamped >= 7) return true;
  if (clamped === 6) return dow >= 1 && dow <= 6; // Mon-Sat
  // For 1..5 active days/week, map to Monday (1) .. Friday (clamped)
  return dow >= 1 && dow <= clamped;
}

export interface GeneratedScheduleBlock {
  juz: number;
  page_number: number;
  block_number: 1 | 2 | 3 | 4;
  block_letter: 'A' | 'B' | 'C' | 'D';
  scheduled_date: string; // YYYY-MM-DD
  active_day_index: number; // 1-based active study day
  week_number: number; // 1-based study week
}

export interface GeneratedScheduleResult {
  juz: number;
  startPage: number;
  endPage: number;
  totalPages: number;
  totalBlocks: number;
  durationMonths: number;
  activeDaysPerWeek: number;
  startDate: string;
  estimatedEndDate: string;
  totalActiveDays: number;
  items: GeneratedScheduleBlock[];
}

function getBlocksForDaySlot(durationMonths: number, slotInWeek: number): number {
  const m = Math.max(1, Math.min(4, Math.floor(durationMonths || 2)));
  if (m === 1) return 4; // 1 halaman (4 blok) / hari
  if (m === 2) return 2; // 1/2 halaman (2 blok) / hari
  if (m === 3) {
    // 7 blok per 5 hari aktif (~3 bulan untuk 80 blok): Senin 2, Selasa 1, Rabu 2, Kamis 1, Jumat 1
    const pattern = [2, 1, 2, 1, 1, 1, 1];
    return pattern[slotInWeek % pattern.length];
  }
  return 1; // 4 bulan: 1 blok / hari
}

export function generateTikrarSchedule(params: {
  juz: number;
  durationMonths?: number;
  activeDaysPerWeek?: number;
  startDate?: Date | string;
}): GeneratedScheduleResult {
  const { juz, startPage, endPage, totalPages } = getJuzPageRange(params.juz);
  const durationMonths = Math.max(1, Math.min(4, Math.floor(Number(params.durationMonths) || 2)));
  const activeDaysPerWeek = Math.max(1, Math.min(7, Math.floor(Number(params.activeDaysPerWeek) || 5)));
  const startDateKey = toDateKeyWIB(params.startDate || new Date());

  // Build ordered queue of all blocks in this Juz
  const queue: { page_number: number; block_number: 1 | 2 | 3 | 4 }[] = [];
  for (let p = startPage; p <= endPage; p++) {
    for (const b of [1, 2, 3, 4] as const) {
      queue.push({ page_number: p, block_number: b });
    }
  }

  const items: GeneratedScheduleBlock[] = [];
  let cursorDate = startDateKey;
  let queueIdx = 0;
  let activeDayIndex = 0;
  let slotInWeek = 0;

  while (queueIdx < queue.length) {
    if (isActiveStudyDay(cursorDate, activeDaysPerWeek)) {
      activeDayIndex += 1;
      const weekNumber = Math.ceil(activeDayIndex / activeDaysPerWeek);
      const quotaToday = getBlocksForDaySlot(durationMonths, slotInWeek);

      for (let k = 0; k < quotaToday && queueIdx < queue.length; k++) {
        const nextBlock = queue[queueIdx++];
        items.push({
          juz,
          page_number: nextBlock.page_number,
          block_number: nextBlock.block_number,
          block_letter: BLOCK_LETTERS[nextBlock.block_number],
          scheduled_date: cursorDate,
          active_day_index: activeDayIndex,
          week_number: weekNumber,
        });
      }

      slotInWeek = (slotInWeek + 1) % activeDaysPerWeek;
    }

    if (queueIdx < queue.length) {
      cursorDate = addCalendarDays(cursorDate, 1);
    }
  }

  return {
    juz,
    startPage,
    endPage,
    totalPages,
    totalBlocks: queue.length,
    durationMonths,
    activeDaysPerWeek,
    startDate: items[0]?.scheduled_date || startDateKey,
    estimatedEndDate: items[items.length - 1]?.scheduled_date || startDateKey,
    totalActiveDays: activeDayIndex,
    items,
  };
}

/** Compute Monday..Sunday week range and active streak (weekend-tolerant for Sab/Ahd) */
export function computeTikrarStreakAndWeekly(
  completedDateKeys: Iterable<string>,
  referenceDateKey: string = toDateKeyWIB()
): {
  weeklyActiveDays: number;
  streak: number;
  weekStartKey: string;
  weekEndKey: string;
  last30DateKeys: string[];
} {
  const normalizedSet = new Set<string>();
  for (const raw of completedDateKeys) {
    if (!raw) continue;
    normalizedSet.add(toDateKeyWIB(raw));
  }

  // Monday of current week
  const dow = getDayOfWeekFromKey(referenceDateKey); // 0=Sun..6=Sat
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const weekStartKey = addCalendarDays(referenceDateKey, offsetToMonday);
  const weekEndKey = addCalendarDays(weekStartKey, 6);

  let weeklyActiveDays = 0;
  for (let i = 0; i < 7; i++) {
    const dk = addCalendarDays(weekStartKey, i);
    if (normalizedSet.has(dk)) weeklyActiveDays += 1;
  }

  // Active streak: walk backwards from referenceDateKey.
  // - If today is not yet logged, allow starting from yesterday (or Friday if today is Sun/Mon) without zeroing an ongoing streak.
  // - Saturdays (6) & Sundays (0) without logs do not break weekday streaks; if logged on weekend, they count as bonus streak days!
  let streak = 0;
  let cursor = referenceDateKey;
  let graceUsed = false;

  for (let guard = 0; guard < 400; guard++) {
    const hasLog = normalizedSet.has(cursor);
    const cDow = getDayOfWeekFromKey(cursor);
    const isWeekend = cDow === 0 || cDow === 6;

    if (hasLog) {
      streak += 1;
      graceUsed = true;
    } else if (isWeekend) {
      // Weekend tolerance: skip without breaking streak
    } else if (!graceUsed && cursor === referenceDateKey) {
      // Today hasn't been submitted yet; check yesterday/previous active day
      graceUsed = true;
    } else {
      break;
    }
    cursor = addCalendarDays(cursor, -1);
  }

  const last30DateKeys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    last30DateKeys.push(addCalendarDays(referenceDateKey, -i));
  }

  return {
    weeklyActiveDays,
    streak,
    weekStartKey,
    weekEndKey,
    last30DateKeys,
  };
}

export interface SubmissionGateRecord {
  page_number: number | string;
  blocks_range?: string | null;
  status?: string | null;
}

/**
 * Fase 5 Gatekeeper: Check whether a Mushaf page has passed Live Zoom tasmi'
 * (`blok_1_4` passed, OR both `blok_1_2` and `blok_3_4` passed, OR legacy `page_exams.passed`).
 */
export function isPageSubmissionCleared(
  pageNumber: number,
  submissions: SubmissionGateRecord[] = [],
  passedExamPages?: Set<number>
): boolean {
  if (passedExamPages?.has(pageNumber)) return true;

  let passedFirstHalf = false;
  let passedSecondHalf = false;

  for (const s of submissions) {
    if (Number(s?.page_number) !== pageNumber) continue;
    if (s?.status !== 'passed') continue;
    const range = s?.blocks_range || 'blok_1_2';
    if (range === 'blok_1_4') return true;
    if (range === 'blok_1_2') passedFirstHalf = true;
    if (range === 'blok_3_4') passedSecondHalf = true;
  }

  return passedFirstHalf && passedSecondHalf;
}

/**
 * Fase 5 Gatekeeper: Determine the maximum unlocked page inside `juz` (`startPage .. endPage`).
 * A learner cannot jump to page `P + 1` until page `P` has passed Live Zoom tasmi'.
 */
export function computeMaxUnlockedPageInJuz(
  juzInput: number,
  submissions: SubmissionGateRecord[] = [],
  passedExamPages?: Set<number>
): number {
  const { startPage, endPage } = getJuzPageRange(juzInput);
  for (let p = startPage; p <= endPage; p++) {
    if (!isPageSubmissionCleared(p, submissions, passedExamPages)) {
      return p;
    }
  }
  return endPage;
}
