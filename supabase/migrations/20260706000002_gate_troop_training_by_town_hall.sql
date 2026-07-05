-- Phase 2: higher-tier troops require a high enough Town Hall level.
-- Re-defines start_troop_training (originally added in
-- 20260705000010_rpc_start_troop_training.sql) to add that check; the rest
-- of the function is unchanged.

create or replace function public.start_troop_training(p_kingdom_id uuid, p_troop_key text, p_quantity int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_wood int;
  v_food int;
  v_cost_wood int;
  v_cost_food int;
  v_train_seconds_base int;
  v_required_town_hall_level int;
  v_town_hall_level int;
  v_duration int;
  v_order_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select owner_id into v_owner_id from kingdoms where id = p_kingdom_id for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  perform sync_kingdom_resources(p_kingdom_id);

  select cost_wood, cost_food, train_seconds_base, required_town_hall_level
  into v_cost_wood, v_cost_food, v_train_seconds_base, v_required_town_hall_level
  from troop_types
  where key = p_troop_key;

  if not found then
    raise exception 'unknown troop type';
  end if;

  select level into v_town_hall_level
  from buildings
  where kingdom_id = p_kingdom_id and type_key = 'town_hall';

  if v_town_hall_level < v_required_town_hall_level then
    raise exception 'requires Town Hall level %', v_required_town_hall_level;
  end if;

  v_cost_wood := v_cost_wood * p_quantity;
  v_cost_food := v_cost_food * p_quantity;
  v_duration := v_train_seconds_base * p_quantity;

  select wood, food into v_wood, v_food from kingdoms where id = p_kingdom_id;

  if v_wood < v_cost_wood or v_food < v_cost_food then
    raise exception 'insufficient resources';
  end if;

  update kingdoms set wood = wood - v_cost_wood, food = food - v_cost_food where id = p_kingdom_id;

  insert into troop_orders (kingdom_id, troop_key, quantity, started_at, finishes_at)
  values (p_kingdom_id, p_troop_key, p_quantity, now(), now() + make_interval(secs => v_duration))
  returning id into v_order_id;

  return v_order_id;
end;
$$;
