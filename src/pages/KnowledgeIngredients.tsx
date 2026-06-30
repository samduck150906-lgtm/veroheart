// @ts-nocheck
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const GRADE_INFO = [
  {
    grade: '최고',
    color: '#15B36B',
    bg: '#ECFDF5',
    border: '#86EFAC',
    badge: '★★★★',
    title: '신선 명시 원료',
    subtitle: '출처·부위가 명확한 신선 동물성 원료',
    examples: ['닭고기 (Chicken)', '연어 (Salmon)', '소고기 (Beef)', '사슴고기', '오리고기'],
    description: '라벨에 동물 종과 부위가 명확히 표기된 신선 원료입니다. 가공을 최소화하여 원래 영양소를 잘 보존합니다.',
    principle: '출처 명시 + 신선 = 최고 등급',
  },
  {
    grade: '양호',
    color: '#3182F6',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badge: '★★★☆',
    title: '명시된 가공 원료',
    subtitle: '동물 출처가 명확한 건조·가공 원료',
    examples: ['계육분 (Chicken Meal)', '어분 (Fish Meal)', '연어오일', '글루코사민', '타우린'],
    description: '수분을 제거하거나 가공했지만 동물 출처가 명확히 표기된 원료입니다. 단백질 함량이 높고 신뢰할 수 있어요.',
    principle: '출처 명시 + 가공 = 양호 등급',
  },
  {
    grade: '주의',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badge: '★★☆☆',
    title: '일반·비명시 원료',
    subtitle: '출처가 불분명하거나 일반 명칭 원료',
    examples: ['완두', '렌틸콩', '옥수수', '타피오카', '밀'],
    description: '출처 동물이나 부위가 명확하지 않거나, 식물성 탄수화물·두류 원료입니다. 단백질 수치 보완용으로 쓰이기도 해요.',
    principle: '출처 불명시 또는 식물성 = 주의 등급',
  },
  {
    grade: '경고',
    color: '#F04452',
    bg: '#FFF1F2',
    border: '#FECDD3',
    badge: '★☆☆☆',
    title: '부산물·저품질 원료',
    subtitle: '출처·부위 불명의 부산물 또는 위험 원료',
    examples: ['가금류부산물 (Poultry By-Product Meal)', '가금육분 (Poultry Meal)', '동물성 단백질', '육골분'],
    description: '동물 종이나 부위가 표시되지 않은 부산물이나 저품질 가공 원료입니다. 출처 불명으로 품질 변동이 클 수 있어요.',
    principle: '출처 불명 부산물 = 경고 등급',
  },
];

const SIGNAL_INFO = [
  { level: '주요 가점', color: '#15B36B', bg: '#ECFDF5', text: '#166534', description: '신선 명시 동물성 단백질 (1순위 원료에 이상적)' },
  { level: '보조 가점', color: '#F59E0B', bg: '#FFFBEB', text: '#92400E', description: '명시된 가공 단백, 기능성 영양소, 오메가3 오일' },
  { level: '대체 단백질', color: '#3182F6', bg: '#EFF6FF', text: '#1D4ED8', description: '통 식물성 단백질 (완두·렌틸 등 비가공 두류)' },
  { level: '중립', color: '#8B95A1', bg: '#F8FAFC', text: '#475569', description: '비타민·미네랄·천연 보존제·물 (긍정도 부정도 아님)' },
  { level: '주의', color: '#F97316', bg: '#FFF7ED', text: '#9A3412', description: '가공 식물단백 (단백 수치 인플레이션 가능), 무명 원료' },
  { level: '강한 주의', color: '#F04452', bg: '#FFF1F2', text: '#BE123C', description: '출처 불명 부산물, 독성·위험 성분' },
];

