import type { Building, BuildingType } from "../types/database.types";
import { CountdownTimer } from "./CountdownTimer";

const BUILDING_ICONS: Record<string, string> = {
  town_hall: "🏰",
  sawmill: "🪚",
  quarry: "⛏️",
  farm: "🌱",
  barracks: "⚔️",
  goldmine: "💰",
  hospital: "🏥",
};

export function BuildingSlot({
  building,
  type,
  cappedByTownHall,
  onClick,
  onUpgradeComplete,
}: {
  building: Building;
  type: BuildingType;
  cappedByTownHall: boolean;
  onClick: () => void;
  onUpgradeComplete: () => void;
}) {
  const isUpgrading = building.upgrade_finishes_at !== null;

  return (
    <button
      onClick={onClick}
      disabled={isUpgrading}
      className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-emerald-500 disabled:opacity-70 disabled:hover:border-slate-700"
    >
      <span className="text-3xl">{BUILDING_ICONS[type.key] ?? "🏗️"}</span>
      <span className="text-sm font-medium">{type.name}</span>
      <span className="text-xs text-slate-400">Level {building.level}</span>
      {isUpgrading && building.upgrade_finishes_at && (
        <CountdownTimer finishesAt={building.upgrade_finishes_at} onComplete={onUpgradeComplete} />
      )}
      {!isUpgrading && cappedByTownHall && (
        <span className="text-xs text-amber-400">🔒 needs Town Hall</span>
      )}
    </button>
  );
}
