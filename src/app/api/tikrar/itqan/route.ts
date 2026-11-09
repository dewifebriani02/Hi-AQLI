import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzForPage, getJuzPageRange } from '@/lib/tikrar-schedule-generator';
import { countCompletedSteps, MEMORIZED_STEP_COUNT } from '@/lib/tikrar-steps';
import { loadClearedPages } from '@/lib/tikrar-server';

/**
 * Itqan 30 Juz dua lapis:
 * - memorized: halaman yang semua langkah klik counter sampai Gabung A–D tuntas
 * - tested: halaman yang dinyatakan lulus setoran Tasmi' / ujian lisan oleh muallimah
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }

    const { tasmiPassed, quizPassed } = await loadClearedPages(pool, ctx.userId);
    const { rows } = await pool.query(
      `SELECT page_number, prep_listen_count, prep_translation_done, blocks, meta_counts
       FROM public.tikrar_user_progress WHERE user_id = $1`,
      [ctx.userId]
    );

    const memorized = new Set<number>();
    for (const r of rows) {
      if (countCompletedSteps(r, false) >= MEMORIZED_STEP_COUNT) memorized.add(Number(r.page_number));
    }
    // Halaman yang sudah lulus diuji/ujian pasti sudah dihafal
    tasmiPassed.forEach((p) => memorized.add(p));
    quizPassed.forEach((p) => memorized.add(p));

    const juz = Array.from({ length: 30 }, (_, i) => {
      const { startPage, endPage, totalPages } = getJuzPageRange(i + 1);
      let mem = 0;
      let tested = 0;
      for (let p = startPage; p <= endPage; p++) {
        if (memorized.has(p)) mem += 1;
        if (tasmiPassed.has(p)) tested += 1;
      }
      return { juz: i + 1, totalPages, memorizedPages: mem, testedPages: tested };
    });

    return NextResponse.json({
      data: {
        juz,
        memorizedPages: Array.from(memorized).sort((a, b) => a - b),
        testedPages: Array.from(tasmiPassed).sort((a, b) => a - b),
        memorizedJuzCount: juz.filter((j) => j.memorizedPages === j.totalPages).length,
        testedJuzCount: juz.filter((j) => j.testedPages === j.totalPages).length,
        totalMemorizedPages: memorized.size,
        totalTestedPages: tasmiPassed.size,
        lastJuz: memorized.size ? getJuzForPage(Math.max(...memorized)) : null,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[TIKRAR_ITQAN_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal memuat data Itqan.' } }, { status: 500 });
  }
}
