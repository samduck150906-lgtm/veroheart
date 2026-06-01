import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

export const useNotification = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (message, type, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

export const notify = {
  success: (msg: string) => useNotification.getState().addNotification(msg, 'success'),
  error: (msg: string) => useNotification.getState().addNotification(msg, 'error'),
  info: (msg: string) => useNotification.getState().addNotification(msg, 'info'),
  warning: (msg: string) => useNotification.getState().addNotification(msg, 'warning'),
};
