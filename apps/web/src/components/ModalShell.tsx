import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** Shared entrance/exit animation for modals — fade backdrop, spring-pop
 * the panel. Use with AnimatePresence at the call site if you want an exit
 * animation when the modal is dismissed. */
export function ModalShell({
  children,
  onClose,
  widthClassName = "w-80",
}: {
  children: ReactNode;
  onClose: () => void;
  widthClassName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 26 }}
        className={`${widthClassName} rounded-xl bg-slate-900 p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
