import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ModalShell } from "./ModalShell";

const STEPS = [
  {
    title: "Welcome to your Kingdom!",
    body: "Buildings produce resources over time — click one to queue an upgrade.",
  },
  {
    title: "Train your army",
    body: "Use the Train troops button to build militia, archers, and cavalry to defend your kingdom.",
  },
  {
    title: "Explore the map",
    body: "Send troops to gather resources from neutral nodes, or raid a rival's gathering party.",
  },
  {
    title: "Climb the leaderboard",
    body: "Attack rival kingdoms to grow your power score and claim the top spot.",
  },
  {
    title: "Find an alliance",
    body: "Team up with other players for chat and mutual support.",
  },
];

const STORAGE_KEY = "kb-onboarding-tour-seen-v1";

/** One-time step-through shown the first time a player opens a kingdom.
 * Dismissal is remembered in localStorage, not tied to any one kingdom. */
export function OnboardingTour() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [step, setStep] = useState(0);

  if (dismissed) return null;

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step] ?? STEPS[0]!;

  return (
    <AnimatePresence>
      <ModalShell onClose={finish} widthClassName="w-96">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-lg font-bold">{current.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{current.body}</p>
        </motion.div>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={finish} className="text-sm text-slate-500 hover:text-slate-300">
            Skip
          </button>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-emerald-400" : "bg-slate-700"}`}
              />
            ))}
          </div>
          <button
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
          >
            {isLast ? "Let's go!" : "Next"}
          </button>
        </div>
      </ModalShell>
    </AnimatePresence>
  );
}
