import { Link, useParams } from "react-router-dom";
import { useBattleReports } from "../hooks/useCombat";

export default function BattleReports() {
  const { kingdomId = "" } = useParams();
  const { data, isLoading } = useBattleReports(kingdomId);

  if (isLoading) return <p className="p-8">Loading battle reports…</p>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Battle Reports</h1>

      {!data || data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No battles yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.map((report) => {
            const isAttacker = report.attacker_kingdom_id === kingdomId;
            const pending = !report.resolved_at;
            const won = report.outcome && report.outcome.winner === (isAttacker ? "attacker" : "defender");

            return (
              <li
                key={report.id}
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
                      <p>{won ? "Victory" : "Defeat"}</p>
                      {won && isAttacker && (
                        <p className="text-xs text-slate-400">
                          Looted 🪵{report.outcome.loot.wood} 🪨{report.outcome.loot.stone} 🌾
                          {report.outcome.loot.food} 🪙{report.outcome.loot.gold}
                        </p>
                      )}
                    </div>
                  )
                )}
              </li>
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
