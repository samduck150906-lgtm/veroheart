import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VIRAL_TEST_CAMPAIGN, KAKAO_SHARE_MESSAGES } from '../copy/marketing';
import { isKakaoShareConfigured, kakaoShareTextWithLink } from '../lib/kakaoShare';
import { notify } from '../store/useNotification';

type AxisKey = 'S' | 'A' | 'V' | 'F';
type Scores = Record<AxisKey, number>;

const RESULT_ORDER = VIRAL_TEST_CAMPAIGN.resultTypes.map((r) => r.type);

const SCORE_TABLE: Record<string, Record<number, Partial<Scores>>> = {
  q1: { 0: { S: 2 }, 1: { V: 1 }, 2: { V: 2 }, 3: { A: 2 } },
  q2: { 0: { S: 2 }, 1: { A: 1 }, 2: { F: 1 }, 3: { A: 2 } },
  q3: { 0: { A: 1 }, 1: { V: 1 }, 2: { F: 2 }, 3: { S: 1 } },
  q4: { 0: { S: 2 }, 1: { A: 1 }, 2: { V: 1 }, 3: { F: 1 } },
  q5: { 0: { A: 2 }, 1: { A: 1, F: 1 }, 2: { V: 1 }, 3: { A: 2, V: 1 } },
  q6: { 0: { S: 1 }, 1: { V: 1 }, 2: { V: 2, A: 1 }, 3: { F: 1 } },
  q7: { 0: { S: 2 }, 1: { V: 1 }, 2: { V: 2 }, 3: { A: 1 } },
  q8: { 0: { S: 2 }, 1: { V: 1, A: 1 }, 2: { A: 2 }, 3: { F: 2 } },
};

function addScores(base: Scores, extra: Partial<Scores>): Scores {
  return {
    S: base.S + (extra.S ?? 0),
    A: base.A + (extra.A ?? 0),
    V: base.V + (extra.V ?? 0),
    F: base.F + (extra.F ?? 0),
  };
}

function computeResultType(scores: Scores, answers: number[]): string {
  const rankedAxes = (Object.keys(scores) as AxisKey[]).sort((a, b) => scores[b] - scores[a]);
  const top = rankedAxes[0];
  const second = rankedAxes[1];

  if (top === 'A' && scores.V <= 4) return '든든한 안정형 국밥 강아지';
  if (top === 'V' && scores.A >= 4) return '예민보스 깍쟁이 고양이';
  if (top === 'S') return '사교계 인싸 댕냥이';
  if (top === 'V' && scores.S <= 3) return '은둔형 철학자 냥/멍';
  if (top === 'F' && scores.S >= 4) return '보상 헌터 간식 러버';
  if (top === 'F' && Math.abs(scores[top] - scores[second]) <= 1) return '기분파 미스터리 박스';

  // 동점 시 최근 문항 기준 보정
  const q7 = answers[6];
  const q8 = answers[7];
  if (scores.A === scores.S) {
    if (q7 === 0 || q8 === 0) return '사교계 인싸 댕냥이';
    return '든든한 안정형 국밥 강아지';
  }
  if (scores.V === scores.F) {
    if (answers[2] === 2) return '보상 헌터 간식 러버';
    return '예민보스 깍쟁이 고양이';
  }

  return RESULT_ORDER[0];
}

