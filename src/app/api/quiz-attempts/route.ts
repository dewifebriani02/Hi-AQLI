import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getJuzForPage, JUZ_PAGE_MAPPING } from '@/lib/quran-mapping';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, quiz_id, surah_id, verse_id, score, total_questions, duration_seconds, is_passed, wrong_words, page_id } = body;

    console.log(`MUFRADAT_QUIZ_SAVE [${quiz_id}] User: ${user_id} Page: ${page_id || 'N/A'}`);

    if (!user_id || !quiz_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const attemptId = uuidv4();
    const surahId = surah_id ? parseInt(surah_id.toString()) || 0 : 0;
    const verseId = verse_id ? parseInt(verse_id.toString()) || 0 : 0;
    const numScore = Number(score) || 0;
    const numTotal = Number(total_questions) || 0;
    const passed = !!is_passed;
    const duration = Number(duration_seconds) || 0;
    const pageNum = page_id ? Number(page_id) : null;
    const wrongWordsJson = JSON.stringify(Array.isArray(wrong_words) ? wrong_words : []);

    await query(
      `INSERT INTO public.quiz_attempts (
        id, user_id, quiz_id, surah_id, verse_id, score, total_questions, is_passed, duration_seconds, page_id, wrong_words, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, now())`,
      [attemptId, user_id, quiz_id, surahId, verseId, numScore, numTotal, passed, duration, pageNum, wrongWordsJson]
    );

    // If passed, add points to user
    if (passed) {
      try {
        // 1. UPDATE REGULAR USER POINTS
        const { rows: userRows } = await query(
          `SELECT points FROM public.users WHERE id = $1 LIMIT 1`,
          [user_id]
        );

        if (userRows.length > 0) {
          const currentPoints = userRows[0].points || 0;
          await query(
            `UPDATE public.users SET points = $1, updated_at = now() WHERE id = $2`,
            [currentPoints + 10, user_id]
          );
        }

        // 2. MABAR POINT SYNC
        let juzId = pageNum ? getJuzForPage(pageNum) : null;
        if (!juzId && quiz_id.startsWith('mufradat_page_')) {
          const derivedPage = parseInt(quiz_id.replace('mufradat_page_', ''));
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
              [sessionId, user_id]
            );
          }
        }

        // 3. AUTO-UNLOCK NEXT JUZ FOR HI-MUFRADAT
        if (juzId && pageNum) {
          const mapping = JUZ_PAGE_MAPPING[juzId];
          if (mapping && pageNum === mapping.endPage) {
            const { rows: profileRows } = await query(
              `SELECT mufradat_accessible_juz FROM public.users WHERE id = $1 LIMIT 1`,
              [user_id]
            );

            if (profileRows.length > 0) {
              let accessibleJuz: number[] = Array.isArray(profileRows[0].mufradat_accessible_juz)
                ? [...profileRows[0].mufradat_accessible_juz]
                : [];

              const nextJuz = juzId + 1;
              if (nextJuz <= 30 && !accessibleJuz.includes(nextJuz)) {
                accessibleJuz.push(nextJuz);
                accessibleJuz.sort((a, b) => a - b);

                await query(
                  `UPDATE public.users SET mufradat_accessible_juz = $1::jsonb, updated_at = now() WHERE id = $2`,
                  [JSON.stringify(accessibleJuz), user_id]
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
    return NextResponse.json({ error: 'Internal server error', message: error?.message }, { status: 500 });
  }
}
