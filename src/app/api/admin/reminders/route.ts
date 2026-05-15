import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { action, schedule, userId } = await req.json();

    if (action === 'trigger_now') {
      // Memanggil Edge Function secara internal
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-weekly-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const data = await response.json();
      console.log('--- Reminders Debug Log ---');
      console.log('Edge Function URL:', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-weekly-reminder`);
      console.log('Status:', response.status);
      console.log('Response Body:', JSON.stringify(data, null, 2));

      if (!response.ok || data.error) {
        return NextResponse.json({ success: false, error: data.error || `HTTP ${response.status}`, data }, { status: 500 });
      }

      const results = Array.isArray(data.results) ? data.results : [];
      const sent = results.filter((r: any) => r.status === 'sent').length;
      const failed = results.filter((r: any) => r.status === 'failed').length;
      const skipped = results.filter((r: any) => typeof r.status === 'string' && r.status.startsWith('skipped')).length;

      if (results.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada user yang diproses (cek schedule/status user atau kondisi hari)', data });
      }
      if (sent === 0) {
        const reasons = results.map((r: any) => `${r.user || r.id}: ${r.status}`).join(', ');
        return NextResponse.json({ success: false, error: `0 pesan terkirim. ${reasons}`, data });
      }

      return NextResponse.json({ success: true, summary: { sent, failed, skipped, total: results.length }, data });
    }

    if (action === 'fetch_settings') {
      const { data: templates } = await supabaseAdmin.from('mufradat_reminder_templates').select('*');
      const { data: configs } = await supabaseAdmin.from('mufradat_reminder_configs').select('*');
      return NextResponse.json({ success: true, templates: templates || [], configs: configs || [] });
    }

    if (action === 'save_template') {
      const { id, category, content } = await req.json();
      const { data, error } = id 
        ? await supabaseAdmin.from('mufradat_reminder_templates').update({ content }).eq('id', id).select().single()
        : await supabaseAdmin.from('mufradat_reminder_templates').insert({ category, content }).select().single();
      
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === 'delete_template') {
      const { id } = await req.json();
      const { error } = await supabaseAdmin.from('mufradat_reminder_templates').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update_schedule') {
      const { category, schedule } = await req.json();
      const jobName = `reminder-${category}`;
      
      try {
        // 1. Update config in database
        await supabaseAdmin.from('mufradat_reminder_configs').upsert({ 
          category, 
          schedule_cron: schedule,
          updated_at: new Date().toISOString()
        });

        // 2. Update pg_cron job
        // Unschedule existing
        try {
          await supabaseAdmin.rpc('cron', {
            procedure_name: 'unschedule',
            args: { job_name: jobName }
          });
        } catch (e) {
          // Ignore if job doesn't exist
        }

        // Schedule new
        // Note: The Edge Function now needs a 'mode' parameter to know which category to send
        await supabaseAdmin.rpc('cron', {
          procedure_name: 'schedule',
          args: {
            job_name: jobName,
            schedule: schedule,
            command: `
              SELECT net.http_post(
                url := '${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-weekly-reminder',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}"}'::jsonb,
                body := '{"mode": "${category}"}'::jsonb
              )
            `
          }
        });

        return NextResponse.json({ success: true, message: `Jadwal ${category} diupdate: ${schedule}` });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
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

      const { error } = await supabaseAdmin
        .from('users')
        .update({ 
          wa_blocked_at: null, 
          wa_failed_count: 0 
        })
        .eq('id', userId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Blokir WhatsApp berhasil dibuka' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
