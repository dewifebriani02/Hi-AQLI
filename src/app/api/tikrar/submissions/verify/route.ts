import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { isFullAdmin, isStaff } from '@/lib/db-policy';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';
import {
  getJuzForPage,
  getJuzPageRange,
  isPageSubmissionCleared,
  TIKRAR_GRADE_LABELS,
} from '@/lib/tikrar-schedule-generator';

const NO_REPLY_FOOTER =
  '\n\n━━━━━━━━━━━━━━━━━━━━\n📌 _Pesan ini dikirim secara otomatis oleh sistem HI AQLI. Mohon untuk tidak membalas pesan ini._';

function calcPageSetoranPoints(passedRanges: Set<string>): number {
  if (passedRanges.has('blok_1_4')) return 250;
  let total = 0;
  if (passedRanges.has('blok_1_2')) total += 100;
  if (passedRanges.has('blok_3_4')) total += 100;
  return total;
}

function formatRangeHuman(range: string): string {
  if (range === 'blok_1_4') return '1 Halaman Penuh (Blok A–D)';
  if (range === 'blok_3_4') return '1/2 Halaman Kedua (Blok C & D)';
  return '1/2 Halaman Pertama (Blok A & B)';
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json(
        { error: { message: 'Silakan login terlebih dahulu.' } },
        { status: 401 }
      );
    }
    if (!isStaff(ctx)) {
      return NextResponse.json(
        { error: { message: 'Hanya Musyrifah atau Administrator yang dapat memverifikasi setoran.' } },
        { status: 403 }
      );
    }

    // If Musyrifah (and not full admin), ensure assigned_programs includes hi_tikrar when configured
    if (!isFullAdmin(ctx)) {
      const { rows: mRows } = await client.query(
        `SELECT to_jsonb(rm) AS rm_json FROM public.roles_musyrifah rm WHERE rm.id = $1 LIMIT 1`,
        [ctx.userId]
      );
      const rmJson = mRows[0]?.rm_json || {};
      if ('assigned_programs' in rmJson) {
        const assigned: string[] = Array.isArray(rmJson.assigned_programs)
          ? rmJson.assigned_programs
          : [];
        if (!assigned.includes('hi_tikrar')) {
          return NextResponse.json(
            { error: { message: 'Akun Musyrifah Anda belum ditugaskan pada program HI Tikrar.' } },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const submissionId = typeof body.submission_id === 'string' ? body.submission_id.trim() : '';
    const allowedGrades = new Set(['mumtaz', 'jayyid_jiddan', 'perlu_perbaikan']);
    const grade = typeof body.grade === 'string' ? body.grade.trim() : '';
    const feedback =
      typeof body.feedback === 'string' && body.feedback.trim()
        ? body.feedback.trim().slice(0, 1000)
        : null;
    const sendWhatsapp = Boolean(body.send_whatsapp);

    if (!submissionId || !allowedGrades.has(grade)) {
      return NextResponse.json(
        {
          error: {
            message:
              'ID pengajuan dan predikat penilaian (mumtaz / jayyid_jiddan / perlu_perbaikan) wajib diisi.',
          },
        },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Lock target submission row
    const { rows: subRows } = await client.query(
      `SELECT * FROM public.tikrar_submissions WHERE id = $1 FOR UPDATE`,
      [submissionId]
    );
    const sub = subRows[0];
    if (!sub) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: { message: 'Data antrean setoran tidak ditemukan.' } },
        { status: 404 }
      );
    }

    // Fetch verifier staff name
    const { rows: staffRows } = await client.query(
      `SELECT full_name, username FROM public.users WHERE id = $1 LIMIT 1`,
      [ctx.userId]
    );
    const musyrifahName =
      staffRows[0]?.full_name || staffRows[0]?.username || sub.musyrifah_name || 'Musyrifah HI AQLI';

    // Lock learner row
    const { rows: learnerRows } = await client.query(
      `SELECT id, full_name, username, salutation, whatsapp, phone,
              "paidJuz", tikrar_current_page, tikrar_current_block, points
       FROM public.users
       WHERE id = $1
       FOR UPDATE`,
      [sub.user_id]
    );
    const learner = learnerRows[0];
    if (!learner) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: { message: 'Data peserta tidak ditemukan.' } },
        { status: 404 }
      );
    }

    const pageNumber = Number(sub.page_number);
    const juz = Number(sub.juz) || getJuzForPage(pageNumber);
    const { endPage } = getJuzPageRange(juz);

    // Fetch all submissions on this page BEFORE updating for idempotent point delta calculation
    const { rows: pageSubsBefore } = await client.query(
      `SELECT id, page_number, blocks_range, status
       FROM public.tikrar_submissions
       WHERE user_id = $1 AND page_number = $2`,
      [sub.user_id, pageNumber]
    );
    const beforePassedRanges = new Set<string>(
      pageSubsBefore.filter((r) => r.status === 'passed').map((r) => r.blocks_range || 'blok_1_2')
    );

    const nextStatus = grade === 'perlu_perbaikan' ? 'needs_revision' : 'passed';

    const { rows: updatedSubRows } = await client.query(
      `UPDATE public.tikrar_submissions
       SET status = $1,
           grade = $2,
           feedback = $3,
           musyrifah_id = $4,
           musyrifah_name = $5,
           verified_at = now(),
           updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [nextStatus, grade, feedback, ctx.userId, musyrifahName, submissionId]
    );

    const afterSubs = pageSubsBefore.map((r) =>
      r.id === submissionId ? { ...r, status: nextStatus } : r
    );
    const afterPassedRanges = new Set<string>(
      afterSubs.filter((r) => r.status === 'passed').map((r) => r.blocks_range || 'blok_1_2')
    );

    const pointsAwarded = Math.max(
      0,
      calcPageSetoranPoints(afterPassedRanges) - calcPageSetoranPoints(beforePassedRanges)
    );

    // Check if full page is now cleared -> unlock next page & sync page_exams
    const { rows: examRows } = await client.query(
      `SELECT id, page_number, passed FROM public.page_exams
       WHERE user_id = $1 AND page_number = $2 LIMIT 1`,
      [sub.user_id, pageNumber]
    );
    const existingPassedExamSet = new Set<number>(
      examRows.filter((e) => e.passed).map((e) => Number(e.page_number))
    );
    const pageCleared = isPageSubmissionCleared(pageNumber, afterSubs, existingPassedExamSet);

    let nextUnlockedPage = Number(learner.tikrar_current_page) || pageNumber;
    let nextBlock = Number(learner.tikrar_current_block) || 1;

    if (pageCleared) {
      const scoreVal = grade === 'mumtaz' ? 98 : 90;
      if (examRows.length > 0) {
        await client.query(
          `UPDATE public.page_exams SET passed = true, score = GREATEST(COALESCE(score, 0), $1) WHERE id = $2`,
          [scoreVal, examRows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO public.page_exams (user_id, page_number, score, passed, created_at)
           VALUES ($1, $2, $3, true, now())`,
          [sub.user_id, pageNumber, scoreVal]
        );
      }

      if (pageNumber < endPage && nextUnlockedPage <= pageNumber) {
        nextUnlockedPage = pageNumber + 1;
        nextBlock = 1;
      }
    } else if (nextStatus === 'passed' && sub.blocks_range === 'blok_1_2' && nextUnlockedPage === pageNumber) {
      nextBlock = Math.max(nextBlock, 3);
    }

    await client.query(
      `UPDATE public.users
       SET points = COALESCE(points, 0) + $1,
           tikrar_current_page = $2,
           tikrar_current_block = $3,
           updated_at = now()
       WHERE id = $4`,
      [pointsAwarded, nextUnlockedPage, nextBlock, sub.user_id]
    );

    await client.query('COMMIT');

    // Optional WhatsApp notification outside DB transaction
    let waSent = false;
    if (sendWhatsapp) {
      const phone = normalizePhoneNumber(learner.whatsapp || learner.phone || '');
      if (phone) {
        const salutation = learner.salutation || 'Ukhti';
        const learnerName = learner.full_name || learner.username || 'Thalibah';
        const isAkhi = salutation.trim().toLowerCase() === 'akhi';
        const doaBarakah = isAkhi ? 'Barakallahu fika' : 'Barakallahu fiki';
        const gradeLabel = TIKRAR_GRADE_LABELS[grade] || grade;
        const rangeHuman = formatRangeHuman(sub.blocks_range);

        let waMsg = '';
        if (nextStatus === 'passed') {
          waMsg =
            `Assalamu'alaikum warahmatullah wabarakatuh, ${salutation} ${learnerName} 🌸\n\n` +
            `Alhamdulillah, ${doaBarakah}! Setoran Tasmi' Live Zoom *Halaman ${pageNumber} (${rangeHuman})* telah selesai disimak dan disetujui oleh *${musyrifahName}* dengan predikat *${gradeLabel}*` +
            (pointsAwarded > 0 ? ` (+${pointsAwarded} Poin)` : '') +
            `.\n\n` +
            (pageCleared && pageNumber < endPage
              ? `🔓 Kunci *Halaman ${pageNumber + 1}* kini telah terbuka!`
              : `Silakan lanjutkan repetisi pada blok berikutnya di Halaman ${pageNumber}.`) +
            (feedback ? `\n\n📝 *Catatan Musyrifah:* _"${feedback}"_` : '') +
            `\n\nBuka aplikasi HI Tikrar:\n🔗 https://hiaqli.pro/tikrar` +
            NO_REPLY_FOOTER;
        } else {
          waMsg =
            `Assalamu'alaikum warahmatullah wabarakatuh, ${salutation} ${learnerName} 💐\n\n` +
            `Hasil evaluasi Tasmi' Live Zoom *Halaman ${pageNumber} (${rangeHuman})* bersama *${musyrifahName}*: *${gradeLabel}*.\n\n` +
            (feedback
              ? `📝 *Catatan Evaluasi Musyrifah:* _"${feedback}"_\n\n`
              : `Yuk luangkan waktu untuk memantapkan kembali tajwid & kelancaran hafalan pada bagian ini sebelum mengajukan tasmi' ulang.\n\n`) +
            `Tetap semangat dan istiqamah dalam menjaga kalam Allah! Buka aplikasi HI Tikrar:\n🔗 https://hiaqli.pro/tikrar` +
            NO_REPLY_FOOTER;
        }

        const sendRes = await whatsappService.sendTextMessage(phone, waMsg);
        waSent = sendRes.success;
        try {
          await pool.query(
            `INSERT INTO public.whatsapp_logs (id, user_id, recipient, message, status, type, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, 'tikrar_submission_verified', $6, now())`,
            [
              crypto.randomUUID(),
              learner.id,
              phone,
              waMsg,
              sendRes.success ? 'sent' : 'failed',
              JSON.stringify({
                submissionId,
                pageNumber,
                grade,
                status: nextStatus,
                provider: sendRes.provider,
                messageId: sendRes.messageId,
              }),
            ]
          );
        } catch {}
      }
    }

    return NextResponse.json({
      data: {
        submission: updatedSubRows[0],
        pointsAwarded,
        pageCleared,
        nextUnlockedPage,
        whatsappSent: waSent,
      },
      error: null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[TIKRAR_VERIFY_SUBMISSION_ERROR]:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Gagal memverifikasi setoran tasmi\'.' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
