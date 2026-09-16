alter table public.clients
  add column if not exists trainer_id uuid references auth.users(id) on delete cascade;

alter table public.clients
  alter column trainer_id set default auth.uid();

create index if not exists clients_trainer_id_idx
  on public.clients (trainer_id);

drop policy if exists "Allow anonymous read access to clients"
  on public.clients;
drop policy if exists "Allow anonymous insert access to clients"
  on public.clients;
drop policy if exists "Allow anonymous update access to clients"
  on public.clients;
drop policy if exists "Allow anonymous delete access to clients"
  on public.clients;
drop policy if exists "Allow authenticated read access to clients"
  on public.clients;
drop policy if exists "Allow authenticated insert access to clients"
  on public.clients;
drop policy if exists "Allow authenticated update access to clients"
  on public.clients;
drop policy if exists "Allow authenticated delete access to clients"
  on public.clients;

drop policy if exists "Allow anonymous read access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow anonymous insert access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow anonymous update access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow anonymous delete access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow authenticated read access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow authenticated insert access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow authenticated update access to client measurements"
  on public.client_measurements;
drop policy if exists "Allow authenticated delete access to client measurements"
  on public.client_measurements;

drop policy if exists "Allow anonymous read access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow anonymous insert access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow anonymous delete access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow authenticated read access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow authenticated insert access to calendar assignments"
  on public.calendar_assignments;
drop policy if exists "Allow authenticated delete access to calendar assignments"
  on public.calendar_assignments;

drop policy if exists "Allow anonymous read access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow anonymous insert access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow anonymous delete access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow authenticated read access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow authenticated insert access to workout programs"
  on public.workout_programs;
drop policy if exists "Allow authenticated delete access to workout programs"
  on public.workout_programs;

drop policy if exists "Allow anonymous read access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow anonymous insert access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow anonymous delete access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow authenticated read access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow authenticated insert access to workout training days"
  on public.workout_training_days;
drop policy if exists "Allow authenticated delete access to workout training days"
  on public.workout_training_days;

drop policy if exists "Allow anonymous read access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow anonymous insert access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow anonymous update access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow anonymous delete access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow authenticated read access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow authenticated insert access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow authenticated update access to workout training exercises"
  on public.workout_training_exercises;
drop policy if exists "Allow authenticated delete access to workout training exercises"
  on public.workout_training_exercises;

drop policy if exists "Allow anonymous read access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow anonymous insert access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow anonymous update access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow anonymous delete access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow authenticated read access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow authenticated insert access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow authenticated update access to workout exercise sets"
  on public.workout_exercise_sets;
drop policy if exists "Allow authenticated delete access to workout exercise sets"
  on public.workout_exercise_sets;

drop policy if exists "Allow anonymous read access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow anonymous insert access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow anonymous update access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow anonymous delete access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow authenticated read access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow authenticated insert access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow authenticated update access to nutrition programs"
  on public.nutrition_programs;
drop policy if exists "Allow authenticated delete access to nutrition programs"
  on public.nutrition_programs;

drop policy if exists "Allow anonymous read access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow anonymous insert access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow anonymous update access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow anonymous delete access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow authenticated read access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow authenticated insert access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow authenticated update access to nutrition meals"
  on public.nutrition_meals;
drop policy if exists "Allow authenticated delete access to nutrition meals"
  on public.nutrition_meals;

drop policy if exists "Allow anonymous read access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow anonymous insert access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow anonymous update access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow anonymous delete access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow authenticated read access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow authenticated insert access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow authenticated update access to nutrition meal items"
  on public.nutrition_meal_items;
drop policy if exists "Allow authenticated delete access to nutrition meal items"
  on public.nutrition_meal_items;

create policy "Own clients select"
  on public.clients
  for select
  to authenticated
  using (trainer_id = auth.uid());

create policy "Own clients insert"
  on public.clients
  for insert
  to authenticated
  with check (trainer_id = auth.uid());

create policy "Own clients update"
  on public.clients
  for update
  to authenticated
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "Own clients delete"
  on public.clients
  for delete
  to authenticated
  using (trainer_id = auth.uid());

