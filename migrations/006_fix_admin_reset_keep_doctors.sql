-- Migration 006: Keep doctor accounts on reset/end-day
-- admin_reset must clear only queue visits, not doctors.

CREATE OR REPLACE FUNCTION public.admin_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE public.visits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
