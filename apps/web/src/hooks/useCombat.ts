import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBattleReports, sendAttack } from "../lib/api";
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
  return useQuery({
    queryKey: ["battleReports", kingdomId],
    queryFn: () => fetchBattleReports(kingdomId as string),
    enabled: !!kingdomId,
    refetchInterval: 15_000,
  });
}
