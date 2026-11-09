-- ==============================================================================
-- Migration: Hi Tikrar target per halaman, aktivitas harian, ujian halaman 30 soal
-- Date: 2026-11-10
-- ==============================================================================

-- 1. Target thalibah (riwayat; hanya satu yang aktif)
CREATE TABLE IF NOT EXISTS public.tikrar_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  halaqah_id UUID REFERENCES public.halaqahs(id) ON DELETE SET NULL,
  juz INT NOT NULL CHECK (juz BETWEEN 1 AND 30),
  start_page INT NOT NULL CHECK (start_page BETWEEN 1 AND 604),
  end_page INT NOT NULL CHECK (end_page BETWEEN 1 AND 604),
  start_date DATE NOT NULL,
  duration_months INT NOT NULL DEFAULT 2 CHECK (duration_months BETWEEN 1 AND 4),
  active_days_per_week INT NOT NULL DEFAULT 5 CHECK (active_days_per_week BETWEEN 1 AND 7),
  daily_step_quota INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Target hasil migrasi dari kolom users lama: boleh langsung diubah tanpa syarat lulus 1 halaman
  is_legacy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  CONSTRAINT ck_tikrar_targets_range CHECK (end_page >= start_page)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tikrar_targets_active
  ON public.tikrar_targets (user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_tikrar_targets_user ON public.tikrar_targets (user_id, created_at DESC);

-- 2. Aktivitas harian (dasar heatmap, streak & poin)
CREATE TABLE IF NOT EXISTS public.tikrar_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  steps_start INT NOT NULL DEFAULT 0,
  steps_now INT NOT NULL DEFAULT 0,
  daily_quota INT NOT NULL DEFAULT 1,
  target_met BOOLEAN NOT NULL DEFAULT false,
  points_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tikrar_daily_activity UNIQUE (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_tikrar_daily_activity_date ON public.tikrar_daily_activity (activity_date);

-- 3. Hasil ujian halaman 30 soal
CREATE TABLE IF NOT EXISTS public.tikrar_page_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  juz INT NOT NULL,
  page_number INT NOT NULL CHECK (page_number BETWEEN 1 AND 604),
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  score INT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  question_types JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tikrar_page_quizzes_user_page
  ON public.tikrar_page_quizzes (user_id, page_number, passed);

ALTER TABLE public.tikrar_targets ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT false;

-- 4. Target lama (dari kolom users) dipindahkan menjadi target aktif agar thalibah lama tidak terkunci
INSERT INTO public.tikrar_targets (
  user_id, halaqah_id, juz, start_page, end_page, start_date, duration_months, active_days_per_week, daily_step_quota, is_legacy
)
SELECT
  u.id,
  u.tikrar_halaqah_id,
  u."paidJuz",
  COALESCE(
    (SELECT MIN(s.page_number) FROM public.tikrar_user_schedules s WHERE s.user_id = u.id AND s.juz = u."paidJuz"),
    LEAST(GREATEST(COALESCE(u.tikrar_current_page, 0), 1), 604)
  ),
  CASE WHEN u."paidJuz" = 30 THEN 604 ELSE (ARRAY[21,41,61,81,101,121,141,161,181,201,221,241,261,281,301,321,341,361,381,401,421,441,461,481,501,521,541,561,581])[u."paidJuz"] END,
  COALESCE(u.tikrar_start_date::date, CURRENT_DATE),
  LEAST(GREATEST(COALESCE(u.tikrar_target_duration_months, 2), 1), 4),
  LEAST(GREATEST(COALESCE(u.tikrar_active_days_per_week, 5), 1), 7),
  1,
  true
FROM public.users u
WHERE u."paidJuz" BETWEEN 1 AND 30
  AND u.tikrar_start_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tikrar_targets t WHERE t.user_id = u.id);

-- Pastikan halaman mulai berada dalam juz target
UPDATE public.tikrar_targets t
SET start_page = (ARRAY[1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582])[t.juz]
WHERE t.start_page < (ARRAY[1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582])[t.juz]
   OR t.start_page > t.end_page;

GRANT ALL PRIVILEGES ON TABLE public.tikrar_targets TO hiaqli;
GRANT ALL PRIVILEGES ON TABLE public.tikrar_daily_activity TO hiaqli;
GRANT ALL PRIVILEGES ON TABLE public.tikrar_page_quizzes TO hiaqli;
