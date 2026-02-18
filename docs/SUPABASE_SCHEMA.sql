-- MediQue Supabase backend schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.departments (
  id text primary key,
  name text not null,
  code text not null,
  color text not null default 'bg-dept-general',
  active_doctors int not null default 0,
  is_active boolean not null default true,
  building text,
  location_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  department_id text not null references public.departments(id) on update cascade on delete restrict,
  status text not null default 'ONLINE' check (status in ('ONLINE', 'OFFLINE')),
  efficiency_score numeric(6,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  age int not null check (age between 0 and 120),
  symptoms jsonb not null default '[]'::jsonb,
  severity int not null default 0,
  department_id text not null references public.departments(id) on update cascade on delete restrict,
  assigned_doctor_id uuid references public.doctors(id) on update cascade on delete set null,
  status text not null check (status in ('SCANNED', 'WAITING', 'URGENT', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW')),
  token_number int not null,
  prescription_text text,
  patient_auth_id uuid,
  guest_uuid uuid,
  location_token text,
  version int not null default 1,
  called_at timestamptz,
  consultation_started_at timestamptz,
  completed_at timestamptz,
  no_show_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_visit_token_daily unique (department_id, token_number, (created_at::date))
);

create index if not exists idx_visits_department_status_created
  on public.visits (department_id, status, created_at);

create index if not exists idx_visits_patient_auth
  on public.visits (patient_auth_id);

create index if not exists idx_visits_guest
  on public.visits (guest_uuid);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
before update on public.visits
for each row execute function public.touch_updated_at();

-- Daily sequential token generation (resets by date+department)
create or replace function public.generate_token(dept_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_token int;
begin
  perform pg_advisory_xact_lock(hashtext('medique-token-' || dept_id || '-' || current_date::text));

  select coalesce(max(token_number), 0) + 1
  into next_token
  from public.visits
  where department_id = dept_id
    and created_at::date = current_date;

  return next_token;
end;
$$;

-- Visit creation entrypoint
create or replace function public.create_visit(
  p_department_id text,
  p_patient_name text,
  p_age int,
  p_symptoms jsonb,
  p_guest_uuid uuid,
  p_patient_auth_id uuid,
  p_location_token text default null
)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token int;
  v_status text;
  v_severity int;
begin
  if p_department_id is null or length(trim(p_department_id)) = 0 then
    raise exception 'department_id is required';
  end if;

  if not exists (select 1 from public.departments d where d.id = p_department_id and d.is_active = true) then
    raise exception 'Department is unavailable';
  end if;

  if p_location_token is not null then
    if not exists (
      select 1
      from public.departments d
      where d.id = p_department_id
        and (d.location_token is null or d.location_token = p_location_token)
    ) then
      raise exception 'Invalid location token';
    end if;
  end if;

  v_severity := coalesce((
    select count(*)
    from jsonb_array_elements_text(coalesce(p_symptoms, '[]'::jsonb)) as s(value)
    where lower(value) in ('chest pain', 'shortness of breath', 'severe bleeding', 'high fever (>103°f)', 'loss of consciousness')
  ), 0);

  v_status := case when v_severity > 0 then 'URGENT' else 'WAITING' end;
  v_token := public.generate_token(p_department_id);

  return query
  insert into public.visits (
    patient_name,
    age,
    symptoms,
    severity,
    department_id,
    status,
    token_number,
    guest_uuid,
    patient_auth_id,
    location_token
  )
  values (
    p_patient_name,
    p_age,
    coalesce(p_symptoms, '[]'::jsonb),
    v_severity,
    p_department_id,
    v_status,
    v_token,
    p_guest_uuid,
    p_patient_auth_id,
    p_location_token
  )
  returning *;
end;
$$;

-- Department pool load-balancing: any doctor pulls the next patient
create or replace function public.claim_next_visit(
  p_department_id text,
  p_doctor_name text
)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_visit_id uuid;
begin
  select id
  into v_doctor_id
  from public.doctors
  where department_id = p_department_id
    and lower(name) = lower(trim(p_doctor_name))
  order by created_at asc
  limit 1;

  if v_doctor_id is null then
    insert into public.doctors(name, department_id, status)
    values (trim(p_doctor_name), p_department_id, 'ONLINE')
    returning id into v_doctor_id;
  end if;

  select id
  into v_visit_id
  from public.visits
  where department_id = p_department_id
    and status in ('WAITING', 'URGENT')
  order by
    case when status = 'URGENT' then 0 else 1 end,
    created_at asc
  for update skip locked
  limit 1;

  if v_visit_id is null then
    return;
  end if;

  return query
  update public.visits
  set
    status = 'CALLED',
    assigned_doctor_id = v_doctor_id,
    called_at = now(),
    version = version + 1
  where id = v_visit_id
  returning *;
end;
$$;

create or replace function public.transition_visit(
  p_visit_id uuid,
  p_to_status text,
  p_doctor_name text,
  p_prescription_text text default null,
  p_expected_version int default null
)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_current public.visits%rowtype;
begin
  select * into v_current from public.visits where id = p_visit_id;
  if not found then
    raise exception 'Visit not found';
  end if;

  if p_expected_version is not null and v_current.version <> p_expected_version then
    raise exception 'Version conflict';
  end if;

  select id into v_doctor_id
  from public.doctors
  where department_id = v_current.department_id
    and lower(name) = lower(trim(p_doctor_name))
  order by created_at asc
  limit 1;

  if p_to_status = 'IN_CONSULTATION' and v_current.status <> 'CALLED' then
    raise exception 'Invalid transition';
  end if;

  if p_to_status = 'COMPLETED' and v_current.status not in ('CALLED', 'IN_CONSULTATION') then
    raise exception 'Invalid transition';
  end if;

  if p_to_status = 'NO_SHOW' and v_current.status <> 'CALLED' then
    raise exception 'Invalid transition';
  end if;

  return query
  update public.visits
  set
    status = p_to_status,
    assigned_doctor_id = coalesce(v_doctor_id, assigned_doctor_id),
    consultation_started_at = case when p_to_status = 'IN_CONSULTATION' then now() else consultation_started_at end,
    completed_at = case when p_to_status = 'COMPLETED' then now() else completed_at end,
    no_show_at = case when p_to_status = 'NO_SHOW' then now() else no_show_at end,
    prescription_text = case when p_to_status = 'COMPLETED' then nullif(trim(coalesce(p_prescription_text, '')), '') else prescription_text end,
    version = version + 1
  where id = p_visit_id
  returning *;
end;
$$;

create or replace function public.admin_reset()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.visits;
end;
$$;

alter table public.departments enable row level security;
alter table public.doctors enable row level security;
alter table public.visits enable row level security;

-- Patients can read their own rows
create policy if not exists visits_patient_read
on public.visits
for select
using (patient_auth_id = auth.uid());

-- Patients can insert their own rows
create policy if not exists visits_patient_insert
on public.visits
for insert
with check (patient_auth_id = auth.uid());

-- Doctors can read rows in their department
create policy if not exists visits_doctor_department_read
on public.visits
for select
using (
  exists (
    select 1
    from public.doctors d
    where d.auth_user_id = auth.uid()
      and d.department_id = visits.department_id
  )
);

-- Doctors can update rows in their department
create policy if not exists visits_doctor_department_update
on public.visits
for update
using (
  exists (
    select 1
    from public.doctors d
    where d.auth_user_id = auth.uid()
      and d.department_id = visits.department_id
  )
)
with check (
  exists (
    select 1
    from public.doctors d
    where d.auth_user_id = auth.uid()
      and d.department_id = visits.department_id
  )
);

-- Department catalog is publicly readable for the app
create policy if not exists departments_read_all
on public.departments
for select
using (true);

-- Seed defaults
insert into public.departments (id, name, code, color, is_active)
values
  ('GENERAL', 'General Medicine', 'GM', 'bg-dept-general', true),
  ('ENT', 'ENT (Ear, Nose, Throat)', 'EN', 'bg-dept-ent', true),
  ('ORTHOPEDICS', 'Orthopedics', 'OR', 'bg-dept-orthopedics', true),
  ('DENTAL', 'Dental Care', 'DE', 'bg-dept-dental', true),
  ('CARDIOLOGY', 'Cardiology', 'CA', 'bg-dept-cardiology', true)
on conflict (id) do update
set
  name = excluded.name,
  code = excluded.code,
  color = excluded.color,
  is_active = excluded.is_active;
