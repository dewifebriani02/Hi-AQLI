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
