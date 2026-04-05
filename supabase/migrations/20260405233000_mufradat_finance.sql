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
