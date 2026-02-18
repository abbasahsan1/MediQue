-- Migration 003: Doctor authentication & admin settings
-- Run in Supabase SQL Editor

-- 1. Add auth columns to doctors
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS password_hash text;

-- Create unique index on email (only for non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS doctors_email_unique ON public.doctors (email) WHERE email IS NOT NULL;

-- 2. Admin settings table (stores admin password hash)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
-- No read policy = table is only accessible via SECURITY DEFINER functions

-- Default admin password: admin123 (change in production)
INSERT INTO public.admin_settings (key, value)
VALUES ('admin_password_hash', crypt('admin123', gen_salt('bf')))
ON CONFLICT (key) DO NOTHING;

-- 3. Create doctor account (called by admin)
CREATE OR REPLACE FUNCTION public.create_doctor_account(
  p_name text,
  p_email text,
  p_password text,
  p_department_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM departments WHERE id = p_department_id AND is_active = true) THEN
    RAISE EXCEPTION 'Department not found or inactive';
  END IF;

  IF EXISTS (SELECT 1 FROM doctors WHERE email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'A doctor with this email already exists';
  END IF;

  INSERT INTO doctors(name, email, department_id, password_hash, status)
  VALUES (trim(p_name), lower(trim(p_email)), p_department_id, crypt(p_password, gen_salt('bf')), 'ONLINE')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'name', trim(p_name),
    'email', lower(trim(p_email)),
    'department_id', p_department_id
  );
END;
$$;

-- 4. Doctor login verification
CREATE OR REPLACE FUNCTION public.verify_doctor_login(
  p_email text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doctor record;
BEGIN
  SELECT d.id, d.name, d.email, d.department_id, d.status,
         dep.name as department_name, dep.code as department_code
  INTO v_doctor
  FROM doctors d
  JOIN departments dep ON dep.id = d.department_id
  WHERE d.email = lower(trim(p_email))
    AND d.password_hash = crypt(p_password, d.password_hash);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_doctor.id,
    'name', v_doctor.name,
    'email', v_doctor.email,
    'department_id', v_doctor.department_id,
    'department_name', v_doctor.department_name,
    'department_code', v_doctor.department_code,
    'status', v_doctor.status
  );
END;
$$;

-- 5. Admin login verification
CREATE OR REPLACE FUNCTION public.verify_admin_login(
  p_password text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT value INTO v_hash
  FROM admin_settings
  WHERE key = 'admin_password_hash';

  IF NOT FOUND THEN RETURN false; END IF;

  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

-- 6. List all doctors (for admin panel)
CREATE OR REPLACE FUNCTION public.list_doctors()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'email', d.email,
      'department_id', d.department_id,
      'department_name', dep.name,
      'status', d.status,
      'created_at', d.created_at
    ) ORDER BY d.created_at DESC)
    FROM doctors d
    JOIN departments dep ON dep.id = d.department_id
  ), '[]'::jsonb);
END;
$$;

-- 7. Delete doctor (for admin panel)
CREATE OR REPLACE FUNCTION public.delete_doctor(p_doctor_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM doctors WHERE id = p_doctor_id;
  RETURN FOUND;
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_doctor_account(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_doctor_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_doctors() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_doctor(uuid) TO anon, authenticated;

-- Allow deleting doctors (for admin)
DROP POLICY IF EXISTS doctors_delete_all ON public.doctors;
CREATE POLICY doctors_delete_all ON public.doctors FOR DELETE USING (true);

NOTIFY pgrst, 'reload schema';
