-- HI AQLI: DATABASE SCHEMA CONSISTENCY FIX V7
-- Purpose: Standardize halaqahs table, add musyrifah, and cleanup users table.
-- Resolves: 400 Bad Request / PGRST204 errors when managing classes and registrations.

-- 1. FIX HALAQAH_REGISTRATIONS TABLE (Missed columns in previous migrations)
DO $$ 
BEGIN 
  -- Ensure metadata JSONB exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='metadata') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN metadata JSONB DEFAULT '{}'; 
  END IF;

  -- Rename amount (if camelCase exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='amountPaid') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "amountPaid" TO amount; 
  END IF;
END $$;

-- 2. FIX HALAQAHS TABLE STANDARDIZATION
DO $$ 
BEGIN 
  -- Add musyrifah column (Missing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='musyrifah') THEN 
    ALTER TABLE public.halaqahs ADD COLUMN musyrifah TEXT; 
  END IF;

  -- Rename programType to program_type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='programType') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "programType" TO program_type; 
  END IF;

  -- Rename startDate to start_date
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='startDate') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "startDate" TO start_date; 
  END IF;

  -- Rename endDate to end_date
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='endDate') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "endDate" TO end_date; 
  END IF;

  -- Rename durationWeeks to duration_weeks
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='durationWeeks') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "durationWeeks" TO duration_weeks; 
  END IF;

  -- Rename isPremium to is_premium
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='isPremium') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "isPremium" TO is_premium; 
  END IF;

  -- Rename hasExam to has_exam
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='hasExam') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "hasExam" TO has_exam; 
  END IF;

  -- Rename hasCertificate to has_certificate
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='hasCertificate') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "hasCertificate" TO has_certificate; 
  END IF;

  -- Rename basePrice to base_price
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='basePrice') THEN 
    ALTER TABLE public.halaqahs RENAME COLUMN "basePrice" TO base_price; 
  END IF;

  -- Ensure quota column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqahs' AND column_name='quota') THEN 
    ALTER TABLE public.halaqahs ADD COLUMN quota INTEGER DEFAULT 40; 
  END IF;
END $$;

-- 3. USERS TABLE FINAL CLEANUP
DO $$ 
BEGIN 
  -- Handle followedHalaqahs -> followed_hala_qahs (Ensure synchronization)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followedHalaqahs') THEN 
    UPDATE public.users SET followed_halaqahs = "followedHalaqahs" WHERE followed_halaqahs = '{}';
    ALTER TABLE public.users DROP COLUMN "followedHalaqahs";
  END IF;
END $$;

-- 4. REFRESH RLS POLICIES (Safety check)
ALTER TABLE public.halaqahs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select halaqahs" ON public.halaqahs;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access halaqahs" ON public.halaqahs;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()));

-- SUCCESS MARKER
SELECT 'Database schema successfully standardized for consistency (V7)!' as result;

-- ADD MUSYRIFAH COLUMNS TO MUFRADAT GROUPS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='musyrifah_name') THEN 
        ALTER TABLE public.mufradat_groups ADD COLUMN musyrifah_name TEXT; 
    END IF; 
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='musyrifah_phone') THEN 
        ALTER TABLE public.mufradat_groups ADD COLUMN musyrifah_phone TEXT; 
    END IF;
END $$;
-- 1. ADMISSION FOR DELETE ON USERS
-- Allow Admins and Superadmins to delete any user profile
DROP POLICY IF EXISTS "permissive_delete_users" ON public.users;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR DELETE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 2. ADMISSION FOR DELETE ON ROLES_ADMIN
-- Allow Admins and Superadmins to manage the admin list
DROP POLICY IF EXISTS "permissive_delete_roles_admin" ON public.roles_admin;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR DELETE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- HI AQLI: MUTABAAH & HI MUFRADAT SCHEMA UPDATE
-- Purpose: Add missing columns for Mutabaah Saving (users.mutabaah_goals), 
--         fix Upsert logic for Mutabaah Logs, and standardize Mufradat Reactions.

-- 1. UPDATE USERS TABLE
-- These columns are required for saving preferences and calculating targets.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mutabaah_goals') THEN 
    ALTER TABLE public.users ADD COLUMN mutabaah_goals TEXT[] DEFAULT '{}'; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_target_verses') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_target_verses INTEGER DEFAULT 5; 
  END IF;
END $$;

