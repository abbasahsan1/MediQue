-- Migration 006: Clear queues without deleting doctors

CREATE OR REPLACE FUNCTION public.clear_patient_queues()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE public.visits CASCADE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_patient_queues() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
