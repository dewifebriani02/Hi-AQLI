import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import {
  computeMaxUnlockedPageInJuz,
  computeTikrarStreakAndWeekly,
  getJuzForPage,
  getJuzPageRange,
  isPageSubmissionCleared,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = body.action || 'submit_daily_log';

    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      `SELECT id, username, full_name, "paidJuz", tikrar_halaqah_id,
              tikrar_current_page, tikrar_current_block, points
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [ctx.userId]
    );
    const userRow = userRows[0];
    if (!userRow) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: { message: 'Pengguna tidak ditemukan.' } }, { status: 404 });
    }

    const pageNumber = Math.max(1, Math.min(604, Math.floor(Number(body.page_number) || 582)));
    const juz = Math.max(1, Math.min(30, Math.floor(Number(body.juz) || getJuzForPage(pageNumber))));
    const { startPage, endPage } = getJuzPageRange(juz);

    // Fase 5 Gatekeeper: Load passed submissions & passed page_exams in this Juz to enforce page lock
    const { rows: juzSubRows } = await client.query(
      `SELECT page_number, blocks_range, status
       FROM public.tikrar_submissions
       WHERE user_id = $1 AND page_number >= $2 AND page_number <= $3`,
      [ctx.userId, startPage, endPage]
    );
    const { rows: juzExamRows } = await client.query(
      `SELECT page_number
       FROM public.page_exams
       WHERE user_id = $1 AND passed = true AND page_number >= $2 AND page_number <= $3`,
      [ctx.userId, startPage, endPage]
    );
    const passedExamSet = new Set<number>(juzExamRows.map((e) => Number(e.page_number)));
    const maxUnlockedPage = computeMaxUnlockedPageInJuz(juz, juzSubRows, passedExamSet);

    if (pageNumber > maxUnlockedPage) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          error: {
            message: `Halaman ${pageNumber} masih terkunci. Silakan selesaikan repetisi dan luluskan Kelas Setoran Live Zoom pada Halaman ${maxUnlockedPage} bersama Musyrifah terlebih dahulu.`,
            code: 'PAGE_LOCKED_PENDING_SUBMISSION',
            maxUnlockedPage,
          },
        },
        { status: 403 }
      );
    }

    // Action 2: Register Live Zoom Tasmi' Submission Queue (2 blocks = 1/2 page or 4 blocks = 1 page)
    if (action === 'register_submission') {
      const allowedRanges = new Set(['blok_1_2', 'blok_3_4', 'blok_1_4']);
      const blocksRange = allowedRanges.has(body.blocks_range) ? body.blocks_range : 'blok_1_2';

      // Verify existing pending/passed/needs_revision submission to avoid duplicate rows
      const { rows: existingSub } = await client.query(
        `SELECT * FROM public.tikrar_submissions
         WHERE user_id = $1 AND page_number = $2 AND blocks_range = $3
         ORDER BY created_at DESC LIMIT 1`,
        [ctx.userId, pageNumber, blocksRange]
      );
      if (existingSub.length > 0) {
        const latest = existingSub[0];
        if (latest.status === 'pending' || latest.status === 'passed') {
          await client.query('COMMIT');
          return NextResponse.json({
            data: { submission: latest, alreadyRegistered: true, maxUnlockedPage },
            error: null,
          });
        }

        // Re-registering after needs_revision: reset existing row back to pending
        const { rows: reopenedSub } = await client.query(
          `UPDATE public.tikrar_submissions
           SET status = 'pending',
               session_date = $1::date,
               submitted_at = now(),
               updated_at = now(),
               notes = COALESCE($2, notes)
           WHERE id = $3
           RETURNING *`,
          [
            toDateKeyWIB(),
            typeof body.notes === 'string' && body.notes.trim() ? body.notes.slice(0, 500) : null,
            latest.id,
          ]
        );
        await client.query('COMMIT');
        return NextResponse.json({
          data: { submission: reopenedSub[0], alreadyRegistered: false, maxUnlockedPage },
          error: null,
        });
      }

      let zoomUrl: string | null = null;
      let musyrifahName: string | null = null;
      if (userRow.tikrar_halaqah_id) {
        const { rows: hRows } = await client.query(
          `SELECT zoom_link, musyrifah FROM public.halaqahs WHERE id = $1 LIMIT 1`,
          [userRow.tikrar_halaqah_id]
        );
        zoomUrl = hRows[0]?.zoom_link || null;
        musyrifahName = hRows[0]?.musyrifah || null;
      }

      const { rows: insertedSub } = await client.query(
        `INSERT INTO public.tikrar_submissions (
           user_id, user_name, halaqah_id, musyrifah_id, musyrifah_name, juz, page_number,
           blocks_range, session_date, zoom_meeting_url, status, notes, submitted_at
         )
         VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8::date, $9, 'pending', $10, now())
         RETURNING *`,
        [
          ctx.userId,
          userRow.full_name || userRow.username || 'Thalibah HI AQLI',
          userRow.tikrar_halaqah_id || null,
          musyrifahName,
          juz,
          pageNumber,
          blocksRange,
          toDateKeyWIB(),
          zoomUrl,
          typeof body.notes === 'string' ? body.notes.slice(0, 500) : null,
        ]
      );

      await client.query('COMMIT');
      return NextResponse.json({
        data: { submission: insertedSub[0], alreadyRegistered: false, maxUnlockedPage },
        error: null,
      });
    }

    // Default Action: Submit Daily 40x Repetition Report
    const logDateKey = toDateKeyWIB(body.log_date || new Date());
    const rawBlocks: unknown[] = Array.isArray(body.blocks_completed) ? body.blocks_completed : [];
    const incomingBlocks = Array.from(
      new Set<number>(
        rawBlocks
          .map((b) => Math.floor(Number(b)))
          .filter((b) => b >= 1 && b <= 4)
      )
    ).sort((a, b) => a - b);

    if (incomingBlocks.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: { message: 'Pilih minimal 1 blok yang telah selesai 40x repetisi.' } },
        { status: 400 }
      );
    }

    const repetitionCount = Math.max(40, Math.min(500, Math.floor(Number(body.repetition_count) || 40)));
    const durationMinutes = Math.max(5, Math.min(600, Math.floor(Number(body.duration_minutes) || 30)));
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

    // Inspect existing completed dates BEFORE this submission for idempotent point calculation
    const { rows: priorDateRows } = await client.query(
      `SELECT DISTINCT to_char(log_date, 'YYYY-MM-DD') AS log_date
       FROM public.tikrar_daily_logs
       WHERE user_id = $1 AND completed = true`,
      [ctx.userId]
    );
    const priorDates = new Set<string>(priorDateRows.map((r) => r.log_date));
    const alreadyLoggedToday = priorDates.has(logDateKey);
    const beforeMetrics = computeTikrarStreakAndWeekly(priorDates, logDateKey);

    // Check existing blocks on (user_id, log_date, page_number) so we merge cleanly
    const { rows: existingLogRows } = await client.query(
      `SELECT id, blocks_completed
       FROM public.tikrar_daily_logs
       WHERE user_id = $1 AND log_date = $2::date AND page_number = $3
       LIMIT 1`,
      [ctx.userId, logDateKey, pageNumber]
    );
    const prevBlocks: number[] = Array.isArray(existingLogRows[0]?.blocks_completed)
      ? existingLogRows[0].blocks_completed.map((n: any) => Number(n))
      : [];
    const mergedBlocks = Array.from(new Set<number>([...prevBlocks, ...incomingBlocks])).sort(
      (a, b) => a - b
    );

    const { rows: savedLogRows } = await client.query(
      `INSERT INTO public.tikrar_daily_logs (
         user_id, halaqah_id, log_date, juz, page_number, blocks_completed,
         repetition_count, duration_minutes, completed, notes, updated_at
       )
       VALUES ($1, $2, $3::date, $4, $5, $6::jsonb, $7, $8, true, $9, now())
       ON CONFLICT (user_id, log_date, page_number)
       DO UPDATE SET
         halaqah_id = COALESCE(EXCLUDED.halaqah_id, public.tikrar_daily_logs.halaqah_id),
         blocks_completed = $6::jsonb,
         repetition_count = GREATEST(public.tikrar_daily_logs.repetition_count, EXCLUDED.repetition_count),
         duration_minutes = EXCLUDED.duration_minutes,
         completed = true,
         notes = COALESCE(EXCLUDED.notes, public.tikrar_daily_logs.notes),
         updated_at = now()
       RETURNING *, to_char(log_date, 'YYYY-MM-DD') AS log_date_str`,
      [
        ctx.userId,
        userRow.tikrar_halaqah_id || null,
        logDateKey,
        juz,
        pageNumber,
        JSON.stringify(mergedBlocks),
        repetitionCount,
        durationMinutes,
        notes,
      ]
    );

    // Mark matching schedule items as completed
    await client.query(
      `UPDATE public.tikrar_user_schedules
       SET status = 'completed',
           completed_at = COALESCE(completed_at, now()),
           updated_at = now()
       WHERE user_id = $1 AND page_number = $2 AND block_number = ANY($3::int[])`,
      [ctx.userId, pageNumber, mergedBlocks]
    );

    // Aggregate all blocks completed on this page across any date
    const { rows: pageAllLogs } = await client.query(
      `SELECT blocks_completed
       FROM public.tikrar_daily_logs
       WHERE user_id = $1 AND page_number = $2 AND completed = true`,
      [ctx.userId, pageNumber]
    );
    const allCompletedOnPage = new Set<number>();
    for (const r of pageAllLogs) {
      const arr = Array.isArray(r.blocks_completed) ? r.blocks_completed : [];
      arr.forEach((b: any) => {
        const bn = Number(b);
        if (bn >= 1 && bn <= 4) allCompletedOnPage.add(bn);
      });
    }

    // Advance user's current block/page pointer respecting Fase 5 Gatekeeper
    let nextPage = pageNumber;
    let nextBlock = 1;
    const uncompletedBlock = [1, 2, 3, 4].find((b) => !allCompletedOnPage.has(b));
    if (uncompletedBlock) {
      nextPage = pageNumber;
      nextBlock = uncompletedBlock;
    } else if (pageNumber < endPage && isPageSubmissionCleared(pageNumber, juzSubRows, passedExamSet)) {
      nextPage = pageNumber + 1;
      nextBlock = 1;
    } else {
      nextPage = pageNumber;
      nextBlock = 4;
    }

    // Compute updated consistency metrics & idempotent points according to spec Tahap 7
    const updatedDates = new Set<string>(priorDates);
    updatedDates.add(logDateKey);
    const afterMetrics = computeTikrarStreakAndWeekly(updatedDates, logDateKey);

    let pointsAwarded = 0;
    const pointBreakdown: string[] = [];
    if (!alreadyLoggedToday) {
      pointsAwarded += 20;
      pointBreakdown.push('+20 Poin Laporan Harian');

      if (beforeMetrics.weeklyActiveDays < 5 && afterMetrics.weeklyActiveDays >= 5) {
        pointsAwarded += 50;
        pointBreakdown.push('+50 Bonus Target 5 Hari/Pekan');
      }

      if (afterMetrics.streak > 0 && afterMetrics.streak % 7 === 0 && afterMetrics.streak > beforeMetrics.streak) {
        pointsAwarded += 75;
        pointBreakdown.push(`+75 Bonus Streak ${afterMetrics.streak} Hari`);
      }
    }

    await client.query(
      `UPDATE public.users
       SET points = COALESCE(points, 0) + $1,
           tikrar_current_page = $2,
           tikrar_current_block = $3,
           updated_at = now()
       WHERE id = $4`,
      [pointsAwarded, nextPage, nextBlock, ctx.userId]
    );

    await client.query('COMMIT');

    const completedBlocksList = Array.from(allCompletedOnPage).sort((a, b) => a - b);
    return NextResponse.json({
      data: {
        log: savedLogRows[0],
        pointsAwarded,
        pointBreakdown,
        weeklyActiveDays: afterMetrics.weeklyActiveDays,
        streak: afterMetrics.streak,
        completedBlocksOnPage: completedBlocksList,
        maxUnlockedPage,
        readyForHalfPageSubmission:
          completedBlocksList.includes(1) && completedBlocksList.includes(2),
        readyForFullPageSubmission: completedBlocksList.length >= 4,
      },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[TIKRAR_DAILY_LOG_POST_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal menyimpan laporan harian Tikrar.' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
