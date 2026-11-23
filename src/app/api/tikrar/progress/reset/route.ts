import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzForPage, getJuzPageRange } from '@/lib/tikrar-schedule-generator';
import {
  computeTikrarPageTotalProgress,
  createEmptyTikrarBlocks,
  createEmptyTikrarMetaCounts,
  PASS_THRESHOLD,
} from '@/lib/tikrar-steps';

type ResetScope = 'juz' | 'page' | 'block' | 'counter';

function normalizeBlocks(raw: any) {
  const empty = createEmptyTikrarBlocks();
  for (const b of [1, 2, 3, 4] as const) {
    const src = raw?.[b] || {};
    empty[b] = {
      a: { count: Number(src?.a?.count) || 0 },
      b: { count: Number(src?.b?.count) || 0 },
      combined: { count: Number(src?.combined?.count) || 0 },
      listen: { count: Math.min(5, Number(src?.listen?.count) || 0) },
      ...(typeof src?.understood === 'boolean' ? { understood: src.understood } : {}),
    };
  }
  return empty;
}

function normalizeMetaCounts(raw: any) {
  const empty = createEmptyTikrarMetaCounts();
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(empty)) {
      empty[k] = Number(raw[k]) || 0;
    }
  }
  return empty;
}

function computeTuntasBlocks(blocks: Record<1 | 2 | 3 | 4, any>): number[] {
  const tuntas: number[] = [];
  for (const b of [1, 2, 3, 4] as const) {
    if (
      (Number(blocks?.[b]?.a?.count) || 0) >= PASS_THRESHOLD &&
      (Number(blocks?.[b]?.b?.count) || 0) >= PASS_THRESHOLD &&
      (Number(blocks?.[b]?.combined?.count) || 0) >= PASS_THRESHOLD
    ) {
      tuntas.push(b);
    }
  }
  return tuntas;
}

