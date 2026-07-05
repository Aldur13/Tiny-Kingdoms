import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  {
    icon: "🏰",
    title: "Build your kingdom",
    body: "Upgrade sawmills, quarries, farms, and goldmines to fuel your empire's growth.",
  },
  {
    icon: "⚔️",
    title: "Train an army",
    body: "Raise militia, archers, and cavalry, then use rock-paper-scissors class matchups to win battles.",
  },
  {
    icon: "🗺️",
    title: "Conquer the map",
    body: "Send gathering parties to neutral nodes, or raid a rival's expedition before it gets home.",
  },
  {
    icon: "🏆",
    title: "Climb the leaderboard",
    body: "Every server has one leaderboard — attack rivals and grow your power score to reach the top.",
  },
  {
    icon: "🤝",
    title: "Form alliances",
    body: "Team up with other players, chat in real time, and watch each other's backs.",
  },
  {
    icon: "🔔",
    title: "Live updates",
    body: "Attacks, raids, and training all update instantly — no refreshing, no waiting.",
  },
];

export default function Landing() {
  const { session } = useAuth();
  const ctaTarget = session ? "/servers" : "/login";

  return (
    <div className="min-h-screen">
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-6xl"
        >
          👑
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Kingdom Builder
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-lg text-slate-400"
        >
          A lightweight, browser-based strategy game. Build. Train. Raid. Climb the leaderboard —
          all in a few minutes a day.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-8"
        >
          <Link
            to={ctaTarget}
            className="inline-block rounded-lg bg-emerald-600 px-8 py-3 text-lg font-semibold hover:bg-emerald-500 active:scale-95"
          >
            {session ? "Continue playing →" : "Play now — it's free"}
          </Link>
        </motion.div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="text-2xl">{feature.icon}</div>
              <h3 className="mt-2 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{feature.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        Kingdom Builder — build your empire in the browser, no download required.
      </footer>
    </div>
  );
}
