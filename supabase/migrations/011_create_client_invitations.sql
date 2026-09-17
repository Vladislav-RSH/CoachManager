alter table public.clients
  add column if not exists client_user_id uuid references auth.users(id) on delete set null;

create index if not exists clients_client_user_id_idx
  on public.clients (client_user_id);

create unique index if not exists clients_trainer_client_user_id_idx
  on public.clients (trainer_id, client_user_id)
  where client_user_id is not null;

create or replace function public.is_trainer_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'trainer'
  );
$$;

create or replace function public.client_can_keep_trainer(
  p_client_id uuid,
  p_trainer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients
    where id = p_client_id
      and client_user_id = auth.uid()
      and trainer_id = p_trainer_id
  );
$$;

create table if not exists public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  token uuid not null unique default gen_random_uuid(),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists client_invitations_trainer_id_idx
  on public.client_invitations (trainer_id);

create index if not exists client_invitations_token_idx
  on public.client_invitations (token);

alter table public.client_invitations enable row level security;

drop policy if exists "Own client invitations select"
  on public.client_invitations;
drop policy if exists "Own client invitations insert"
  on public.client_invitations;
drop policy if exists "Own client invitations delete"
  on public.client_invitations;

create policy "Own client invitations select"
  on public.client_invitations
  for select
  to authenticated
  using (trainer_id = auth.uid());

create policy "Own client invitations insert"
  on public.client_invitations
  for insert
  to authenticated
  with check (
    public.is_trainer_account()
    and trainer_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1
        from public.clients
        where clients.id = client_invitations.client_id
          and clients.trainer_id = auth.uid()
      )
    )
  );

create policy "Own client invitations delete"
  on public.client_invitations
  for delete
  to authenticated
  using (trainer_id = auth.uid() and accepted_at is null);

drop policy if exists "Own clients select" on public.clients;
drop policy if exists "Own clients insert" on public.clients;
drop policy if exists "Own clients update" on public.clients;
drop policy if exists "Own clients delete" on public.clients;

create policy "Own clients select"
  on public.clients
  for select
  to authenticated
  using (trainer_id = auth.uid() or client_user_id = auth.uid());

create policy "Own clients insert"
  on public.clients
  for insert
  to authenticated
  with check (public.is_trainer_account() and trainer_id = auth.uid());

create policy "Own clients update"
  on public.clients
  for update
  to authenticated
  using (
    (public.is_trainer_account() and trainer_id = auth.uid())
    or client_user_id = auth.uid()
  )
  with check (
    (public.is_trainer_account() and trainer_id = auth.uid())
    or (
      client_user_id = auth.uid()
      and public.client_can_keep_trainer(id, trainer_id)
    )
  );

create policy "Own clients delete"
  on public.clients
  for delete
  to authenticated
  using (trainer_id = auth.uid());

drop policy if exists "Own measurements select" on public.client_measurements;
drop policy if exists "Own measurements insert" on public.client_measurements;
drop policy if exists "Own measurements update" on public.client_measurements;
drop policy if exists "Own measurements delete" on public.client_measurements;

