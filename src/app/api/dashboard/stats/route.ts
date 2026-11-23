import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { addCalendarDays, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import {
  computeActivity7Days,
  computeCombinedPageStats,
  computeCombinedStreak,
  getWeekStartKeyWIB,
} from '@/lib/dashboard-stats';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401 }
      );
    }

    const todayKey = toDateKeyWIB();
    const weekStartKey = getWeekStartKeyWIB(todayKey);
    const fromKey = addCalendarDays(todayKey, -400);

    const [
      mufradatDatesRes,
      tikrarActivityDatesRes,
      tikrarLogDatesRes,
      tikrarQuizDatesRes,
      mufradatPagesRes,
      tikrarQuizPagesRes,
      tikrarSubPagesRes,
      pageExamPagesRes,
    ] = await Promise.all([
      pool.query(
        `SELECT DISTINCT to_char((created_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS d
         FROM public.quiz_attempts
         WHERE user_id = $1 AND (created_at AT TIME ZONE 'Asia/Jakarta')::date >= $2::date`,
        [ctx.userId, fromKey]
      ),
      pool.query(
        `SELECT DISTINCT to_char(activity_date, 'YYYY-MM-DD') AS d
         FROM public.tikrar_daily_activity
         WHERE user_id = $1 AND (clicks > 0 OR target_met) AND activity_date >= $2::date`,
        [ctx.userId, fromKey]
      ),
      pool.query(
        `SELECT DISTINCT to_char(log_date, 'YYYY-MM-DD') AS d
         FROM public.tikrar_daily_logs
         WHERE user_id = $1 AND completed = true AND log_date >= $2::date`,
        [ctx.userId, fromKey]
      ),
      pool.query(
        `SELECT DISTINCT to_char((created_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS d
         FROM public.tikrar_page_quizzes
         WHERE user_id = $1
           AND COALESCE(question_types->>'source', '') <> 'prior_hafalan'
           AND (created_at AT TIME ZONE 'Asia/Jakarta')::date >= $2::date`,
        [ctx.userId, fromKey]
      ),
      pool.query(
        `SELECT quiz_id, page_id, created_at
         FROM public.quiz_attempts
         WHERE user_id = $1 AND is_passed = true AND quiz_id LIKE 'mufradat_page_%'`,
        [ctx.userId]
      ),
      pool.query(
        `SELECT page_number, created_at
         FROM public.tikrar_page_quizzes
         WHERE user_id = $1
           AND passed = true
           AND COALESCE(question_types->>'source', '') <> 'prior_hafalan'`,
        [ctx.userId]
      ),
      pool.query(
        `SELECT page_number, blocks_range,
                COALESCE(verified_at, updated_at, submitted_at, created_at) AS cleared_at
         FROM public.tikrar_submissions
         WHERE user_id = $1 AND status = 'passed'`,
        [ctx.userId]
      ),
      pool.query(
        `SELECT page_number, created_at
         FROM public.page_exams
         WHERE user_id = $1 AND passed = true`,
        [ctx.userId]
      ),
    ]);

    const activeDateKeys = new Set<string>();
    for (const r of mufradatDatesRes.rows) if (r.d) activeDateKeys.add(r.d);
    for (const r of tikrarActivityDatesRes.rows) if (r.d) activeDateKeys.add(r.d);
    for (const r of tikrarLogDatesRes.rows) if (r.d) activeDateKeys.add(r.d);
    for (const r of tikrarQuizDatesRes.rows) if (r.d) activeDateKeys.add(r.d);

    const streakDays = computeCombinedStreak(activeDateKeys, todayKey);
    const activity7Days = computeActivity7Days(activeDateKeys, todayKey);
    const pageStats = computeCombinedPageStats({
      mufradatPassedAttempts: mufradatPagesRes.rows,
      tikrarQuizPassed: tikrarQuizPagesRes.rows,
      tikrarSubmissionsPassed: tikrarSubPagesRes.rows,
      pageExamsPassed: pageExamPagesRes.rows,
      weekStartKey,
    });

    return NextResponse.json({
      data: {
        todayKey,
        weekStartKey,
        streakDays,
        activity7Days,
        pageStats,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[DASHBOARD_STATS_GET_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memuat statistik dashboard.' } },
      { status: 500 }
    );
  }
}
