-- Phase 2: a player can see a battle report if they own either the
-- attacker or defender kingdom involved — so a defender can see they were
-- attacked without anything else about their kingdom becoming visible to
-- the attacker (or anyone else).

create policy "battle_reports_select_participant" on public.battle_reports
  for select using (
    exists (select 1 from kingdoms k where k.id = battle_reports.attacker_kingdom_id and k.owner_id = auth.uid())
    or exists (select 1 from kingdoms k where k.id = battle_reports.defender_kingdom_id and k.owner_id = auth.uid())
  );
