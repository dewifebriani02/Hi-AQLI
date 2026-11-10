import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { addCalendarDays, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import {
  computeTargetStreak,
  computeUnlockedPage,
  estimateClicksForNextSteps,
  generateTikrarStepSchedule,
  type HeatmapLevel,
} from '@/lib/tikrar-steps';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }

    const searchParams = new URL(req.url).searchParams;
    const halaqah = searchParams.get('halaqah') || 'all';
    const halaqahId = UUID_RE.test(halaqah) ? halaqah : null;
    const todayKey = toDateKeyWIB();
    // Bulan kalender yang ditampilkan (YYYY-MM), default bulan berjalan (WIB); tidak boleh melewati bulan ini
    const currentMonth = todayKey.slice(0, 7);
    const rawMonth = searchParams.get('month') || '';
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) && rawMonth <= currentMonth ? rawMonth : currentMonth;
    const fromKey = `${month}-01`;
    const [mYear, mMonth] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(mYear, mMonth, 0)).getUTCDate();
    const toKey = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const streakFromKey = addCalendarDays(todayKey, -400);

    // Anggota: siapa pun yang pernah memakai Tikrar (target, aktivitas, laporan lama, progres, setoran), ditambah diri sendiri
    const { rows: members } = await pool.query(
      `SELECT u.id, COALESCE(NULLIF(u.full_name, ''), u.username, 'Thalibah HI AQLI') AS name,
              u.points, u.tikrar_halaqah_id,
              COALESCE(t.active_days_per_week, u.tikrar_active_days_per_week, 5) AS active_days
       FROM public.users u
       LEFT JOIN public.tikrar_targets t ON t.user_id = u.id AND t.is_active
       WHERE (u.id = $1
              OR t.id IS NOT NULL
              OR u.is_tikrar_paid
              OR u.tikrar_halaqah_id IS NOT NULL
              OR EXISTS (SELECT 1 FROM public.tikrar_daily_activity a WHERE a.user_id = u.id)
              OR EXISTS (SELECT 1 FROM public.tikrar_daily_logs l WHERE l.user_id = u.id)
              OR EXISTS (SELECT 1 FROM public.tikrar_user_progress p WHERE p.user_id = u.id)
              OR EXISTS (SELECT 1 FROM public.tikrar_submissions s WHERE s.user_id = u.id))
         AND ($2::uuid IS NULL OR u.tikrar_halaqah_id = $2::uuid OR u.id = $1)
       LIMIT 200`,
      [ctx.userId, halaqahId]
    );
    const ids = members.map((m) => m.id);

    const [{ rows: actRows }, { rows: subRows }, { rows: logRows }, { rows: targetRows }, { rows: progRows }, { rows: clearedRows }] = await Promise.all([
      pool.query(
        `SELECT user_id, to_char(activity_date, 'YYYY-MM-DD') AS d, clicks, target_met,
                GREATEST(steps_now - steps_start, 0) AS steps
         FROM public.tikrar_daily_activity
         WHERE user_id = ANY($1::uuid[]) AND activity_date >= $2::date`,
        [ids, streakFromKey]
      ),
      pool.query(
        `SELECT user_id, page_number, grade,
                to_char(COALESCE(verified_at, session_date::timestamptz, submitted_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS d
         FROM public.tikrar_submissions
         WHERE user_id = ANY($1::uuid[]) AND status = 'passed'
           AND COALESCE(verified_at, session_date::timestamptz, submitted_at) >= $2::date - INTERVAL '1 day'`,
        [ids, fromKey]
      ),
      // Laporan blok tuntas (termasuk sebelum aktivitas harian dicatat) sebagai tanda hari aktif
      pool.query(
        `SELECT user_id, to_char(log_date, 'YYYY-MM-DD') AS d, COUNT(*)::int AS pages
         FROM public.tikrar_daily_logs
         WHERE user_id = ANY($1::uuid[]) AND completed AND log_date >= $2::date
         GROUP BY user_id, log_date`,
        [ids, fromKey]
      ),
      // Untuk menghitung progres klik hari ini menuju target harian
      pool.query(
        `SELECT user_id, juz, start_page, end_page, to_char(start_date, 'YYYY-MM-DD') AS start_date,
                duration_months, active_days_per_week
         FROM public.tikrar_targets WHERE user_id = ANY($1::uuid[]) AND is_active`,
        [ids]
      ),
      pool.query(
        `SELECT user_id, page_number, prep_listen_count, prep_translation_done, blocks, meta_counts
         FROM public.tikrar_user_progress WHERE user_id = ANY($1::uuid[])`,
        [ids]
      ),
      pool.query(
        `SELECT user_id, page_number FROM public.tikrar_page_quizzes WHERE user_id = ANY($1::uuid[]) AND passed
         UNION
         SELECT user_id, page_number FROM public.page_exams WHERE user_id = ANY($1::uuid[]) AND passed = true`,
        [ids]
      ),
    ]);
    const targetByUser = new Map<string, any>(targetRows.map((t) => [t.user_id, t]));
    const progressByUser = new Map<string, Record<number, any>>();
    for (const r of progRows) {
      if (!progressByUser.has(r.user_id)) progressByUser.set(r.user_id, {});
      progressByUser.get(r.user_id)![Number(r.page_number)] = r;
    }
    const clearedByUser = new Map<string, Set<number>>();
    for (const r of clearedRows) {
      if (!clearedByUser.has(r.user_id)) clearedByUser.set(r.user_id, new Set());
      clearedByUser.get(r.user_id)!.add(Number(r.page_number));
    }

    // Progres hari ini: klik sudah dilakukan vs perkiraan klik total untuk mencapai kuota langkah harian
    const buildToday = (userId: string, todayAct?: { clicks: number; met: boolean; steps: number }) => {
      const t = targetByUser.get(userId);
      const clicks = todayAct?.clicks || 0;
      const stepsToday = todayAct?.steps || 0;
      if (!t) return { hasTarget: false, clicks, stepsToday, dailyQuota: 0, clicksTarget: 0, met: false };
      const dailyQuota = generateTikrarStepSchedule({
        juz: Number(t.juz),
        startPage: Number(t.start_page),
        endPage: Number(t.end_page),
        startDate: t.start_date,
        durationMonths: Number(t.duration_months),
        activeDaysPerWeek: Number(t.active_days_per_week),
      }).dailyQuota;
      const met = Boolean(todayAct?.met);
      const cleared = clearedByUser.get(userId) || new Set<number>();
      const fromPage = computeUnlockedPage(Number(t.start_page), Number(t.end_page), cleared);
      const remainingClicks = met
        ? 0
        : estimateClicksForNextSteps(
            progressByUser.get(userId) || {},
            fromPage,
            Number(t.end_page),
            cleared,
            Math.max(0, dailyQuota - stepsToday)
          );
      return { hasTarget: true, clicks, stepsToday, dailyQuota, clicksTarget: clicks + remainingClicks, met };
    };
    const logByUser = new Map<string, Set<string>>();
    for (const l of logRows) {
      if (!logByUser.has(l.user_id)) logByUser.set(l.user_id, new Set());
      logByUser.get(l.user_id)!.add(l.d);
    }

    const actByUser = new Map<string, Map<string, { clicks: number; met: boolean; steps: number }>>();
    for (const a of actRows) {
      if (!actByUser.has(a.user_id)) actByUser.set(a.user_id, new Map());
      actByUser.get(a.user_id)!.set(a.d, { clicks: Number(a.clicks) || 0, met: Boolean(a.target_met), steps: Number(a.steps) || 0 });
    }
    const subByUser = new Map<string, Map<string, string[]>>();
    for (const s of subRows) {
      if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, new Map());
      const m = subByUser.get(s.user_id)!;
      m.set(s.d, [...(m.get(s.d) || []), `Hal. ${s.page_number}`]);
    }

    const dateKeys: string[] = [];
    for (let i = 0; i < daysInMonth; i++) dateKeys.push(addCalendarDays(fromKey, i));

    // Senin pekan berjalan
    const dow = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
    const weekStart = addCalendarDays(todayKey, dow === 0 ? -6 : 1 - dow);

    const rows = members
      .map((m) => {
        const acts = actByUser.get(m.id) || new Map();
        const subs = subByUser.get(m.id) || new Map();
        const logDays = logByUser.get(m.id) || new Set<string>();
        const metDates = Array.from(acts.entries()).filter(([, v]) => v.met).map(([d]) => d);
        let weeklyMet = 0;
        for (let i = 0; i < 7; i++) {
          if (acts.get(addCalendarDays(weekStart, i))?.met) weeklyMet += 1;
        }
        const days = dateKeys.map((d) => {
          const a = acts.get(d);
          const s = subs.get(d);
          const level: HeatmapLevel = s
            ? 'tasmi'
            : a?.met
            ? 'met'
            : (a && a.clicks > 0) || logDays.has(d)
            ? 'active'
            : 'none';
          return { date: d, level, clicks: a?.clicks || 0, steps: a?.steps || 0, tasmi: s || null };
        });
        return {
          id: m.id,
          isMe: m.id === ctx.userId,
          name: m.name,
          halaqahId: m.tikrar_halaqah_id || null,
          points: Number(m.points) || 0,
          targetDays: Number(m.active_days) || 5,
          weeklyMet,
          streak: computeTargetStreak(metDates, Number(m.active_days) || 5, todayKey),
          today: buildToday(m.id, acts.get(todayKey)),
          days,
        };
      })
      .sort((a, b) => {
        if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
        if (b.weeklyMet !== a.weeklyMet) return b.weeklyMet - a.weeklyMet;
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.points - a.points;
      });

    return NextResponse.json({
      data: { todayKey, month, currentMonth, fromKey, toKey, dateKeys, members: rows },
      error: null,
    });
  } catch (err: any) {
    console.error('[TIKRAR_GROUP_ACTIVITY_ERROR]:', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal memuat keaktifan grup.' } }, { status: 500 });
  }
}