-- 2. UPDATE MUTABAAH_LOGS TABLE
-- Add UNIQUE constraint to enable 'onConflict: user_id, activity_id, date' upsert logic.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_activity_date') THEN
    ALTER TABLE public.mutabaah_logs ADD CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_id, date);
  END IF;
END $$;

-- 3. UPDATE MUFRADAT_REACTIONS TABLE
-- Standardize column names to match the frontend 'reaction_type' and add 'group_id' for filtering.
DO $$ 
BEGIN 
  -- Rename 'type' to 'reaction_type' if it exists and 'reaction_type' doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_reactions' AND column_name='type') AND 
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_reactions' AND column_name='reaction_type') THEN 
    ALTER TABLE public.mufradat_reactions RENAME COLUMN "type" TO reaction_type; 
  END IF;

  -- Add 'group_id' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_reactions' AND column_name='group_id') THEN 
    ALTER TABLE public.mufradat_reactions ADD COLUMN group_id UUID REFERENCES public.mufradat_groups(id) ON DELETE CASCADE; 
  END IF;
END $$;

-- 4. UPDATE PAGE_EXAMS (Standardization check)
-- Just ensuring consistency if it was missed in earlier migrations.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_exams' AND column_name='group_id') THEN 
    ALTER TABLE public.page_exams ADD COLUMN group_id UUID REFERENCES public.mufradat_groups(id); 
  END IF;
END $$;

-- SUCCESS MARKER
SELECT 'Mutabaah and Mufradat schema updated successfully!' as result;
-- HI AQLI: REFERRAL & PRICING SCHEMA UPDATE
-- Menambahkan sistem referral (AQLI-NamaXX) dan biaya pendaftaran terpilah.

-- 1. UPDATE TABEL USERS (Referral & Hadiah)
DO $$ 
BEGIN 
  -- Referral Code (Unique)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referral_code') THEN 
    ALTER TABLE public.users ADD COLUMN referral_code TEXT UNIQUE; 
  END IF;

  -- Saldo Referral (Reward akumulasi)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referral_balance') THEN 
    ALTER TABLE public.users ADD COLUMN referral_balance NUMERIC DEFAULT 0; 
  END IF;

  -- Referred By ID (UUID)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referred_by_id') THEN 
    ALTER TABLE public.users ADD COLUMN referred_by_id UUID REFERENCES public.users(id); 
  END IF;
END $$;

-- 2. UPDATE TABEL HALAQAH_REGISTRATIONS (Log Transaksi Referral & Biaya)
DO $$ 
BEGIN 
  -- Tracking kode referral yang digunakan saat mendaftar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='referral_code_used') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN referral_code_used TEXT; 
  END IF;

  -- Tracking besaran diskon referral yang diberikan (-5rb)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='referral_discount_amount') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN referral_discount_amount NUMERIC DEFAULT 0; 
  END IF;

  -- Tracking biaya pendaftaran yang dibebankan (+10rb)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='registration_fee') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN registration_fee NUMERIC DEFAULT 0; 
  END IF;

  -- Status apakah ini pendaftaran pertama (Audit)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='is_first_registration') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN is_first_registration BOOLEAN DEFAULT false; 
  END IF;
END $$;

-- SUCCESS MARKER
SELECT 'Referral and Pricing schema updated successfully!' as result;
-- HI MUFRADAT: FINANCE & PAYOUT SCHEMA
-- 1. Updates `mufradat_groups` for Muallimah coordinates
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='muallimah_name') THEN 
    ALTER TABLE public.mufradat_groups ADD COLUMN muallimah_name TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='muallimah_phone') THEN 
    ALTER TABLE public.mufradat_groups ADD COLUMN muallimah_phone TEXT; 
  END IF;
END $$;

-- 2. Updates `halaqah_registrations` for explicit Unique Code tracking
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='unique_code') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN unique_code INTEGER DEFAULT 0; 
  END IF;
END $$;

-- 3. Create `mufradat_payouts` for Disbursement History
CREATE TABLE IF NOT EXISTS public.mufradat_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_month TEXT NOT NULL UNIQUE, -- FORMAT 'YYYY-MM'
    total_revenue NUMERIC NOT NULL DEFAULT 0,
    total_unique_code NUMERIC NOT NULL DEFAULT 0,
    payout_breakdown JSONB NOT NULL, -- Detailed breakdown per Musyrifah, Muallimah, etc.
    status TEXT NOT NULL DEFAULT 'sudah_cair',
    disbursed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUCCESS MARKER
