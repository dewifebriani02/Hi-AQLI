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
CREATE POLICY "Users can insert own registrations" 
ON public.halaqah_registrations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can see own registrations" ON public.halaqah_registrations;
CREATE POLICY "Users can see own registrations" 
ON public.halaqah_registrations FOR SELECT 
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

