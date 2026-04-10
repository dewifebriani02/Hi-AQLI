-- HI AQLI: HALAQAH_REGISTRATIONS SCHEMA SYNC & CACHE RELOAD
-- Run this in Supabase SQL Editor to resolve "could not find updated column" errors.

DO $$ 
BEGIN 
  -- 1. Ensure all expected columns exist in halaqah_registrations
  -- Standardizing and adding missing tracking columns
  
  -- RENAME CAMELCASE IF EXIST
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='updatedAt') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "updatedAt" TO updated_at; 
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='createdAt') THEN 
    ALTER TABLE public.halaqah_registrations RENAME COLUMN "createdAt" TO created_at; 
  END IF;

  -- ADD COLUMNS IF MISSING
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='updated_at') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='created_at') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN created_at TIMESTAMPTZ DEFAULT now(); 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='registration_fee') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN registration_fee NUMERIC DEFAULT 0; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='referral_code_used') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN referral_code_used TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='referral_discount_amount') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN referral_discount_amount NUMERIC DEFAULT 0; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='is_first_registration') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN is_first_registration BOOLEAN DEFAULT false; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='unique_code') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN unique_code INTEGER DEFAULT 0; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='whatsapp') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN whatsapp TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='metadata') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN metadata JSONB DEFAULT '{}'; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='payment_type') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN payment_type TEXT DEFAULT 'initial'; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='halaqah_registrations' AND column_name='billing_month') THEN 
    ALTER TABLE public.halaqah_registrations ADD COLUMN billing_month TEXT; 
  END IF;

END $$;

-- 2. FORCE PostgREST Schema Cache Reload
-- This is critical to resolve the "could not find the updated column... in schema cache" error.
NOTIFY pgrst, 'reload schema';

SELECT 'Schema sync complete and cache reload triggered!' as result;
