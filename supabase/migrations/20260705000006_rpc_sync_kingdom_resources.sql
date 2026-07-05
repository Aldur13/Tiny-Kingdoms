-- Lazy resource-production resolution. Called at the top of every RPC that
-- touches a kingdom (and by sync_and_resolve_kingdom on every client fetch).
-- Correct for any offline duration with O(1) work and no background job.

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
    coalesce(sum(bt.base_production_per_second * b.level) filter (where bt.produces = 'food'), 0)
  into v_wood_rate, v_stone_rate, v_food_rate
  from buildings b
  join building_types bt on bt.key = b.type_key
  where b.kingdom_id = p_kingdom_id;

  update kingdoms
  set
    wood = wood + floor(v_wood_rate * v_elapsed),
    stone = stone + floor(v_stone_rate * v_elapsed),
    food = food + floor(v_food_rate * v_elapsed),
    last_resource_tick = now()
  where id = p_kingdom_id;
end;
$$;
