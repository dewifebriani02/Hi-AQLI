import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-server";

let isSchemaEnsured = false;

async function ensureJhtSchema() {
  if (isSchemaEnsured) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Profil Thalib / Thalibah / Alumni JHT
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.jht_profiles (
        user_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        nim TEXT,
        gender TEXT NOT NULL DEFAULT 'thalibah', -- 'thalib' | 'thalibah'
        prodi TEXT NOT NULL DEFAULT 'Akuntansi Syariah',
        angkatan INTEGER NOT NULL DEFAULT 2024,
        status_keanggotaan TEXT NOT NULL DEFAULT 'aktif', -- 'oprec' | 'aktif' | 'musyrif' | 'bph' | 'alumni'
        halaqah_name TEXT NOT NULL DEFAULT 'Halaqah Thalibat Al-Fath',
        musyrif_name TEXT NOT NULL DEFAULT 'Ustadzah Nabila, Lc.',
        total_juz_hafal INTEGER NOT NULL DEFAULT 13,
        current_ziyadah_juz INTEGER NOT NULL DEFAULT 8,
        current_ziyadah_page INTEGER NOT NULL DEFAULT 142,
        current_ziyadah_surah TEXT NOT NULL DEFAULT 'QS. Al-An''am (6) : Ayat 111 – 118',
        current_tikrar_count INTEGER NOT NULL DEFAULT 14,
        peer_simak_partner TEXT DEFAULT 'Fatimah Az-Zahra',
        exam_mode_active BOOLEAN NOT NULL DEFAULT FALSE,
        streak_days INTEGER NOT NULL DEFAULT 19,
        tasmi_target_category TEXT NOT NULL DEFAULT '5 Juz',
        tasmi_target_range TEXT NOT NULL DEFAULT 'Juz 1 – 5',
        tasmi_exam_date DATE DEFAULT '2026-12-04',
        tasmi_examiner TEXT DEFAULT 'Ustadzah Hafizhah, Lc.',
        tasmi_readiness_pct INTEGER NOT NULL DEFAULT 85,
        tasmi_registered BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Log Setoran Ziyadah (Mandiri, Voice Note, maupun Tatap Muka)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.jht_ziyadah_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        gender TEXT NOT NULL DEFAULT 'thalibah',
        halaqah_name TEXT NOT NULL DEFAULT 'Halaqah Thalibat Al-Fath',
        juz INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        surah_ayah TEXT NOT NULL,
        tikrar_count INTEGER NOT NULL DEFAULT 20,
        submission_method TEXT NOT NULL DEFAULT 'tatap_muka', -- 'mandiri' | 'voice_note' | 'tatap_muka'
        peer_simak_by TEXT,
        musyrif_name TEXT,
        predikat TEXT NOT NULL DEFAULT 'Menunggu Simak', -- 'Menunggu Simak' | 'Mumtaz (Lulus)' | 'Jayyid Jiddan' | 'Perlu Murajaah'
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Log Sesi Muraja'ah (Qarib & Ba'id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.jht_murajaah_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        tipe TEXT NOT NULL DEFAULT 'qarib', -- 'qarib' | 'baid'
        juz INTEGER NOT NULL,
        target_range TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'selesai', -- 'selesai' | 'menunggu'
        catatan TEXT,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Peta Kesehatan 30 Juz per User
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.jht_juz_health (
        user_id TEXT NOT NULL,
        juz INTEGER NOT NULL CHECK (juz >= 1 AND juz <= 30),
        status TEXT NOT NULL DEFAULT 'empty', -- 'mutqin' | 'warning' | 'urgent' | 'progress' | 'empty'
        last_murajaah_at TIMESTAMPTZ,
        putaran_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, juz)
      );
    `);

    // 5. Bursa Partner Simak ("Cari Pasangan Setoran")
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.jht_partner_posts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        gender_category TEXT NOT NULL DEFAULT 'thalibat', -- 'thalibat' | 'thullab' | 'alumni'
        meta_info TEXT NOT NULL,
        campus_location TEXT NOT NULL,
        free_time_slot TEXT NOT NULL,
        target_simak TEXT NOT NULL,
        invited_by JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed initial partner posts if empty
    const { rows: countPartner } = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM public.jht_partner_posts`
    );
    if ((countPartner[0]?.cnt || 0) === 0) {
      await client.query(`
        INSERT INTO public.jht_partner_posts (user_id, user_name, gender_category, meta_info, campus_location, free_time_slot, target_simak)
        VALUES
          ('seed-p1', 'Fatimah Az-Zahra', 'thalibat', 'Thalibah • Akuntansi Syariah ''24 • 18 Juz', 'Musholla Akhwat Kampus Utama', 'Hari ini, 12.30 – 13.30 WIB (Jeda Kuliah)', 'Target Simak: Muraja''ah Juz 5 (1/2 Juz Kedua)'),
          ('seed-p2', 'Nabila Khairunnisa', 'thalibat', 'Thalibah • Ekonomi Syariah ''23 • 15 Juz', 'Asrama Thalibat / Online GMeet', 'Ba''da Ashar, 16.00 – 17.00 WIB', 'Target Simak: Simulasi Pra-Tasmi'' Juz 1–3'),
          ('seed-p3', 'Maryam Qonitah', 'thalibat', 'Thalibah • Bisnis Digital ''25 • 6 Juz', 'Perpustakaan Tazkia Lt. 2 (Area Akhwat)', 'Besok, 10.00 – 11.00 WIB', 'Target Simak: Ziyadah QS. Al-An''am Hal. 142'),
          ('seed-m1', 'Muhammad Al-Fatih', 'thullab', 'Thalib • Ekonomi Syariah ''23 • 16 Juz', 'Masjid Al-Birr Kampus Tazkia (Selasar Utama)', 'Ba''da Dzuhur, 12.15 – 13.15 WIB', 'Target Simak: Muraja''ah Juz 11 (1 Juz Penuh)'),
          ('seed-m2', 'Zaid bin Tsabit', 'thullab', 'Thalib • Hukum Ekonomi Syariah ''22 • 25 Juz', 'Masjid Kampus / Online Voice Call', 'Ba''da Maghrib, 18.30 – 19.30 WIB', 'Target Simak: Persiapan Tasmi'' 20 Juz (Juz 15–16)'),
          ('seed-a1', 'Ustadzah Shafiyyah, S.E.', 'alumni', 'Alumni JHT Angkatan 2020 • 30 Juz Mutqin', 'Online via Zoom / WhatsApp Call', 'Sabtu & Ahad Pagi, 06.00 – 07.30 WIB', 'Bersedia Menyimak Adik Tingkat (Pra-Tasmi'' & Partner Alumni)'),
          ('seed-a2', 'Akhdan Al-Ghifari, S.Ak.', 'alumni', 'Alumni JHT Angkatan 2021 • 20 Juz', 'Online GMeet (Sela Jam Kerja / Malam)', 'Senin & Kamis, 20.00 – 21.00 WIB', 'Cari Partner Simak Sesama Alumni Thullab (Juz 1–10)');
      `);
    }

    // Seed sample members in jht_profiles if empty so Halaqah Thullab/Thalibat & Admin BPH have real DB rows
    const { rows: countProfiles } = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM public.jht_profiles`
    );
    if ((countProfiles[0]?.cnt || 0) === 0) {
      await client.query(`
        INSERT INTO public.jht_profiles (
          user_id, full_name, nim, gender, prodi, angkatan, status_keanggotaan,
          halaqah_name, musyrif_name, total_juz_hafal, current_ziyadah_juz,
          current_ziyadah_page, current_ziyadah_surah, current_tikrar_count,
          streak_days, tasmi_target_category, tasmi_target_range, tasmi_readiness_pct
        ) VALUES
          ('seed-thalibah-1', 'Aisyah Humaira', '24101011', 'thalibah', 'Akuntansi Syariah', 2024, 'aktif', 'Halaqah Thalibat Al-Fath', 'Ustadzah Nabila, Lc.', 13, 8, 142, 'QS. Al-An''am (6) : Ayat 111 – 118', 14, 19, '5 Juz', 'Juz 1 – 5', 85),
          ('seed-thalibah-2', 'Fatimah Az-Zahra', '23101045', 'thalibah', 'Ekonomi Syariah', 2023, 'aktif', 'Halaqah Thalibat Al-Fath', 'Ustadzah Nabila, Lc.', 18, 15, 285, 'QS. Al-Isra'' (17) : Ayat 28 – 38', 20, 27, '10 Juz', 'Juz 1 – 10', 95),
          ('seed-thalibah-3', 'Khadijah Qonitah', '25101089', 'thalibah', 'Bisnis Digital', 2025, 'aktif', 'Halaqah Thalibat An-Nur', 'Ustadzah Nabila, Lc.', 7, 4, 72, 'QS. Ali ''Imran (3) : Ayat 166 – 173', 8, 4, '3 Juz', 'Juz 28 – 30', 60),
          ('seed-thalib-1', 'Muhammad Al-Fatih', '23102012', 'thalib', 'Ekonomi Syariah', 2023, 'aktif', 'Halaqah Thullab Al-Birr', 'Ustadz Hamzah, Lc.', 16, 13, 252, 'QS. Ar-Ra''d (13) : Ayat 19 – 28', 20, 24, '10 Juz', 'Juz 1 – 10', 92),
          ('seed-thalib-2', 'Zaid bin Tsabit', '22102004', 'thalib', 'Hukum Ekonomi Syariah', 2022, 'aktif', 'Halaqah Thullab Al-Birr', 'Ustadz Hamzah, Lc.', 25, 22, 442, 'QS. Al-Ahzab (33) : Ayat 31 – 35', 18, 31, '20 Juz', 'Juz 1 – 20', 96),
          ('seed-thalib-3', 'Abdullah Azzam', '25102077', 'thalib', 'Akuntansi Syariah', 2025, 'aktif', 'Halaqah Thullab Asy-Syams', 'Ustadz Hamzah, Lc.', 9, 9, 164, 'QS. Al-A''raf (7) : Ayat 121 – 130', 20, 12, '5 Juz', 'Juz 26 – 30', 78);
      `);
    }

    await client.query("COMMIT");
    isSchemaEnsured = true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[JHT_ENSURE_SCHEMA_ERROR]:", err);
  } finally {
    client.release();
  }
}

async function ensureUserProfileAndJuzHealth(userId: string) {
  // Check if profile exists
  const { rows: existing } = await query(
    `SELECT * FROM public.jht_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (existing.length > 0) {
    return existing[0];
  }

  // Look up user from public.users if logged in
  const { rows: uRows } = await query(
    `SELECT id, username, full_name, email, gender FROM public.users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const u = uRows[0];
  const fullName =
    u?.full_name || u?.username || u?.email?.split("@")[0] || "Aisyah Humaira";
  const detectedGender =
    u?.gender === "male" || u?.gender === "ikhwan" || u?.gender === "L"
      ? "thalib"
      : "thalibah";
  const defaultHalaqah =
    detectedGender === "thalib"
      ? "Halaqah Thullab Al-Birr"
      : "Halaqah Thalibat Al-Fath";
  const defaultMusyrif =
    detectedGender === "thalib"
      ? "Ustadz Hamzah, Lc."
      : "Ustadzah Nabila, Lc.";

  const { rows: inserted } = await query(
    `INSERT INTO public.jht_profiles (
       user_id, full_name, gender, prodi, angkatan, status_keanggotaan,
       halaqah_name, musyrif_name
     )
     VALUES ($1, $2, $3, 'Akuntansi Syariah', 2024, 'aktif', $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, fullName, detectedGender, defaultHalaqah, defaultMusyrif]
  );

  // Seed default 30 Juz health map & initial logs for this user
  const defaultHealth: Array<{
    juz: number;
    status: string;
    daysAgo: number | null;
    putaran: number;
  }> = [
    { juz: 1, status: "mutqin", daysAgo: 2, putaran: 3 },
    { juz: 2, status: "mutqin", daysAgo: 3, putaran: 3 },
    { juz: 3, status: "mutqin", daysAgo: 4, putaran: 3 },
    { juz: 4, status: "mutqin", daysAgo: 1, putaran: 3 },
    { juz: 5, status: "warning", daysAgo: 9, putaran: 2 },
    { juz: 6, status: "warning", daysAgo: 11, putaran: 2 },
    { juz: 7, status: "urgent", daysAgo: 16, putaran: 1 },
    { juz: 8, status: "progress", daysAgo: 0, putaran: 1 },
    { juz: 26, status: "mutqin", daysAgo: 5, putaran: 3 },
    { juz: 27, status: "mutqin", daysAgo: 6, putaran: 3 },
    { juz: 28, status: "mutqin", daysAgo: 4, putaran: 4 },
    { juz: 29, status: "mutqin", daysAgo: 2, putaran: 4 },
    { juz: 30, status: "mutqin", daysAgo: 1, putaran: 5 },
  ];

  for (let j = 1; j <= 30; j++) {
    const found = defaultHealth.find((d) => d.juz === j);
    const st = found ? found.status : "empty";
    const putaran = found ? found.putaran : 0;
    const lastAt =
      found && found.daysAgo !== null
        ? new Date(Date.now() - found.daysAgo * 86400000).toISOString()
        : null;

    await query(
      `INSERT INTO public.jht_juz_health (user_id, juz, status, last_murajaah_at, putaran_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, juz) DO NOTHING`,
      [userId, j, st, lastAt, putaran]
    );
  }

  // Seed initial ziyadah logs if empty
  const { rows: zCount } = await query(
    `SELECT COUNT(*)::int AS cnt FROM public.jht_ziyadah_logs WHERE user_id = $1`,
    [userId]
  );
  if ((zCount[0]?.cnt || 0) === 0) {
    await query(
      `INSERT INTO public.jht_ziyadah_logs (
         user_id, user_name, gender, halaqah_name, juz, page_number,
         surah_ayah, tikrar_count, submission_method, peer_simak_by,
         musyrif_name, predikat, notes
       ) VALUES
         ($1, $2, $3, $4, 8, 141, 'QS. Al-An''am: 102–110', 22, 'tatap_muka', 'Fatimah Az-Zahra', $5, 'Mumtaz (Lulus)', 'Kelancaran 96% • Tajwid: Mumtaz'),
         ($1, $2, $3, $4, 8, 140, 'QS. Al-An''am: 95–101', 20, 'tatap_muka', 'Fatimah Az-Zahra', $5, 'Jayyid Jiddan', 'Perhatikan mad lazim ayat 99')`,
      [userId, fullName, detectedGender, defaultHalaqah, defaultMusyrif]
    );
  }

  return inserted[0];
}

