import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupCron() {
  const sql = `
    -- Schedule Daily Motivation at 05:00 WIB (22:00 UTC)
    -- We use 'motivation_broadcast' mode
    SELECT cron.schedule(
        'send-daily-motivation',
        '0 22 * * *',
        $$
        SELECT net.http_post(
            url := '${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-weekly-reminder',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}"}'::jsonb,
            body := '{"mode": "motivation_broadcast"}'::jsonb
        )
        $$
    );
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error scheduling cron:', error);
  } else {
    console.log('Daily Motivation cron scheduled successfully');
  }
}

setupCron();
