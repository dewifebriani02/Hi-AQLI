-- HI AQLI: WHATSAPP LOGS FOR AUTOMATION
-- Purpose: Track automated messages to prevent duplicate reminders.

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    type TEXT NOT NULL, -- e.g., 'weekly_reminder'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for preventing duplicate weekly reminders
-- Ensures we only send one reminder per user per week type
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_type_date ON public.whatsapp_logs (user_id, type, ((created_at AT TIME ZONE 'UTC')::date));

-- RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can see all logs" ON public.whatsapp_logs;
CREATE POLICY "Admin can see all logs" 
ON public.whatsapp_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);
