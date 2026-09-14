create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  second_name text not null,
  birth_date date,
  height numeric,
  current_weight numeric,
  desired_weight numeric,
  goal text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to clients"
  on public.clients
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to clients"
  on public.clients
  for insert
  to anon
  with check (true);

create policy "Allow anonymous delete access to clients"
  on public.clients
  for delete
  to anon
  using (true);
