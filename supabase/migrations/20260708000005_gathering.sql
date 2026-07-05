-- Phase 3: sending troops to gather from a neutral map node. A node is
-- claimed exclusively for up to 12 hours; recalling early prorates the
-- yield by elapsed time. node_id is deliberately not foreign-keyed to
-- map_nodes — nodes are deleted and replaced every time a gathering cycle
-- ends (see cycle_map_node below), while gathering_orders rows are kept
-- forever as history, so the two can't share a live FK relationship.

create table public.gathering_orders (
  id uuid primary key default gen_random_uuid(),
  server_id smallint not null references public.servers (id),
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  node_id uuid not null,
  resource_type text not null check (resource_type in ('gold', 'wood', 'stone')),
  total_yield int not null,
  troops jsonb not null,
  started_at timestamptz not null default now(),
  full_completes_at timestamptz not null,
  resolved_at timestamptz,
  resource_awarded int,
  interrupted boolean
);

create index gathering_orders_pending_idx on public.gathering_orders (full_completes_at)
  where resolved_at is null;
create index gathering_orders_node_idx on public.gathering_orders (node_id)
  where resolved_at is null;

-- Deletes a fully-cycled node and spawns its replacement elsewhere,
-- shared by natural completion, early recall, and raid disruption.
create or replace function public.cycle_map_node(p_node_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_server_id smallint;
  v_resource_type text;
begin
  select server_id, resource_type into v_server_id, v_resource_type
  from map_nodes where id = p_node_id;

  if found then
    delete from map_nodes where id = p_node_id;
    perform spawn_map_node(v_server_id, v_resource_type);
  end if;
end;
$$;

revoke all on function public.cycle_map_node(uuid) from public, anon, authenticated;

create or replace function public.start_gathering(p_kingdom_id uuid, p_node_id uuid, p_troops jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_server_id smallint;
  v_node_server_id smallint;
  v_resource_type text;
  v_total_yield int;
  v_available int;
  v_order_id uuid;
  r record;
begin
  if p_troops is null or jsonb_typeof(p_troops) <> 'object' or p_troops = '{}'::jsonb then
    raise exception 'must send at least one troop type';
  end if;

  select owner_id, server_id into v_owner_id, v_server_id from kingdoms where id = p_kingdom_id for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  select server_id, resource_type, total_yield into v_node_server_id, v_resource_type, v_total_yield
  from map_nodes where id = p_node_id;

  if not found then
    raise exception 'node not found';
  end if;

  if v_node_server_id <> v_server_id then
    raise exception 'node is not on your server';
  end if;

  if exists (select 1 from gathering_orders where node_id = p_node_id and resolved_at is null) then
    raise exception 'node is already claimed';
  end if;

  for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(p_troops)
  loop
    if not exists (select 1 from troop_types where key = r.troop_key) then
      raise exception 'unknown troop type %', r.troop_key;
    end if;

    if r.qty is null or r.qty <= 0 then
      raise exception 'quantity for % must be positive', r.troop_key;
    end if;

    select quantity into v_available from troops
    where kingdom_id = p_kingdom_id and troop_key = r.troop_key;

    if coalesce(v_available, 0) < r.qty then
      raise exception 'not enough % to send', r.troop_key;
    end if;
  end loop;

  for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(p_troops)
  loop
    update troops set quantity = quantity - r.qty
    where kingdom_id = p_kingdom_id and troop_key = r.troop_key;
  end loop;

  insert into gathering_orders (server_id, kingdom_id, node_id, resource_type, total_yield, troops, started_at, full_completes_at)
  values (v_server_id, p_kingdom_id, p_node_id, v_resource_type, v_total_yield, p_troops, now(), now() + interval '12 hours')
  returning id into v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.recall_gathering(p_gathering_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_order record;
  v_elapsed_fraction numeric;
  v_awarded int;
  r record;
begin
  select g.*, k.owner_id into v_order
  from gathering_orders g
  join kingdoms k on k.id = g.kingdom_id
  where g.id = p_gathering_order_id
  for update of g;

  if not found then
    raise exception 'gathering order not found';
  end if;

  if v_order.owner_id <> auth.uid() then
    raise exception 'not your gathering order';
  end if;

  if v_order.resolved_at is not null then
    raise exception 'gathering order already resolved';
  end if;

  v_elapsed_fraction := least(1.0, extract(epoch from (now() - v_order.started_at)) / 43200.0);
  v_awarded := round(v_order.total_yield * v_elapsed_fraction)::int;

  update kingdoms
  set
    wood = wood + case when v_order.resource_type = 'wood' then v_awarded else 0 end,
    stone = stone + case when v_order.resource_type = 'stone' then v_awarded else 0 end,
    gold = gold + case when v_order.resource_type = 'gold' then v_awarded else 0 end
  where id = v_order.kingdom_id;

  for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(v_order.troops)
  loop
    update troops set quantity = quantity + r.qty
    where kingdom_id = v_order.kingdom_id and troop_key = r.troop_key;
  end loop;

  update gathering_orders
  set resolved_at = now(), resource_awarded = v_awarded, interrupted = true
  where id = p_gathering_order_id;

  perform cycle_map_node(v_order.node_id);
end;
$$;

create or replace function public.resolve_gathering(p_kingdom_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  r record;
begin
  for g in
    select * from gathering_orders
    where resolved_at is null
      and full_completes_at <= now()
      and (p_kingdom_id is null or kingdom_id = p_kingdom_id)
    for update
  loop
    update kingdoms
    set
      wood = wood + case when g.resource_type = 'wood' then g.total_yield else 0 end,
      stone = stone + case when g.resource_type = 'stone' then g.total_yield else 0 end,
      gold = gold + case when g.resource_type = 'gold' then g.total_yield else 0 end
    where id = g.kingdom_id;

    for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(g.troops)
    loop
      update troops set quantity = quantity + r.qty
      where kingdom_id = g.kingdom_id and troop_key = r.troop_key;
    end loop;

    update gathering_orders
    set resolved_at = now(), resource_awarded = g.total_yield, interrupted = false
    where id = g.id;

    perform cycle_map_node(g.node_id);
  end loop;
end;
$$;

revoke all on function public.resolve_gathering(uuid) from public, anon, authenticated;

grant execute on function public.start_gathering(uuid, uuid, jsonb) to authenticated;
grant execute on function public.recall_gathering(uuid) to authenticated;

-- Wire natural completion into the client-facing sync/resolve entry point.
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
  perform resolve_gathering(p_kingdom_id);
end;
$$;

select cron.schedule(
  'resolve-gathering',
  '* * * * *',
  $$select public.resolve_gathering();$$
);
