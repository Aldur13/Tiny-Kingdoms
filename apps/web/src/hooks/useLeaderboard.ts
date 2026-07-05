import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";
import { supabase } from "../lib/supabaseClient";

export function useLeaderboard(serverId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leaderboard", serverId],
    queryFn: () => fetchLeaderboard(serverId as number),
    enabled: serverId !== null && !Number.isNaN(serverId),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (serverId === null || Number.isNaN(serverId)) return;
    const channel = supabase
      .channel(`leaderboard-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries", filter: `server_id=eq.${serverId}` },
        () => queryClient.invalidateQueries({ queryKey: ["leaderboard", serverId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  return query;
}
