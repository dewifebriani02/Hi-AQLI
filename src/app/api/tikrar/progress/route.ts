import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzForPage, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import {
  canUndoStep,
  computeTikrarPageTotalProgress,
  countTotalClicks,
  getStepMinCount,
  PASS_THRESHOLD,
} from '@/lib/tikrar-steps';
import {
  computeTotalCompletedSteps,
  isPagePracticeAllowed,
  loadActiveTarget,
  loadClearedPages,
  recordTikrarActivity,
} from '@/lib/tikrar-server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401, headers: NO_STORE_HEADERS }
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
      return NextResponse.json({ data: rows, error: null }, { headers: NO_STORE_HEADERS });
    }

    const { rows } = await pool.query(
      `SELECT * FROM public.tikrar_user_progress WHERE user_id = $1 AND page_number = $2 LIMIT 1`,
      [ctx.userId, pageNumber]
    );

    return NextResponse.json({ data: rows[0] || null, error: null }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    console.error('Error in GET /api/tikrar/progress:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memuat progres Tikrar.' } },
      { status: 500, headers: NO_STORE_HEADERS }
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
    const undoKeys: string[] = Array.isArray(body.undo_keys)
      ? body.undo_keys.filter((k: unknown) => typeof k === 'string' && /^([1-4]\.(a|b|combined)|meta\.[1-4_]+)$/.test(k)).slice(0, 30)
      : [];

    // Gerbang: wajib punya target; halaman di dalam target wajib berurutan, halaman di luar target bebas untuk murajaah/coba juz lain
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

    const { rows: existingProgressRows } = await client.query(
      `SELECT prep_listen_count, prep_translation_done, blocks, meta_counts, tuntas_blocks, total_progress
       FROM public.tikrar_user_progress
       WHERE user_id = $1 AND page_number = $2
       FOR UPDATE`,
      [ctx.userId, pageNumber]
    );

    const existingRow = existingProgressRows[0] || null;
    const clicksBefore = countTotalClicks(existingRow);
    const stepsBefore = gate.inTarget
      ? await computeTotalCompletedSteps(client, ctx.userId, cleared, undefined, target)
      : 0;

    const exBlocks = typeof existingRow?.blocks === 'object' && existingRow?.blocks !== null ? existingRow.blocks : {};
    const exMeta = typeof existingRow?.meta_counts === 'object' && existingRow?.meta_counts !== null ? existingRow.meta_counts : {};

    // Simpan langsung angka terbaru dari perangkat yang sedang diklik oleh pengguna
    const finalBlocks: Record<1 | 2 | 3 | 4, any> = {
      1: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
      2: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
      3: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
      4: { a: { count: 0 }, b: { count: 0 }, combined: { count: 0 }, listen: { count: 0 } },
    };

    for (const b of [1, 2, 3, 4] as const) {
      const incomingUnderstood = blocks?.[b]?.understood;
      const existingUnderstood = exBlocks?.[b]?.understood;
      const finalUnderstood =
        typeof incomingUnderstood === 'boolean'
          ? incomingUnderstood
          : typeof existingUnderstood === 'boolean'
          ? existingUnderstood
          : undefined;
      finalBlocks[b] = {
        a: { count: Math.max(0, Math.floor(Number(blocks?.[b]?.a?.count) || 0)) },
        b: { count: Math.max(0, Math.floor(Number(blocks?.[b]?.b?.count) || 0)) },
        combined: { count: Math.max(0, Math.floor(Number(blocks?.[b]?.combined?.count) || 0)) },
        listen: {
          count: Math.min(5, Math.max(0, Math.floor(Number(blocks?.[b]?.listen?.count) || 0))),
        },
        ...(typeof finalUnderstood === 'boolean' ? { understood: finalUnderstood } : {}),
      };
    }

    const finalMetaCounts: Record<string, number> = {
      '1_2': 0,
      '2_3': 0,
      '1_2_3': 0,
      '3_4': 0,
      '2_3_4': 0,
      '1_2_3_4': 0,
    };
    const allMetaKeys = new Set([...Object.keys(finalMetaCounts), ...Object.keys(exMeta), ...Object.keys(metaCounts)]);
    allMetaKeys.forEach((k) => {
      finalMetaCounts[k] = Math.max(0, Math.floor(Number(metaCounts?.[k]) || 0));
    });

    const finalPrepListen = Math.max(prepListenCount, finalBlocks[1].listen.count);
    const finalPrepTrans = prepTranslationDone;

    // Terapkan batas minimum pengurangan (-1) hanya untuk counter yang langkah sesudahnya sudah berjalan
    for (const key of undoKeys) {
      const current = { blocks: finalBlocks, meta_counts: finalMetaCounts };
      if (!canUndoStep(key, current)) continue;
      const minFloor = getStepMinCount(key, current);
      if (key.startsWith('meta.')) {
        const k = key.slice(5);
        finalMetaCounts[k] = Math.max(minFloor, Math.floor(Number(metaCounts?.[k]) || 0));
      } else {
        const [bStr, part] = key.split('.');
        const b = Number(bStr) as 1 | 2 | 3 | 4;
        const wanted = Math.max(minFloor, Math.floor(Number(blocks?.[b]?.[part]?.count) || 0));
        finalBlocks[b] = { ...(finalBlocks[b] || {}), [part]: { count: wanted } };
      }
    }

    // Identifikasi blok-blok yang tuntas (bagian 1, bagian 2, dan gabung blok >= 40)
    const tuntasBlocks: number[] = [];
    const undoneCombinedBlocks: number[] = [];
    for (const b of [1, 2, 3, 4] as const) {
      const isNowTuntas =
        Number(finalBlocks?.[b]?.a?.count) >= PASS_THRESHOLD &&
        Number(finalBlocks?.[b]?.b?.count) >= PASS_THRESHOLD &&
        Number(finalBlocks?.[b]?.combined?.count) >= PASS_THRESHOLD;
      const wasTuntas =
        Number(exBlocks?.[b]?.a?.count) >= PASS_THRESHOLD &&
        Number(exBlocks?.[b]?.b?.count) >= PASS_THRESHOLD &&
        Number(exBlocks?.[b]?.combined?.count) >= PASS_THRESHOLD;
      if (isNowTuntas) {
        tuntasBlocks.push(b);
      } else if (wasTuntas) {
        undoneCombinedBlocks.push(b);
      }
    }

    const finalTotalProgress = Math.round(computeTikrarPageTotalProgress(finalBlocks, finalMetaCounts));

    // 1. Simpan progres counter ke database (public.tikrar_user_progress)
    const { rows: progressRows } = await client.query(
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
        finalPrepListen,
        finalPrepTrans,
        JSON.stringify(finalBlocks),
        JSON.stringify(finalMetaCounts),
        JSON.stringify(tuntasBlocks),
        finalTotalProgress,
      ]
    );

    // Blok yang batal tuntas: keluarkan dari laporan blok tuntas & kembalikan status jadwal ke pending
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
      await client.query(
        `UPDATE public.tikrar_user_schedules
         SET status = 'pending',
             completed_at = NULL,
             updated_at = now()
         WHERE user_id = $1 AND page_number = $2 AND block_number = ANY($3::int[]) AND status = 'completed'`,
        [ctx.userId, pageNumber, undoneCombinedBlocks]
      );
    }

    const savedRow = progressRows[0];
    let activity = null;
    let dailyLogSaved = null;

    // Keaktifan harian, poin, jadwal, dan halaman target aktif HANYA dicatat untuk halaman dalam Target & Jadwal aktif
    if (gate.inTarget) {
      const stepsAfter = await computeTotalCompletedSteps(
        client,
        ctx.userId,
        cleared,
        { page: pageNumber, row: savedRow },
        target
      );
      activity = await recordTikrarActivity(client, ctx.userId, {
        clicksDelta: countTotalClicks(savedRow) - clicksBefore,
        stepsBefore,
        stepsAfter,
        target,
      });

      // Perbarui posisi halaman terakhir aktif peserta di public.users agar selalu sinkron dengan target
      await client.query(
        `UPDATE public.users
         SET tikrar_current_page = $1,
             updated_at = now()
         WHERE id = $2`,
        [pageNumber, ctx.userId]
      );

      // 2. Blok yang BARU tuntas pada penyimpanan ini direkam ke public.tikrar_daily_logs (Laporan Blok Tuntas)
      const newlyTuntasBlocks = tuntasBlocks.filter(
        (b) =>
          !(
            Number(existingRow?.blocks?.[b]?.a?.count) >= PASS_THRESHOLD &&
            Number(existingRow?.blocks?.[b]?.b?.count) >= PASS_THRESHOLD &&
            Number(existingRow?.blocks?.[b]?.combined?.count) >= PASS_THRESHOLD
          )
      );
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
          `INSERT INTO public.tikrar_daily_logs (
             user_id, halaqah_id, log_date, juz, page_number, blocks_completed,
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
    }

    await client.query('COMMIT');

    return NextResponse.json({
      data: {
        progress: progressRows[0],
        dailyLog: dailyLogSaved,
        pointsAwarded: activity?.pointsAwarded || 0,
        activity,
        inTarget: gate.inTarget,
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
