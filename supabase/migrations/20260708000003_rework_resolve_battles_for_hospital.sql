-- Phase 3: re-defines resolve_battles (originally 20260705000011, extended
-- for combat in 20260706000007) so that lost troops route through
-- apply_combat_loss (half wounded into the Hospital, half die) instead of
-- simply vanishing. Combat math itself (effective attack/defense, counter
-- bonus, winner/loss-fraction formula) is unchanged — factored out into
-- compute_loss_fractions so it isn't duplicated with resolve_node_raids.

create or replace function public.compute_loss_fractions(
  p_attacker_effective numeric,
  p_defender_effective numeric,
  out winner text,
  out attacker_loss_fraction numeric,
  out defender_loss_fraction numeric
)
language plpgsql
immutable
as $$
begin
  if p_attacker_effective > p_defender_effective then
    winner := 'attacker';
    defender_loss_fraction := 1.0;
    attacker_loss_fraction := least(0.6, p_defender_effective / greatest(p_attacker_effective, 1));
  else
    winner := 'defender';
    attacker_loss_fraction := 1.0;
    defender_loss_fraction := least(0.6, p_attacker_effective / greatest(p_defender_effective, 1));
  end if;
end;
$$;

revoke all on function public.compute_loss_fractions(numeric, numeric) from public, anon, authenticated;

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
  v_loss record;
  v_loot_wood int;
  v_loot_stone int;
  v_loot_food int;
  v_loot_gold int;
  v_outcome jsonb;
  v_survivors int;
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

    select * into v_loss from compute_loss_fractions(v_attacker_effective, v_defender_effective);

    -- Surviving attackers return home; the lost portion routes through the
    -- attacker's own Hospital.
    for r in select key as troop_key, (value #>> '{}')::int as qty from jsonb_each(b.attacker_troops)
    loop
      v_survivors := floor(r.qty * (1 - v_loss.attacker_loss_fraction))::int;
      update troops set quantity = quantity + v_survivors
      where kingdom_id = b.attacker_kingdom_id and troop_key = r.troop_key;
      perform apply_combat_loss(b.attacker_kingdom_id, r.troop_key, r.qty - v_survivors);
    end loop;

    -- Defenders fight with their whole standing army; the lost portion
    -- routes through the defender's own Hospital.
    for r in select troop_key, quantity as qty from troops
      where kingdom_id = b.defender_kingdom_id and quantity > 0
    loop
      v_survivors := floor(r.qty * (1 - v_loss.defender_loss_fraction))::int;
      update troops set quantity = v_survivors
      where kingdom_id = b.defender_kingdom_id and troop_key = r.troop_key;
      perform apply_combat_loss(b.defender_kingdom_id, r.troop_key, r.qty - v_survivors);
    end loop;

    if v_loss.winner = 'attacker' then
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
      'winner', v_loss.winner,
      'attacker_effective', v_attacker_effective,
      'defender_effective', v_defender_effective,
      'attacker_loss_fraction', v_loss.attacker_loss_fraction,
      'defender_loss_fraction', v_loss.defender_loss_fraction,
      'loot', jsonb_build_object('wood', v_loot_wood, 'stone', v_loot_stone, 'food', v_loot_food, 'gold', v_loot_gold)
    );

    update battle_reports set resolved_at = now(), outcome = v_outcome where id = b.id;

    perform recompute_power_score(b.attacker_kingdom_id);
    perform recompute_power_score(b.defender_kingdom_id);
  end loop;
end;
$$;
