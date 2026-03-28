import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, quiz_id, surah_id, verse_id, score, total_questions, duration_seconds, is_passed, wrong_words } = body;

    console.log('Mufradat Quiz Save Attempt:', { user_id, quiz_id, surah_id, verse_id });

    if (!user_id || !quiz_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Try to insert with standardized snake_case naming
    const insertData: any = {
      user_id,
      quiz_id,
      surah_id,
      verse_id,
      score,
      total_questions,
      is_passed: !!is_passed,
      duration_seconds,
      wrong_words, // New field for review feature
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
    if (is_passed) {
      try {
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('points')
          .eq('id', user_id)
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
            } as any)
            .eq('id', user_id);
          
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
