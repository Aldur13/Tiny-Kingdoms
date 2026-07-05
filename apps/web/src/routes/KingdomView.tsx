import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useKingdom, useStartBuildingUpgrade, useStartTroopTraining } from "../hooks/useKingdom";
import { ResourceBar } from "../components/ResourceBar";
import { BuildingSlot } from "../components/BuildingSlot";
import { UpgradeModal } from "../components/UpgradeModal";
import { TrainTroopsModal } from "../components/TrainTroopsModal";
import { CountdownTimer } from "../components/CountdownTimer";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { ProgressMarch } from "../components/ProgressMarch";
import type { Building } from "../types/database.types";

export default function KingdomView() {
  const { kingdomId = "" } = useParams();
  const { data, isLoading, error, refetch } = useKingdom(kingdomId);
  const upgradeMutation = useStartBuildingUpgrade(kingdomId);
  const trainMutation = useStartTroopTraining(kingdomId);

  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [showTrainModal, setShowTrainModal] = useState(false);

  if (isLoading) return <p className="p-8">Loading kingdom…</p>;
  if (error || !data) {
    return <p className="p-8 text-red-400">{(error as Error)?.message ?? "Kingdom not found"}</p>;
  }

  const { kingdom, buildings, buildingTypes, troops, troopTypes, troopOrders, woundedOrders } = data;
  const typeByKey = Object.fromEntries(buildingTypes.map((t) => [t.key, t]));
  const townHallLevel = buildings.find((b) => b.type_key === "town_hall")?.level ?? 1;
  const isProtected = !!kingdom.protected_until && new Date(kingdom.protected_until) > new Date();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{kingdom.name}</h1>
          <p className="text-sm text-slate-400">Power score: {kingdom.power_score}</p>
          {isProtected && (
            <p className="mt-1 text-xs text-sky-400">
              🛡 Protected for <CountdownTimer finishesAt={kingdom.protected_until!} />
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link to={`/leaderboard/${kingdom.server_id}?mine=${kingdom.id}`} className="text-emerald-400 hover:underline">
            View leaderboard →
          </Link>
          <Link to={`/map/${kingdom.server_id}?mine=${kingdom.id}`} className="text-slate-400 hover:underline">
            Map →
          </Link>
          <Link to={`/shop/${kingdom.id}`} className="text-slate-400 hover:underline">
            Shop →
          </Link>
          <Link to={`/battles/${kingdom.id}`} className="text-slate-400 hover:underline">
            Battle reports →
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <ResourceBar kingdom={kingdom} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Buildings</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {buildings.map((building) => (
          <BuildingSlot
            key={building.id}
            building={building}
            type={typeByKey[building.type_key]!}
            cappedByTownHall={building.type_key !== "town_hall" && building.level >= townHallLevel}
            onClick={() => setSelectedBuilding(building)}
            onUpgradeComplete={() => refetch()}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Troops</h2>
        <button
          onClick={() => setShowTrainModal(true)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
        >
          Train troops
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {troopTypes.map((type) => {
          const owned = troops.find((t) => t.troop_key === type.key)?.quantity ?? 0;
          const locked = type.required_town_hall_level > townHallLevel;
          return (
            <div
              key={type.key}
              className={`rounded-lg border p-3 text-center ${
                locked ? "border-slate-800 opacity-40" : "border-slate-700 bg-slate-900"
              }`}
            >
              <div className="text-sm font-medium">{type.name}</div>
              <div className="text-xs text-slate-500">{type.class}</div>
              <div className="text-xl font-bold">
                {locked ? "🔒" : <AnimatedNumber value={owned} />}
              </div>
            </div>
          );
        })}
      </div>

      {troopOrders.length > 0 && (
        <div className="mt-4 space-y-3 text-sm text-slate-400">
          {troopOrders.map((order) => (
            <div key={order.id}>
              Training {order.quantity} {order.troop_key} — done at{" "}
              {new Date(order.finishes_at).toLocaleTimeString()}
              <ProgressMarch startedAt={order.started_at} finishesAt={order.finishes_at} icon="🪖" onComplete={() => refetch()} />
            </div>
          ))}
        </div>
      )}

      {woundedOrders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">🏥 Hospital</h2>
          <div className="mt-2 space-y-3 text-sm text-slate-400">
            {woundedOrders.map((order) => (
              <div key={order.id}>
                {order.quantity} {order.troop_key} healing — ready in{" "}
                <CountdownTimer finishesAt={order.finishes_at} onComplete={() => refetch()} />
                <ProgressMarch startedAt={order.started_at} finishesAt={order.finishes_at} icon="🩹" onComplete={() => refetch()} />
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedBuilding && (
        <UpgradeModal
          building={selectedBuilding}
          type={typeByKey[selectedBuilding.type_key]!}
          townHallLevel={townHallLevel}
          isSubmitting={upgradeMutation.isPending}
          error={upgradeMutation.error instanceof Error ? upgradeMutation.error.message : null}
          onConfirm={() =>
            upgradeMutation.mutate(selectedBuilding.id, { onSuccess: () => setSelectedBuilding(null) })
          }
          onClose={() => setSelectedBuilding(null)}
        />
      )}

      {showTrainModal && (
        <TrainTroopsModal
          troopTypes={troopTypes}
          townHallLevel={townHallLevel}
          isSubmitting={trainMutation.isPending}
          error={trainMutation.error instanceof Error ? trainMutation.error.message : null}
          onConfirm={(troopKey, quantity) =>
            trainMutation.mutate({ troopKey, quantity }, { onSuccess: () => setShowTrainModal(false) })
          }
          onClose={() => setShowTrainModal(false)}
        />
      )}
    </div>
  );
}
