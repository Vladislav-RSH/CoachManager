create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('trainer', 'client')),
  document_key text not null check (
    document_key in (
      'privacy_policy',
      'user_agreement',
      'personal_data_consent',
      'health_data_consent',
      'training_risk_consent',
      'trainer_client_data_responsibility'
    )
  ),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  accepted_ip inet,
  user_agent text,
  source text not null default 'signup' check (source in ('signup', 'profile', 'invite', 'manual')),
  created_at timestamptz not null default now(),
  unique (user_id, document_key, document_version)
);

create index if not exists legal_consents_user_id_idx
  on public.legal_consents (user_id);

create index if not exists legal_consents_document_key_idx
  on public.legal_consents (document_key);

alter table public.legal_consents enable row level security;

drop policy if exists "Users can read own legal consents"
  on public.legal_consents;

create policy "Users can read own legal consents"
  on public.legal_consents
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role text;
  consent_item jsonb;
  consent_document_key text;
  consent_document_version text;
  consent_accepted_at timestamptz;
  consent_user_agent text;
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
  on conflict (id) do update
  set role = excluded.role,
      full_name = case
        when nullif(public.profiles.full_name, '') is null then excluded.full_name
        else public.profiles.full_name
      end;

  if jsonb_typeof(new.raw_user_meta_data -> 'legal_acceptances') = 'array' then
    for consent_item in
      select value
      from jsonb_array_elements(new.raw_user_meta_data -> 'legal_acceptances')
    loop
      consent_document_key := consent_item ->> 'document_key';
      consent_document_version := consent_item ->> 'document_version';
      consent_user_agent := nullif(consent_item ->> 'user_agent', '');

      if nullif(consent_item ->> 'accepted_at', '') is null then
        consent_accepted_at := now();
      else
        consent_accepted_at := (consent_item ->> 'accepted_at')::timestamptz;
      end if;

      if consent_document_key in (
        'privacy_policy',
        'user_agreement',
        'personal_data_consent',
        'health_data_consent',
        'training_risk_consent',
        'trainer_client_data_responsibility'
      )
      and nullif(consent_document_version, '') is not null then
        insert into public.legal_consents (
          user_id,
          email,
          role,
          document_key,
          document_version,
          accepted_at,
          user_agent,
          source
        )
        values (
          new.id,
          new.email,
          account_role,
          consent_document_key,
          consent_document_version,
          consent_accepted_at,
          consent_user_agent,
          'signup'
        )
        on conflict (user_id, document_key, document_version) do nothing;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

insert into public.legal_consents (
  user_id,
  email,
  role,
  document_key,
  document_version,
  accepted_at,
  user_agent,
  source
)
select
  users.id,
  users.email,
  case
    when lower(trim(coalesce(users.raw_user_meta_data ->> 'role', 'trainer'))) in ('client', 'клиент') then 'client'
    else 'trainer'
  end as role,
  consent_item ->> 'document_key' as document_key,
  consent_item ->> 'document_version' as document_version,
  case
    when nullif(consent_item ->> 'accepted_at', '') is null then users.created_at
    else (consent_item ->> 'accepted_at')::timestamptz
  end as accepted_at,
  nullif(consent_item ->> 'user_agent', '') as user_agent,
  'signup' as source
from auth.users users
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(users.raw_user_meta_data -> 'legal_acceptances') = 'array'
      then users.raw_user_meta_data -> 'legal_acceptances'
    else '[]'::jsonb
  end
) as consent_item
where jsonb_typeof(users.raw_user_meta_data -> 'legal_acceptances') = 'array'
  and consent_item ->> 'document_key' in (
    'privacy_policy',
    'user_agreement',
    'personal_data_consent',
    'health_data_consent',
    'training_risk_consent',
    'trainer_client_data_responsibility'
  )
  and nullif(consent_item ->> 'document_version', '') is not null
on conflict (user_id, document_key, document_version) do nothing;
