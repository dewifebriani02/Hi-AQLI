import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

function extractCronSecret(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret) {
    return headerSecret.trim();
  }
  // TODO: Hapus fallback query param `?secret=` setelah crontab di VPS diperbarui
  // menggunakan header `Authorization: Bearer <CRON_SECRET>` atau `x-cron-secret`.
  const { searchParams } = new URL(req.url);
  return searchParams.get('secret');
}

function timingSafeSecretEqual(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    // Samakan panjang buffer lebih dulu agar timingSafeEqual tidak melempar RangeError.
    const padded = Buffer.alloc(expectedBuf.length);
    providedBuf.copy(padded, 0, 0, Math.min(providedBuf.length, expectedBuf.length));
    crypto.timingSafeEqual(padded, expectedBuf);
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || expectedSecret.trim() === '') {
    return NextResponse.json(
      { error: 'CRON_SECRET belum dikonfigurasi di server.' },
      { status: 500 }
    );
  }

  const providedSecret = extractCronSecret(req);
  if (!providedSecret || !timingSafeSecretEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fonnteApiKey = process.env.FONNTE_API_KEY;

  try {
    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    // 1. Get all groups that have Fonnte Group ID
    const { rows: groups } = await query(
      `SELECT * FROM public.mufradat_groups WHERE fonnte_group_id IS NOT NULL`
    );

    if (!groups || groups.length === 0) {
      return NextResponse.json({ message: 'No groups with Fonnte ID found' });
    }

    const reportResults = [];

    for (const group of groups) {
      // 2. Get all verified members of this group
      const { rows: members } = await query(
        `SELECT id, username, full_name, mufradat_status FROM public.users
         WHERE mufradat_group_id = $1 AND mufradat_status = 'active'`,
        [group.id]
      );

      if (!members || members.length === 0) continue;

      const memberIds = members.map((m: any) => m.id);

      // 3. Get today's successful attempts for these members
      const { rows: attempts } = await query(
        `SELECT user_id, surah_id, verse_id, created_at FROM public.quiz_attempts
         WHERE user_id = ANY($1::uuid[]) AND is_passed = true AND created_at >= $2 AND created_at <= $3`,
        [memberIds, start, end]
      );

      // 4. Calculate stats
      const stats = members.map((m: any) => {
        const userAttempts = (attempts || []).filter((a: any) => a.user_id === m.id);
        const uniqueVerses = new Set(userAttempts.map((a: any) => `${a.surah_id}:${a.verse_id}`));
        return {
          id: m.id,
          name: m.full_name || m.username,
          count: uniqueVerses.size,
          lastActivity: userAttempts.length > 0
            ? new Date(userAttempts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at)
            : null
        };
      });

      // 5. Rank Top 10
      const activeStats = stats
        .filter((s: any) => s.count > 0)
        .sort((a: any, b: any) => b.count - a.count || (a.lastActivity?.getTime() || 0) - (b.lastActivity?.getTime() || 0));
      const topTen = activeStats.slice(0, 10);

      // 6. List Inactive
      const inactive = stats.filter((s: any) => s.count === 0).map((s: any) => s.name);

      // 7. Compose Message
      const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      let message = `🌟 *LAPORAN HARIAN ${group.name.toUpperCase()}* 🌟\n`;
      message += `📅 ${dateStr}\n`;
      message += `⏰ 19:00 WIB\n\n`;

      message += `🏆 *TOP 10 AKTIF HARI INI*\n`;
      if (topTen.length > 0) {
        topTen.forEach((s: any, i: number) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
          message += `${medal} ${s.name} - ${s.count} Ayat\n`;
        });
      } else {
        message += `_Belum ada aktivitas hari ini_\n`;
      }

      message += `\n🌿 *BELUM AKTIF HARI INI*\n`;
      if (inactive.length > 0) {
        const displayInactive = inactive.slice(0, 20);
        message += displayInactive.map((name: string) => `• ${name}`).join('\n');
        if (inactive.length > 20) message += `\n...dan ${inactive.length - 20} thalibah lainnya.`;
      } else {
        message += `_Masyallah, semua thalibah aktif!_ ✨\n`;
      }

      message += `\n\n_"Sedikit tapi istiqomah lebih dicintai Allah." Semangat ya Sahabat! ✨_\n`;
      message += `\n— Team Hi AQLI 🌷`;

      // 8. Send to Fonnte
      if (fonnteApiKey && group.fonnte_group_id) {
        const fonnteRes = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': fonnteApiKey
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
    console.error('[CRON_DAILY_REPORT_ERROR]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
