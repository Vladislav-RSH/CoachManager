drop policy if exists "Own workout days update" on public.workout_training_days;

create policy "Own workout days update"
  on public.workout_training_days
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_programs
      join public.clients on clients.id = workout_programs.client_id
      where workout_programs.id = workout_training_days.program_id
        and clients.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_programs
      join public.clients on clients.id = workout_programs.client_id
      where workout_programs.id = workout_training_days.program_id
        and clients.trainer_id = auth.uid()
    )
  );
