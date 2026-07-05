import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buyShield, fetchShopItems } from "../lib/api";

export function useShopItems() {
  return useQuery({ queryKey: ["shopItems"], queryFn: fetchShopItems, staleTime: Infinity });
}

export function useBuyShield(kingdomId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemKey: string) => buyShield(kingdomId as string, itemKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kingdom", kingdomId] }),
  });
}
