import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { signInAsGuest, signInWithPassword, signUpWithPassword } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithPassword(email, password, displayName || email.split("@")[0] || email);
      } else {
        await signInWithPassword(email, password);
      }
      navigate("/servers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    try {
      await signInAsGuest();
      navigate("/servers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-xl bg-slate-900 p-8 shadow-xl">
      <h1 className="text-2xl font-bold">Kingdom Builder</h1>
      <p className="mt-1 text-sm text-slate-400">Build. Train. Climb the leaderboard.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <input
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg bg-slate-800 p-2"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg bg-slate-800 p-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-lg bg-slate-800 p-2"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {mode === "signup" ? "Sign up" : "Sign in"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="mt-3 w-full text-sm text-slate-400 hover:text-slate-200"
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>

      <div className="mt-4 border-t border-slate-800 pt-4">
        <button
          onClick={handleGuest}
          disabled={loading}
          className="w-full rounded-lg bg-slate-800 py-2 font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
