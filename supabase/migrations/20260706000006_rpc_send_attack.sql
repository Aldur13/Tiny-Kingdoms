-- Validates and launches an attack: checks ownership, same-server target,
-- defender protection, and that the attacker actually has the troops at
-- home; deducts the sent troops immediately (survivors return on
-- resolution) and clears the attacker's own protection.

create or replace function public.send_attack(p_kingdom_id uuid, p_defender_kingdom_id uuid, p_troops jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_server_id smallint;
  v_defender_server_id smallint;
  v_defender_protected_until timestamptz;
  v_march_seconds int;
  v_total_qty bigint := 0;
  v_available int;
  v_battle_id uuid;
  r record;
begin
  if p_troops is null or jsonb_typeof(p_troops) <> 'object' or p_troops = '{}'::jsonb then
    raise exception 'must send at least one troop type';
  end if;

  if p_kingdom_id = p_defender_kingdom_id then
    raise exception 'cannot attack your own kingdom';
  end if;

  select owner_id, server_id into v_owner_id, v_server_id
  from kingdoms where id = p_kingdom_id for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  select server_id, protected_until into v_defender_server_id, v_defender_protected_until
  from kingdoms where id = p_defender_kingdom_id for update;

  if not found then
    raise exception 'target kingdom not found';
  end if;

  if v_defender_server_id <> v_server_id then
    raise exception 'target is not on the same server';
  end if;

  if v_defender_protected_until is not null and v_defender_protected_until > now() then
    raise exception 'target is under new-player protection';
  end if;

  -- Validate composition: every key is a real troop type, every quantity is
  -- a positive integer, and the attacker actually has that many at home.
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

    v_total_qty := v_total_qty + r.qty;
  end loop;

  if v_total_qty = 0 then
    raise exception 'must send at least one troop';
  end if;

  -- The slowest committed troop type sets the marching pace.
  select max(tt.march_seconds) into v_march_seconds
  from jsonb_each(p_troops) as elem(key, value)
  join troop_types tt on tt.key = elem.key;

  -- Deduct sent troops now so they can't be double-committed to another
  -- attack while marching; survivors are credited back on resolution.
  for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(p_troops)
  loop
    update troops set quantity = quantity - r.qty
    where kingdom_id = p_kingdom_id and troop_key = r.troop_key;
  end loop;

  -- Attacking clears your own protection — no hit-and-hide.
  update kingdoms set protected_until = null where id = p_kingdom_id;

  insert into battle_reports
    (server_id, attacker_kingdom_id, defender_kingdom_id, march_started_at, arrives_at, attacker_troops)
  values
    (v_server_id, p_kingdom_id, p_defender_kingdom_id, now(), now() + make_interval(secs => v_march_seconds), p_troops)
  returning id into v_battle_id;

  perform recompute_power_score(p_kingdom_id);

  return v_battle_id;
end;
$$;
