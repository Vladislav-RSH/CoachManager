create table if not exists public.calendar_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (client_id, scheduled_date)
);

create index if not exists calendar_assignments_scheduled_date_idx
  on public.calendar_assignments (scheduled_date);

create index if not exists calendar_assignments_client_id_idx
  on public.calendar_assignments (client_id);

alter table public.calendar_assignments enable row level security;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to calendar assignments"
  on public.calendar_assignments
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to calendar assignments"
  on public.calendar_assignments
  for insert
  to anon
  with check (true);

create policy "Allow anonymous delete access to calendar assignments"
  on public.calendar_assignments
  for delete
  to anon
  using (true);
