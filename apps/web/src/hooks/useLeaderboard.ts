import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";

export function useLeaderboard(serverId: number | null) {
  return useQuery({
    queryKey: ["leaderboard", serverId],
    queryFn: () => fetchLeaderboard(serverId as number),
    enabled: serverId !== null && !Number.isNaN(serverId),
    refetchInterval: 10_000,
  });
}
