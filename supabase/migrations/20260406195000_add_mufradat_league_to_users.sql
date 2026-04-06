-- HI AQLI: MUFRADAT WEEKLY LEAGUE (LIGA MINGGUAN)
-- Purpose: Track weekly activity and assign leagues.

DO $$ 
BEGIN 
  -- 1. Add mufradat_weekly_points (INTEGER, DEFAULT 0)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_weekly_points') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_weekly_points INTEGER DEFAULT 0; 
  END IF; 
  
  -- 2. Add mufradat_league (TEXT, DEFAULT 'Perunggu')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_league') THEN 
    ALTER TABLE public.users ADD COLUMN mufradat_league TEXT DEFAULT 'Perunggu'; 
  END IF; 

  -- 3. Add last_league_reset_at (TIMESTAMPTZ)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_league_reset_at') THEN 
    ALTER TABLE public.users ADD COLUMN last_league_reset_at TIMESTAMPTZ; 
  END IF; 
END $$;

-- Update existing users to Perunggu if not set
UPDATE public.users SET mufradat_league = 'Perunggu' WHERE mufradat_league IS NULL;

-- Success Marker
SELECT 'Weekly League columns successfully added to users table!' as result;
