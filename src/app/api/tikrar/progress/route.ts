import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzForPage, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import { canUndoStep, countTotalClicks, PASS_THRESHOLD } from '@/lib/tikrar-steps';
import {
  computeTotalCompletedSteps,
  isPagePracticeAllowed,
  loadActiveTarget,
  loadClearedPages,
  recordTikrarActivity,
} from '@/lib/tikrar-server';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const pageNumber = Number(searchParams.get('page'));

    if (!pageNumber || isNaN(pageNumber)) {
      // List all progress for current user (terbaru di paling atas)
      const { rows } = await pool.query(
        `SELECT * FROM public.tikrar_user_progress WHERE user_id = $1 ORDER BY updated_at DESC, page_number ASC`,
        [ctx.userId]
      );
      return NextResponse.json({ data: rows, error: null });
    }

    const { rows } = await pool.query(
      `SELECT * FROM public.tikrar_user_progress WHERE user_id = $1 AND page_number = $2 LIMIT 1`,
      [ctx.userId, pageNumber]
    );

    return NextResponse.json({ data: rows[0] || null, error: null });
  } catch (err: any) {
    console.error('Error in GET /api/tikrar/progress:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memuat progres Tikrar.' } },
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
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const pageNumber = Math.max(1, Math.min(604, Math.floor(Number(body.page_number) || 582)));
    const juz = Math.max(1, Math.min(30, Math.floor(Number(body.juz) || getJuzForPage(pageNumber))));
    const prepListenCount = Math.max(0, Math.min(50, Math.floor(Number(body.prep_listen_count) || 0)));
    const prepTranslationDone = Boolean(body.prep_translation_done);
    const blocks = typeof body.blocks === 'object' && body.blocks !== null ? body.blocks : {};
    const metaCounts = typeof body.meta_counts === 'object' && body.meta_counts !== null ? body.meta_counts : {};
    const totalProgress = Math.max(0, Math.min(100, Math.floor(Number(body.total_progress) || 0)));
    // Counter yang dikurangi thalibah (tombol -1): nilainya boleh turun, counter lain tetap monoton
    const undoKeys: string[] = Array.isArray(body.undo_keys)
      ? body.undo_keys.filter((k: unknown) => typeof k === 'string' && /^([1-4]\.(a|b|combined)|meta\.[1-4_]+)$/.test(k)).slice(0, 30)
      : [];

    // Gerbang: wajib punya target & halaman harus sudah terbuka (lulus ujian halaman sebelumnya)
    const target = await loadActiveTarget(client, ctx.userId);
    const { cleared } = await loadClearedPages(client, ctx.userId);
    const gate = isPagePracticeAllowed(pageNumber, target, cleared);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: { message: gate.reason, code: target ? 'PAGE_LOCKED' : 'TARGET_REQUIRED', unlockedPage: gate.unlockedPage ?? null } },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Ambil record yang sudah ada di database untuk digabungkan secara monotonik (mencegah reset oleh device lain)
    const { rows: existingProgressRows } = await client.query(
      `SELECT prep_listen_count, prep_translation_done, blocks, meta_counts, tuntas_blocks, total_progress
       FROM public.tikrar_user_progress
       WHERE user_id = $1 AND page_number = $2
       FOR UPDATE`,
      [ctx.userId, pageNumber]
    );

    const existingRow = existingProgressRows[0] || null;
    const clicksBefore = countTotalClicks(existingRow);
    const stepsBefore = await computeTotalCompletedSteps(client, ctx.userId, cleared);

    let finalPrepListen = prepListenCount;
    let finalPrepTrans = prepTranslationDone;
    let finalBlocks: any = { ...blocks };
    let finalMetaCounts: any = { ...metaCounts };
    let finalTotalProgress = totalProgress;

    if (existingProgressRows.length > 0) {
      const ex = existingProgressRows[0];
      finalPrepListen = Math.max(Number(ex.prep_listen_count) || 0, prepListenCount);
      finalPrepTrans = Boolean(ex.prep_translation_done) || prepTranslationDone;
      finalTotalProgress = Math.max(Number(ex.total_progress) || 0, totalProgress);

      const exBlocks = typeof ex.blocks === 'object' && ex.blocks !== null ? ex.blocks : {};
      finalBlocks = {};
      for (const b of [1, 2, 3, 4] as const) {
        finalBlocks[b] = {
          a: { count: Math.max(Number(exBlocks?.[b]?.a?.count) || 0, Number(blocks?.[b]?.a?.count) || 0) },
          b: { count: Math.max(Number(exBlocks?.[b]?.b?.count) || 0, Number(blocks?.[b]?.b?.count) || 0) },
          combined: { count: Math.max(Number(exBlocks?.[b]?.combined?.count) || 0, Number(blocks?.[b]?.combined?.count) || 0) },
        };
      }

      const exMeta = typeof ex.meta_counts === 'object' && ex.meta_counts !== null ? ex.meta_counts : {};
      finalMetaCounts = {};
      const allMetaKeys = new Set([...Object.keys(exMeta), ...Object.keys(metaCounts)]);
      allMetaKeys.forEach((k) => {
        finalMetaCounts[k] = Math.max(Number(exMeta[k]) || 0, Number(metaCounts[k]) || 0);
      });
    }

    // Terapkan pengurangan (-1) hanya bila langkah berikutnya belum dimulai
    const undoneCombinedBlocks: number[] = [];
    for (const key of undoKeys) {
      const current = { blocks: finalBlocks, meta_counts: finalMetaCounts };
      if (!canUndoStep(key, current)) continue;
      if (key.startsWith('meta.')) {
        const k = key.slice(5);
        const wanted = Math.max(0, Math.floor(Number(metaCounts?.[k]) || 0));
        if (wanted < (Number(finalMetaCounts[k]) || 0)) finalMetaCounts[k] = wanted;
      } else {
        const [b, part] = key.split('.');
        const wanted = Math.max(0, Math.floor(Number(blocks?.[b]?.[part]?.count) || 0));
        const now = Number(finalBlocks?.[b]?.[part]?.count) || 0;
        if (wanted < now) {
          finalBlocks[b] = { ...(finalBlocks[b] || {}), [part]: { count: wanted } };
          if (part === 'combined' && now >= PASS_THRESHOLD && wanted < PASS_THRESHOLD) undoneCombinedBlocks.push(Number(b));
        }
      }
    }

    // Identifikasi blok-blok yang tuntas (combined >= 40)
    const tuntasBlocks: number[] = [];
    for (const b of [1, 2, 3, 4] as const) {
      if (Number(finalBlocks?.[b]?.combined?.count) >= 40) {
        tuntasBlocks.push(b);
      }
    }

    // 1. Simpan progres gabungan ke database (public.tikrar_user_progress)
    const { rows: progressRows } = await client.query(
      `INSERT INTO public.tikrar_user_progress (\n         user_id, page_number, juz, prep_listen_count, prep_translation_done,
         blocks, meta_counts, tuntas_blocks, total_progress, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, now())
       ON CONFLICT (user_id, page_number)
       DO UPDATE SET
         juz = EXCLUDED.juz,
         prep_listen_count = EXCLUDED.prep_listen_count,
         prep_translation_done = EXCLUDED.prep_translation_done,
         blocks = EXCLUDED.blocks,
         meta_counts = EXCLUDED.meta_counts,
         tuntas_blocks = EXCLUDED.tuntas_blocks,
         total_progress = EXCLUDED.total_progress,
         updated_at = now()
       RETURNING *`,
      [
        ctx.userId,
        pageNumber,
        juz,
        finalPrepListen,
        finalPrepTrans,
        JSON.stringify(finalBlocks),
        JSON.stringify(finalMetaCounts),
        JSON.stringify(tuntasBlocks),
        finalTotalProgress,
      ]
    );

    // Blok yang batal tuntas karena -1: keluarkan dari laporan blok tuntas halaman ini
    if (undoneCombinedBlocks.length > 0) {
      await client.query(
        `UPDATE public.tikrar_daily_logs
         SET blocks_completed = COALESCE((
               SELECT jsonb_agg(e) FROM jsonb_array_elements(blocks_completed) e
               WHERE (e #>> '{}') <> ALL($3::text[])
             ), '[]'::jsonb),
             updated_at = now()
         WHERE user_id = $1 AND page_number = $2 AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(blocks_completed) e WHERE (e #>> '{}') = ANY($3::text[])
         )`,
        [ctx.userId, pageNumber, undoneCombinedBlocks.map(String)]
      );
      await client.query(
        `DELETE FROM public.tikrar_daily_logs
         WHERE user_id = $1 AND page_number = $2 AND jsonb_array_length(blocks_completed) = 0`,
        [ctx.userId, pageNumber]
      );
    }

    const savedRow = progressRows[0];
    const stepsAfter = await computeTotalCompletedSteps(client, ctx.userId, cleared, { page: pageNumber, row: savedRow });
    const activity = await recordTikrarActivity(client, ctx.userId, {
      clicksDelta: countTotalClicks(savedRow) - clicksBefore,
      stepsBefore,
      stepsAfter,
      target,
    });

    // Perbarui posisi halaman terakhir aktif peserta di public.users agar selalu sinkron
    await client.query(
      `UPDATE public.users
       SET tikrar_current_page = $1,
           updated_at = now()
       WHERE id = $2`,
      [pageNumber, ctx.userId]
    );

    // 2. Blok yang BARU tuntas pada penyimpanan ini direkam ke public.tikrar_daily_logs (Laporan Blok Tuntas)
    const newlyTuntasBlocks = tuntasBlocks.filter(
      (b) => !(Number(existingRow?.blocks?.[b]?.combined?.count) >= 40)
    );
    let dailyLogSaved = null;
    if (newlyTuntasBlocks.length > 0) {
      const logDateKey = toDateKeyWIB();

      // Ambil user halaqah_id
      const { rows: uRows } = await client.query(
        `SELECT tikrar_halaqah_id, points FROM public.users WHERE id = $1 FOR UPDATE`,
        [ctx.userId]
      );
      const userHalaqahId = uRows[0]?.tikrar_halaqah_id || null;

      // Ambil existing log hari ini untuk halaman ini
      const { rows: existingLogRows } = await client.query(
        `SELECT id, blocks_completed FROM public.tikrar_daily_logs
         WHERE user_id = $1 AND log_date = $2::date AND page_number = $3
         LIMIT 1`,
        [ctx.userId, logDateKey, pageNumber]
      );
      const prevBlocks: number[] = Array.isArray(existingLogRows[0]?.blocks_completed)
        ? existingLogRows[0].blocks_completed.map((n: any) => Number(n))
        : [];
      const mergedBlocks = Array.from(new Set<number>([...prevBlocks, ...newlyTuntasBlocks])).sort((a, b) => a - b);

      const { rows: savedLogRows } = await client.query(
        `INSERT INTO public.tikrar_daily_logs (\n           user_id, halaqah_id, log_date, juz, page_number, blocks_completed,
           repetition_count, duration_minutes, completed, updated_at
         )
         VALUES ($1, $2, $3::date, $4, $5, $6::jsonb, 40, 30, true, now())
         ON CONFLICT (user_id, log_date, page_number)
         DO UPDATE SET
           halaqah_id = COALESCE(EXCLUDED.halaqah_id, public.tikrar_daily_logs.halaqah_id),
           blocks_completed = $6::jsonb,
           completed = true,
           updated_at = now()
         RETURNING *`,
        [ctx.userId, userHalaqahId, logDateKey, juz, pageNumber, JSON.stringify(mergedBlocks)]
      );
      dailyLogSaved = savedLogRows[0];

      // Tandai jadwal selesai di tikrar_user_schedules
      await client.query(
        `UPDATE public.tikrar_user_schedules
         SET status = 'completed',
             completed_at = COALESCE(completed_at, now()),
             updated_at = now()
         WHERE user_id = $1 AND page_number = $2 AND block_number = ANY($3::int[])`,
        [ctx.userId, pageNumber, mergedBlocks]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      data: {
        progress: progressRows[0],
        dailyLog: dailyLogSaved,
        pointsAwarded: activity.pointsAwarded,
        activity,
      },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error in POST /api/tikrar/progress:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal menyimpan progres Tikrar.' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
