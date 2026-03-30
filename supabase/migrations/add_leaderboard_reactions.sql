-- HI AQLI: LEADERBOARD REACTIONS (MUFRADAT CONGRATS)
-- Purpose: Allow thalibah to motivate each other with Mabruk/Semangat reactions.

CREATE TABLE IF NOT EXISTS public.mufradat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'mabruk', 'semangat', 'hebat'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mufradat_reactions ENABLE ROW LEVEL SECURITY;

-- 1. All authenticated users can see reactions to display on leaderboard
DROP POLICY IF EXISTS "Users can see all reactions" ON public.mufradat_reactions;
CREATE POLICY "Users can see all reactions" 
ON public.mufradat_reactions FOR SELECT 
TO authenticated 
USING (true);

-- 2. Users can only insert reactions from themselves
DROP POLICY IF EXISTS "Users can insert their own reactions" ON public.mufradat_reactions;
CREATE POLICY "Users can insert their own reactions" 
ON public.mufradat_reactions FOR INSERT 
TO authenticated 
WITH CHECK (from_user_id = auth.uid());

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_to_user ON public.mufradat_reactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_from_user ON public.mufradat_reactions(from_user_id);

-- SUCCESS MARKER
SELECT 'Mufradat reactions table created successfully!' as result;
