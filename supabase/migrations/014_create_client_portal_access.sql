alter table public.client_invitations
  add column if not exists last_viewed_at timestamptz;

create or replace function public.get_client_portal(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row record;
  client_payload jsonb;
  trainer_payload jsonb;
  measurements_payload jsonb;
  calendar_payload jsonb;
  workout_payload jsonb;
  nutrition_payload jsonb;
begin
  select
    client_invitations.id,
    client_invitations.trainer_id,
    client_invitations.client_id,
    client_invitations.expires_at
  into invitation_row
  from public.client_invitations
  where client_invitations.token = p_token
  for update;

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if invitation_row.expires_at is not null
    and invitation_row.expires_at < now() then
    raise exception 'Invitation expired' using errcode = '22023';
  end if;

  if invitation_row.client_id is null then
    raise exception 'Client is not linked to this invitation'
      using errcode = '22023';
  end if;

  select jsonb_build_object(
    'id', clients.id,
    'firstName', clients.first_name,
    'secondName', clients.second_name,
    'birthDate', clients.birth_date,
    'height', clients.height,
    'currentWeight', clients.current_weight,
    'desiredWeight', clients.desired_weight,
    'goal', coalesce(clients.goal, ''),
    'createdAt', clients.created_at
  )
  into client_payload
  from public.clients
  where clients.id = invitation_row.client_id
    and clients.trainer_id = invitation_row.trainer_id;

  if client_payload is null then
    raise exception 'Client is not linked to this invitation'
      using errcode = '22023';
  end if;

  select jsonb_build_object(
    'fullName', coalesce(profiles.full_name, '')
  )
  into trainer_payload
  from public.profiles
  where profiles.id = invitation_row.trainer_id;

  trainer_payload := coalesce(
    trainer_payload,
    jsonb_build_object('fullName', '')
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', client_measurements.id,
        'measuredAt', client_measurements.measured_at,
        'weightKg', client_measurements.weight_kg,
        'chestCm', client_measurements.chest_cm,
        'waistCm', client_measurements.waist_cm,
        'hipsCm', client_measurements.hips_cm,
        'armCm', client_measurements.arm_cm,
        'thighCm', client_measurements.thigh_cm,
        'bodyFatPercent', client_measurements.body_fat_percent,
        'notes', coalesce(client_measurements.notes, '')
      )
      order by client_measurements.measured_at desc, client_measurements.created_at desc
    ),
    '[]'::jsonb
  )
  into measurements_payload
  from public.client_measurements
  where client_measurements.client_id = invitation_row.client_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', calendar_assignments.id,
        'scheduledDate', calendar_assignments.scheduled_date,
        'note', coalesce(calendar_assignments.note, '')
      )
      order by calendar_assignments.scheduled_date asc, calendar_assignments.created_at asc
    ),
    '[]'::jsonb
  )
  into calendar_payload
  from public.calendar_assignments
  where calendar_assignments.client_id = invitation_row.client_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', workout_programs.id,
        'title', workout_programs.title,
        'description', coalesce(workout_programs.description, ''),
        'trainingDays', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', workout_training_days.id,
                'trainingDate', workout_training_days.training_date,
                'title', workout_training_days.title,
                'content', workout_training_days.content,
                'exercises', coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', workout_training_exercises.id,
                        'exerciseName', workout_training_exercises.exercise_name,
                        'orderIndex', workout_training_exercises.order_index,
                        'notes', coalesce(workout_training_exercises.notes, ''),
                        'sets', coalesce(
                          (
                            select jsonb_agg(
                              jsonb_build_object(
                                'id', workout_exercise_sets.id,
                                'setNumber', workout_exercise_sets.set_number,
                                'weightKg', workout_exercise_sets.weight_kg,
                                'repetitions', workout_exercise_sets.repetitions,
                                'intensity', workout_exercise_sets.intensity,
                                'notes', coalesce(workout_exercise_sets.notes, '')
                              )
                              order by workout_exercise_sets.set_number asc,
                                workout_exercise_sets.created_at asc
                            )
                            from public.workout_exercise_sets
                            where workout_exercise_sets.exercise_id =
                              workout_training_exercises.id
                          ),
                          '[]'::jsonb
                        )
                      )
                      order by workout_training_exercises.order_index asc,
                        workout_training_exercises.created_at asc
                    )
                    from public.workout_training_exercises
                    where workout_training_exercises.training_day_id =
                      workout_training_days.id
                  ),
                  '[]'::jsonb
                )
              )
              order by workout_training_days.training_date asc,
                workout_training_days.created_at asc
            )
            from public.workout_training_days
            where workout_training_days.program_id = workout_programs.id
          ),
          '[]'::jsonb
        )
      )
      order by workout_programs.created_at desc
    ),
    '[]'::jsonb
  )
  into workout_payload
  from public.workout_programs
  where workout_programs.client_id = invitation_row.client_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', nutrition_programs.id,
        'title', nutrition_programs.title,
        'description', coalesce(nutrition_programs.description, ''),
        'targetCalories', nutrition_programs.target_calories,
        'targetProteinG', nutrition_programs.target_protein_g,
        'targetFatG', nutrition_programs.target_fat_g,
        'targetCarbsG', nutrition_programs.target_carbs_g,
        'status', nutrition_programs.status,
        'meals', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', nutrition_meals.id,
                'mealType', nutrition_meals.meal_type,
                'name', nutrition_meals.name,
                'mealTime', coalesce(nutrition_meals.meal_time, ''),
                'orderIndex', nutrition_meals.order_index,
                'notes', coalesce(nutrition_meals.notes, ''),
                'items', coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', nutrition_meal_items.id,
                        'foodName', nutrition_meal_items.food_name,
                        'amountG', nutrition_meal_items.amount_g,
                        'calories', nutrition_meal_items.calories,
                        'proteinG', nutrition_meal_items.protein_g,
                        'fatG', nutrition_meal_items.fat_g,
                        'carbsG', nutrition_meal_items.carbs_g,
                        'orderIndex', nutrition_meal_items.order_index
                      )
                      order by nutrition_meal_items.order_index asc,
                        nutrition_meal_items.created_at asc
                    )
                    from public.nutrition_meal_items
                    where nutrition_meal_items.meal_id = nutrition_meals.id
                  ),
                  '[]'::jsonb
                )
              )
              order by nutrition_meals.order_index asc,
                nutrition_meals.created_at asc
            )
            from public.nutrition_meals
            where nutrition_meals.nutrition_program_id = nutrition_programs.id
          ),
          '[]'::jsonb
        )
      )
      order by
        case nutrition_programs.status
          when 'active' then 0
          when 'draft' then 1
          else 2
        end,
        nutrition_programs.created_at desc
    ),
    '[]'::jsonb
  )
  into nutrition_payload
  from public.nutrition_programs
  where nutrition_programs.client_id = invitation_row.client_id;

  update public.client_invitations
  set last_viewed_at = now(),
      accepted_at = coalesce(accepted_at, now())
  where client_invitations.id = invitation_row.id;

  return jsonb_build_object(
    'client', client_payload,
    'trainer', trainer_payload,
    'measurements', measurements_payload,
    'calendarAssignments', calendar_payload,
    'workoutPrograms', workout_payload,
    'nutritionPrograms', nutrition_payload
  );
end;
$$;

revoke execute on function public.get_client_portal(uuid) from public;
grant execute on function public.get_client_portal(uuid) to anon, authenticated;

revoke execute on function public.accept_client_invitation(
  uuid,
  text,
  text,
  date,
  numeric,
  numeric,
  numeric,
  text,
  date,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  text
) from public, anon, authenticated;
