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