export default function Test() {
  const navigate = useNavigate();
  const [kakaoSharing, setKakaoSharing] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(
    Array.from({ length: VIRAL_TEST_CAMPAIGN.questions.length }, () => -1)
  );

  const isFinished = step >= VIRAL_TEST_CAMPAIGN.questions.length;

  const result = useMemo(() => {
    if (!isFinished) return null;
    const initial: Scores = { S: 0, A: 0, V: 0, F: 0 };
    const totals = VIRAL_TEST_CAMPAIGN.questions.reduce((acc, q, idx) => {
      const picked = answers[idx];
      if (picked < 0) return acc;
      const rule = SCORE_TABLE[q.id]?.[picked] ?? {};
      return addScores(acc, rule);
    }, initial);
    const type = computeResultType(totals, answers);
    const detail = VIRAL_TEST_CAMPAIGN.resultTypes.find((item) => item.type === type) ?? VIRAL_TEST_CAMPAIGN.resultTypes[0];
    return { totals, detail };
  }, [answers, isFinished]);

  const currentQuestion = VIRAL_TEST_CAMPAIGN.questions[step];
  const progress = Math.min(100, Math.round((step / VIRAL_TEST_CAMPAIGN.questions.length) * 100));

  const handlePick = (choice: number) => {
    const next = [...answers];
    next[step] = choice;
    setAnswers(next);
    setStep((prev) => prev + 1);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('공유 문구를 복사했어요.');
    } catch {
      alert('복사에 실패했어요. 다시 시도해 주세요.');
    }
  };

  const shareText = result
    ? `우리 아이 결과는 "${result.detail.type}"! ${result.detail.summary} 추천: ${result.detail.category}`
    : KAKAO_SHARE_MESSAGES[0];

  const testPageUrl = useMemo(() => `${window.location.origin}/event/personality-quiz`, []);

  const handleKakaoShare = async () => {
    if (!isKakaoShareConfigured()) {
      notify.warning('카카오 공유를 쓰려면 .env에 VITE_KAKAO_JAVASCRIPT_KEY를 설정해 주세요. 지금은 복사 버튼을 이용해 주세요.');
      return;
    }
    setKakaoSharing(true);
    try {
      await kakaoShareTextWithLink({
        text: shareText,
        linkUrl: testPageUrl,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'KAKAO_KEY_MISSING') {
        notify.warning('카카오 JavaScript 키가 없습니다. 배포 환경 변수를 확인해 주세요.');
      } else {
        notify.error('카카오톡 공유를 열지 못했어요. 잠시 후 다시 시도하거나 복사를 이용해 주세요.');
      }
    } finally {
      setKakaoSharing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '120px' }}>
      <section style={{ marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'none', color: '#6B7280', fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          ← 이전으로
        </button>
      </section>

      <section style={{ marginBottom: '16px', padding: '18px', borderRadius: '18px', background: '#fff', border: '1px solid #F3F4F6' }}>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.05em' }}>VIRAL TEST</p>
        <h1 style={{ margin: '6px 0 8px', fontSize: '22px', lineHeight: 1.35 }}>{VIRAL_TEST_CAMPAIGN.title}</h1>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '13px', fontWeight: 600 }}>{VIRAL_TEST_CAMPAIGN.subtitle}</p>
      </section>

      {!isFinished && currentQuestion && (
        <section style={{ background: '#fff', borderRadius: '18px', border: '1px solid #F3F4F6', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>
              {step + 1} / {VIRAL_TEST_CAMPAIGN.questions.length}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#F3F4F6', marginBottom: '16px' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #FB923C 0%, #F97316 100%)',
              }}
            />
          </div>
          <h2 style={{ margin: '0 0 14px', fontSize: '18px', lineHeight: 1.45 }}>{currentQuestion.prompt}</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {currentQuestion.options.map((option, idx) => (
              <button
                key={option}
                type="button"
                onClick={() => handlePick(idx)}
                style={{
                  textAlign: 'left',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '13px 12px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      )}

      {isFinished && result && (
        <section style={{ display: 'grid', gap: '12px' }}>
          <div
            style={{
              borderRadius: '18px',
              border: '1px solid #FED7AA',
              background: 'linear-gradient(155deg, #FFF7ED 0%, #FFFFFF 100%)',
              padding: '18px',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: '#9A3412', fontWeight: 800 }}>RESULT CARD</p>
            <h2 style={{ margin: '8px 0 10px', fontSize: '24px', lineHeight: 1.35, color: '#7C2D12' }}>{result.detail.type}</h2>
            <p style={{ margin: '0 0 10px', fontSize: '14px', lineHeight: 1.6, color: '#9A3412' }}>{result.detail.summary}</p>
            <div style={{ background: '#fff', border: '1px dashed #FDBA74', borderRadius: '10px', padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>찰떡궁합 추천 카테고리</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#111827', fontWeight: 800 }}>{result.detail.category}</p>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: '16px', padding: '14px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#374151', fontWeight: 800 }}>공유 문구</p>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6B7280', lineHeight: 1.5 }}>{shareText}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleCopy(shareText)}
                style={{ borderRadius: '10px', height: '40px', fontSize: '13px', fontWeight: 800 }}
              >
                공유 문구 복사
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/search')}
                style={{ borderRadius: '10px', height: '40px', fontSize: '13px', fontWeight: 800 }}
              >
                추천 상품 보러가기
              </button>
            </div>
            <button
              type="button"
              disabled={kakaoSharing}
              onClick={() => void handleKakaoShare()}
              style={{
                marginTop: '8px',
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 800,
                border: 'none',
                cursor: kakaoSharing ? 'wait' : 'pointer',
                opacity: kakaoSharing ? 0.75 : 1,
                background: '#FEE500',
                color: '#191919',
              }}
            >
              {kakaoSharing ? '카카오톡 연결 중…' : '카카오톡으로 공유'}
            </button>
            {!isKakaoShareConfigured() && (
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#9CA3AF', lineHeight: 1.45 }}>
                카카오 원클릭 공유는 VITE_KAKAO_JAVASCRIPT_KEY 설정 후 사용할 수 있어요.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1, borderRadius: '12px' }}
              onClick={() => {
                setAnswers(Array.from({ length: VIRAL_TEST_CAMPAIGN.questions.length }, () => -1));
                setStep(0);
              }}
            >
              다시 테스트
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1, borderRadius: '12px' }} onClick={() => navigate('/')}>
              홈으로
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
