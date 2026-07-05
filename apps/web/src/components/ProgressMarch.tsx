import { useEffect } from "react";
import { motion } from "framer-motion";
import { useCountdown } from "../hooks/useCountdown";

/** A progress bar with an icon marching along it — used for anything that
 * counts down to completion: troop training, healing, gathering, marches. */
export function ProgressMarch({
  startedAt,
  finishesAt,
  icon = "🪖",
  onComplete,
}: {
  startedAt: string;
  finishesAt: string;
  icon?: string;
  onComplete?: () => void;
}) {
  const totalSeconds = (new Date(finishesAt).getTime() - new Date(startedAt).getTime()) / 1000;
  const remaining = useCountdown(finishesAt);
  const fraction = totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - remaining / totalSeconds)) : 1;

  useEffect(() => {
    if (remaining === 0) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  return (
    <div className="relative mt-1 h-2 w-full rounded-full bg-slate-800">
      <motion.div
        className="h-2 rounded-full bg-emerald-600"
        animate={{ width: `${fraction * 100}%` }}
        transition={{ duration: 0.6, ease: "linear" }}
      />
      <motion.span
        className="absolute -top-2.5 text-xs"
        animate={{ left: `calc(${fraction * 100}% - 8px)` }}
        transition={{ duration: 0.6, ease: "linear" }}
      >
        {icon}
      </motion.span>
    </div>
  );
}
