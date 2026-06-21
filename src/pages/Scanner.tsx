// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, ZapOff, Image } from 'lucide-react';

export default function Scanner() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('barcode');
  const [flash, setFlash] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleShutter = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); navigate('/scan-result'); }, 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} color="#fff" />
        </button>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 3 }}>
          {[{ key: 'barcode', label: '바코드 스캔' }, { key: 'label', label: '성분표 촬영' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 14px', borderRadius: 17, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: activeTab === tab.key ? '#fff' : 'transparent',
                color: activeTab === tab.key ? '#191F28' : 'rgba(255,255,255,0.7)',
              }}
            >{tab.label}</button>
          ))}
        </div>
        <button onClick={() => setFlash(!flash)}
          style={{ width: 40, height: 40, background: flash ? '#F5C518' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {flash ? <Zap size={18} color="#191F28" fill="#191F28" /> : <ZapOff size={18} color="#fff" />}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', opacity: 0.8 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', width: activeTab === 'barcode' ? 260 : 300, height: activeTab === 'barcode' ? 140 : 200 }}>
            {[
              { top: 0, left: 0, borderTop: '3px solid #F5C518', borderLeft: '3px solid #F5C518' },
              { top: 0, right: 0, borderTop: '3px solid #F5C518', borderRight: '3px solid #F5C518' },
              { bottom: 0, left: 0, borderBottom: '3px solid #F5C518', borderLeft: '3px solid #F5C518' },
              { bottom: 0, right: 0, borderBottom: '3px solid #F5C518', borderRight: '3px solid #F5C518' },
            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 3, ...s }} />)}
            {scanning ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, border: '3px solid rgba(245,197,24,0.3)', borderTopColor: '#F5C518', borderRadius: '50%', animation: 'spin 0.85s linear infinite', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13, color: '#F5C518', fontWeight: 700 }}>분석 중...</div>
                </div>
              </div>
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeTab === 'barcode' ? (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} style={{ width: i % 3 === 0 ? 3 : 1.5, height: 60, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>성분표를 프레임 안에 맞춰주세요</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>
              {activeTab === 'barcode' ? '제품 바코드를 스캔해주세요' : '성분표가 잘 보이도록 촬영해주세요'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>자동으로 분석됩니다</p>
          </div>
        </div>
      </div>

      <div style={{
        padding: '20px 0 48px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      }}>
        <button onClick={() => alert('갤러리에서 사진을 선택합니다')}
          style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image size={22} color="#fff" />
        </button>
        <button onClick={handleShutter} disabled={scanning}
          style={{
            width: 76, height: 76, borderRadius: '50%',
            background: scanning ? '#CA8A04' : '#F5C518',
            border: '4px solid rgba(255,255,255,0.4)',
            cursor: scanning ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245,197,24,0.4)',
          }}
        >
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
        </button>
        <div style={{ width: 52, height: 52 }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
