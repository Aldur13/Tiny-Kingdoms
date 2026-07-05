-- Recomputes a kingdom's power score and upserts the public leaderboard
-- row. Called on join, on upgrade/training completion, and never at
-- leaderboard-read time, so leaderboard reads stay a cheap indexed select.

create or replace function public.recompute_power_score(p_kingdom_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_building_power bigint;
  v_troop_power bigint;
  v_total bigint;
  v_server_id smallint;
  v_kingdom_name text;
  v_owner_display_name text;
begin
  select coalesce(sum(level * 10), 0) into v_building_power
  from buildings
  where kingdom_id = p_kingdom_id;

  select coalesce(sum(t.quantity * tt.power_per_unit), 0) into v_troop_power
  from troops t
  join troop_types tt on tt.key = t.troop_key
  where t.kingdom_id = p_kingdom_id;

  v_total := v_building_power + v_troop_power;

  update kingdoms set power_score = v_total where id = p_kingdom_id;

  select k.server_id, k.name, p.display_name
  into v_server_id, v_kingdom_name, v_owner_display_name
  from kingdoms k
  join profiles p on p.id = k.owner_id
  where k.id = p_kingdom_id;

  if not found then
    raise exception 'kingdom not found';
  end if;

  insert into leaderboard_entries (server_id, kingdom_id, kingdom_name, owner_display_name, power_score, updated_at)
  values (v_server_id, p_kingdom_id, v_kingdom_name, v_owner_display_name, v_total, now())
  on conflict (server_id, kingdom_id) do update
  set
    kingdom_name = excluded.kingdom_name,
    owner_display_name = excluded.owner_display_name,
    power_score = excluded.power_score,
    updated_at = now();
end;
$$;
