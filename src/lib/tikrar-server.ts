import type { PoolClient } from 'pg';
import { pool } from '@/lib/db';
import { addCalendarDays, getJuzForPage, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import {
  buildClearedPageSet,
  computeTargetStreak,
  computeUnlockedPage,
  countCompletedSteps,
  generateTikrarStepSchedule,
  STEPS_PER_PAGE,
  TIKRAR_POINTS,
  type TikrarStepSchedule,
} from '@/lib/tikrar-steps';

type Db = PoolClient | typeof pool;

export interface ActiveTikrarTarget {
  id: string;
  juz: number;
  startPage: number;
  endPage: number;
  startDate: string;
  durationMonths: number;
  activeDaysPerWeek: number;
  halaqahId: string | null;
  createdAt: string;
  isLegacy: boolean;
  schedule: TikrarStepSchedule;
}

export async function loadActiveTarget(db: Db, userId: string): Promise<ActiveTikrarTarget | null> {
  const { rows } = await db.query(
    `SELECT id, juz, start_page, end_page, to_char(start_date, 'YYYY-MM-DD') AS start_date,
            duration_months, active_days_per_week, halaqah_id, created_at, is_legacy
     FROM public.tikrar_targets
     WHERE user_id = $1 AND is_active
     LIMIT 1`,
    [userId]
  );
  const r = rows[0];
  if (!r) return null;
  const params = {
    juz: Number(r.juz),
    startPage: Number(r.start_page),
    endPage: Number(r.end_page),
    startDate: r.start_date,
    durationMonths: Number(r.duration_months),
    activeDaysPerWeek: Number(r.active_days_per_week),
  };
  return {
    id: r.id,
    ...params,
    halaqahId: r.halaqah_id || null,
    createdAt: new Date(r.created_at).toISOString(),
    isLegacy: Boolean(r.is_legacy),
    schedule: generateTikrarStepSchedule(params),
  };
}

/** Halaman yang lulus ujian 30 soal, ditambah halaman lama yang sudah lulus tasmi'/ujian lisan */
export async function loadClearedPages(db: Db, userId: string): Promise<{
  cleared: Set<number>;
  quizPassed: Set<number>;
  tasmiPassed: Set<number>;
}> {
  // Berurutan: `db` bisa berupa satu PoolClient di dalam transaksi
  const { rows: quizRows } = await db.query(
    `SELECT DISTINCT page_number FROM public.tikrar_page_quizzes WHERE user_id = $1 AND passed`,
    [userId]
  );
  const { rows: subRows } = await db.query(
    `SELECT page_number, blocks_range, status FROM public.tikrar_submissions WHERE user_id = $1 AND status = 'passed'`,
    [userId]
  );
  const { rows: examRows } = await db.query(
    `SELECT DISTINCT page_number FROM public.page_exams WHERE user_id = $1 AND passed = true`,
    [userId]
  );
  const quizPassed = new Set<number>(quizRows.map((r) => Number(r.page_number)));
  const examSet = new Set<number>(examRows.map((r) => Number(r.page_number)));
  const tasmiPassed = buildClearedPageSet([], subRows, examSet);
  const cleared = new Set<number>([...quizPassed, ...tasmiPassed]);
  return { cleared, quizPassed, tasmiPassed };
}

/** Total langkah tuntas di seluruh halaman yang pernah dilatih (monoton, tidak bergantung target) */
export async function computeTotalCompletedSteps(
  db: Db,
  userId: string,
  cleared: Set<number>,
  override?: { page: number; row: any }
): Promise<number> {
  const { rows } = await db.query(
    `SELECT page_number, prep_listen_count, prep_translation_done, blocks, meta_counts
     FROM public.tikrar_user_progress WHERE user_id = $1`,
    [userId]
  );
  let total = 0;
  const seen = new Set<number>();
  for (const r of rows) {
    const p = Number(r.page_number);
    seen.add(p);
    const row = override && override.page === p ? override.row : r;
    total += countCompletedSteps(row, cleared.has(p));
  }
  if (override && !seen.has(override.page)) {
    total += countCompletedSteps(override.row, cleared.has(override.page));
  }
  return total;
}

export function computeUnlockedPageForTarget(target: ActiveTikrarTarget | null, cleared: Set<number>): number | null {
  if (!target) return null;
  return computeUnlockedPage(target.startPage, target.endPage, cleared);
}

/** Halaman boleh dilatih: halaman lulus (murajaah) atau halaman target <= halaman terbuka */
export function isPagePracticeAllowed(
  page: number,
  target: ActiveTikrarTarget | null,
  cleared: Set<number>
): { allowed: boolean; reason?: string; unlockedPage?: number } {
  if (!target) {
    return { allowed: false, reason: 'Isi Target & Jadwal terlebih dahulu sebelum mulai berlatih.' };
  }
  if (cleared.has(page)) return { allowed: true };
  const unlockedPage = computeUnlockedPage(target.startPage, target.endPage, cleared);
  if (page < target.startPage || page > target.endPage) {
    return {
      allowed: false,
      reason: `Halaman ${page} di luar target (Hal. ${target.startPage}–${target.endPage}).`,
      unlockedPage,
    };
  }
  if (page > unlockedPage) {
    return {
      allowed: false,
      reason: `Halaman ${page} masih terkunci. Luluskan ujian 30 soal Halaman ${unlockedPage} terlebih dahulu.`,
      unlockedPage,
    };
  }
  return { allowed: true, unlockedPage };
}

async function loadMetDates(db: Db, userId: string): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT to_char(activity_date, 'YYYY-MM-DD') AS d FROM public.tikrar_daily_activity
     WHERE user_id = $1 AND target_met AND activity_date >= CURRENT_DATE - INTERVAL '400 days'`,
    [userId]
  );
  return rows.map((r) => r.d);
}

export async function computeUserStreak(db: Db, userId: string, activeDaysPerWeek: number, todayKey = toDateKeyWIB()) {
  return computeTargetStreak(await loadMetDates(db, userId), activeDaysPerWeek, todayKey);
}

/**
 * Catat aktivitas hari ini (klik & langkah tuntas), tentukan hijau muda / hijau pekat, dan beri poin idempoten:
 *   +5 aktif pertama kali hari ini, +15 lagi saat target harian tercapai (total 20),
 *   +50 bonus setiap streak kelipatan 7.
 * Harus dipanggil di dalam transaksi `client`.
 */
export async function recordTikrarActivity(
  client: PoolClient,
  userId: string,
  input: { clicksDelta: number; stepsBefore: number; stepsAfter: number; target: ActiveTikrarTarget | null }
): Promise<{
  pointsAwarded: number;
  targetMet: boolean;
  justMetTarget: boolean;
  streak: number;
  stepsToday: number;
  dailyQuota: number;
  clicks: number;
}> {
  const todayKey = toDateKeyWIB();
  const dailyQuota = input.target?.schedule.dailyQuota || 1;
  const clicksDelta = Math.max(0, Math.floor(input.clicksDelta));
  const stepsAdvanced = input.stepsAfter > input.stepsBefore;

  const { rows: exRows } = await client.query(
    `SELECT clicks, steps_start, steps_now, target_met, points_awarded
     FROM public.tikrar_daily_activity WHERE user_id = $1 AND activity_date = $2::date FOR UPDATE`,
    [userId, todayKey]
  );
  const ex = exRows[0];

  if (!ex && clicksDelta === 0 && !stepsAdvanced) {
    return { pointsAwarded: 0, targetMet: false, justMetTarget: false, streak: 0, stepsToday: 0, dailyQuota, clicks: 0 };
  }

  const clicks = (Number(ex?.clicks) || 0) + clicksDelta;
  const stepsStart = ex ? Number(ex.steps_start) : input.stepsBefore;
  const stepsNow = Math.max(Number(ex?.steps_now) || 0, input.stepsAfter);
  const stepsToday = Math.max(0, stepsNow - stepsStart);
  const wasMet = Boolean(ex?.target_met);
  const targetMet = wasMet || (clicks > 0 && stepsToday >= dailyQuota);
  const justMetTarget = targetMet && !wasMet;

  let pointsAwarded = 0;
  const prevPoints = Number(ex?.points_awarded) || 0;
  if (!ex || prevPoints === 0) pointsAwarded += TIKRAR_POINTS.active;

  let streak = 0;
  if (justMetTarget) {
    pointsAwarded += TIKRAR_POINTS.targetMet - TIKRAR_POINTS.active;
  }

  await client.query(
    `INSERT INTO public.tikrar_daily_activity (user_id, activity_date, clicks, steps_start, steps_now, daily_quota, target_met, points_awarded, updated_at)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (user_id, activity_date) DO UPDATE SET
       clicks = EXCLUDED.clicks,
       steps_now = EXCLUDED.steps_now,
       daily_quota = EXCLUDED.daily_quota,
       target_met = EXCLUDED.target_met,
       points_awarded = public.tikrar_daily_activity.points_awarded + $9,
       updated_at = now()`,
    [userId, todayKey, clicks, stepsStart, stepsNow, dailyQuota, targetMet, prevPoints + pointsAwarded, pointsAwarded]
  );

  if (justMetTarget) {
    streak = await computeUserStreak(client, userId, input.target?.activeDaysPerWeek || 5, todayKey);
    if (streak > 0 && streak % TIKRAR_POINTS.streakBonusEvery === 0) {
      pointsAwarded += TIKRAR_POINTS.streakBonus;
      await client.query(
        `UPDATE public.tikrar_daily_activity SET points_awarded = points_awarded + $3
         WHERE user_id = $1 AND activity_date = $2::date`,
        [userId, todayKey, TIKRAR_POINTS.streakBonus]
      );
    }
  }

  if (pointsAwarded > 0) {
    await client.query(`UPDATE public.users SET points = COALESCE(points, 0) + $1, updated_at = now() WHERE id = $2`, [
      pointsAwarded,
      userId,
    ]);
  }

  return { pointsAwarded, targetMet, justMetTarget, streak, stepsToday, dailyQuota, clicks };
}

/** Ringkasan Tikrar untuk satu thalibah: target, jadwal, hari ini, streak, halaman terbuka, langkah per halaman */
export async function buildTikrarSummary(userId: string) {
  const todayKey = toDateKeyWIB();
  const target = await loadActiveTarget(pool, userId);
  const { cleared, quizPassed, tasmiPassed } = await loadClearedPages(pool, userId);

  const [{ rows: progressRows }, { rows: activityRows }, { rows: userRows }, { rows: quizRows }, { rows: targetHistory }] =
    await Promise.all([
      pool.query(
        `SELECT page_number, juz, prep_listen_count, prep_translation_done, blocks, meta_counts, updated_at
         FROM public.tikrar_user_progress WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT to_char(activity_date, 'YYYY-MM-DD') AS date, clicks, steps_start, steps_now, daily_quota, target_met, points_awarded
         FROM public.tikrar_daily_activity
         WHERE user_id = $1 AND activity_date >= $2::date
         ORDER BY activity_date DESC`,
        [userId, addCalendarDays(todayKey, -400)]
      ),
      pool.query(`SELECT points FROM public.users WHERE id = $1`, [userId]),
      pool.query(
        `SELECT page_number, score, correct_answers, total_questions, passed, created_at
         FROM public.tikrar_page_quizzes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n,
                COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days' AND NOT is_legacy)::int AS recent
         FROM public.tikrar_targets WHERE user_id = $1`,
        [userId]
      ),
    ]);

  const stepsByPage: Record<number, number> = {};
  for (const r of progressRows) {
    const p = Number(r.page_number);
    stepsByPage[p] = countCompletedSteps(r, cleared.has(p));
  }
  cleared.forEach((p) => {
    if (stepsByPage[p] === undefined) stepsByPage[p] = STEPS_PER_PAGE;
  });

  const metDates = activityRows.filter((a) => a.target_met).map((a) => a.date);
  const activeDays = target?.activeDaysPerWeek || 5;
  const streak = computeTargetStreak(metDates, activeDays, todayKey);
  const today = activityRows.find((a) => a.date === todayKey) || null;

  let targetInfo = null;
  if (target) {
    let completedInTarget = 0;
    for (let p = target.startPage; p <= target.endPage; p++) completedInTarget += stepsByPage[p] || 0;
    const unlockedPage = computeUnlockedPage(target.startPage, target.endPage, cleared);
    const clearedInTarget = [];
    for (let p = target.startPage; p <= target.endPage; p++) if (cleared.has(p)) clearedInTarget.push(p);
    const todaySchedule = target.schedule.days.find((d) => d.date === todayKey) || null;
    const nextSchedule = target.schedule.days.find((d) => d.date >= todayKey) || null;
    let expected = 0;
    for (const d of target.schedule.days) {
      if (d.date > todayKey) break;
      expected = d.toStep;
    }
    targetInfo = {
      id: target.id,
      juz: target.juz,
      startPage: target.startPage,
      endPage: target.endPage,
      startDate: target.startDate,
      endDate: target.schedule.endDate,
      durationMonths: target.durationMonths,
      activeDaysPerWeek: target.activeDaysPerWeek,
      halaqahId: target.halaqahId,
      createdAt: target.createdAt,
      dailyQuota: target.schedule.dailyQuota,
      totalSteps: target.schedule.totalSteps,
      completedSteps: completedInTarget,
      expectedStepsToday: expected,
      unlockedPage,
      clearedPagesInTarget: clearedInTarget,
      todaySchedule,
      nextSchedule,
      // Target selalu boleh diubah; UI mengingatkan istiqomah bila sering berganti
      canChangeTarget: true,
      // Sudah lulus >=1 halaman pada target ini sejak target dibuat
      hasPassedPageInTarget: quizRows.some(
        (q) =>
          q.passed &&
          Number(q.page_number) >= target.startPage &&
          Number(q.page_number) <= target.endPage &&
          new Date(q.created_at).getTime() >= new Date(target.createdAt).getTime()
      ),
    };
  }

  return {
    todayKey,
    target: targetInfo,
    hasEverHadTarget: (targetHistory[0]?.n || 0) > 0,
    // Jumlah target yang dibuat thalibah dalam 30 hari terakhir (untuk pengingat istiqomah)
    targetChangesLast30Days: Number(targetHistory[0]?.recent) || 0,
    points: Number(userRows[0]?.points) || 0,
    streak,
    today: today
      ? {
          clicks: Number(today.clicks) || 0,
          stepsToday: Math.max(0, Number(today.steps_now) - Number(today.steps_start)),
          dailyQuota: Number(today.daily_quota) || target?.schedule.dailyQuota || 1,
          targetMet: Boolean(today.target_met),
        }
      : { clicks: 0, stepsToday: 0, dailyQuota: target?.schedule.dailyQuota || 1, targetMet: false },
    activity: activityRows.slice(0, 60).map((a) => ({
      date: a.date,
      clicks: Number(a.clicks) || 0,
      targetMet: Boolean(a.target_met),
      stepsToday: Math.max(0, Number(a.steps_now) - Number(a.steps_start)),
    })),
    stepsByPage,
    quizPassedPages: Array.from(quizPassed).sort((a, b) => a - b),
    tasmiPassedPages: Array.from(tasmiPassed).sort((a, b) => a - b),
    recentQuizzes: quizRows.slice(0, 10).map((q) => ({
      page: Number(q.page_number),
      score: Number(q.score),
      correct: Number(q.correct_answers),
      total: Number(q.total_questions),
      passed: Boolean(q.passed),
      createdAt: new Date(q.created_at).toISOString(),
    })),
    lastPracticedPage: progressRows[0] ? Number(progressRows[0].page_number) : null,
    // Progres halaman aktif target: bahan perkiraan klik target hari ini yang sama dengan heatmap grup
    unlockedPageProgress: targetInfo
      ? (() => {
          const r = progressRows.find((row) => Number(row.page_number) === targetInfo!.unlockedPage);
          return r
            ? {
                prep_listen_count: r.prep_listen_count,
                prep_translation_done: r.prep_translation_done,
                blocks: r.blocks,
                meta_counts: r.meta_counts,
              }
            : null;
        })()
      : null,
    lastPracticedJuz: progressRows[0] ? Number(progressRows[0].juz) || getJuzForPage(Number(progressRows[0].page_number)) : null,
  };
}

export type TikrarSummary = Awaited<ReturnType<typeof buildTikrarSummary>>;
