-- Migration: 20261102_tikrar_user_progress.sql
-- Description: Tabel penyimpanan progres hitungan/klik real-time setiap tahapan & blok Tikrar

CREATE TABLE IF NOT EXISTS public.tikrar_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  juz integer NOT NULL DEFAULT 30,
  prep_listen_count integer NOT NULL DEFAULT 0,
  prep_translation_done boolean NOT NULL DEFAULT false,
  blocks jsonb NOT NULL DEFAULT '{"1":{"a":{"count":0},"b":{"count":0},"combined":{"count":0}},"2":{"a":{"count":0},"b":{"count":0},"combined":{"count":0}},"3":{"a":{"count":0},"b":{"count":0},"combined":{"count":0}},"4":{"a":{"count":0},"b":{"count":0},"combined":{"count":0}}}'::jsonb,
  meta_counts jsonb NOT NULL DEFAULT '{"1_2":0,"2_3":0,"1_2_3":0,"3_4":0,"2_3_4":0,"1_2_3_4":0}'::jsonb,
  tuntas_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_progress integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_tikrar_user_progress UNIQUE (user_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_tikrar_user_progress_user ON public.tikrar_user_progress(user_id);
