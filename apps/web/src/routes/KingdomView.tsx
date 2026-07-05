import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useKingdom, useStartBuildingUpgrade, useStartTroopTraining } from "../hooks/useKingdom";
import { ResourceBar } from "../components/ResourceBar";
import { BuildingSlot } from "../components/BuildingSlot";
import { UpgradeModal } from "../components/UpgradeModal";
import { TrainTroopsModal } from "../components/TrainTroopsModal";
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

  const { kingdom, buildings, buildingTypes, troops, troopTypes, troopOrders } = data;
  const typeByKey = Object.fromEntries(buildingTypes.map((t) => [t.key, t]));

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{kingdom.name}</h1>
          <p className="text-sm text-slate-400">Power score: {kingdom.power_score}</p>
        </div>
        <Link
          to={`/leaderboard/${kingdom.server_id}?mine=${kingdom.id}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          View leaderboard →
        </Link>
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
          return (
            <div key={type.key} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-center">
              <div className="text-sm font-medium">{type.name}</div>
              <div className="text-xl font-bold">{owned}</div>
            </div>
          );
        })}
      </div>

      {troopOrders.length > 0 && (
        <div className="mt-4 space-y-1 text-sm text-slate-400">
          {troopOrders.map((order) => (
            <div key={order.id}>
              Training {order.quantity} {order.troop_key} — done at{" "}
              {new Date(order.finishes_at).toLocaleTimeString()}
            </div>
          ))}
        </div>
      )}

      {selectedBuilding && (
        <UpgradeModal
          building={selectedBuilding}
          type={typeByKey[selectedBuilding.type_key]!}
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
