import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, useAuthInit } from "./hooks/useAuth";
import { AppHeader } from "./components/AppHeader";
import { ToastLayer } from "./components/ToastLayer";
import Landing from "./routes/Landing";
import Login from "./routes/Login";
import ServerSelect from "./routes/ServerSelect";
import KingdomView from "./routes/KingdomView";
import Leaderboard from "./routes/Leaderboard";
import BattleReports from "./routes/BattleReports";
import Shop from "./routes/Shop";
import MapPage from "./routes/Map";
import Alliance from "./routes/Alliance";
import Settings from "./routes/Settings";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}

export default function App() {
  useAuthInit();
  const { session, loading } = useAuth();
  const location = useLocation();

  return (
    <>
      <ToastLayer />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
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
            <Route
              path="/battles/:kingdomId"
              element={
                <RequireAuth>
                  <BattleReports />
                </RequireAuth>
              }
            />
            <Route
              path="/shop/:kingdomId"
              element={
                <RequireAuth>
                  <Shop />
                </RequireAuth>
              }
            />
            <Route
              path="/map/:serverId"
              element={
                <RequireAuth>
                  <MapPage />
                </RequireAuth>
              }
            />
            <Route
              path="/alliance/:kingdomId"
              element={
                <RequireAuth>
                  <Alliance />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to={session ? "/servers" : "/"} replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
