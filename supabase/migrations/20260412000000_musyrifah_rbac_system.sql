-- HI AQLI: MUSYRIFAH RBAC SYSTEM
-- Implementing Role-Based Access Control for Musyrifah (program supervisors)
-- Musyrifah can CRUD data within their assigned programs but CANNOT delete

-- =====================================================
-- 1. CREATE MUSYRIFAH ROLE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.roles_musyrifah (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_programs TEXT[] NOT NULL DEFAULT '{}', -- Array: ['hi_mufradat', 'hi_tikrar', 'hi_ngaji', etc]
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.roles_musyrifah IS 'Musyrifah (program supervisors) with assigned program access - can CRUD but NOT delete';
COMMENT ON COLUMN public.roles_musyrifah.assigned_programs IS 'Array of program types this musyrifah can manage';

-- =====================================================
-- 2. ENABLE RLS ON MUSYRIFAH TABLE
-- =====================================================

ALTER TABLE public.roles_musyrifah ENABLE ROW LEVEL SECURITY;

-- 2.1. Admin/Superadmin can manage musyrifah roles
DROP POLICY IF EXISTS "Admins can manage musyrifah roles" ON public.roles_musyrifah;
CREATE POLICY "Admins can manage musyrifah roles" ON public.roles_musyrifah FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 2.2. Musyrifah can read their own role
DROP POLICY IF EXISTS "Musyrifah can read own role" ON public.roles_musyrifah;
CREATE POLICY "Musyrifah can read own role" ON public.roles_musyrifah FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- =====================================================
-- 3. RLS POLICIES FOR HALAQHS TABLE
-- =====================================================

-- 3.1. SELECT - Musyrifah can read halaqahs from assigned programs
DROP POLICY IF EXISTS "Musyrifah can read assigned halaqahs" ON public.halaqahs;
CREATE POLICY "Musyrifah can read assigned halaqahs" ON public.halaqahs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND program_type = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 3.2. INSERT - Musyrifah can create halaqahs in assigned programs
DROP POLICY IF EXISTS "Musyrifah can insert halaqahs" ON public.halaqahs;
CREATE POLICY "Musyrifah can insert halaqahs" ON public.halaqahs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND program_type = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 3.3. UPDATE - Musyrifah can update halaqahs in assigned programs
DROP POLICY IF EXISTS "Musyrifah can update halaqahs" ON public.halaqahs;
CREATE POLICY "Musyrifah can update halaqahs" ON public.halaqahs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND program_type = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND program_type = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 3.4. DELETE - NO policy for musyrifah! Only admin/superadmin can delete (existing policies)

-- =====================================================
-- 4. RLS POLICIES FOR HALAQAH_REGISTRATIONS TABLE
-- =====================================================

-- Helper function to get program_type from halaqah_id
CREATE OR REPLACE FUNCTION get_halaqah_program_type(halaqah_id TEXT) RETURNS TEXT AS $$
  SELECT program_type FROM public.halaqahs WHERE id::text = halaqah_id LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 4.1. SELECT - Musyrifah can read registrations from assigned programs
DROP POLICY IF EXISTS "Musyrifah can read assigned registrations" ON public.halaqah_registrations;
CREATE POLICY "Musyrifah can read assigned registrations" ON public.halaqah_registrations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah rm
    JOIN public.halaqahs h ON h.program_type = ANY(rm.assigned_programs)
    WHERE rm.id = auth.uid()
    AND h.id::text = halaqah_registrations.halaqah_id
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4.2. INSERT - Musyrifah can create registrations for assigned programs
DROP POLICY IF EXISTS "Musyrifah can insert registrations" ON public.halaqah_registrations;
CREATE POLICY "Musyrifah can insert registrations" ON public.halaqah_registrations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah rm
    JOIN public.halaqahs h ON h.program_type = ANY(rm.assigned_programs)
    WHERE rm.id = auth.uid()
    AND h.id::text = halaqah_registrations.halaqah_id
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4.3. UPDATE - Musyrifah can update registrations in assigned programs
DROP POLICY IF EXISTS "Musyrifah can update registrations" ON public.halaqah_registrations;
CREATE POLICY "Musyrifah can update registrations" ON public.halaqah_registrations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah rm
    JOIN public.halaqahs h ON h.program_type = ANY(rm.assigned_programs)
    WHERE rm.id = auth.uid()
    AND h.id::text = halaqah_registrations.halaqah_id
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah rm
    JOIN public.halaqahs h ON h.program_type = ANY(rm.assigned_programs)
    WHERE rm.id = auth.uid()
    AND h.id::text = halaqah_registrations.halaqah_id
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4.4. DELETE - NO policy for musyrifah! Only admin/superadmin can delete

-- =====================================================
-- 5. RLS POLICIES FOR MUFRADAT_GROUPS TABLE
-- =====================================================

-- 5.1. SELECT - Musyrifah with hi_mufradat can read groups
DROP POLICY IF EXISTS "Musyrifah can read mufradat groups" ON public.mufradat_groups;
CREATE POLICY "Musyrifah can read mufradat groups" ON public.mufradat_groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_mufradat' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 5.2. INSERT - Musyrifah with hi_mufradat can create groups
DROP POLICY IF EXISTS "Musyrifah can insert mufradat groups" ON public.mufradat_groups;
CREATE POLICY "Musyrifah can insert mufradat groups" ON public.mufradat_groups FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_mufradat' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 5.3. UPDATE - Musyrifah with hi_mufradat can update groups
DROP POLICY IF EXISTS "Musyrifah can update mufradat groups" ON public.mufradat_groups;
CREATE POLICY "Musyrifah can update mufradat groups" ON public.mufradat_groups FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_mufradat' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_mufradat' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 5.4. DELETE - NO policy for musyrifah!

-- =====================================================
-- 6. RLS POLICIES FOR DONATIONS TABLE (Hi Berbagi)
-- =====================================================

-- 6.1. SELECT - Musyrifah with hi_berbagi can read donations
DROP POLICY IF EXISTS "Musyrifah can read donations" ON public.donations;
CREATE POLICY "Musyrifah can read donations" ON public.donations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_berbagi' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 6.2. INSERT - Musyrifah with hi_berbagi can create donations
DROP POLICY IF EXISTS "Musyrifah can insert donations" ON public.donations;
CREATE POLICY "Musyrifah can insert donations" ON public.donations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_berbagi' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 6.3. UPDATE - Musyrifah with hi_berbagi can update donations
DROP POLICY IF EXISTS "Musyrifah can update donations" ON public.donations;
CREATE POLICY "Musyrifah can update donations" ON public.donations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_berbagi' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roles_musyrifah
    WHERE id = auth.uid()
    AND 'hi_berbagi' = ANY(assigned_programs)
  )
  OR EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 6.4. DELETE - NO policy for musyrifah!

-- =====================================================
-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- SUCCESS MARKER
-- =====================================================

SELECT 'Musyrifah RBAC system implemented successfully!' as result;
