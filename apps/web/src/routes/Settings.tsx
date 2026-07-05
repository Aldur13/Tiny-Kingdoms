import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSettingsStore } from "../hooks/useSettings";
import { signOut } from "../lib/api";
import { playSound } from "../lib/sound";
import { supabase } from "../lib/supabaseClient";

export default function Settings() {
  const navigate = useNavigate();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const [displayName, setDisplayName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSaveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSaveStatus("saving");

    const { data: userData, error: authError } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    });
    if (authError || !userData.user) {
      setSaveStatus("error");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userData.user.id);

    setSaveStatus(profileError ? "error" : "saved");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-6 rounded-lg bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Sound effects</p>
            <p className="text-xs text-slate-400">Chimes for attacks, training, and alerts.</p>
          </div>
          <button
            onClick={() => {
              toggleSound();
              playSound("click");
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              soundEnabled ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            {soundEnabled ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-slate-900 p-4">
        <label className="block text-sm font-medium">Display name</label>
        <div className="mt-2 flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="New display name"
            className="flex-1 rounded-lg bg-slate-800 p-2 text-sm"
          />
          <button
            onClick={handleSaveDisplayName}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Save
          </button>
        </div>
        {saveStatus === "saved" && <p className="mt-2 text-xs text-emerald-400">Saved!</p>}
        {saveStatus === "error" && <p className="mt-2 text-xs text-red-400">Failed to save.</p>}
      </div>

      <button
        onClick={handleSignOut}
        className="mt-6 w-full rounded-lg bg-red-900/60 py-2 text-sm font-medium text-red-200 hover:bg-red-900"
      >
        Sign out
      </button>

      <Link to="/servers" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
        ← Back to servers
      </Link>
    </div>
  );
}
