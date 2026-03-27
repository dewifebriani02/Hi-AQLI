import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, quiz_id, surah_id, ayat, score, total_questions, duration_seconds } = body;

    if (!user_id || !quiz_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert quiz attempt ke tabel quiz_attempts yang sudah ada
    // quizId format: "irab_1:1" untuk membedakan dari quiz tilawah
    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user_id,
        quiz_id: quiz_id,
        surah_id: surah_id,
        verse_id: ayat,
        score: score,
        total_questions: total_questions,
        is_passed: score === total_questions,
        duration_seconds: duration_seconds,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save quiz attempt' }, { status: 500 });
    }

    // If perfect score, add points to user
    if (score === total_questions) {
      const { data: userData } = await supabase
        .from('users')
        .select('points')
        .eq('id', user_id)
        .maybeSingle();

      const currentPoints = userData?.points || 0;

      await supabase
        .from('users')
        .update({
          points: currentPoints + 10,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