create policy "Own measurements select"
  on public.client_measurements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own measurements insert"
  on public.client_measurements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own measurements update"
  on public.client_measurements
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own measurements delete"
  on public.client_measurements
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own calendar select"
  on public.calendar_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = calendar_assignments.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own calendar insert"
  on public.calendar_assignments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = calendar_assignments.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own calendar delete"
  on public.calendar_assignments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = calendar_assignments.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout programs select"
  on public.workout_programs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = workout_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout programs insert"
  on public.workout_programs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = workout_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout programs delete"
  on public.workout_programs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = workout_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout days select"
  on public.workout_training_days
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_programs
      join public.clients on clients.id = workout_programs.client_id
      where workout_programs.id = workout_training_days.program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout days insert"
  on public.workout_training_days
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_programs
      join public.clients on clients.id = workout_programs.client_id
      where workout_programs.id = workout_training_days.program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout days delete"
  on public.workout_training_days
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_programs
      join public.clients on clients.id = workout_programs.client_id
      where workout_programs.id = workout_training_days.program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout exercises select"
  on public.workout_training_exercises
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_training_days
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_days.id = workout_training_exercises.training_day_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout exercises insert"
  on public.workout_training_exercises
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_training_days
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_days.id = workout_training_exercises.training_day_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout exercises update"
  on public.workout_training_exercises
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_training_days
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_days.id = workout_training_exercises.training_day_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_training_days
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_days.id = workout_training_exercises.training_day_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout exercises delete"
  on public.workout_training_exercises
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_training_days
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_days.id = workout_training_exercises.training_day_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout sets select"
  on public.workout_exercise_sets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_training_exercises
      join public.workout_training_days
        on workout_training_days.id = workout_training_exercises.training_day_id
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_exercises.id = workout_exercise_sets.exercise_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout sets insert"
  on public.workout_exercise_sets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_training_exercises
      join public.workout_training_days
        on workout_training_days.id = workout_training_exercises.training_day_id
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_exercises.id = workout_exercise_sets.exercise_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout sets update"
  on public.workout_exercise_sets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_training_exercises
      join public.workout_training_days
        on workout_training_days.id = workout_training_exercises.training_day_id
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_exercises.id = workout_exercise_sets.exercise_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_training_exercises
      join public.workout_training_days
        on workout_training_days.id = workout_training_exercises.training_day_id
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_exercises.id = workout_exercise_sets.exercise_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own workout sets delete"
  on public.workout_exercise_sets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_training_exercises
      join public.workout_training_days
        on workout_training_days.id = workout_training_exercises.training_day_id
      join public.workout_programs
        on workout_programs.id = workout_training_days.program_id
      join public.clients on clients.id = workout_programs.client_id
      where workout_training_exercises.id = workout_exercise_sets.exercise_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition programs select"
  on public.nutrition_programs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = nutrition_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition programs insert"
  on public.nutrition_programs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = nutrition_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition programs update"
  on public.nutrition_programs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = nutrition_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = nutrition_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition programs delete"
  on public.nutrition_programs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = nutrition_programs.client_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition meals select"
  on public.nutrition_meals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.nutrition_programs
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_programs.id = nutrition_meals.nutrition_program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition meals insert"
  on public.nutrition_meals
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.nutrition_programs
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_programs.id = nutrition_meals.nutrition_program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition meals update"
  on public.nutrition_meals
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.nutrition_programs
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_programs.id = nutrition_meals.nutrition_program_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.nutrition_programs
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_programs.id = nutrition_meals.nutrition_program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition meals delete"
  on public.nutrition_meals
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.nutrition_programs
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_programs.id = nutrition_meals.nutrition_program_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition items select"
  on public.nutrition_meal_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.nutrition_meals
      join public.nutrition_programs
        on nutrition_programs.id = nutrition_meals.nutrition_program_id
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_meals.id = nutrition_meal_items.meal_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition items insert"
  on public.nutrition_meal_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.nutrition_meals
      join public.nutrition_programs
        on nutrition_programs.id = nutrition_meals.nutrition_program_id
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_meals.id = nutrition_meal_items.meal_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition items update"
  on public.nutrition_meal_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.nutrition_meals
      join public.nutrition_programs
        on nutrition_programs.id = nutrition_meals.nutrition_program_id
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_meals.id = nutrition_meal_items.meal_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.nutrition_meals
      join public.nutrition_programs
        on nutrition_programs.id = nutrition_meals.nutrition_program_id
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_meals.id = nutrition_meal_items.meal_id
        and clients.trainer_id = auth.uid()
    )
  );

create policy "Own nutrition items delete"
  on public.nutrition_meal_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.nutrition_meals
      join public.nutrition_programs
        on nutrition_programs.id = nutrition_meals.nutrition_program_id
      join public.clients on clients.id = nutrition_programs.client_id
      where nutrition_meals.id = nutrition_meal_items.meal_id
        and clients.trainer_id = auth.uid()
    )
  );