SELECT 'Hi Mufradat Finance schema updated successfully!' as result;
-- FIX: ENABLE RLS AND POLICIES FOR MUFRADAT PAYOUTS
ALTER TABLE public.mufradat_payouts ENABLE ROW LEVEL SECURITY;

-- 1. Policy for SELECT
DROP POLICY IF EXISTS "Allow authenticated users to view payouts" ON public.mufradat_payouts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
FOR SELECT
TO authenticated
USING (true);

-- 2. Policy for INSERT
DROP POLICY IF EXISTS "Allow authenticated users to insert payouts" ON public.mufradat_payouts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Policy for UPDATE
DROP POLICY IF EXISTS "Allow authenticated users to update payouts" ON public.mufradat_payouts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Policy for DELETE
DROP POLICY IF EXISTS "Allow authenticated users to delete payouts" ON public.mufradat_payouts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
FOR DELETE
TO authenticated
USING (true);

-- SUCCESS MARKER
SELECT 'Hi Mufradat Payouts RLS fixed!' as result;

-- HI MUFRADAT: ADD BANK DETAILS TO USERS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_name') THEN 
    ALTER TABLE public.users ADD COLUMN bank_name TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_account_number') THEN 
    ALTER TABLE public.users ADD COLUMN bank_account_number TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_account_holder') THEN 
    ALTER TABLE public.users ADD COLUMN bank_account_holder TEXT; 
  END IF;
END $$;

-- SUCCESS MARKER
SELECT 'Hi Mufradat bank details added to users table!' as result;
-- HI AQLI: VOUCHER RLS ADMIN POLICIES
-- Purpose: Allow Admins to see all vouchers and redemptions for reporting.

