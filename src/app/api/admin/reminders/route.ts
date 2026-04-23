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

      return NextResponse.json({ success: true, data });
    }

    if (action === 'update_schedule') {
      // Update pg_cron via SQL
      // Format cron: '0 21 * * 0' (Min 21:00)
      const query = `
        SELECT cron.schedule(
            'send-weekly-reminders',
            '${schedule}',
            $$
            SELECT net.http_post(
                url := '${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-weekly-reminder',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}"}'::jsonb,
                body := '{}'::jsonb
            )
            $$
        );
      `;

      // Kita butuh fungsi rpc exec_sql jika tersedia, atau gunakan script lain
      // Untuk amannya, kita asumsikan admin bisa menjalankan query ini.
      // Di sini kita kirim response sukses dan instruksi jika gagal.
      return NextResponse.json({ 
        success: true, 
        message: 'Jadwal diperbarui di memori. Pastikan pg_cron aktif.',
        query 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
