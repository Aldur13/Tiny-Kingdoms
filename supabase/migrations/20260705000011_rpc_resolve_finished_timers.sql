-- Authoritative, idempotent resolution of due building upgrades and troop
-- training orders. Called two ways:
--   1. By pg_cron every minute with no argument (resolves everyone) — keeps
--      power_score/leaderboard fresh even for offline players.
--   2. Scoped to a single kingdom via sync_and_resolve_kingdom, on every
--      fetch of that kingdom by its owner — zero-latency for the active
--      player, independent of cron timing.
-- Idempotent by construction: every predicate is "still pending AND due",
-- so re-running (cron overlap, retried call) never double-credits.

create or replace function public.resolve_finished_timers(p_kingdom_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected_kingdoms uuid[];
  v_more uuid[];
begin
  with done as (
    update buildings
    set level = level + 1, upgrade_started_at = null, upgrade_finishes_at = null
    where upgrade_finishes_at is not null
      and upgrade_finishes_at <= now()
      and (p_kingdom_id is null or kingdom_id = p_kingdom_id)
    returning kingdom_id
  )
  select coalesce(array_agg(distinct kingdom_id), '{}') into v_affected_kingdoms from done;

  with done_orders as (
    update troop_orders
    set resolved = true
    where resolved = false
      and finishes_at <= now()
      and (p_kingdom_id is null or kingdom_id = p_kingdom_id)
    returning kingdom_id, troop_key, quantity
  ),
  totals as (
    select kingdom_id, troop_key, sum(quantity) as quantity
    from done_orders
    group by kingdom_id, troop_key
  ),
  credited as (
    insert into troops (kingdom_id, troop_key, quantity)
    select kingdom_id, troop_key, quantity from totals
    on conflict (kingdom_id, troop_key) do update
    set quantity = troops.quantity + excluded.quantity
    returning kingdom_id
  )
  select coalesce(array_agg(distinct kingdom_id), '{}') into v_more from credited;

  v_affected_kingdoms := array(select distinct unnest(v_affected_kingdoms || v_more));

  perform recompute_power_score(kid) from unnest(v_affected_kingdoms) as kid;
end;
$$;

-- Client-facing entry point: syncs resource production and resolves any
-- due timers for exactly one kingdom, after checking ownership.
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
end;
$$;