export async function GET(req: NextRequest) {
  try {
    await ensureJhtSchema();
    const ctx = await getAuthContext(req);
    const activeUserId = ctx.userId || "seed-thalibah-1";

    const profile = await ensureUserProfileAndJuzHealth(activeUserId);

    const [
      { rows: ziyadahLogs },
      { rows: juzHealthRows },
      { rows: murajaahLogs },
      { rows: halaqahMembers },
      { rows: partnerPosts },
    ] = await Promise.all([
      query(
        `SELECT * FROM public.jht_ziyadah_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15`,
        [activeUserId]
      ),
      query(
        `SELECT * FROM public.jht_juz_health WHERE user_id = $1 ORDER BY juz ASC`,
        [activeUserId]
      ),
      query(
        `SELECT * FROM public.jht_murajaah_logs WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 15`,
        [activeUserId]
      ),
      query(
        `SELECT * FROM public.jht_profiles ORDER BY status_keanggotaan ASC, total_juz_hafal DESC LIMIT 50`
      ),
      query(
        `SELECT * FROM public.jht_partner_posts ORDER BY created_at DESC LIMIT 30`
      ),
    ]);

    return NextResponse.json({
      data: {
        isLoggedIn: !!ctx.userId,
        isAdminOrMusyrif: !!(ctx.isAdmin || ctx.isSuperAdmin || ctx.isMusyrifah),
        profile,
        ziyadahLogs,
        juzHealth: juzHealthRows,
        murajaahLogs,
        halaqahMembers,
        partnerPosts,
      },
      error: null,
    });
  } catch (err: any) {
    console.error("[JHT_GET_ERROR]:", err);
    return NextResponse.json(
      { error: { message: err?.message || "Gagal memuat data Mutaba'ah JHT." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureJhtSchema();
    const ctx = await getAuthContext(req);
    const activeUserId = ctx.userId || "seed-thalibah-1";
    const profile = await ensureUserProfileAndJuzHealth(activeUserId);
    const body = await req.json();
    const action = body.action;

    // 1. Update Tikrar Counter
    if (action === "update_tikrar") {
      const nextCount = Math.max(0, Math.min(200, Number(body.tikrar_count) || 0));
      const { rows } = await query(
        `UPDATE public.jht_profiles
         SET current_tikrar_count = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [nextCount, activeUserId]
      );
      return NextResponse.json({ data: { profile: rows[0] }, error: null });
    }

    // 2. Toggle Mode UTS / UAS (Streak Freeze Kampus)
    if (action === "toggle_exam_mode") {
      const nextMode = Boolean(body.exam_mode_active);
      const { rows } = await query(
        `UPDATE public.jht_profiles
         SET exam_mode_active = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [nextMode, activeUserId]
      );
      return NextResponse.json({ data: { profile: rows[0] }, error: null });
    }

    // 3. Submit Setoran Ziyadah (Mandiri / Voice Note / Tatap Muka)
    if (action === "submit_ziyadah") {
      const pageNum = Math.max(
        1,
        Math.min(604, Number(body.page_number) || profile.current_ziyadah_page)
      );
      const juzNum = Math.max(
        1,
        Math.min(30, Number(body.juz) || profile.current_ziyadah_juz)
      );
      const surahAyah =
        (typeof body.surah_ayah === "string" && body.surah_ayah.trim()) ||
        profile.current_ziyadah_surah;
      const method = body.submission_method || "tatap_muka";
      const tikrarCount = Number(body.tikrar_count) || profile.current_tikrar_count;
      const peerPartner =
        (typeof body.peer_simak_by === "string" && body.peer_simak_by.trim()) ||
        profile.peer_simak_partner;
      const notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : method === "voice_note"
          ? "Rekaman Voice Note terkirim • Menunggu koreksi Musyrif/Musyrifah"
          : "Pengajuan setoran tatap muka • Sudah disimak rekan sebaya";

      const predikat =
        method === "mandiri"
          ? "Log Tikrar Mandiri"
          : method === "voice_note"
          ? "Voice Note Terkirim"
          : "Menunggu Simak Musyrif";

      const { rows: inserted } = await query(
        `INSERT INTO public.jht_ziyadah_logs (
           user_id, user_name, gender, halaqah_name, juz, page_number,
           surah_ayah, tikrar_count, submission_method, peer_simak_by,
           musyrif_name, predikat, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          activeUserId,
          profile.full_name,
          profile.gender,
          profile.halaqah_name,
          juzNum,
          pageNum,
          surahAyah,
          tikrarCount,
          method,
          peerPartner,
          profile.musyrif_name,
          predikat,
          notes,
        ]
      );

      // Advance page if submitted to Musyrif or Voice Note
      const nextPage =
        method === "tatap_muka" || method === "voice_note"
          ? Math.min(604, pageNum + 1)
          : pageNum;

      const { rows: updatedProfile } = await query(
        `UPDATE public.jht_profiles
         SET current_ziyadah_page = $1,
             current_tikrar_count = CASE WHEN $2 IN ('tatap_muka', 'voice_note') THEN 0 ELSE current_tikrar_count END,
             streak_days = streak_days + 1,
             updated_at = NOW()
         WHERE user_id = $3
         RETURNING *`,
        [nextPage, method, activeUserId]
      );

      return NextResponse.json({
        data: { log: inserted[0], profile: updatedProfile[0] },
        error: null,
      });
    }

    // 4. Catat Sesi Muraja'ah (Qarib / Ba'id / Klik Juz di Peta Kesehatan 30 Juz)
    if (action === "complete_murajaah") {
      const juzNum = Math.max(1, Math.min(30, Number(body.juz) || 5));
      const tipe = body.tipe === "qarib" ? "qarib" : "baid";
      const targetRange =
        (typeof body.target_range === "string" && body.target_range.trim()) ||
        `Juz ${juzNum} • Muraja'ah Terjadwal`;
      const catatan =
        (typeof body.catatan === "string" && body.catatan.trim()) ||
        "Lancar • Diselesaikan tepat waktu";

      const { rows: mRows } = await query(
        `INSERT INTO public.jht_murajaah_logs (
           user_id, user_name, tipe, juz, target_range, status, catatan
         )
         VALUES ($1, $2, $3, $4, $5, 'selesai', $6)
         RETURNING *`,
        [activeUserId, profile.full_name, tipe, juzNum, targetRange, catatan]
      );

      await query(
        `INSERT INTO public.jht_juz_health (user_id, juz, status, last_murajaah_at, putaran_count)
         VALUES ($1, $2, 'mutqin', NOW(), 1)
         ON CONFLICT (user_id, juz)
         DO UPDATE SET
           status = 'mutqin',
           last_murajaah_at = NOW(),
           putaran_count = public.jht_juz_health.putaran_count + 1`,
        [activeUserId, juzNum]
      );

      const { rows: updatedHealth } = await query(
        `SELECT * FROM public.jht_juz_health WHERE user_id = $1 ORDER BY juz ASC`,
        [activeUserId]
      );

      return NextResponse.json({
        data: { murajaahLog: mRows[0], juzHealth: updatedHealth },
        error: null,
      });
    }

    // 5. Update Target & Pendaftaran Ujian Tasmi'
    if (action === "update_tasmi_target") {
      const category = body.tasmi_target_category || profile.tasmi_target_category;
      const range = body.tasmi_target_range || profile.tasmi_target_range;
      const registered =
        typeof body.tasmi_registered === "boolean"
          ? body.tasmi_registered
          : profile.tasmi_registered;

      const { rows } = await query(
        `UPDATE public.jht_profiles
         SET tasmi_target_category = $1,
             tasmi_target_range = $2,
             tasmi_registered = $3,
             tasmi_readiness_pct = CASE WHEN $3 = TRUE THEN GREATEST(tasmi_readiness_pct, 92) ELSE tasmi_readiness_pct END,
             updated_at = NOW()
         WHERE user_id = $4
         RETURNING *`,
        [category, range, registered, activeUserId]
      );
      return NextResponse.json({ data: { profile: rows[0] }, error: null });
    }

    // 6. Buat Postingan Cari Partner Simak Baru
    if (action === "create_partner_post") {
      const loc =
        (typeof body.campus_location === "string" && body.campus_location.trim()) ||
        "Musholla Kampus Tazkia";
      const slot =
        (typeof body.free_time_slot === "string" && body.free_time_slot.trim()) ||
        "Hari ini, 12.30 – 13.30 WIB";
      const target =
        (typeof body.target_simak === "string" && body.target_simak.trim()) ||
        "Muraja'ah 1/2 Juz";
      const genderCat =
        body.gender_category ||
        (profile.status_keanggotaan === "alumni"
          ? "alumni"
          : profile.gender === "thalib"
          ? "thullab"
          : "thalibat");

      const metaInfo = `${
        profile.gender === "thalib" ? "Thalib" : "Thalibah"
      } • ${profile.prodi} '${String(profile.angkatan).slice(-2)} • ${
        profile.total_juz_hafal
      } Juz`;

      const { rows } = await query(
        `INSERT INTO public.jht_partner_posts (
           user_id, user_name, gender_category, meta_info, campus_location, free_time_slot, target_simak
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [activeUserId, profile.full_name, genderCat, metaInfo, loc, slot, target]
      );
      return NextResponse.json({ data: { post: rows[0] }, error: null });
    }

    // 7. Aksi Admin BPH (Tambah Anggota Oprec, Rolling Semester, Graduasi Massal ke Alumni, Verifikasi Setoran)
    if (action === "admin_add_member") {
      const fullName =
        (typeof body.full_name === "string" && body.full_name.trim()) ||
        "Thalib/Thalibah Baru";
      const gender = body.gender === "thalib" ? "thalib" : "thalibah";
      const prodi = body.prodi || "Ekonomi Syariah";
      const angkatan = Number(body.angkatan) || 2026;
      const juzHafal = Math.max(1, Math.min(30, Number(body.total_juz_hafal) || 3));
      const halaqahName =
        gender === "thalib"
          ? "Halaqah Thullab Al-Birr"
          : "Halaqah Thalibat Al-Fath";
      const musyrifName =
        gender === "thalib" ? "Ustadz Hamzah, Lc." : "Ustadzah Nabila, Lc.";
      const newId = `jht-${Date.now()}`;

      await query(
        `INSERT INTO public.jht_profiles (
           user_id, full_name, gender, prodi, angkatan, status_keanggotaan,
           halaqah_name, musyrif_name, total_juz_hafal, streak_days
         )
         VALUES ($1, $2, $3, $4, $5, 'aktif', $6, $7, $8, 1)`,
        [newId, fullName, gender, prodi, angkatan, halaqahName, musyrifName, juzHafal]
      );

      const { rows: members } = await query(
        `SELECT * FROM public.jht_profiles ORDER BY status_keanggotaan ASC, total_juz_hafal DESC LIMIT 50`
      );
      return NextResponse.json({ data: { halaqahMembers: members }, error: null });
    }

    if (action === "admin_graduate_batch") {
      const targetAngkatan = Number(body.angkatan) || 2022;
      await query(
        `UPDATE public.jht_profiles
         SET status_keanggotaan = 'alumni',
             halaqah_name = 'Komunitas Huffazh Alumni Tazkia',
             updated_at = NOW()
         WHERE angkatan <= $1`,
        [targetAngkatan]
      );
      const { rows: members } = await query(
        `SELECT * FROM public.jht_profiles ORDER BY status_keanggotaan ASC, total_juz_hafal DESC LIMIT 50`
      );
      return NextResponse.json({ data: { halaqahMembers: members }, error: null });
    }

    if (action === "admin_verify_ziyadah") {
      const logId = Number(body.log_id);
      const predikat = body.predikat || "Mumtaz (Lulus)";
      await query(
        `UPDATE public.jht_ziyadah_logs
         SET predikat = $1
         WHERE id = $2`,
        [predikat, logId]
      );
      const { rows: ziyadahLogs } = await query(
        `SELECT * FROM public.jht_ziyadah_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15`,
        [activeUserId]
      );
      return NextResponse.json({ data: { ziyadahLogs }, error: null });
    }

    return NextResponse.json(
      { error: { message: "Aksi tidak dikenali." } },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[JHT_POST_ERROR]:", err);
    return NextResponse.json(
      { error: { message: err?.message || "Gagal memproses aksi JHT." } },
      { status: 500 }
    );
  }
}
