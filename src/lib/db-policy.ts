import type { AuthContext } from '@/lib/auth-server';

/**
 * Access policy for the generic /api/db endpoint (replacement for Supabase RLS).
 *
 * - Staff (admin, superadmin, musyrifah) may read and write every whitelisted table,
 *   but only admin/superadmin may delete or manage roles, and only superadmin may
 *   touch roles_superadmin.
 * - Learners may read most tables, but may only write rows they own; ownership is
 *   enforced server-side by forcing/filtering on the owner column.
 * - Anonymous visitors may only read public content and submit a donation.
 */

export type DbAction = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

// Owner column per table that a learner is allowed to write.
export const OWNER_COLUMN: Record<string, string> = {
  users: 'id',
  quiz_attempts: 'user_id',
  best_quiz_attempts: 'user_id',
  user_badges: 'user_id',
  mutabaah_logs: 'user_id',
  matan_user_progress: 'user_id',
  mufradat_mabar_participants: 'user_id',
  halaqah_registrations: 'user_id',
  page_exams: 'user_id',
  donations: 'user_id',
  mufradat_reactions: 'from_user_id',
};

// Tables learners can only read their own rows from.
const OWNER_SCOPED_READ: Record<string, string> = {
  halaqah_registrations: 'user_id',
  voucher_redemptions: 'user_id',
  page_exams: 'user_id',
  roles_admin: 'id',
  roles_superadmin: 'id',
  roles_musyrifah: 'id',
};

const STAFF_ONLY_READ = new Set(['whatsapp_logs', 'mufradat_reminder_templates', 'mufradat_reminder_configs']);

const PUBLIC_READ = new Set([
  'users',
  'campaigns',
  'donations',
  'mufradat_payouts',
  'matans',
  'matan_chapters',
  'matan_items',
  'halaqahs',
  'mufradat_groups',
  'mufradat_motivations',
  'quiz_attempts',
  'best_quiz_attempts',
]);

const ROLE_TABLES = new Set(['roles_admin', 'roles_superadmin', 'roles_musyrifah']);

// Columns on users that a learner must never set on their own row.
const USER_PROTECTED_COLUMNS = new Set([
  'encrypted_password',
  'is_blacklisted',
  'referral_balance',
  'mufradat_status',
  'mufradat_accessible_juz',
  'mufradat_due_date',
  'mufradat_leave_balance',
  'mufradat_leave_from',
  'mufradat_leave_until',
  'mufradat_schedule',
  'mufradat_group_id',
  'is_tikrar_paid',
  'paid_juz',
  'tikrar_level',
  'tikrar_start_date',
]);

// Columns on halaqah_registrations a learner may update on their own row (safe contact info only).
const HALAQAH_REGISTRATION_SAFE_UPDATE_COLUMNS = new Set(['whatsapp', 'updated_at']);

// Columns on users hidden from anyone who is not staff and not the row owner.
export const USER_PRIVATE_COLUMNS = [
  'encrypted_password',
  'email',
  'phone',
  'whatsapp',
  'bank_name',
  'bank_account_number',
  'bank_account_holder',
  'referral_balance',
];

// Secret columns on vouchers hidden from non-staff (validation goes through /api/registrations).
export const VOUCHER_SECRET_COLUMNS = ['code'];

export function isStaff(ctx: AuthContext): boolean {
  return ctx.isAdmin || ctx.isSuperAdmin || ctx.isMusyrifah;
}

export function isFullAdmin(ctx: AuthContext): boolean {
  return ctx.isAdmin || ctx.isSuperAdmin;
}

export class PolicyError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export interface ReadPolicy {
  /** Extra equality filter forced on the query, e.g. { column: 'user_id', value: me } */
  ownerFilter?: { column: string; value: string };
}

export function checkRead(table: string, ctx: AuthContext): ReadPolicy {
  if (isStaff(ctx)) return {};

  if (!ctx.userId) {
    if (PUBLIC_READ.has(table)) return {};
    throw new PolicyError('Silakan login terlebih dahulu.', 401);
  }

  if (STAFF_ONLY_READ.has(table)) {
    throw new PolicyError('Akses ditolak.');
  }
  const ownerCol = OWNER_SCOPED_READ[table];
  if (ownerCol) return { ownerFilter: { column: ownerCol, value: ctx.userId } };
  return {};
}

