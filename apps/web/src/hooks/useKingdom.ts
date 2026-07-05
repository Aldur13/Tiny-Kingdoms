import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKingdomFull, startBuildingUpgrade, startTroopTraining } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import type { TroopKey } from "../types/database.types";

export function useKingdom(kingdomId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["kingdom", kingdomId],
    queryFn: () => fetchKingdomFull(kingdomId as string),
    enabled: !!kingdomId,
    // useGlobalNotifications (mounted app-wide) delivers live updates via
    // its own subscription; this interval + the one below are just a
    // safety net in case a subscription silently drops.
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!kingdomId) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["kingdom", kingdomId] });

    const channel = supabase
      .channel(`kingdom-${kingdomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kingdoms", filter: `id=eq.${kingdomId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "buildings", filter: `kingdom_id=eq.${kingdomId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "troops", filter: `kingdom_id=eq.${kingdomId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "troop_orders", filter: `kingdom_id=eq.${kingdomId}` },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wounded_orders", filter: `kingdom_id=eq.${kingdomId}` },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kingdomId, queryClient]);

  return query;
}

export function useStartBuildingUpgrade(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buildingId: string) => startBuildingUpgrade(buildingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kingdom", kingdomId] }),
  });
}

export function useStartTroopTraining(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ troopKey, quantity }: { troopKey: TroopKey; quantity: number }) =>
      startTroopTraining(kingdomId as string, troopKey, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kingdom", kingdomId] }),
  });
}
