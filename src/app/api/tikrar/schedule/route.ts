import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import {
  generateTikrarSchedule,
  getJuzPageRange,
  TIKRAR_PACE_OPTIONS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401 }
      );
    }

    const { rows: userRows } = await query(
      `SELECT id, username, full_name, salutation, "paidJuz", tikrar_level, tikrar_start_date,
              tikrar_halaqah_id, tikrar_target_duration_months, tikrar_active_days_per_week,
              tikrar_current_page, tikrar_current_block, points
       FROM public.users
       WHERE id = $1
       LIMIT 1`,
      [ctx.userId]
    );
    const userRow = userRows[0];
    if (!userRow) {
      return NextResponse.json({ error: { message: 'Pengguna tidak ditemukan.' } }, { status: 404 });
    }

    const juz = Number(userRow.paidJuz) || 30;
    const { rows: scheduleRows } = await query(
      `SELECT id, user_id, halaqah_id, juz, page_number, block_number,
              to_char(scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
              status, completed_at
       FROM public.tikrar_user_schedules
       WHERE user_id = $1 AND juz = $2
       ORDER BY scheduled_date ASC, page_number ASC, block_number ASC`,
      [ctx.userId, juz]
    );

    const todayKey = toDateKeyWIB();
    const enriched = scheduleRows.map((row) => ({
      ...row,
      effective_status:
        row.status === 'completed'
          ? 'completed'
          : row.scheduled_date < todayKey && row.status === 'pending'
          ? 'overdue'
          : row.status,
    }));

    return NextResponse.json({
      data: {
        preferences: {
          juz,
          halaqah_id: userRow.tikrar_halaqah_id || null,
          duration_months: Number(userRow.tikrar_target_duration_months) || 2,
          active_days_per_week: Number(userRow.tikrar_active_days_per_week) || 5,
          start_date: userRow.tikrar_start_date ? toDateKeyWIB(userRow.tikrar_start_date) : todayKey,
          current_page: Number(userRow.tikrar_current_page) || getJuzPageRange(juz).startPage,
          current_block: Number(userRow.tikrar_current_block) || 1,
        },
        schedules: enriched,
        today_key: todayKey,
      },
      error: null,
    });
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
    const juz = Math.max(1, Math.min(30, Math.floor(Number(body.juz) || 30)));
    const durationMonths = Math.max(
      1,
      Math.min(4, Math.floor(Number(body.duration_months ?? body.durationMonths) || 2))
    );
    const activeDaysPerWeek = Math.max(
      1,
      Math.min(7, Math.floor(Number(body.active_days_per_week ?? body.activeDaysPerWeek) || 5))
    );
    const startDateKey = toDateKeyWIB(body.start_date || body.startDate || new Date());
    const rawHalaqahId = body.halaqah_id ?? body.halaqahId ?? null;
    const halaqahId =
      typeof rawHalaqahId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawHalaqahId.trim())
        ? rawHalaqahId.trim()
        : null;

    const { startPage: juzStart, endPage: juzEnd } = getJuzPageRange(juz);
    const rawStartFromPage = Number(body.start_from_page ?? body.startFromPage);
    const startFromPage =
      !isNaN(rawStartFromPage) && rawStartFromPage >= juzStart && rawStartFromPage <= juzEnd
        ? Math.floor(rawStartFromPage)
        : juzStart;

    const paceMeta =
      TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === durationMonths) || TIKRAR_PACE_OPTIONS[1];
    const generated = generateTikrarSchedule({
      juz,
      durationMonths,
      activeDaysPerWeek,
      startDate: startDateKey,
      startFromPage,
    });

    await client.query('BEGIN');

    // Collect already completed blocks in this Juz from daily logs so regenerating never loses progress
    const { rows: logRows } = await client.query(
      `SELECT page_number, blocks_completed
       FROM public.tikrar_daily_logs
       WHERE user_id = $1 AND page_number BETWEEN $2 AND $3 AND completed = true`,
      [ctx.userId, generated.startPage, generated.endPage]
    );
    const completedBlockKeys = new Set<string>();
    for (const lr of logRows) {
      const blocks = Array.isArray(lr.blocks_completed) ? lr.blocks_completed : [];
      for (const b of blocks) {
        const bNum = Number(b);
        if (bNum >= 1 && bNum <= 4) {
          completedBlockKeys.add(`${lr.page_number}:${bNum}`);
        }
      }
    }

    // Determine earliest uncompleted page & block in selected Juz
    let nextCurrentPage = startFromPage;
    let nextCurrentBlock = 1;
    for (const item of generated.items) {
      if (!completedBlockKeys.has(`${item.page_number}:${item.block_number}`)) {
        nextCurrentPage = item.page_number;
        nextCurrentBlock = item.block_number;
        break;
      }
    }

    // Update user's Tikrar preferences and append halaqahId to followed_halaqahs if provided
    const { rows: currentUserRows } = await client.query(
      `SELECT followed_halaqahs FROM public.users WHERE id = $1 LIMIT 1`,
      [ctx.userId]
    );
    const existingFollowed: string[] = Array.isArray(currentUserRows[0]?.followed_halaqahs)
      ? currentUserRows[0].followed_halaqahs
      : [];
    const nextFollowed =
      halaqahId && !existingFollowed.includes(halaqahId)
        ? [...existingFollowed, halaqahId]
        : existingFollowed;

    await client.query(
      `UPDATE public.users
       SET "paidJuz" = $1,
           tikrar_level = $2,
           tikrar_target_duration_months = $3,
           tikrar_active_days_per_week = $4,
           tikrar_start_date = $5::date,
           tikrar_halaqah_id = COALESCE($6::uuid, tikrar_halaqah_id),
           tikrar_current_page = $7,
           tikrar_current_block = $8,
           followed_halaqahs = $9::jsonb,
           is_tikrar_paid = true,
           updated_at = now()
       WHERE id = $10`,
      [
        juz,
        paceMeta.tikrarLevel,
        durationMonths,
        activeDaysPerWeek,
        startDateKey,
        halaqahId,
        nextCurrentPage,
        nextCurrentBlock,
        JSON.stringify(nextFollowed),
        ctx.userId,
      ]
    );

    // Clear pending schedules for this Juz (keep completed history intact) and upsert all generated slots
    await client.query(
      `DELETE FROM public.tikrar_user_schedules
       WHERE user_id = $1 AND juz = $2 AND status <> 'completed'`,
      [ctx.userId, juz]
    );

    for (const item of generated.items) {
      const isAlreadyDone = completedBlockKeys.has(`${item.page_number}:${item.block_number}`);
      await client.query(
        `INSERT INTO public.tikrar_user_schedules (
           user_id, halaqah_id, juz, page_number, block_number, scheduled_date, status, completed_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, now())
         ON CONFLICT (user_id, juz, page_number, block_number)
         DO UPDATE SET
           halaqah_id = COALESCE(EXCLUDED.halaqah_id, public.tikrar_user_schedules.halaqah_id),
           scheduled_date = CASE
             WHEN public.tikrar_user_schedules.status = 'completed' THEN public.tikrar_user_schedules.scheduled_date
             ELSE EXCLUDED.scheduled_date
           END,
           status = CASE
             WHEN public.tikrar_user_schedules.status = 'completed' THEN 'completed'
             ELSE EXCLUDED.status
           END,
           completed_at = COALESCE(public.tikrar_user_schedules.completed_at, EXCLUDED.completed_at),
           updated_at = now()`,
        [
          ctx.userId,
          halaqahId,
          item.juz,
          item.page_number,
          item.block_number,
          item.scheduled_date,
          isAlreadyDone ? 'completed' : 'pending',
          isAlreadyDone ? new Date().toISOString() : null,
        ]
      );
    }

    await client.query('COMMIT');

    const { rows: savedRows } = await query(
      `SELECT id, user_id, halaqah_id, juz, page_number, block_number,
              to_char(scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
              status, completed_at
       FROM public.tikrar_user_schedules
       WHERE user_id = $1 AND juz = $2
       ORDER BY scheduled_date ASC, page_number ASC, block_number ASC`,
      [ctx.userId, juz]
    );

    return NextResponse.json({
      data: {
        summary: {
          juz: generated.juz,
          startPage: generated.startPage,
          endPage: generated.endPage,
          totalPages: generated.totalPages,
          totalBlocks: generated.totalBlocks,
          totalActiveDays: generated.totalActiveDays,
          startDate: generated.startDate,
          estimatedEndDate: generated.estimatedEndDate,
          durationMonths,
          activeDaysPerWeek,
          currentPage: nextCurrentPage,
          currentBlock: nextCurrentBlock,
        },
        schedules: savedRows,
      },
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
