-- Phase 2 (PvP): extends troop_types with a class (for the rock-paper-
-- scissors counter triangle: infantry beats cavalry, ranged beats infantry,
-- cavalry beats ranged), combat stats, march speed, and a Town Hall level
-- gate — so higher-tier troops are unlocked as the kingdom grows instead of
-- everything being available from level 1.

alter table public.troop_types
  add column class text check (class in ('infantry', 'ranged', 'cavalry')),
  add column attack int,
  add column defense int,
  add column march_seconds int,
  add column required_town_hall_level int not null default 1;

-- Backfill the three existing (tier-1) troop types.
update public.troop_types set class = 'infantry', attack = 5,  defense = 8,  march_seconds = 300, required_town_hall_level = 1 where key = 'militia';
update public.troop_types set class = 'ranged',   attack = 8,  defense = 4,  march_seconds = 360, required_town_hall_level = 1 where key = 'archer';
update public.troop_types set class = 'cavalry',  attack = 10, defense = 5,  march_seconds = 180, required_town_hall_level = 1 where key = 'cavalry';

alter table public.troop_types
  alter column class set not null,
  alter column attack set not null,
  alter column defense set not null,
  alter column march_seconds set not null;

-- Tier 2 (unlocked at Town Hall 5) and tier 3 (unlocked at Town Hall 10),
-- roughly 2.5x the stats/cost of the tier below, same class per lineage so
-- the counter triangle applies regardless of tier.
insert into public.troop_types
  (key, name, class, train_seconds_base, power_per_unit, cost_wood, cost_food, attack, defense, march_seconds, required_town_hall_level)
values
  ('swordsman',    'Swordsman',    'infantry', 20, 3,  60,  30,  12, 20, 300, 5),
  ('crossbowman',  'Crossbowman',  'ranged',   30, 5,  90,  45,  20, 10, 360, 5),
  ('lancer',       'Lancer',       'cavalry',  45, 8,  140, 80,  24, 12, 150, 5),
  ('guardian',     'Guardian',     'infantry', 35, 7,  150, 75,  28, 48, 300, 10),
  ('sharpshooter', 'Sharpshooter', 'ranged',   55, 12, 220, 110, 48, 24, 360, 10),
  ('knight',       'Knight',       'cavalry',  80, 18, 320, 180, 58, 28, 120, 10)
on conflict (key) do nothing;
