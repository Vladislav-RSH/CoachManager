create table if not exists public.workout_training_exercises (
  id uuid primary key default gen_random_uuid(),
  training_day_id uuid not null references public.workout_training_days(id) on delete cascade,
  exercise_name text not null,
  order_index integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_training_exercises_training_day_id_idx
  on public.workout_training_exercises (training_day_id);

alter table public.workout_training_exercises enable row level security;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to workout training exercises"
  on public.workout_training_exercises
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to workout training exercises"
  on public.workout_training_exercises
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access to workout training exercises"
  on public.workout_training_exercises
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access to workout training exercises"
  on public.workout_training_exercises
  for delete
  to anon
  using (true);
