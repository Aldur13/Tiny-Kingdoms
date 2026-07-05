import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useKingdom } from "../hooks/useKingdom";
import { useLeaderboard } from "../hooks/useLeaderboard";
import {
  useAllianceMessages,
  useAllianceRoster,
  useCreateAlliance,
  useJoinAlliance,
  useLeaveAlliance,
  useMyAllianceMembership,
  useSendAllianceMessage,
  useServerAlliances,
} from "../hooks/useAlliance";

export default function Alliance() {
  const { kingdomId = "" } = useParams();
  const { data: kingdomData, isLoading: kingdomLoading } = useKingdom(kingdomId);
  const serverId = kingdomData?.kingdom.server_id ?? null;

  const { data: membership, isLoading: membershipLoading } = useMyAllianceMembership(kingdomId);
  const { data: alliances } = useServerAlliances(serverId);
  const { data: leaderboard } = useLeaderboard(serverId);

  const nameByKingdomId = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of leaderboard ?? []) map.set(entry.kingdom_id, entry.kingdom_name);
    return map;
  }, [leaderboard]);

  const myAlliance = alliances?.find((a) => a.id === membership?.alliance_id) ?? null;

  if (kingdomLoading || membershipLoading) return <p className="p-8">Loading alliance…</p>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Alliance</h1>

      {membership && myAlliance ? (
        <AllianceHome
          kingdomId={kingdomId}
          allianceId={membership.alliance_id}
          allianceName={myAlliance.name}
          allianceTag={myAlliance.tag}
          nameByKingdomId={nameByKingdomId}
        />
      ) : (
        <AllianceBrowse kingdomId={kingdomId} serverId={serverId} alliances={alliances ?? []} />
      )}

      <Link to={`/kingdom/${kingdomId}`} className="mt-6 inline-block text-sm text-emerald-400 hover:underline">
        ← Back to kingdom
      </Link>
    </div>
  );
}

function AllianceHome({
  kingdomId,
  allianceId,
  allianceName,
  allianceTag,
  nameByKingdomId,
}: {
  kingdomId: string;
  allianceId: string;
  allianceName: string;
  allianceTag: string;
  nameByKingdomId: Map<string, string>;
}) {
  const { data: roster } = useAllianceRoster(allianceId);
  const { data: messages } = useAllianceMessages(allianceId, kingdomId);
  const sendMessage = useSendAllianceMessage(allianceId, kingdomId);
  const leaveMutation = useLeaveAlliance(kingdomId);
  const [draft, setDraft] = useState("");

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    sendMessage.mutate(body, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4">
        <div>
          <p className="text-lg font-semibold">
            {allianceName} <span className="text-slate-500">[{allianceTag}]</span>
          </p>
          <p className="text-xs text-slate-400">{roster?.length ?? 0} members</p>
        </div>
        <button
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="rounded-lg bg-red-900/60 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-900 disabled:opacity-50"
        >
          Leave alliance
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Roster</h2>
        <ul className="mt-2 space-y-1">
          {roster?.map((member) => (
            <li
              key={member.kingdom_id}
              className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm"
            >
              <span>{nameByKingdomId.get(member.kingdom_id) ?? "Unknown kingdom"}</span>
              <span className="text-xs capitalize text-slate-400">{member.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Chat</h2>
        <div className="mt-2 flex h-64 flex-col-reverse gap-2 overflow-y-auto rounded-lg bg-slate-900 p-3">
          {(messages ?? []).length === 0 && (
            <p className="text-center text-sm text-slate-500">No messages yet — say hello!</p>
          )}
          {messages?.map((message) => (
            <div key={message.id} className="text-sm">
              <span className="font-medium text-emerald-400">
                {nameByKingdomId.get(message.kingdom_id) ?? "Unknown"}:
              </span>{" "}
              <span className="text-slate-200">{message.body}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder="Message your alliance…"
            className="flex-1 rounded-lg bg-slate-800 p-2 text-sm"
          />
          <button
            type="submit"
            disabled={sendMessage.isPending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function AllianceBrowse({
  kingdomId,
  serverId,
  alliances,
}: {
  kingdomId: string;
  serverId: number | null;
  alliances: { id: string; name: string; tag: string }[];
}) {
  const createMutation = useCreateAlliance(kingdomId);
  const joinMutation = useJoinAlliance(kingdomId);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate(
      { name, tag },
      { onError: (err) => setError(err instanceof Error ? err.message : "Failed to create alliance") }
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Join an alliance</h2>
        {!serverId || alliances.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No alliances on this server yet — start one below.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {alliances.map((alliance) => (
              <li
                key={alliance.id}
                className="flex items-center justify-between rounded-lg bg-slate-900 p-3 text-sm"
              >
                <span>
                  {alliance.name} <span className="text-slate-500">[{alliance.tag}]</span>
                </span>
                <button
                  onClick={() => joinMutation.mutate(alliance.id)}
                  disabled={joinMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        )}
        {joinMutation.error && (
          <p className="mt-2 text-sm text-red-400">
            {joinMutation.error instanceof Error ? joinMutation.error.message : "Failed to join"}
          </p>
        )}
      </div>

      <div className="rounded-lg bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Create an alliance</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alliance name"
            className="w-full rounded-lg bg-slate-800 p-2 text-sm"
          />
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Tag (2-5 characters)"
            maxLength={5}
            className="w-full rounded-lg bg-slate-800 p-2 text-sm uppercase"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create alliance"}
          </button>
        </form>
      </div>
    </div>
  );
}
