import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hiaqli.pro';

  let redirectTo = '/';
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
      // Only same-site relative paths, so the login flow can't be used as an open redirect.
      if (typeof parsed.redirectTo === 'string' && /^\/(?![\/\\])/.test(parsed.redirectTo)) {
        redirectTo = parsed.redirectTo;
      }
    } catch (e) {}
  }

  if (errorParam || !code) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(errorParam || 'Login Google dibatalkan')}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      console.error('[GOOGLE_TOKEN_EXCHANGE_ERROR]', errJson);
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent('Gagal menukarkan token autentikasi Google.')}`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent('Gagal mengambil data profil Google.')}`
      );
    }

    const profile = await userInfoRes.json();
    const email = profile.email?.trim().toLowerCase();
    const fullName = profile.name || email.split('@')[0];
    const picture = profile.picture || null;

    if (!email) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent('Email Google tidak ditemukan.')}`
      );
    }
    // Accounts are matched by email, so only trust emails Google has verified.
    if (profile.email_verified !== true) {
      return NextResponse.redirect(
        `${appUrl}/login?error=${encodeURIComponent('Email Google belum terverifikasi.')}`
      );
    }

    // 3. Query or create user in PostgreSQL
    const { rows } = await query(
      `SELECT * FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    let userRow;
    if (rows.length > 0) {
      userRow = rows[0];
      // Update avatar or metadata if available
      if (picture && (!userRow.metadata?.avatar_url && !userRow.avatar_url)) {
        const metadata = { ...(userRow.metadata || {}), avatar_url: picture };
        await query(
          `UPDATE public.users SET metadata = $1, updated_at = now() WHERE id = $2`,
          [JSON.stringify(metadata), userRow.id]
        );
        userRow.metadata = metadata;
      }
    } else {
      const id = uuidv4();
      const username = profile.given_name || email.split('@')[0];
      const metadata = { avatar_url: picture, full_name: fullName };

      await query(
        `INSERT INTO public.users (
          id, email, username, full_name, role_id, "roleId", metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'learner', 'learner', $5, now(), now())`,
        [id, email, username, fullName, JSON.stringify(metadata)]
      );

      const created = await query(`SELECT * FROM public.users WHERE id = $1 LIMIT 1`, [id]);
      userRow = created.rows[0];
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.roleId || userRow.role_id || 'learner',
      roleId: userRow.roleId || userRow.role_id || 'learner',
      user_metadata: {
        full_name: userRow.full_name || userRow.username || email.split('@')[0],
        username: userRow.username,
        avatar_url: picture,
        ...(userRow.metadata || {}),
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

    const response = NextResponse.redirect(
      `${appUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}&token=${encodeURIComponent(token)}`
    );

    response.cookies.set('hiaqli_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('[GOOGLE_OAUTH_CALLBACK_ERROR]', err);
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(err.message || 'Terjadi kesalahan autentikasi Google.')}`
    );
  }
}
