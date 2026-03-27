-- HI AQLI: SECURITY & RLS PATCH V1
-- Purpose: Resolve 403 Forbidden and 500 Internal errors by standardizing RLS and Column access.

-- 1. ENABLE RLS ON ALL CORE TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_superadmin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halaqahs ENABLE ROW LEVEL SECURITY;

-- 2. USERS TABLE POLICIES
DROP POLICY IF EXISTS "Allow users to see all profiles" ON public.users;
CREATE POLICY "Allow users to see all profiles" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.users;
CREATE POLICY "Allow users to insert own profile" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
CREATE POLICY "Allow users to update own profile" 
ON public.users FOR UPDATE 
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

-- 3. QUIZ ATTEMPTS POLICIES
DROP POLICY IF EXISTS "Allow users to see own attempts" ON public.quiz_attempts;
CREATE POLICY "Allow users to see own attempts" 
ON public.quiz_attempts FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() 
  OR "userId" = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Allow users to insert own attempts" ON public.quiz_attempts;
CREATE POLICY "Allow users to insert own attempts" 
ON public.quiz_attempts FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid() OR "userId" = auth.uid());

-- 4. ROLES & CONFIGURATION
DROP POLICY IF EXISTS "Allow authenticated to see admins" ON public.roles_admin;
CREATE POLICY "Allow authenticated to see admins" 
ON public.roles_admin FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated to see halaqahs" ON public.halaqahs;
CREATE POLICY "Allow authenticated to see halaqahs" 
ON public.halaqahs FOR SELECT 
TO authenticated 
USING (true);

-- 5. COLUMN ALIASING & UTILITIES (RUN AS POSTGRES)
-- Handle case-sensitivity for 'roleId' check if needed in custom functions
-- For now, the policies above use the base tables which is safer.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN 
    ALTER TABLE public.users ADD COLUMN phone TEXT; 
  END IF; 
END $$;
