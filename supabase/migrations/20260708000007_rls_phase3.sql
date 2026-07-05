-- Phase 3 RLS. map_nodes is public reference data like servers/leaderboard.
-- wounded_orders is owner-only, same as troop_orders. gathering_orders is
-- the interesting one: it must be visible to *any* player while still
-- active (so the map UI can show a node as occupied and let someone raid
-- it), but only to its owner once resolved (so past gather history stays
-- private, matching how buildings/troops work everywhere else).

alter table public.map_nodes enable row level security;
create policy "map_nodes_select_all" on public.map_nodes for select using (true);

alter table public.wounded_orders enable row level security;
create policy "wounded_orders_select_own" on public.wounded_orders
  for select using (
    exists (select 1 from kingdoms k where k.id = wounded_orders.kingdom_id and k.owner_id = auth.uid())
  );

alter table public.gathering_orders enable row level security;
create policy "gathering_orders_select_active_or_own" on public.gathering_orders
  for select using (
    resolved_at is null
    or exists (select 1 from kingdoms k where k.id = gathering_orders.kingdom_id and k.owner_id = auth.uid())
  );

alter table public.node_raids enable row level security;
create policy "node_raids_select_participant" on public.node_raids
  for select using (
    exists (select 1 from kingdoms k where k.id = node_raids.attacker_kingdom_id and k.owner_id = auth.uid())
    or exists (
      select 1 from gathering_orders go
      join kingdoms k on k.id = go.kingdom_id
      where go.id = node_raids.gathering_order_id and k.owner_id = auth.uid()
    )
  );
