import { useEffect } from "react";
import { useCountdown } from "../hooks/useCountdown";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CountdownTimer({
  finishesAt,
  onComplete,
}: {
  finishesAt: string;
  onComplete?: () => void;
}) {
  const remaining = useCountdown(finishesAt);

  useEffect(() => {
    if (remaining === 0) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  return <span className="font-mono text-xs text-amber-300">{formatDuration(remaining)}</span>;
}
