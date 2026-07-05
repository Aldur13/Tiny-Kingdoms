/**
 * Troop balance parameters, mirrored by the `troop_types` seed rows /
 * 20260706000001_troop_tiers_and_combat_stats.sql. Three classes, three
 * tiers each, gated by Town Hall level. `powerPerUnit` feeds kingdom
 * power_score; `attack`/`defense` feed combat resolution; `marchSeconds` is
 * how long a troop type takes to march alone — a mixed army marches at the
 * pace of its slowest committed type.
 */

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
  trainSecondsBase: number;
  powerPerUnit: number;
  costWood: number;
  costFood: number;
  attack: number;
  defense: number;
  marchSeconds: number;
  requiredTownHallLevel: number;
}

export const TROOP_TYPES: Record<TroopKey, TroopType> = {
  militia: {
    key: "militia",
    name: "Militia",
    class: "infantry",
    trainSecondsBase: 10,
    powerPerUnit: 1,
    costWood: 20,
    costFood: 10,
    attack: 5,
    defense: 8,
    marchSeconds: 300,
    requiredTownHallLevel: 1,
  },
  archer: {
    key: "archer",
    name: "Archer",
    class: "ranged",
    trainSecondsBase: 15,
    powerPerUnit: 2,
    costWood: 30,
    costFood: 15,
    attack: 8,
    defense: 4,
    marchSeconds: 360,
    requiredTownHallLevel: 1,
  },
  cavalry: {
    key: "cavalry",
    name: "Cavalry",
    class: "cavalry",
    trainSecondsBase: 25,
    powerPerUnit: 4,
    costWood: 50,
    costFood: 30,
    attack: 10,
    defense: 5,
    marchSeconds: 180,
    requiredTownHallLevel: 1,
  },
  swordsman: {
    key: "swordsman",
    name: "Swordsman",
    class: "infantry",
    trainSecondsBase: 20,
    powerPerUnit: 3,
    costWood: 60,
    costFood: 30,
    attack: 12,
    defense: 20,
    marchSeconds: 300,
    requiredTownHallLevel: 5,
  },
  crossbowman: {
    key: "crossbowman",
    name: "Crossbowman",
    class: "ranged",
    trainSecondsBase: 30,
    powerPerUnit: 5,
    costWood: 90,
    costFood: 45,
    attack: 20,
    defense: 10,
    marchSeconds: 360,
    requiredTownHallLevel: 5,
  },
  lancer: {
    key: "lancer",
    name: "Lancer",
    class: "cavalry",
    trainSecondsBase: 45,
    powerPerUnit: 8,
    costWood: 140,
    costFood: 80,
    attack: 24,
    defense: 12,
    marchSeconds: 150,
    requiredTownHallLevel: 5,
  },
  guardian: {
    key: "guardian",
    name: "Guardian",
    class: "infantry",
    trainSecondsBase: 35,
    powerPerUnit: 7,
    costWood: 150,
    costFood: 75,
    attack: 28,
    defense: 48,
    marchSeconds: 300,
    requiredTownHallLevel: 10,
  },
  sharpshooter: {
    key: "sharpshooter",
    name: "Sharpshooter",
    class: "ranged",
    trainSecondsBase: 55,
    powerPerUnit: 12,
    costWood: 220,
    costFood: 110,
    attack: 48,
    defense: 24,
    marchSeconds: 360,
    requiredTownHallLevel: 10,
  },
  knight: {
    key: "knight",
    name: "Knight",
    class: "cavalry",
    trainSecondsBase: 80,
    powerPerUnit: 18,
    costWood: 320,
    costFood: 180,
    attack: 58,
    defense: 28,
    marchSeconds: 120,
    requiredTownHallLevel: 10,
  },
};

export function trainingCost(type: TroopType, quantity: number) {
  return { wood: type.costWood * quantity, food: type.costFood * quantity };
}

export function trainingDurationSeconds(type: TroopType, quantity: number) {
  return type.trainSecondsBase * quantity;
}

export function isUnlockedByTownHall(type: TroopType, townHallLevel: number) {
  return townHallLevel >= type.requiredTownHallLevel;
}

/** Rock-paper-scissors counter check mirrored from the server's
 * troop_class_beats() — infantry beats cavalry, ranged beats infantry,
 * cavalry beats ranged. Used only for frontend combat-preview hints; the
 * server's copy is authoritative. */
export function troopClassBeats(a: TroopClass, b: TroopClass): boolean {
  return (
    (a === "infantry" && b === "cavalry") ||
    (a === "ranged" && b === "infantry") ||
    (a === "cavalry" && b === "ranged")
  );
}

/** Marching pace of a mixed army = the slowest committed troop type. */
export function marchSecondsForComposition(
  composition: Partial<Record<TroopKey, number>>
): number {
  let slowest = 0;
  for (const key of Object.keys(composition) as TroopKey[]) {
    const qty = composition[key];
    if (!qty) continue;
    slowest = Math.max(slowest, TROOP_TYPES[key].marchSeconds);
  }
  return slowest;
}
