import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { findMyKingdomOnServer, joinServer, listServers } from "../lib/api";
import type { Server } from "../types/database.types";

export default function ServerSelect() {
  const navigate = useNavigate();
  const [kingdomName, setKingdomName] = useState("");
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: servers, isLoading } = useQuery({ queryKey: ["servers"], queryFn: listServers });

  const joinMutation = useMutation({
    mutationFn: async (server: Server) => {
      const existing = await findMyKingdomOnServer(server.id);
      if (existing) return existing.id;
      return joinServer(server.id, kingdomName.trim() || "My Kingdom");
    },
    onSuccess: (kingdomId) => navigate(`/kingdom/${kingdomId}`),
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to join"),
  });

  if (isLoading) return <p className="p-8">Loading servers…</p>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Choose a world</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {servers?.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServer(server)}
            disabled={server.status !== "open"}
            className={`rounded-lg border p-3 text-left text-sm ${
              selectedServer?.id === server.id ? "border-emerald-500" : "border-slate-700"
            } bg-slate-900 disabled:opacity-40`}
          >
            <div className="font-medium">{server.name}</div>
            <div className="text-xs capitalize text-slate-400">{server.status}</div>
          </button>
        ))}
      </div>

      {selectedServer && (
        <div className="mt-6 rounded-lg bg-slate-900 p-4">
          <label className="block text-sm">Kingdom name</label>
          <input
            value={kingdomName}
            onChange={(e) => setKingdomName(e.target.value)}
            placeholder="My Kingdom"
            className="mt-1 w-full rounded-lg bg-slate-800 p-2"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            onClick={() => joinMutation.mutate(selectedServer)}
            disabled={joinMutation.isPending}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {joinMutation.isPending ? "Joining…" : `Join ${selectedServer.name}`}
          </button>
        </div>
      )}
    </div>
  );
}
