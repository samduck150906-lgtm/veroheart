import React from 'react';
import { useNotification, type NotificationType } from '../store/useNotification';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const icons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle size={16} strokeWidth={2.5} aria-hidden />,
  error: <AlertCircle size={16} strokeWidth={2.5} aria-hidden />,
  info: <Info size={16} strokeWidth={2.5} aria-hidden />,
  warning: <AlertTriangle size={16} strokeWidth={2.5} aria-hidden />,
};

/**
 * 상단 토스트 알림.
 *
 * 예전에는 화면 폭을 꽉 채우는 파스텔 색 상자가 오른쪽에서 밀려 들어오고 닫기(X)
 * 버튼까지 달려 있어서, "로그인되었습니다" 같은 한 줄 안내에 비해 과했다.
 * 지금은 위에서 내려오는 작은 알약 하나로 띄우고 시간이 지나면 스스로 사라진다.
 * 눌러서 바로 닫을 수도 있어 별도 닫기 버튼을 두지 않는다.
 *
 * 오류·경고는 즉시 읽히도록 role="alert", 나머지는 하던 일을 끊지 않도록
 * role="status" 로 전달한다.
 */
export default function Notification() {
  const notifications = useNotification((state) => state.notifications);
  const removeNotification = useNotification((state) => state.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="vr-toast-layer">
      {notifications.map((notification) => {
        const urgent = notification.type === 'error' || notification.type === 'warning';
        return (
          <div
            key={notification.id}
            className="vr-toast"
            data-type={notification.type}
            data-leaving={notification.leaving ? '' : undefined}
            role={urgent ? 'alert' : 'status'}
            aria-live={urgent ? 'assertive' : 'polite'}
            onClick={() => removeNotification(notification.id)}
          >
            <span className="vr-toast__icon">{icons[notification.type]}</span>
            <span className="vr-toast__text">{notification.message}</span>
          </div>
        );
      })}
    </div>
  );
}