export default function KnowledgeIngredients() {
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: '48px' }}>
      <Helmet>
        <title>원료 품질 등급 기준 | 베로로</title>
        <meta name="description" content="베로로의 원료 분류 기준 — 4단계 품질 등급과 단백질 인플레이션 감지 로직 설명" />
      </Helmet>

      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '20px', padding: '4px 0' }}
      >
        <ArrowLeft size={20} /> 돌아가기
      </button>

      <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginBottom: '6px', letterSpacing: '-0.02em' }}>
        원료 품질 등급 기준
      </h1>
      <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600, marginBottom: '28px', lineHeight: 1.6 }}>
        베로로가 원료(Ingredient)를 평가하는 핵심 기준은 <strong>명시성(출처가 분명한가)</strong>입니다.
        같은 닭이라도 Chicken은 명시 원료, Poultry Meal은 출처 불명으로 등급이 달라집니다.
      </p>

      {/* 4단계 품질 등급 */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>4단계 품질 등급</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {GRADE_INFO.map(g => (
            <div
              key={g.grade}
              style={{
                padding: '18px 20px',
                borderRadius: '18px',
                background: g.bg,
                border: `1.5px solid ${g.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '99px',
                    background: g.color,
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}>
                    {g.grade}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{g.title}</span>
                </div>
                <span style={{ fontSize: '14px', color: g.color, fontWeight: 700 }}>{g.badge}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', fontWeight: 600, marginBottom: '10px' }}>{g.subtitle}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {g.examples.map(ex => (
                  <span
                    key={ex}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.7)',
                      border: `1px solid ${g.border}`,
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#374151',
                    }}
                  >
                    {ex}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '6px' }}>{g.description}</p>
              <div style={{ fontSize: '12px', fontWeight: 700, color: g.color }}>원칙: {g.principle}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6단계 신호 색상 */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>전성분 6단계 신호 색상</h2>
        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '14px' }}>
          제품 상세페이지의 전성분 목록에서 각 원료 옆 점 색상이 이 기준을 따릅니다.
        </p>
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #F2F4F6' }}>
          {SIGNAL_INFO.map((s, idx) => (
            <div
              key={s.level}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                background: idx % 2 === 0 ? '#fff' : '#F9FAFB',
                borderBottom: idx < SIGNAL_INFO.length - 1 ? '1px solid #F2F4F6' : 'none',
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '99px',
                    background: s.bg,
                    color: s.text,
                    fontSize: '12px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {s.level}
                </span>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>{s.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 단백질 인플레이션 */}
      <section style={{ marginBottom: '36px' }}>
        <div
          style={{
            padding: '20px',
            borderRadius: '18px',
            background: '#FFFBEB',
            border: '1.5px solid #FDE68A',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#92400E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} /> 단백질 인플레이션 감지 로직
          </h2>
          <p style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.65, marginBottom: '10px' }}>
            식물성 원물(완두, 렌틸)과 <strong>가공 식물성 단백(완두 단백, 옥수수 글루텐)</strong>을 다른 신호로 취급합니다.
            원료 5~8번째에 가공 식물성 단백이 있으면 <strong>조단백 수치 부풀리기</strong>로 별도 감지됩니다.
          </p>
          <div style={{ fontSize: '12px', color: '#92400E', fontWeight: 700, background: 'rgba(255,255,255,0.6)', padding: '10px 12px', borderRadius: '10px' }}>
            ⚠️ 이 경우 "주의" 신호와 함께 경고 배너가 표시됩니다.
          </div>
        </div>
      </section>

      {/* DCM 위험 패턴 */}
      <section style={{ marginBottom: '36px' }}>
        <div
          style={{
            padding: '20px',
            borderRadius: '18px',
            background: '#FFF1F2',
            border: '1.5px solid #FECDD3',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#BE123C', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} /> DCM 위험 패턴 감지
          </h2>
          <p style={{ fontSize: '13px', color: '#9F1239', lineHeight: 1.65 }}>
            두류 단백(완두, 렌틸, 병아리콩 등)이 <strong>상위 5위 안에 2개 이상</strong> 포함된 경우
            확장성 심근병증(DCM) 연관 위험 패턴으로 표시됩니다.
            이는 FDA가 연구 중인 그레인프리·두류 중심 사료와 DCM의 상관관계에 기반합니다.
          </p>
        </div>
      </section>

      {/* 원료 등급 점수 */}
      <section>
        <div style={{ padding: '20px', borderRadius: '18px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>6개 기준 원료 등급 (n/6)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              '제1원료가 동물성 신선육 (최고 등급)',
              '상위 3개 원료에 부산물 없음',
              '식물성 가공 단백질 없음',
              'DCM 위험 패턴 없음',
              '전체 원료 중 명시 동물성 비율 15% 이상',
              '제1원료가 최고 또는 양호 등급',
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#3182F6', minWidth: '20px' }}>{i + 1}.</span>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600, lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#8B95A1', fontWeight: 600, marginTop: '12px' }}>
            충족 기준 수: A+(6/6) · A(5/6) · B+(4/6) · B(3/6) · C(2/6) · 주의(1/6 이하)
          </p>
        </div>
      </section>
    </div>
  );
}
