import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { normalizeWhatsapp, whatsappErrorMessage } from '@/lib/whatsapp';
import {
  calculateMinInfaq,
  calculateRegistrationBreakdown,
  detectProgramFlags,
  isVoucherApplicableToProgram,
  MAX_INFAQ_AMOUNT,
  MAX_PAYMENT_DURATION_MONTHS,
  MUFRADAT_MIN_INFAQ,
  type HalaqahPricingRow,
  type ProgramFlags,
} from '@/lib/pricing';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BILLING_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const QUOTE_HMAC_CONTEXT = 'hiaqli:quote-token:v1';

class ClientError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface QuoteTokenPayload {
  uid: string;
  mode: 'register' | 'monthly_payment';
  hid: string;
  code: number;
  iat: number;
}

function getQuoteHmacKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET belum dikonfigurasi di environment server.');
  }
  return crypto.createHmac('sha256', secret).update(QUOTE_HMAC_CONTEXT).digest();
}

function signQuoteToken(payload: QuoteTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getQuoteHmacKey()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifies a server-issued quote_token and extracts its unique_code (100..999).
 * Intentionally does NOT reject older/expired tokens as long as the HMAC signature,
 * uid, mode, and program (hid) match, so a slow bank transfer (> 2 hours) never gets
 * its unique_code silently replaced on submission.
 */
function verifyQuoteToken(
  token: unknown,
  expectedUid: string,
  expectedMode: 'register' | 'monthly_payment',
  expectedHid: string
): number | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', getQuoteHmacKey()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as QuoteTokenPayload;
    if (
      parsed.uid !== expectedUid ||
      parsed.mode !== expectedMode ||
      parsed.hid !== expectedHid ||
      !Number.isInteger(parsed.code) ||
      parsed.code < 100 ||
      parsed.code > 999 ||
      typeof parsed.iat !== 'number' ||
      !Number.isFinite(parsed.iat)
    ) {
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

type SqlRunner = {
  query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

function makeTxRunner(client: { query: (text: string, values?: any[]) => Promise<any> }): SqlRunner {
  return {
    query: async <T = any>(text: string, params?: any[]) => {
      const res = await client.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount };
    },
  };
}

async function withTransaction<T>(fn: (txRunner: SqlRunner) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let releaseErr: Error | undefined;
  try {
    await client.query('BEGIN');
    const result = await fn(makeTxRunner(client));
    await client.query('COMMIT');
    return result;
  } catch (txErr) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr: any) {
      releaseErr = rbErr instanceof Error ? rbErr : new Error(String(rbErr));
    }
    throw txErr;
  } finally {
    client.release(releaseErr);
  }
}

async function resolveHalaqah(
  dbRunner: SqlRunner,
  halaqahIdRaw: unknown,
  programHintRaw?: unknown
): Promise<HalaqahPricingRow | null> {
  const raw = typeof halaqahIdRaw === 'string' ? halaqahIdRaw.trim() : '';
  const hint = typeof programHintRaw === 'string' ? programHintRaw.trim().toLowerCase() : raw.toLowerCase();

  if (raw && UUID_REGEX.test(raw)) {
    const { rows } = await dbRunner.query<HalaqahPricingRow>(
      `SELECT id, title, program_type, is_premium, base_price, payment_type
       FROM public.halaqahs WHERE id = $1 LIMIT 1`,
      [raw]
    );
    if (rows[0]) return rows[0];
  }

  let targetProgramType: string | null = null;
  if (hint.includes('mufradat')) targetProgramType = 'hi_mufradat';
  else if (hint.includes('tikrar')) targetProgramType = 'tikrar_daily';
  else if (hint.includes('ngaji')) targetProgramType = 'hi_ngaji';
  else if (hint.includes('irab')) targetProgramType = 'hi_irab';

  if (targetProgramType) {
    const { rows } = await dbRunner.query<HalaqahPricingRow>(
      `SELECT id, title, program_type, is_premium, base_price, payment_type
       FROM public.halaqahs WHERE program_type = $1 ORDER BY created_at DESC LIMIT 1`,
      [targetProgramType]
    );
    if (rows[0]) return rows[0];
  }

  return null;
}

async function computeUserRegistrationHistory(
  dbRunner: SqlRunner,
  userId: string,
  halaqahId: string,
  flags: ProgramFlags,
  excludeRegId?: string | null
): Promise<{ isFirstRegistration: boolean; hasUsedReferral: boolean }> {
  const params: any[] = [userId];
  let excludeClause = '';
  if (excludeRegId && UUID_REGEX.test(excludeRegId)) {
    params.push(excludeRegId);
    excludeClause = `AND id <> $2`;
  }

  const { rows } = await dbRunner.query<{
    halaqah_id: string | null;
    halaqah_title: string | null;
    referral_code_used: string | null;
    status: string | null;
  }>(
    `SELECT halaqah_id, halaqah_title, referral_code_used, status
     FROM public.halaqah_registrations
     WHERE user_id = $1 ${excludeClause}`,
    params
  );

  const keyword = flags.isMufradat ? 'mufradat' : flags.isTikrar ? 'tikrar' : null;
  const sameProgramRegs = rows.filter((r) => {
    if (r.halaqah_id === halaqahId) return true;
    if (keyword && String(r.halaqah_title || '').toLowerCase().includes(keyword)) return true;
    return false;
  });

  const hasUsedReferral = rows.some(
    (r) => Boolean(r.referral_code_used && r.referral_code_used.trim()) && r.status !== 'rejected'
  );

  return {
    isFirstRegistration: sameProgramRegs.length === 0,
    hasUsedReferral,
  };
}

