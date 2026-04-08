-- HI AQLI: USER BADGES (LENCANA KEHORMATAN)
-- Purpose: Store achievements for Hi Mufradat.

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user only gets the same badge type once
    UNIQUE(user_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
CREATE POLICY "Users can view their own badges" ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all badges" ON public.user_badges;
CREATE POLICY "Admin can view all badges" ON public.user_badges FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);

