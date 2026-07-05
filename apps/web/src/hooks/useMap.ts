import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  attackGatheringParty,
  fetchActiveGatheringOrders,
  fetchMapNodes,
  fetchMyGatheringOrders,
  fetchNodeRaids,
  recallGathering,
  startGathering,
} from "../lib/api";
import type { TroopKey } from "../types/database.types";

export function useNodeRaids(kingdomId: string | null) {
  return useQuery({
    queryKey: ["nodeRaids", kingdomId],
    queryFn: () => fetchNodeRaids(kingdomId as string),
    enabled: !!kingdomId,
    refetchInterval: 15_000,
  });
}

export function useMapNodes(serverId: number | null) {
  return useQuery({
    queryKey: ["mapNodes", serverId],
    queryFn: () => fetchMapNodes(serverId as number),
    enabled: serverId !== null,
    refetchInterval: 15_000,
  });
}

export function useActiveGatheringOrders(serverId: number | null) {
  return useQuery({
    queryKey: ["activeGathering", serverId],
    queryFn: () => fetchActiveGatheringOrders(serverId as number),
    enabled: serverId !== null,
    refetchInterval: 10_000,
  });
}

export function useMyGatheringOrders(kingdomId: string | null) {
  return useQuery({
    queryKey: ["myGathering", kingdomId],
    queryFn: () => fetchMyGatheringOrders(kingdomId as string),
    enabled: !!kingdomId,
    refetchInterval: 15_000,
  });
}

function useInvalidateMap(serverId: number | null, kingdomId: string | null) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["kingdom", kingdomId] });
    queryClient.invalidateQueries({ queryKey: ["mapNodes", serverId] });
    queryClient.invalidateQueries({ queryKey: ["activeGathering", serverId] });
    queryClient.invalidateQueries({ queryKey: ["myGathering", kingdomId] });
  };
}

export function useStartGathering(serverId: number | null, kingdomId: string | null) {
  const invalidate = useInvalidateMap(serverId, kingdomId);
  return useMutation({
    mutationFn: ({ nodeId, troops }: { nodeId: string; troops: Partial<Record<TroopKey, number>> }) =>
      startGathering(kingdomId as string, nodeId, troops),
    onSuccess: invalidate,
  });
}

export function useRecallGathering(serverId: number | null, kingdomId: string | null) {
  const invalidate = useInvalidateMap(serverId, kingdomId);
  return useMutation({
    mutationFn: (gatheringOrderId: string) => recallGathering(gatheringOrderId),
    onSuccess: invalidate,
  });
}

export function useAttackGatheringParty(serverId: number | null, kingdomId: string | null) {
  const invalidate = useInvalidateMap(serverId, kingdomId);
  return useMutation({
    mutationFn: ({
      gatheringOrderId,
      troops,
    }: {
      gatheringOrderId: string;
      troops: Partial<Record<TroopKey, number>>;
    }) => attackGatheringParty(kingdomId as string, gatheringOrderId, troops),
    onSuccess: invalidate,
  });
}
