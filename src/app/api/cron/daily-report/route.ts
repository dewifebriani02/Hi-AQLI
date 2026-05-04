import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { startOfDay, endOfDay } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FONNTE_API_KEY = process.env.FONNTE_API_KEY;

export async function GET(req: Request) {
  // Simple security check (use CRON_SECRET in environment)
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    // 1. Get all groups that have Fonnte Group ID
    const { data: groups, error: groupErr } = await supabaseAdmin
      .from('mufradat_groups')
      .select('*')
      .not('fonnte_group_id', 'is', null);

    if (groupErr) throw groupErr;
    if (!groups || groups.length === 0) {
      return NextResponse.json({ message: 'No groups with Fonnte ID found' });
    }

    const reportResults = [];

    for (const group of groups) {
      // 2. Get all verified members of this group
      const { data: members, error: memberErr } = await supabaseAdmin
        .from('users')
        .select('id, username, full_name, mufradat_status')
        .eq('mufradat_group_id', group.id)
        .eq('mufradat_status', 'active');

      if (memberErr) continue;
      if (!members || members.length === 0) continue;

      const memberIds = members.map(m => m.id);

      // 3. Get today's successful attempts for these members
      const { data: attempts, error: attemptErr } = await supabaseAdmin
        .from('quiz_attempts')
        .select('user_id, surah_id, verse_id, created_at')
        .in('user_id', memberIds)
        .eq('is_passed', true)
        .gte('created_at', start)
        .lte('created_at', end);

      if (attemptErr) continue;

      // 4. Calculate stats
      const stats = members.map(m => {
        const userAttempts = (attempts || []).filter(a => a.user_id === m.id);
        // Count unique verses for today
        const uniqueVerses = new Set(userAttempts.map(a => `${a.surah_id}:${a.verse_id}`));
        return {
          id: m.id,
          name: m.full_name || m.username,
          count: uniqueVerses.size,
          lastActivity: userAttempts.length > 0 
            ? new Date(userAttempts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at)
            : null
        };
      });

      // 5. Rank Top 10
      const activeStats = stats.filter(s => s.count > 0).sort((a, b) => b.count - a.count || (a.lastActivity?.getTime() || 0) - (b.lastActivity?.getTime() || 0));
      const topTen = activeStats.slice(0, 10);

      // 6. List Inactive
      const inactive = stats.filter(s => s.count === 0).map(s => s.name);

      // 7. Compose Message
      const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      
      let message = `🌟 *LAPORAN HARIAN ${group.name.toUpperCase()}* 🌟\n`;
      message += `📅 ${dateStr}\n`;
      message += `⏰ 19:00 WIB\n\n`;

      message += `🏆 *TOP 10 AKTIF HARI INI*\n`;
      if (topTen.length > 0) {
        topTen.forEach((s, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
          message += `${medal} ${s.name} - ${s.count} Ayat\n`;
        });
      } else {
        message += `_Belum ada aktivitas hari ini_\n`;
      }

      message += `\n🌿 *BELUM AKTIF HARI INI*\n`;
      if (inactive.length > 0) {
        // Limit to 20 names to avoid too long messages
        const displayInactive = inactive.slice(0, 20);
        message += displayInactive.map(name => `• ${name}`).join('\n');
        if (inactive.length > 20) message += `\n...dan ${inactive.length - 20} thalibah lainnya.`;
      } else {
        message += `_Masyallah, semua thalibah aktif!_ ✨\n`;
      }

      message += `\n\n_"Sedikit tapi istiqomah lebih dicintai Allah." Semangat ya Sahabat! ✨_\n`;
      message += `\n— Team Hi AQLI 🌷`;

      // 8. Send to Fonnte
      if (FONNTE_API_KEY && group.fonnte_group_id) {
        const fonnteRes = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': FONNTE_API_KEY
          },
          body: new URLSearchParams({
            target: group.fonnte_group_id,
            message: message
          })
        });
        const fonnteData = await fonnteRes.json();
        reportResults.push({ group: group.name, status: fonnteData.status ? 'sent' : 'failed', detail: fonnteData });
      } else {
        reportResults.push({ group: group.name, status: 'skipped', reason: 'Missing API Key or Group ID' });
      }
    }

    return NextResponse.json({ success: true, results: reportResults });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
