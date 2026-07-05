import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBattleReports, sendAttack } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import type { TroopKey } from "../types/database.types";

export function useSendAttack(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      defenderKingdomId,
      troops,
    }: {
      defenderKingdomId: string;
      troops: Partial<Record<TroopKey, number>>;
    }) => sendAttack(kingdomId as string, defenderKingdomId, troops),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kingdom", kingdomId] }),
  });
}

export function useBattleReports(kingdomId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["battleReports", kingdomId],
    queryFn: () => fetchBattleReports(kingdomId as string),
    enabled: !!kingdomId,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!kingdomId) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["battleReports", kingdomId] });

    const channel = supabase
      .channel(`battles-${kingdomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "battle_reports",
          filter: `defender_kingdom_id=eq.${kingdomId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_reports",
          filter: `attacker_kingdom_id=eq.${kingdomId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_reports",
          filter: `defender_kingdom_id=eq.${kingdomId}`,
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kingdomId, queryClient]);

  return query;
}
