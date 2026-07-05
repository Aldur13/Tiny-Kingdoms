-- Phase 3: raiding another kingdom's gathering party. Unlike a kingdom
-- attack (20% loot), a successful raid plunders 100% of whatever the
-- gathering party has accrued so far — the same amount they'd get from
-- recalling at that exact moment. If the gathering order already resolved
-- (finished naturally or was recalled) before the raid arrives, it's a
-- miss: no combat, the raiding troops just return home.

create table public.node_raids (
  id uuid primary key default gen_random_uuid(),
  server_id smallint not null references public.servers (id),
  attacker_kingdom_id uuid not null references public.kingdoms (id),
  gathering_order_id uuid not null references public.gathering_orders (id),
  attacker_troops jsonb not null,
  march_started_at timestamptz not null,
  arrives_at timestamptz not null,
  resolved_at timestamptz,
  outcome jsonb,
  created_at timestamptz not null default now()
);

create index node_raids_pending_idx on public.node_raids (arrives_at) where resolved_at is null;

create or replace function public.attack_gathering_party(p_kingdom_id uuid, p_gathering_order_id uuid, p_troops jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_server_id smallint;
  v_target record;
  v_march_seconds int;
  v_available int;
  v_raid_id uuid;
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

  select * into v_target from gathering_orders where id = p_gathering_order_id;

  if not found then
    raise exception 'gathering order not found';
  end if;

  if v_target.resolved_at is not null then
    raise exception 'that gathering party has already returned home';
  end if;

  if v_target.kingdom_id = p_kingdom_id then
    raise exception 'cannot raid your own gathering party';
  end if;

  if v_target.server_id <> v_server_id then
    raise exception 'target is not on the same server';
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

  select max(tt.march_seconds) into v_march_seconds
  from jsonb_each(p_troops) as elem(key, value)
  join troop_types tt on tt.key = elem.key;

  for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(p_troops)
  loop
    update troops set quantity = quantity - r.qty
    where kingdom_id = p_kingdom_id and troop_key = r.troop_key;
  end loop;

  insert into node_raids (server_id, attacker_kingdom_id, gathering_order_id, attacker_troops, march_started_at, arrives_at)
  values (v_server_id, p_kingdom_id, p_gathering_order_id, p_troops, now(), now() + make_interval(secs => v_march_seconds))
  returning id into v_raid_id;

  return v_raid_id;
end;
$$;

grant execute on function public.attack_gathering_party(uuid, uuid, jsonb) to authenticated;

create or replace function public.resolve_node_raids(p_kingdom_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  raid record;
  target record;
  v_attacker_dominant text;
  v_defender_dominant text;
  v_attacker_effective numeric;
  v_defender_effective numeric;
  v_loss record;
  v_elapsed_fraction numeric;
  v_accrued int;
  v_survivors int;
  v_outcome jsonb;
  r record;
begin
  for raid in
    select nr.* from node_raids nr
    join gathering_orders go on go.id = nr.gathering_order_id
    where nr.resolved_at is null
      and nr.arrives_at <= now()
      and (
        p_kingdom_id is null
        or nr.attacker_kingdom_id = p_kingdom_id
        or go.kingdom_id = p_kingdom_id
      )
    for update of nr
  loop
    select * into target from gathering_orders where id = raid.gathering_order_id for update;

    if target.resolved_at is not null then
      -- Gathering party already left before the raid arrived: a miss.
      for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(raid.attacker_troops)
      loop
        update troops set quantity = quantity + r.qty
        where kingdom_id = raid.attacker_kingdom_id and troop_key = r.troop_key;
      end loop;

      update node_raids
      set resolved_at = now(), outcome = jsonb_build_object('result', 'missed_target')
      where id = raid.id;

      continue;
    end if;

    select class into v_defender_dominant from (
      select tt.class, sum((elem.value #>> '{}')::int) as qty
      from jsonb_each(target.troops) as elem(key, value)
      join troop_types tt on tt.key = elem.key
      group by tt.class
      order by sum((elem.value #>> '{}')::int) desc
      limit 1
    ) x;

    select class into v_attacker_dominant from (
      select tt.class, sum((elem.value #>> '{}')::int) as qty
      from jsonb_each(raid.attacker_troops) as elem(key, value)
      join troop_types tt on tt.key = elem.key
      group by tt.class
      order by sum((elem.value #>> '{}')::int) desc
      limit 1
    ) x;

    select coalesce(sum(
      (elem.value #>> '{}')::int * tt.attack *
      case when troop_class_beats(tt.class, v_defender_dominant) then 1.5 else 1.0 end
    ), 0)
    into v_attacker_effective
    from jsonb_each(raid.attacker_troops) as elem(key, value)
    join troop_types tt on tt.key = elem.key;

    select coalesce(sum(
      (elem.value #>> '{}')::int * tt.defense *
      case when troop_class_beats(tt.class, v_attacker_dominant) then 1.5 else 1.0 end
    ), 0)
    into v_defender_effective
    from jsonb_each(target.troops) as elem(key, value)
    join troop_types tt on tt.key = elem.key;

    select * into v_loss from compute_loss_fractions(v_attacker_effective, v_defender_effective);

    -- Attacker's committed troops always take losses, win or lose.
    for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(raid.attacker_troops)
    loop
      v_survivors := floor(r.qty * (1 - v_loss.attacker_loss_fraction))::int;
      update troops set quantity = quantity + v_survivors
      where kingdom_id = raid.attacker_kingdom_id and troop_key = r.troop_key;
      perform apply_combat_loss(raid.attacker_kingdom_id, r.troop_key, r.qty - v_survivors);
    end loop;

    if v_loss.winner = 'attacker' then
      v_elapsed_fraction := least(1.0, extract(epoch from (now() - target.started_at)) / 43200.0);
      v_accrued := round(target.total_yield * v_elapsed_fraction)::int;

      update kingdoms
      set
        wood = wood + case when target.resource_type = 'wood' then v_accrued else 0 end,
        stone = stone + case when target.resource_type = 'stone' then v_accrued else 0 end,
        gold = gold + case when target.resource_type = 'gold' then v_accrued else 0 end
      where id = raid.attacker_kingdom_id;

      -- Defending gathering party is wiped out and plundered of everything.
      for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(target.troops)
      loop
        perform apply_combat_loss(target.kingdom_id, r.troop_key, r.qty);
      end loop;

      update gathering_orders
      set resolved_at = now(), resource_awarded = 0, interrupted = true
      where id = target.id;

      perform cycle_map_node(target.node_id);

      v_outcome := jsonb_build_object(
        'result', 'attacker_won', 'plundered', v_accrued,
        'attacker_effective', v_attacker_effective, 'defender_effective', v_defender_effective
      );
    else
      -- Gathering party holds; it's undisturbed and keeps running.
      v_outcome := jsonb_build_object(
        'result', 'defender_won',
        'attacker_effective', v_attacker_effective, 'defender_effective', v_defender_effective
      );
    end if;

    update node_raids set resolved_at = now(), outcome = v_outcome where id = raid.id;

    perform recompute_power_score(raid.attacker_kingdom_id);
    perform recompute_power_score(target.kingdom_id);
  end loop;
end;
$$;

revoke all on function public.resolve_node_raids(uuid) from public, anon, authenticated;

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
  perform resolve_node_raids(p_kingdom_id);
end;
$$;

select cron.schedule(
  'resolve-node-raids',
  '* * * * *',
  $$select public.resolve_node_raids();$$
);
