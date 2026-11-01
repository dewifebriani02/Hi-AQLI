-- ==============================================================================
-- Migration: Hi Tikrar Schema (Zoom Halaqahs, Daily Logs, Submissions, Preferences)
-- Date: 2026-11-01
-- ==============================================================================

-- 1. Tambahkan kolom link Zoom & WhatsApp di tabel public.halaqahs jika belum ada
ALTER TABLE public.halaqahs
  ADD COLUMN IF NOT EXISTS zoom_link TEXT,
  ADD COLUMN IF NOT EXISTS zoom_passcode TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

-- 2. Seed Jadwal Halaqah Tikrar Live Zoom (Sesi Fajar, Dhuha, Malam)
INSERT INTO public.halaqahs (
  id,
  title,
  program_type,
  schedule,
  description,
  start_date,
  duration_weeks,
  juz,
  level,
  is_premium,
  base_price,
  quota,
  tag,
  has_exam,
  has_certificate,
  muallimah,
  musyrifah,
  zoom_link,
  whatsapp_group_link,
  created_at
)
VALUES
  (
    'a1111111-1111-4000-8000-000000000001',
    'Hi Tikrar - Sesi Fajar (05:30 - 06:30 WIB)',
    'tikrar_daily',
    'Senin - Jumat, 05:30 - 06:30 WIB',
    'Halaqah Tikrar & Setoran Tasmi'' Live Zoom Sesi Fajar (Subuh) bersama Musyrifah.',
    CURRENT_DATE,
    8,
    30,
    'Semua Level',
    false,
    0,
    30,
    'Live Zoom',
    true,
    true,
    'Tim Asatidzah HI AQLI',
    'Musyrifah Tikrar',
    'https://zoom.us/j/hiaqli-tikrar-fajar',
    'https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq',
    now()
  ),
  (
    'a1111111-1111-4000-8000-000000000002',
    'Hi Tikrar - Sesi Dhuha (09:00 - 10:00 WIB)',
    'tikrar_daily',
    'Senin - Jumat, 09:00 - 10:00 WIB',
    'Halaqah Tikrar & Setoran Tasmi'' Live Zoom Sesi Pagi (Dhuha) bersama Musyrifah.',
    CURRENT_DATE,
    8,
    30,
    'Semua Level',
    false,
    0,
    30,
    'Live Zoom',
    true,
    true,
    'Tim Asatidzah HI AQLI',
    'Musyrifah Tikrar',
    'https://zoom.us/j/hiaqli-tikrar-dhuha',
    'https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq',
    now()
  ),
  (
    'a1111111-1111-4000-8000-000000000003',
    'Hi Tikrar - Sesi Malam (20:00 - 21:00 WIB)',
    'tikrar_daily',
    'Senin - Jumat, 20:00 - 21:00 WIB',
    'Halaqah Tikrar & Setoran Tasmi'' Live Zoom Sesi Malam (Ba''da Isya) bersama Musyrifah.',
    CURRENT_DATE,
    8,
    30,
    'Semua Level',
    false,
    0,
    30,
    'Live Zoom',
    true,
    true,
    'Tim Asatidzah HI AQLI',
    'Musyrifah Tikrar',
    'https://zoom.us/j/hiaqli-tikrar-malam',
    'https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  schedule = EXCLUDED.schedule,
  description = EXCLUDED.description,
  zoom_link = EXCLUDED.zoom_link,
  whatsapp_group_link = EXCLUDED.whatsapp_group_link;

-- 3. Tabel Grup Tikrar (Grup / Kelompok Tikrar Mandiri)
CREATE TABLE IF NOT EXISTS public.tikrar_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  schedule TEXT,
  session_time VARCHAR(50),
  zoom_link TEXT,
  whatsapp_group_link TEXT,
  musyrifah_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  musyrifah_name TEXT,
  capacity INT DEFAULT 30,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabel Laporan Harian Tikrar (Daily Repetition Logs)
CREATE TABLE IF NOT EXISTS public.tikrar_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  halaqah_id UUID REFERENCES public.halaqahs(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.tikrar_groups(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  juz INT NOT NULL DEFAULT 30,
  page_number INT NOT NULL,
  blocks_completed JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array blok, mis. [1, 2] atau ["A", "B"]
  repetition_count INT NOT NULL DEFAULT 40,
  duration_minutes INT DEFAULT 30,
  completed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_tikrar_daily_log UNIQUE (user_id, log_date, page_number)
);

CREATE INDEX IF NOT EXISTS idx_tikrar_daily_logs_user_date ON public.tikrar_daily_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_tikrar_daily_logs_halaqah ON public.tikrar_daily_logs (halaqah_id, log_date);

-- 5. Tabel Kelas Setoran Live Zoom Tikrar (Submissions & Verifikasi Musyrifah)
CREATE TABLE IF NOT EXISTS public.tikrar_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT,
  halaqah_id UUID REFERENCES public.halaqahs(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.tikrar_groups(id) ON DELETE SET NULL,
  musyrifah_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  musyrifah_name TEXT,
  juz INT NOT NULL,
  page_number INT NOT NULL,
  blocks_range VARCHAR(50) NOT NULL, -- 'blok_1_2' (1/2 hal), 'blok_3_4' (1/2 hal), 'blok_1_4' (1 hal)
  session_date DATE,
  zoom_meeting_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'passed', 'needs_revision', 'cancelled'
  grade VARCHAR(50), -- 'mumtaz', 'jayyid_jiddan', 'jayyid'
  feedback TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tikrar_submissions_user ON public.tikrar_submissions (user_id, page_number);
CREATE INDEX IF NOT EXISTS idx_tikrar_submissions_status ON public.tikrar_submissions (status);
CREATE INDEX IF NOT EXISTS idx_tikrar_submissions_halaqah ON public.tikrar_submissions (halaqah_id);

-- 6. Tambahkan kolom preferensi Tikrar ke tabel users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tikrar_halaqah_id UUID REFERENCES public.halaqahs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tikrar_target_duration_months INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS tikrar_active_days_per_week INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tikrar_current_page INT DEFAULT 582,
  ADD COLUMN IF NOT EXISTS tikrar_current_block INT DEFAULT 1;

-- 7. Pastikan hak akses diberikan penuh kepada role/user hiaqli
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hiaqli;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hiaqli;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hiaqli;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hiaqli;
