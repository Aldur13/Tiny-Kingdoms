export const STARTER_RESOURCES = {
  wood: 500,
  stone: 500,
  food: 500,
  gold: 100,
};

export const RESOURCE_KEYS = ["wood", "stone", "food", "gold"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
