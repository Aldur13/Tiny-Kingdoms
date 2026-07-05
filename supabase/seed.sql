-- Seeds the default server/world instances and the static balance tables.
-- Values mirror packages/game-balance (buildings.ts / troops.ts) exactly —
-- Postgres is the authoritative source enforced by the RPCs, the TS copy
-- exists only so the frontend can render instant cost/duration previews.

insert into public.servers (id, name, status, max_players)
select gs, 'World ' || gs, 'open', 500
from generate_series(1, 10) as gs
on conflict (id) do nothing;

insert into public.building_types
  (key, name, max_level, produces, base_production_per_second, base_cost_wood, base_cost_stone, base_cost_gold, cost_growth, base_upgrade_seconds, duration_growth)
values
  ('town_hall', 'Town Hall', 20, null,   0,   500, 500, 150, 1.35, 600, 1.3),
  ('sawmill',   'Sawmill',   20, 'wood', 0.5, 100, 50,  10, 1.18, 60,  1.18),
  ('quarry',    'Quarry',    20, 'stone',0.4, 120, 40,  10, 1.18, 60,  1.18),
  ('farm',      'Farm',      20, 'food', 0.6, 100, 60,  10, 1.18, 60,  1.18),
  ('barracks',  'Barracks',  20, null,   0,   150, 100, 20, 1.2,  90,  1.2)
on conflict (key) do nothing;

-- Tier-1 troop types. On a database that already has these rows (seeded
-- before the Phase 2 troop-tiers migration added class/attack/defense/
-- march_seconds), this insert is skipped by the conflict clause and that
-- migration's own UPDATE statements backfill the new columns instead. On a
-- brand-new database, this insert runs after the migration and supplies the
-- new NOT NULL columns directly.
insert into public.troop_types
  (key, name, class, train_seconds_base, power_per_unit, cost_wood, cost_food, attack, defense, march_seconds, required_town_hall_level)
values
  ('militia', 'Militia', 'infantry', 10, 1, 20, 10, 5,  8, 300, 1),
  ('archer',  'Archer',  'ranged',   15, 2, 30, 15, 8,  4, 360, 1),
  ('cavalry', 'Cavalry', 'cavalry',  25, 4, 50, 30, 10, 5, 180, 1)
on conflict (key) do nothing;
