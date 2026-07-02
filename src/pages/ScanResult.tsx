import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine } from 'lucide-react';
import Analyzer from '../components/Analyzer';

/**
 * ScanResult — 스캐너(성분표 OCR)에서 넘어온 텍스트로 분석을 시작하는 화면.
 * OCR 텍스트는 navigation state(ingredientText)로 전달되어 Analyzer에 프리필된다.
 */
export default function ScanResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const ingredientText: string = location.state?.ingredientText ?? '';

  return (
    <div style={{ padding: '0 16px 96px' }}>
      <Helmet>
        <title>성분표 스캔 분석 | 베로로</title>
        <meta name="description" content="촬영한 사료 성분표를 OCR로 인식해 분석합니다." />
      </Helmet>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 12px' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="뒤로"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--text-dark)' }}
        >
          <ArrowLeft size={22} />
        </button>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 800, color: 'var(--text-dark)' }}>
          <ScanLine size={18} /> 성분표 스캔 분석
        </span>
      </header>

      <div
        style={{
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 14,
          fontSize: 12.5,
          fontWeight: 600,
          lineHeight: 1.5,
          background: ingredientText ? '#E7F8F0' : 'var(--secondary)',
          color: ingredientText ? '#15803D' : 'var(--text-muted)',
        }}
      >
        {ingredientText
          ? '성분표를 인식했어요. 내용을 확인·수정한 뒤 분석을 눌러 주세요.'
          : '인식된 성분 텍스트가 없어요. 아래에 성분을 직접 붙여넣어 분석할 수 있어요.'}
      </div>

      <Analyzer initialText={ingredientText} />
    </div>
  );
}
