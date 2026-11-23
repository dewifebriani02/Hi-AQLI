import {
  addCalendarDays,
  getDayOfWeekFromKey,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';

export interface MufradatPageAttempt {
  quiz_id?: string | null;
  page_id?: number | string | null;
  created_at?: string | Date | null;
}

export interface TikrarPageQuizRow {
  page_number: number | string;
  created_at?: string | Date | null;
}

export interface TikrarSubmissionRow {
  page_number: number | string;
  blocks_range?: string | null;
  cleared_at?: string | Date | null;
}

export interface PageExamRow {
  page_number: number | string;
  created_at?: string | Date | null;
}

export interface CombinedPageStats {
  weekly: number;
  total: number;
  mufradat: {
    weekly: number;
    total: number;
  };
  tikrar: {
    weekly: number;
    total: number;
  };
}

export function normalizeDateKeysWIB(dateInputs: Iterable<string | Date | null | undefined>): Set<string> {
  const set = new Set<string>();
  for (const raw of dateInputs) {
    if (!raw) continue;
    set.add(toDateKeyWIB(raw));
  }
  return set;
}

export function getWeekStartKeyWIB(referenceDateKey: string = toDateKeyWIB()): string {
  const dow = getDayOfWeekFromKey(referenceDateKey); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(referenceDateKey, offsetToMonday);
}

/**
 * Consecutive active days (Mufradat + Tikrar) up to `referenceDateKey`.
 * Allows 1-day grace for today if today has no activity yet (continues from yesterday).
 */
export function computeCombinedStreak(
  activeDateKeys: Iterable<string>,
  referenceDateKey: string = toDateKeyWIB()
): number {
  const activeSet = new Set<string>();
  for (const dk of activeDateKeys) {
    if (dk) activeSet.add(toDateKeyWIB(dk));
  }
  if (activeSet.size === 0) return 0;

  let cursor = referenceDateKey;
  if (!activeSet.has(cursor)) {
    const yesterday = addCalendarDays(referenceDateKey, -1);
    if (!activeSet.has(yesterday)) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (!activeSet.has(cursor)) break;
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

/** 7 booleans (Monday..Sunday of current WIB week) */
export function computeActivity7Days(
  activeDateKeys: Iterable<string>,
  referenceDateKey: string = toDateKeyWIB()
): boolean[] {
  const activeSet = new Set<string>();
  for (const dk of activeDateKeys) {
    if (dk) activeSet.add(toDateKeyWIB(dk));
  }
  const mondayKey = getWeekStartKeyWIB(referenceDateKey);
  return Array.from({ length: 7 }, (_, i) => activeSet.has(addCalendarDays(mondayKey, i)));
}

export function computeCombinedPageStats(input: {
  mufradatPassedAttempts: MufradatPageAttempt[];
  tikrarQuizPassed: TikrarPageQuizRow[];
  tikrarSubmissionsPassed: TikrarSubmissionRow[];
  pageExamsPassed: PageExamRow[];
  weekStartKey?: string;
}): CombinedPageStats {
  const weekStartKey = input.weekStartKey || getWeekStartKeyWIB();

  // 1. Hi Mufradat passed pages
  const mufradatTotalPages = new Set<number>();
  const mufradatWeeklyPages = new Set<number>();
  for (const row of input.mufradatPassedAttempts) {
    const rawPage =
      row.page_id !== null && row.page_id !== undefined && row.page_id !== ''
        ? Number(row.page_id)
        : row.quiz_id?.startsWith('mufradat_page_')
        ? Number(row.quiz_id.replace('mufradat_page_', ''))
        : NaN;
    if (!Number.isInteger(rawPage) || rawPage < 1 || rawPage > 604) continue;
    mufradatTotalPages.add(rawPage);
    if (row.created_at) {
      const dk = toDateKeyWIB(row.created_at);
      if (dk >= weekStartKey) {
        mufradatWeeklyPages.add(rawPage);
      }
    }
  }

  // 2. Hi Tikrar cleared pages (60-soal page quiz, full-page tasmi' submission, or legacy page_exams)
  const tikrarTotalPages = new Set<number>();
  const tikrarWeeklyPages = new Set<number>();

  const markTikrarCleared = (pageNumRaw: number | string, dateVal?: string | Date | null) => {
    const pageNum = Number(pageNumRaw);
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) return;
    tikrarTotalPages.add(pageNum);
    if (dateVal) {
      const dk = toDateKeyWIB(dateVal);
      if (dk >= weekStartKey) {
        tikrarWeeklyPages.add(pageNum);
      }
    }
  };

  for (const q of input.tikrarQuizPassed) {
    markTikrarCleared(q.page_number, q.created_at);
  }

  for (const e of input.pageExamsPassed) {
    markTikrarCleared(e.page_number, e.created_at);
  }

  const subByPage = new Map<
    number,
    { firstHalfDates: string[]; secondHalfDates: string[] }
  >();
  for (const s of input.tikrarSubmissionsPassed) {
    const pageNum = Number(s.page_number);
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 604) continue;
    const range = s.blocks_range || 'blok_1_2';
    const dk = s.cleared_at ? toDateKeyWIB(s.cleared_at) : '';
    if (range === 'blok_1_4') {
      markTikrarCleared(pageNum, dk || null);
      continue;
    }
    if (!subByPage.has(pageNum)) {
      subByPage.set(pageNum, { firstHalfDates: [], secondHalfDates: [] });
    }
    const entry = subByPage.get(pageNum)!;
    if (range === 'blok_1_2' && dk) entry.firstHalfDates.push(dk);
    if (range === 'blok_3_4' && dk) entry.secondHalfDates.push(dk);
    if (range === 'blok_1_2' && !dk) entry.firstHalfDates.push('');
    if (range === 'blok_3_4' && !dk) entry.secondHalfDates.push('');
  }

  subByPage.forEach((entry, pageNum) => {
    if (entry.firstHalfDates.length > 0 && entry.secondHalfDates.length > 0) {
      tikrarTotalPages.add(pageNum);
      const validDates = [...entry.firstHalfDates, ...entry.secondHalfDates].filter(Boolean).sort();
      const latestFirst = entry.firstHalfDates.filter(Boolean).sort().pop() || '';
      const latestSecond = entry.secondHalfDates.filter(Boolean).sort().pop() || '';
      const completionDate =
        latestFirst && latestSecond
          ? (latestFirst > latestSecond ? latestFirst : latestSecond)
          : validDates.pop() || '';
      if (completionDate && completionDate >= weekStartKey) {
        tikrarWeeklyPages.add(pageNum);
      }
    }
  });

  return {
    weekly: mufradatWeeklyPages.size + tikrarWeeklyPages.size,
    total: mufradatTotalPages.size + tikrarTotalPages.size,
    mufradat: {
      weekly: mufradatWeeklyPages.size,
      total: mufradatTotalPages.size,
    },
    tikrar: {
      weekly: tikrarWeeklyPages.size,
      total: tikrarTotalPages.size,
    },
  };
}
