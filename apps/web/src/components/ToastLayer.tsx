import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore, type NotificationItem } from "../lib/notifications";

const TONE_STYLES: Record<NotificationItem["tone"], string> = {
  success: "border-emerald-700 bg-emerald-950/95 text-emerald-100",
  danger: "border-red-800 bg-red-950/95 text-red-100",
  info: "border-sky-700 bg-sky-950/95 text-sky-100",
};

const TONE_ICON: Record<NotificationItem["tone"], string> = {
  success: "✅",
  danger: "⚔️",
  info: "ℹ️",
};

const DISPLAY_MS = 5000;

/** Ephemeral pop-up stack for the newest notifications. Full history lives
 * in the NotificationBell dropdown — this is just the "did you see that?" layer. */
export function ToastLayer() {
  const items = useNotificationStore((s) => s.items);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  useEffect(() => {
    const newest = items[0];
    if (!newest || newest.id === lastSeenId) return;
    setLastSeenId(newest.id);
    setVisibleIds((ids) => [newest.id, ...ids]);
    const timer = setTimeout(() => {
      setVisibleIds((ids) => ids.filter((id) => id !== newest.id));
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [items, lastSeenId]);

  const visible = visibleIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NotificationItem => !!item);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {visible.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2 text-sm shadow-lg ${TONE_STYLES[item.tone]}`}
          >
            <span>{TONE_ICON[item.tone]}</span>
            <span>{item.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
