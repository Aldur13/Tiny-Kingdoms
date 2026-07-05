import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, useAuthInit } from "./hooks/useAuth";
import Login from "./routes/Login";
import ServerSelect from "./routes/ServerSelect";
import KingdomView from "./routes/KingdomView";
import Leaderboard from "./routes/Leaderboard";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useAuthInit();
  const { session, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!loading && session ? <Navigate to="/servers" replace /> : <Login />}
      />
      <Route
        path="/servers"
        element={
          <RequireAuth>
            <ServerSelect />
          </RequireAuth>
        }
      />
      <Route
        path="/kingdom/:kingdomId"
        element={
          <RequireAuth>
            <KingdomView />
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard/:serverId"
        element={
          <RequireAuth>
            <Leaderboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={session ? "/servers" : "/login"} replace />} />
    </Routes>
  );
}
