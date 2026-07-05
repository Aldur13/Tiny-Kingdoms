-- Seeds the 100 server/world instances and the static balance tables.
-- Values mirror packages/game-balance (buildings.ts / troops.ts) exactly —
-- Postgres is the authoritative source enforced by the RPCs, the TS copy
-- exists only so the frontend can render instant cost/duration previews.

insert into public.servers (id, name, status, max_players)
select gs, 'World ' || gs, 'open', 500
from generate_series(1, 100) as gs
on conflict (id) do nothing;

insert into public.building_types
  (key, name, max_level, produces, base_production_per_second, base_cost_wood, base_cost_stone, base_cost_gold, cost_growth, base_upgrade_seconds, duration_growth)
values
  ('town_hall', 'Town Hall', 20, null,   0,   200, 200, 50, 1.22, 120, 1.2),
  ('sawmill',   'Sawmill',   20, 'wood', 0.5, 100, 50,  10, 1.18, 60,  1.18),
  ('quarry',    'Quarry',    20, 'stone',0.4, 120, 40,  10, 1.18, 60,  1.18),
  ('farm',      'Farm',      20, 'food', 0.6, 100, 60,  10, 1.18, 60,  1.18),
  ('barracks',  'Barracks',  20, null,   0,   150, 100, 20, 1.2,  90,  1.2)
on conflict (key) do nothing;

insert into public.troop_types (key, name, train_seconds_base, power_per_unit, cost_wood, cost_food)
values
  ('militia', 'Militia', 10, 1, 20, 10),
  ('archer',  'Archer',  15, 2, 30, 15),
  ('cavalry', 'Cavalry', 25, 4, 50, 30)
on conflict (key) do nothing;
