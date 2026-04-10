-- HI AQLI: HI MATAN & DELETION FIX
-- Purpose: 
-- 1. Fix User Deletion bug by adding ON DELETE CASCADE to foreign keys.
-- 2. Create the infrastructure for the Hi Matan module.

-- ==========================================
-- 1. AGGRESSIVE FIX FOR USER DELETION CONSTRAINTS
-- ==========================================

-- A. Fix quiz_attempts
DO $$ 
BEGIN 
    -- Drop all possible constraint names (snake_case and camelCase variants)
    ALTER TABLE IF EXISTS public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
    ALTER TABLE IF EXISTS public.quiz_attempts DROP CONSTRAINT IF EXISTS "quiz_attempts_user_id_fkey";
    
    -- CLEAN UP orphaned records
    DELETE FROM public.quiz_attempts WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    -- Re-add with ON DELETE CASCADE
    ALTER TABLE public.quiz_attempts 
    ADD CONSTRAINT quiz_attempts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- B. Fix halaqah_registrations
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.halaqah_registrations DROP CONSTRAINT IF EXISTS halaqah_registrations_user_id_fkey;
    ALTER TABLE IF EXISTS public.halaqah_registrations DROP CONSTRAINT IF EXISTS "halaqah_registrations_userId_fkey";
    
    -- CLEAN UP orphaned records
    DELETE FROM public.halaqah_registrations WHERE user_id NOT IN (SELECT id FROM public.users);

    ALTER TABLE public.halaqah_registrations 
    ADD CONSTRAINT halaqah_registrations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- C. Fix roles_admin
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.roles_admin DROP CONSTRAINT IF EXISTS roles_admin_id_fkey;
    ALTER TABLE IF EXISTS public.roles_admin DROP CONSTRAINT IF EXISTS "roles_admin_id_fkey";
    
    -- CLEAN UP orphaned records
    DELETE FROM public.roles_admin WHERE id NOT IN (SELECT id FROM public.users);

    ALTER TABLE public.roles_admin 
    ADD CONSTRAINT roles_admin_id_fkey 
    FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- D. Fix donations (Missing CASCADE fix)
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.donations DROP CONSTRAINT IF EXISTS "donations_userId_fkey";
    ALTER TABLE IF EXISTS public.donations DROP CONSTRAINT IF EXISTS donations_user_id_fkey;
    
    DELETE FROM public.donations WHERE user_id NOT IN (SELECT id FROM public.users);

    ALTER TABLE public.donations 
    ADD CONSTRAINT donations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- E. Fix voucher_redemptions
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.voucher_redemptions DROP CONSTRAINT IF EXISTS voucher_redemptions_user_id_fkey;
    ALTER TABLE IF EXISTS public.voucher_redemptions DROP CONSTRAINT IF EXISTS "voucher_redemptions_user_id_fkey";

    DELETE FROM public.voucher_redemptions WHERE user_id NOT IN (SELECT id FROM public.users);

    ALTER TABLE public.voucher_redemptions 
    ADD CONSTRAINT voucher_redemptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- F. Fix users self-reference (Referrals)
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_referred_by_id_fkey;
    
    ALTER TABLE public.users 
    ADD CONSTRAINT users_referred_by_id_fkey 
    FOREIGN KEY (referred_by_id) REFERENCES public.users(id) ON DELETE SET NULL;
END $$;

-- G. Fix Mufradat reactions
DO $$ 
BEGIN 
    ALTER TABLE IF EXISTS public.mufradat_reactions DROP CONSTRAINT IF EXISTS mufradat_reactions_from_user_id_fkey;
    ALTER TABLE IF EXISTS public.mufradat_reactions DROP CONSTRAINT IF EXISTS "mufradat_reactions_from_user_id_fkey";
    ALTER TABLE IF EXISTS public.mufradat_reactions DROP CONSTRAINT IF EXISTS mufradat_reactions_to_user_id_fkey;
    ALTER TABLE IF EXISTS public.mufradat_reactions DROP CONSTRAINT IF EXISTS "mufradat_reactions_to_user_id_fkey";

    ALTER TABLE public.mufradat_reactions 
    ADD CONSTRAINT mufradat_reactions_from_user_id_fkey 
    FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    ALTER TABLE public.mufradat_reactions 
    ADD CONSTRAINT mufradat_reactions_to_user_id_fkey 
    FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;


