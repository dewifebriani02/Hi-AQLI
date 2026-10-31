import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { getJuzForPage, JUZ_PAGE_MAPPING } from '@/lib/quran-mapping';

const MAX_QUIZ_DURATION_SECONDS = 3600;

function isNonNegativeInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid.' }, { status: 400 });
    }

    const {
      user_id,
      quiz_id,
      surah_id,
      verse_id,
      score,
      total_questions,
      duration_seconds,
      is_passed,
      wrong_words,
      page_id,
    } = body || {};

    if (user_id !== undefined && user_id !== null && user_id !== ctx.userId) {
      return NextResponse.json(
        { error: 'Tidak boleh menyimpan progres kuis milik pengguna lain.' },
        { status: 403 }
      );
    }

    const userId = ctx.userId;

    if (typeof quiz_id !== 'string' || !quiz_id.trim()) {
      return NextResponse.json({ error: 'quiz_id wajib diisi.' }, { status: 400 });
    }

    const duration = duration_seconds === undefined ? 0 : duration_seconds;
    if (
      !isNonNegativeInt(score) ||
      !isNonNegativeInt(total_questions) ||
      score > total_questions ||
      !isNonNegativeInt(duration) ||
      duration > MAX_QUIZ_DURATION_SECONDS
    ) {
      return NextResponse.json({ error: 'Data skor atau durasi kuis tidak valid.' }, { status: 400 });
    }

    let pageNum: number | null = null;
    if (page_id !== undefined && page_id !== null) {
      const parsedPage = Number(page_id);
      if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > 604) {
        return NextResponse.json({ error: 'page_id tidak valid.' }, { status: 400 });
      }
      pageNum = parsedPage;
    }

    const attemptId = crypto.randomUUID();
    const surahId = surah_id ? parseInt(String(surah_id), 10) || 0 : 0;
    const verseId = verse_id ? parseInt(String(verse_id), 10) || 0 : 0;
    // TODO: Verifikasi jawaban & syarat kelulusan sepenuhnya di server (anti-cheat poin).
    const passed = Boolean(is_passed) && total_questions > 0;
    const wrongWordsJson = JSON.stringify(Array.isArray(wrong_words) ? wrong_words : []);

    await query(
      `INSERT INTO public.quiz_attempts (
        id, user_id, quiz_id, surah_id, verse_id, score, total_questions, is_passed, duration_seconds, page_id, wrong_words, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, now())`,
      [attemptId, userId, quiz_id.trim(), surahId, verseId, score, total_questions, passed, duration, pageNum, wrongWordsJson]
    );

    // If passed, add points to user
    if (passed) {
      try {
        // 1. UPDATE REGULAR USER POINTS (atomic increment)
        await query(
          `UPDATE public.users SET points = COALESCE(points, 0) + 10, updated_at = now() WHERE id = $1`,
          [userId]
        );

        // 2. MABAR POINT SYNC
        let juzId = pageNum ? getJuzForPage(pageNum) : null;
        if (!juzId && quiz_id.startsWith('mufradat_page_')) {
          const derivedPage = parseInt(quiz_id.replace('mufradat_page_', ''), 10);
          juzId = getJuzForPage(derivedPage);
        }

        if (juzId) {
          const { rows: sessionRows } = await query(
            `SELECT id FROM public.mufradat_mabar_sessions WHERE juz_id = $1 AND status = 'active' LIMIT 1`,
            [juzId]
          );

          if (sessionRows.length > 0) {
            const sessionId = sessionRows[0].id;
            await query(
              `INSERT INTO public.mufradat_mabar_participants (session_id, user_id, points_earned, last_activity_at)
               VALUES ($1, $2, 10, now())
               ON CONFLICT (session_id, user_id)
               DO UPDATE SET points_earned = public.mufradat_mabar_participants.points_earned + 10, last_activity_at = now()`,
              [sessionId, userId]
            );
          }
        }

        // 3. AUTO-UNLOCK NEXT JUZ FOR HI-MUFRADAT
        if (juzId && pageNum) {
          const mapping = JUZ_PAGE_MAPPING[juzId];
          if (mapping && pageNum === mapping.endPage) {
            const { rows: profileRows } = await query(
              `SELECT mufradat_accessible_juz FROM public.users WHERE id = $1 LIMIT 1`,
              [userId]
            );

            if (profileRows.length > 0) {
              const accessibleJuz: number[] = Array.isArray(profileRows[0].mufradat_accessible_juz)
                ? [...profileRows[0].mufradat_accessible_juz]
                : [];

              const nextJuz = juzId + 1;
              if (nextJuz <= 30 && !accessibleJuz.includes(nextJuz)) {
                accessibleJuz.push(nextJuz);
                accessibleJuz.sort((a, b) => a - b);

                await query(
                  `UPDATE public.users SET mufradat_accessible_juz = $1::jsonb, updated_at = now() WHERE id = $2`,
                  [JSON.stringify(accessibleJuz), userId]
                );
              }
            }
          }
        }
      } catch (innerErr) {
        console.error('Points update error:', innerErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error in quiz-attempts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
