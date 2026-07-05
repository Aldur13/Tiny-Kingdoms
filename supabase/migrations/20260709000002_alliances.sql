-- Phase 4: activates the alliances/alliance_members tables that were
-- stubbed (and RLS-locked with no policies) back in the initial schema.
-- Kept intentionally small: create/join/leave only, no invites, no
-- promote/kick RPCs yet, one alliance per kingdom per server.

create or replace function public.create_alliance(p_kingdom_id uuid, p_name text, p_tag text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_server_id smallint;
  v_alliance_id uuid;
begin
  select owner_id, server_id into v_owner_id, v_server_id from kingdoms where id = p_kingdom_id for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  if p_name is null or length(trim(p_name)) = 0 or length(trim(p_name)) > 40 then
    raise exception 'alliance name must be 1-40 characters';
  end if;

  if p_tag is null or length(trim(p_tag)) < 2 or length(trim(p_tag)) > 5 then
    raise exception 'alliance tag must be 2-5 characters';
  end if;

  if exists (select 1 from alliance_members where kingdom_id = p_kingdom_id) then
    raise exception 'already in an alliance on this server';
  end if;

  insert into alliances (server_id, name, tag, leader_kingdom_id)
  values (v_server_id, trim(p_name), upper(trim(p_tag)), p_kingdom_id)
  returning id into v_alliance_id;

  insert into alliance_members (alliance_id, kingdom_id, role)
  values (v_alliance_id, p_kingdom_id, 'leader');

  return v_alliance_id;
end;
$$;

create or replace function public.join_alliance(p_kingdom_id uuid, p_alliance_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_server_id smallint;
  v_alliance_server_id smallint;
begin
  select owner_id, server_id into v_owner_id, v_server_id from kingdoms where id = p_kingdom_id for update;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  select server_id into v_alliance_server_id from alliances where id = p_alliance_id;

  if not found then
    raise exception 'alliance not found';
  end if;

  if v_alliance_server_id <> v_server_id then
    raise exception 'alliance is not on your server';
  end if;

  if exists (select 1 from alliance_members where kingdom_id = p_kingdom_id) then
    raise exception 'already in an alliance on this server';
  end if;

  insert into alliance_members (alliance_id, kingdom_id, role)
  values (p_alliance_id, p_kingdom_id, 'member');
end;
$$;

create or replace function public.leave_alliance(p_kingdom_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_membership record;
  v_successor_kingdom_id uuid;
  v_remaining_count int;
begin
  select owner_id into v_owner_id from kingdoms where id = p_kingdom_id;

  if not found then
    raise exception 'kingdom not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'not your kingdom';
  end if;

  select * into v_membership from alliance_members where kingdom_id = p_kingdom_id;

  if not found then
    raise exception 'not in an alliance';
  end if;

  select count(*) into v_remaining_count
  from alliance_members
  where alliance_id = v_membership.alliance_id and kingdom_id <> p_kingdom_id;

  if v_membership.role = 'leader' and v_remaining_count > 0 then
    select kingdom_id into v_successor_kingdom_id
    from alliance_members
    where alliance_id = v_membership.alliance_id and kingdom_id <> p_kingdom_id
    order by case role when 'officer' then 0 else 1 end, joined_at asc
    limit 1;

    update alliances set leader_kingdom_id = v_successor_kingdom_id where id = v_membership.alliance_id;
    update alliance_members set role = 'leader' where alliance_id = v_membership.alliance_id and kingdom_id = v_successor_kingdom_id;
  end if;

  delete from alliance_members where alliance_id = v_membership.alliance_id and kingdom_id = p_kingdom_id;

  if v_remaining_count = 0 then
    delete from alliances where id = v_membership.alliance_id;
  end if;
end;
$$;

grant execute on function public.create_alliance(uuid, text, text) to authenticated;
grant execute on function public.join_alliance(uuid, uuid) to authenticated;
grant execute on function public.leave_alliance(uuid) to authenticated;

-- Rosters and the browse-list are low-sensitivity (name/tag/kingdom_id/
-- role only), so — like the leaderboard and active gathering orders —
-- they're world-readable rather than gated behind membership checks,
-- which also sidesteps recursive-RLS pitfalls on a self-referencing table.
create policy "alliances_select_all" on public.alliances for select using (true);
create policy "alliance_members_select_all" on public.alliance_members for select using (true);
