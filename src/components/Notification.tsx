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
      <style>{`
        .fixed { position: fixed; }
        .top-4 { top: 16px; }
        .right-4 { right: 16px; }
        .left-4 { left: 16px; }
        .z-\\[9999\\] { z-index: 9999; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .gap-3 { gap: 12px; }
        .pointer-events-none { pointer-events: none; }
        .pointer-events-auto { pointer-events: auto; }
        .items-start { align-items: flex-start; }
        .p-4 { padding: 16px; }
        .rounded-xl { border-radius: 12px; }
        .border { border: 1px solid #e2e8f0; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
        .duration-300 { animation-duration: 300ms; }
        .flex-shrink-0 { flex-shrink: 0; }
        .mt-0.5 { margin-top: 2px; }
        .flex-1 { flex: 1 1 0%; }
        .text-sm { font-size: 14px; }
        .font-semibold { font-weight: 600; }
        .text-gray-800 { color: #1f2937; }
        .leading-tight { line-height: 1.25; }
        .text-gray-400 { color: #9ca3af; }
        
        .bg-green-50 { background-color: #f0faf4; }
        .border-green-100 { border-color: #d1fae5; }
        .bg-red-50 { background-color: #fef2f2; }
        .border-red-100 { border-color: #fecaca; }
        .bg-blue-50 { background-color: #f0f9ff; }
        .border-blue-100 { border-color: #dbeafe; }
        .bg-amber-50 { background-color: #fffbeb; }
        .border-amber-100 { border-color: #fde68a; }
        
        @media (min-width: 640px) {
          .sm\\:left-auto { left: auto; }
          .sm\\:w-80 { width: 320px; }
        }
      `}</style>
    </div>
  );
}
