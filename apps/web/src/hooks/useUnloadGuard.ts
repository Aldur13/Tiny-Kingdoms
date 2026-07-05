import { useEffect } from "react";
import { useIsMutating } from "@tanstack/react-query";

/** Warns before an accidental tab close/reload while a game action (attack,
 * upgrade, training, gathering, chat message, ...) is still in flight — the
 * request may not have reached the server yet, so closing right now is the
 * one case where "did that actually happen?" becomes ambiguous. Every
 * mutation in the app goes through react-query, so watching the global
 * in-flight count covers all of them without wiring this into each one. */
export function useUnloadGuard() {
  const pendingMutations = useIsMutating();

  useEffect(() => {
    if (pendingMutations === 0) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingMutations]);
}
