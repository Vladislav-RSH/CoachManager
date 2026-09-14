create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists workout_programs_client_id_idx
  on public.workout_programs (client_id);

create table if not exists public.workout_training_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  training_date date not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (program_id, training_date)
);

create index if not exists workout_training_days_program_id_idx
  on public.workout_training_days (program_id);

create index if not exists workout_training_days_training_date_idx
  on public.workout_training_days (training_date);

alter table public.workout_programs enable row level security;
alter table public.workout_training_days enable row level security;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to workout programs"
  on public.workout_programs
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to workout programs"
  on public.workout_programs
  for insert
  to anon
  with check (true);

create policy "Allow anonymous delete access to workout programs"
  on public.workout_programs
  for delete
  to anon
  using (true);

create policy "Allow anonymous read access to workout training days"
  on public.workout_training_days
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to workout training days"
  on public.workout_training_days
  for insert
  to anon
  with check (true);

create policy "Allow anonymous delete access to workout training days"
  on public.workout_training_days
  for delete
  to anon
  using (true);
