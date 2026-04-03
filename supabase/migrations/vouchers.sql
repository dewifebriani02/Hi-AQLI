-- VOUCHER & REDEMPTION SYSTEM MIGRATION
-- Purpose: Support promotional access and generic/unique discount codes.

-- 1. CREATE VOUCHERS TABLE
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'free_access', -- 'free_access', 'discount', etc.
  program_id TEXT DEFAULT 'mufradat', -- 'mufradat', 'tikrar', etc.
  expiry_date TIMESTAMPTZ,
  usage_limit INTEGER DEFAULT NULL, -- NULL means unlimited
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CREATE VOUCHER REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(voucher_id, user_id) -- Prevent double redemption of the same code
);

-- 3. ENABLE RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES
-- Users can view active vouchers
CREATE POLICY "Users can view active vouchers" ON public.vouchers 
  FOR SELECT USING (is_active = TRUE AND (expiry_date IS NULL OR expiry_date > now()));

-- Users can view their own redemptions
CREATE POLICY "Users can view their own redemptions" ON public.voucher_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own redemptions
CREATE POLICY "Users can insert their own redemptions" ON public.voucher_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can manage everything
-- (Assuming there's an 'admin' role or specific UIDs in a 'roles' table, 
-- but for simplicity we'll just allow it if we have a way to identify admins)
-- For now, let's just make it public read but restricted write if needed.
