import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { isStaff } from '@/lib/db-policy';
import { getJuzForPage } from '@/lib/tikrar-schedule-generator';
import { countCompletedSteps, MEMORIZED_STEP_COUNT } from '@/lib/tikrar-steps';

function parseQuizBreakdown(questionTypes: any) {
  if (!questionTypes || typeof questionTypes !== 'object') {
    return {
      part1Correct: null as number | null,
      part1Total: null as number | null,
      part2Correct: null as number | null,
      part2Total: null as number | null,
      mufradatMode: null as string | null,
    };
  }
  const p1c = Number(questionTypes.part1_correct);
  const p1t = Number(questionTypes.part1_total);
  const p2c = Number(questionTypes.part2_correct);
  const p2t = Number(questionTypes.part2_total);
  return {
    part1Correct: questionTypes.part1_correct !== undefined && Number.isFinite(p1c) ? p1c : null,
    part1Total: Number.isFinite(p1t) && p1t > 0 ? p1t : null,
    part2Correct: questionTypes.part2_correct !== undefined && Number.isFinite(p2c) ? p2c : null,
    part2Total: Number.isFinite(p2t) && p2t > 0 ? p2t : null,
    mufradatMode: typeof questionTypes.mufradat_mode === 'string' ? questionTypes.mufradat_mode : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }
    if (!isStaff(ctx)) {
      return NextResponse.json({ error: { message: 'Hanya muallimah/admin.' } }, { status: 403 });
    }

    const [
      { rows: quizRows },
      { rows: priorRows },
      { rows: progressRows },
      { rows: userRows },
    ] = await Promise.all([
      pool.query(
        `SELECT q.id, q.user_id, q.juz, q.page_number, q.total_questions, q.correct_answers,
                q.score, q.passed, q.question_types, q.created_at
         FROM public.tikrar_page_quizzes q
         WHERE COALESCE(q.question_types->>'source', '') <> 'prior_hafalan'
         ORDER BY q.created_at DESC
         LIMIT 500`
      ),
      pool.query(
        `SELECT user_id, page_number, status, tested_by
         FROM public.tikrar_prior_hafalan
         ORDER BY page_number ASC`
      ),
      pool.query(
        `SELECT user_id, page_number, prep_listen_count, prep_translation_done, blocks, meta_counts
         FROM public.tikrar_user_progress`
      ),
      pool.query(
        `SELECT u.id,
                COALESCE(NULLIF(u.full_name, ''), u.username, u.email, 'Thalibah') AS name,
                u.email,
                COALESCE(u.whatsapp, u.phone) AS whatsapp,
                COALESCE(u."paidJuz", 30) AS active_juz,
                u.tikrar_current_page,
                u.is_tikrar_paid,
                u.tikrar_halaqah_id
         FROM public.users u
         WHERE u.is_tikrar_paid
            OR u.tikrar_halaqah_id IS NOT NULL
            OR EXISTS (SELECT 1 FROM public.tikrar_page_quizzes q WHERE q.user_id = u.id)
            OR EXISTS (SELECT 1 FROM public.tikrar_prior_hafalan h WHERE h.user_id = u.id)
            OR EXISTS (SELECT 1 FROM public.tikrar_targets t WHERE t.user_id = u.id AND t.is_active)
            OR EXISTS (SELECT 1 FROM public.tikrar_user_progress p WHERE p.user_id = u.id)
         ORDER BY name ASC`
      ),
    ]);

    const userMap = new Map<string, any>(userRows.map((u) => [u.id, u]));

    const quizzesByUser = new Map<string, any[]>();
    const priorSetByUser = new Map<string, Set<number>>();
    const priorMetaByUser = new Map<string, Map<number, { status: string; testedBy: string | null }>>();
    const memorizedSetByUser = new Map<string, Set<number>>();

    for (const r of priorRows) {
      if (!priorSetByUser.has(r.user_id)) priorSetByUser.set(r.user_id, new Set());
      priorSetByUser.get(r.user_id)!.add(Number(r.page_number));

      if (!priorMetaByUser.has(r.user_id)) priorMetaByUser.set(r.user_id, new Map());
      priorMetaByUser.get(r.user_id)!.set(Number(r.page_number), {
        status: r.status,
        testedBy: r.tested_by || null,
      });

      if (!memorizedSetByUser.has(r.user_id)) memorizedSetByUser.set(r.user_id, new Set());
      memorizedSetByUser.get(r.user_id)!.add(Number(r.page_number));
    }

    for (const r of progressRows) {
      if (countCompletedSteps(r, false) >= MEMORIZED_STEP_COUNT) {
        if (!memorizedSetByUser.has(r.user_id)) memorizedSetByUser.set(r.user_id, new Set());
        memorizedSetByUser.get(r.user_id)!.add(Number(r.page_number));
      }
    }

    for (const q of quizRows) {
      if (!quizzesByUser.has(q.user_id)) quizzesByUser.set(q.user_id, []);
      quizzesByUser.get(q.user_id)!.push(q);
    }

    const attempts = quizRows.map((q) => {
      const u = userMap.get(q.user_id);
      const pNum = Number(q.page_number);
      const isPrior = priorSetByUser.get(q.user_id)?.has(pNum) || false;
      return {
        id: q.id,
        userId: q.user_id,
        name: u?.name || 'Thalibah',
        email: u?.email || null,
        whatsapp: u?.whatsapp || null,
        juz: Number(q.juz) || getJuzForPage(pNum),
        page: pNum,
        totalQuestions: Number(q.total_questions),
        correctAnswers: Number(q.correct_answers),
        score: Number(q.score),
        passed: Boolean(q.passed),
        isPriorPage: isPrior,
        ...parseQuizBreakdown(q.question_types),
        createdAt: new Date(q.created_at).toISOString(),
      };
    });

    const participants = userRows.map((u) => {
      const userQuizzes = quizzesByUser.get(u.id) || [];
      const passedPages = Array.from(
        new Set<number>(userQuizzes.filter((q) => q.passed).map((q) => Number(q.page_number)))
      ).sort((a, b) => a - b);
      const passedSet = new Set<number>(passedPages);

      const latestByPage = new Map<number, { score: number; correct: number; total: number; passed: boolean; createdAt: string }>();
      let scoreSum = 0;
      for (const q of userQuizzes) {
        scoreSum += Number(q.score) || 0;
        const p = Number(q.page_number);
        if (!latestByPage.has(p)) {
          latestByPage.set(p, {
            score: Number(q.score),
            correct: Number(q.correct_answers),
            total: Number(q.total_questions),
            passed: Boolean(q.passed),
            createdAt: new Date(q.created_at).toISOString(),
          });
        }
      }

      const memSet = memorizedSetByUser.get(u.id) || new Set<number>();
      const priorMeta = priorMetaByUser.get(u.id) || new Map();

      const pendingQuizPages = Array.from(memSet)
        .filter((p) => !passedSet.has(p))
        .sort((a, b) => a - b)
        .map((p) => {
          const last = latestByPage.get(p);
          const pm = priorMeta.get(p);
          return {
            page: p,
            juz: getJuzForPage(p),
            source: (pm ? 'prior' : 'progress') as 'prior' | 'progress',
            priorStatus: pm?.status || null,
            lastScore: last?.score ?? null,
            lastCorrect: last?.correct ?? null,
            lastTotal: last?.total ?? null,
          };
        });

      const latest = userQuizzes[0] || null;
      return {
        userId: u.id,
        name: u.name,
        email: u.email || null,
        whatsapp: u.whatsapp || null,
        activeJuz: Number(u.active_juz) || 30,
        currentPage: u.tikrar_current_page ? Number(u.tikrar_current_page) : null,
        attemptCount: userQuizzes.length,
        passedQuizCount: passedPages.length,
        passedQuizPages: passedPages,
        avgScore: userQuizzes.length > 0 ? Math.round(scoreSum / userQuizzes.length) : null,
        latestScore: latest ? Number(latest.score) : null,
        latestPage: latest ? Number(latest.page_number) : null,
        latestPassed: latest ? Boolean(latest.passed) : null,
        latestAt: latest ? new Date(latest.created_at).toISOString() : null,
        pendingQuizPages,
        recentAttempts: userQuizzes.slice(0, 20).map((q) => ({
          id: q.id,
          page: Number(q.page_number),
          juz: Number(q.juz) || getJuzForPage(Number(q.page_number)),
          correctAnswers: Number(q.correct_answers),
          totalQuestions: Number(q.total_questions),
          score: Number(q.score),
          passed: Boolean(q.passed),
          ...parseQuizBreakdown(q.question_types),
          createdAt: new Date(q.created_at).toISOString(),
        })),
      };
    });

    return NextResponse.json({
      data: {
        attempts,
        participants,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[ADMIN_TIKRAR_QUIZZES_GET_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memuat skor ujian thalibah.' } },
      { status: 500 }
    );
  }
}
