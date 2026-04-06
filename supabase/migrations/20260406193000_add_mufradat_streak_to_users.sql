-- HI AQLI: MUFRADAT DAILY STREAK (KONSISTENSI HARIAN)
-- Purpose: Track daily participation streak for Mufradat quizzes.

DO $$ 
BEGIN 
  -- 1. Add mufradat_streak_count (INTEGER)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_streak_count') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_streak_count INTEGER DEFAULT 0; 
  END IF; 
  
  -- 2. Add last_mufradat_quiz_at (TIMESTAMPTZ)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_mufradat_quiz_at') THEN 
    ALTER TABLE public.users ADD COLUMN last_mufradat_quiz_at TIMESTAMPTZ; 
  END IF; 
END $$;

-- Success Marker
SELECT 'Daily Streak columns successfully added to users table!' as result;