-- 1. VOUCHERS TABLE
-- Drop existing public policy to avoid confusion (it's already restrictive)
DROP POLICY IF EXISTS "Admins can manage all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR ALL 
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
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- Note: Users can still see their own active vouchers and their own redemptions via existing policies.

-- HI AQLI: REGISTRATIONS RLS SUPERADMIN POLICIES
-- Purpose: Allow Superadmins (roles_superadmin) to see all registrations, donations, and vouchers.

-- 1. HALAQAH_REGISTRATIONS TABLE (Main Fix)
DROP POLICY IF EXISTS "Admins/Superadmins can see all registrations" ON public.halaqah_registrations;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins/Superadmins can manage all registrations" ON public.halaqah_registrations;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR ALL 
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
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 3. VOUCHERS & REDEMPTIONS (Redundant safety check)
DROP POLICY IF EXISTS "Voucher Superadmin Select" ON public.vouchers;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Redemption Superadmin Select" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid()));

-- Note: This migration ensures that Superadmin accounts have the same level of access as 'admin' accounts.

-- HI AQLI: MUFRADAT DAILY STREAK (KONSISTENSI HARIAN)
-- Purpose: Track daily participation streak for Mufradat quizzes.

DO $$ 
BEGIN 
  -- 1. Add mufradat_streak_count (INTEGER)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_streak_count') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_streak_count INTEGER DEFAULT 0; 
  END IF; 
  
  -- 2. Add last_mufradat_quiz_at (TIMESTAMPTZ)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_mufradat_quiz_at') THEN 
    ALTER TABLE public.users ADD COLUMN last_mufradat_quiz_at TIMESTAMPTZ; 
  END IF; 
END $$;

-- Success Marker
SELECT 'Daily Streak columns successfully added to users table!' as result;
-- HI AQLI: USER BADGES (LENCANA KEHORMATAN)
-- Purpose: Store achievements for Hi Mufradat.

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user only gets the same badge type once
    UNIQUE(user_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all badges" ON public.user_badges;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);

-- HI AQLI: MUFRADAT WEEKLY LEAGUE (LIGA MINGGUAN)
-- Purpose: Track weekly activity and assign leagues.

DO $$ 
BEGIN 
  -- 1. Add mufradat_weekly_points (INTEGER, DEFAULT 0)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_weekly_points') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_weekly_points INTEGER DEFAULT 0; 
  END IF; 
  
  -- 2. Add mufradat_league (TEXT, DEFAULT 'Perunggu')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_league') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_league TEXT DEFAULT 'Perunggu'; 
  END IF; 

  -- 3. Add last_league_reset_at (TIMESTAMPTZ)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_league_reset_at') THEN 
    ALTER TABLE public.users ADD COLUMN last_league_reset_at TIMESTAMPTZ; 
  END IF; 
END $$;

-- Update existing users to Perunggu if not set
UPDATE public.users SET mufradat_league = 'Perunggu' WHERE mufradat_league IS NULL;

-- Success Marker
SELECT 'Weekly League columns successfully added to users table!' as result;
-- HI AQLI: MABAR SYSTEM (MULTIPLAYER PER JUZ)
-- Purpose: Scheduled competitive sessions for Hi Mufradat.

-- 1. MABAR SESSIONS (ROOMS)
CREATE TABLE IF NOT EXISTS public.mufradat_mabar_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    juz_id INTEGER NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'finished'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MABAR PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.mufradat_mabar_participants (
    session_id UUID NOT NULL REFERENCES public.mufradat_mabar_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points_earned INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.mufradat_mabar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mufradat_mabar_participants ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES: Sessions
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.mufradat_mabar_sessions;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage sessions" ON public.mufradat_mabar_sessions;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4. POLICIES: Participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.mufradat_mabar_participants;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can join sessions" ON public.mufradat_mabar_participants;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own score" ON public.mufradat_mabar_participants;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 5. REALTIME ENABLING
-- We need to ensure participants table is in the realtime publication
-- This is often done via: ALTER PUBLICATION supabase_realtime ADD TABLE mufradat_mabar_participants;
-- But typically handled via Supabase Dashboard or a global catch-all.

-- 6. INDEXING
CREATE INDEX IF NOT EXISTS idx_mabar_sessions_scheduled ON public.mufradat_mabar_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mabar_participants_score ON public.mufradat_mabar_participants(points_earned DESC);

-- ADD BLACKLIST TO USERS TABLE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_blacklisted') THEN 
        ALTER TABLE public.users ADD COLUMN is_blacklisted BOOLEAN DEFAULT false; 
    END IF; 
END $$;

-- RLS Update (Optional but good practice)
-- Ensure blacklisted users are restricted if possible via policies, 
-- but a middleware/app-level check is more reliable for "Menu restriction".
-- HI AQLI: LEADERBOARD REACTIONS (MUFRADAT CONGRATS)
-- Purpose: Allow thalibah to motivate each other with Mabruk/Semangat reactions.

CREATE TABLE IF NOT EXISTS public.mufradat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'mabruk', 'semangat', 'hebat'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mufradat_reactions ENABLE ROW LEVEL SECURITY;

-- 1. All authenticated users can see reactions to display on leaderboard
DROP POLICY IF EXISTS "Users can see all reactions" ON public.mufradat_reactions;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (true);

-- 2. Users can only insert reactions from themselves
DROP POLICY IF EXISTS "Users can insert their own reactions" ON public.mufradat_reactions;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (from_user_id = auth.uid());

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_to_user ON public.mufradat_reactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_from_user ON public.mufradat_reactions(from_user_id);

-- SUCCESS MARKER
SELECT 'Mufradat reactions table created successfully!' as result;

-- HI AQLI: ADD MUFRADAT_ACCESSIBLE_JUZ TO USERS
-- Purpose: Support granular Juz access rights per user.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mufradat_accessible_juz JSONB DEFAULT '[]';

-- SUCCESS MARKER
SELECT 'Database successfully updated with mufradat_accessible_juz!' as result;
-- HI AQLI: ADD MUFRADAT_LEAVE_FROM TO USERS
-- Purpose: Support exact start dates for leave (cuti) rather than just until dates.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mufradat_leave_from TIMESTAMPTZ;

-- SUCCESS MARKER
SELECT 'Database successfully updated with mufradat_leave_from!' as result;
-- ADD START DATE TO MUFRADAT GROUPS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='start_date') THEN 
        ALTER TABLE public.mufradat_groups ADD COLUMN start_date DATE; 
    END IF; 
END $$;
-- HI AQLI: ADD START_DATE & VERIFIED_AT TO HALAQAH_REGISTRATIONS
-- Purpose: Fix "Could not find column verified_at" error in Admin Registrations.

DO $$ 
BEGIN 
  -- 1. Add start_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='start_date') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN start_date TIMESTAMPTZ; 
  END IF;

  -- 2. Add verified_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='verified_at') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN verified_at TIMESTAMPTZ; 
  END IF;
  
  -- 3. Add billing_month column (Ensures registration tracking is complete)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='billing_month') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN billing_month TEXT; 
  END IF;
