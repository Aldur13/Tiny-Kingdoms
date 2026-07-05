-- Enables Supabase Realtime (postgres_changes) for the tables the frontend
-- needs live updates on, replacing client-side polling. RLS is still
-- enforced per-subscriber by Realtime itself, so this does not widen who
-- can see what — it only lets already-authorized rows push instead of poll.

alter publication supabase_realtime add table public.kingdoms;
alter publication supabase_realtime add table public.buildings;
alter publication supabase_realtime add table public.troops;
alter publication supabase_realtime add table public.troop_orders;
alter publication supabase_realtime add table public.wounded_orders;
alter publication supabase_realtime add table public.battle_reports;
alter publication supabase_realtime add table public.gathering_orders;
alter publication supabase_realtime add table public.node_raids;
alter publication supabase_realtime add table public.leaderboard_entries;
alter publication supabase_realtime add table public.map_nodes;
