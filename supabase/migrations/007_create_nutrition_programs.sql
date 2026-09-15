create table if not exists public.nutrition_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  target_calories numeric(8, 2) check (
    target_calories is null or target_calories >= 0
  ),
  target_protein_g numeric(8, 2) check (
    target_protein_g is null or target_protein_g >= 0
  ),
  target_fat_g numeric(8, 2) check (
    target_fat_g is null or target_fat_g >= 0
  ),
  target_carbs_g numeric(8, 2) check (
    target_carbs_g is null or target_carbs_g >= 0
  ),
  status text not null default 'draft' check (
    status in ('draft', 'active', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_programs_client_id_idx
  on public.nutrition_programs (client_id);

create index if not exists nutrition_programs_status_idx
  on public.nutrition_programs (status);

create table if not exists public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  nutrition_program_id uuid not null references public.nutrition_programs(id) on delete cascade,
  meal_type text not null check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack')
  ),
  name text not null,
  meal_time text,
  order_index integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_meals_program_id_idx
  on public.nutrition_meals (nutrition_program_id);

create table if not exists public.nutrition_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  food_name text not null,
  amount_g numeric(8, 2) not null check (amount_g > 0),
  calories numeric(8, 2) check (calories is null or calories >= 0),
  protein_g numeric(8, 2) check (protein_g is null or protein_g >= 0),
  fat_g numeric(8, 2) check (fat_g is null or fat_g >= 0),
  carbs_g numeric(8, 2) check (carbs_g is null or carbs_g >= 0),
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_meal_items_meal_id_idx
  on public.nutrition_meal_items (meal_id);

alter table public.nutrition_programs enable row level security;
alter table public.nutrition_meals enable row level security;
alter table public.nutrition_meal_items enable row level security;

-- MVP policies for the current unauthenticated frontend.
-- Replace with authenticated owner-based policies before production.
create policy "Allow anonymous read access to nutrition programs"
  on public.nutrition_programs
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to nutrition programs"
  on public.nutrition_programs
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access to nutrition programs"
  on public.nutrition_programs
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access to nutrition programs"
  on public.nutrition_programs
  for delete
  to anon
  using (true);

create policy "Allow anonymous read access to nutrition meals"
  on public.nutrition_meals
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to nutrition meals"
  on public.nutrition_meals
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access to nutrition meals"
  on public.nutrition_meals
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access to nutrition meals"
  on public.nutrition_meals
  for delete
  to anon
  using (true);

create policy "Allow anonymous read access to nutrition meal items"
  on public.nutrition_meal_items
  for select
  to anon
  using (true);

create policy "Allow anonymous insert access to nutrition meal items"
  on public.nutrition_meal_items
  for insert
  to anon
  with check (true);

create policy "Allow anonymous update access to nutrition meal items"
  on public.nutrition_meal_items
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow anonymous delete access to nutrition meal items"
  on public.nutrition_meal_items
  for delete
  to anon
  using (true);
