import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { whatsappService, normalizePhoneNumber } from '@/lib/services/whatsapp';

const FALLBACK_ADMIN_WA = '628567712914';

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

async function resolveAdminWaNumbers(): Promise<string[]> {
  const numbers = new Set<string>();
  const envRaw = process.env.ADMIN_WHATSAPP_NUMBER || '';
  for (const part of envRaw.split(',')) {
    const norm = normalizePhoneNumber(part.trim());
    if (norm) numbers.add(norm);
  }

  try {
    const { rows } = await query(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(u.whatsapp), ''), NULLIF(TRIM(u.phone), '')) AS phone
       FROM public.users u
       WHERE u.id IN (
         SELECT id FROM public.roles_admin
         UNION
         SELECT id FROM public.roles_superadmin
       )`
    );
    for (const r of rows) {
      const norm = normalizePhoneNumber(r.phone || '');
      if (norm) numbers.add(norm);
    }
  } catch (err) {
    console.warn('[REPORTS] Failed to resolve admin WA numbers:', err);
  }

  if (numbers.size === 0) {
    numbers.add(FALLBACK_ADMIN_WA);
  }
  return Array.from(numbers);
}

const CATEGORY_LABELS: Record<string, string> = {
  koreksi_konten: 'Koreksi Ayat / Harakat / Terjemah / Materi',
  koreksi_konten_arab: 'Koreksi Penulisan Arab / Harakat',
  koreksi_rujukan_ai: 'Koreksi Jawaban / Rujukan Hi Asisten AQLI',
  koreksi_kuis: 'Koreksi Soal / Kunci Jawaban Kuis',
  kendala_teknis: 'Kendala Teknis / Tombol Error',
  saran_fitur: 'Masukan & Saran Perbaikan',
};

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
    const contextTitle = body.context_title ? String(body.context_title).trim().slice(0, 240) : null;
    const contextExcerpt = body.context_excerpt ? String(body.context_excerpt).trim().slice(0, 1500) : null;
    const rawDesc = String(body.description || '').trim().slice(0, 3000);
    const description = rawDesc || `${contextTitle ? `[${contextTitle}] ` : ''}Laporan cepat (${category})`;

    if (!contextTitle && !rawDesc) {
      return NextResponse.json(
        { success: false, error: 'Mohon pilih bagian halaman yang ingin dilaporkan.' },
        { status: 400 }
      );
    }

    let userName = body.user_name ? String(body.user_name).trim().slice(0, 120) : null;
    let userEmail = body.user_email ? String(body.user_email).trim().slice(0, 150) : null;
    let userPhone: string | null = null;

    if (ctx.userId) {
      const uRes = await query(
        `SELECT username, full_name, email, whatsapp, phone FROM users WHERE id = $1 LIMIT 1`,
        [ctx.userId]
      );
      if (uRes.rows[0]) {
        userName = userName || uRes.rows[0].full_name || uRes.rows[0].username || null;
        userEmail = userEmail || uRes.rows[0].email || null;
        userPhone = uRes.rows[0].whatsapp || uRes.rows[0].phone || null;
      }
    }

    const reporterDisplay = userName || 'Thalibah / Pengunjung';
    const insertRes = await query(
      `INSERT INTO app_reports (
        user_id, user_name, user_email, module_name, page_path, category, context_title, context_excerpt, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        ctx.userId || null,
        reporterDisplay,
        userEmail,
        moduleName,
        pagePath,
        category,
        contextTitle,
        contextExcerpt,
        description,
      ]
    );

    const createdReport = insertRes.rows[0];

    // Send WhatsApp notification to Admin(s) automatically via WatZap / Fonnte gateway
    const categoryLabel = CATEGORY_LABELS[category] || category;
    const contactStr = userPhone ? ` (+${normalizePhoneNumber(userPhone)})` : userEmail ? ` (${userEmail})` : '';
    const waAdminMessage =
      `Assalamu'alaikum Admin HI AQLI 🌸\n\n` +
      `Ada *Laporan / Koreksi Modul* baru dari Thalibah:\n` +
      `👤 *Pelapor:* ${reporterDisplay}${contactStr}\n` +
      `📦 *Modul:* ${moduleName}\n` +
      `📍 *Bagian:* ${contextTitle || pagePath}\n` +
      `🏷️ *Kategori:* ${categoryLabel}\n` +
      `📝 *Detail:* ${description}\n` +
      (contextExcerpt ? `💬 *Cuplikan:* "${contextExcerpt.slice(0, 220)}"\n` : '') +
      `🔗 *Halaman:* https://hiaqli.pro${pagePath}\n\n` +
      `Tinjau daftar laporan di Portal Admin:\n` +
      `👉 https://hiaqli.pro/admin/reports`;

    let whatsappSent = false;
    try {
      const adminNumbers = await resolveAdminWaNumbers();
      const sendResults = await Promise.all(
        adminNumbers.map(async (phone) => {
          const sendRes = await whatsappService.sendTextMessage(phone, waAdminMessage);
          try {
            await query(
              `INSERT INTO public.whatsapp_logs (id, user_id, recipient, message, status, type, metadata, created_at)
               VALUES ($1, $2, $3, $4, $5, 'app_issue_report', $6, now())`,
              [
                crypto.randomUUID(),
                ctx.userId || null,
                phone,
                waAdminMessage,
                sendRes.success ? 'sent' : 'failed',
                JSON.stringify({
                  reportId: createdReport?.id,
                  moduleName,
                  pagePath,
                  category,
                  provider: sendRes.provider,
                  error: sendRes.error || null,
                }),
              ]
            );
          } catch (logErr) {
            console.warn('[REPORTS_WA_LOG_WARN]:', logErr);
          }
          return sendRes;
        })
      );
      whatsappSent = sendResults.some((r) => r.success);
    } catch (waErr) {
      console.warn('[POST /api/reports] WhatsApp admin notify failed:', waErr);
    }

    const directWaUrl = `https://wa.me/${FALLBACK_ADMIN_WA}?text=${encodeURIComponent(waAdminMessage)}`;

    return NextResponse.json({
      success: true,
      data: createdReport,
      whatsappSent,
      directWaUrl,
    });
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
