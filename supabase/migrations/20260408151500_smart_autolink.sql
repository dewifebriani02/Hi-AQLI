-- HI AQLI: SMART AUTO-LINK TRIGGER
-- Purpose: Safely link new Auth users with historical migration data by Email.

-- 1. PREPARE FOREIGN KEYS FOR CASCADING UPDATES
-- We need to ensure that when a user's ID is updated from a placeholder to a real Auth ID, 
-- all their history (quizzes, registrations, etc.) follows them.

DO $$ 
BEGIN
    -- Update halaqah_registrations
    ALTER TABLE IF EXISTS public.halaqah_registrations 
    DROP CONSTRAINT IF EXISTS "halaqah_registrations_userId_fkey",
    ADD CONSTRAINT "halaqah_registrations_userId_fkey" 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    -- Update quiz_attempts
    ALTER TABLE IF EXISTS public.quiz_attempts 
    DROP CONSTRAINT IF EXISTS "quiz_attempts_user_id_fkey",
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    -- Update donations
    ALTER TABLE IF EXISTS public.donations 
    DROP CONSTRAINT IF EXISTS "donations_userId_fkey",
    ADD CONSTRAINT "donations_userId_fkey" 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE;

    -- Update roles_admin
    ALTER TABLE IF EXISTS public.roles_admin 
    DROP CONSTRAINT IF EXISTS "roles_admin_id_fkey",
    ADD CONSTRAINT "roles_admin_id_fkey" 
    FOREIGN KEY (id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    -- Update voucher_redemptions
    ALTER TABLE IF EXISTS public.voucher_redemptions 
    DROP CONSTRAINT IF EXISTS "voucher_redemptions_user_id_fkey",
    ADD CONSTRAINT "voucher_redemptions_user_id_fkey" 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    -- Update mufradat_reactions
    ALTER TABLE IF EXISTS public.mufradat_reactions 
    DROP CONSTRAINT IF EXISTS "mufradat_reactions_from_user_id_fkey",
    ADD CONSTRAINT "mufradat_reactions_from_user_id_fkey" 
    FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.mufradat_reactions 
    DROP CONSTRAINT IF EXISTS "mufradat_reactions_to_user_id_fkey",
    ADD CONSTRAINT "mufradat_reactions_to_user_id_fkey" 
    FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    -- Update mabar participants
    ALTER TABLE IF EXISTS public.mufradat_mabar_participants 
    DROP CONSTRAINT IF EXISTS "mufradat_mabar_participants_user_id_fkey",
    ADD CONSTRAINT "mufradat_mabar_participants_user_id_fkey" 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

END $$;

-- 2. CREATE SMART AUTO-LINK FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_user_id UUID;
    v_username TEXT;
BEGIN
    -- Check if a user with this email already exists in public.users (from migration)
    SELECT id INTO existing_user_id 
    FROM public.users 
    WHERE email = NEW.email 
    LIMIT 1;

    -- Extract username from metadata or email
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'username', 
        split_part(NEW.email, '@', 1)
    );

    IF existing_user_id IS NOT NULL THEN
        -- SMART LINK: Update the placeholder ID to the new Auth ID
        -- Thanks to ON UPDATE CASCADE, all history will be linked automatically.
        UPDATE public.users 
        SET id = NEW.id,
            username = COALESCE(username, v_username),
            updated_at = NOW()
        WHERE id = existing_user_id;
        
        RAISE NOTICE 'Smart Link: Linked new Auth ID % to existing record % for email %', NEW.id, existing_user_id, NEW.email;
    ELSE
        -- NEW USER: Create a fresh record in public.users
        INSERT INTO public.users (id, email, username, points, created_at, updated_at)
        VALUES (NEW.id, NEW.email, v_username, 0, NOW(), NOW());
        
        RAISE NOTICE 'Smart Link: Created new public record for %', NEW.email;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE TRIGGER ON auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. VERIFYING RLS
-- Ensure the users table has RLS that allows the trigger to work (SECURITY DEFINER handles this usually)
-- but we also want users to see their own data.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users 
FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE TO authenticated USING (auth.uid() = id);
