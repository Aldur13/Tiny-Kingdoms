import { useMemo, useState } from "react";
import { marchSecondsForComposition } from "@chrome-game/game-balance";
import type { Troop, TroopKey, TroopType } from "../types/database.types";

function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function AttackModal({
  defenderName,
  troops,
  troopTypes,
  onConfirm,
  onClose,
  isSubmitting,
  error,
}: {
  defenderName: string;
  troops: Troop[];
  troopTypes: TroopType[];
  onConfirm: (composition: Partial<Record<TroopKey, number>>) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const available = useMemo(
    () => troops.filter((t) => t.quantity > 0),
    [troops]
  );
  const [selected, setSelected] = useState<Partial<Record<TroopKey, number>>>({});

  const marchSeconds = marchSecondsForComposition(selected);
  const totalSelected = Object.values(selected).reduce((sum, qty) => sum + (qty ?? 0), 0);

  function setQuantity(key: TroopKey, max: number, raw: string) {
    const qty = Math.max(0, Math.min(max, Number(raw) || 0));
    setSelected((prev) => ({ ...prev, [key]: qty || undefined }));
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-80 rounded-xl bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Attack {defenderName}</h2>

        {available.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            You have no troops at home to send — train some first.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {available.map((t) => {
              const type = troopTypes.find((tt) => tt.key === t.troop_key);
              if (!type) return null;
              return (
                <div key={t.troop_key} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {type.name} <span className="text-slate-500">(have {t.quantity})</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={t.quantity}
                    value={selected[t.troop_key] ?? ""}
                    placeholder="0"
                    onChange={(e) => setQuantity(t.troop_key, t.quantity, e.target.value)}
                    className="w-20 rounded-lg bg-slate-800 p-1 text-right"
                  />
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-xs text-slate-400">
          March time: <span className="text-slate-200">{formatDuration(marchSeconds)}</span>
        </p>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <button
          onClick={() => onConfirm(selected)}
          disabled={isSubmitting || totalSelected === 0}
          className="mt-4 w-full rounded-lg bg-red-700 py-2 font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send Attack"}
        </button>
        <button onClick={onClose} className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
