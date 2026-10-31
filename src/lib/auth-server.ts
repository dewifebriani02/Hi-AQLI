import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

// JWT_SECRET wajib di-set lewat environment. Tanpa fallback: secret yang ada di kode
// publik bisa dipakai siapa pun untuk memalsukan token.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET belum dikonfigurasi (minimal 32 karakter) di environment server.');
  }
  return secret;
}

export interface TokenPayload {
  id: string;
  email: string;
  roleId?: string;
  role_id?: string;
  role?: string;
  user_metadata?: any;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return false;
  }
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d', algorithm: 'HS256' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as TokenPayload;
  } catch (e) {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookie = req.cookies.get('hiaqli_token')?.value;
  return cookie || null;
}

export interface AuthContext {
  userId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMusyrifah: boolean;
}

export const ANONYMOUS: AuthContext = { userId: null, isAdmin: false, isSuperAdmin: false, isMusyrifah: false };

/**
 * Resolve the caller from the request token. Roles are read from the roles_* tables
 * (same source as useUserPermissions), never from the token payload, so a stale or
 * forged role claim cannot grant access.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const token = getTokenFromRequest(req);
  if (!token) return ANONYMOUS;

  const decoded = verifyToken(token);
  if (!decoded?.id) return ANONYMOUS;

  const { rows } = await query<{ user_exists: boolean; is_admin: boolean; is_superadmin: boolean; is_musyrifah: boolean }>(
    `SELECT
       EXISTS (SELECT 1 FROM public.users WHERE id = $1) AS user_exists,
       EXISTS (SELECT 1 FROM public.roles_admin WHERE id = $1) AS is_admin,
       EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = $1) AS is_superadmin,
       EXISTS (SELECT 1 FROM public.roles_musyrifah WHERE id = $1) AS is_musyrifah`,
    [decoded.id]
  );
  const r = rows[0];
  if (!r?.user_exists) return ANONYMOUS;

  return {
    userId: decoded.id,
    isAdmin: !!r.is_admin,
    isSuperAdmin: !!r.is_superadmin,
    isMusyrifah: !!r.is_musyrifah,
  };
}