END $$;

-- SUCCESS MARKER
SELECT 'Halaqah Registrations schema updated with start_date and verified_at!' as result;
-- HI MUFRADAT SUBSCRIPTION & BILLING MIGRATION
-- Purpose: Support automated monthly billing, grace periods, and leave (Cuti) management.

-- 1. UPDATE HALAQAH_REGISTRATIONS TABLE
DO $$ 
BEGIN 
  -- Add payment_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='payment_type') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN payment_type TEXT DEFAULT 'initial'; 
  END IF; 

  -- Add billing_month column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='billing_month') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN billing_month TEXT; 
  END IF; 
END $$;

-- 2. UPDATE USERS TABLE
DO $$ 
BEGIN 
  -- Add mufradat_status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_status') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_status TEXT DEFAULT 'inactive'; 
  END IF; 

  -- Add mufradat_due_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_due_date') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_due_date TIMESTAMPTZ; 
  END IF; 

  -- Add mufradat_leave_until column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_leave_until') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_leave_until TIMESTAMPTZ; 
  END IF; 

  -- Add mufradat_leave_balance column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_leave_balance') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_leave_balance INTEGER DEFAULT 3; 
  END IF; 
END $$;

-- 3. INITIAL DATA MIGRATION (Optional: activate any currently active users)
-- This assumes if they have a mufradat_group_id, they should be 'active'
UPDATE public.users 
SET mufradat_status = 'active'
WHERE mufradat_group_id IS NOT NULL 
AND mufradat_status = 'inactive';
-- CREATE EXEC_SQL FUNCTION
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
-- HI AQLI: RLS EMERGENCY RESET & FIX V2
-- Purpose: Remove all existing policies and set a clean, working permission structure.
-- Handling both snake_case and quoted camelCase for resilience.

-- 1. DROP ALL EXISTING POLICIES (Users & Quiz Attempts)
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('users', 'quiz_attempts') AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Specifically drop by name for extra safety
DROP POLICY IF EXISTS "Allow users to see all profiles" ON public.users;
DROP POLICY IF EXISTS "permissive_select_users" ON public.users;
DROP POLICY IF EXISTS "permissive_insert_users" ON public.users;
DROP POLICY IF EXISTS "permissive_update_users" ON public.users;
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "permissive_insert_quiz" ON public.quiz_attempts;

-- 2. RESET RLS (ensure it's on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 3. APPLY CLEAN POLICIES FOR USERS TABLE
-- SELECT: Everyone can see all profiles
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Users can only create their own profile during registration
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- UPDATE: Users update own, OR Admins/Superadmins update all
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4. APPLY CLEAN POLICIES FOR QUIZ ATTEMPTS
-- SELECT: Users see own, Admins see all
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- INSERT: Functional for saving kuis
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 5. ENSURE COLUMN EXISTS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN 
    ALTER TABLE public.users ADD COLUMN phone TEXT; 
  END IF; 
END $$;

-- SQL Script: Hi Mufradat Quiz attempts table correction
-- Run this in your Supabase SQL Editor to enable Page Leaderboard and Tracking

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    surah_id TEXT DEFAULT '0',
    verse_id TEXT DEFAULT '0',
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    wrong_words JSONB DEFAULT '[]'::jsonb,
    page_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns to existing table if necessary
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='wrong_words') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN wrong_words JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='page_id') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN page_id INTEGER;
    END IF;
END $$;

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "Users can view all quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Helpful index for leaderboard speed
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);

-- HI AQLI: GROUP-BASED LEADERBOARD FIX (v2 - Robust)
-- Purpose: Implement automatic group filtering using join-based RLS.
-- This version doesn't depend on 'group_id' column being populated in the table.

-- 1. DROPS OLD POLICIES FOR CLEAN UP
DROP POLICY IF EXISTS "Allow users to see own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view all quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Group-based select for quiz_attempts" ON public.quiz_attempts;

-- 2. CREATE ROBUST GROUP-BASED SELECT POLICY
-- Matches scores if the AUTHOR (user_id) belongs to the same GROUP as the VIEWER (auth.uid()).
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = quiz_attempts.user_id 
    AND u.mufradat_group_id = (SELECT mufradat_group_id FROM public.users WHERE id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
);