async function validateAndFetchVoucher(
  dbRunner: SqlRunner,
  voucherCodeRaw: string,
  userId: string,
  flags: ProgramFlags,
  lockForUpdate: boolean
) {
  const code = voucherCodeRaw.trim().toUpperCase();
  if (!code || code.length > 64) {
    throw new ClientError('Kode voucher tidak valid.');
  }

  const lockSql = lockForUpdate ? 'FOR UPDATE' : '';
  const { rows } = await dbRunner.query<any>(
    `SELECT * FROM public.vouchers WHERE UPPER(code) = $1 LIMIT 1 ${lockSql}`,
    [code]
  );
  const voucher = rows[0];
  if (!voucher || !voucher.is_active) {
    throw new ClientError('Voucher tidak ditemukan atau sudah tidak aktif.');
  }

  if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
    throw new ClientError('Voucher sudah kadaluarsa.');
  }

  if (!isVoucherApplicableToProgram(voucher.program_id, flags)) {
    throw new ClientError(
      `Voucher ini hanya berlaku untuk program ${String(voucher.program_id || '').toUpperCase()}.`
    );
  }

  const { rows: existingRows } = await dbRunner.query(
    `SELECT id FROM public.voucher_redemptions WHERE voucher_id = $1 AND user_id = $2 LIMIT 1`,
    [voucher.id, userId]
  );
  if (existingRows.length > 0) {
    throw new ClientError('Anda sudah pernah menggunakan voucher ini sebelumnya.');
  }

  if (voucher.usage_limit !== null && voucher.usage_limit !== undefined && Number(voucher.usage_limit) > 0) {
    const { rows: countRows } = await dbRunner.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.voucher_redemptions WHERE voucher_id = $1`,
      [voucher.id]
    );
    const usedCount = Number(countRows[0]?.count || 0);
    if (usedCount >= Number(voucher.usage_limit)) {
      throw new ClientError('Kuota penggunaan voucher ini sudah habis.');
    }
  }

  return voucher;
}

async function resolveReferralForUser(
  dbRunner: SqlRunner,
  userId: string,
  referredById: string | null | undefined,
  referralCodeRaw: unknown,
  hasUsedReferral: boolean,
  strictExplicit: boolean
): Promise<{ id: string; referral_code: string; username: string | null } | null> {
  const explicitCode = typeof referralCodeRaw === 'string' ? referralCodeRaw.trim().toUpperCase() : '';

  if (explicitCode) {
    if (hasUsedReferral) {
      if (strictExplicit) {
        throw new ClientError('Potongan referral hanya berlaku untuk pendaftaran pertama kali di Hi AQLI.');
      }
      return null;
    }
    const { rows } = await dbRunner.query<{ id: string; referral_code: string; username: string | null }>(
      `SELECT id, referral_code, username FROM public.users WHERE UPPER(referral_code) = $1 LIMIT 1`,
      [explicitCode]
    );
    const referrer = rows[0];
    if (!referrer) {
      if (strictExplicit) throw new ClientError('Kode Referral tidak valid atau tidak ditemukan.');
      return null;
    }
    if (referrer.id === userId) {
      if (strictExplicit) throw new ClientError('Tidak bisa menggunakan kode referral milik sendiri.');
      return null;
    }
    return referrer;
  }

  if (!hasUsedReferral && referredById && UUID_REGEX.test(referredById) && referredById !== userId) {
    const { rows } = await dbRunner.query<{ id: string; referral_code: string; username: string | null }>(
      `SELECT id, referral_code, username FROM public.users WHERE id = $1 LIMIT 1`,
      [referredById]
    );
    if (rows[0]?.referral_code) return rows[0];
  }

  return null;
}

function ensureJuzOneUnlocked(rawAccessible: unknown): number[] {
  const arr = Array.isArray(rawAccessible)
    ? rawAccessible.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 30)
    : [];
  if (!arr.includes(1)) {
    arr.push(1);
  }
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    const userId = ctx.userId;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid.' }, { status: 400 });
    }

    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    if (!action) {
      return NextResponse.json({ error: 'Action wajib diisi.' }, { status: 400 });
    }

    const runner: SqlRunner = { query };

    // -------------------------------------------------------------------------
    // 1. VALIDATE VOUCHER (read-only preview for UI)
    // -------------------------------------------------------------------------
    if (action === 'validate_voucher') {
      const voucherCode = typeof body.voucher_code === 'string' ? body.voucher_code : '';
      if (!voucherCode.trim()) {
        throw new ClientError('Kode voucher wajib diisi.');
      }
      const halaqah = await resolveHalaqah(runner, body.halaqah_id, body.program_hint || 'hi_mufradat');
      const flags = detectProgramFlags(halaqah, body.program_hint || body.halaqah_id || 'hi_mufradat');
      const voucher = await validateAndFetchVoucher(runner, voucherCode, userId, flags, false);
      return NextResponse.json({
        voucher: {
          id: voucher.id,
          code: voucher.code,
          description: voucher.description || null,
          program_id: voucher.program_id,
          expiry_date: voucher.expiry_date || null,
          type: voucher.type || 'free_access',
        },
      });
    }

    // -------------------------------------------------------------------------
    // 2. VALIDATE REFERRAL (read-only preview for UI)
    // -------------------------------------------------------------------------
    if (action === 'validate_referral') {
      const { rows: userRows } = await query<{ referred_by_id: string | null }>(
        `SELECT referred_by_id FROM public.users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      const halaqah = await resolveHalaqah(runner, body.halaqah_id, body.program_hint);
      const flags = detectProgramFlags(halaqah, body.program_hint || body.halaqah_id);
      const { hasUsedReferral } = await computeUserRegistrationHistory(
        runner,
        userId,
        String(halaqah?.id || ''),
        flags
      );

      const explicit = typeof body.referral_code === 'string' && body.referral_code.trim().length > 0;
      const referrer = await resolveReferralForUser(
        runner,
        userId,
        userRows[0]?.referred_by_id,
        body.referral_code,
        hasUsedReferral,
        explicit
      );

      if (explicit && !referrer) {
        throw new ClientError('Kode Referral tidak valid atau tidak ditemukan.');
      }

      return NextResponse.json({
        referral: referrer
          ? { id: referrer.id, referral_code: referrer.referral_code, username: referrer.username }
          : null,
        has_used_referral: hasUsedReferral,
      });
    }

    // -------------------------------------------------------------------------
    // 3. QUOTE (authoritative server price preview + signed unique_code)
    // -------------------------------------------------------------------------
    if (action === 'quote') {
      const mode: 'register' | 'monthly_payment' =
        body.mode === 'monthly_payment' ? 'monthly_payment' : 'register';

      if (mode === 'monthly_payment') {
        const halaqah = await resolveHalaqah(runner, null, 'hi_mufradat');
        const hid = String(halaqah?.id || 'hi_mufradat');
        const minInfaq = calculateMinInfaq({ halaqah, isMufradat: true, isTikrar: false });
        const rawInfaq = Number(body.infaq_amount ?? body.amount ?? minInfaq);
        const infaqAmount = Number.isFinite(rawInfaq) ? Math.max(minInfaq, Math.floor(rawInfaq)) : minInfaq;
        const reusedCode = verifyQuoteToken(body.quote_token, userId, 'monthly_payment', hid);
        const uniqueCode = reusedCode ?? crypto.randomInt(100, 1000);
        const quoteToken = signQuoteToken({
          uid: userId,
          mode: 'monthly_payment',
          hid,
          code: uniqueCode,
          iat: Date.now(),
        });
        return NextResponse.json({
          breakdown: {
            minInfaq,
            infaqAmount,
            paymentDuration: 1,
            registrationFee: 0,
            referralDiscount: 0,
            uniqueCode,
            totalAmount: infaqAmount + uniqueCode,
            isPaid: true,
            paymentMethod: 'transfer',
          },
          quote_token: quoteToken,
        });
      }

      const halaqah = await resolveHalaqah(runner, body.halaqah_id, body.program_hint);
      if (!halaqah?.id) {
        throw new ClientError('Program / halaqah tidak ditemukan.');
      }
      const flags = detectProgramFlags(halaqah, body.program_hint || body.halaqah_id);
      const minInfaq = calculateMinInfaq({
        halaqah,
        isMufradat: flags.isMufradat,
        isTikrar: flags.isTikrar,
        level: body.level,
      });

      const resumeId = typeof body.resume_registration_id === 'string' ? body.resume_registration_id.trim() : '';
      let existingUniqueCode: number | null = null;
      if (resumeId && UUID_REGEX.test(resumeId)) {
        const { rows: resumeRows } = await query<{ user_id: string; status: string; unique_code: number | null }>(
          `SELECT user_id, status, unique_code FROM public.halaqah_registrations WHERE id = $1 LIMIT 1`,
          [resumeId]
        );
        if (resumeRows[0]?.user_id === userId && resumeRows[0]?.status === 'pending_verification') {
          const uc = Number(resumeRows[0].unique_code);
          if (Number.isInteger(uc) && uc >= 100 && uc <= 999) existingUniqueCode = uc;
        }
      }

      const { rows: userRows } = await query<{ referred_by_id: string | null }>(
        `SELECT referred_by_id FROM public.users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      const { isFirstRegistration, hasUsedReferral } = await computeUserRegistrationHistory(
        runner,
        userId,
        halaqah.id,
        flags,
        resumeId || null
      );

      let voucher: any = null;
      if (typeof body.voucher_code === 'string' && body.voucher_code.trim()) {
        voucher = await validateAndFetchVoucher(runner, body.voucher_code, userId, flags, false);
      }

      let referrer: { id: string; referral_code: string; username: string | null } | null = null;
      if (flags.isPremiumProgram && !voucher) {
        referrer = await resolveReferralForUser(
          runner,
          userId,
          userRows[0]?.referred_by_id,
          body.referral_code,
          hasUsedReferral,
          false
        );
      }

      const reusedCode =
        existingUniqueCode ?? verifyQuoteToken(body.quote_token, userId, 'register', halaqah.id);
      const uniqueCode =
        flags.isPremiumProgram && !voucher ? (reusedCode ?? crypto.randomInt(100, 1000)) : 0;

      const rawInfaq = Number(body.infaq_amount ?? minInfaq);
      const rawDuration = Number(body.payment_duration ?? 1);
      const breakdown = calculateRegistrationBreakdown({
        isPremiumProgram: flags.isPremiumProgram,
        hasVoucher: Boolean(voucher),
        minInfaq,
        infaqAmount: Number.isFinite(rawInfaq) ? rawInfaq : minInfaq,
        paymentDuration: Number.isFinite(rawDuration) ? rawDuration : 1,
        isFirstRegistration,
        hasEligibleReferral: Boolean(referrer) && !hasUsedReferral,
        uniqueCode,
      });

      const quoteToken =
        flags.isPremiumProgram && !voucher
          ? signQuoteToken({
              uid: userId,
              mode: 'register',
              hid: halaqah.id,
              code: breakdown.uniqueCode,
              iat: Date.now(),
            })
          : null;

      return NextResponse.json({
        halaqah_id: halaqah.id,
        halaqah_title: halaqah.title,
        is_first_registration: isFirstRegistration,
        has_used_referral: hasUsedReferral,
        breakdown,
        voucher: voucher
          ? {
              id: voucher.id,
              code: voucher.code,
              description: voucher.description || null,
              program_id: voucher.program_id,
            }
          : null,
        referral: referrer
          ? { id: referrer.id, referral_code: referrer.referral_code, username: referrer.username }
          : null,
        quote_token: quoteToken,
      });
    }

    // -------------------------------------------------------------------------
    // 4. REGISTER (transactional server-side registration + optional voucher)
    // -------------------------------------------------------------------------
    if (action === 'register') {
      const waError = whatsappErrorMessage(String(body.whatsapp ?? ''));
      if (waError) {
        throw new ClientError(waError);
      }
      const normalizedWa = normalizeWhatsapp(String(body.whatsapp));

      const payload = await withTransaction(async (txRunner) => {
        const { rows: userRows } = await txRunner.query<{
          id: string;
          username: string | null;
          full_name: string | null;
          email: string | null;
          referred_by_id: string | null;
          mufradat_accessible_juz: any;
        }>(
          `SELECT id, username, full_name, email, referred_by_id, mufradat_accessible_juz
           FROM public.users WHERE id = $1 FOR UPDATE`,
          [userId]
        );
        const userRow = userRows[0];
        if (!userRow) {
          throw new ClientError('Data pengguna tidak ditemukan.', 404);
        }

        const halaqah = await resolveHalaqah(txRunner, body.halaqah_id, body.program_hint);
        if (!halaqah?.id) {
          throw new ClientError('Gagal memproses ID Program. Program tidak ditemukan.');
        }

        const flags = detectProgramFlags(halaqah, body.program_hint || body.halaqah_id);

        if ((flags.isMufradat || flags.isTikrar || flags.isNgaji) && body.akad_accepted !== true) {
          throw new ClientError('Mohon baca dan setujui Akad Komitmen program terlebih dahulu.');
        }

        const resumeId =
          typeof body.resume_registration_id === 'string' ? body.resume_registration_id.trim() : '';
        let existingReg: any = null;
        if (resumeId) {
          if (!UUID_REGEX.test(resumeId)) {
            throw new ClientError('ID pendaftaran tidak valid.');
          }
          const { rows: regRows } = await txRunner.query<any>(
            `SELECT * FROM public.halaqah_registrations WHERE id = $1 FOR UPDATE`,
            [resumeId]
          );
          existingReg = regRows[0];
          if (!existingReg) {
            throw new ClientError('Data pendaftaran tidak ditemukan.', 404);
          }
          if (existingReg.user_id !== userId) {
            throw new ClientError('Tidak boleh mengubah pendaftaran milik pengguna lain.', 403);
          }
          if (existingReg.status !== 'pending_verification') {
            throw new ClientError('Pendaftaran sudah diproses dan tidak dapat diubah lagi.');
          }
        } else {
          // Match UI duplicate filter: only block currently active or pending_verification
          // initial registrations so former inactive Mufradat users and Tikrar users
          // registering for another juz can re-register cleanly.
          const { rows: dupRows } = await txRunner.query<{ id: string }>(
            `SELECT id FROM public.halaqah_registrations
             WHERE user_id = $1
               AND halaqah_id = $2
               AND status IN ('active', 'pending_verification')
               AND (payment_type IS NULL OR payment_type = 'initial')
             LIMIT 1`,
            [userId, halaqah.id]
          );
          if (dupRows.length > 0) {
            throw new ClientError(
              'Anda sudah memiliki pendaftaran aktif atau menunggu verifikasi di program ini.',
              409
            );
          }
        }

        let voucher: any = null;
        if (typeof body.voucher_code === 'string' && body.voucher_code.trim()) {
          voucher = await validateAndFetchVoucher(txRunner, body.voucher_code, userId, flags, true);
        }

        const { isFirstRegistration, hasUsedReferral } = await computeUserRegistrationHistory(
          txRunner,
          userId,
          halaqah.id,
          flags,
          existingReg?.id || null
        );

        let referrer: { id: string; referral_code: string; username: string | null } | null = null;
        const explicitReferral =
          typeof body.referral_code === 'string' && body.referral_code.trim().length > 0;
        if (flags.isPremiumProgram && !voucher) {
          referrer = await resolveReferralForUser(
            txRunner,
            userId,
            userRow.referred_by_id,
            body.referral_code,
            hasUsedReferral,
            explicitReferral
          );
        }

        const levelNum = flags.isTikrar ? parseInt(String(body.level ?? '3'), 10) : null;
        if (flags.isTikrar && (!levelNum || ![1, 2, 3].includes(levelNum))) {
          throw new ClientError('Level Tikrar tidak valid.');
        }

        const targetJuzNum = flags.isTikrar ? parseInt(String(body.target_juz ?? '30'), 10) : null;
        if (flags.isTikrar && (!targetJuzNum || targetJuzNum < 1 || targetJuzNum > 30)) {
          throw new ClientError('Target Juz tidak valid.');
        }

        const paymentDuration = body.payment_duration === undefined ? 1 : Number(body.payment_duration);
        if (
          !Number.isInteger(paymentDuration) ||
          paymentDuration < 1 ||
          paymentDuration > MAX_PAYMENT_DURATION_MONTHS
        ) {
          throw new ClientError('Durasi pembayaran tidak valid.');
        }

        const minInfaq = calculateMinInfaq({
          halaqah,
          isMufradat: flags.isMufradat,
          isTikrar: flags.isTikrar,
          level: levelNum,
        });

        let infaqAmount = minInfaq;
        let senderName: string | null = null;
        let proofFileName: string | null = null;
        let uniqueCode = 0;

        if (voucher) {
          senderName = `VOUCHER: ${voucher.code}`;
          proofFileName = 'VOUCHER_ACTIVATED';
        } else if (flags.isPremiumProgram) {
          const rawInfaq = body.infaq_amount === undefined ? minInfaq : Number(body.infaq_amount);
          if (
            !Number.isInteger(rawInfaq) ||
            rawInfaq < minInfaq ||
            rawInfaq > MAX_INFAQ_AMOUNT
          ) {
            throw new ClientError(
              `Minimal infaq untuk program ini adalah Rp ${minInfaq.toLocaleString('id-ID')}.`
            );
          }
          infaqAmount = rawInfaq;

          const rawSender = typeof body.sender_name === 'string' ? body.sender_name.trim() : '';
          if (!rawSender || rawSender.length > 150) {
            throw new ClientError('Nama pengirim rekening wajib diisi.');
          }
          senderName = rawSender;

          const rawProof =
            typeof body.proof_file_path === 'string' && body.proof_file_path.trim()
              ? body.proof_file_path.trim()
              : typeof body.proof_file_name === 'string' && body.proof_file_name.trim()
                ? body.proof_file_name.trim()
                : existingReg?.proof_file_name || '';
          if (!rawProof || rawProof.length > 255) {
            throw new ClientError('Bukti transfer wajib dilampirkan.');
          }
          proofFileName = rawProof;

          const verifiedUc = verifyQuoteToken(body.quote_token, userId, 'register', halaqah.id);
          if (verifiedUc === null) {
            throw new ClientError(
              'Rincian pembayaran berubah, muat ulang halaman dan cek kembali nominal transfer.',
              409
            );
          }
          uniqueCode = verifiedUc;
        }

        const breakdown = calculateRegistrationBreakdown({
          isPremiumProgram: flags.isPremiumProgram,
          hasVoucher: Boolean(voucher),
          minInfaq,
          infaqAmount,
          paymentDuration,
          isFirstRegistration,
          hasEligibleReferral: Boolean(referrer) && !hasUsedReferral,
          uniqueCode,
        });

        const rawUserName = typeof body.user_name === 'string' ? body.user_name.trim() : '';
        const userName =
          (rawUserName ? rawUserName.slice(0, 150) : null) ||
          userRow.full_name ||
          userRow.username ||
          'Thalibah';

        const halaqahTitle =
          halaqah.title ||
          (flags.isMufradat
            ? 'Hi Mufradat'
            : flags.isTikrar
              ? 'Hi Tikrar'
              : flags.isNgaji
                ? 'Hi Ngaji'
                : 'Halaqah');

        const scheduleStr =
          typeof body.schedule === 'string' && body.schedule.trim()
            ? body.schedule.trim().slice(0, 50)
            : 'harian';
        const mufradatTargetStr =
          typeof body.mufradat_target === 'string' && body.mufradat_target.trim()
            ? body.mufradat_target.trim().slice(0, 50)
            : '1-halaman';

        const metadata = flags.isMufradat
          ? {
              schedule: scheduleStr,
              target: mufradatTargetStr,
              akadAccepted: true,
              unitPrice: 0,
              infaqBase: breakdown.infaqAmount,
              paymentDuration: breakdown.paymentDuration,
              voucher_code: voucher?.code || null,
              referral_code: referrer?.referral_code || null,
              is_resume: Boolean(existingReg),
            }
          : flags.isNgaji
            ? {
                akadAccepted: true,
                infaqBase: breakdown.infaqAmount,
                paymentDuration: breakdown.paymentDuration,
                voucher_code: voucher?.code || null,
                referral_code: referrer?.referral_code || null,
              }
            : flags.isTikrar
              ? {
                  akadAccepted: true,
                  target: String(targetJuzNum),
                  level: String(levelNum),
                  infaqBase: breakdown.infaqAmount,
                  paymentDuration: breakdown.paymentDuration,
                  voucher_code: voucher?.code || null,
                  referral_code: referrer?.referral_code || null,
                }
              : voucher
                ? { voucher_code: voucher.code }
                : null;

        // Status tetap 'pending_verification' agar antrean Admin (penempatan halaqah/grup WA
        // & verifikasi mutasi) tetap berjalan; bila ditolak Admin, akses Mufradat dicabut kembali.
        const status = 'pending_verification';
        let savedReg: any;

        if (existingReg) {
          const { rows: updatedRows } = await txRunner.query(
            `UPDATE public.halaqah_registrations
             SET user_name = $1,
                 user_email = $2,
                 whatsapp = $3,
                 halaqah_id = $4,
                 halaqah_title = $5,
                 is_paid = $6,
                 level = $7,
                 target_juz = $8,
                 amount = $9,
                 payment_method = $10,
                 sender_name = $11,
                 proof_file_name = $12,
                 status = $13,
                 registration_fee = $14,
                 referral_code_used = $15,
                 referral_discount_amount = $16,
                 is_first_registration = $17,
                 unique_code = $18,
                 metadata = $19::jsonb,
                 updated_at = now()
             WHERE id = $20 AND user_id = $21
             RETURNING *`,
            [
              userName,
              userRow.email,
              normalizedWa,
              halaqah.id,
              halaqahTitle,
              breakdown.isPaid,
              levelNum,
              targetJuzNum,
              breakdown.totalAmount,
              breakdown.paymentMethod,
              senderName,
              proofFileName,
              status,
              breakdown.registrationFee,
              referrer?.referral_code || null,
              breakdown.referralDiscount,
              isFirstRegistration,
              breakdown.uniqueCode,
              metadata ? JSON.stringify(metadata) : null,
              existingReg.id,
              userId,
            ]
          );
          savedReg = updatedRows[0];
        } else {
          const regId = crypto.randomUUID();
          const { rows: insertedRows } = await txRunner.query(
            `INSERT INTO public.halaqah_registrations (
               id, user_id, user_name, user_email, whatsapp, halaqah_id, halaqah_title,
               is_paid, level, target_juz, amount, payment_method, sender_name,
               proof_file_name, status, registration_fee, referral_code_used,
               referral_discount_amount, is_first_registration, unique_code, metadata,
               created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7,
               $8, $9, $10, $11, $12, $13,
               $14, $15, $16, $17,
               $18, $19, $20, $21::jsonb,
               now(), now()
             ) RETURNING *`,
            [
              regId,
              userId,
              userName,
              userRow.email,
              normalizedWa,
              halaqah.id,
              halaqahTitle,
              breakdown.isPaid,
              levelNum,
              targetJuzNum,
              breakdown.totalAmount,
              breakdown.paymentMethod,
              senderName,
              proofFileName,
              status,
              breakdown.registrationFee,
              referrer?.referral_code || null,
              breakdown.referralDiscount,
              isFirstRegistration,
              breakdown.uniqueCode,
              metadata ? JSON.stringify(metadata) : null,
            ]
          );
          savedReg = insertedRows[0];
        }

        if (voucher) {
          await txRunner.query(
            `INSERT INTO public.voucher_redemptions (id, voucher_id, user_id)
             VALUES ($1, $2, $3)`,
            [crypto.randomUUID(), voucher.id, userId]
          );
        }

        // Sesuai keputusan pemilik: pendaftaran Mufradat (baik transfer maupun voucher)
        // langsung diaktifkan oleh server saat submit (status='active', Juz 1 terbuka, schedule terisi).
        // Kolom mufradat_* tetap dilindungi di USER_PROTECTED_COLUMNS, dan bila Admin menolak
        // registrasi ini maka akses dicabut kembali.
        if (flags.isMufradat) {
          const nextJuz = ensureJuzOneUnlocked(userRow.mufradat_accessible_juz);
          await txRunner.query(
            `UPDATE public.users
             SET whatsapp = $1,
                 mufradat_status = 'active',
                 mufradat_accessible_juz = $2::jsonb,
                 mufradat_schedule = $3,
                 updated_at = now()
             WHERE id = $4`,
            [normalizedWa, JSON.stringify(nextJuz), scheduleStr, userId]
          );
        } else {
          await txRunner.query(
            `UPDATE public.users SET whatsapp = $1, updated_at = now() WHERE id = $2`,
            [normalizedWa, userId]
          );
        }

        return {
          success: true,
          registration: savedReg,
          breakdown,
        };
      });

      return NextResponse.json(payload);
    }

    // -------------------------------------------------------------------------
    // 5. MONTHLY PAYMENT (Mufradat monthly infaq confirmation)
    // -------------------------------------------------------------------------
    if (action === 'monthly_payment') {
      const waError = whatsappErrorMessage(String(body.whatsapp ?? ''));
      if (waError) {
        throw new ClientError(waError);
      }
      const normalizedWa = normalizeWhatsapp(String(body.whatsapp));

      const rawSender = typeof body.sender_name === 'string' ? body.sender_name.trim() : '';
      if (!rawSender || rawSender.length > 150) {
        throw new ClientError('Nama pengirim rekening wajib diisi.');
      }

      const rawProof =
        typeof body.proof_file_path === 'string' && body.proof_file_path.trim()
          ? body.proof_file_path.trim()
          : typeof body.proof_file_name === 'string' && body.proof_file_name.trim()
            ? body.proof_file_name.trim()
            : '';
      if (!rawProof || rawProof.length > 255) {
        throw new ClientError('Bukti transfer wajib dilampirkan.');
      }

      const rawInfaq = Number(body.infaq_amount ?? body.amount);
      if (
        !Number.isInteger(rawInfaq) ||
        rawInfaq < MUFRADAT_MIN_INFAQ ||
        rawInfaq > MAX_INFAQ_AMOUNT
      ) {
        throw new ClientError(
          `Minimal infaq bulanan adalah Rp ${MUFRADAT_MIN_INFAQ.toLocaleString('id-ID')}.`
        );
      }

      const defaultMonth = new Date().toISOString().slice(0, 7);
      const billingMonth =
        typeof body.billing_month === 'string' && body.billing_month.trim()
          ? body.billing_month.trim()
          : defaultMonth;
      if (!BILLING_MONTH_REGEX.test(billingMonth)) {
        throw new ClientError('Format bulan tagihan tidak valid (YYYY-MM).');
      }

      const payload = await withTransaction(async (txRunner) => {
        const { rows: userRows } = await txRunner.query<{
          username: string | null;
          full_name: string | null;
          email: string | null;
        }>(
          `SELECT username, full_name, email FROM public.users WHERE id = $1 FOR UPDATE`,
          [userId]
        );
        const userRow = userRows[0];
        if (!userRow) {
          throw new ClientError('Data pengguna tidak ditemukan.', 404);
        }

        const halaqah = await resolveHalaqah(txRunner, null, 'hi_mufradat');
        const hid = String(halaqah?.id || 'hi_mufradat');
        const verifiedUc = verifyQuoteToken(body.quote_token, userId, 'monthly_payment', hid);
        if (verifiedUc === null) {
          throw new ClientError(
            'Rincian pembayaran berubah, muat ulang halaman dan cek kembali nominal transfer.',
            409
          );
        }
        const uniqueCode = verifiedUc;
        const totalAmount = rawInfaq + uniqueCode;

        const regId = crypto.randomUUID();
        const { rows: insertedRows } = await txRunner.query(
          `INSERT INTO public.halaqah_registrations (
             id, user_id, user_name, user_email, whatsapp, halaqah_id, halaqah_title,
             is_paid, amount, unique_code, payment_method, sender_name, proof_file_name,
             status, payment_type, billing_month, metadata, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, 'Hi Mufradat (Infaq Bulanan)',
             true, $7, $8, 'transfer', $9, $10,
             'pending_verification', 'monthly', $11, '{}'::jsonb, now(), now()
           ) RETURNING *`,
          [
            regId,
            userId,
            userRow.username || userRow.full_name || 'Thalibah',
            userRow.email,
            normalizedWa,
            halaqah?.id || null,
            totalAmount,
            uniqueCode,
            rawSender,
            rawProof,
            billingMonth,
          ]
        );

        await txRunner.query(
          `UPDATE public.users SET whatsapp = $1, phone = $1, updated_at = now() WHERE id = $2`,
          [normalizedWa, userId]
        );

        return {
          success: true,
          registration: insertedRows[0],
          breakdown: {
            infaqAmount: rawInfaq,
            uniqueCode,
            totalAmount,
          },
        };
      });

      return NextResponse.json(payload);
    }

    // -------------------------------------------------------------------------
    // 6. LEAVE REQUEST (Mufradat cuti request)
    // -------------------------------------------------------------------------
    if (action === 'leave_request') {
      const today = new Date();
      if (today.getDate() > 10) {
        throw new ClientError(
          'Permohonan cuti hanya dapat diajukan sebelum tanggal 10 setiap bulannya.'
        );
      }

      let leaveFromIso: string | null = null;
      let leaveUntilIso: string | null = null;
      if (typeof body.leave_from === 'string' && body.leave_from.trim()) {
        const d = new Date(body.leave_from);
        if (Number.isNaN(d.getTime())) throw new ClientError('Tanggal mulai cuti tidak valid.');
        leaveFromIso = d.toISOString();
      }
      if (typeof body.leave_until === 'string' && body.leave_until.trim()) {
        const d = new Date(body.leave_until);
        if (Number.isNaN(d.getTime())) throw new ClientError('Tanggal selesai cuti tidak valid.');
        leaveUntilIso = d.toISOString();
      }
      if (leaveFromIso && leaveUntilIso && new Date(leaveUntilIso) < new Date(leaveFromIso)) {
        throw new ClientError('Tanggal selesai cuti harus setelah tanggal mulai cuti.');
      }

      const fallbackMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15)
        .toISOString()
        .slice(0, 7);
      const billingMonth =
        typeof body.billing_month === 'string' && body.billing_month.trim()
          ? body.billing_month.trim()
          : fallbackMonth;
      if (!BILLING_MONTH_REGEX.test(billingMonth)) {
        throw new ClientError('Format bulan cuti tidak valid (YYYY-MM).');
      }

      const payload = await withTransaction(async (txRunner) => {
        const { rows: userRows } = await txRunner.query<{
          username: string | null;
          full_name: string | null;
          email: string | null;
          whatsapp: string | null;
          phone: string | null;
          mufradat_leave_balance: number | null;
        }>(
          `SELECT username, full_name, email, whatsapp, phone, mufradat_leave_balance
           FROM public.users WHERE id = $1 FOR UPDATE`,
          [userId]
        );
        const userRow = userRows[0];
        if (!userRow) {
          throw new ClientError('Data pengguna tidak ditemukan.', 404);
        }

        const leaveBalance = userRow.mufradat_leave_balance ?? 3;
        if (leaveBalance <= 0) {
          throw new ClientError('Kuota cuti sudah habis (maksimal 3 bulan cuti).');
        }

        const { rows: pendingLeave } = await txRunner.query(
          `SELECT id FROM public.halaqah_registrations
           WHERE user_id = $1 AND payment_type = 'leave_request' AND status = 'pending_verification'
           LIMIT 1`,
          [userId]
        );
        if (pendingLeave.length > 0) {
          throw new ClientError('Anda masih memiliki permohonan cuti yang sedang ditinjau.', 409);
        }

        const halaqah = await resolveHalaqah(txRunner, null, 'hi_mufradat');
        const label =
          typeof body.leave_from === 'string' && body.leave_from.trim()
            ? body.leave_from.trim().slice(0, 20)
            : '1 Bln';

        const metadata = {
          request_date: today.toISOString(),
          type: 'cuti',
          leave_from: leaveFromIso,
          leave_until: leaveUntilIso,
        };

        const regId = crypto.randomUUID();
        const { rows: insertedRows } = await txRunner.query(
          `INSERT INTO public.halaqah_registrations (
             id, user_id, user_name, user_email, whatsapp, halaqah_id, halaqah_title,
             is_paid, amount, status, payment_type, billing_month, metadata, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             false, 0, 'pending_verification', 'leave_request', $8, $9::jsonb, now(), now()
           ) RETURNING *`,
          [
            regId,
            userId,
            userRow.username || userRow.full_name || 'Thalibah',
            userRow.email,
            userRow.whatsapp || userRow.phone || null,
            halaqah?.id || null,
            `Hi Mufradat (Cuti: ${label})`,
            billingMonth,
            JSON.stringify(metadata),
          ]
        );

        return {
          success: true,
          registration: insertedRows[0],
        };
      });

      return NextResponse.json(payload);
    }

    // -------------------------------------------------------------------------
    // 7. REDEEM VOUCHER (standalone claim from Mufradat billing page)
    // -------------------------------------------------------------------------
    if (action === 'redeem_voucher') {
      const voucherCode = typeof body.voucher_code === 'string' ? body.voucher_code : '';
      if (!voucherCode.trim()) {
        throw new ClientError('Kode voucher kosong.');
      }

      const payload = await withTransaction(async (txRunner) => {
        const { rows: userRows } = await txRunner.query<{ mufradat_accessible_juz: any }>(
          `SELECT mufradat_accessible_juz FROM public.users WHERE id = $1 FOR UPDATE`,
          [userId]
        );
        const userRow = userRows[0];
        if (!userRow) {
          throw new ClientError('Data pengguna tidak ditemukan.', 404);
        }

        const flags = detectProgramFlags(null, 'hi_mufradat');
        const voucher = await validateAndFetchVoucher(txRunner, voucherCode, userId, flags, true);

        const redemptionId = crypto.randomUUID();
        await txRunner.query(
          `INSERT INTO public.voucher_redemptions (id, voucher_id, user_id)
           VALUES ($1, $2, $3)`,
          [redemptionId, voucher.id, userId]
        );

        const nextJuz = ensureJuzOneUnlocked(userRow.mufradat_accessible_juz);
        await txRunner.query(
          `UPDATE public.users
           SET mufradat_status = 'active',
               mufradat_accessible_juz = $1::jsonb,
               updated_at = now()
           WHERE id = $2`,
          [JSON.stringify(nextJuz), userId]
        );

        return {
          success: true,
          voucher: {
            id: voucher.id,
            code: voucher.code,
            program_id: voucher.program_id,
            expiry_date: voucher.expiry_date || null,
          },
        };
      });

      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: `Action '${action}' tidak didukung.` }, { status: 400 });
  } catch (err: any) {
    if (err instanceof ClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[REGISTRATIONS_API_ERROR]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
