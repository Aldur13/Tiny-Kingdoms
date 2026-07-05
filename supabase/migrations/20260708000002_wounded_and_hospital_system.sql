-- Phase 3: when troops are lost in combat, half of them are wounded rather
-- than killed outright — they occupy Hospital capacity (capacity_per_level
-- * Hospital level) while healing, at a resource cost and duration scaled
-- from the same troop_types stats training uses. Wounded beyond available
-- capacity die immediately, same as before this system existed. Healing is
-- automatic and mandatory (not something the player opts out of), so its
-- cost is deducted best-effort (clamped at zero) rather than blocking on
-- affordability.

create table public.wounded_orders (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  troop_key text not null references public.troop_types (key),
  quantity int not null check (quantity > 0),
  started_at timestamptz not null default now(),
  finishes_at timestamptz not null,
  resolved boolean not null default false
);

create index wounded_orders_pending_idx on public.wounded_orders (finishes_at)
  where resolved = false;

-- Routes p_quantity_lost of troop_key at p_kingdom_id through the hospital:
-- half become wounded (capped by remaining hospital capacity), the rest
-- die permanently. Called once per (kingdom, troop_key) combat loss by
-- resolve_battles and resolve_node_raids.
create or replace function public.apply_combat_loss(p_kingdom_id uuid, p_troop_key text, p_quantity_lost int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wounded_qty int;
  v_capacity int;
  v_used int;
  v_to_hospital int;
  v_train_seconds_base int;
  v_cost_wood int;
  v_cost_food int;
  v_heal_seconds int;
  v_heal_wood int;
  v_heal_food int;
begin
  if p_quantity_lost <= 0 then
    return;
  end if;

  v_wounded_qty := floor(p_quantity_lost * 0.5)::int;
  if v_wounded_qty <= 0 then
    return;
  end if;

  select coalesce(sum(bt.capacity_per_level * b.level), 0) into v_capacity
  from buildings b
  join building_types bt on bt.key = b.type_key
  where b.kingdom_id = p_kingdom_id and b.type_key = 'hospital';

  select coalesce(sum(quantity), 0) into v_used
  from wounded_orders
  where kingdom_id = p_kingdom_id and resolved = false;

  v_to_hospital := least(v_wounded_qty, greatest(0, v_capacity - v_used));

  if v_to_hospital <= 0 then
    return;
  end if;

  select train_seconds_base, cost_wood, cost_food
  into v_train_seconds_base, v_cost_wood, v_cost_food
  from troop_types where key = p_troop_key;

  v_heal_seconds := greatest(1, round(v_train_seconds_base * 0.5 * v_to_hospital)::int);
  v_heal_wood := round(v_cost_wood * 0.3 * v_to_hospital)::int;
  v_heal_food := round(v_cost_food * 0.3 * v_to_hospital)::int;

  update kingdoms
  set wood = greatest(0, wood - v_heal_wood), food = greatest(0, food - v_heal_food)
  where id = p_kingdom_id;

  insert into wounded_orders (kingdom_id, troop_key, quantity, started_at, finishes_at)
  values (p_kingdom_id, p_troop_key, v_to_hospital, now(), now() + make_interval(secs => v_heal_seconds));
end;
$$;

revoke all on function public.apply_combat_loss(uuid, text, int) from public, anon, authenticated;

-- Idempotent resolution of finished healing, mirroring resolve_finished_timers.
create or replace function public.resolve_wounded(p_kingdom_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with done as (
    update wounded_orders
    set resolved = true
    where resolved = false
      and finishes_at <= now()
      and (p_kingdom_id is null or kingdom_id = p_kingdom_id)
    returning kingdom_id, troop_key, quantity
  )
  insert into troops (kingdom_id, troop_key, quantity)
  select kingdom_id, troop_key, sum(quantity) from done group by kingdom_id, troop_key
  on conflict (kingdom_id, troop_key) do update
  set quantity = troops.quantity + excluded.quantity;
end;
$$;

revoke all on function public.resolve_wounded(uuid) from public, anon, authenticated;

-- Wire into the client-facing sync/resolve entry point.
create or replace function public.sync_and_resolve_kingdom(p_kingdom_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from kingdoms where id = p_kingdom_id;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  perform sync_kingdom_resources(p_kingdom_id);
  perform resolve_finished_timers(p_kingdom_id);
  perform resolve_battles(p_kingdom_id);
  perform resolve_wounded(p_kingdom_id);
end;
$$;

select cron.schedule(
  'resolve-wounded',
  '* * * * *',
  $$select public.resolve_wounded();$$
);