-- 3. ENSURE INSERT IS STILL ALLOWED FOR OWN ATTEMPTS
DROP POLICY IF EXISTS "Allow users to insert own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "permissive_insert_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own attempts with group check" ON public.quiz_attempts;

DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 4. OPTIONAL: Add group_id column just for future caching (not strictly needed for v2 but good for speed)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='group_id') THEN 
    ALTER TABLE public.quiz_attempts ADD COLUMN group_id UUID; 
  END IF;
END $$;

-- 5. SUCCESS MARKER
SELECT 'Leaderboard Group Fix v2 (Robust) successfully applied!' as result;

-- HI AQLI: CONSOLIDATED DATABASE FIX (HI MUFRADAT & TIKRAR) v6 - FINAL
-- Purpose: Standardize all column names, add missing fields, and RESET RLS POLICIES.
-- Instructions: Run this script ONCE in your Supabase SQL Editor.

-- 1. FIX HALAQAH_REGISTRATIONS TABLE (COLUMN NAMES & NEW FIELDS)
DO $$ 
BEGIN 
  -- Standarisasi Nama Kolom (Rename camelCase to snake_case)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='userId') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "userId" TO user_id; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='halaqahId') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "halaqahId" TO halaqah_id; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='halaqahTitle') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "halaqahTitle" TO halaqah_title; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='userName') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "userName" TO user_name; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='userEmail') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "userEmail" TO user_email; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='isPaid') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "isPaid" TO is_paid; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='proofFileName') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "proofFileName" TO proof_file_name; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='senderName') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "senderName" TO sender_name; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='paymentMethod') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "paymentMethod" TO payment_method; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='targetJuz') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "targetJuz" TO target_juz; 
  END IF;

  -- TAMBAHKAN KOLOM JIKA BELUM ADA (Nuclear Option)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='payment_type') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN payment_type TEXT DEFAULT 'initial'; 
  END IF; 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='billing_month') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN billing_month TEXT; 
  END IF; 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='whatsapp') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN whatsapp TEXT; 
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='metadata') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN metadata JSONB DEFAULT '{}'; 
  END IF;
END $$;

-- 2. FIX OTHER TABLES (DONATIONS, PAGE_EXAMS) - Consistency
DO $$ 
BEGIN 
  -- Donations Table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='userId') THEN 
    ALTER TABLE public.donations RENAME COLUMN "userId" TO user_id; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='campaignTitle') THEN 
    ALTER TABLE public.donations RENAME COLUMN "campaignTitle" TO campaign_title; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='senderName') THEN 
    ALTER TABLE public.donations RENAME COLUMN "senderName" TO sender_name; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='proofFileName') THEN 
    ALTER TABLE public.donations RENAME COLUMN "proofFileName" TO proof_file_name; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='paymentMethod') THEN 
    ALTER TABLE public.donations RENAME COLUMN "paymentMethod" TO payment_method; 
  END IF;

  -- Page Exams Table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_exams' AND column_name='userId') THEN 
    ALTER TABLE public.page_exams RENAME COLUMN "userId" TO user_id; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_exams' AND column_name='userName') THEN 
    ALTER TABLE public.page_exams RENAME COLUMN "userName" TO user_name; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_exams' AND column_name='requestedAt') THEN 
    ALTER TABLE public.page_exams RENAME COLUMN "requestedAt" TO requested_at; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_exams' AND column_name='verifiedAt') THEN 
    ALTER TABLE public.page_exams RENAME COLUMN "verifiedAt" TO verified_at; 
  END IF;
END $$;

-- 3. RESET RLS POLICIES FOR HALAQAH_REGISTRATIONS
ALTER TABLE public.halaqah_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own registrations" ON public.halaqah_registrations;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can see own registrations" ON public.halaqah_registrations;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()));

