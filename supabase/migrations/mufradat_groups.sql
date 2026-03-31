-- 1. CREATE MUFRADAT GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.mufradat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    whatsapp_link TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ADD GROUP COLUMN TO USERS TABLE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mufradat_group_id') THEN 
        ALTER TABLE public.users ADD COLUMN mufradat_group_id UUID REFERENCES public.mufradat_groups(id); 
    END IF; 
END $$;

-- 3. INITIAL DATA: Create Grup 1 if no groups exist
INSERT INTO public.mufradat_groups (name, whatsapp_link, member_count)
SELECT 'Grup 1', 'https://chat.whatsapp.com/example-link', 0
WHERE NOT EXISTS (SELECT 1 FROM public.mufradat_groups LIMIT 1);

-- 4. RLS POLICIES FOR ADMINS
ALTER TABLE public.mufradat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all groups" ON public.mufradat_groups;
CREATE POLICY "Admins can view all groups" 
ON public.mufradat_groups FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all groups" ON public.mufradat_groups;
CREATE POLICY "Admins can manage all groups" 
ON public.mufradat_groups FOR ALL
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);
