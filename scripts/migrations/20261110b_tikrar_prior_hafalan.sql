-- ==============================================================================
-- Migration: Hafalan sebelum bergabung (diisi sendiri oleh thalibah)
-- Date: 2026-11-10
-- status: 'tested_external' = sudah diuji di luar AQLI, 'untested' = belum diuji
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tikrar_prior_hafalan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_number INT NOT NULL CHECK (page_number BETWEEN 1 AND 604),
  status VARCHAR(20) NOT NULL CHECK (status IN ('tested_external', 'untested')),
  tested_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tikrar_prior_hafalan UNIQUE (user_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_tikrar_prior_hafalan_user ON public.tikrar_prior_hafalan (user_id);

GRANT ALL PRIVILEGES ON TABLE public.tikrar_prior_hafalan TO hiaqli;
