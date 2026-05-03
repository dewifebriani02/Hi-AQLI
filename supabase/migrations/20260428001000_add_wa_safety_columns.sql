-- WA safety columns: opt-out, failure tracking, auto-block after repeated failures.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wa_opt_out BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wa_failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wa_blocked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.wa_opt_out IS 'User opted out of WA reminders';
COMMENT ON COLUMN public.users.wa_failed_count IS 'Consecutive Fonnte failures; reset to 0 on success';
COMMENT ON COLUMN public.users.wa_blocked_at IS 'Auto-blocked after N consecutive failures (likely invalid number)';

NOTIFY pgrst, 'reload schema';
