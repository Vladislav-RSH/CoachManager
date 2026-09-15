create table if not exists public.client_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(8, 2) check (weight_kg is null or weight_kg >= 0),
  chest_cm numeric(6, 2) check (chest_cm is null or chest_cm >= 0),
  waist_cm numeric(6, 2) check (waist_cm is null or waist_cm >= 0),
  hips_cm numeric(6, 2) check (hips_cm is null or hips_cm >= 0),
  arm_cm numeric(6, 2) check (arm_cm is null or arm_cm >= 0),
  thigh_cm numeric(6, 2) check (thigh_cm is null or thigh_cm >= 0),
  body_fat_percent numeric(5, 2) check (
    body_fat_percent is null
    or (body_fat_percent >= 0 and body_fat_percent <= 100)
  ),
  notes text,
  created_at timestamptz not null default now(),
  unique (client_id, measured_at)
);

create index if not exists client_measurements_client_id_idx
  on public.client_measurements (client_id);

create index if not exists client_measurements_measured_at_idx
  on public.client_measurements (measured_at desc);

alter table public.clients enable row level security;

-- The clients table was created before edit support was added.
create policy "Allow anonymous update access to clients"
  on public.clients
  for update
  to anon
  using (true)
  with check (true);

alter table public.client_measurements enable row level security;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to client measurements"
  on public.client_measurements
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to client measurements"
  on public.client_measurements
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access to client measurements"
  on public.client_measurements
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access to client measurements"
  on public.client_measurements
  for delete
  to anon
  using (true);
