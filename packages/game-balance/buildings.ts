/**
 * Building balance parameters. These mirror the `building_types` seed rows
 * in supabase/seed.sql exactly — the Postgres RPCs are the source of truth
 * for cost/duration enforcement, this file exists only so the frontend can
 * render an instant cost/duration preview using the same formula.
 */

export type BuildingKey =
  | "town_hall"
  | "sawmill"
  | "quarry"
  | "farm"
  | "barracks";

export interface BuildingType {
  key: BuildingKey;
  name: string;
  maxLevel: number;
  /** Resource this building produces per second at level 1, or null. */
  produces: "wood" | "stone" | "food" | null;
  baseProductionPerSecond: number;
  baseCost: { wood: number; stone: number; gold: number };
  costGrowth: number;
  baseUpgradeSeconds: number;
  durationGrowth: number;
}

export const BUILDING_TYPES: Record<BuildingKey, BuildingType> = {
  town_hall: {
    key: "town_hall",
    name: "Town Hall",
    maxLevel: 20,
    produces: null,
    baseProductionPerSecond: 0,
    // Deliberately the steepest curve in the game — every other building is
    // capped at the Town Hall's current level, so this is the pacing gate.
    baseCost: { wood: 500, stone: 500, gold: 150 },
    costGrowth: 1.35,
    baseUpgradeSeconds: 600,
    durationGrowth: 1.3,
  },
  sawmill: {
    key: "sawmill",
    name: "Sawmill",
    maxLevel: 20,
    produces: "wood",
    baseProductionPerSecond: 0.5,
    baseCost: { wood: 100, stone: 50, gold: 10 },
    costGrowth: 1.18,
    baseUpgradeSeconds: 60,
    durationGrowth: 1.18,
  },
  quarry: {
    key: "quarry",
    name: "Quarry",
    maxLevel: 20,
    produces: "stone",
    baseProductionPerSecond: 0.4,
    baseCost: { wood: 120, stone: 40, gold: 10 },
    costGrowth: 1.18,
    baseUpgradeSeconds: 60,
    durationGrowth: 1.18,
  },
  farm: {
    key: "farm",
    name: "Farm",
    maxLevel: 20,
    produces: "food",
    baseProductionPerSecond: 0.6,
    baseCost: { wood: 100, stone: 60, gold: 10 },
    costGrowth: 1.18,
    baseUpgradeSeconds: 60,
    durationGrowth: 1.18,
  },
  barracks: {
    key: "barracks",
    name: "Barracks",
    maxLevel: 20,
    produces: null,
    baseProductionPerSecond: 0,
    baseCost: { wood: 150, stone: 100, gold: 20 },
    costGrowth: 1.2,
    baseUpgradeSeconds: 90,
    durationGrowth: 1.2,
  },
};

export function upgradeCost(type: BuildingType, currentLevel: number) {
  const growth = Math.pow(type.costGrowth, currentLevel - 1);
  return {
    wood: Math.round(type.baseCost.wood * growth),
    stone: Math.round(type.baseCost.stone * growth),
    gold: Math.round(type.baseCost.gold * growth),
  };
}

export function upgradeDurationSeconds(type: BuildingType, currentLevel: number) {
  return Math.round(
    type.baseUpgradeSeconds * Math.pow(type.durationGrowth, currentLevel - 1)
  );
}

export function productionPerSecond(type: BuildingType, level: number) {
  if (!type.produces) return 0;
  return type.baseProductionPerSecond * level;
}

/** Every non-Town-Hall building is capped at the Town Hall's current level —
 * enforced authoritatively by start_building_upgrade, mirrored here only for
 * the frontend's instant preview/locked-state UI. */
export function isCappedByTownHall(
  buildingKey: BuildingKey,
  buildingLevel: number,
  townHallLevel: number
) {
  return buildingKey !== "town_hall" && buildingLevel >= townHallLevel;
}
