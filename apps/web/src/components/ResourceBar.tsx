import type { Kingdom } from "../types/database.types";
import { AnimatedNumber } from "./AnimatedNumber";

const RESOURCE_ICONS = { wood: "🪵", stone: "🪨", food: "🌾", gold: "🪙" } as const;

export function ResourceBar({ kingdom }: { kingdom: Kingdom }) {
  return (
    <div className="flex gap-4 rounded-lg bg-slate-900 px-4 py-2 shadow">
      {(Object.keys(RESOURCE_ICONS) as (keyof typeof RESOURCE_ICONS)[]).map((key) => (
        <div key={key} className="flex items-center gap-1 text-sm">
          <span>{RESOURCE_ICONS[key]}</span>
          <AnimatedNumber value={Math.floor(kingdom[key])} className="font-semibold tabular-nums" />
        </div>
      ))}
    </div>
  );
}