-- ==========================================
-- 2. CREATE HI MATAN TABLES
-- ==========================================

-- A. Matans (Metadata Kitab)
CREATE TABLE IF NOT EXISTS public.matans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  category TEXT DEFAULT 'Nahwu',
  level TEXT DEFAULT 'Mubtadi',
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'maroon',
  total_chapters INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- B. Matan Chapters
CREATE TABLE IF NOT EXISTS public.matan_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matan_id TEXT REFERENCES public.matans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- C. Matan Items (Bait/Materi)
CREATE TABLE IF NOT EXISTS public.matan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.matan_chapters(id) ON DELETE CASCADE,
  bait_arabic TEXT NOT NULL,
  bait_latin TEXT,
  translation TEXT,
  syarah_text TEXT,
  audio_url TEXT,
  audio_start INTEGER DEFAULT 0,
  audio_end INTEGER,
  example_verse JSONB DEFAULT '{}',
  quizzes JSONB DEFAULT '[]', -- Multi-question support
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D. Matan User Progress
CREATE TABLE IF NOT EXISTS public.matan_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.matan_items(id) ON DELETE CASCADE,
  status_paham BOOLEAN DEFAULT FALSE,
  points_awarded INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- E. Enable RLS
ALTER TABLE public.matans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matan_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matan_user_progress ENABLE ROW LEVEL SECURITY;

-- F. Policies
-- Everyone can read content
DROP POLICY IF EXISTS "Everyone can view matans" ON public.matans;
CREATE POLICY "Everyone can view matans" ON public.matans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Everyone can view chapters" ON public.matan_chapters;
CREATE POLICY "Everyone can view chapters" ON public.matan_chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Everyone can view items" ON public.matan_items;
CREATE POLICY "Everyone can view items" ON public.matan_items FOR SELECT USING (true);

-- Users manage their own progress
DROP POLICY IF EXISTS "Users can view their own matan progress" ON public.matan_user_progress;
CREATE POLICY "Users can view their own matan progress" ON public.matan_user_progress 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own matan progress" ON public.matan_user_progress;
CREATE POLICY "Users can upsert their own matan progress" ON public.matan_user_progress 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own matan progress" ON public.matan_user_progress;
CREATE POLICY "Users can update their own matan progress" ON public.matan_user_progress 
FOR UPDATE USING (auth.uid() = user_id);

-- Admin can manage everything
DROP POLICY IF EXISTS "Admins full access matans" ON public.matans;
CREATE POLICY "Admins full access matans" ON public.matans FOR ALL USING (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins full access chapters" ON public.matan_chapters;
CREATE POLICY "Admins full access chapters" ON public.matan_chapters FOR ALL USING (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins full access items" ON public.matan_items;
CREATE POLICY "Admins full access items" ON public.matan_items FOR ALL USING (EXISTS (SELECT 1 FROM public.roles_admin WHERE id = auth.uid()));

-- G. Initial Data (Optional - Al-Ajurumiyah Bab Kalam)
INSERT INTO public.matans (id, title, author, category, level, slug, description, color, total_chapters)
VALUES ('ajurumiyah', 'Al-Ajurumiyah', 'Ibnu Ajurrum', 'Nahwu', 'Mubtadi', 'ajurumiyah', 'Gerbang utama mempelajari ilmu Nahwu Dasar.', 'maroon', 26)
ON CONFLICT (id) DO NOTHING;

-- NOTIFY PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
