-- HI AQLI: DATABASE SCHEMA CONSOLIDATION V1
-- Purpose: Standardize column names to snake_case and add missing columns to resolve 400/PGRST204 errors.

-- 1. FIX USERS TABLE
-- Add missing columns if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='followed_halaqahs') THEN 
    ALTER TABLE public.users ADD COLUMN followed_halaqahs TEXT[] DEFAULT '{}'; 
  END IF; 
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='points') THEN 
    ALTER TABLE public.users ADD COLUMN points INTEGER DEFAULT 0; 
  END IF; 
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_id') THEN 
    ALTER TABLE public.users ADD COLUMN role_id TEXT DEFAULT 'learner'; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN 
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); 
  END IF;
END $$;

-- 2. FIX QUIZ ATTEMPTS TABLE
-- Standardize column names to snake_case
DO $$ 
BEGIN 
  -- Rename quizId to quiz_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='quizId') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "quizId" TO quiz_id; 
  END IF;

  -- Rename surahId to surah_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='surahId') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "surahId" TO surah_id; 
  END IF;

  -- Rename totalQuestions to total_questions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='totalQuestions') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "totalQuestions" TO total_questions; 
  END IF;

  -- Rename isPassed to is_passed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='isPassed') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "isPassed" TO is_passed; 
  END IF;

  -- Rename durationSeconds to duration_seconds
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='durationSeconds') THEN 
    ALTER TABLE public.quiz_attempts RENAME COLUMN "durationSeconds" TO duration_seconds; 
  END IF;

  -- Add verse_id if missing (using standardized naming)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='verse_id') THEN 
    -- If verseNumber exists, rename it (used in early versions)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='verseNumber') THEN 
      ALTER TABLE public.quiz_attempts RENAME COLUMN "verseNumber" TO verse_id;
      ALTER TABLE public.quiz_attempts ALTER COLUMN verse_id TYPE TEXT USING verse_id::TEXT;
    ELSE
      ALTER TABLE public.quiz_attempts ADD COLUMN verse_id TEXT; 
    END IF;
  END IF;
END $$;

-- 3. ENSURE RLS POLICIES USE THE NEW COLUMN NAMES
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
CREATE POLICY "permissive_select_quiz" 
ON public.quiz_attempts FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "permissive_insert_quiz" ON public.quiz_attempts;
CREATE POLICY "permissive_insert_quiz" 
ON public.quiz_attempts FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());
