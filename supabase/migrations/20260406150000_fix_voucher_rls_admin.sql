-- HI AQLI: VOUCHER RLS ADMIN POLICIES
-- Purpose: Allow Admins to see all vouchers and redemptions for reporting.

-- 1. VOUCHERS TABLE
-- Drop existing public policy to avoid confusion (it's already restrictive)
DROP POLICY IF EXISTS "Admins can manage all vouchers" ON public.vouchers;
CREATE POLICY "Admins can manage all vouchers" 
ON public.vouchers FOR ALL 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 2. VOUCHER REDEMPTIONS TABLE
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.voucher_redemptions;
CREATE POLICY "Admins can view all redemptions" 
ON public.voucher_redemptions FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- Note: Users can still see their own active vouchers and their own redemptions via existing policies.
