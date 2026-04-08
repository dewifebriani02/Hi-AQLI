-- HI AQLI: RLS EMERGENCY RESET & FIX V2
-- Purpose: Remove all existing policies and set a clean, working permission structure.
-- Handling both snake_case and quoted camelCase for resilience.

-- 1. DROP ALL EXISTING POLICIES (Users & Quiz Attempts)
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('users', 'quiz_attempts') AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Specifically drop by name for extra safety
DROP POLICY IF EXISTS "Allow users to see all profiles" ON public.users;
DROP POLICY IF EXISTS "permissive_select_users" ON public.users;
DROP POLICY IF EXISTS "permissive_insert_users" ON public.users;
DROP POLICY IF EXISTS "permissive_update_users" ON public.users;
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
DROP POLICY IF EXISTS "permissive_insert_quiz" ON public.quiz_attempts;

-- 2. RESET RLS (ensure it's on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 3. APPLY CLEAN POLICIES FOR USERS TABLE
-- SELECT: Everyone can see all profiles
DROP POLICY IF EXISTS "permissive_select_users" ON public.users;
CREATE POLICY "permissive_select_users" ON public.users FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Users can only create their own profile during registration
DROP POLICY IF EXISTS "permissive_insert_users" ON public.users;
CREATE POLICY "permissive_insert_users" ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- UPDATE: Users update own, OR Admins/Superadmins update all
DROP POLICY IF EXISTS "permissive_update_users" ON public.users;
CREATE POLICY "permissive_update_users" ON public.users FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4. APPLY CLEAN POLICIES FOR QUIZ ATTEMPTS
-- SELECT: Users see own, Admins see all
DROP POLICY IF EXISTS "permissive_select_quiz" ON public.quiz_attempts;
CREATE POLICY "permissive_select_quiz" ON public.quiz_attempts FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- INSERT: Functional for saving kuis
DROP POLICY IF EXISTS "permissive_insert_quiz" ON public.quiz_attempts;
CREATE POLICY "permissive_insert_quiz" ON public.quiz_attempts FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- 5. ENSURE COLUMN EXISTS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN 
    ALTER TABLE public.users ADD COLUMN phone TEXT; 
  END IF; 
END $$;

