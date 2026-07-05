-- Denormalized, world-readable leaderboard. Kept cheap to read by
-- recomputing on write (see recompute_power_score RPC) rather than
-- aggregating at read time.

create table public.leaderboard_entries (
  server_id smallint not null references public.servers (id),
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  kingdom_name text not null,
  owner_display_name text not null,
  power_score bigint not null default 0,
  rank int,
  updated_at timestamptz not null default now(),
  primary key (server_id, kingdom_id)
);

create index leaderboard_server_rank_idx on public.leaderboard_entries (server_id, power_score desc);
