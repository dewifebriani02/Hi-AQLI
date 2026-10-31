import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { isProgramFree, programKeyFromType } from '@/lib/program-settings';
import { isValidWhatsapp, normalizeWhatsapp } from '@/lib/whatsapp';

const MUFRADAT_GROUP_CAPACITY = 50;

function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

/**
 * Join a FREE program: records the registration as verified and activates access
 * immediately (the same profile changes an admin approval makes, minus billing).
 * Paid programs are rejected here and must go through the payment flow.
 */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx.userId) return fail('Silakan login terlebih dahulu.', 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('Body tidak valid.', 400);
  }

  const halaqahId = typeof body.halaqah_id === 'string' ? body.halaqah_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(halaqahId)) return fail('Program tidak valid.', 400);

  const userName = typeof body.user_name === 'string' ? body.user_name.trim().slice(0, 120) : '';
  const rawWhatsapp = typeof body.whatsapp === 'string' ? body.whatsapp : '';
  if (!userName) return fail('Nama wajib diisi.', 400);
  if (!isValidWhatsapp(rawWhatsapp)) return fail('Nomor WhatsApp tidak valid.', 400);
  const whatsapp = normalizeWhatsapp(rawWhatsapp);

  const level = Number.isInteger(body.level) && body.level >= 1 && body.level <= 3 ? body.level : null;
  const targetJuz = Number.isInteger(body.target_juz) && body.target_juz >= 1 && body.target_juz <= 30 ? body.target_juz : null;

  // Only known, short metadata fields from the client are stored.
  const rawMeta = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
  const metadata: Record<string, string | boolean> = { akadAccepted: rawMeta.akadAccepted === true };
  for (const key of ['schedule', 'target', 'level'] as const) {
    if (typeof rawMeta[key] === 'string' && rawMeta[key].length <= 40) metadata[key] = rawMeta[key];
  }

  const client = await pool.connect();
  try {
    const { rows: halaqahRows } = await client.query(
      `SELECT id, title, program_type, quota FROM public.halaqahs WHERE id = $1 LIMIT 1`,
      [halaqahId]
    );
    const halaqah = halaqahRows[0];
    if (!halaqah) return fail('Program tidak ditemukan.', 404);

    const programKey = programKeyFromType(halaqah.program_type);
    if (!isProgramFree(programKey)) {
      return fail('Program ini berbayar. Silakan gunakan alur pembayaran.', 409);
    }

    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      `SELECT id, email, followed_halaqahs, mufradat_group_id, is_tikrar_paid, is_blacklisted
         FROM public.users WHERE id = $1 FOR UPDATE`,
      [ctx.userId]
    );
    const user = userRows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return fail('Akun tidak ditemukan.', 404);
    }
    if (user.is_blacklisted) {
      await client.query('ROLLBACK');
      return fail('Akun ini tidak dapat mendaftar program. Silakan hubungi admin.', 403);
    }

    // Idempotent: reuse an existing active registration for this program.
    const { rows: existingRows } = await client.query(
      `SELECT id FROM public.halaqah_registrations
        WHERE user_id = $1 AND halaqah_id = $2 AND status IN ('verified', 'active')
        LIMIT 1`,
      [ctx.userId, halaqahId]
    );

    let registrationId: string = existingRows[0]?.id;
    if (!registrationId) {
      // A pending registration from the old paid flow is promoted instead of duplicated.
      const { rows: pendingRows } = await client.query(
        // Payment fields are kept untouched so a transfer made in the old paid flow stays
        // traceable (reconciliation, refunds, income reports). Monthly/leave rows are never promoted.
        `UPDATE public.halaqah_registrations
            SET status = 'verified', verified_at = now(), start_date = now(), updated_at = now(),
                metadata = COALESCE(metadata, '{}'::jsonb) || '{"promoted_free": true}'::jsonb
          WHERE id = (
            SELECT id FROM public.halaqah_registrations
             WHERE user_id = $1 AND halaqah_id = $2 AND status = 'pending_verification'
               AND (payment_type IS NULL OR payment_type = 'initial')
             ORDER BY created_at DESC LIMIT 1
          )
          RETURNING id`,
        [ctx.userId, halaqahId]
      );
      registrationId = pendingRows[0]?.id;
    }

    if (!registrationId && (programKey === 'ngaji' || programKey === 'halaqah') && Number(halaqah.quota) > 0) {
      // Lock the class row so concurrent joins cannot overfill it.
      await client.query(`SELECT id FROM public.halaqahs WHERE id = $1 FOR UPDATE`, [halaqahId]);
      const { rows: countRows } = await client.query(
        `SELECT count(*)::int AS n FROM public.halaqah_registrations
          WHERE halaqah_id = $1 AND status IN ('verified', 'active', 'pending_verification')`,
        [halaqahId]
      );
      if ((countRows[0]?.n || 0) >= Number(halaqah.quota)) {
        await client.query('ROLLBACK');
        return fail('Kuota kelas ini sudah penuh.', 409);
      }
    }

    if (!registrationId) {
      registrationId = crypto.randomUUID();
      await client.query(
        `INSERT INTO public.halaqah_registrations (
           id, user_id, user_name, user_email, whatsapp, halaqah_id, halaqah_title,
           is_paid, level, target_juz, amount, payment_method, status,
           registration_fee, referral_discount_amount, unique_code, metadata,
           verified_at, start_date, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           false, $8, $9, 0, 'free', 'verified',
           0, 0, 0, $10,
           now(), now(), now(), now()
         )`,
        [
          registrationId, ctx.userId, userName, user.email, whatsapp, halaqahId, halaqah.title,
          level, targetJuz, JSON.stringify({ ...metadata, free_program: true }),
        ]
      );
    }

    // Profile access, mirroring admin approval (admin/registrations).
    const followed: string[] = Array.isArray(user.followed_halaqahs) ? user.followed_halaqahs : [];
    const sets: string[] = ['followed_halaqahs = $2', 'whatsapp = $3', 'updated_at = now()'];
    const values: any[] = [
      ctx.userId,
      JSON.stringify(followed.includes(halaqahId) ? followed : [...followed, halaqahId]),
      whatsapp,
    ];
    const push = (sql: string, value: any) => {
      values.push(value);
      sets.push(sql.replace('?', `$${values.length}`));
    };

    if (programKey === 'mufradat') {
      if (!user.mufradat_group_id) {
        const { rows: groupRows } = await client.query(
          `SELECT id FROM public.mufradat_groups
            WHERE COALESCE(member_count, 0) < $1
            ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [MUFRADAT_GROUP_CAPACITY]
        );
        let groupId = groupRows[0]?.id;
        if (groupId) {
          await client.query(
            `UPDATE public.mufradat_groups SET member_count = COALESCE(member_count, 0) + 1 WHERE id = $1`,
            [groupId]
          );
        } else {
          const { rows: countRows } = await client.query(`SELECT count(*)::int AS n FROM public.mufradat_groups`);
          groupId = crypto.randomUUID();
          await client.query(
            `INSERT INTO public.mufradat_groups (id, name, member_count, created_at) VALUES ($1, $2, 1, now())`,
            [groupId, `Grup ${(countRows[0]?.n || 0) + 1}`]
          );
        }
        push('mufradat_group_id = ?', groupId);
      }
      push('mufradat_status = ?', 'active');
      if (typeof metadata.schedule === 'string') push('mufradat_schedule = ?', metadata.schedule);
    }

    if (programKey === 'tikrar') {
      push('is_tikrar_paid = ?', true);
      // Legacy schema uses "paidJuz"; a consistency migration added paid_juz. Write whichever exist.
      const { rows: juzCols } = await client.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name IN ('paid_juz', 'paidJuz')`
      );
      for (const { column_name } of juzCols) {
        push(`${column_name === 'paidJuz' ? '"paidJuz"' : 'paid_juz'} = ?`, targetJuz || 30);
      }
      push('tikrar_level = ?', level || 3);
      if (!user.is_tikrar_paid) sets.push('tikrar_start_date = now()');
    }

    await client.query(`UPDATE public.users SET ${sets.join(', ')} WHERE id = $1`, values);
    await client.query('COMMIT');

    return NextResponse.json({ data: { registration_id: registrationId, program: programKey }, error: null });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[PROGRAM_JOIN_ERROR]', err);
    return fail('Gagal mendaftar program.', 500);
  } finally {
    client.release();
  }
}
