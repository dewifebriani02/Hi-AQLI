import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzForPage } from '@/lib/tikrar-schedule-generator';
import {
  countCompletedSteps,
  MEMORIZED_STEP_COUNT,
  QUIZ_PASS_PERCENT,
  QUIZ_QUESTION_COUNT,
  TIKRAR_POINTS,
} from '@/lib/tikrar-steps';
import {
  computeTotalCompletedSteps,
  computeUnlockedPageForTarget,
  isPagePracticeAllowed,
  loadActiveTarget,
  loadClearedPages,
  recordTikrarActivity,
} from '@/lib/tikrar-server';

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }

    const body = await req.json();
    const pageNumber = Math.max(1, Math.min(604, Math.floor(Number(body.page_number) || 0)));
    const total = Math.floor(Number(body.total_questions) || 0);
    const correct = Math.max(0, Math.min(total, Math.floor(Number(body.correct_answers) || 0)));
    if (!pageNumber || total < QUIZ_QUESTION_COUNT) {
      return NextResponse.json(
        { error: { message: `Ujian halaman harus berisi ${QUIZ_QUESTION_COUNT} soal.` } },
        { status: 400 }
      );
    }
    const questionTypes =
      body.question_types && typeof body.question_types === 'object' ? body.question_types : {};

    const target = await loadActiveTarget(client, ctx.userId);
    const { cleared } = await loadClearedPages(client, ctx.userId);
    const gate = isPagePracticeAllowed(pageNumber, target, cleared);
    if (!gate.allowed) {
      return NextResponse.json({ error: { message: gate.reason, code: 'PAGE_LOCKED' } }, { status: 403 });
    }

    const { rows: progRows } = await client.query(
      `SELECT prep_listen_count, prep_translation_done, blocks, meta_counts
       FROM public.tikrar_user_progress WHERE user_id = $1 AND page_number = $2`,
      [ctx.userId, pageNumber]
    );
    if (!cleared.has(pageNumber) && countCompletedSteps(progRows[0], false) < MEMORIZED_STEP_COUNT) {
      return NextResponse.json(
        {
          error: {
            message: 'Selesaikan semua langkah sampai Gabung Seluruh Halaman (A–D) sebelum ujian halaman.',
            code: 'STEPS_INCOMPLETE',
          },
        },
        { status: 403 }
      );
    }

    const score = Math.round((correct / total) * 100);
    const passed = score >= QUIZ_PASS_PERCENT;

    await client.query('BEGIN');

    const { rows: priorPass } = await client.query(
      `SELECT 1 FROM public.tikrar_page_quizzes WHERE user_id = $1 AND page_number = $2 AND passed LIMIT 1`,
      [ctx.userId, pageNumber]
    );
    const firstPass = passed && priorPass.length === 0;
    const stepsBefore = await computeTotalCompletedSteps(client, ctx.userId, cleared);

    const { rows: inserted } = await client.query(
      `INSERT INTO public.tikrar_page_quizzes (user_id, juz, page_number, total_questions, correct_answers, score, passed, question_types)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id, created_at`,
      [ctx.userId, getJuzForPage(pageNumber), pageNumber, total, correct, score, passed, JSON.stringify(questionTypes)]
    );

    let pointsAwarded = 0;
    let activity = null;
    if (firstPass) {
      const nextCleared = new Set(cleared);
      nextCleared.add(pageNumber);
      const stepsAfter = await computeTotalCompletedSteps(client, ctx.userId, nextCleared);
      activity = await recordTikrarActivity(client, ctx.userId, { clicksDelta: 1, stepsBefore, stepsAfter, target });
      pointsAwarded = activity.pointsAwarded + TIKRAR_POINTS.quizPassed;
      const nextPage = computeUnlockedPageForTarget(target, nextCleared);
      await client.query(
        `UPDATE public.users
         SET points = COALESCE(points, 0) + $1,
             tikrar_current_page = COALESCE($2, tikrar_current_page),
             tikrar_current_block = 1,
             updated_at = now()
         WHERE id = $3`,
        [TIKRAR_POINTS.quizPassed, nextPage, ctx.userId]
      );
      cleared.add(pageNumber);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      data: {
        id: inserted[0]?.id,
        score,
        passed,
        firstPass,
        pointsAwarded,
        activity,
        unlockedPage: computeUnlockedPageForTarget(target, cleared),
      },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[TIKRAR_QUIZ_POST_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal menyimpan hasil ujian.' } }, { status: 500 });
  } finally {
    client.release();
  }
}
