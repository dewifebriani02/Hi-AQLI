-- ==============================================================================
-- Migration: Konfigurasi Kustom Blok & Sub-Blok Tikrar per Halaman (Admin)
-- Date: 2026-11-19
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tikrar_page_block_configs (
  page_number INT PRIMARY KEY CHECK (page_number BETWEEN 1 AND 604),
  blocks JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

GRANT ALL PRIVILEGES ON TABLE public.tikrar_page_block_configs TO hiaqli;
