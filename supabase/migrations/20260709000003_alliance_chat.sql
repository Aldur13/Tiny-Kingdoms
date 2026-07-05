-- Alliance chat. Unlike game-state tables (kingdoms/buildings/troops),
-- messages carry no economy value, so — like profiles — clients write
-- them directly under RLS rather than through a SECURITY DEFINER RPC.

create table public.alliance_messages (
  id uuid primary key default gen_random_uuid(),
  alliance_id uuid not null references public.alliances (id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index alliance_messages_alliance_idx on public.alliance_messages (alliance_id, created_at desc);

alter table public.alliance_messages enable row level security;

create policy "alliance_messages_select_member" on public.alliance_messages
  for select using (
    exists (
      select 1 from alliance_members am
      join kingdoms k on k.id = am.kingdom_id
      where am.alliance_id = alliance_messages.alliance_id and k.owner_id = auth.uid()
    )
  );

create policy "alliance_messages_insert_member" on public.alliance_messages
  for insert with check (
    exists (select 1 from kingdoms k where k.id = alliance_messages.kingdom_id and k.owner_id = auth.uid())
    and exists (
      select 1 from alliance_members am
      where am.alliance_id = alliance_messages.alliance_id and am.kingdom_id = alliance_messages.kingdom_id
    )
  );

alter publication supabase_realtime add table public.alliance_messages;
