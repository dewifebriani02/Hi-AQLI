import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';

let tableInitialized = false;

async function ensureAppReportsTable() {
  if (tableInitialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS app_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      user_name TEXT,
      user_email TEXT,
      module_name TEXT NOT NULL,
      page_path TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'koreksi_konten',
      context_title TEXT,
      context_excerpt TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_note TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_app_reports_status_created ON app_reports(status, created_at DESC)`);
  tableInitialized = true;
}

export async function GET(req: Request) {
  try {
    await ensureAppReportsTable();
    const ctx = await getAuthContext(req);
    const isStaff = ctx.isAdmin || ctx.isSuperAdmin || ctx.isMusyrifah;

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') || '';

    if (isStaff) {
      const params: any[] = [];
      let whereSql = '';
      if (statusFilter && statusFilter !== 'all') {
        params.push(statusFilter);
        whereSql = `WHERE status = $1`;
      }
      const res = await query(
        `SELECT * FROM app_reports ${whereSql} ORDER BY created_at DESC LIMIT 200`,
        params
      );
      return NextResponse.json({ success: true, data: res.rows });
    }

    if (!ctx.userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const res = await query(
      `SELECT * FROM app_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [ctx.userId]
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: any) {
    console.error('[GET /api/reports] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat laporan.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureAppReportsTable();
    const ctx = await getAuthContext(req);
    const body = await req.json();

    const moduleName = String(body.module_name || 'Aplikasi Hi AQLI').trim().slice(0, 120);
    const pagePath = String(body.page_path || '/').trim().slice(0, 300);
    const category = String(body.category || 'koreksi_konten').trim().slice(0, 80);
    const contextTitle = body.context_title ? String(body.context_title).trim().slice(0, 200) : null;
    const contextExcerpt = body.context_excerpt ? String(body.context_excerpt).trim().slice(0, 1500) : null;
    const description = String(body.description || '').trim().slice(0, 3000);

    if (!description || description.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Mohon tuliskan detail kendala atau koreksi minimal 4 karakter.' },
        { status: 400 }
      );
    }

    let userName = body.user_name ? String(body.user_name).trim().slice(0, 120) : null;
    let userEmail = body.user_email ? String(body.user_email).trim().slice(0, 150) : null;

    if (ctx.userId && (!userName || !userEmail)) {
      const uRes = await query(`SELECT username, email FROM users WHERE id = $1 LIMIT 1`, [ctx.userId]);
      if (uRes.rows[0]) {
        userName = userName || uRes.rows[0].username || null;
        userEmail = userEmail || uRes.rows[0].email || null;
      }
    }

    const insertRes = await query(
      `INSERT INTO app_reports (
        user_id, user_name, user_email, module_name, page_path, category, context_title, context_excerpt, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        ctx.userId || null,
        userName || 'Thalibah / Pengunjung',
        userEmail,
        moduleName,
        pagePath,
        category,
        contextTitle,
        contextExcerpt,
        description,
      ]
    );

    return NextResponse.json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    console.error('[POST /api/reports] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengirim laporan.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureAppReportsTable();
    const ctx = await getAuthContext(req);
    const isStaff = ctx.isAdmin || ctx.isSuperAdmin || ctx.isMusyrifah;
    if (!isStaff) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id || '').trim();
    const status = String(body.status || 'resolved').trim();
    const adminNote = body.admin_note !== undefined ? String(body.admin_note).trim() : null;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID laporan wajib diisi.' }, { status: 400 });
    }

    const res = await query(
      `UPDATE app_reports
       SET status = $1,
           admin_note = COALESCE($2, admin_note),
           resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END
       WHERE id = $3
       RETURNING *`,
      [status, adminNote, id]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    console.error('[PATCH /api/reports] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui status laporan.' },
      { status: 500 }
    );
  }
}
