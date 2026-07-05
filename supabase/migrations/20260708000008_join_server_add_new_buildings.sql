-- Bug fix: 20260708000001 backfilled Goldmine/Hospital onto existing
-- kingdoms but never updated join_server itself, so every kingdom created
-- afterward was silently missing both buildings. Re-defines join_server
-- (originally 20260705000008, last touched by 20260706000003) to include
-- them as slots 5 and 6.

create or replace function public.join_server(p_server_id smallint, p_kingdom_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_max_players int;
  v_player_count int;
  v_kingdom_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  if p_kingdom_name is null or length(trim(p_kingdom_name)) = 0 then
    raise exception 'kingdom name is required';
  end if;

  select status, max_players into v_status, v_max_players
  from servers
  where id = p_server_id
  for update;

  if not found then
    raise exception 'server not found';
  end if;

  if v_status <> 'open' then
    raise exception 'server is not open';
  end if;

  if exists (select 1 from kingdoms where server_id = p_server_id and owner_id = auth.uid()) then
    raise exception 'already have a kingdom on this server';
  end if;

  select count(*) into v_player_count from kingdoms where server_id = p_server_id;

  if v_player_count >= v_max_players then
    update servers set status = 'full' where id = p_server_id;
    raise exception 'server is full';
  end if;

  insert into kingdoms (server_id, owner_id, name, protected_until)
  values (p_server_id, auth.uid(), trim(p_kingdom_name), now() + interval '24 hours')
  returning id into v_kingdom_id;

  insert into buildings (kingdom_id, type_key, level, slot_index)
  values
    (v_kingdom_id, 'town_hall', 1, 0),
    (v_kingdom_id, 'sawmill', 1, 1),
    (v_kingdom_id, 'quarry', 1, 2),
    (v_kingdom_id, 'farm', 1, 3),
    (v_kingdom_id, 'barracks', 1, 4),
    (v_kingdom_id, 'goldmine', 1, 5),
    (v_kingdom_id, 'hospital', 1, 6);

  insert into troops (kingdom_id, troop_key, quantity)
  select v_kingdom_id, key, 0 from troop_types;

  if v_player_count + 1 >= v_max_players then
    update servers set status = 'full' where id = p_server_id;
  end if;

  perform recompute_power_score(v_kingdom_id);

  return v_kingdom_id;
end;
$$;
