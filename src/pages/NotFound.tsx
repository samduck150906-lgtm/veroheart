import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { VR } from '../lib/veroroDesign';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="vr-anim-fade" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <Helmet>
        <title>페이지를 찾을 수 없어요 | 베로로</title>
        <meta name="description" content="요청하신 페이지를 찾을 수 없습니다. 베로로 홈으로 돌아가 다시 탐색해 보세요." />
      </Helmet>

      <div style={{ fontSize: '64px', fontWeight: 800, letterSpacing: '-0.06em', color: 'var(--vr-yellow)', lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ margin: '8px 0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em' }}>
        여긴 아무것도 없어
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: VR.muted, lineHeight: 1.6 }}>
        주소가 바뀌었을 수도 있어. 홈에서 다시 찾아보자.
      </p>

      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          display: 'inline-block', padding: '14px 26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
          background: 'var(--vr-inverse)', color: 'var(--vr-on-inverse)', fontSize: '14.5px', fontWeight: 800,
        }}
      >
        홈으로
      </button>
      <button
        type="button"
        onClick={() => navigate('/search')}
        style={{
          display: 'block', margin: '14px auto 0', padding: '10px 16px', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: VR.faint,
        }}
      >
        제품 검색하러 가기
      </button>
    </div>
  );
}
