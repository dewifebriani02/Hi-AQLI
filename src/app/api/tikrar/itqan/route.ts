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

    // Hafalan sebelum bergabung (diisi thalibah): dihitung terpisah dari hafalan via aplikasi
    const { rows: priorRows } = await pool.query(
      `SELECT page_number, status FROM public.tikrar_prior_hafalan WHERE user_id = $1`,
      [ctx.userId]
    );
    const priorMemorized = new Set<number>();
    const externalTested = new Set<number>();
    for (const r of priorRows) {
      const p = Number(r.page_number);
      if (!memorized.has(p)) priorMemorized.add(p);
      if (r.status === 'tested_external' && !tasmiPassed.has(p)) externalTested.add(p);
    }

    const juz = Array.from({ length: 30 }, (_, i) => {
      const { startPage, endPage, totalPages } = getJuzPageRange(i + 1);
      let mem = 0;
      let prior = 0;
      let tested = 0;
      let external = 0;
      for (let p = startPage; p <= endPage; p++) {
        if (memorized.has(p)) mem += 1;
        else if (priorMemorized.has(p)) prior += 1;
        if (tasmiPassed.has(p)) tested += 1;
        else if (externalTested.has(p)) external += 1;
      }
      return {
        juz: i + 1,
        totalPages,
        memorizedPages: mem,
        priorPages: prior,
        testedPages: tested,
        externalTestedPages: external,
      };
    });

    const allMemorized = new Set<number>([...memorized, ...priorMemorized]);
    const allTested = new Set<number>([...tasmiPassed, ...externalTested]);

    return NextResponse.json({
      data: {
        juz,
        memorizedPages: Array.from(memorized).sort((a, b) => a - b),
        testedPages: Array.from(tasmiPassed).sort((a, b) => a - b),
        // Juz penuh dihitung dari gabungan hafalan via aplikasi + hafalan lama
        memorizedJuzCount: juz.filter((j) => j.memorizedPages + j.priorPages >= j.totalPages).length,
        testedJuzCount: juz.filter((j) => j.testedPages + j.externalTestedPages >= j.totalPages).length,
        totalMemorizedPages: allMemorized.size,
        totalAppMemorizedPages: memorized.size,
        totalPriorPages: priorMemorized.size,
        totalTestedPages: allTested.size,
        totalAqliTestedPages: tasmiPassed.size,
        totalExternalTestedPages: externalTested.size,
        lastJuz: allMemorized.size ? getJuzForPage(Math.max(...allMemorized)) : null,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[TIKRAR_ITQAN_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal memuat data Itqan.' } }, { status: 500 });
  }
}
