import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { userId } = await req.json().catch(() => ({}));

    // 1. Get user(s)
    let query = supabase
      .from('users')
      .select('id, full_name, whatsapp, phone, mufradat_target_verses, mufradat_status')
    
    if (userId) {
      query = query.eq('id', userId);
    } else {
      query = query.eq('mufradat_status', 'active');
    }

    const { data: users, error: userError } = await query;
    console.log(`Query logic: userId=${userId}. Found ${users?.length || 0} users.`);
    console.log(`Found ${users?.length || 0} users match criteria.`);

    if (userError) throw userError

    const results = []

    for (const user of users) {
      // 2. Count progress for the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { count, error: countError } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_passed', true)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (countError) {
        results.push({ user: user.full_name, status: 'error_counting', error: countError });
        continue;
      }

      const dailyTarget = user.mufradat_target_verses || 5
      const weeklyTarget = dailyTarget * 7
      const actualProgress = count || 0

      // 3. Send reminder if progress < target OR if it's a manual single trigger
      if (actualProgress < weeklyTarget || userId) {
        const message = `Assalamu'alaikum ${user.full_name || 'Ukhti'},\n\n` + 
          (userId ? `(TEST KIRIM) ` : ``) +
          `Progres pekanan Ukhti baru mencapai ${actualProgress} ayat dari target ${weeklyTarget} ayat. Tetap semangat murajaah ya!\n\n- Hi AQLI Support`
        
        const waSource = user.whatsapp || user.phone;
        if (!waSource) {
          results.push({ user: user.full_name, status: 'skipped_no_contact' });
          continue;
        }

        let cleanNumber = waSource.replace(/[^0-9]/g, '');
        if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.substring(1);

        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': (FONNTE_API_KEY || '').trim() },
          body: new URLSearchParams({ 'target': cleanNumber, 'message': message }),
        })

        const resData = await response.json()

        await supabase.from('whatsapp_logs').insert({
          user_id: user.id,
          recipient: cleanNumber,
          message: message,
          status: resData.status ? 'sent' : 'failed',
          type: 'weekly_reminder',
          metadata: resData
        })

        results.push({ user: user.full_name, whatsapp: cleanNumber, status: resData.status ? 'sent' : 'failed', fonnte_response: resData });
      } else {
        results.push({ user: user.full_name, status: 'skipped_target_reached', progress: actualProgress, target: weeklyTarget });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${users.length} users`, 
      found_users: users.map(u => u.full_name),
      results 
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