async function clearDailyLogsAndScheduleForBlocks(
  client: any,
  userId: string,
  pageNumber: number,
  blockNumbers: number[]
) {
  if (blockNumbers.length === 0) return;
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
    [userId, pageNumber, blockNumbers.map(String)]
  );
  await client.query(
    `DELETE FROM public.tikrar_daily_logs
     WHERE user_id = $1 AND page_number = $2 AND jsonb_array_length(blocks_completed) = 0`,
    [userId, pageNumber]
  );
  await client.query(
    `UPDATE public.tikrar_user_schedules
     SET status = 'pending',
         completed_at = NULL,
         updated_at = now()
     WHERE user_id = $1 AND page_number = $2 AND block_number = ANY($3::int[]) AND status = 'completed'`,
    [userId, pageNumber, blockNumbers]
  );
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

    const body = await req.json().catch(() => ({}));
    const rawScope = body?.scope;
    if (rawScope === 'all') {
      return NextResponse.json(
        { error: { message: 'Reset semua halaman dinonaktifkan. Silakan reset per juz atau per halaman.' } },
        { status: 400 }
      );
    }
    const scope = rawScope as ResetScope;
    if (!['juz', 'page', 'block', 'counter'].includes(scope)) {
      return NextResponse.json(
        { error: { message: 'Tipe reset tidak valid.' } },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    if (scope === 'juz') {
      const rawJuz = Math.floor(Number(body?.juz));
      if (!Number.isFinite(rawJuz) || rawJuz < 1 || rawJuz > 30) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: { message: 'Nomor juz tidak valid (1–30).' } },
          { status: 400 }
        );
      }

      const { startPage, endPage } = getJuzPageRange(rawJuz);
      const emptyBlocks = createEmptyTikrarBlocks();
      const emptyMeta = createEmptyTikrarMetaCounts();

      await client.query(
        `UPDATE public.tikrar_user_progress
         SET prep_listen_count = 0,
             prep_translation_done = false,
             blocks = $5::jsonb,
             meta_counts = $6::jsonb,
             tuntas_blocks = '[]'::jsonb,
             total_progress = 0,
             updated_at = now()
         WHERE user_id = $1
           AND (juz = $2 OR (page_number >= $3 AND page_number <= $4))`,
        [ctx.userId, rawJuz, startPage, endPage, JSON.stringify(emptyBlocks), JSON.stringify(emptyMeta)]
      );

      await client.query(
        `DELETE FROM public.tikrar_daily_logs
         WHERE user_id = $1
           AND (juz = $2 OR (page_number >= $3 AND page_number <= $4))`,
        [ctx.userId, rawJuz, startPage, endPage]
      );

      await client.query(
        `UPDATE public.tikrar_user_schedules
         SET status = 'pending',
             completed_at = NULL,
             updated_at = now()
         WHERE user_id = $1
           AND (juz = $2 OR (page_number >= $3 AND page_number <= $4))
           AND status = 'completed'`,
        [ctx.userId, rawJuz, startPage, endPage]
      );

      await client.query('COMMIT');
      return NextResponse.json({
        data: { scope: 'juz', juz: rawJuz, startPage, endPage, progress: null },
        error: null,
      });
    }

    const rawPage = Math.floor(Number(body?.page_number));
    if (!Number.isFinite(rawPage) || rawPage < 1 || rawPage > 604) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: { message: 'Nomor halaman tidak valid (1–604).' } },
        { status: 400 }
      );
    }
    const pageNumber = rawPage;
    const juz = Math.max(1, Math.min(30, Math.floor(Number(body?.juz) || getJuzForPage(pageNumber))));

    if (scope === 'page') {
      const emptyBlocks = createEmptyTikrarBlocks();
      const emptyMeta = createEmptyTikrarMetaCounts();

      const { rows } = await client.query(
        `INSERT INTO public.tikrar_user_progress (
           user_id, page_number, juz, prep_listen_count, prep_translation_done,
           blocks, meta_counts, tuntas_blocks, total_progress, updated_at
         )
         VALUES ($1, $2, $3, 0, false, $4::jsonb, $5::jsonb, '[]'::jsonb, 0, now())
         ON CONFLICT (user_id, page_number)
         DO UPDATE SET
           juz = EXCLUDED.juz,
           prep_listen_count = 0,
           prep_translation_done = false,
           blocks = EXCLUDED.blocks,
           meta_counts = EXCLUDED.meta_counts,
           tuntas_blocks = '[]'::jsonb,
           total_progress = 0,
           updated_at = now()
         RETURNING *`,
        [ctx.userId, pageNumber, juz, JSON.stringify(emptyBlocks), JSON.stringify(emptyMeta)]
      );

      await client.query(
        `DELETE FROM public.tikrar_daily_logs WHERE user_id = $1 AND page_number = $2`,
        [ctx.userId, pageNumber]
      );

      await client.query(
        `UPDATE public.tikrar_user_schedules
         SET status = 'pending',
             completed_at = NULL,
             updated_at = now()
         WHERE user_id = $1 AND page_number = $2 AND status = 'completed'`,
        [ctx.userId, pageNumber]
      );

      await client.query('COMMIT');
      return NextResponse.json({
        data: { scope: 'page', pageNumber, progress: rows[0] },
        error: null,
      });
    }

    const { rows: existingRows } = await client.query(
      `SELECT prep_listen_count, prep_translation_done, blocks, meta_counts
       FROM public.tikrar_user_progress
       WHERE user_id = $1 AND page_number = $2
       FOR UPDATE`,
      [ctx.userId, pageNumber]
    );
    const ex = existingRows[0] || null;
    let prepListenCount = Number(ex?.prep_listen_count) || 0;
    const prepTranslationDone = Boolean(ex?.prep_translation_done);
    const blocks = normalizeBlocks(ex?.blocks);
    const metaCounts = normalizeMetaCounts(ex?.meta_counts);

    if (scope === 'block') {
      const block = Math.floor(Number(body?.block)) as 1 | 2 | 3 | 4;
      if (![1, 2, 3, 4].includes(block)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: { message: 'Nomor blok tidak valid (1–4).' } },
          { status: 400 }
        );
      }

      blocks[block] = {
        a: { count: 0 },
        b: { count: 0 },
        combined: { count: 0 },
        listen: { count: 0 },
      };
      if (block === 1) {
        prepListenCount = 0;
      }

      const tuntasBlocks = computeTuntasBlocks(blocks);
      const totalProgress = Math.round(computeTikrarPageTotalProgress(blocks, metaCounts));

      const { rows } = await client.query(
        `INSERT INTO public.tikrar_user_progress (
           user_id, page_number, juz, prep_listen_count, prep_translation_done,
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
          prepListenCount,
          prepTranslationDone,
          JSON.stringify(blocks),
          JSON.stringify(metaCounts),
          JSON.stringify(tuntasBlocks),
          totalProgress,
        ]
      );

      await clearDailyLogsAndScheduleForBlocks(client, ctx.userId, pageNumber, [block]);

      await client.query('COMMIT');
      return NextResponse.json({
        data: { scope: 'block', pageNumber, block, progress: rows[0] },
        error: null,
      });
    }

    // scope === 'counter'
    const rawKey = typeof body?.key === 'string' ? body.key.trim() : '';
    const normalizedKey = rawKey === 'prep' ? '1.listen' : rawKey;
    if (!/^([1-4]\.(listen|a|b|combined)|meta\.(1_2|2_3|1_2_3|3_4|2_3_4|1_2_3_4))$/.test(normalizedKey)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: { message: 'Kunci counter tidak valid.' } },
        { status: 400 }
      );
    }

    let clearedBlock: number | null = null;
    if (normalizedKey.startsWith('meta.')) {
      const metaKey = normalizedKey.slice(5);
      metaCounts[metaKey] = 0;
    } else {
      const [bStr, part] = normalizedKey.split('.');
      const b = Number(bStr) as 1 | 2 | 3 | 4;
      if (part === 'listen') {
        blocks[b].listen = { count: 0 };
        delete blocks[b].understood;
        if (b === 1) prepListenCount = 0;
      } else if (part === 'a' || part === 'b' || part === 'combined') {
        const subPart = part as 'a' | 'b' | 'combined';
        blocks[b][subPart] = { count: 0 };
        clearedBlock = b;
      }
    }

    const tuntasBlocks = computeTuntasBlocks(blocks);
    const totalProgress = Math.round(computeTikrarPageTotalProgress(blocks, metaCounts));

    const { rows } = await client.query(
      `INSERT INTO public.tikrar_user_progress (
         user_id, page_number, juz, prep_listen_count, prep_translation_done,
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
        prepListenCount,
        prepTranslationDone,
        JSON.stringify(blocks),
        JSON.stringify(metaCounts),
        JSON.stringify(tuntasBlocks),
        totalProgress,
      ]
    );

    if (clearedBlock !== null) {
      await clearDailyLogsAndScheduleForBlocks(client, ctx.userId, pageNumber, [clearedBlock]);
    }

    await client.query('COMMIT');
    return NextResponse.json({
      data: { scope: 'counter', pageNumber, key: normalizedKey, progress: rows[0] },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error in POST /api/tikrar/progress/reset:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal mereset counter Tikrar.' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
