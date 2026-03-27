import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, quizId, surahId, verseId, score, totalQuestions, durationSeconds, isPassed } = body;

    if (!userId || !quizId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert quiz attempt into quiz_attempts table
    // verseId is mapped to verseNumber for consistency with progress fetching
    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quizId: quizId,
        surahId: surahId,
        verseNumber: parseInt(verseId),
        score: score,
        totalQuestions: totalQuestions,
        isPassed: isPassed, // Now only true for 100% scores
        durationSeconds: durationSeconds,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Supabase error saving mufradat quiz:', error);
      return NextResponse.json({ error: 'Failed to save quiz attempt' }, { status: 500 });
    }

    // If perfect score, ensure user gets points (Itqan Reward)
    if (isPassed) {
      const { data: userData } = await supabase
        .from('users')
        .select('points')
        .eq('id', userId)
        .maybeSingle();

      const currentPoints = userData?.points || 0;

      await supabase
        .from('users')
        .update({
          points: currentPoints + 10,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error in quiz-attempts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
