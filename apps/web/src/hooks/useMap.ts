import { useEffect } from "react";
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
import { supabase } from "../lib/supabaseClient";
import type { TroopKey } from "../types/database.types";

export function useNodeRaids(kingdomId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["nodeRaids", kingdomId],
    queryFn: () => fetchNodeRaids(kingdomId as string),
    enabled: !!kingdomId,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!kingdomId) return;
    const channel = supabase
      .channel(`node-raids-${kingdomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "node_raids",
          filter: `attacker_kingdom_id=eq.${kingdomId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["nodeRaids", kingdomId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [kingdomId, queryClient]);

  return query;
}

export function useMapNodes(serverId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mapNodes", serverId],
    queryFn: () => fetchMapNodes(serverId as number),
    enabled: serverId !== null,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (serverId === null) return;
    const channel = supabase
      .channel(`map-nodes-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "map_nodes", filter: `server_id=eq.${serverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["mapNodes", serverId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return query;
}

export function useActiveGatheringOrders(serverId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activeGathering", serverId],
    queryFn: () => fetchActiveGatheringOrders(serverId as number),
    enabled: serverId !== null,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (serverId === null) return;
    const channel = supabase
      .channel(`active-gathering-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gathering_orders", filter: `server_id=eq.${serverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["activeGathering", serverId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return query;
}

export function useMyGatheringOrders(kingdomId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["myGathering", kingdomId],
    queryFn: () => fetchMyGatheringOrders(kingdomId as string),
    enabled: !!kingdomId,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!kingdomId) return;
    const channel = supabase
      .channel(`my-gathering-${kingdomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gathering_orders", filter: `kingdom_id=eq.${kingdomId}` },
        () => queryClient.invalidateQueries({ queryKey: ["myGathering", kingdomId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [kingdomId, queryClient]);

  return query;
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
