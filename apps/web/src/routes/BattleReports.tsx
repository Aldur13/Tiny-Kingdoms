import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useBattleReports } from "../hooks/useCombat";
import { useNodeRaids } from "../hooks/useMap";

// One-time reveal per row on mount (keyed by a stable id, so refetches don't
// replay it): victories pop with a gold flash, defeats shake.
function outcomeAnimation(pending: boolean, won: boolean) {
  if (pending) return { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 } };
  if (won) {
    return {
      initial: { opacity: 0, scale: 0.85, boxShadow: "0 0 0px rgba(251,191,36,0)" },
      animate: {
        opacity: 1,
        scale: 1,
        boxShadow: [
          "0 0 0px rgba(251,191,36,0)",
          "0 0 20px rgba(251,191,36,0.6)",
          "0 0 0px rgba(251,191,36,0)",
        ],
      },
    };
  }
  return {
    initial: { opacity: 0, x: 0 },
    animate: { opacity: 1, x: [0, -8, 8, -6, 6, 0] },
  };
}

export default function BattleReports() {
  const { kingdomId = "" } = useParams();
  const { data, isLoading } = useBattleReports(kingdomId);
  const { data: raids, isLoading: raidsLoading } = useNodeRaids(kingdomId);

  if (isLoading || raidsLoading) return <p className="p-8">Loading battle reports…</p>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Battle Reports</h1>

      {!data || data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No kingdom battles yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.map((report) => {
            const isAttacker = report.attacker_kingdom_id === kingdomId;
            const pending = !report.resolved_at;
            const won = !!report.outcome && report.outcome.winner === (isAttacker ? "attacker" : "defender");
            const anim = outcomeAnimation(pending, won);

            return (
              <motion.li
                key={report.id}
                initial={anim.initial}
                animate={anim.animate}
                transition={{ duration: 0.6 }}
                className={`rounded-lg border p-3 text-sm ${
                  pending
                    ? "border-slate-700 bg-slate-900"
                    : won
                      ? "border-emerald-700 bg-emerald-950/40"
                      : "border-red-800 bg-red-950/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{isAttacker ? "Outgoing attack" : "Incoming attack"}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(report.march_started_at).toLocaleString()}
                  </span>
                </div>
                {pending ? (
                  <p className="mt-1 text-slate-400">
                    Arrives {new Date(report.arrives_at).toLocaleTimeString()}…
                  </p>
                ) : (
                  report.outcome && (
                    <div className="mt-1 space-y-0.5">
                      <p>{won ? "🏆 Victory" : "💀 Defeat"}</p>
                      {won && isAttacker && (
                        <p className="text-xs text-slate-400">
                          Looted 🪵{report.outcome.loot.wood} 🪨{report.outcome.loot.stone} 🌾
                          {report.outcome.loot.food} 🪙{report.outcome.loot.gold}
                        </p>
                      )}
                    </div>
                  )
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold">Mine Raids Sent</h2>
      {!raids || raids.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No raids sent yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {raids.map((raid) => {
            const pending = !raid.resolved_at;
            const won = raid.outcome?.result === "attacker_won";
            const anim = outcomeAnimation(pending, won);
            return (
              <motion.li
                key={raid.id}
                initial={anim.initial}
                animate={anim.animate}
                transition={{ duration: 0.6 }}
                className={`rounded-lg border p-3 text-sm ${
                  pending
                    ? "border-slate-700 bg-slate-900"
                    : won
                      ? "border-emerald-700 bg-emerald-950/40"
                      : "border-red-800 bg-red-950/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Mine raid</span>
                  <span className="text-xs text-slate-400">
                    {new Date(raid.march_started_at).toLocaleString()}
                  </span>
                </div>
                {pending ? (
                  <p className="mt-1 text-slate-400">Arrives {new Date(raid.arrives_at).toLocaleTimeString()}…</p>
                ) : raid.outcome?.result === "missed_target" ? (
                  <p className="mt-1 text-slate-400">Target already gone — troops returned home.</p>
                ) : (
                  <p className="mt-1">
                    {won ? `🏆 Victory — plundered ${raid.outcome?.plundered ?? 0}` : "💀 Defeat"}
                  </p>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      <Link to={`/kingdom/${kingdomId}`} className="mt-6 inline-block text-sm text-emerald-400 hover:underline">
        ← Back to kingdom
      </Link>
    </div>
  );
}
