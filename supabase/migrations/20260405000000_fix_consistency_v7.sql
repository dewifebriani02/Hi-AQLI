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
CREATE POLICY "Public select halaqahs" ON public.halaqahs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access halaqahs" ON public.halaqahs;
CREATE POLICY "Admin full access halaqahs" ON public.halaqahs FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()));

-- SUCCESS MARKER
SELECT 'Database schema successfully standardized for consistency (V7)!' as result;

