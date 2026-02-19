-- Migration 005: Archive end-of-day queue exports

CREATE TABLE IF NOT EXISTS public.daily_queue_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_date date NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  row_count int NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  csv_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_queue_exports_date
  ON public.daily_queue_exports (export_date DESC, exported_at DESC);

ALTER TABLE public.daily_queue_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_queue_exports_read_all ON public.daily_queue_exports;
CREATE POLICY daily_queue_exports_read_all
ON public.daily_queue_exports
FOR SELECT
USING (true);

DROP POLICY IF EXISTS daily_queue_exports_insert_all ON public.daily_queue_exports;
CREATE POLICY daily_queue_exports_insert_all
ON public.daily_queue_exports
FOR INSERT
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
