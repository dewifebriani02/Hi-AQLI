-- SQL Script: Hi Mufradat Quiz attempts table correction
-- Run this in your Supabase SQL Editor to enable Page Leaderboard and Tracking

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    surah_id TEXT DEFAULT '0',
    verse_id TEXT DEFAULT '0',
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    wrong_words JSONB DEFAULT '[]'::jsonb,
    page_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns to existing table if necessary
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='wrong_words') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN wrong_words JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_attempts' AND column_name='page_id') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN page_id INTEGER;
    END IF;
END $$;

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "Users can view all quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view all quiz attempts" ON public.quiz_attempts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert their own attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Helpful index for leaderboard speed
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
