-- Phase 3: Goldmine (produces gold, the one resource nothing made until
-- now) and Hospital (holds wounded troops while they heal; capacity scales
-- with level, same as every other non-Town-Hall building it's capped by).

alter table public.building_types drop constraint building_types_produces_check;
alter table public.building_types add constraint building_types_produces_check
  check (produces in ('wood', 'stone', 'food', 'gold'));

alter table public.building_types add column capacity_per_level int not null default 0;

insert into public.building_types
  (key, name, max_level, produces, base_production_per_second, base_cost_wood, base_cost_stone, base_cost_gold, cost_growth, base_upgrade_seconds, duration_growth, capacity_per_level)
values
  ('goldmine', 'Goldmine', 20, 'gold', 0.3, 110, 70, 15, 1.18, 70, 1.18, 0),
  ('hospital', 'Hospital', 20, null,   0,   140, 90, 15, 1.2,  80, 1.2,  50)
on conflict (key) do nothing;

-- Add the two new slots to every kingdom that doesn't already have them
-- (both freshly seeded ones going forward, via join_server, and any that
-- already existed before this migration).
insert into public.buildings (kingdom_id, type_key, level, slot_index)
select k.id, 'goldmine', 1, 5
from kingdoms k
where not exists (select 1 from buildings b where b.kingdom_id = k.id and b.type_key = 'goldmine');

insert into public.buildings (kingdom_id, type_key, level, slot_index)
select k.id, 'hospital', 1, 6
from kingdoms k
where not exists (select 1 from buildings b where b.kingdom_id = k.id and b.type_key = 'hospital');

-- Extend resource production (originally 20260705000006) to include gold.
create or replace function public.sync_kingdom_resources(p_kingdom_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_tick timestamptz;
  v_elapsed numeric;
  v_wood_rate numeric := 0;
  v_stone_rate numeric := 0;
  v_food_rate numeric := 0;
  v_gold_rate numeric := 0;
begin
  select last_resource_tick into v_last_tick
  from kingdoms
  where id = p_kingdom_id
  for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  v_elapsed := extract(epoch from (now() - v_last_tick));
  if v_elapsed <= 0 then
    return;
  end if;

  select
    coalesce(sum(bt.base_production_per_second * b.level) filter (where bt.produces = 'wood'), 0),
    coalesce(sum(bt.base_production_per_second * b.level) filter (where bt.produces = 'stone'), 0),
    coalesce(sum(bt.base_production_per_second * b.level) filter (where bt.produces = 'food'), 0),
    coalesce(sum(bt.base_production_per_second * b.level) filter (where bt.produces = 'gold'), 0)
  into v_wood_rate, v_stone_rate, v_food_rate, v_gold_rate
  from buildings b
  join building_types bt on bt.key = b.type_key
  where b.kingdom_id = p_kingdom_id;

  update kingdoms
  set
    wood = wood + floor(v_wood_rate * v_elapsed),
    stone = stone + floor(v_stone_rate * v_elapsed),
    food = food + floor(v_food_rate * v_elapsed),
    gold = gold + floor(v_gold_rate * v_elapsed),
    last_resource_tick = now()
  where id = p_kingdom_id;
end;
$$;
