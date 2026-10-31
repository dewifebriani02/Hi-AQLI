import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;

    if (action === 'fetch_settings') {
      const { rows: templates } = await query(`SELECT * FROM public.mufradat_reminder_templates ORDER BY created_at ASC`);
      const { rows: configs } = await query(`SELECT * FROM public.mufradat_reminder_configs`);
      return NextResponse.json({ success: true, templates, configs });
    }

    if (action === 'save_template') {
      const { id, category, content } = body;
      let savedRow;
      if (id) {
        const { rows } = await query(
          `UPDATE public.mufradat_reminder_templates SET content = $1 WHERE id = $2 RETURNING *`,
          [content, id]
        );
        savedRow = rows[0];
      } else {
        const newId = uuidv4();
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
      await query(`DELETE FROM public.mufradat_reminder_templates WHERE id = $1`, [id]);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_schedule') {
      const { category, schedule } = body;
      await query(
        `INSERT INTO public.mufradat_reminder_configs (id, category, schedule_cron, is_active, updated_at)
         VALUES ($1, $2, $3, true, now())
         ON CONFLICT (id) DO UPDATE SET schedule_cron = EXCLUDED.schedule_cron, updated_at = now()`,
        [category, category, schedule]
      );
      return NextResponse.json({ success: true, message: `Jadwal ${category} diupdate: ${schedule}` });
    }

    if (action === 'fetch_groups') {
      const response = await fetch('https://api.fonnte.com/get-groups', {
        method: 'POST',
        headers: {
          'Authorization': process.env.FONNTE_API_KEY || ''
        }
      });
      const data = await response.json();
      return NextResponse.json({ success: true, groups: data.data || [] });
    }

    if (action === 'unblock') {
      if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      await query(
        `UPDATE public.users SET wa_blocked_at = null, wa_failed_count = 0 WHERE id = $1`,
        [userId]
      );
      return NextResponse.json({ success: true, message: 'Blokir WhatsApp berhasil dibuka' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
