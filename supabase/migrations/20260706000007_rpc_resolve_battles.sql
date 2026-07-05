-- Authoritative, idempotent combat resolution for battle_reports whose
-- march has arrived. Deterministic by design (no RNG) so outcomes are easy
-- for a school-kid audience to reason about: whoever has the higher
-- effective attack/defense (troop stats + a 50% bonus if your dominant
-- troop class counters the opponent's dominant class) wins; the loser loses
-- everything they committed, the winner loses a fraction scaled to how
-- close the fight was (capped at 60%); a winning attacker loots 20% of the
-- defender's current resources. Called two ways, mirroring
-- resolve_finished_timers: by pg_cron every minute with no argument, and
-- scoped to one kingdom via sync_and_resolve_kingdom on every fetch by
-- either the attacker or defender.

create or replace function public.resolve_battles(p_kingdom_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_attacker_dominant text;
  v_defender_dominant text;
  v_attacker_effective numeric;
  v_defender_effective numeric;
  v_winner text;
  v_attacker_loss_fraction numeric;
  v_defender_loss_fraction numeric;
  v_loot_wood int;
  v_loot_stone int;
  v_loot_food int;
  v_loot_gold int;
  v_outcome jsonb;
  r record;
begin
  for b in
    select * from battle_reports
    where resolved_at is null
      and arrives_at <= now()
      and (p_kingdom_id is null or attacker_kingdom_id = p_kingdom_id or defender_kingdom_id = p_kingdom_id)
    for update
  loop
    select class into v_defender_dominant from (
      select tt.class, sum(t.quantity) as qty
      from troops t join troop_types tt on tt.key = t.troop_key
      where t.kingdom_id = b.defender_kingdom_id
      group by tt.class
      order by sum(t.quantity) desc
      limit 1
    ) x;

    select class into v_attacker_dominant from (
      select tt.class, sum((elem.value #>> '{}')::int) as qty
      from jsonb_each(b.attacker_troops) as elem(key, value)
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
    from jsonb_each(b.attacker_troops) as elem(key, value)
    join troop_types tt on tt.key = elem.key;

    select coalesce(sum(
      t.quantity * tt.defense *
      case when troop_class_beats(tt.class, v_attacker_dominant) then 1.5 else 1.0 end
    ), 0)
    into v_defender_effective
    from troops t
    join troop_types tt on tt.key = t.troop_key
    where t.kingdom_id = b.defender_kingdom_id;

    if v_attacker_effective > v_defender_effective then
      v_winner := 'attacker';
      v_defender_loss_fraction := 1.0;
      v_attacker_loss_fraction := least(0.6, v_defender_effective / greatest(v_attacker_effective, 1));
    else
      v_winner := 'defender';
      v_attacker_loss_fraction := 1.0;
      v_defender_loss_fraction := least(0.6, v_attacker_effective / greatest(v_defender_effective, 1));
    end if;

    -- Surviving attackers return home; the rest of the sent army is lost.
    for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(b.attacker_troops)
    loop
      update troops
      set quantity = quantity + floor(r.qty * (1 - v_attacker_loss_fraction))::int
      where kingdom_id = b.attacker_kingdom_id and troop_key = r.troop_key;
    end loop;

    -- Defenders fight with their whole standing army; losses apply uniformly.
    update troops
    set quantity = floor(quantity * (1 - v_defender_loss_fraction))::int
    where kingdom_id = b.defender_kingdom_id;

    if v_winner = 'attacker' then
      perform sync_kingdom_resources(b.defender_kingdom_id);

      select floor(wood * 0.20)::int, floor(stone * 0.20)::int, floor(food * 0.20)::int, floor(gold * 0.20)::int
      into v_loot_wood, v_loot_stone, v_loot_food, v_loot_gold
      from kingdoms where id = b.defender_kingdom_id;

      update kingdoms
      set wood = wood - v_loot_wood, stone = stone - v_loot_stone, food = food - v_loot_food, gold = gold - v_loot_gold
      where id = b.defender_kingdom_id;

      update kingdoms
      set wood = wood + v_loot_wood, stone = stone + v_loot_stone, food = food + v_loot_food, gold = gold + v_loot_gold
      where id = b.attacker_kingdom_id;
    else
      v_loot_wood := 0; v_loot_stone := 0; v_loot_food := 0; v_loot_gold := 0;
    end if;

    v_outcome := jsonb_build_object(
      'winner', v_winner,
      'attacker_effective', v_attacker_effective,
      'defender_effective', v_defender_effective,
      'attacker_loss_fraction', v_attacker_loss_fraction,
      'defender_loss_fraction', v_defender_loss_fraction,
      'loot', jsonb_build_object('wood', v_loot_wood, 'stone', v_loot_stone, 'food', v_loot_food, 'gold', v_loot_gold)
    );

    update battle_reports set resolved_at = now(), outcome = v_outcome where id = b.id;

    perform recompute_power_score(b.attacker_kingdom_id);
    perform recompute_power_score(b.defender_kingdom_id);
  end loop;
end;
$$;

revoke all on function public.resolve_battles(uuid) from public, anon, authenticated;

-- Extend the client-facing sync/resolve entry point (originally added in
-- 20260705000011_rpc_resolve_finished_timers.sql) to also resolve any due
-- battles the requesting kingdom is party to, on either side.
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
end;
$$;

grant execute on function public.send_attack(uuid, uuid, jsonb) to authenticated;

select cron.schedule(
  'resolve-battles',
  '* * * * *',
  $$select public.resolve_battles();$$
);
