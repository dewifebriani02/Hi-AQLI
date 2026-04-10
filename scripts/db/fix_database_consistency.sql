-- Hi-AQLI Database Consistency & Integrity Patch
-- 1. Standardize column names (camelCase -> snake_case)
-- 2. Clean up redundant columns
-- 3. Add unique constraints for reliable upserts

-- ==========================================
-- 1. USERS Table Cleanup
-- ==========================================

-- Move data from "paidJuz" to paid_juz if paid_juz doesn't exist or is null
DO $$ 
BEGIN 
    -- Check if paid_juz column exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='paid_juz') THEN
        ALTER TABLE public.users ADD COLUMN paid_juz integer;
    END IF;
END $$;

-- Update data if "paidJuz" exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='paidJuz') THEN
        UPDATE public.users SET paid_juz = "paidJuz" WHERE paid_juz IS NULL AND "paidJuz" IS NOT NULL;
    END IF;
END $$;

-- Standardize role_id
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='roleId') THEN
        UPDATE public.users SET role_id = "roleId" WHERE role_id IS NULL AND "roleId" IS NOT NULL;
    END IF;
END $$;

-- ==========================================
-- 2. DONATIONS Table Cleanup
-- ==========================================

-- Standardize uniqueCode to unique_code
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='unique_code') THEN
        ALTER TABLE public.donations ADD COLUMN unique_code integer;
    END IF;
END $$;

-- Update data if "uniqueCode" exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='uniqueCode') THEN
        EXECUTE 'UPDATE public.donations SET unique_code = "uniqueCode" WHERE unique_code IS NULL AND "uniqueCode" IS NOT NULL';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='uniquecode') THEN
        EXECUTE 'UPDATE public.donations SET unique_code = uniquecode WHERE unique_code IS NULL AND uniquecode IS NOT NULL';
    END IF;
END $$;

-- Add Unique Constraint for Donations to prevent duplicates (sender_name + amount + created_at)
-- First, cleanup double entries if any
DELETE FROM public.donations a 
USING public.donations b 
WHERE a.id < b.id 
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND a.amount = b.amount 
  AND a.created_at = b.created_at;

-- Create constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_user_amount_created_key') THEN
        ALTER TABLE public.donations 
        ADD CONSTRAINT donations_user_amount_created_key 
        UNIQUE (user_id, amount, created_at);
    END IF;
END $$;

-- ==========================================
-- 3. MUTABAAH_LOGS Cleanup (from fix_unique_constraint.sql)
-- ==========================================

DELETE FROM public.mutabaah_logs a 
USING public.mutabaah_logs b 
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.activity_id = b.activity_id 
  AND a.date = b.date;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mutabaah_logs_user_activity_date_key') THEN
        ALTER TABLE public.mutabaah_logs 
        ADD CONSTRAINT mutabaah_logs_user_activity_date_key 
        UNIQUE (user_id, activity_id, date);
    END IF;
END $$;

-- ==========================================
-- 4. HOUSEKEEPING (Optional: Drop old columns AFTER verification)
-- ==========================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS "paidJuz";
-- ALTER TABLE public.users DROP COLUMN IF EXISTS "roleId";
-- ALTER TABLE public.donations DROP COLUMN IF EXISTS "uniqueCode";
