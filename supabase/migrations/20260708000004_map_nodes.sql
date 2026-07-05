-- Phase 3: neutral resource nodes scattered across each server's map.
-- A node's level (randomly assigned, 1-10) determines its total yield for a
-- full 12-hour gather. A node is consumed and replaced by a fresh one at a
-- random position whenever its gathering cycle ends, for any reason
-- (natural completion, early recall, or being raided) — see gathering.sql
-- and node_raids.sql for those lifecycle events.

create table public.map_nodes (
  id uuid primary key default gen_random_uuid(),
  server_id smallint not null references public.servers (id),
  resource_type text not null check (resource_type in ('gold', 'wood', 'stone')),
  level int not null check (level between 1 and 10),
  position_x int not null,
  position_y int not null,
  total_yield int not null,
  created_at timestamptz not null default now()
);

create index map_nodes_server_idx on public.map_nodes (server_id);

create or replace function public.spawn_map_node(p_server_id smallint, p_resource_type text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level int;
  v_id uuid;
begin
  v_level := 1 + floor(random() * 10)::int;

  insert into map_nodes (server_id, resource_type, level, position_x, position_y, total_yield)
  values (p_server_id, p_resource_type, v_level, floor(random() * 20)::int, floor(random() * 20)::int, v_level * 1000)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.spawn_map_node(smallint, text) from public, anon, authenticated;
