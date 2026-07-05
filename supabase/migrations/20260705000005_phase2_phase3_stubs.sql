-- Phase 2 (PvP) and Phase 3 (alliances) tables, created now so the schema
-- never needs a breaking migration later. Unused and fully locked down by
-- RLS (no policies granted) until their respective phases ship.

create table public.battle_reports (
  id uuid primary key default gen_random_uuid(),
  server_id smallint not null references public.servers (id),
  attacker_kingdom_id uuid not null references public.kingdoms (id),
  defender_kingdom_id uuid not null references public.kingdoms (id),
  march_started_at timestamptz not null,
  arrives_at timestamptz not null,
  resolved_at timestamptz,
  outcome jsonb,
  created_at timestamptz not null default now()
);

create table public.alliances (
  id uuid primary key default gen_random_uuid(),
  server_id smallint not null references public.servers (id),
  name text not null,
  tag text not null,
  leader_kingdom_id uuid not null references public.kingdoms (id),
  created_at timestamptz not null default now(),
  unique (server_id, tag)
);

create table public.alliance_members (
  alliance_id uuid not null references public.alliances (id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'officer', 'member')),
  joined_at timestamptz not null default now(),
  primary key (alliance_id, kingdom_id)
);
