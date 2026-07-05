-- Phase 2: battle_reports needs to remember exactly which troops the
-- attacker committed (frozen at send time) so resolve_battles can compute
-- combat later without depending on the attacker's home army, which keeps
-- changing while the march is in flight.

alter table public.battle_reports
  add column attacker_troops jsonb not null default '{}'::jsonb;

-- Rock-paper-scissors counter check shared by send_attack's dominant-class
-- lookups and resolve_battles' combat math: infantry beats cavalry, ranged
-- beats infantry, cavalry beats ranged.
create or replace function public.troop_class_beats(a text, b text)
returns boolean
language sql
immutable
as $$
  select (a = 'infantry' and b = 'cavalry')
      or (a = 'ranged' and b = 'infantry')
      or (a = 'cavalry' and b = 'ranged');
$$;

revoke all on function public.troop_class_beats(text, text) from public, anon, authenticated;
