import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, quiz_id, surah_id, ayat, score, total_questions, duration_seconds } = body;

    if (!user_id || !quiz_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = uuidv4();
    const surah = surah_id ? parseInt(surah_id.toString()) || 0 : 0;
    const verse = ayat ? parseInt(ayat.toString()) || 0 : 0;
    const numScore = Number(score) || 0;
    const numTotal = Number(total_questions) || 0;
    const isPassed = numScore === numTotal;
    const duration = Number(duration_seconds) || 0;

    await query(
      `INSERT INTO public.quiz_attempts (
        id, user_id, quiz_id, surah_id, verse_id, score, total_questions, is_passed, duration_seconds, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [id, user_id, quiz_id, surah, verse, numScore, numTotal, isPassed, duration]
    );

    // If perfect score, add points to user
    if (isPassed) {
      const { rows } = await query(
        `SELECT points FROM public.users WHERE id = $1 LIMIT 1`,
        [user_id]
      );
      if (rows.length > 0) {
        const currentPoints = rows[0].points || 0;
        await query(
          `UPDATE public.users SET points = $1, updated_at = now() WHERE id = $2`,
          [currentPoints + 10, user_id]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error in irab-quiz:', error);
    return NextResponse.json({ error: 'Internal server error', message: error?.message }, { status: 500 });
  }
}
