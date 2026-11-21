import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzPageRange, TIKRAR_PACE_OPTIONS, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import { generateTikrarStepSchedule, normalizeTargetRange, TIKRAR_STEPS } from '@/lib/tikrar-steps';
import { buildTikrarSummary } from '@/lib/tikrar-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }
    const summary = await buildTikrarSummary(ctx.userId);
    return NextResponse.json({ data: summary, error: null });
  } catch (err: any) {
    console.error('[TIKRAR_SCHEDULE_GET_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memuat jadwal Tikrar.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu untuk menyimpan jadwal.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { juz, startPage, endPage } = normalizeTargetRange(
      Number(body.juz),
      Number(body.start_page ?? body.start_from_page),
      Number(body.end_page)
    );
    const durationMonths = Math.max(1, Math.min(4, Math.floor(Number(body.duration_months) || 2)));
    const activeDaysPerWeek = Math.max(1, Math.min(7, Math.floor(Number(body.active_days_per_week) || 5)));
    const startDate = toDateKeyWIB(body.start_date || new Date());
    const rawHalaqahId = typeof body.halaqah_id === 'string' ? body.halaqah_id.trim() : '';
    const halaqahId = UUID_RE.test(rawHalaqahId) ? rawHalaqahId : null;

    const schedule = generateTikrarStepSchedule({ juz, startPage, endPage, startDate, durationMonths, activeDaysPerWeek });

    await client.query('BEGIN');

    await client.query(
      `UPDATE public.tikrar_targets SET is_active = false, ended_at = now() WHERE user_id = $1 AND is_active`,
      [ctx.userId]
    );
    const { rows: targetRows } = await client.query(
      `INSERT INTO public.tikrar_targets (
         user_id, halaqah_id, juz, start_page, end_page, start_date, duration_months, active_days_per_week, daily_step_quota
       ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)
       RETURNING id`,
      [ctx.userId, halaqahId, juz, startPage, endPage, startDate, durationMonths, activeDaysPerWeek, schedule.dailyQuota]
    );

    const paceMeta = TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === durationMonths) || TIKRAR_PACE_OPTIONS[1];
    const { rows: currentUserRows } = await client.query(
      `SELECT followed_halaqahs FROM public.users WHERE id = $1 LIMIT 1`,
      [ctx.userId]
    );
    const existingFollowed: string[] = Array.isArray(currentUserRows[0]?.followed_halaqahs)
      ? currentUserRows[0].followed_halaqahs
      : [];
    const nextFollowed =
      halaqahId && !existingFollowed.includes(halaqahId) ? [...existingFollowed, halaqahId] : existingFollowed;

    await client.query(
      `UPDATE public.users
       SET "paidJuz" = $1,
           tikrar_level = $2,
           tikrar_target_duration_months = $3,
           tikrar_active_days_per_week = $4,
           tikrar_start_date = $5::date,
           tikrar_halaqah_id = COALESCE($6::uuid, tikrar_halaqah_id),
           tikrar_current_page = $7,
           tikrar_current_block = 1,
           followed_halaqahs = $8::jsonb,
           is_tikrar_paid = true,
           updated_at = now()
       WHERE id = $9`,
      [
        juz,
        paceMeta.tikrarLevel,
        durationMonths,
        activeDaysPerWeek,
        startDate,
        halaqahId,
        startPage,
        JSON.stringify(nextFollowed),
        ctx.userId,
      ]
    );

    // Jika thalibah memulai dari pertengahan juz, tandai langkah pada halaman awal juz sebagai tuntas
    const juzRange = getJuzPageRange(juz);
    const markPriorPagesDone = Boolean(body.mark_prior_pages_done);
    if (markPriorPagesDone && startPage > juzRange.startPage) {
      const priorBlocks = {
        1: { a: { count: 40 }, b: { count: 40 }, combined: { count: 40 }, listen: { count: 5 } },
        2: { a: { count: 40 }, b: { count: 40 }, combined: { count: 40 }, listen: { count: 5 } },
        3: { a: { count: 40 }, b: { count: 40 }, combined: { count: 40 }, listen: { count: 5 } },
        4: { a: { count: 40 }, b: { count: 40 }, combined: { count: 40 }, listen: { count: 5 } },
      };
      const priorMeta = {
        '1_2': 10,
        '2_3': 10,
        '1_2_3': 5,
        '3_4': 10,
        '2_3_4': 5,
        '1_2_3_4': 5,
      };

      for (let p = juzRange.startPage; p < startPage; p++) {
        await client.query(
          `INSERT INTO public.tikrar_user_progress (
             user_id, page_number, juz, prep_listen_count, prep_translation_done,
             blocks, meta_counts, tuntas_blocks, total_progress, updated_at
           ) VALUES ($1, $2, $3, 5, true, $4::jsonb, $5::jsonb, $6::jsonb, 100, now())
           ON CONFLICT (user_id, page_number) DO UPDATE SET
             prep_listen_count = 5,
             prep_translation_done = true,
             blocks = $4::jsonb,
             meta_counts = $5::jsonb,
             tuntas_blocks = $6::jsonb,
             total_progress = 100,
             updated_at = now()`,
          [
            ctx.userId,
            p,
            juz,
            JSON.stringify(priorBlocks),
            JSON.stringify(priorMeta),
            JSON.stringify([1, 2, 3, 4]),
          ]
        );

        await client.query(
          `INSERT INTO public.tikrar_page_quizzes (
             user_id, juz, page_number, total_questions, correct_answers, score, passed, question_types, created_at
           )
           SELECT $1, $2, $3, 30, 30, 100, true, $4::jsonb, now()
           WHERE NOT EXISTS (
             SELECT 1 FROM public.tikrar_page_quizzes WHERE user_id = $1 AND page_number = $3 AND passed = true
           )`,
          [ctx.userId, juz, p, JSON.stringify({ source: "prior_hafalan" })]
        );

        await client.query(
          `INSERT INTO public.tikrar_prior_hafalan (user_id, page_number, status, updated_at)
           VALUES ($1, $2, 'tested_external', now())
           ON CONFLICT (user_id, page_number) DO UPDATE SET
             status = 'tested_external',
             updated_at = now()`,
          [ctx.userId, p]
        ).catch(() => {});
      }
    }

    // Sinkron jadwal per blok (dipakai pengingat WhatsApp): tanggal blok = hari langkah "Gabung Blok X"
    await client.query(
      `DELETE FROM public.tikrar_user_schedules WHERE user_id = $1 AND status <> 'completed'`,
      [ctx.userId]
    );
    for (const day of schedule.days) {
      for (const item of day.items) {
        const block = TIKRAR_STEPS[item.stepIndex].completesBlock;
        if (!block) continue;
        await client.query(
          `INSERT INTO public.tikrar_user_schedules (user_id, halaqah_id, juz, page_number, block_number, scheduled_date, status, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::date, 'pending', now())
           ON CONFLICT (user_id, juz, page_number, block_number) DO UPDATE SET
             scheduled_date = CASE WHEN public.tikrar_user_schedules.status = 'completed'
                                   THEN public.tikrar_user_schedules.scheduled_date ELSE EXCLUDED.scheduled_date END,
             halaqah_id = COALESCE(EXCLUDED.halaqah_id, public.tikrar_user_schedules.halaqah_id),
             updated_at = now()`,
          [ctx.userId, halaqahId, juz, item.page, block, day.date]
        );
      }
    }

    await client.query('COMMIT');

    const fresh = await buildTikrarSummary(ctx.userId);
    return NextResponse.json({
      data: { targetId: targetRows[0]?.id, summary: fresh },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[TIKRAR_SCHEDULE_POST_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal membuat jadwal Tikrar.' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
