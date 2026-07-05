-- Shop: a small, data-driven table of purchasable items (currently just a
-- shield) so more items can be added later without new migrations. Buying
-- a shield extends the same protected_until column new kingdoms already
-- get for free at join time — a shield bought while one is still active
-- stacks on top of the remaining time rather than replacing it.

create table public.shop_items (
  key text primary key,
  name text not null,
  cost_gold int not null,
  shield_hours int not null
);

alter table public.shop_items enable row level security;
create policy "shop_items_select_all" on public.shop_items for select using (true);

insert into public.shop_items (key, name, cost_gold, shield_hours) values
  ('shield_24h', '24-Hour Shield', 150, 24);

create or replace function public.buy_shield(p_kingdom_id uuid, p_item_key text default 'shield_24h')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_gold int;
  v_cost_gold int;
  v_shield_hours int;
begin
  select owner_id into v_owner_id from kingdoms where id = p_kingdom_id for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  perform sync_kingdom_resources(p_kingdom_id);

  select cost_gold, shield_hours into v_cost_gold, v_shield_hours
  from shop_items where key = p_item_key;

  if not found then
    raise exception 'unknown shop item';
  end if;

  select gold into v_gold from kingdoms where id = p_kingdom_id;

  if v_gold < v_cost_gold then
    raise exception 'insufficient gold';
  end if;

  update kingdoms
  set
    gold = gold - v_cost_gold,
    protected_until = greatest(coalesce(protected_until, now()), now()) + make_interval(hours => v_shield_hours)
  where id = p_kingdom_id;
end;
$$;

grant execute on function public.buy_shield(uuid, text) to authenticated;
