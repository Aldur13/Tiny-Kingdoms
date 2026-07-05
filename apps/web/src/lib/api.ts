import { supabase } from "./supabaseClient";
import type {
  Building,
  BuildingType,
  Kingdom,
  LeaderboardEntry,
  Server,
  Troop,
  TroopKey,
  TroopOrder,
  TroopType,
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
}

export async function fetchKingdomFull(kingdomId: string): Promise<KingdomFull> {
  // Lazy-resolve-on-read: this is what makes offline building/troop timers
  // and offline resource production correct the instant the owner reopens
  // the app, independent of the pg_cron sweep interval.
  const { error: syncError } = await supabase.rpc("sync_and_resolve_kingdom", {
    p_kingdom_id: kingdomId,
  });
  if (syncError) throw new Error(syncError.message);

  const [kingdomRes, buildingsRes, buildingTypesRes, troopsRes, troopTypesRes, ordersRes] =
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
    ]);

  return {
    kingdom: unwrap(kingdomRes),
    buildings: unwrap(buildingsRes),
    buildingTypes: unwrap(buildingTypesRes),
    troops: unwrap(troopsRes),
    troopTypes: unwrap(troopTypesRes),
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
