-- Fix: PostgREST returns 403 Forbidden for /whatsapp_logs and /roles_musyrifah
-- Why: Tables created without GRANT to the `authenticated` role,
--      so PostgREST rejects requests before evaluating RLS policies.
-- Effect: Authenticated users can now hit these endpoints; RLS still gates row visibility.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_logs TO authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles_musyrifah TO authenticated;
GRANT ALL ON public.roles_musyrifah TO service_role;

NOTIFY pgrst, 'reload schema';
