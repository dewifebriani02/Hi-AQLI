-- HI AQLI: GROUP-BASED LEADERBOARD FIX (v2 - Robust)
-- Purpose: Implement automatic group filtering using join-based RLS.
-- This version doesn't depend on 'group_id' column being populated in the table.

-- 1. DROPS OLD POLICIES FOR CLEAN UP
DROP POLICY IF EXISTS "Allow users to see own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view all quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Group-based select for quiz_attempts" ON public.quiz_attempts;

-- 2. CREATE ROBUST GROUP-BASED SELECT POLICY
-- Matches scores if the AUTHOR (user_id) belongs to the same GROUP as the VIEWER (auth.uid()).
DROP POLICY IF EXISTS "Group-based select for quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "Group-based select for quiz_attempts" ON public.quiz_attempts FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = quiz_attempts.user_id 
    AND u.mufradat_group_id = (SELECT mufradat_group_id FROM public.users WHERE id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
);

-- 3. ENSURE INSERT IS STILL ALLOWED FOR OWN ATTEMPTS
DROP POLICY IF EXISTS "Users can insert own attempts with group check" ON public.quiz_attempts;
CREATE POLICY "Users can insert own attempts with group check" ON public.quiz_attempts FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 4. OPTIONAL: Add group_id column just for future caching (not strictly needed for v2 but good for speed)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='group_id') THEN 
    ALTER TABLE public.quiz_attempts ADD COLUMN group_id UUID; 
  END IF;
END $$;

-- 5. SUCCESS MARKER
SELECT 'Leaderboard Group Fix v2 (Robust) successfully applied!' as result;

