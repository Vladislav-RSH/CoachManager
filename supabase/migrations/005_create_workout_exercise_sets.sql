create table if not exists public.workout_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.workout_training_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(8, 2),
  repetitions integer not null check (repetitions > 0),
  intensity text not null check (intensity in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz not null default now(),
  unique (exercise_id, set_number)
);

create index if not exists workout_exercise_sets_exercise_id_idx
  on public.workout_exercise_sets (exercise_id);

create index if not exists workout_exercise_sets_intensity_idx
  on public.workout_exercise_sets (intensity);

alter table public.workout_exercise_sets enable row level security;

-- If the previous MVP exercise table with grouped metrics was already applied,
-- split each grouped exercise into set-level rows before dropping old columns.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_training_exercises'
      and column_name = 'sets_count'
  ) then
    execute '
      insert into public.workout_exercise_sets (
        exercise_id,
        set_number,
        weight_kg,
        repetitions,
        intensity
      )
      select
        exercise.id,
        generated_set.set_number,
        exercise.weight_kg,
        exercise.repetitions,
        exercise.intensity
      from public.workout_training_exercises exercise
      cross join lateral generate_series(1, exercise.sets_count) as generated_set(set_number)
      where exercise.sets_count is not null
        and exercise.repetitions is not null
        and exercise.intensity is not null
      on conflict (exercise_id, set_number) do nothing
    ';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_training_exercises'
      and column_name = 'weight_kg'
  ) then
    alter table public.workout_training_exercises drop column weight_kg;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_training_exercises'
      and column_name = 'sets_count'
  ) then
    alter table public.workout_training_exercises drop column sets_count;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_training_exercises'
      and column_name = 'repetitions'
  ) then
    alter table public.workout_training_exercises drop column repetitions;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_training_exercises'
      and column_name = 'intensity'
  ) then
    alter table public.workout_training_exercises drop column intensity;
  end if;
end $$;

drop index if exists public.workout_training_exercises_intensity_idx;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to workout exercise sets"
  on public.workout_exercise_sets
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to workout exercise sets"
  on public.workout_exercise_sets
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access to workout exercise sets"
  on public.workout_exercise_sets
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access to workout exercise sets"
  on public.workout_exercise_sets
  for delete
  to anon
  using (true);
