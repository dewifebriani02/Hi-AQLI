import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, quiz_id, surah_id, verse_id, score, total_questions, duration_seconds, is_passed, wrong_words, page_id } = body;

    console.log(`MUFRADAT_QUIZ_SAVE [${quiz_id}] User: ${user_id} Page: ${page_id || 'N/A'}`);

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
      page_id: page_id ? Number(page_id) : null, // Record Mushaf page
      created_at: new Date().toISOString(),
    };

    let { error: insertError } = await supabase
      .from('quiz_attempts')
      .insert(insertData);

    // GRACEFUL DEGRADATION: If the insert fails because of 'wrong_words' or 'page_id' column missing, 
    // try one more time without them so we don't lose the user's progress.
    if (insertError && (insertError.message.includes('wrong_words') || insertError.message.includes('page_id') || insertError.code === '42703')) {
      console.warn('Column mismatch detected in quiz_attempts table, retrying without new fields...');
      const { wrong_words: _, page_id: __, ...legacyData } = insertData;
      const { error: retryError } = await supabase
        .from('quiz_attempts')
        .insert(legacyData);
      insertError = retryError;
    }

    if (insertError) {
      console.error('Supabase error saving mufradat quiz:', insertError);
      
      // If table is missing completely, return a informative error but not a 500 (to reduce console noise during setup)
      if (insertError.code === '42P01') {
        console.error('CRITICAL: Table "public.quiz_attempts" is missing. Please run the SQL initialization script.');
        return NextResponse.json({ 
          success: false, 
          error: 'Table missing', 
          message: 'Database not initialized. Please run the SQL script provided.' 
        }, { status: 200 }); // Returning 200 so UI doesn't crash, but success: false
      }

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
