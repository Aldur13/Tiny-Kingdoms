import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

/** Smoothly counts from the previous value to the new one instead of
 * jumping — used anywhere a resource/troop count updates (production
 * ticks, training completing, loot landing, combat losses). */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const previous = useRef(value);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: previous.current === value ? 0 : 0.6,
      ease: "easeOut",
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
