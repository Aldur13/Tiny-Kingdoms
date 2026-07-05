/**
 * Hand-written to match supabase/migrations exactly (verified against a
 * live Postgres instance during development — see supabase/migrations).
 * Regenerate with `supabase gen types typescript --local` once Docker is
 * available, and this file becomes redundant.
 */

export interface Server {
  id: number;
  name: string;
  status: "open" | "full" | "closed" | "archived";
  max_players: number;
  opened_at: string;
  ruleset_version: string;
}

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Kingdom {
  id: string;
  server_id: number;
  owner_id: string;
  name: string;
  power_score: number;
  wood: number;
  stone: number;
  food: number;
  gold: number;
  last_resource_tick: string;
  protected_until: string | null;
  created_at: string;
}

export type BuildingKey = "town_hall" | "sawmill" | "quarry" | "farm" | "barracks";

export interface BuildingType {
  key: BuildingKey;
  name: string;
  max_level: number;
  produces: "wood" | "stone" | "food" | null;
  base_production_per_second: number;
  base_cost_wood: number;
  base_cost_stone: number;
  base_cost_gold: number;
  cost_growth: number;
  base_upgrade_seconds: number;
  duration_growth: number;
}

export interface Building {
  id: string;
  kingdom_id: string;
  type_key: BuildingKey;
  level: number;
  slot_index: number;
  upgrade_started_at: string | null;
  upgrade_finishes_at: string | null;
}

export type TroopClass = "infantry" | "ranged" | "cavalry";

export type TroopKey =
  | "militia"
  | "archer"
  | "cavalry"
  | "swordsman"
  | "crossbowman"
  | "lancer"
  | "guardian"
  | "sharpshooter"
  | "knight";

export interface TroopType {
  key: TroopKey;
  name: string;
  class: TroopClass;
  train_seconds_base: number;
  power_per_unit: number;
  cost_wood: number;
  cost_food: number;
  attack: number;
  defense: number;
  march_seconds: number;
  required_town_hall_level: number;
}

export interface TroopOrder {
  id: string;
  kingdom_id: string;
  troop_key: TroopKey;
  quantity: number;
  started_at: string;
  finishes_at: string;
  resolved: boolean;
}

export interface Troop {
  kingdom_id: string;
  troop_key: TroopKey;
  quantity: number;
}

export interface LeaderboardEntry {
  server_id: number;
  kingdom_id: string;
  kingdom_name: string;
  owner_display_name: string;
  power_score: number;
  rank: number | null;
  updated_at: string;
}

export interface BattleOutcome {
  winner: "attacker" | "defender";
  attacker_effective: number;
  defender_effective: number;
  attacker_loss_fraction: number;
  defender_loss_fraction: number;
  loot: { wood: number; stone: number; food: number; gold: number };
}

export interface BattleReport {
  id: string;
  server_id: number;
  attacker_kingdom_id: string;
  defender_kingdom_id: string;
  march_started_at: string;
  arrives_at: string;
  resolved_at: string | null;
  outcome: BattleOutcome | null;
  created_at: string;
}
