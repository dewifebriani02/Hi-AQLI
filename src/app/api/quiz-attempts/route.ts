import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getJuzForPage } from '@/lib/quran-mapping';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
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
      surah_id: surah_id?.toString() || "0",
      verse_id: verse_id?.toString() || "0",
      score: Number(score) || 0,
      total_questions: Number(total_questions) || 0,
      is_passed: !!is_passed,
      duration_seconds: Number(duration_seconds) || 0,
      wrong_words: Array.isArray(wrong_words) ? wrong_words : [], 
      page_id: page_id ? Number(page_id) : null,
      created_at: new Date().toISOString(),
    };

    let { error: insertError } = await supabase
      .from('quiz_attempts')
      .insert(insertData);

    // GRACEFUL DEGRADATION: If the insert fails because of 'wrong_words' or 'page_id' column missing
    // or ANY column mismatch error (code 42703), retry without the newest fields.
    if (insertError && (insertError.code === '42703' || insertError.message.includes('wrong_words') || insertError.message.includes('page_id'))) {
      console.warn(`Column mismatch in [quiz_attempts]. Retrying without new fields. Error: ${insertError.message}`);
      const { wrong_words: _, page_id: __, ...legacyData } = insertData;
      const { error: retryError } = await supabase
        .from('quiz_attempts')
        .insert(legacyData);
      insertError = retryError;
    }

    if (insertError) {
      console.error('Supabase error saving mufradat quiz:', insertError);
      
      // If table is missing completely (42P01)
      if (insertError.code === '42P01') {
        return NextResponse.json({ 
          success: false, 
          error: 'Table missing', 
          message: 'Database not initialized. Please run the SQL script provided.' 
        }, { status: 200 });
      }

      return NextResponse.json({ 
        error: 'Failed to save quiz attempt', 
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }

    // If perfect score, add points to user
    if (is_passed) {
      try {
        // 1. UPDATE REGULAR USER POINTS
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('points, mufradat_group_id')
          .eq('id', user_id)
          .maybeSingle();

        if (userFetchError) {
          console.error('Error fetching user points:', userFetchError);
        } else if (userData) {
          const currentPoints = userData.points || 0;
          await supabase
            .from('users')
            .update({
              points: currentPoints + 10,
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', user_id);
        }

        // 2. MABAR POINT SYNC
        // Find Juz ID for this attempt
        let juzId = page_id ? getJuzForPage(Number(page_id)) : null;
        
        // If no page_id (old mode), we can try to derive from quiz_id if it's a page quiz
        if (!juzId && quiz_id.startsWith('mufradat_page_')) {
          const derivedPage = parseInt(quiz_id.replace('mufradat_page_', ''));
          juzId = getJuzForPage(derivedPage);
        }

        if (juzId) {
          // Check for active Mabar session for this Juz
          const { data: activeSession } = await supabase
            .from('mufradat_mabar_sessions')
            .select('id')
            .eq('juz_id', juzId)
            .eq('status', 'active')
            .maybeSingle();

          if (activeSession) {
            console.log(`MABAR_SYNC: Active session found for Juz ${juzId} [${activeSession.id}]`);
            
            // Increment participant points
            // Note: We use a RPC or a select-then-update if no increment available
            // In Supabase we can use .update({ points_earned: points_earned + 10 }) 
            // but we need current points first.
            const { data: participant } = await supabase
              .from('mufradat_mabar_participants')
              .select('points_earned')
              .eq('session_id', activeSession.id)
              .eq('user_id', user_id)
              .maybeSingle();

            if (participant) {
              await supabase
                .from('mufradat_mabar_participants')
                .update({ 
                  points_earned: (participant.points_earned || 0) + 10,
                  last_activity_at: new Date().toISOString()
                })
                .eq('session_id', activeSession.id)
                .eq('user_id', user_id);
            }
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