export interface WritePolicy {
  /** Owner column the row must match; null when staff (no restriction). */
  ownerColumn: string | null;
}

export function checkWrite(table: string, action: Exclude<DbAction, 'select'>, ctx: AuthContext): WritePolicy {
  if (ROLE_TABLES.has(table)) {
    if (table === 'roles_superadmin' ? !ctx.isSuperAdmin : !isFullAdmin(ctx)) {
      throw new PolicyError('Hanya admin yang dapat mengelola role.');
    }
    return { ownerColumn: null };
  }

  if (action === 'delete') {
    if (!isFullAdmin(ctx)) throw new PolicyError('Hanya admin yang dapat menghapus data.');
    return { ownerColumn: null };
  }

  if (isStaff(ctx)) return { ownerColumn: null };

  // Anonymous visitors may only submit a donation confirmation.
  if (!ctx.userId) {
    if (table === 'donations' && (action === 'insert' || action === 'upsert')) {
      return { ownerColumn: 'user_id' };
    }
    throw new PolicyError('Silakan login terlebih dahulu.', 401);
  }

  const ownerColumn = OWNER_COLUMN[table];
  if (!ownerColumn) throw new PolicyError('Akses ditolak.');
  // Donations are confirmed by staff; learners may only create them.
  if (table === 'donations' && action === 'update') throw new PolicyError('Akses ditolak.');
  // Registrations must go through /api/registrations; learners may only update safe contact fields.
  if (table === 'halaqah_registrations' && (action === 'insert' || action === 'upsert')) {
    throw new PolicyError('Pendaftaran harus dikirim melalui endpoint resmi.');
  }
  return { ownerColumn };
}

/**
 * Validate one record a non-staff caller wants to insert/upsert/update and pin its
 * owner column to the caller. Throws PolicyError on anything not allowed.
 */
export function sanitizeOwnedRecord(
  table: string,
  record: Record<string, any>,
  ownerColumn: string,
  ctx: AuthContext,
  isUpdate: boolean
): Record<string, any> {
  const out = { ...record };
  const owner = ctx.userId; // null for anonymous donations

  if (ownerColumn in out && out[ownerColumn] !== owner) {
    throw new PolicyError('Tidak boleh menulis data milik pengguna lain.');
  }
  if (!isUpdate) out[ownerColumn] = owner;
  else delete out[ownerColumn];

  if (table === 'users') {
    for (const col of Object.keys(out)) {
      if (USER_PROTECTED_COLUMNS.has(col)) throw new PolicyError(`Kolom '${col}' tidak boleh diubah.`);
      if ((col === 'role_id' || col === 'roleId') && out[col] !== 'learner') {
        throw new PolicyError('Tidak boleh mengubah role sendiri.');
      }
    }
  }

  if (table === 'halaqah_registrations' && isUpdate) {
    for (const col of Object.keys(out)) {
      if (!HALAQAH_REGISTRATION_SAFE_UPDATE_COLUMNS.has(col)) {
        throw new PolicyError(`Kolom '${col}' pada pendaftaran tidak boleh diubah.`);
      }
    }
  }

  if (table === 'donations' && !isUpdate) {
    out.status = 'pending_verification';
  }

  return out;
}

/** Strip private user columns from a users row unless the caller may see them. */
export function redactUserRow(row: any, ctx: AuthContext): any {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  delete copy.encrypted_password;
  if (isStaff(ctx) || (ctx.userId && copy.id === ctx.userId)) return copy;
  for (const col of USER_PRIVATE_COLUMNS) delete copy[col];
  return copy;
}

/** Strip redeemable voucher codes unless the caller is staff. */
export function redactVoucherRow(row: any, ctx: AuthContext): any {
  if (!row || typeof row !== 'object') return row;
  if (isStaff(ctx)) return row;
  const copy = { ...row };
  for (const col of VOUCHER_SECRET_COLUMNS) delete copy[col];
  return copy;
}
