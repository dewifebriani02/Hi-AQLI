import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { activateAllUsers, activateUserPrograms } from '@/lib/user-activation';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx.userId) {
    return NextResponse.json({ error: { message: 'Silakan login terlebih dahulu.' } }, { status: 401 });
  }
  if (!ctx.isAdmin && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: { message: 'Akses ditolak. Hanya Administrator.' } }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: 'Body tidak valid.' } }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (body.all === true) {
      const result = await activateAllUsers(client);
      await client.query('COMMIT');
      return NextResponse.json({ data: result, error: null });
    }

    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!userId) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: { message: 'userId wajib diisi.' } }, { status: 400 });
    }

    const result = await activateUserPrograms(client, userId, { promotePending: true });
    if (!result) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: { message: 'User tidak ditemukan atau sedang di-blacklist.' } }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ data: { activatedCount: 1, group: result.group }, error: null });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[ADMIN_USER_ACTIVATE_ERROR]', err);
    return NextResponse.json({ error: { message: err?.message || 'Gagal mengaktifkan user.' } }, { status: 500 });
  } finally {
    client.release();
  }
}
