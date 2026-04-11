-- HI AQLI: FIX HALAQAH RLS FOR SUPERADMIN
-- Purpose: Allow SuperAdmins to manage halaqahs even if not explicitly in roles_admin.

-- 1. Update halaqahs policies
DROP POLICY IF EXISTS "Admin full access halaqahs" ON public.halaqahs;
CREATE POLICY "Admin full access halaqahs" ON public.halaqahs FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 2. Consistency fix for halaqah_registrations (Ensuring Admins & SuperAdmins can manage them)
DROP POLICY IF EXISTS "Admin full access halaqah_registrations" ON public.halaqah_registrations;
CREATE POLICY "Admin full access halaqah_registrations" ON public.halaqah_registrations FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
