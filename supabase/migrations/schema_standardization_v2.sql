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
