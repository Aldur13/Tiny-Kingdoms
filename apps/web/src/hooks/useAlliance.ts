import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAlliance,
  fetchAllianceMembers,
  fetchAllianceMessages,
  fetchMyAllianceMembership,
  fetchServerAlliances,
  joinAlliance,
  leaveAlliance,
  sendAllianceMessage,
} from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import { pushNotification } from "../lib/notifications";
import { playSound } from "../lib/sound";

export function useMyAllianceMembership(kingdomId: string | null) {
  return useQuery({
    queryKey: ["myAllianceMembership", kingdomId],
    queryFn: () => fetchMyAllianceMembership(kingdomId as string),
    enabled: !!kingdomId,
  });
}

export function useServerAlliances(serverId: number | null) {
  return useQuery({
    queryKey: ["serverAlliances", serverId],
    queryFn: () => fetchServerAlliances(serverId as number),
    enabled: serverId !== null,
  });
}

export function useAllianceRoster(allianceId: string | null) {
  return useQuery({
    queryKey: ["allianceRoster", allianceId],
    queryFn: () => fetchAllianceMembers(allianceId as string),
    enabled: !!allianceId,
  });
}

export function useCreateAlliance(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, tag }: { name: string; tag: string }) =>
      createAlliance(kingdomId as string, name, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAllianceMembership", kingdomId] });
      queryClient.invalidateQueries({ queryKey: ["serverAlliances"] });
    },
  });
}

export function useJoinAlliance(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allianceId: string) => joinAlliance(kingdomId as string, allianceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAllianceMembership", kingdomId] });
      queryClient.invalidateQueries({ queryKey: ["serverAlliances"] });
    },
  });
}

export function useLeaveAlliance(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveAlliance(kingdomId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAllianceMembership", kingdomId] });
      queryClient.invalidateQueries({ queryKey: ["serverAlliances"] });
    },
  });
}

export function useAllianceMessages(allianceId: string | null, myKingdomId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["allianceMessages", allianceId],
    queryFn: () => fetchAllianceMessages(allianceId as string),
    enabled: !!allianceId,
  });

  useEffect(() => {
    if (!allianceId) return;
    const channel = supabase
      .channel(`alliance-messages-${allianceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alliance_messages",
          filter: `alliance_id=eq.${allianceId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["allianceMessages", allianceId] });
          const row = payload.new as { kingdom_id: string };
          if (row.kingdom_id !== myKingdomId) {
            pushNotification("info", "New alliance message");
            playSound("info");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [allianceId, myKingdomId, queryClient]);

  return query;
}

export function useSendAllianceMessage(allianceId: string | null, kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendAllianceMessage(allianceId as string, kingdomId as string, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allianceMessages", allianceId] }),
  });
}
