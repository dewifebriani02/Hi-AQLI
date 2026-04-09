-- HI AQLI: PROFILE ENHANCEMENT MIGRATION
-- Purpose: Add full_name and whatsapp to public.users and sync from existing phone column.

DO $$ 
BEGIN 
  -- 1. Add full_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN 
    ALTER TABLE public.users ADD COLUMN full_name TEXT; 
  END IF;

  -- 2. Add whatsapp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='whatsapp') THEN 
    ALTER TABLE public.users ADD COLUMN whatsapp TEXT; 
  END IF;

  -- 3. Sync data from phone to whatsapp if whatsapp is empty
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN 
    UPDATE public.users SET whatsapp = phone WHERE whatsapp IS NULL;
  END IF;

END $$;

-- 4. Ensure RLS policies are up to date (authenticated users can update their own profile)
-- (Already exists usually but ensuring it covers new columns via simple update policy)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
