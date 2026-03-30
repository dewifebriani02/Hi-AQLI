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