-- 4. FIX USERS TABLE
DO $$ 
BEGIN 
  -- Standarisasi Nama Kolom Profile
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followedHalaqahs') THEN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followed_halaqahs') THEN 
      ALTER TABLE public.users RENAME COLUMN "followedHalaqahs" TO followed_halaqahs;
    ELSE
      UPDATE public.users SET followed_halaqahs = "followedHalaqahs" WHERE followed_halaqahs = '{}';
      ALTER TABLE public.users DROP COLUMN "followedHalaqahs";
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isTikrarPaid') THEN 
    ALTER TABLE public.users RENAME COLUMN "isTikrarPaid" TO is_tikrar_paid; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tikrarLevel') THEN 
    ALTER TABLE public.users RENAME COLUMN "tikrarLevel" TO tikrar_level; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tikrarStartDate') THEN 
    ALTER TABLE public.users RENAME COLUMN "tikrarStartDate" TO tikrar_start_date; 
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradatGroupId') THEN 
    ALTER TABLE public.users RENAME COLUMN "mufradatGroupId" TO mufradat_group_id; 
  END IF;

  -- Kolom Langganan & Status Cuti
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_status') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_status TEXT DEFAULT 'inactive'; 
  END IF; 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_due_date') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_due_date TIMESTAMPTZ; 
  END IF; 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_leave_until') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_leave_until TIMESTAMPTZ; 
  END IF; 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_leave_balance') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_leave_balance INTEGER DEFAULT 3; 
  END IF; 
END $$;

-- 5. INITIAL ACTIVATION
UPDATE public.users 
SET mufradat_status = 'active'
WHERE mufradat_group_id IS NOT NULL 
AND mufradat_status = 'inactive';

-- SUCCESS MARKER
SELECT 'Database successfully standardized and secured (v6 Final)!' as result;

-- 1. CREATE MUFRADAT GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.mufradat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    whatsapp_link TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ADD GROUP COLUMN TO USERS TABLE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_group_id') THEN 
        ALTER TABLE public.users ADD COLUMN mufradat_group_id UUID REFERENCES public.mufradat_groups(id); 
    END IF; 
END $$;

-- 3. INITIAL DATA: Create Grup 1 if no groups exist
INSERT INTO public.mufradat_groups (name, whatsapp_link, member_count)
SELECT 'Grup 1', 'https://chat.whatsapp.com/example-link', 0
WHERE NOT EXISTS (SELECT 1 FROM public.mufradat_groups LIMIT 1);

-- 4. RLS POLICIES FOR ADMINS
ALTER TABLE public.mufradat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all groups" ON public.mufradat_groups;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all groups" ON public.mufradat_groups;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR ALL
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- HI AQLI: DATABASE SCHEMA CONSOLIDATION V1
-- Purpose: Standardize column names to snake_case and add missing columns to resolve 400/PGRST204 errors.

-- 1. FIX USERS TABLE
-- Add missing columns if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followed_halaqahs') THEN 
    ALTER TABLE public.users ADD COLUMN followed_halaqahs TEXT[] DEFAULT '{}'; 
  END IF; 
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='points') THEN 
    ALTER TABLE public.users ADD COLUMN points INTEGER DEFAULT 0; 
  END IF; 
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_id') THEN 
    ALTER TABLE public.users ADD COLUMN role_id TEXT DEFAULT 'learner'; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN 
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); 
  END IF;
END $$;

-- 2. FIX QUIZ ATTEMPTS TABLE
-- Standardize column names to snake_case
DO $$ 
BEGIN 
  -- Rename quizId to quiz_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='quizId') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "quizId" TO quiz_id; 
  END IF;

  -- Rename surahId to surah_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='surahId') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "surahId" TO surah_id; 
  END IF;

  -- Rename totalQuestions to total_questions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='totalQuestions') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "totalQuestions" TO total_questions; 
  END IF;

  -- Rename isPassed to is_passed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='isPassed') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "isPassed" TO is_passed; 
  END IF;

  -- Rename durationSeconds to duration_seconds
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='durationSeconds') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "durationSeconds" TO duration_seconds; 
  END IF;

  -- Add verse_id if missing (using standardized naming)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='verse_id') THEN 
    -- If verseNumber exists, rename it (used in early versions)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='verseNumber') THEN 
      ALTER TABLE public.quiz_attempts RENAME COLUMN "verseNumber" TO verse_id;
      ALTER TABLE public.quiz_attempts ALTER COLUMN verse_id TYPE TEXT USING verse_id::TEXT;
    ELSE
      ALTER TABLE public.quiz_attempts ADD COLUMN verse_id TEXT; 
    END IF;
  END IF;
END $$;

-- 3. ENSURE RLS POLICIES USE THE NEW COLUMN NAMES
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "permissive_insert_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- HI AQLI: DATABASE SCHEMA STANDARDIZATION V2
-- Purpose: Rename remaining camelCase columns to snake_case in halaqah_registrations and users tables.
-- Resolves: 400 Bad Request / PGRST204 errors in Mufradat and Tikrar modules.

