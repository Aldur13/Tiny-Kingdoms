import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  resetPasswordWithRecoveryPhrase,
  setRecoveryPhrase,
  signInWithPassword,
  signUpWithPassword,
} from "../lib/api";

type Mode = "signin" | "signup" | "reset";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [recoveryPhrase, setRecoveryPhraseInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (recoveryPhrase.trim().length < 4) {
          throw new Error("Recovery phrase must be at least 4 characters");
        }

        const result = await signUpWithPassword(
          email,
          password,
          displayName || email.split("@")[0] || email
        );

        if (!result.session) {
          throw new Error(
            'Sign-up succeeded, but no session came back — your Supabase project still has "Confirm email" enabled. Disable it under Authentication settings and try again.'
          );
        }

        await setRecoveryPhrase(recoveryPhrase.trim());
        navigate("/servers");
      } else if (mode === "reset") {
        await resetPasswordWithRecoveryPhrase(email, recoveryPhrase, newPassword);
        setResetDone(true);
      } else {
        await signInWithPassword(email, password);
        navigate("/servers");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetDone(false);
    setPassword("");
    setNewPassword("");
    setRecoveryPhraseInput("");
  }

  if (mode === "reset" && resetDone) {
    return (
      <div className="mx-auto mt-24 max-w-sm rounded-xl bg-slate-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold">Password updated</h1>
        <p className="mt-3 text-sm text-slate-400">
          Sign in with your new password.
        </p>
        <button
          onClick={() => switchMode("signin")}
          className="mt-4 w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-xl bg-slate-900 p-8 shadow-xl">
      <h1 className="text-2xl font-bold">Kingdom Builder</h1>
      <p className="mt-1 text-sm text-slate-400">
        {mode === "reset" ? "Reset your password" : "Build. Train. Climb the leaderboard."}
      </p>

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

        {mode !== "reset" && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg bg-slate-800 p-2"
          />
        )}

        {(mode === "signup" || mode === "reset") && (
          <input
            type="text"
            placeholder={
              mode === "signup" ? "Recovery phrase (for password reset)" : "Your recovery phrase"
            }
            value={recoveryPhrase}
            onChange={(e) => setRecoveryPhraseInput(e.target.value)}
            required
            minLength={4}
            className="w-full rounded-lg bg-slate-800 p-2"
          />
        )}

        {mode === "reset" && (
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg bg-slate-800 p-2"
          />
        )}

        {mode === "signup" && (
          <p className="text-xs text-slate-500">
            No email confirmation needed — remember this phrase, it's the only way to reset your
            password later.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading
            ? "Working…"
            : mode === "signup"
              ? "Sign up"
              : mode === "reset"
                ? "Reset password"
                : "Sign in"}
        </button>
      </form>

      {mode === "signin" && (
        <button
          onClick={() => switchMode("reset")}
          className="mt-3 w-full text-sm text-slate-500 hover:text-slate-300"
        >
          Forgot password?
        </button>
      )}

      <button
        onClick={() => switchMode(mode === "signup" ? "signin" : mode === "reset" ? "signin" : "signup")}
        className="mt-3 w-full text-sm text-slate-400 hover:text-slate-200"
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : mode === "reset"
            ? "← Back to sign in"
            : "New here? Create an account"}
      </button>
    </div>
  );
}
