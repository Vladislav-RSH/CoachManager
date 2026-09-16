create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'Тренер',
  phone text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Тренер')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Allow anonymous read access to clients"
  on public.clients;
drop policy if exists "Allow anonymous insert access to clients"
  on public.clients;
drop policy if exists "Allow anonymous update access to clients"
  on public.clients;
drop policy if exists "Allow anonymous delete access to clients"
  on public.clients;

drop policy if exists "Allow anonymous read access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow anonymous insert access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow anonymous update access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow anonymous delete access to client measurements"
  on public.client_measurements;

drop policy if exists "Allow anonymous read access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow anonymous insert access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow anonymous delete access to calendar assignments"
  on public.calendar_assignments;

drop policy if exists "Allow anonymous read access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow anonymous insert access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow anonymous delete access to workout programs"
  on public.workout_programs;

drop policy if exists "Allow anonymous read access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow anonymous insert access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow anonymous delete access to workout training days"
  on public.workout_training_days;

drop policy if exists "Allow anonymous read access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow anonymous insert access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow anonymous update access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow anonymous delete access to workout training exercises"
  on public.workout_training_exercises;

drop policy if exists "Allow anonymous read access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow anonymous insert access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow anonymous update access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow anonymous delete access to workout exercise sets"
  on public.workout_exercise_sets;

drop policy if exists "Allow anonymous read access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow anonymous insert access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow anonymous update access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow anonymous delete access to nutrition programs"
  on public.nutrition_programs;

drop policy if exists "Allow anonymous read access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow anonymous insert access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow anonymous update access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow anonymous delete access to nutrition meals"
  on public.nutrition_meals;

drop policy if exists "Allow anonymous read access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow anonymous insert access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow anonymous update access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow anonymous delete access to nutrition meal items"
  on public.nutrition_meal_items;

create policy "Allow authenticated read access to clients"
  on public.clients
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to clients"
  on public.clients
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to clients"
  on public.clients
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to clients"
  on public.clients
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to client measurements"
  on public.client_measurements
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to client measurements"
  on public.client_measurements
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to client measurements"
  on public.client_measurements
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to client measurements"
  on public.client_measurements
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to calendar assignments"
  on public.calendar_assignments
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to calendar assignments"
  on public.calendar_assignments
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated delete access to calendar assignments"
  on public.calendar_assignments
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to workout programs"
  on public.workout_programs
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to workout programs"
  on public.workout_programs
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated delete access to workout programs"
  on public.workout_programs
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to workout training days"
  on public.workout_training_days
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to workout training days"
  on public.workout_training_days
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated delete access to workout training days"
  on public.workout_training_days
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to workout training exercises"
  on public.workout_training_exercises
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to workout training exercises"
  on public.workout_training_exercises
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to workout training exercises"
  on public.workout_training_exercises
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to workout training exercises"
  on public.workout_training_exercises
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to workout exercise sets"
  on public.workout_exercise_sets
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to workout exercise sets"
  on public.workout_exercise_sets
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to workout exercise sets"
  on public.workout_exercise_sets
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to workout exercise sets"
  on public.workout_exercise_sets
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to nutrition programs"
  on public.nutrition_programs
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to nutrition programs"
  on public.nutrition_programs
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to nutrition programs"
  on public.nutrition_programs
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to nutrition programs"
  on public.nutrition_programs
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to nutrition meals"
  on public.nutrition_meals
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to nutrition meals"
  on public.nutrition_meals
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to nutrition meals"
  on public.nutrition_meals
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to nutrition meals"
  on public.nutrition_meals
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated read access to nutrition meal items"
  on public.nutrition_meal_items
  for select
  to authenticated
  using (true);

create policy "Allow authenticated insert access to nutrition meal items"
  on public.nutrition_meal_items
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update access to nutrition meal items"
  on public.nutrition_meal_items
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete access to nutrition meal items"
  on public.nutrition_meal_items
  for delete
  to authenticated
  using (true);
