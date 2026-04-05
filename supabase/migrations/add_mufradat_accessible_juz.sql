-- HI AQLI: ADD MUFRADAT_ACCESSIBLE_JUZ TO USERS
-- Purpose: Support granular Juz access rights per user.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mufradat_accessible_juz JSONB DEFAULT '[]';

-- SUCCESS MARKER
SELECT 'Database successfully updated with mufradat_accessible_juz!' as result;
