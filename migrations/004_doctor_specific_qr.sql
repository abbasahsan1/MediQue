-- Migration 004: doctor-specific intake assignment
-- Adds optional doctor targeting to create_visit for doctor QR check-ins.

CREATE OR REPLACE FUNCTION public.create_visit(
  p_department_id text,
  p_patient_name text,
  p_age int,
  p_symptoms jsonb,
  p_guest_uuid uuid,
  p_patient_auth_id uuid,
  p_location_token text default null,
  p_gender text default null,
  p_problem_description text default null,
  p_assigned_doctor_id uuid default null
)
RETURNS setof public.visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token int;
  v_status text;
  v_severity int;
BEGIN
  IF p_department_id IS NULL OR length(trim(p_department_id)) = 0 THEN
    RAISE EXCEPTION 'department_id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.departments d WHERE d.id = p_department_id AND d.is_active = true) THEN
    RAISE EXCEPTION 'Department is unavailable';
  END IF;

  IF p_assigned_doctor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.doctors d
      WHERE d.id = p_assigned_doctor_id
        AND d.department_id = p_department_id
    ) THEN
      RAISE EXCEPTION 'Assigned doctor is invalid for this department';
    END IF;
  END IF;

  v_severity := 0;
  IF p_problem_description IS NOT NULL THEN
    SELECT count(*) INTO v_severity
    FROM (VALUES
      ('chest pain'), ('shortness of breath'), ('severe bleeding'),
      ('high fever'), ('loss of consciousness'), ('heart attack'),
      ('stroke'), ('seizure'), ('unconscious'), ('not breathing')
    ) AS urgent(keyword)
    WHERE lower(p_problem_description) LIKE '%' || urgent.keyword || '%';
  END IF;

  IF v_severity = 0 THEN
    v_severity := coalesce((
      SELECT count(*)
      FROM jsonb_array_elements_text(coalesce(p_symptoms, '[]'::jsonb)) AS s(value)
      WHERE lower(value) IN ('chest pain', 'shortness of breath', 'severe bleeding', 'high fever (>103°f)', 'loss of consciousness')
    ), 0);
  END IF;

  v_status := CASE WHEN v_severity > 0 THEN 'URGENT' ELSE 'WAITING' END;
  v_token := public.generate_token(p_department_id);

  RETURN QUERY
  INSERT INTO public.visits (
    patient_name,
    age,
    symptoms,
    severity,
    department_id,
    status,
    token_number,
    guest_uuid,
    patient_auth_id,
    gender,
    problem_description,
    assigned_doctor_id
  )
  VALUES (
    p_patient_name,
    p_age,
    coalesce(p_symptoms, '[]'::jsonb),
    v_severity,
    p_department_id,
    v_status,
    v_token,
    p_guest_uuid,
    p_patient_auth_id,
    p_gender,
    p_problem_description,
    p_assigned_doctor_id
  )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_visit(text, text, int, jsonb, uuid, uuid, text, text, text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