create policy "Own measurements select"
  on public.client_measurements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and (
          clients.trainer_id = auth.uid()
          or clients.client_user_id = auth.uid()
        )
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
        and (
          clients.trainer_id = auth.uid()
          or clients.client_user_id = auth.uid()
        )
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
        and (
          clients.trainer_id = auth.uid()
          or clients.client_user_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.clients
      where clients.id = client_measurements.client_id
        and (
          clients.trainer_id = auth.uid()
          or clients.client_user_id = auth.uid()
        )
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

create or replace function public.accept_client_invitation(
  p_token uuid,
  p_first_name text,
  p_second_name text,
  p_birth_date date default null,
  p_height numeric default null,
  p_current_weight numeric default null,
  p_desired_weight numeric default null,
  p_goal text default null,
  p_measurement_date date default null,
  p_measurement_weight_kg numeric default null,
  p_chest_cm numeric default null,
  p_waist_cm numeric default null,
  p_hips_cm numeric default null,
  p_arm_cm numeric default null,
  p_thigh_cm numeric default null,
  p_body_fat_percent numeric default null,
  p_measurement_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.client_invitations%rowtype;
  saved_client_id uuid;
  has_measurement boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if public.is_trainer_account() then
    raise exception 'Trainer accounts cannot accept client invitations'
      using errcode = '42501';
  end if;

  select *
  into invitation_row
  from public.client_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if invitation_row.expires_at is not null
    and invitation_row.expires_at < now() then
    raise exception 'Invitation expired' using errcode = '22023';
  end if;

  if invitation_row.accepted_by is not null
    and invitation_row.accepted_by <> auth.uid() then
    raise exception 'Invitation already accepted' using errcode = '23505';
  end if;

  if invitation_row.client_id is not null
    and exists (
      select 1
      from public.clients
      where id = invitation_row.client_id
        and client_user_id is not null
        and client_user_id <> auth.uid()
    ) then
    raise exception 'Client card is already linked to another account'
      using errcode = '23505';
  end if;

  if length(trim(coalesce(p_first_name, ''))) = 0
    or length(trim(coalesce(p_second_name, ''))) = 0 then
    raise exception 'Client name is required' using errcode = '23502';
  end if;

  if p_height < 0
    or p_current_weight < 0
    or p_desired_weight < 0
    or p_measurement_weight_kg < 0
    or p_chest_cm < 0
    or p_waist_cm < 0
    or p_hips_cm < 0
    or p_arm_cm < 0
    or p_thigh_cm < 0
    or p_body_fat_percent < 0
    or p_body_fat_percent > 100 then
    raise exception 'Invalid client measurements' using errcode = '22023';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    auth.uid(),
    trim(p_first_name) || ' ' || trim(p_second_name),
    'client'
  )
  on conflict (id) do update
  set role = 'client',
      full_name = excluded.full_name;

  if invitation_row.client_id is null then
    insert into public.clients (
      trainer_id,
      client_user_id,
      first_name,
      second_name,
      birth_date,
      height,
      current_weight,
      desired_weight,
      goal
    )
    values (
      invitation_row.trainer_id,
      auth.uid(),
      trim(p_first_name),
      trim(p_second_name),
      p_birth_date,
      p_height,
      p_current_weight,
      p_desired_weight,
      nullif(trim(coalesce(p_goal, '')), '')
    )
    returning id into saved_client_id;
  else
    update public.clients
    set client_user_id = auth.uid(),
        first_name = trim(p_first_name),
        second_name = trim(p_second_name),
        birth_date = p_birth_date,
        height = p_height,
        current_weight = p_current_weight,
        desired_weight = p_desired_weight,
        goal = nullif(trim(coalesce(p_goal, '')), '')
    where id = invitation_row.client_id
      and trainer_id = invitation_row.trainer_id
    returning id into saved_client_id;
  end if;

  if saved_client_id is null then
    raise exception 'Client card was not found' using errcode = 'P0002';
  end if;

  has_measurement :=
    p_measurement_weight_kg is not null
    or p_chest_cm is not null
    or p_waist_cm is not null
    or p_hips_cm is not null
    or p_arm_cm is not null
    or p_thigh_cm is not null
    or p_body_fat_percent is not null
    or length(trim(coalesce(p_measurement_notes, ''))) > 0;

  if has_measurement then
    insert into public.client_measurements (
      client_id,
      measured_at,
      weight_kg,
      chest_cm,
      waist_cm,
      hips_cm,
      arm_cm,
      thigh_cm,
      body_fat_percent,
      notes
    )
    values (
      saved_client_id,
      coalesce(p_measurement_date, current_date),
      p_measurement_weight_kg,
      p_chest_cm,
      p_waist_cm,
      p_hips_cm,
      p_arm_cm,
      p_thigh_cm,
      p_body_fat_percent,
      nullif(trim(coalesce(p_measurement_notes, '')), '')
    )
    on conflict (client_id, measured_at) do update
    set weight_kg = excluded.weight_kg,
        chest_cm = excluded.chest_cm,
        waist_cm = excluded.waist_cm,
        hips_cm = excluded.hips_cm,
        arm_cm = excluded.arm_cm,
        thigh_cm = excluded.thigh_cm,
        body_fat_percent = excluded.body_fat_percent,
        notes = excluded.notes;
  end if;

  update public.client_invitations
  set client_id = saved_client_id,
      accepted_by = auth.uid(),
      accepted_at = coalesce(accepted_at, now())
  where id = invitation_row.id;

  return saved_client_id;
end;
$$;

grant execute on function public.accept_client_invitation(
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
) to authenticated;
