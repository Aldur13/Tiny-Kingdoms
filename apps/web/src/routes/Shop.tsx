import { Link, useParams } from "react-router-dom";
import { useKingdom } from "../hooks/useKingdom";
import { useBuyShield, useShopItems } from "../hooks/useShop";
import { CountdownTimer } from "../components/CountdownTimer";

export default function Shop() {
  const { kingdomId = "" } = useParams();
  const { data: kingdomData, isLoading: kingdomLoading } = useKingdom(kingdomId);
  const { data: items, isLoading: itemsLoading } = useShopItems();
  const buyShieldMutation = useBuyShield(kingdomId);

  if (kingdomLoading || itemsLoading) return <p className="p-8">Loading shop…</p>;
  if (!kingdomData) return <p className="p-8 text-red-400">Kingdom not found</p>;

  const { kingdom } = kingdomData;
  const isProtected = !!kingdom.protected_until && new Date(kingdom.protected_until) > new Date();

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Shop</h1>
      <p className="mt-1 text-sm text-slate-400">🪙 {kingdom.gold.toLocaleString()} gold available</p>

      <div className="mt-4 rounded-lg bg-slate-900 p-3 text-sm">
        {isProtected ? (
          <p className="text-sky-400">
            🛡 Shield active for <CountdownTimer finishesAt={kingdom.protected_until!} />
          </p>
        ) : (
          <p className="text-slate-400">No active shield — you can be attacked.</p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {items?.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-4">
            <div>
              <div className="font-medium">🛡 {item.name}</div>
              <div className="text-xs text-slate-400">
                Blocks incoming attacks for {item.shield_hours}h. Stacks with any remaining shield time.
              </div>
            </div>
            <button
              onClick={() => buyShieldMutation.mutate(item.key)}
              disabled={buyShieldMutation.isPending || kingdom.gold < item.cost_gold}
              className="ml-4 shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {buyShieldMutation.isPending ? "Buying…" : `🪙 ${item.cost_gold}`}
            </button>
          </div>
        ))}
      </div>

      {buyShieldMutation.error && (
        <p className="mt-3 text-sm text-red-400">
          {buyShieldMutation.error instanceof Error ? buyShieldMutation.error.message : "Purchase failed"}
        </p>
      )}

      <Link to={`/kingdom/${kingdomId}`} className="mt-6 inline-block text-sm text-emerald-400 hover:underline">
        ← Back to kingdom
      </Link>
    </div>
  );
}
