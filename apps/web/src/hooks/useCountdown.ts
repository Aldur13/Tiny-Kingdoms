import { useEffect, useState } from "react";

function secondsUntil(targetIso: string | null): number {
  if (!targetIso) return 0;
  return Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000));
}

/** Ticks down to zero once per second, purely for display — the server is
 * always the source of truth for whether a timer has actually completed. */
export function useCountdown(targetIso: string | null): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(targetIso));

  useEffect(() => {
    setRemaining(secondsUntil(targetIso));
    if (!targetIso) return;

    const id = setInterval(() => setRemaining(secondsUntil(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}
