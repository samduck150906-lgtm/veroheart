import { Helmet } from 'react-helmet-async';
import Analyzer from '../components/Analyzer';

/**
 * 스캐너 OCR 결과 화면.
 * Scanner가 이미지에서 추출한 전성분 텍스트(sessionStorage: pendingIngredientText)를
 * Analyzer가 자동으로 불러와 채운다. 사용자는 OCR 결과를 검토·수정한 뒤 분석한다.
 */
export default function ScanResult() {
  return (
    <div style={{ padding: '16px 16px 96px' }}>
      <Helmet>
        <title>스캔 성분 분석 | 베로로</title>
        <meta name="description" content="촬영한 사료 성분표를 OCR로 인식해 분석합니다." />
      </Helmet>
      <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 4 }}>
        촬영한 성분표를 글자로 인식했어요. <strong>인식 결과를 확인·수정</strong>한 뒤 분석하기를 눌러주세요.
      </p>
      <Analyzer initialMode="text" />
    </div>
  );
}
