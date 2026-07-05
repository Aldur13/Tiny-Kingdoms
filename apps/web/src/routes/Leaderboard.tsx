import { Link, useParams, useSearchParams } from "react-router-dom";
import { useLeaderboard } from "../hooks/useLeaderboard";

export default function Leaderboard() {
  const { serverId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const myKingdomId = searchParams.get("mine");
  const { data, isLoading } = useLeaderboard(Number(serverId));

  if (isLoading) return <p className="p-8">Loading leaderboard…</p>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">World {serverId} Leaderboard</h1>
      <ol className="mt-4 space-y-1">
        {data?.map((entry, i) => (
          <li
            key={entry.kingdom_id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              entry.kingdom_id === myKingdomId
                ? "bg-emerald-900/50 ring-1 ring-emerald-500"
                : i === 0
                  ? "bg-amber-900/40"
                  : "bg-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="w-6 text-right font-mono text-slate-400">{i + 1}</span>
              <span className="font-medium">{entry.kingdom_name}</span>
              <span className="text-xs text-slate-500">({entry.owner_display_name})</span>
            </span>
            <span className="font-mono">{entry.power_score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
      <Link to="/servers" className="mt-6 inline-block text-sm text-emerald-400 hover:underline">
        ← Back to servers
      </Link>
    </div>
  );
}
