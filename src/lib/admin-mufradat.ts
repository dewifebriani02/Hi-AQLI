import { addDays, addMonths, parseISO } from 'date-fns';
import { db } from '@/db';

export interface DbClientLike {
  from: (table: string) => any;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMufradatRegistrationRow(reg: any, userGroupId?: string | null): boolean {
  if (!reg) return false;
  const hid = String(reg.halaqah_id || '').toLowerCase();
  const title = String(reg.halaqah_title || '').toLowerCase();
  if (hid === 'mufradat-premium' || hid.includes('mufradat') || title.includes('mufradat')) {
    return true;
  }
  if (userGroupId && reg.halaqah_id === userGroupId) {
    return true;
  }
  return false;
}

export function ensureJuzOneInArray(rawAccessible: unknown): number[] {
  const arr = Array.isArray(rawAccessible)
    ? rawAccessible.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 30)
    : [];
  if (!arr.includes(1)) {
    arr.push(1);
  }
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

/**
 * Shared Hi Mufradat group placement helper used by both Admin Registrations and BSI Reconciliation.
 * Reuses an existing group if already assigned; otherwise places the learner in the latest group
 * with < 50 members, or creates a new "Grup N" when all existing groups are full.
 */
export async function assignMufradatGroup(
  dbClient: DbClientLike = db,
  currentGroupId?: string | null
): Promise<string> {
  if (currentGroupId) return currentGroupId;

  const { data: availableGroups, error: availErr } = await dbClient
    .from('mufradat_groups')
    .select('*')
    .lt('member_count', 50)
    .order('created_at', { ascending: false })
    .limit(1);

  if (availErr) throw availErr;

  if (availableGroups && availableGroups.length > 0) {
    const targetGroup = availableGroups[0];
    const nextCount = (Number(targetGroup.member_count) || 0) + 1;
    const { error: incErr } = await dbClient
      .from('mufradat_groups')
      .update({ member_count: nextCount })
      .eq('id', targetGroup.id);
    if (incErr) throw incErr;
    return targetGroup.id;
  }

  const { data: allGroups, error: countErr } = await dbClient
    .from('mufradat_groups')
    .select('id');
  if (countErr) throw countErr;

  const nextNum = (allGroups?.length || 0) + 1;
  const { data: newGroup, error: groupError } = await dbClient
    .from('mufradat_groups')
    .insert({ name: `Grup ${nextNum}`, member_count: 1 })
    .select()
    .single();

  if (groupError || !newGroup?.id) {
    throw groupError || new Error('Gagal membuat grup Hi Mufradat baru.');
  }

  return newGroup.id;
}

/**
 * Revokes optimistic Mufradat submit access (`mufradat_status='active'` & Juz 1) when an admin
 * rejects a Mufradat registration, unless the user holds another active verified Mufradat
 * registration or a valid Mufradat voucher.
 */
export async function revokeMufradatAccessOnReject(
  dbClient: DbClientLike = db,
  reg: any
): Promise<{
  revoked: boolean;
  keptReason?: 'missing_user' | 'leave_request' | 'not_mufradat' | 'has_valid_voucher' | 'has_active_verified';
  preservedJuzOne?: boolean;
}> {
  if (!reg?.user_id) {
    return { revoked: false, keptReason: 'missing_user' };
  }
  if (reg.payment_type === 'leave_request') {
    return { revoked: false, keptReason: 'leave_request' };
  }

  let isMufradat = isMufradatRegistrationRow(reg);
  if (!isMufradat && typeof reg.halaqah_id === 'string' && UUID_REGEX.test(reg.halaqah_id)) {
    const { data: hRow, error: hErr } = await dbClient
      .from('halaqahs')
      .select('id, program_type, title')
      .eq('id', reg.halaqah_id)
      .maybeSingle();
    if (hErr) throw hErr;
    if (
      hRow?.program_type === 'hi_mufradat' ||
      String(hRow?.title || '').toLowerCase().includes('mufradat')
    ) {
      isMufradat = true;
    }
  }

  if (!isMufradat) {
    return { revoked: false, keptReason: 'not_mufradat' };
  }

  const { data: userRow, error: usrErr } = await dbClient
    .from('users')
    .select('id, mufradat_status, mufradat_group_id, mufradat_due_date, mufradat_accessible_juz')
    .eq('id', reg.user_id)
    .maybeSingle();

  if (usrErr) throw usrErr;
  if (!userRow) {
    return { revoked: false, keptReason: 'missing_user' };
  }

  const now = new Date();

  const { data: redemptions, error: redErr } = await dbClient
    .from('voucher_redemptions')
    .select('*, vouchers(*)')
    .eq('user_id', reg.user_id);
  if (redErr) throw redErr;

  const rejectedVoucherCode =
    reg.payment_method === 'voucher' && reg.metadata?.voucher_code
      ? String(reg.metadata.voucher_code).trim().toUpperCase()
      : null;

  const hasValidVoucher = (redemptions || []).some((r: any) => {
    const v = r?.vouchers;
    if (!v) return false;
    if (v.program_id !== 'mufradat' && v.program_id !== 'all') return false;
    if (v.is_active === false) return false;
    if (v.expiry_date && new Date(v.expiry_date) < now) return false;
    if (rejectedVoucherCode && String(v.code || '').trim().toUpperCase() === rejectedVoucherCode) {
      return false;
    }
    return true;
  });

  if (hasValidVoucher) {
    return { revoked: false, keptReason: 'has_valid_voucher', preservedJuzOne: true };
  }

  const { data: verifiedRows, error: verErr } = await dbClient
    .from('halaqah_registrations')
    .select('id, halaqah_id, halaqah_title, status, payment_type, created_at, verified_at, metadata')
    .eq('user_id', reg.user_id)
    .eq('status', 'verified')
    .neq('id', reg.id);
  if (verErr) throw verErr;

  const otherVerifiedMufradat = (verifiedRows || []).filter((r: any) => {
    if (r.payment_type === 'leave_request') return false;
    if (r.halaqah_id === 'all') return true;
    if (reg.halaqah_id && r.halaqah_id === reg.halaqah_id) return true;
    return isMufradatRegistrationRow(r, userRow.mufradat_group_id);
  });

  const hasAnyVerifiedReg = otherVerifiedMufradat.length > 0;
  let hasActiveVerifiedReg = false;

  if (hasAnyVerifiedReg) {
    const sorted = [...otherVerifiedMufradat].sort(
      (a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    const first = sorted[0];
    const rawBase = first?.verified_at || first?.created_at;
    if (!rawBase) {
      hasActiveVerifiedReg = true;
    } else {
      const baseDate = parseISO(String(rawBase));
      const totalDuration = sorted.reduce(
        (sum: number, r: any) => sum + Math.max(1, Number(r?.metadata?.paymentDuration) || 1),
        0
      );
      const months = Math.max(sorted.length, totalDuration);
      const regDue = addMonths(baseDate, months);
      const profDue = userRow.mufradat_due_date ? parseISO(String(userRow.mufradat_due_date)) : null;
      const effectiveDue = profDue && profDue > regDue ? profDue : regDue;
      hasActiveVerifiedReg = addDays(effectiveDue, 3) >= now;
    }
  }

  if (hasActiveVerifiedReg) {
    return { revoked: false, keptReason: 'has_active_verified', preservedJuzOne: true };
  }

  const currentJuz: number[] = Array.isArray(userRow.mufradat_accessible_juz)
    ? userRow.mufradat_accessible_juz
        .map((n: any) => Number(n))
        .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 30)
    : [];

  const nextJuz = hasAnyVerifiedReg ? currentJuz : currentJuz.filter((j) => j !== 1);

  const { error: updErr } = await dbClient
    .from('users')
    .update({
      mufradat_status: 'inactive',
      mufradat_accessible_juz: nextJuz,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reg.user_id);

  if (updErr) throw updErr;

  return { revoked: true, preservedJuzOne: hasAnyVerifiedReg };
}
