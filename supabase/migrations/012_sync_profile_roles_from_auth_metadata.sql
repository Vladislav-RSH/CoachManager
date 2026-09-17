with auth_profile_roles as (
  select
    users.id,
    coalesce(users.raw_user_meta_data ->> 'full_name', '') as full_name,
    case
      when lower(trim(coalesce(users.raw_user_meta_data ->> 'role', ''))) in ('client', 'клиент') then 'client'
      when lower(trim(coalesce(users.raw_user_meta_data ->> 'role', ''))) in ('trainer', 'тренер') then 'trainer'
      else null
    end as role
  from auth.users
)
insert into public.profiles (id, full_name, role)
select id, full_name, role
from auth_profile_roles
where role is not null
on conflict (id) do update
set
  full_name = case
    when nullif(public.profiles.full_name, '') is null then excluded.full_name
    else public.profiles.full_name
  end,
  role = excluded.role
where public.profiles.role is distinct from excluded.role;
