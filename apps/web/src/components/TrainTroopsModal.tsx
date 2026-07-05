import { useMemo, useState } from "react";
import type { TroopKey, TroopType } from "../types/database.types";
import { ModalShell } from "./ModalShell";

export function TrainTroopsModal({
  troopTypes,
  townHallLevel,
  onConfirm,
  onClose,
  isSubmitting,
  error,
}: {
  troopTypes: TroopType[];
  townHallLevel: number;
  onConfirm: (troopKey: TroopKey, quantity: number) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const unlocked = useMemo(
    () => troopTypes.filter((t) => t.required_town_hall_level <= townHallLevel),
    [troopTypes, townHallLevel]
  );
  const locked = useMemo(
    () => troopTypes.filter((t) => t.required_town_hall_level > townHallLevel),
    [troopTypes, townHallLevel]
  );

  const [troopKey, setTroopKey] = useState<TroopKey | null>(unlocked[0]?.key ?? null);
  const [quantity, setQuantity] = useState(10);

  const selected = unlocked.find((t) => t.key === troopKey);
  const cost = selected
    ? { wood: selected.cost_wood * quantity, food: selected.cost_food * quantity }
    : null;
  const duration = selected ? selected.train_seconds_base * quantity : 0;

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-lg font-semibold">Train Troops</h2>

      <label className="mt-4 block text-sm">Troop type</label>
      <select
        value={troopKey ?? ""}
        onChange={(e) => setTroopKey(e.target.value as TroopKey)}
        className="mt-1 w-full rounded-lg bg-slate-800 p-2"
      >
        {unlocked.map((t) => (
          <option key={t.key} value={t.key}>
            {t.name} ({t.class})
          </option>
        ))}
      </select>

      {locked.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
          {locked.map((t) => (
            <li key={t.key}>
              🔒 {t.name} — unlocks at Town Hall level {t.required_town_hall_level}
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 block text-sm">Quantity</label>
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
        className="mt-1 w-full rounded-lg bg-slate-800 p-2"
      />

      {cost && (
        <ul className="mt-3 space-y-1 text-sm">
          <li>🪵 {cost.wood} wood</li>
          <li>🌾 {cost.food} food</li>
          <li>⏱ {duration}s</li>
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        onClick={() => troopKey && onConfirm(troopKey, quantity)}
        disabled={isSubmitting || !troopKey}
        className="mt-4 w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {isSubmitting ? "Training…" : "Train"}
      </button>
      <button onClick={onClose} className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm">
        Close
      </button>
    </ModalShell>
  );
}
