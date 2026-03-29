import React from 'react';
import { useNotification, type NotificationType } from '../store/useNotification';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const icons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
};

const bgColors: Record<NotificationType, string> = {
  success: 'bg-green-50 border-green-100',
  error: 'bg-red-50 border-red-100',
  info: 'bg-blue-50 border-blue-100',
  warning: 'bg-amber-50 border-amber-100',
};

export default function Notification() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 z-[9999] flex flex-col gap-3 pointer-events-none sm:left-auto sm:w-80">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-right-full fade-in duration-300 ${bgColors[notification.type]}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {icons[notification.type]}
          </div>
          <p className="flex-1 text-sm font-semibold text-gray-800 leading-tight">
            {notification.message}
          </p>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
