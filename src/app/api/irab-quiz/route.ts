import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';

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

    const { user_id, quiz_id, surah_id, ayat, score, total_questions, duration_seconds } = body || {};

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

    const rawDuration = duration_seconds === undefined ? 0 : duration_seconds;
    if (
      !isNonNegativeInt(score) ||
      !isNonNegativeInt(total_questions) ||
      score > total_questions ||
      typeof rawDuration !== 'number' ||
      !Number.isFinite(rawDuration) ||
      rawDuration < 0
    ) {
      return NextResponse.json({ error: 'Data skor atau durasi kuis tidak valid.' }, { status: 400 });
    }
    const duration = Math.min(Math.floor(rawDuration), MAX_QUIZ_DURATION_SECONDS);

    const id = crypto.randomUUID();
    const surah = surah_id ? parseInt(String(surah_id), 10) || 0 : 0;
    const verse = ayat ? parseInt(String(ayat), 10) || 0 : 0;
    // TODO: Verifikasi jawaban kuis i'rab sepenuhnya di server (anti-cheat poin).
    const isPassed = total_questions > 0 && score === total_questions;

    await query(
      `INSERT INTO public.quiz_attempts (
        id, user_id, quiz_id, surah_id, verse_id, score, total_questions, is_passed, duration_seconds, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [id, userId, quiz_id.trim(), surah, verse, score, total_questions, isPassed, duration]
    );

    // If perfect score, add points to user
    if (isPassed) {
      await query(
        `UPDATE public.users SET points = COALESCE(points, 0) + 10, updated_at = now() WHERE id = $1`,
        [userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error in irab-quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
