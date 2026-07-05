import { create } from "zustand";

export type NotificationTone = "success" | "danger" | "info";

export interface NotificationItem {
  id: string;
  tone: NotificationTone;
  message: string;
  createdAt: number;
  read: boolean;
}

const MAX_ITEMS = 30;

interface NotificationState {
  items: NotificationItem[];
  push: (tone: NotificationTone, message: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  push: (tone, message) =>
    set((state) => ({
      items: [
        { id: crypto.randomUUID(), tone, message, createdAt: Date.now(), read: false },
        ...state.items,
      ].slice(0, MAX_ITEMS),
    })),
  markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
  clear: () => set({ items: [] }),
}));

/** Fire-and-forget helper for use in non-component code (realtime callbacks,
 * mutation handlers) where calling the store hook directly isn't possible. */
export function pushNotification(tone: NotificationTone, message: string) {
  useNotificationStore.getState().push(tone, message);
}
