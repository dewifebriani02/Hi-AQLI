-- ADD BLACKLIST TO USERS TABLE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_blacklisted') THEN 
        ALTER TABLE public.users ADD COLUMN is_blacklisted BOOLEAN DEFAULT false; 
    END IF; 
END $$;

-- RLS Update (Optional but good practice)
-- Ensure blacklisted users are restricted if possible via policies, 
-- but a middleware/app-level check is more reliable for "Menu restriction".
