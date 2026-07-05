import { supabase } from "./supabaseClient";
import type {
  BattleReport,
  Building,
  BuildingType,
  GatheringOrder,
  Kingdom,
  LeaderboardEntry,
  MapNode,
  NodeRaid,
  Server,
  ShopItem,
  Troop,
  TroopKey,
  TroopOrder,
  TroopType,
  WoundedOrder,
} from "../types/database.types";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned");
  return data;
}

// ===== Auth =====

export async function signUpWithPassword(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInAsGuest() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
  return data;
}

export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// ===== Servers =====

export async function listServers(): Promise<Server[]> {
  return unwrap(
    await supabase.from("servers").select("*").order("id", { ascending: true })
  );
}

export async function joinServer(serverId: number, kingdomName: string): Promise<string> {
  return unwrap(
    await supabase.rpc("join_server", { p_server_id: serverId, p_kingdom_name: kingdomName })
  );
}

export async function findMyKingdomOnServer(serverId: number): Promise<Kingdom | null> {
  const { data, error } = await supabase
    .from("kingdoms")
    .select("*")
    .eq("server_id", serverId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// ===== Kingdom =====

export interface KingdomFull {
  kingdom: Kingdom;
  buildings: Building[];
  buildingTypes: BuildingType[];
  troops: Troop[];
  troopTypes: TroopType[];
  troopOrders: TroopOrder[];
  woundedOrders: WoundedOrder[];
}

export async function fetchKingdomFull(kingdomId: string): Promise<KingdomFull> {
  // Lazy-resolve-on-read: this is what makes offline building/troop timers
  // and offline resource production correct the instant the owner reopens
  // the app, independent of the pg_cron sweep interval.
  const { error: syncError } = await supabase.rpc("sync_and_resolve_kingdom", {
    p_kingdom_id: kingdomId,
  });
  if (syncError) throw new Error(syncError.message);

  const [kingdomRes, buildingsRes, buildingTypesRes, troopsRes, troopTypesRes, ordersRes, woundedRes] =
    await Promise.all([
      supabase.from("kingdoms").select("*").eq("id", kingdomId).single(),
      supabase.from("buildings").select("*").eq("kingdom_id", kingdomId).order("slot_index"),
      supabase.from("building_types").select("*"),
      supabase.from("troops").select("*").eq("kingdom_id", kingdomId),
      supabase.from("troop_types").select("*"),
      supabase
        .from("troop_orders")
        .select("*")
        .eq("kingdom_id", kingdomId)
        .eq("resolved", false)
        .order("finishes_at"),
      supabase
        .from("wounded_orders")
        .select("*")
        .eq("kingdom_id", kingdomId)
        .eq("resolved", false)
        .order("finishes_at"),
    ]);

  return {
    kingdom: unwrap(kingdomRes),
    buildings: unwrap(buildingsRes),
    buildingTypes: unwrap(buildingTypesRes),
    troops: unwrap(troopsRes),
    troopTypes: unwrap(troopTypesRes),
    woundedOrders: unwrap(woundedRes),
    troopOrders: unwrap(ordersRes),
  };
}

export async function startBuildingUpgrade(buildingId: string): Promise<void> {
  const { error } = await supabase.rpc("start_building_upgrade", { p_building_id: buildingId });
  if (error) throw new Error(error.message);
}

export async function startTroopTraining(
  kingdomId: string,
  troopKey: TroopKey,
  quantity: number
): Promise<void> {
  const { error } = await supabase.rpc("start_troop_training", {
    p_kingdom_id: kingdomId,
    p_troop_key: troopKey,
    p_quantity: quantity,
  });
  if (error) throw new Error(error.message);
}

// ===== Leaderboard =====

export async function fetchLeaderboard(serverId: number): Promise<LeaderboardEntry[]> {
  return unwrap(
    await supabase
      .from("leaderboard_entries")
      .select("*")
      .eq("server_id", serverId)
      .order("power_score", { ascending: false })
      .limit(100)
  );
}

// ===== Combat =====

export async function sendAttack(
  kingdomId: string,
  defenderKingdomId: string,
  troops: Partial<Record<TroopKey, number>>
): Promise<string> {
  return unwrap(
    await supabase.rpc("send_attack", {
      p_kingdom_id: kingdomId,
      p_defender_kingdom_id: defenderKingdomId,
      p_troops: troops,
    })
  );
}

export async function fetchBattleReports(kingdomId: string): Promise<BattleReport[]> {
  return unwrap(
    await supabase
      .from("battle_reports")
      .select("*")
      .or(`attacker_kingdom_id.eq.${kingdomId},defender_kingdom_id.eq.${kingdomId}`)
      .order("created_at", { ascending: false })
      .limit(50)
  );
}

// ===== Shop =====

export async function fetchShopItems(): Promise<ShopItem[]> {
  return unwrap(await supabase.from("shop_items").select("*"));
}

export async function buyShield(kingdomId: string, itemKey = "shield_24h"): Promise<void> {
  const { error } = await supabase.rpc("buy_shield", {
    p_kingdom_id: kingdomId,
    p_item_key: itemKey,
  });
  if (error) throw new Error(error.message);
}

// ===== Map / gathering / node raids =====

export async function fetchMapNodes(serverId: number): Promise<MapNode[]> {
  return unwrap(await supabase.from("map_nodes").select("*").eq("server_id", serverId));
}

/** Every kingdom's currently-active gathering order on a server — RLS makes
 * active orders world-readable so the map can show which nodes are claimed
 * and who to raid; resolved orders stay owner-only. */
export async function fetchActiveGatheringOrders(serverId: number): Promise<GatheringOrder[]> {
  return unwrap(
    await supabase.from("gathering_orders").select("*").eq("server_id", serverId).is("resolved_at", null)
  );
}

export async function fetchMyGatheringOrders(kingdomId: string): Promise<GatheringOrder[]> {
  return unwrap(
    await supabase
      .from("gathering_orders")
      .select("*")
      .eq("kingdom_id", kingdomId)
      .order("started_at", { ascending: false })
      .limit(20)
  );
}

export async function startGathering(
  kingdomId: string,
  nodeId: string,
  troops: Partial<Record<TroopKey, number>>
): Promise<string> {
  return unwrap(
    await supabase.rpc("start_gathering", { p_kingdom_id: kingdomId, p_node_id: nodeId, p_troops: troops })
  );
}

export async function recallGathering(gatheringOrderId: string): Promise<void> {
  const { error } = await supabase.rpc("recall_gathering", { p_gathering_order_id: gatheringOrderId });
  if (error) throw new Error(error.message);
}

export async function attackGatheringParty(
  kingdomId: string,
  gatheringOrderId: string,
  troops: Partial<Record<TroopKey, number>>
): Promise<string> {
  return unwrap(
    await supabase.rpc("attack_gathering_party", {
      p_kingdom_id: kingdomId,
      p_gathering_order_id: gatheringOrderId,
      p_troops: troops,
    })
  );
}

export async function fetchNodeRaids(kingdomId: string): Promise<NodeRaid[]> {
  return unwrap(
    await supabase
      .from("node_raids")
      .select("*")
      .eq("attacker_kingdom_id", kingdomId)
      .order("created_at", { ascending: false })
      .limit(50)
  );
}
