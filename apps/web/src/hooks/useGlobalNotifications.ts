import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { pushNotification } from "../lib/notifications";
import { playSound } from "../lib/sound";
import type { BattleOutcome, NodeRaidOutcome } from "../types/database.types";

function useMyKingdomIds() {
  return useQuery({
    queryKey: ["myKingdomIds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kingdoms").select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.id as string);
    },
    staleTime: 60_000,
  });
}

function handleBattleResolved(row: unknown, isAttacker: boolean) {
  const report = row as { resolved_at: string | null; outcome: BattleOutcome | null };
  if (!report.resolved_at || !report.outcome) return;
  const won = report.outcome.winner === (isAttacker ? "attacker" : "defender");
  pushNotification(
    won ? "success" : "danger",
    won ? "Victory! Battle report ready." : "Defeat. Battle report ready."
  );
  playSound(won ? "success" : "danger");
}

/** Mounted once (in AppHeader) so attack/training/gathering alerts reach a
 * player regardless of which page they're on — not just when they happen
 * to be looking at the one page that renders that particular data.
 * Per-page hooks (useKingdom, useCombat, useMap) still subscribe on their
 * own to keep that page's query cache fresh; this hook owns alerting only,
 * so nothing double-fires when both happen to be mounted at once. */
export function useGlobalNotifications() {
  const { data: kingdomIds } = useMyKingdomIds();

  useEffect(() => {
    if (!kingdomIds || kingdomIds.length === 0) return;
    const idList = kingdomIds.join(",");

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "battle_reports",
          filter: `defender_kingdom_id=in.(${idList})`,
        },
        () => {
          pushNotification("danger", "Incoming attack!");
          playSound("danger");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_reports",
          filter: `attacker_kingdom_id=in.(${idList})`,
        },
        (payload) => handleBattleResolved(payload.new, true)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_reports",
          filter: `defender_kingdom_id=in.(${idList})`,
        },
        (payload) => handleBattleResolved(payload.new, false)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "node_raids",
          filter: `attacker_kingdom_id=in.(${idList})`,
        },
        (payload) => {
          const row = payload.new as { resolved_at: string | null; outcome: NodeRaidOutcome | null };
          if (!row.resolved_at || !row.outcome) return;
          if (row.outcome.result === "attacker_won") {
            pushNotification("success", `Raid won — plundered ${row.outcome.plundered ?? 0}`);
            playSound("success");
          } else if (row.outcome.result === "defender_won") {
            pushNotification("danger", "Raid failed — troops were repelled");
            playSound("danger");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gathering_orders",
          filter: `kingdom_id=in.(${idList})`,
        },
        (payload) => {
          const row = payload.new as { resolved_at: string | null; resource_awarded: number | null };
          if (!row.resolved_at) return;
          if (row.resource_awarded && row.resource_awarded > 0) {
            pushNotification("success", `Gathering party returned with ${row.resource_awarded} resources`);
            playSound("success");
          } else {
            pushNotification("danger", "Gathering party returned empty-handed");
            playSound("danger");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "troop_orders", filter: `kingdom_id=in.(${idList})` },
        (payload) => {
          const row = payload.new as { resolved: boolean; quantity: number; troop_key: string };
          if (row.resolved) {
            pushNotification("success", `Training complete: ${row.quantity} ${row.troop_key}`);
            playSound("success");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wounded_orders", filter: `kingdom_id=in.(${idList})` },
        (payload) => {
          const row = payload.new as { resolved: boolean; quantity: number; troop_key: string };
          if (row.resolved) {
            pushNotification("success", `${row.quantity} ${row.troop_key} healed and ready`);
            playSound("success");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "buildings", filter: `kingdom_id=in.(${idList})` },
        (payload) => {
          // Buildings update twice per upgrade (started, then completed) —
          // only the completion clears upgrade_finishes_at.
          const row = payload.new as { upgrade_finishes_at: string | null; level: number };
          if (row.upgrade_finishes_at === null) {
            pushNotification("success", `Building upgraded to level ${row.level}!`);
            playSound("success");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kingdomIds]);
}