-- 1. FIX HALAQAH_REGISTRATIONS TABLE
DO $$ 
BEGIN 
  -- Rename userId to user_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='userId') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "userId" TO user_id; 
  END IF;

  -- Rename halaqahId to halaqah_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='halaqahId') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "halaqahId" TO halaqah_id; 
  END IF;

  -- Rename isPaid to is_paid
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='isPaid') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "isPaid" TO is_paid; 
  END IF;

  -- Rename proofFileName to proof_file_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='proofFileName') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "proofFileName" TO proof_file_name; 
  END IF;

  -- Rename userName to user_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='userName') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "userName" TO user_name; 
  END IF;

  -- Rename userEmail to user_email
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='userEmail') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "userEmail" TO user_email; 
  END IF;

  -- Rename senderName to sender_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='senderName') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "senderName" TO sender_name; 
  END IF;

  -- Rename paymentMethod to payment_method
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='paymentMethod') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "paymentMethod" TO payment_method; 
  END IF;

  -- Rename targetJuz to target_juz
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='targetJuz') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "targetJuz" TO target_juz; 
  END IF;
END $$;

-- 2. FIX USERS TABLE
DO $$ 
BEGIN 
  -- Handle followedHalaqahs -> followed_halaqahs (if both exist, migration is needed)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followedHalaqahs') THEN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followed_halaqahs') THEN 
      ALTER TABLE public.users RENAME COLUMN "followedHalaqahs" TO followed_halaqahs;
    ELSE
      -- Both exist: migrate data then drop the camelCase one
      UPDATE public.users SET followed_halaqahs = "followedHalaqahs" WHERE followed_halaqahs = '{}';
      ALTER TABLE public.users DROP COLUMN "followedHalaqahs";
    END IF;
  END IF;

  -- Rename isTikrarPaid to is_tikrar_paid
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='isTikrarPaid') THEN 
    ALTER TABLE public.users RENAME COLUMN "isTikrarPaid" TO is_tikrar_paid; 
  END IF;

  -- Rename tikrarLevel to tikrar_level
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tikrarLevel') THEN 
    ALTER TABLE public.users RENAME COLUMN "tikrarLevel" TO tikrar_level; 
  END IF;

  -- Rename tikrarStartDate to tikrar_start_date
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tikrarStartDate') THEN 
    ALTER TABLE public.users RENAME COLUMN "tikrarStartDate" TO tikrar_start_date; 
  END IF;

  -- Rename mufradatGroupId to mufradat_group_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradatGroupId') THEN 
    ALTER TABLE public.users RENAME COLUMN "mufradatGroupId" TO mufradat_group_id; 
  END IF;
END $$;
-- HI AQLI: SECURITY & RLS PATCH V1
-- Purpose: Resolve 403 Forbidden and 500 Internal errors by standardizing RLS and Column access.

-- 1. ENABLE RLS ON ALL CORE TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_superadmin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halaqahs ENABLE ROW LEVEL SECURITY;

-- 2. USERS TABLE POLICIES
DROP POLICY IF EXISTS "Allow users to see all profiles" ON public.users;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.users;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id 
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  auth.uid() = id 
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 3. QUIZ ATTEMPTS POLICIES
DROP POLICY IF EXISTS "Allow users to see own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Allow users to insert own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 4. ROLES & CONFIGURATION
DROP POLICY IF EXISTS "Allow authenticated to see admins" ON public.roles_admin;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated to see halaqahs" ON public.halaqahs;
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. FOR SELECT 
TO authenticated 
USING (true);

-- 5. COLUMN ALIASING & UTILITIES (RUN AS POSTGRES)
-- Handle case-sensitivity for 'roleId' check if needed in custom functions
-- For now, the policies above use the base tables which is safer.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN 
    ALTER TABLE public.users ADD COLUMN phone TEXT; 
  END IF; 
END $$;

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
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public. 
  FOR SELECT USING (is_active = TRUE AND (expiry_date IS NULL OR expiry_date > now()));

-- Users can view their own redemptions
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own redemptions
DROP POLICY IF EXISTS "" ON public.;
CREATE POLICY "" ON public.
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can manage everything
-- (Assuming there's an 'admin' role or specific UIDs in a 'roles' table, 
-- but for simplicity we'll just allow it if we have a way to identify admins)
-- For now, let's just make it public read but restricted write if needed.

