-- HI AQLI: ADD MUFRADAT_LEAVE_FROM TO USERS
-- Purpose: Support exact start dates for leave (cuti) rather than just until dates.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mufradat_leave_from TIMESTAMPTZ;

-- SUCCESS MARKER
SELECT 'Database successfully updated with mufradat_leave_from!' as result;
