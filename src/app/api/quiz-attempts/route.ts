import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, quizId, surahId, verseId, score, totalQuestions, durationSeconds, isPassed } = body;

    console.log('Mufradat Quiz Save Attempt:', { userId, quizId, surahId, verseId });

    if (!userId || !quizId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Try to insert with fallback for verseId/verseNumber
    const insertData: any = {
      user_id: userId,
      quizId: quizId,
      surahId: surahId,
      verseNumber: parseInt(verseId) || 0,
      score: score,
      totalQuestions: totalQuestions,
      isPassed: !!isPassed,
      durationSeconds: durationSeconds,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('quiz_attempts')
      .insert(insertData);

    if (insertError) {
      console.error('Supabase error saving mufradat quiz:', insertError);
      // Fallback for column naming if verseNumber is actually something else
      return NextResponse.json({ 
        error: 'Failed to save quiz attempt', 
        details: insertError.message 
      }, { status: 500 });
    }

    // If perfect score, add points to user
    if (isPassed) {
      try {
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('points')
          .eq('id', userId)
          .maybeSingle();

        if (userFetchError) {
          console.error('Error fetching user points:', userFetchError);
        } else if (userData) {
          const currentPoints = userData.points || 0;
          
          // Try both updated_at and updatedAt just to be safe if RLS allows
          const { error: updateError } = await supabase
            .from('users')
            .update({
              points: currentPoints + 10,
              updated_at: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any)
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating user points:', updateError);
            // We still return success: true because the quiz attempt was saved
          }
        }
      } catch (innerErr) {
        console.error('Unexpected error in points update:', innerErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error in quiz-attempts:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error?.message 
    }, { status: 500 });
  }
}
