-- Troop types (static balance data), training queue, and standing armies.

create table public.troop_types (
  key text primary key,
  name text not null,
  train_seconds_base int not null,
  power_per_unit int not null,
  cost_wood int not null,
  cost_food int not null
);

create table public.troop_orders (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  troop_key text not null references public.troop_types (key),
  quantity int not null check (quantity > 0),
  started_at timestamptz not null default now(),
  finishes_at timestamptz not null,
  resolved boolean not null default false
);

create index troop_orders_pending_idx on public.troop_orders (finishes_at)
  where resolved = false;

create table public.troops (
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  troop_key text not null references public.troop_types (key),
  quantity int not null default 0,
  primary key (kingdom_id, troop_key)
);
