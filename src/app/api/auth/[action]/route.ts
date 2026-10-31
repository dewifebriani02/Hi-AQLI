import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword, signToken, getTokenFromRequest, verifyToken } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    if (action === 'login') {
      const body = await req.json();
      const email = body.email?.trim().toLowerCase();
      const password = body.password;

      if (!email || !password) {
        return NextResponse.json({ error: { message: 'Email dan password wajib diisi' } }, { status: 400 });
      }

      const { rows } = await query(
        `SELECT * FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: { message: 'Email atau password salah' } }, { status: 401 });
      }

      const userRow = rows[0];

      // Akun tanpa password lokal (dibuat via Google / migrasi) tidak boleh "diklaim" dengan
      // password apa pun yang pertama kali dicoba: siapa pun yang tahu emailnya bisa mengambil
      // alih akun. Pengguna seperti ini harus login dengan Google.
      if (!userRow.encrypted_password) {
        return NextResponse.json(
          { error: { message: 'Akun ini belum memiliki password. Silakan masuk dengan Google.' } },
          { status: 401 }
        );
      }

      if (!verifyPassword(password, userRow.encrypted_password)) {
        return NextResponse.json({ error: { message: 'Email atau password salah' } }, { status: 401 });
      }

      // Format user object structure
      const user = {
        id: userRow.id,
        email: userRow.email,
        role: userRow.roleId || userRow.role_id || 'learner',
        roleId: userRow.roleId || userRow.role_id || 'learner',
        user_metadata: {
          full_name: userRow.full_name || userRow.username || email.split('@')[0],
          username: userRow.username,
          ...(userRow.metadata || {})
        },
        app_metadata: {},
        created_at: userRow.created_at,
      };

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        user_metadata: user.user_metadata,
      });

      const session = {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600 * 24 * 30,
        user,
      };

      const response = NextResponse.json({ data: { user, session }, error: null });

      response.cookies.set('hiaqli_token', token, {
        httpOnly: false, // Accessible to JS client for sync
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 3600 * 24 * 30,
      });

      return response;
    }

    if (action === 'register' || action === 'signup') {
      const body = await req.json();
      const email = body.email?.trim().toLowerCase();
      const password = body.password;
      const metadata = body.options?.data || {};

      if (!email || !password) {
        return NextResponse.json({ error: { message: 'Email dan password wajib diisi' } }, { status: 400 });
      }
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: { message: 'Password minimal 6 karakter' } }, { status: 400 });
      }

      // Check existing
      const existing = await query(
        `SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: { message: 'Email sudah terdaftar. Silakan login.' } }, { status: 400 });
      }

      const id = uuidv4();
      const hashed = hashPassword(password);
      const username = metadata.username || metadata.full_name || email.split('@')[0];
      const fullName = metadata.full_name || username;
      const phone = metadata.whatsapp || metadata.phone || null;

      await query(
        `INSERT INTO public.users (
          id, email, encrypted_password, username, full_name, phone, whatsapp, role_id, "roleId", metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'learner', 'learner', $8, now(), now())`,
        [id, email, hashed, username, fullName, phone, phone, JSON.stringify(metadata)]
      );

      const user = {
        id,
        email,
        role: 'learner',
        roleId: 'learner',
        user_metadata: {
          full_name: fullName,
          username,
          ...metadata
        },
        app_metadata: {},
        created_at: new Date().toISOString(),
      };

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        user_metadata: user.user_metadata,
      });

      const session = {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600 * 24 * 30,
        user,
      };

      const response = NextResponse.json({ data: { user, session }, error: null });

      response.cookies.set('hiaqli_token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 3600 * 24 * 30,
      });

      return response;
    }

    if (action === 'logout' || action === 'signout') {
      const response = NextResponse.json({ data: { success: true }, error: null });
      response.cookies.set('hiaqli_token', '', {
        path: '/',
        expires: new Date(0),
      });
      return response;
    }

    return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 404 });
  } catch (err: any) {
    console.error(`[AUTH_API_ERROR] ${action}:`, err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    if (action === 'me' || action === 'session') {
      const token = getTokenFromRequest(req);
      if (!token) {
        return NextResponse.json({ data: { user: null, session: null }, error: null });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ data: { user: null, session: null }, error: null });
      }

      // Fetch fresh user data from DB
      const { rows } = await query(
        `SELECT * FROM public.users WHERE id = $1 LIMIT 1`,
        [decoded.id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ data: { user: null, session: null }, error: null });
      }

      const u = rows[0];
      const user = {
        id: u.id,
        email: u.email,
        role: u.roleId || u.role_id || 'learner',
        roleId: u.roleId || u.role_id || 'learner',
        user_metadata: {
          full_name: u.full_name || u.username || u.email?.split('@')[0],
          username: u.username,
          ...(u.metadata || {})
        },
        app_metadata: {},
        created_at: u.created_at,
      };

      const session = {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600 * 24 * 30,
        user,
      };

      return NextResponse.json({ data: { user, session }, error: null });
    }

    return NextResponse.json({ error: { message: 'Invalid action' } }, { status: 404 });
  } catch (err: any) {
    console.error(`[AUTH_GET_ERROR] ${action}:`, err);
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
