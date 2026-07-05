import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKingdomFull, startBuildingUpgrade, startTroopTraining } from "../lib/api";
import type { TroopKey } from "../types/database.types";

export function useKingdom(kingdomId: string | null) {
  return useQuery({
    queryKey: ["kingdom", kingdomId],
    queryFn: () => fetchKingdomFull(kingdomId as string),
    enabled: !!kingdomId,
    // Buildings/troop timers change server-side even without user action,
    // so re-sync periodically in addition to on window focus.
    refetchInterval: 15_000,
  });
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
