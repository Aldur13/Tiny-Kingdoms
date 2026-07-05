import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  useActiveGatheringOrders,
  useAttackGatheringParty,
  useMapNodes,
  useMyGatheringOrders,
  useRecallGathering,
  useStartGathering,
} from "../hooks/useMap";
import { useKingdom } from "../hooks/useKingdom";
import { AttackModal } from "../components/AttackModal";
import { CountdownTimer } from "../components/CountdownTimer";
import { ProgressMarch } from "../components/ProgressMarch";
import type { GatheringOrder, MapNode } from "../types/database.types";

const RESOURCE_COLOR: Record<string, string> = {
  gold: "bg-amber-500",
  wood: "bg-emerald-600",
  stone: "bg-slate-400",
};

const RESOURCE_LABEL: Record<string, string> = {
  gold: "Gold Mine",
  wood: "Woodland",
  stone: "Quarry",
};

const GRID_UNIT_PX = 17;

type Selection =
  | { kind: "gather"; node: MapNode }
  | { kind: "raid"; node: MapNode; order: GatheringOrder };

export default function MapPage() {
  const { serverId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const myKingdomId = searchParams.get("mine");
  const serverIdNum = Number(serverId);

  const { data: nodes, isLoading: nodesLoading } = useMapNodes(serverIdNum);
  const { data: activeOrders, isLoading: ordersLoading } = useActiveGatheringOrders(serverIdNum);
  const { data: myOrders } = useMyGatheringOrders(myKingdomId);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dispatchedNodeId, setDispatchedNodeId] = useState<string | null>(null);
  const { data: myKingdom } = useKingdom(selection ? myKingdomId : null);

  const startGatheringMutation = useStartGathering(serverIdNum, myKingdomId);
  const attackMutation = useAttackGatheringParty(serverIdNum, myKingdomId);
  const recallMutation = useRecallGathering(serverIdNum, myKingdomId);

  const orderByNodeId = useMemo(() => {
    const map = new Map<string, GatheringOrder>();
    for (const order of activeOrders ?? []) map.set(order.node_id, order);
    return map;
  }, [activeOrders]);

  if (nodesLoading || ordersLoading) return <p className="p-8">Loading map…</p>;

  function handleNodeClick(node: MapNode) {
    const order = orderByNodeId.get(node.id);
    if (order) {
      if (order.kingdom_id === myKingdomId) return; // it's mine, manage it below instead
      setSelection({ kind: "raid", node, order });
    } else {
      setSelection({ kind: "gather", node });
    }
  }

  const activeMyOrders = (myOrders ?? []).filter((o) => !o.resolved_at);
  const pastMyOrders = (myOrders ?? []).filter((o) => o.resolved_at).slice(0, 5);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">World {serverId} Map</h1>
      <p className="mt-1 text-sm text-slate-400">
        Send troops to gather from neutral nodes, or raid another kingdom's gathering party.
      </p>

      <div
        className="relative mt-4 rounded-lg border border-slate-700 bg-slate-950"
        style={{ width: 20 * GRID_UNIT_PX, height: 20 * GRID_UNIT_PX }}
      >
        <AnimatePresence>
          {nodes?.map((node) => {
            const order = orderByNodeId.get(node.id);
            const isMine = order?.kingdom_id === myKingdomId;
            const justDispatched = dispatchedNodeId === node.id;
            return (
              <motion.button
                key={node.id}
                layoutId={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  boxShadow: order
                    ? isMine
                      ? [
                          "0 0 0px rgba(52,211,153,0)",
                          "0 0 8px rgba(52,211,153,0.8)",
                          "0 0 0px rgba(52,211,153,0)",
                        ]
                      : [
                          "0 0 0px rgba(239,68,68,0)",
                          "0 0 8px rgba(239,68,68,0.8)",
                          "0 0 0px rgba(239,68,68,0)",
                        ]
                    : "0 0 0px rgba(0,0,0,0)",
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={
                  order
                    ? { boxShadow: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } }
                    : { duration: 0.3 }
                }
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                title={`${RESOURCE_LABEL[node.resource_type]} — Lv ${node.level}${order ? (isMine ? " (yours)" : " (occupied)") : ""}`}
                onClick={() => handleNodeClick(node)}
                className={`absolute flex items-center justify-center rounded-sm text-[8px] font-bold text-slate-950 ${RESOURCE_COLOR[node.resource_type]}`}
                style={{
                  left: node.position_x * GRID_UNIT_PX,
                  top: node.position_y * GRID_UNIT_PX,
                  width: GRID_UNIT_PX - 2,
                  height: GRID_UNIT_PX - 2,
                }}
              >
                {node.level}
                {justDispatched && (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 rounded-full bg-white"
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-amber-500" /> Gold
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-600" /> Wood
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-slate-400" /> Stone
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm ring-2 ring-red-500" /> Occupied
        </span>
      </div>

      {myKingdomId && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">My Expeditions</h2>
          {activeMyOrders.length === 0 && pastMyOrders.length === 0 && (
            <p className="mt-2 text-sm text-slate-400">No gathering parties sent yet.</p>
          )}
          <div className="mt-2 space-y-2">
            {activeMyOrders.map((order) => (
              <div key={order.id} className="rounded-lg bg-slate-900 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {RESOURCE_LABEL[order.resource_type]} — done in{" "}
                    <CountdownTimer finishesAt={order.full_completes_at} />
                  </span>
                  <button
                    onClick={() => recallMutation.mutate(order.id)}
                    disabled={recallMutation.isPending}
                    className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium hover:bg-slate-700 active:scale-95 disabled:opacity-50"
                  >
                    Recall now
                  </button>
                </div>
                <ProgressMarch startedAt={order.started_at} finishesAt={order.full_completes_at} icon="⛏️" />
              </div>
            ))}
            {pastMyOrders.map((order) => (
              <div key={order.id} className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400">
                {RESOURCE_LABEL[order.resource_type]}:{" "}
                {order.resource_awarded && order.resource_awarded > 0
                  ? `gathered ${order.resource_awarded}${order.interrupted ? " (recalled/raided early)" : ""}`
                  : "plundered — got nothing"}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to="/servers" className="mt-6 inline-block text-sm text-emerald-400 hover:underline">
        ← Back to servers
      </Link>

      {selection && myKingdom && selection.kind === "gather" && (
        <AttackModal
          title={`Gather at ${RESOURCE_LABEL[selection.node.resource_type]} (Lv ${selection.node.level})`}
          confirmLabel="Send Gatherers"
          troops={myKingdom.troops}
          troopTypes={myKingdom.troopTypes}
          isSubmitting={startGatheringMutation.isPending}
          error={startGatheringMutation.error instanceof Error ? startGatheringMutation.error.message : null}
          onConfirm={(troops) =>
            startGatheringMutation.mutate(
              { nodeId: selection.node.id, troops },
              {
                onSuccess: () => {
                  setDispatchedNodeId(selection.node.id);
                  setTimeout(() => setDispatchedNodeId(null), 900);
                  setSelection(null);
                },
              }
            )
          }
          onClose={() => setSelection(null)}
        />
      )}

      {selection && myKingdom && selection.kind === "raid" && (
        <AttackModal
          title={`Raid gathering party at ${RESOURCE_LABEL[selection.node.resource_type]}`}
          confirmLabel="Send Raid"
          troops={myKingdom.troops}
          troopTypes={myKingdom.troopTypes}
          isSubmitting={attackMutation.isPending}
          error={attackMutation.error instanceof Error ? attackMutation.error.message : null}
          onConfirm={(troops) =>
            attackMutation.mutate(
              { gatheringOrderId: selection.order.id, troops },
              {
                onSuccess: () => {
                  setDispatchedNodeId(selection.node.id);
                  setTimeout(() => setDispatchedNodeId(null), 900);
                  setSelection(null);
                },
              }
            )
          }
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
