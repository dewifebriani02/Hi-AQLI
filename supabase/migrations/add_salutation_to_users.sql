-- Add salutation column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS salutation TEXT DEFAULT 'Ukhti';

-- Update existing users to have 'Ukhti' if not set
UPDATE public.users SET salutation = 'Ukhti' WHERE salutation IS NULL;
