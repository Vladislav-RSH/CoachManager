alter table public.profiles
  alter column role set default 'trainer';

update public.profiles
set role = case
  when lower(trim(role)) in ('client', 'клиент') then 'client'
  else 'trainer'
end
where role not in ('trainer', 'client');

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('trainer', 'client'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role text;
begin
  account_role := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', 'trainer')));

  if account_role in ('client', 'клиент') then
    account_role := 'client';
  else
    account_role := 'trainer';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    account_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
