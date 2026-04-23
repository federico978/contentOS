-- =============================================
-- Inbox Entries Table
-- Run once in the Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.inbox_entries (
  id               TEXT        PRIMARY KEY,
  fecha            TEXT        NOT NULL DEFAULT '',
  date_iso         TEXT        NOT NULL DEFAULT '',
  canal            TEXT        NOT NULL DEFAULT 'email',
  nombre           TEXT        NOT NULL DEFAULT '',
  empresa          TEXT        NOT NULL DEFAULT 'no disponible',
  cargo            TEXT        NOT NULL DEFAULT 'no disponible',
  email            TEXT        NOT NULL DEFAULT '',
  telefono         TEXT        NOT NULL DEFAULT '',
  linkedin_url     TEXT        NOT NULL DEFAULT '',
  mensaje_textual  TEXT        NOT NULL DEFAULT '',
  resumen          TEXT        NOT NULL DEFAULT '',
  categoria        TEXT        NOT NULL DEFAULT 'general',
  prioridad        TEXT        NOT NULL DEFAULT 'medium',
  estado           TEXT        NOT NULL DEFAULT 'pendiente',
  notas            TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security: all authenticated users can read and write
ALTER TABLE public.inbox_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inbox_authenticated_all" ON public.inbox_entries;
CREATE POLICY "inbox_authenticated_all" ON public.inbox_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
