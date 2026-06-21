// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import AnalysisResult from './AnalysisResult';

export default function ScanResult() {
  const navigate = useNavigate();
  const { products } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const messages = ['성분표 인식 중...', '데이터베이스 조회 중...', '분석 완료!'];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => {
      setMsgIdx(prev => Math.min(prev + 1, messages.length - 1));
    }, 600);
    return () => clearInterval(t);
  }, [loading]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F4EE' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🔍</div>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(245,197,24,0.3)', borderTopColor: '#F5C518', borderRadius: '50%', animation: 'spin 0.85s linear infinite', marginBottom: 20 }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>{messages[msgIdx]}</p>
        <p style={{ fontSize: 13, color: '#8B95A1', marginTop: 6 }}>AI가 성분을 분석하고 있어요</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // After loading, show the analysis result for the first available product
  return <AnalysisResult />;
}
