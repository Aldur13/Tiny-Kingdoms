import type { Building, BuildingType } from "../types/database.types";

// Mirrors the formula enforced authoritatively by start_building_upgrade —
// this is purely a client-side preview, the server recomputes and validates
// the real cost/duration independently.
function upgradeCost(type: BuildingType, level: number) {
  const growth = Math.pow(type.cost_growth, level - 1);
  return {
    wood: Math.round(type.base_cost_wood * growth),
    stone: Math.round(type.base_cost_stone * growth),
    gold: Math.round(type.base_cost_gold * growth),
  };
}

function upgradeDuration(type: BuildingType, level: number) {
  return Math.round(type.base_upgrade_seconds * Math.pow(type.duration_growth, level - 1));
}

export function UpgradeModal({
  building,
  type,
  townHallLevel,
  onConfirm,
  onClose,
  isSubmitting,
  error,
}: {
  building: Building;
  type: BuildingType;
  townHallLevel: number;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const atMaxLevel = building.level >= type.max_level;
  const cappedByTownHall = type.key !== "town_hall" && building.level >= townHallLevel;
  const cost = upgradeCost(type, building.level);
  const duration = upgradeDuration(type, building.level);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-80 rounded-xl bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">
          {type.name} — Level {building.level}
        </h2>
        {atMaxLevel ? (
          <p className="mt-4 text-sm text-slate-400">This building is at max level.</p>
        ) : cappedByTownHall ? (
          <p className="mt-4 text-sm text-amber-400">
            Upgrade Town Hall to level {building.level + 1} first — other buildings can't outgrow it.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-400">Upgrade to level {building.level + 1}</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>🪵 {cost.wood} wood</li>
              <li>🪨 {cost.stone} stone</li>
              <li>🪙 {cost.gold} gold</li>
              <li>⏱ {duration}s</li>
            </ul>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="mt-4 w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? "Upgrading…" : "Upgrade"}
            </button>
          </>
        )}
        <button onClick={onClose} className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm">
          Close
        </button>
      </div>
    </div>
  );
}
