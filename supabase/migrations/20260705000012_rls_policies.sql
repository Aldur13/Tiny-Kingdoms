-- Security boundary: players can read only their own kingdom/buildings/
-- troops/orders; the leaderboard and static reference tables are world-
-- readable. All writes to gameplay state happen exclusively through the
-- SECURITY DEFINER RPCs above — there are no insert/update/delete policies
-- on kingdoms/buildings/troops/troop_orders, so a client can never edit its
-- own resources or timers directly even with RLS satisfied.

alter table public.servers enable row level security;
alter table public.profiles enable row level security;
alter table public.kingdoms enable row level security;
alter table public.building_types enable row level security;
alter table public.buildings enable row level security;
alter table public.troop_types enable row level security;
alter table public.troop_orders enable row level security;
alter table public.troops enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.battle_reports enable row level security;
alter table public.alliances enable row level security;
alter table public.alliance_members enable row level security;

-- Reference/static data: world-readable.
create policy "servers_select_all" on public.servers for select using (true);
create policy "building_types_select_all" on public.building_types for select using (true);
create policy "troop_types_select_all" on public.troop_types for select using (true);

-- Profiles: readable/updatable only by their owner.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Kingdoms and their sub-resources: owner-only read, no direct write policy.
create policy "kingdoms_select_own" on public.kingdoms
  for select using (auth.uid() = owner_id);

create policy "buildings_select_own" on public.buildings
  for select using (
    exists (select 1 from kingdoms k where k.id = buildings.kingdom_id and k.owner_id = auth.uid())
  );

create policy "troops_select_own" on public.troops
  for select using (
    exists (select 1 from kingdoms k where k.id = troops.kingdom_id and k.owner_id = auth.uid())
  );

create policy "troop_orders_select_own" on public.troop_orders
  for select using (
    exists (select 1 from kingdoms k where k.id = troop_orders.kingdom_id and k.owner_id = auth.uid())
  );

-- Leaderboard: intentionally public-facing, world-readable regardless of owner.
create policy "leaderboard_select_all" on public.leaderboard_entries
  for select using (true);

-- battle_reports / alliances / alliance_members: RLS enabled, no policies
-- granted yet. Fully inaccessible to clients until Phase 2/3 activates them.

-- Function grants: internal/cron-only functions are not callable by clients.
revoke all on function public.resolve_finished_timers(uuid) from public, anon, authenticated;
revoke all on function public.recompute_power_score(uuid) from public, anon, authenticated;
revoke all on function public.sync_kingdom_resources(uuid) from public, anon, authenticated;

-- Client-facing RPCs.
grant execute on function public.sync_and_resolve_kingdom(uuid) to authenticated;
grant execute on function public.join_server(smallint, text) to authenticated;
grant execute on function public.start_building_upgrade(uuid) to authenticated;
grant execute on function public.start_troop_training(uuid, text, int) to authenticated;
