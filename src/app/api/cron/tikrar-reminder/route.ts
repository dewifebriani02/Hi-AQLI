import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { isFullAdmin, isStaff } from '@/lib/db-policy';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import { QURAN_CHAPTERS } from '@/lib/quran-data';
import { SURAH_START_PAGES } from '@/lib/quran-mapping';
import {
  BLOCK_LETTERS,
  computeTikrarStreakAndWeekly,
  getDayOfWeekFromKey,
  getHourWIB,
  getJuzPageRange,
  isActiveStudyDay,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';

export type TikrarReminderMode = 'morning' | 'evening' | 'friday_weekly';

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

function getSurahLabelForPage(page: number): string {
  let surahId = 1;
  Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
    if (start <= page) surahId = Number(id);
  });
  const name = QURAN_CHAPTERS.find((c) => c.id === surahId)?.name_simple || "Al-Qur'an";
  return `QS. ${name}`;
}

function resolveMode(rawMode: string | null | undefined, dateKey: string): TikrarReminderMode {
  if (rawMode === 'morning' || rawMode === 'evening' || rawMode === 'friday_weekly') {
    return rawMode;
  }
  const hourWIB = getHourWIB();
  const dow = getDayOfWeekFromKey(dateKey);
  if (hourWIB < 13) return 'morning';
  if (dow === 5 && hourWIB >= 15 && hourWIB < 19) return 'friday_weekly';
  return 'evening';
}

