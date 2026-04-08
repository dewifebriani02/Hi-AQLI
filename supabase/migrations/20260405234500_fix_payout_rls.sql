-- FIX: ENABLE RLS AND POLICIES FOR MUFRADAT PAYOUTS
ALTER TABLE public.mufradat_payouts ENABLE ROW LEVEL SECURITY;

-- 1. Policy for SELECT
DROP POLICY IF EXISTS "Allow authenticated users to view payouts" ON public.mufradat_payouts;
CREATE POLICY "Allow authenticated users to view payouts" ON public.mufradat_payouts
FOR SELECT
TO authenticated
USING (true);

-- 2. Policy for INSERT
DROP POLICY IF EXISTS "Allow authenticated users to insert payouts" ON public.mufradat_payouts;
CREATE POLICY "Allow authenticated users to insert payouts" ON public.mufradat_payouts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Policy for UPDATE
DROP POLICY IF EXISTS "Allow authenticated users to update payouts" ON public.mufradat_payouts;
CREATE POLICY "Allow authenticated users to update payouts" ON public.mufradat_payouts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Policy for DELETE
DROP POLICY IF EXISTS "Allow authenticated users to delete payouts" ON public.mufradat_payouts;
CREATE POLICY "Allow authenticated users to delete payouts" ON public.mufradat_payouts
FOR DELETE
TO authenticated
USING (true);

-- SUCCESS MARKER
SELECT 'Hi Mufradat Payouts RLS fixed!' as result;

