import { Link, useNavigate } from "react-router-dom";
import { signOut } from "../lib/api";
import { useGlobalNotifications } from "../hooks/useGlobalNotifications";
import { useUnloadGuard } from "../hooks/useUnloadGuard";
import { NotificationBell } from "./NotificationBell";

export function AppHeader() {
  const navigate = useNavigate();
  useGlobalNotifications();
  useUnloadGuard();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <Link to="/servers" className="text-sm font-bold tracking-wide text-emerald-400">
          👑 Kingdom Builder
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link to="/settings" className="rounded-lg p-2 text-lg hover:bg-slate-800" aria-label="Settings">
            ⚙️
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-lg hover:bg-slate-800"
            aria-label="Sign out"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  );
}
