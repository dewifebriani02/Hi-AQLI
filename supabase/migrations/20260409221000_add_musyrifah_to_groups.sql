-- HI AQLI: ENHANCE MUFRADAT GROUPS SCHEMA
-- Purpose: Add musyrifah details and group start date to mufradat_groups.

DO $$ 
BEGIN 
  -- 1. Add musyrifah_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='musyrifah_name') THEN 
    ALTER TABLE public.mufradat_groups ADD COLUMN musyrifah_name TEXT; 
  END IF;

  -- 2. Add musyrifah_phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='musyrifah_phone') THEN 
    ALTER TABLE public.mufradat_groups ADD COLUMN musyrifah_phone TEXT; 
  END IF;

  -- 3. Add start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_groups' AND column_name='start_date') THEN 
    ALTER TABLE public.mufradat_groups ADD COLUMN start_date TIMESTAMPTZ DEFAULT now(); 
  END IF;

END $$;
