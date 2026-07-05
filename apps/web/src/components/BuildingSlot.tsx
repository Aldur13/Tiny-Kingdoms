import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Building, BuildingType } from "../types/database.types";
import { CountdownTimer } from "./CountdownTimer";
import { ProgressMarch } from "./ProgressMarch";
import { AnimatedNumber } from "./AnimatedNumber";

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
  const previousLevel = useRef(building.level);
  const [justLeveledUp, setJustLeveledUp] = useState(false);

  useEffect(() => {
    if (building.level > previousLevel.current) {
      setJustLeveledUp(true);
      const timeout = setTimeout(() => setJustLeveledUp(false), 900);
      previousLevel.current = building.level;
      return () => clearTimeout(timeout);
    }
    previousLevel.current = building.level;
  }, [building.level]);

  return (
    <motion.button
      onClick={onClick}
      disabled={isUpgrading}
      className="relative flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-emerald-500 disabled:hover:border-slate-700"
      animate={
        isUpgrading
          ? { boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 14px rgba(16,185,129,0.55)", "0 0 0px rgba(16,185,129,0)"] }
          : { boxShadow: "0 0 0px rgba(16,185,129,0)" }
      }
      transition={isUpgrading ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
      whileTap={{ scale: 0.96 }}
    >
      <AnimatePresence>
        {justLeveledUp && (
          <motion.span
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -18, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="pointer-events-none absolute top-0 text-xs font-bold text-emerald-400"
          >
            LEVEL UP!
          </motion.span>
        )}
      </AnimatePresence>
      <motion.span
        className="text-3xl"
        animate={justLeveledUp ? { scale: [1, 1.4, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.6 }}
      >
        {BUILDING_ICONS[type.key] ?? "🏗️"}
      </motion.span>
      <span className="text-sm font-medium">{type.name}</span>
      <span className="text-xs text-slate-400">
        Level <AnimatedNumber value={building.level} />
      </span>
      {isUpgrading && building.upgrade_finishes_at && building.upgrade_started_at && (
        <>
          <CountdownTimer finishesAt={building.upgrade_finishes_at} onComplete={onUpgradeComplete} />
          <div className="w-full">
            <ProgressMarch
              startedAt={building.upgrade_started_at}
              finishesAt={building.upgrade_finishes_at}
              icon="🔨"
              onComplete={onUpgradeComplete}
            />
          </div>
        </>
      )}
      {!isUpgrading && cappedByTownHall && (
        <span className="text-xs text-amber-400">🔒 needs Town Hall</span>
      )}
    </motion.button>
  );
}
