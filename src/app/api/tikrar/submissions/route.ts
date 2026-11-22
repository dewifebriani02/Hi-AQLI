import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import { QURAN_CHAPTERS } from '@/lib/quran-data';
import { SURAH_START_PAGES } from '@/lib/quran-mapping';
import { getJuzForPage, toDateKeyWIB } from '@/lib/tikrar-schedule-generator';
import { countCompletedSteps, MEMORIZED_STEP_COUNT } from '@/lib/tikrar-steps';
import { loadActiveTarget, loadClearedPages } from '@/lib/tikrar-server';

const FALLBACK_ADMIN_WA = '628567712914';

function getSurahNameForPage(page: number): string {
  let surahId = 1;
  Object.entries(SURAH_START_PAGES).forEach(([id, start]) => {
    if (Number(start) <= page) surahId = Number(id);
  });
  return QURAN_CHAPTERS.find((c) => c.id === surahId)?.name_simple || "Al-Qur'an";
}

function formatBlocksHuman(range: string): string {
  if (range === 'blok_1_4') return '1 Halaman Penuh (Blok A–D)';
  if (range === 'blok_3_4') return '1/2 Halaman (Blok C & D)';
  return '1/2 Halaman (Blok A & B)';
}

async function fetchPendingQueue(currentUserId: string) {
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.user_name, s.halaqah_id, s.juz, s.page_number,
            s.blocks_range, s.status, s.notes, s.submitted_at, s.created_at,
            h.title AS halaqah_title, h.zoom_link AS halaqah_zoom_link,
            COALESCE(NULLIF(u.full_name, ''), u.username, s.user_name, 'Thalibah') AS display_name
     FROM public.tikrar_submissions s
     LEFT JOIN public.users u ON u.id = s.user_id
     LEFT JOIN public.halaqahs h ON h.id = s.halaqah_id
     WHERE s.status = 'pending'
     ORDER BY s.submitted_at ASC NULLS LAST, s.created_at ASC`
  );

  return rows.map((r, idx) => {
    const pageNumber = Number(r.page_number);
    return {
      id: r.id,
      queueNumber: idx + 1,
      userId: r.user_id,
      isMe: r.user_id === currentUserId,
      name: r.display_name,
      juz: Number(r.juz) || getJuzForPage(pageNumber),
      pageNumber,
      surahName: getSurahNameForPage(pageNumber),
      blocksRange: r.blocks_range || 'blok_1_4',
      halaqahId: r.halaqah_id || null,
      halaqahTitle: r.halaqah_title || null,
      zoomLink: r.halaqah_zoom_link || null,
      notes: r.notes || null,
      submittedAt: new Date(r.submitted_at || r.created_at).toISOString(),
    };
  });
}

async function resolveAdminWaNumbers(): Promise<string[]> {
  const numbers = new Set<string>();
  const envRaw = process.env.ADMIN_WHATSAPP_NUMBER || '';
  for (const part of envRaw.split(',')) {
    const norm = normalizePhoneNumber(part.trim());
    if (norm) numbers.add(norm);
  }

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(u.whatsapp), ''), NULLIF(TRIM(u.phone), '')) AS phone
       FROM public.users u
       WHERE u.id IN (
         SELECT id FROM public.roles_admin
         UNION
         SELECT id FROM public.roles_superadmin
       )`
    );
    for (const r of rows) {
      const norm = normalizePhoneNumber(r.phone || '');
      if (norm) numbers.add(norm);
    }
  } catch (err) {
    console.warn('[TIKRAR_SUBMISSIONS] Failed to resolve admin WA numbers:', err);
  }

  if (numbers.size === 0) {
    numbers.add(FALLBACK_ADMIN_WA);
  }
  return Array.from(numbers);
}

/** GET: antrean setoran tasmi' yang sedang menunggu simak + riwayat milik thalibah */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }

    const [queue, { rows: myRows }] = await Promise.all([
      fetchPendingQueue(ctx.userId),
      pool.query(
        `SELECT s.*
         FROM public.tikrar_submissions s
         WHERE s.user_id = $1
         ORDER BY COALESCE(s.submitted_at, s.created_at) DESC`,
        [ctx.userId]
      ),
    ]);

    return NextResponse.json({
      data: {
        queue,
        mySubmissions: myRows,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[TIKRAR_SUBMISSIONS_GET_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memuat antrean tasmi\'.' } },
      { status: 500 }
    );
  }
}

