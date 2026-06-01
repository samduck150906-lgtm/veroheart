import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300); // match transition duration
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9998] ${isOpen ? 'opacity-40' : 'opacity-0'}`}
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
      
      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: `translateX(-50%) translateY(${isOpen ? '0' : '100%'})`,
          width: '100%', maxWidth: '480px', maxHeight: '75vh',
          backgroundColor: '#fff', borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
          zIndex: 9999, transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '16px 24px', paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', backgroundColor: '#E5E8EB', borderRadius: '4px', margin: '0 auto 16px auto', flexShrink: 0 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#191F28' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B95A1', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {children}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '16px', padding: '16px', borderRadius: '20px', fontWeight: 800, fontSize: '17px', flexShrink: 0 }}
          onClick={onClose}
        >
          확인
        </button>
      </div>
    </>
  );
}
