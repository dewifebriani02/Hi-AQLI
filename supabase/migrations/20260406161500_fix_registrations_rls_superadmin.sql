-- HI AQLI: REGISTRATIONS RLS SUPERADMIN POLICIES
-- Purpose: Allow Superadmins (roles_superadmin) to see all registrations, donations, and vouchers.

-- 1. HALAQAH_REGISTRATIONS TABLE (Main Fix)
DROP POLICY IF EXISTS "Admins/Superadmins can see all registrations" ON public.halaqah_registrations;
CREATE POLICY "Admins/Superadmins can see all registrations" ON public.halaqah_registrations FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins/Superadmins can manage all registrations" ON public.halaqah_registrations;
CREATE POLICY "Admins/Superadmins can manage all registrations" ON public.halaqah_registrations FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 2. DONATIONS TABLE
DROP POLICY IF EXISTS "Admins/Superadmins can see all donations" ON public.donations;
CREATE POLICY "Admins/Superadmins can see all donations" ON public.donations FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 3. VOUCHERS & REDEMPTIONS (Redundant safety check)
DROP POLICY IF EXISTS "Voucher Superadmin Select" ON public.vouchers;
CREATE POLICY "Voucher Superadmin Select" ON public.vouchers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Redemption Superadmin Select" ON public.voucher_redemptions;
CREATE POLICY "Redemption Superadmin Select" ON public.voucher_redemptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid()));

-- Note: This migration ensures that Superadmin accounts have the same level of access as 'admin' accounts.