async function runTikrarReminderJob(opts: {
  mode: TikrarReminderMode;
  dateKey: string;
  dryRun: boolean;
  force: boolean;
  targetUserId?: string | null;
}) {
  const { mode, dateKey, dryRun, force, targetUserId } = opts;
  const dow = getDayOfWeekFromKey(dateKey);
  const isWeekend = dow === 0 || dow === 6;

  if (isWeekend && (mode === 'morning' || mode === 'evening') && !force) {
    return {
      success: true,
      mode,
      dateKey,
      dryRun,
      skippedWeekend: true,
      message:
        'Akhir pekan (Sabtu/Ahad) adalah hari toleransi, murajaah & setoran — pengingat harian otomatis dilewati.',
      summary: { candidates: 0, eligible: 0, sent: 0, failed: 0, skippedDuplicate: 0 },
      items: [],
    };
  }

  // 1. Load active Tikrar participants with a valid WhatsApp/phone number and not WA-blocked / opted-out
  const userParams: any[] = [];
  let targetFilterSql = '';
  if (targetUserId) {
    userParams.push(targetUserId);
    targetFilterSql = `AND u.id = $${userParams.length}`;
  }

  const { rows: users } = await query<any>(
    `SELECT u.id, u.username, u.full_name, u.salutation, u.whatsapp, u.phone,
            u."paidJuz", u.tikrar_halaqah_id, u.tikrar_active_days_per_week,
            u.tikrar_current_page, u.tikrar_current_block, u.wa_blocked_at
     FROM public.users u
     WHERE u.wa_blocked_at IS NULL
       AND COALESCE(u.wa_opt_out, false) = false
       AND COALESCE(NULLIF(TRIM(u.whatsapp), ''), NULLIF(TRIM(u.phone), '')) IS NOT NULL
       AND (
         (u.is_tikrar_paid = true AND u.tikrar_halaqah_id IS NOT NULL)
         OR EXISTS (SELECT 1 FROM public.tikrar_user_schedules s WHERE s.user_id = u.id)
       )
       ${targetFilterSql}
     ORDER BY COALESCE(u.full_name, u.username) ASC`,
    userParams
  );

  if (users.length === 0) {
    return {
      success: true,
      mode,
      dateKey,
      dryRun,
      skippedWeekend: false,
      summary: { candidates: 0, eligible: 0, sent: 0, failed: 0, skippedDuplicate: 0 },
      items: [],
    };
  }

  const userIds = users.map((u: any) => u.id);
  const logType = `tikrar_${mode}`;

  // 2. Check already-sent reminders today for idempotency
  const { rows: sentTodayRows } = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id
     FROM public.whatsapp_logs
     WHERE user_id = ANY($1::uuid[])
       AND type = $2
       AND status = 'sent'
       AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = $3::date`,
    [userIds, logType, dateKey]
  );
  const alreadySentUserIds = new Set<string>(sentTodayRows.map((r) => r.user_id));

  // 3. Load schedules for today (or earliest pending) & recent daily logs for streak/weekly calculation
  const { rows: scheduleRows } = await query<any>(
    `SELECT user_id, juz, page_number, block_number,
            to_char(scheduled_date, 'YYYY-MM-DD') AS scheduled_date, status
     FROM public.tikrar_user_schedules
     WHERE user_id = ANY($1::uuid[])
       AND (scheduled_date = $2::date OR status != 'completed')
     ORDER BY scheduled_date ASC, page_number ASC, block_number ASC`,
    [userIds, dateKey]
  );

  const schedulesByUser = new Map<string, any[]>();
  for (const s of scheduleRows) {
    const arr = schedulesByUser.get(s.user_id) || [];
    arr.push(s);
    schedulesByUser.set(s.user_id, arr);
  }

  const { rows: logRows } = await query<{ user_id: string; log_date: string }>(
    `SELECT user_id, to_char(log_date, 'YYYY-MM-DD') AS log_date
     FROM public.tikrar_daily_logs
     WHERE user_id = ANY($1::uuid[]) AND completed = true`,
    [userIds]
  );

  const logsByUser = new Map<string, Set<string>>();
  for (const l of logRows) {
    const set = logsByUser.get(l.user_id) || new Set<string>();
    set.add(l.log_date);
    logsByUser.set(l.user_id, set);
  }

  // 4. Evaluate eligibility and build personalized messages
  const items: any[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedDuplicate = 0;

  for (const u of users) {
    const rawPhone = u.whatsapp || u.phone || '';
    const phone = normalizePhoneNumber(rawPhone);
    if (!phone) continue;

    if (!force && alreadySentUserIds.has(u.id)) {
      skippedDuplicate += 1;
      continue;
    }

    const salutation = u.salutation || 'Ukhti';
    const displayName = u.full_name || u.username || 'Sahabat Quran';
    const activeJuz = Math.max(1, Math.min(30, Number(u.paidJuz) || 30));
    const { startPage, endPage } = getJuzPageRange(activeJuz);
    const targetDaysPerWeek = Math.max(1, Math.min(7, Number(u.tikrar_active_days_per_week) || 5));

    const userDates = logsByUser.get(u.id) || new Set<string>();
    const loggedToday = userDates.has(dateKey);
    const metrics = computeTikrarStreakAndWeekly(userDates, dateKey);

    const userSchedules = schedulesByUser.get(u.id) || [];
    const exactTodayBlocks = userSchedules.filter((s) => s.scheduled_date === dateKey);
    const pendingBlocks = userSchedules.filter((s) => s.status !== 'completed');

    let targetPage =
      Number(exactTodayBlocks[0]?.page_number) ||
      Number(pendingBlocks[0]?.page_number) ||
      Number(u.tikrar_current_page) ||
      startPage;
    if (targetPage < startPage || targetPage > endPage) targetPage = startPage;

    const blocksForTargetPage =
      exactTodayBlocks.length > 0
        ? exactTodayBlocks
            .filter((s) => Number(s.page_number) === targetPage)
            .map((s) => Number(s.block_number))
        : pendingBlocks.length > 0
        ? pendingBlocks
            .filter(
              (s) =>
                s.scheduled_date === pendingBlocks[0].scheduled_date &&
                Number(s.page_number) === targetPage
            )
            .map((s) => Number(s.block_number))
        : [Math.max(1, Math.min(4, Number(u.tikrar_current_block) || 1))];

    const blockLetters =
      Array.from(new Set<number>(blocksForTargetPage))
        .sort((a, b) => a - b)
        .map((b) => BLOCK_LETTERS[b] || 'A')
        .join(' & ') || 'A & B';

    const surahLabel = getSurahLabelForPage(targetPage);

    let message = '';

    if (mode === "morning") {
      if (!force && !isActiveStudyDay(dateKey, targetDaysPerWeek) && exactTodayBlocks.length === 0) {
        continue;
      }
      if (loggedToday && !force) {
        continue;
      }
      message =
        "Assalamu'alaikum warahmatullah wabarakatuh, " + salutation + " " + displayName + " 🌸\n\n" +
        "Target Hi Tikrar " + salutation + " hari ini:\n" +
        "📖 Halaman: " + targetPage + " | Blok: " + blockLetters + " (" + surahLabel + ")\n" +
        "🎯 Metode Itqan: Repetisi 40x per bagian teks & gabung blok.\n\n" +
        "Setiap klik hitungan repetisi otomatis tersimpan ke sistem & langsung memperbarui keaktifan serta heatmap grup " + salutation + ".\n\n" +
        "Yuk mulai buka mushaf dan aplikasi Tikrar hari ini:\n" +
        "🔗 https://hiaqli.pro/tikrar\n\n" +
        "Semoga Allah mudahkan dan berkahi setiap ayat yang diulang hari ini ✨";
    } else if (mode === "evening") {
      if (loggedToday) continue;
      if (
        !force &&
        metrics.weeklyActiveDays >= targetDaysPerWeek &&
        exactTodayBlocks.length === 0
      ) {
        continue;
      }
      const remainingDays = Math.max(1, targetDaysPerWeek - metrics.weeklyActiveDays);
      message =
        "Assalamu'alaikum " + salutation + " " + displayName + " 🌙\n\n" +
        "Alhamdulillah hari sudah menjelang malam. Sistem mencatat " + salutation + " belum menjalankan repetisi Hi Tikrar hari ini:\n" +
        "📖 Target: Halaman " + targetPage + ", Blok " + blockLetters + " (" + surahLabel + ")\n" +
        "🔥 Streak saat ini: " + metrics.streak + " hari berturut-turut\n\n" +
        "Luangkan 15–20 menit sejenak sebelum hari berganti untuk menjaga hafalan tetap mutqin dan menjaga streak keaktifan " + salutation + ":\n" +
        "🔗 https://hiaqli.pro/tikrar\n\n" +
        "(Catatan: Cukup tekan tombol hitungan di web, progres repetisi otomatis tersimpan) 🤲";
    } else if (mode === "friday_weekly") {
      if (metrics.weeklyActiveDays >= targetDaysPerWeek) continue;
      const deficit = targetDaysPerWeek - metrics.weeklyActiveDays;
      message =
        "Assalamu'alaikum " + salutation + " " + displayName + " 💐\n\n" +
        "Menjelang akhir pekan, capaian Hi Tikrar " + salutation + " pekan ini tercatat " + metrics.weeklyActiveDays + "/" + targetDaysPerWeek + " hari aktif (kurang " + deficit + " hari).\n\n" +
        "Sabtu dan Ahad adalah hari toleransi & murajaah. " + salutation + " bisa memanfaatkan akhir pekan ini untuk melengkapi target repetisi atau persiapan setoran Live Zoom ke Musyrifah:\n" +
        "🔗 https://hiaqli.pro/tikrar\n\n" +
        "Jazakillahu khairan atas keistiqamahannya bersama Al-Qur'an 🌸";
    }

    if (!message) continue;

    if (dryRun) {
      items.push({
        userId: u.id,
        name: displayName,
        phone,
        page: targetPage,
        blocks: blockLetters,
        weeklyActiveDays: metrics.weeklyActiveDays,
        targetDaysPerWeek,
        streak: metrics.streak,
        status: 'dry_run',
        message,
      });
      continue;
    }

    const sendRes = await whatsappService.sendTextMessage(phone, message);
    if (sendRes.success) sentCount += 1;
    else failedCount += 1;

    try {
      await query(
        `INSERT INTO public.whatsapp_logs (id, user_id, recipient, message, status, type, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          crypto.randomUUID(),
          u.id,
          phone,
          message,
          sendRes.success ? 'sent' : 'failed',
          logType,
          JSON.stringify({
            mode,
            dateKey,
            page: targetPage,
            blocks: blockLetters,
            provider: sendRes.provider,
            messageId: sendRes.messageId,
            error: sendRes.error,
          }),
        ]
      );
    } catch (logErr) {
      console.warn('[TIKRAR_CRON_LOG_WARN]:', logErr);
    }

    items.push({
      userId: u.id,
      name: displayName,
      phone,
      page: targetPage,
      blocks: blockLetters,
      status: sendRes.success ? 'sent' : 'failed',
      provider: sendRes.provider,
      messageId: sendRes.messageId,
      error: sendRes.error,
    });
  }

  return {
    success: true,
    mode,
    dateKey,
    dryRun,
    skippedWeekend: false,
    summary: {
      candidates: users.length,
      eligible: items.length,
      sent: sentCount,
      failed: failedCount,
      skippedDuplicate,
    },
    items,
  };
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

  try {
    const { searchParams } = new URL(req.url);
    const dateKey = toDateKeyWIB(searchParams.get('date') || new Date());
    const mode = resolveMode(searchParams.get('mode'), dateKey);
    const dryRun = searchParams.get('dryRun') === 'true' || searchParams.get('dry_run') === 'true';
    const force = searchParams.get('force') === 'true';
    const targetUserId = searchParams.get('userId') || null;

    const result = await runTikrarReminderJob({
      mode,
      dateKey,
      dryRun,
      force,
      targetUserId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[CRON_TIKRAR_REMINDER_GET_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET?.trim() || '';
    const providedSecret = extractCronSecret(req);
    const hasValidCronSecret =
      Boolean(expectedSecret && providedSecret) &&
      timingSafeSecretEqual(providedSecret!, expectedSecret);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const dryRun = Boolean(body.dryRun ?? body.dry_run ?? false);

    if (!hasValidCronSecret) {
      const ctx = await getAuthContext(req);
      if (!ctx.userId) {
        return NextResponse.json(
          { success: false, error: 'Silakan login terlebih dahulu.' },
          { status: 401 }
        );
      }
      if (!isStaff(ctx)) {
        return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
      }
      if (!dryRun && !isFullAdmin(ctx)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Hanya Administrator penuh yang dapat mengirim pengingat massal secara langsung.',
          },
          { status: 403 }
        );
      }
    }

    const dateKey = toDateKeyWIB(body.date || new Date());
    const mode = resolveMode(body.mode, dateKey);
    const force = Boolean(body.force);
    const targetUserId =
      typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;

    const result = await runTikrarReminderJob({
      mode,
      dateKey,
      dryRun,
      force,
      targetUserId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[CRON_TIKRAR_REMINDER_POST_ERROR]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
