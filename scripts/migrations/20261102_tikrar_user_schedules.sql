-- ==============================================================================
-- Migration: Hi Tikrar User Schedules & Musyrifah RBAC Column Sync (Fase 2-5)
-- Date: 2026-11-02
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tikrar_user_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  halaqah_id UUID REFERENCES public.halaqahs(id) ON DELETE SET NULL,
  juz INT NOT NULL CHECK (juz BETWEEN 1 AND 30),
  page_number INT NOT NULL CHECK (page_number BETWEEN 1 AND 604),
  block_number INT NOT NULL CHECK (block_number BETWEEN 1 AND 4),
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, overdue, waived
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_tikrar_user_schedule UNIQUE (user_id, juz, page_number, block_number)
);

CREATE INDEX IF NOT EXISTS idx_tikrar_user_schedules_user_date
  ON public.tikrar_user_schedules (user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_tikrar_user_schedules_user_juz
  ON public.tikrar_user_schedules (user_id, juz, page_number, block_number);

GRANT ALL PRIVILEGES ON TABLE public.tikrar_user_schedules TO hiaqli;

-- Ensure roles_musyrifah includes assigned_programs TEXT[] for program-scoped RBAC
ALTER TABLE public.roles_musyrifah
  ADD COLUMN IF NOT EXISTS assigned_programs TEXT[] NOT NULL DEFAULT '{}';

GRANT ALL PRIVILEGES ON TABLE public.roles_musyrifah TO hiaqli;
