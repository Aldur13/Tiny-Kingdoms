-- Core schema: servers (world instances), profiles, kingdoms.
-- Every gameplay table is partitioned by server_id so that "~100 servers"
-- is just a foreign key, not separate infrastructure per world.

create extension if not exists "pgcrypto";

-- ===== SERVERS =====
create table public.servers (
  id smallint primary key,
  name text not null,
  status text not null default 'open' check (status in ('open', 'full', 'closed', 'archived')),
  max_players int not null default 500,
  opened_at timestamptz not null default now(),
  ruleset_version text not null default 'v1'
);

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row for every new auth user (including anonymous
-- guest sign-ins, which have no metadata, hence the fallback name).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Player' || substr(new.id::text, 1, 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== KINGDOMS (one per player per server) =====
create table public.kingdoms (
  id uuid primary key default gen_random_uuid(),
  server_id smallint not null references public.servers (id),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  power_score bigint not null default 0,
  wood int not null default 500,
  stone int not null default 500,
  food int not null default 500,
  gold int not null default 100,
  last_resource_tick timestamptz not null default now(),
  protected_until timestamptz,
  created_at timestamptz not null default now(),
  unique (server_id, owner_id)
);

create index kingdoms_server_power_idx on public.kingdoms (server_id, power_score desc);
