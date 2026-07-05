/**
 * Troop balance parameters, mirrored by the `troop_types` seed rows.
 * `powerPerUnit` feeds kingdom power_score today; attack/defense/speed are
 * left for Phase 2 combat math and intentionally omitted for now.
 */

export type TroopKey = "militia" | "archer" | "cavalry";

export interface TroopType {
  key: TroopKey;
  name: string;
  trainSecondsBase: number;
  powerPerUnit: number;
  costWood: number;
  costFood: number;
}

export const TROOP_TYPES: Record<TroopKey, TroopType> = {
  militia: {
    key: "militia",
    name: "Militia",
    trainSecondsBase: 10,
    powerPerUnit: 1,
    costWood: 20,
    costFood: 10,
  },
  archer: {
    key: "archer",
    name: "Archer",
    trainSecondsBase: 15,
    powerPerUnit: 2,
    costWood: 30,
    costFood: 15,
  },
  cavalry: {
    key: "cavalry",
    name: "Cavalry",
    trainSecondsBase: 25,
    powerPerUnit: 4,
    costWood: 50,
    costFood: 30,
  },
};

export function trainingCost(type: TroopType, quantity: number) {
  return { wood: type.costWood * quantity, food: type.costFood * quantity };
}

export function trainingDurationSeconds(type: TroopType, quantity: number) {
  return type.trainSecondsBase * quantity;
}
