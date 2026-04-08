-- 1. ADMISSION FOR DELETE ON USERS
-- Allow Admins and Superadmins to delete any user profile
DROP POLICY IF EXISTS "permissive_delete_users" ON public.users;
CREATE POLICY "permissive_delete_users" ON public.users FOR DELETE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 2. ADMISSION FOR DELETE ON ROLES_ADMIN
-- Allow Admins and Superadmins to manage the admin list
DROP POLICY IF EXISTS "permissive_delete_roles_admin" ON public.roles_admin;
CREATE POLICY "permissive_delete_roles_admin" ON public.roles_admin FOR DELETE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

