-- HI AQLI: MABAR SYSTEM (MULTIPLAYER PER JUZ)
-- Purpose: Scheduled competitive sessions for Hi Mufradat.

-- 1. MABAR SESSIONS (ROOMS)
CREATE TABLE IF NOT EXISTS public.mufradat_mabar_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    juz_id INTEGER NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'finished'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MABAR PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.mufradat_mabar_participants (
    session_id UUID NOT NULL REFERENCES public.mufradat_mabar_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points_earned INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.mufradat_mabar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mufradat_mabar_participants ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES: Sessions
CREATE POLICY "Anyone can view sessions" 
ON public.mufradat_mabar_sessions FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Admins can manage sessions" 
ON public.mufradat_mabar_sessions FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.roles_superadmin WHERE id = auth.uid())
);

-- 4. POLICIES: Participants
CREATE POLICY "Anyone can view participants" 
ON public.mufradat_mabar_participants FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Users can join sessions" 
ON public.mufradat_mabar_participants FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own score" 
ON public.mufradat_mabar_participants FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 5. REALTIME ENABLING
-- We need to ensure participants table is in the realtime publication
-- This is often done via: ALTER PUBLICATION supabase_realtime ADD TABLE mufradat_mabar_participants;
-- But typically handled via Supabase Dashboard or a global catch-all.

-- 6. INDEXING
CREATE INDEX IF NOT EXISTS idx_mabar_sessions_scheduled ON public.mufradat_mabar_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mabar_participants_score ON public.mufradat_mabar_participants(points_earned DESC);
