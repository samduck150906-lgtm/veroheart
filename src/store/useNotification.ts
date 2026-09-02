import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * 사라지는 애니메이션 길이(ms).
 *
 * 표시가 끝나면 곧바로 목록에서 빼지 않고 `leaving` 으로 표시해 두었다가
 * 이 시간 뒤에 제거한다. 컴포넌트는 그동안 사라지는 애니메이션을 재생한다.
 * CSS 의 `.vr-toast[data-leaving]` 재생 시간과 맞춘다.
 */
export const NOTIFICATION_EXIT_MS = 180;

/** 기본 표시 시간(ms) — 한 줄짜리 안내를 읽기에 충분한 정도. */
export const NOTIFICATION_DEFAULT_MS = 3000;

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  /** 사라지는 중 — 컴포넌트가 퇴장 애니메이션을 재생하는 구간. */
  leaving?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  /** 퇴장 애니메이션을 재생한 뒤 목록에서 제거한다. */
  removeNotification: (id: string) => void;
}

export const useNotification = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (message, type, duration = NOTIFICATION_DEFAULT_MS) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => get().removeNotification(id), duration);
    }
  },
  removeNotification: (id) => {
    const target = get().notifications.find((n) => n.id === id);
    // 이미 사라지는 중이면 무시한다. 자동 종료와 사용자가 누른 닫기가 겹쳐도
    // 제거 타이머가 두 번 걸리지 않는다.
    if (!target || target.leaving) return;

    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, leaving: true } : n)),
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, NOTIFICATION_EXIT_MS);
  },
}));

export const notify = {
  success: (msg: string) => useNotification.getState().addNotification(msg, 'success'),
  error: (msg: string) => useNotification.getState().addNotification(msg, 'error'),
  info: (msg: string) => useNotification.getState().addNotification(msg, 'info'),
  warning: (msg: string) => useNotification.getState().addNotification(msg, 'warning'),
};
