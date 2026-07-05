-- Validates cost, deducts resources, and starts a building's upgrade timer.
-- Clients never write buildings/kingdoms resource columns directly; this is
-- the only path that can start an upgrade.

create or replace function public.start_building_upgrade(p_building_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kingdom_id uuid;
  v_owner_id uuid;
  v_type_key text;
  v_level int;
  v_upgrade_finishes_at timestamptz;
  v_max_level int;
  v_cost_wood int;
  v_cost_stone int;
  v_cost_gold int;
  v_duration int;
  v_wood int;
  v_stone int;
  v_gold int;
begin
  select kingdom_id, type_key, level, upgrade_finishes_at
  into v_kingdom_id, v_type_key, v_level, v_upgrade_finishes_at
  from buildings
  where id = p_building_id
  for update;

  if not found then
    raise exception 'building not found';
  end if;

  select owner_id into v_owner_id from kingdoms where id = v_kingdom_id for update;

  if v_owner_id <> auth.uid() then
    raise exception 'not your building';
  end if;

  if v_upgrade_finishes_at is not null then
    raise exception 'already upgrading';
  end if;

  perform sync_kingdom_resources(v_kingdom_id);

  select max_level into v_max_level from building_types where key = v_type_key;

  if v_level >= v_max_level then
    raise exception 'building at max level';
  end if;

  select
    round(bt.base_cost_wood * power(bt.cost_growth, v_level - 1))::int,
    round(bt.base_cost_stone * power(bt.cost_growth, v_level - 1))::int,
    round(bt.base_cost_gold * power(bt.cost_growth, v_level - 1))::int,
    round(bt.base_upgrade_seconds * power(bt.duration_growth, v_level - 1))::int
  into v_cost_wood, v_cost_stone, v_cost_gold, v_duration
  from building_types bt
  where bt.key = v_type_key;

  select wood, stone, gold into v_wood, v_stone, v_gold from kingdoms where id = v_kingdom_id;

  if v_wood < v_cost_wood or v_stone < v_cost_stone or v_gold < v_cost_gold then
    raise exception 'insufficient resources';
  end if;

  update kingdoms
  set wood = wood - v_cost_wood, stone = stone - v_cost_stone, gold = gold - v_cost_gold
  where id = v_kingdom_id;

  update buildings
  set upgrade_started_at = now(), upgrade_finishes_at = now() + make_interval(secs => v_duration)
  where id = p_building_id;
end;
$$;
