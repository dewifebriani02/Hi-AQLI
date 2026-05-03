-- Add salutation column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS salutation TEXT DEFAULT 'Ukhti';

-- Add metadata column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing users to have 'Ukhti' if not set
UPDATE public.users SET salutation = 'Ukhti' WHERE salutation IS NULL;
