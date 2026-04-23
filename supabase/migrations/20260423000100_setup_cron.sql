-- HI AQLI: SCHEDULED REMINDERS SETUP
-- Purpose: Enable pg_cron and schedule the weekly reminder edge function.

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS net;

-- 2. Schedule the task
-- This will run every Sunday at 21:00 UTC
-- Note: Replace [PROJECT_REF] with your actual project reference ID.
-- Note: Replace [SERVICE_ROLE_KEY] with your actual service role key or use secrets.

SELECT cron.schedule(
    'send-weekly-reminders',
    '0 21 * * 0', -- 21:00 every Sunday
    $$
    SELECT net.http_post(
        url := 'https://[PROJECT_REF].functions.supabase.co/send-weekly-reminder',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
        body := '{}'::jsonb
    )
    $$
);