/** POST: daftarkan halaman tuntas ke antrean setoran tasmi' + kirim notifikasi WA otomatis ke Admin HI AQLI */
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pageNumber = Math.floor(Number(body.page_number) || 0);
    if (pageNumber < 1 || pageNumber > 604) {
      return NextResponse.json(
        { error: { message: 'Nomor halaman tidak valid (1–604).' } },
        { status: 400 }
      );
    }
    const allowedRanges = new Set(['blok_1_2', 'blok_3_4', 'blok_1_4']);
    const blocksRange = allowedRanges.has(body.blocks_range) ? body.blocks_range : 'blok_1_4';
    const customNotes =
      typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

    await client.query('BEGIN');

    const [
      { rows: userRows },
      target,
      { cleared },
      { rows: progRows },
      { rows: priorRows },
      { rows: quizRows },
    ] = await Promise.all([
      client.query(
        `SELECT id, full_name, username, email, whatsapp, phone, tikrar_halaqah_id
         FROM public.users WHERE id = $1 LIMIT 1`,
        [ctx.userId]
      ),
      loadActiveTarget(client, ctx.userId),
      loadClearedPages(client, ctx.userId),
      client.query(
        `SELECT prep_listen_count, prep_translation_done, blocks, meta_counts
         FROM public.tikrar_user_progress
         WHERE user_id = $1 AND page_number = $2
         LIMIT 1`,
        [ctx.userId, pageNumber]
      ),
      client.query(
        `SELECT status FROM public.tikrar_prior_hafalan
         WHERE user_id = $1 AND page_number = $2
         LIMIT 1`,
        [ctx.userId, pageNumber]
      ),
      client.query(
        `SELECT score, passed, correct_answers, total_questions
         FROM public.tikrar_page_quizzes
         WHERE user_id = $1 AND page_number = $2
           AND COALESCE(question_types->>'source', '') <> 'prior_hafalan'
         ORDER BY created_at DESC LIMIT 1`,
        [ctx.userId, pageNumber]
      ),
    ]);

    const learner = userRows[0];
    if (!learner) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: { message: 'Pengguna tidak ditemukan.' } }, { status: 404 });
    }

    const isPriorPage = priorRows.length > 0;
    const isMemorizedInApp =
      progRows[0] && countCompletedSteps(progRows[0], false) >= MEMORIZED_STEP_COUNT;
    const isCleared = cleared.has(pageNumber);

    if (!isCleared && !isPriorPage && !isMemorizedInApp) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          error: {
            message:
              "Selesaikan repetisi gabungan seluruh halaman (A–D) terlebih dahulu sebelum mengajukan setoran tasmi'.",
            code: 'STEPS_INCOMPLETE',
          },
        },
        { status: 403 }
      );
    }

    const halaqahId = learner.tikrar_halaqah_id || target?.halaqahId || null;
    let halaqahTitle: string | null = null;
    let zoomUrl: string | null = null;
    let musyrifahName: string | null = null;
    if (halaqahId) {
      const { rows: hRows } = await client.query(
        `SELECT title, zoom_link, musyrifah FROM public.halaqahs WHERE id = $1 LIMIT 1`,
        [halaqahId]
      );
      halaqahTitle = hRows[0]?.title || null;
      zoomUrl = hRows[0]?.zoom_link || null;
      musyrifahName = hRows[0]?.musyrifah || null;
    }

    const learnerName = learner.full_name || learner.username || 'Thalibah HI AQLI';
    const juz = getJuzForPage(pageNumber);
    const todayKey = toDateKeyWIB();
    const defaultNote = isPriorPage
      ? 'Hafalan sebelum bergabung / di luar aplikasi'
      : 'Tuntas repetisi Tikrar di aplikasi';

    const { rows: existingSub } = await client.query(
      `SELECT * FROM public.tikrar_submissions
       WHERE user_id = $1 AND page_number = $2 AND blocks_range = $3
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [ctx.userId, pageNumber, blocksRange]
    );

    let submission = existingSub[0] || null;
    let alreadyQueued = false;
    let alreadyPassed = false;

    if (submission?.status === 'passed') {
      alreadyPassed = true;
      await client.query('COMMIT');
    } else if (submission?.status === 'pending') {
      alreadyQueued = true;
      await client.query('COMMIT');
    } else if (submission) {
      const { rows: updatedRows } = await client.query(
        `UPDATE public.tikrar_submissions
         SET status = 'pending',
             halaqah_id = COALESCE(halaqah_id, $1),
             musyrifah_name = COALESCE(musyrifah_name, $2),
             zoom_meeting_url = COALESCE(zoom_meeting_url, $3),
             session_date = $4::date,
             notes = COALESCE($5, notes),
             submitted_at = now(),
             updated_at = now()
         WHERE id = $6
         RETURNING *`,
        [halaqahId, musyrifahName, zoomUrl, todayKey, customNotes, submission.id]
      );
      submission = updatedRows[0];
      await client.query('COMMIT');
    } else {
      const { rows: insertedRows } = await client.query(
        `INSERT INTO public.tikrar_submissions (
           user_id, user_name, halaqah_id, musyrifah_id, musyrifah_name, juz, page_number,
           blocks_range, session_date, zoom_meeting_url, status, notes, submitted_at
         )
         VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8::date, $9, 'pending', $10, now())
         RETURNING *`,
        [
          ctx.userId,
          learnerName,
          halaqahId,
          musyrifahName,
          juz,
          pageNumber,
          blocksRange,
          todayKey,
          zoomUrl,
          customNotes || defaultNote,
        ]
      );
      submission = insertedRows[0];
      await client.query('COMMIT');
    }

    const queue = await fetchPendingQueue(ctx.userId);
    const queueEntry = queue.find((q) => q.id === submission?.id);
    const queuePosition = queueEntry?.queueNumber || null;
    const totalPending = queue.length;

    const surahName = getSurahNameForPage(pageNumber);
    const latestQuiz = quizRows[0];
    const quizInfoText = latestQuiz
      ? latestQuiz.passed
        ? `Lulus (${latestQuiz.score}% • ${latestQuiz.correct_answers}/${latestQuiz.total_questions})`
        : `Belum lulus (terakhir ${latestQuiz.score}% • ${latestQuiz.correct_answers}/${latestQuiz.total_questions})`
      : 'Belum ujian pilihan ganda';

    const learnerPhone = normalizePhoneNumber(learner.whatsapp || learner.phone || '');
    const learnerContact = learnerPhone ? `+${learnerPhone}` : learner.email || '-';

    const waAdminMessage =
      `Assalamu'alaikum Admin HI AQLI 🌸\n\n` +
      `Ada permohonan *Setoran Tasmi'* baru masuk antrean:\n` +
      `👤 *Thalibah:* ${learnerName} (${learnerContact})\n` +
      `📖 *Halaman:* Juz ${juz} • Halaman ${pageNumber} (QS. ${surahName})\n` +
      `📦 *Cakupan:* ${formatBlocksHuman(blocksRange)}\n` +
      `🏷️ *Sumber Hafalan:* ${isPriorPage ? 'Hafalan Sebelum Bergabung' : 'Tikrar di Aplikasi'}\n` +
      `📝 *Ujian PG 30 Soal:* ${quizInfoText}\n` +
      (queuePosition ? `🕐 *Nomor Antrean:* #${queuePosition} (Total ${totalPending} menunggu)\n` : '') +
      (halaqahTitle ? `🏫 *Sesi Halaqah:* ${halaqahTitle}\n` : '') +
      (customNotes ? `💬 *Catatan:* ${customNotes}\n` : '') +
      `\nSimak & nilai antrean di Portal Admin:\n🔗 https://hiaqli.pro/admin/tikrar`;

    const fallbackWaText = `Assalamu'alaikum Admin HI AQLI, saya ${learnerName} mengajukan Setoran Tasmi' Halaman ${pageNumber} (Juz ${juz} • QS. ${surahName}). Mohon jadwal setoran. Syukron.`;
    const adminWaUrl = `https://wa.me/${FALLBACK_ADMIN_WA}?text=${encodeURIComponent(fallbackWaText)}`;

    let whatsappSent = false;
    let whatsappError: string | null = null;

    if (!alreadyQueued && !alreadyPassed) {
      const adminNumbers = await resolveAdminWaNumbers();
      const sendResults = await Promise.all(
        adminNumbers.map(async (phone) => {
          const sendRes = await whatsappService.sendTextMessage(phone, waAdminMessage);
          try {
            await pool.query(
              `INSERT INTO public.whatsapp_logs (id, user_id, recipient, message, status, type, metadata, created_at)
               VALUES ($1, $2, $3, $4, $5, 'tikrar_tasmi_request', $6, now())`,
              [
                crypto.randomUUID(),
                ctx.userId,
                phone,
                waAdminMessage,
                sendRes.success ? 'sent' : 'failed',
                JSON.stringify({
                  submissionId: submission?.id,
                  pageNumber,
                  juz,
                  queuePosition,
                  provider: sendRes.provider,
                  messageId: sendRes.messageId,
                  error: sendRes.error || null,
                }),
              ]
            );
          } catch (logErr) {
            console.warn('[TIKRAR_SUBMISSIONS_WA_LOG_WARN]:', logErr);
          }
          return sendRes;
        })
      );

      whatsappSent = sendResults.some((r) => r.success);
      if (!whatsappSent) {
        whatsappError = sendResults.find((r) => r.error)?.error || 'Gateway WhatsApp tidak aktif';
      }
    }

    return NextResponse.json({
      data: {
        submission,
        alreadyQueued,
        alreadyPassed,
        queuePosition,
        totalPending,
        queue,
        whatsappSent,
        whatsappError,
        adminWaUrl,
      },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[TIKRAR_SUBMISSIONS_POST_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || "Gagal mendaftarkan antrean tasmi'." } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
