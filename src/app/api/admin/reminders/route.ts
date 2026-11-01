import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthContext } from '@/lib/auth-server';
import { isFullAdmin, isStaff } from '@/lib/db-policy';
import { whatsappService } from '@/lib/services/whatsapp';

// Actions restricted to full admins (admin / superadmin); musyrifah is denied.
const FULL_ADMIN_ACTIONS = new Set(['delete_template', 'update_schedule', 'trigger_now']);

function requiresFullAdmin(action: string): boolean {
  return FULL_ADMIN_ACTIONS.has(action) || action.startsWith('delete_');
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx.userId) {
      return NextResponse.json({ success: false, error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    if (!isStaff(ctx)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak.' }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Body JSON tidak valid.' }, { status: 400 });
    }

    const action = typeof body?.action === 'string' ? body.action : '';
    const { userId } = body || {};

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action wajib diisi.' }, { status: 400 });
    }

    if (requiresFullAdmin(action) && !isFullAdmin(ctx)) {
      return NextResponse.json(
        { success: false, error: 'Hanya admin yang diizinkan menjalankan aksi ini.' },
        { status: 403 }
      );
    }

    if (action === 'fetch_status') {
      const status = await whatsappService.getStatus();
      return NextResponse.json({ success: true, data: status });
    }

    if (action === 'fetch_settings') {
      const { rows: templates } = await query(
        `SELECT * FROM public.mufradat_reminder_templates ORDER BY created_at ASC`
      );
      const { rows: configs } = await query(`SELECT * FROM public.mufradat_reminder_configs`);
      return NextResponse.json({ success: true, templates, configs });
    }

    if (action === 'save_template') {
      const { id, category, content } = body;
      if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ success: false, error: 'Konten template wajib diisi.' }, { status: 400 });
      }
      let savedRow;
      if (id) {
        const { rows } = await query(
          `UPDATE public.mufradat_reminder_templates SET content = $1 WHERE id = $2 RETURNING *`,
          [content, id]
        );
        savedRow = rows[0];
      } else {
        if (typeof category !== 'string' || !category.trim()) {
          return NextResponse.json({ success: false, error: 'Kategori template wajib diisi.' }, { status: 400 });
        }
        const newId = crypto.randomUUID();
        const { rows } = await query(
          `INSERT INTO public.mufradat_reminder_templates (id, category, content, created_at) VALUES ($1, $2, $3, now()) RETURNING *`,
          [newId, category, content]
        );
        savedRow = rows[0];
      }
      return NextResponse.json({ success: true, data: savedRow });
    }

    if (action === 'delete_template') {
      const { id } = body;
      if (typeof id !== 'string' || !id.trim()) {
        return NextResponse.json({ success: false, error: 'ID template wajib diisi.' }, { status: 400 });
      }
      await query(`DELETE FROM public.mufradat_reminder_templates WHERE id = $1`, [id]);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_schedule') {
      const { category, schedule } = body;
      if (typeof category !== 'string' || !category.trim() || typeof schedule !== 'string' || !schedule.trim()) {
        return NextResponse.json(
          { success: false, error: 'Kategori dan jadwal (cron) wajib diisi.' },
          { status: 400 }
        );
      }
      await query(
        `INSERT INTO public.mufradat_reminder_configs (id, category, schedule_cron, is_active, updated_at)
         VALUES ($1, $2, $3, true, now())
         ON CONFLICT (id) DO UPDATE SET schedule_cron = EXCLUDED.schedule_cron, updated_at = now()`,
        [category, category, schedule]
      );
      return NextResponse.json({ success: true, message: `Jadwal ${category} diupdate: ${schedule}` });
    }

    if (action === 'fetch_groups') {
      const groups = await whatsappService.getGroups();
      return NextResponse.json({ success: true, groups });
    }

    if (action === 'unblock') {
      if (typeof userId !== 'string' || !userId.trim()) {
        return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
      }
      await query(
        `UPDATE public.users SET wa_blocked_at = null, wa_failed_count = 0 WHERE id = $1`,
        [userId]
      );
      return NextResponse.json({ success: true, message: 'Blokir WhatsApp berhasil dibuka' });
    }

    if (action === 'trigger_now') {
      if (typeof userId !== 'string' || !userId.trim()) {
        return NextResponse.json({ success: false, error: 'User ID wajib dipilih.' }, { status: 400 });
      }
      const { rows } = await query(
        `SELECT id, username, full_name, whatsapp, phone FROM public.users WHERE id = $1`,
        [userId]
      );
      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Peserta tidak ditemukan.' }, { status: 404 });
      }
      const targetUser = rows[0];
      const targetPhone = targetUser.whatsapp || targetUser.phone;
      if (!targetPhone) {
        return NextResponse.json({ success: false, error: 'Nomor WhatsApp peserta belum terisi.' }, { status: 400 });
      }
      const message = typeof body?.customMessage === 'string' && body.customMessage.trim()
        ? body.customMessage.trim()
        : `Assalamu'alaikum ${targetUser.full_name || targetUser.username},\n\nIni adalah pesan pengingat resmi dari Hi-AQLI. Semangat terus belajar Al-Qur'an hari ini ya! ✨\n\n_Team Hi-AQLI_ 🌸`;

      const sendRes = await whatsappService.sendTextMessage(targetPhone, message);

      // Record to whatsapp_logs for dashboard audit trail
      try {
        await query(
          `INSERT INTO public.whatsapp_logs (id, user_id, recipient, message, status, type, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
          [
            crypto.randomUUID(),
            userId,
            targetPhone,
            message,
            sendRes.success ? 'sent' : 'failed',
            'test_reminder',
            JSON.stringify({
              provider: sendRes.provider,
              messageId: sendRes.messageId,
              watzap_response: sendRes.details
            })
          ]
        );
      } catch (logErr) {
        console.warn('[WHATSAPP_LOG_WARN]: Failed to insert whatsapp_log:', logErr);
      }

      if (!sendRes.success) {
        return NextResponse.json({
          success: false,
          error: sendRes.error || 'Gagal mengirim pesan WhatsApp.'
        }, { status: 502 });
      }
      return NextResponse.json({
        success: true,
        message: `Pesan berhasil dikirim via ${sendRes.provider}! (ID: ${sendRes.messageId || 'OK'})`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[REMINDERS_API_ERROR]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
