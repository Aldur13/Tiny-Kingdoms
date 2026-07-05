import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { resendConfirmationEmail, signInWithPassword, signUpWithPassword } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set once we know the account needs email confirmation before it can sign
  // in — either right after sign-up, or after a sign-in attempt bounces with
  // "Email not confirmed". Once the user clicks the emailed link, Supabase
  // establishes a session on this site automatically; App.tsx's routing
  // guard then takes them straight into the game with no extra code needed.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await signUpWithPassword(
          email,
          password,
          displayName || email.split("@")[0] || email
        );
        if (result.session) {
          navigate("/servers");
        } else {
          setPendingEmail(email);
        }
      } else {
        await signInWithPassword(email, password);
        navigate("/servers");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      if (mode === "signin" && message.toLowerCase().includes("email not confirmed")) {
        setPendingEmail(email);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendStatus("sending");
    try {
      await resendConfirmationEmail(pendingEmail);
      setResendStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
      setResendStatus("idle");
    }
  }

  if (pendingEmail) {
    return (
      <div className="mx-auto mt-24 max-w-sm rounded-xl bg-slate-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-sm text-slate-400">
          We sent a confirmation link to{" "}
          <span className="font-medium text-slate-200">{pendingEmail}</span>. Click it to start
          playing — you'll be signed in automatically.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          onClick={handleResend}
          disabled={resendStatus === "sending"}
          className="mt-4 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {resendStatus === "sent"
            ? "Email sent!"
            : resendStatus === "sending"
              ? "Sending…"
              : "Resend confirmation email"}
        </button>
        <button
          onClick={() => {
            setPendingEmail(null);
            setError(null);
            setResendStatus("idle");
          }}
          className="mt-2 w-full text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to sign in
        </button>
      </div>
    );
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
    </div>
  );
}
