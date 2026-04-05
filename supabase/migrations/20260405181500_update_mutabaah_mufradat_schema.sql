-- HI AQLI: MUTABAAH & HI MUFRADAT SCHEMA UPDATE
-- Purpose: Add missing columns for Mutabaah Saving (users.mutabaah_goals), 
--         fix Upsert logic for Mutabaah Logs, and standardize Mufradat Reactions.

-- 1. UPDATE USERS TABLE
-- These columns are required for saving preferences and calculating targets.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mutabaah_goals') THEN 
    ALTER TABLE public.users ADD COLUMN mutabaah_goals TEXT[] DEFAULT '{}'; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_target_verses') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_target_verses INTEGER DEFAULT 5; 
  END IF;
END $$;

-- 2. UPDATE MUTABAAH_LOGS TABLE
-- Add UNIQUE constraint to enable 'onConflict: user_id, activity_id, date' upsert logic.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_activity_date') THEN
    ALTER TABLE public.mutabaah_logs ADD CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_id, date);
  END IF;
END $$;

-- 3. UPDATE MUFRADAT_REACTIONS TABLE
-- Standardize column names to match the frontend 'reaction_type' and add 'group_id' for filtering.
DO $$ 
BEGIN 
  -- Rename 'type' to 'reaction_type' if it exists and 'reaction_type' doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_reactions' AND column_name='type') AND 
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_reactions' AND column_name='reaction_type') THEN 
    ALTER TABLE public.mufradat_reactions RENAME COLUMN "type" TO reaction_type; 
  END IF;

  -- Add 'group_id' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mufradat_reactions' AND column_name='group_id') THEN 
    ALTER TABLE public.mufradat_reactions ADD COLUMN group_id UUID REFERENCES public.mufradat_groups(id) ON DELETE CASCADE; 
  END IF;
END $$;

-- 4. UPDATE PAGE_EXAMS (Standardization check)
-- Just ensuring consistency if it was missed in earlier migrations.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_exams' AND column_name='group_id') THEN 
    ALTER TABLE public.page_exams ADD COLUMN group_id UUID REFERENCES public.mufradat_groups(id); 
  END IF;
END $$;

-- SUCCESS MARKER
SELECT 'Mutabaah and Mufradat schema updated successfully!' as result;
