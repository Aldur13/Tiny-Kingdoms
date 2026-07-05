-- Building types (static balance data) and per-kingdom building instances.

create table public.building_types (
  key text primary key,
  name text not null,
  max_level int not null default 20,
  produces text check (produces in ('wood', 'stone', 'food')),
  base_production_per_second numeric not null default 0,
  base_cost_wood int not null default 0,
  base_cost_stone int not null default 0,
  base_cost_gold int not null default 0,
  cost_growth numeric not null default 1.18,
  base_upgrade_seconds int not null default 60,
  duration_growth numeric not null default 1.18
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  type_key text not null references public.building_types (key),
  level int not null default 1,
  slot_index int not null,
  upgrade_started_at timestamptz,
  upgrade_finishes_at timestamptz,
  unique (kingdom_id, slot_index)
);

create index buildings_finishes_idx on public.buildings (upgrade_finishes_at)
  where upgrade_finishes_at is not null;
