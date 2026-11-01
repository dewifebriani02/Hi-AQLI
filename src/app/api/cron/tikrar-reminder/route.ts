import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { whatsappService } from '@/lib/services/whatsapp';
import { getAuthContext } from '@/lib/auth-server';
import { isStaff } from '@/lib/db-policy';
import { JUZ_PAGE_MAPPING } from '@/lib/quran-mapping';

function extractCronSecret(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerSecret = req.headers.get('x-cron-secret');
  if (headerSecret) {
    return headerSecret.trim();
  }
  const { searchParams } = new URL(req.url);
  return searchParams.get('secret');
}

function timingSafeSecretEqual(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    const padded = Buffer.alloc(expectedBuf.length);
    providedBuf.copy(padded, 0, 0, Math.min(providedBuf.length, expectedBuf.length));
    crypto.timingSafeEqual(padded, expectedBuf);
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function normalizePhoneNumber(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export async function GET(req: NextRequest) {
  return handleTikrarReminder(req);
}

export async function POST(req: NextRequest) {
  return handleTikrarReminder(req);
}

async function handleTikrarReminder(req: NextRequest) {
  // 1. Validasi Keamanan (CRON_SECRET atau Staff Admin Auth)
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = extractCronSecret(req);
  let isAuthorized = false;

  if (expectedSecret && providedSecret && timingSafeSecretEqual(providedSecret, expectedSecret)) {
    isAuthorized = true;
  } else {
    try {
      const ctx = await getAuthContext(req);
      if (ctx.userId && isStaff(ctx)) {
        isAuthorized = true;
      }
    } catch {
      // Ignored
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized: CRON_SECRET atau sesi admin diperlukan.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const testUserId = searchParams.get('test_user_id');
    const dryRun = searchParams.get('dry_run') === 'true';

    // Tentukan tipe reminder: 'morning' (briefing target) atau 'evening' (pengingat bagi yang belum lapor)
    let type = searchParams.get('type') as 'morning' | 'evening' | null;
    if (!type || (type !== 'morning' && type !== 'evening')) {
      // Auto-detect based on current WIB time (UTC+7)
      const nowUtc = new Date();
      const nowWibHour = (nowUtc.getUTCHours() + 7) % 24;
      type = nowWibHour < 12 ? 'morning' : 'evening';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Ambil seluruh pengguna yang terdaftar di program Tikrar
    let userQuery = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.salutation, 
        u.whatsapp, 
        u.phone,
        u.paid_juz,
        u.tikrar_halaqah_id,
        u.tikrar_target_duration_months,
        u.tikrar_active_days_per_week,
        u.tikrar_current_page,
        u.tikrar_current_block,
        u.streak,
        u.points,
        h.title as halaqah_title,
        h.schedule as halaqah_schedule,
        h.zoom_link as halaqah_zoom_link
      FROM public.users u
      LEFT JOIN public.halaqahs h ON h.id = u.tikrar_halaqah_id
      WHERE u.tikrar_halaqah_id IS NOT NULL
    `;

    const queryParams: any[] = [];
    if (testUserId) {
      userQuery += ` AND u.id = $1`;
      queryParams.push(testUserId);
    }

    const { rows: tikrarUsers } = await query(userQuery, queryParams);

    if (!tikrarUsers || tikrarUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada peserta aktif Tikrar yang ditemukan untuk dikirimkan pengingat.',
        results: [],
      });
    }

    // 3. Ambil log hari ini untuk memeriksa siapa yang sudah mengisi
    const userIds = tikrarUsers.map((u: any) => u.id);
    const { rows: todayLogs } = await query(
      `SELECT user_id, page_number, blocks_completed, completed 
       FROM public.tikrar_daily_logs 
       WHERE user_id = ANY($1::uuid[]) AND log_date = $2`,
      [userIds, todayStr]
    );

    const loggedUserMap = new Map<string, any>();
    (todayLogs || []).forEach((l: any) => loggedUserMap.set(l.user_id, l));

    // Ambil rekap hari aktif pekan ini (Senin s/d hari ini)
    const { rows: weeklyStats } = await query(
      `SELECT user_id, COUNT(DISTINCT log_date) as active_days
       FROM public.tikrar_daily_logs
       WHERE user_id = ANY($1::uuid[]) 
         AND log_date >= date_trunc('week', CURRENT_DATE)::date
       GROUP BY user_id`,
      [userIds]
    );

    const weeklyMap = new Map<string, number>();
    (weeklyStats || []).forEach((w: any) => weeklyMap.set(w.user_id, Number(w.active_days) || 0));

    const results: any[] = [];

    for (const u of tikrarUsers) {
      const recipientPhone = normalizePhoneNumber(u.whatsapp || u.phone);
      const name = u.full_name || u.username || 'Sahabat AQLI';
      const salutation = u.salutation || 'Ukhti';
      const currentJuz = Number(u.paid_juz) || 30;
      const mapping = JUZ_PAGE_MAPPING[currentJuz] || { startPage: 582, endPage: 604 };
      const page = Number(u.tikrar_current_page) || mapping.startPage;
      const duration = Number(u.tikrar_target_duration_months) || 2;
      const activeThisWeek = weeklyMap.get(u.id) || 0;
      const streak = Number(u.streak) || 0;
      const hasLoggedToday = loggedUserMap.has(u.id);

      if (!recipientPhone) {
        results.push({
          userId: u.id,
          name,
          status: 'skipped',
          reason: 'Nomor WhatsApp belum terdaftar',
        });
        continue;
      }

      let message = '';

      if (type === 'morning') {
        // Morning Target Briefing
        const loadDescription =
          duration === 1
            ? '1 Halaman Penuh (Blok A, B, C, & D)'
            : duration === 3
            ? '1 Blok Mandiri'
            : '1/2 Halaman (2 Blok)';

        message = `Assalamu'alaikum ${salutation} *${name}* 🌸,\n\n` +
          `Semangat pagi! Target Hi Tikrar hari ini:\n` +
          `📖 *Juz ${currentJuz} • Halaman ${page}*\n` +
          `🎯 *Beban Target: ${loadDescription}*\n\n` +
          `Metode Itqan 40x:\n` +
          `• 20x membaca melihat mushaf (_bith-nadhar_)\n` +
          `• 20x membaca hafalan tanpa melihat (_bil-ghaib_)\n\n` +
          `Komitmen 5 hari aktif per pekan untuk menjaga konsistensi dan menyalakan kotak hijau di Heatmap Grup.\n\n` +
          `Laporkan latihan hari ini di:\n` +
          `👉 https://hiaqli.pro/tikrar\n\n` +
          `_— Team Hi Tikrar AQLI ✨_`;
      } else {
        // Evening Reminder (Conditional)
        if (hasLoggedToday && !searchParams.get('force')) {
          results.push({
            userId: u.id,
            name,
            status: 'skipped',
            reason: 'Sudah mengisi laporan hari ini (40x selesai)',
          });
          continue;
        }

        const remainingQuota = Math.max(0, 5 - activeThisWeek);

        message = `*Pengingat Hi Tikrar* 🌙\n\n` +
          `Assalamu'alaikum ${salutation} *${name}*,\n\n` +
          `Sistem mencatat Anda belum mengisi laporan Tikrar hari ini untuk *Halaman ${page} (Juz ${currentJuz})*.\n\n` +
          `Yuk luangkan waktu untuk menyelesaikan repetisi 40x hari ini agar:\n` +
          `🔥 Mempertahankan streak *${streak} hari*\n` +
          `✅ Memenuhi kuota 5 hari aktif pekan ini (saat ini *${activeThisWeek}/5 hari*, tersisa *${remainingQuota} hari*)\n\n` +
          `Kirim laporan sebelum pukul 23:59 WIB:\n` +
          `👉 https://hiaqli.pro/tikrar\n\n` +
          `_Semoga Allah mudahkan dan berkahi setiap ayat yang diulang. 🌸_\n\n` +
          `_— Team Hi Tikrar AQLI ✨_`;
      }

      if (dryRun) {
        results.push({
          userId: u.id,
          name,
          phone: recipientPhone,
          status: 'dry_run_preview',
          type,
          messagePreview: message,
        });
        continue;
      }

      // Kirim melalui WhatsApp Service
      const sendRes = await whatsappService.sendTextMessage(recipientPhone, message);

      // Catat ke whatsapp_logs untuk audit trail
      try {
        await query(
          `INSERT INTO public.whatsapp_logs (id, user_id, recipient, message, status, type, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
          [
            crypto.randomUUID(),
            u.id,
            recipientPhone,
            message,
            sendRes.success ? 'sent' : 'failed',
            type === 'morning' ? 'tikrar_morning' : 'tikrar_evening',
            JSON.stringify({
              provider: sendRes.provider,
              messageId: sendRes.messageId,
              page,
              juz: currentJuz,
              activeThisWeek,
              streak,
            }),
          ]
        );
      } catch (logErr) {
        console.warn('[TIKRAR_CRON_LOG_WARN]: Gagal mencatat log WA:', logErr);
      }

      results.push({
        userId: u.id,
        name,
        phone: recipientPhone,
        status: sendRes.success ? 'sent' : 'failed',
        provider: sendRes.provider,
        messageId: sendRes.messageId,
        error: sendRes.error,
      });
    }

    return NextResponse.json({
      success: true,
      mode: dryRun ? 'dry_run' : 'live',
      type,
      totalParticipants: tikrarUsers.length,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[CRON_TIKRAR_REMINDER_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
