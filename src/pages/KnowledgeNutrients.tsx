// @ts-nocheck
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PURPOSE_STYLE } from '../analysis/nutrientClassification';

const HEALTH_PURPOSES = [
  {
    purpose: '관절 관리',
    ingredients: ['초록입홍합', '글루코사민', '콘드로이틴', 'MSM'],
    nrcBasis: 'NRC 2006 관절 건강 지표',
    description: '연골 보호와 관절 염증 완화를 목적으로 하는 성분들입니다.',
  },
  {
    purpose: '장 건강',
    ingredients: ['프로바이오틱스', '유산균', '프리바이오틱스', '프락토올리고당'],
    nrcBasis: 'NRC 2006 소화기 건강 지표',
    description: '장내 미생물 균형 유지와 소화 기능 지원 성분들입니다.',
  },
  {
    purpose: '피부·모질',
    ingredients: ['오메가3', '오메가6', 'EPA', 'DHA', '아연', '비타민E'],
    nrcBasis: 'NRC 2006 피부 및 모질 지표',
    description: '피부 장벽 기능과 모질 윤기를 지원하는 지방산·미네랄입니다.',
  },
  {
    purpose: '심장 관리',
    ingredients: ['타우린', 'L-카르니틴', 'EPA', 'DHA'],
    nrcBasis: 'NRC 2006 심혈관 건강 지표',
    description: '심근 기능과 혈액 순환을 지원하는 성분들입니다. 고양이에게 타우린은 필수 영양소입니다.',
  },
  {
    purpose: '면역 강화',
    ingredients: ['비타민C', '비타민E', '아연', '셀레늄'],
    nrcBasis: 'NRC 2006 면역 기능 지표',
    description: '항산화 및 면역 체계 활성화를 지원하는 미량 영양소들입니다.',
  },
  {
    purpose: '눈 건강',
    ingredients: ['타우린', '루테인', '제아잔틴'],
    nrcBasis: 'NRC 2006 시각 건강 지표',
    description: '망막 기능과 시력 유지에 중요한 성분들입니다.',
  },
  {
    purpose: '뼈·치아',
    ingredients: ['칼슘', '인', '비타민D'],
    nrcBasis: 'NRC 2006 골격 건강 지표',
    description: '뼈 밀도와 치아 강도를 유지하는 필수 미네랄입니다.',
  },
  {
    purpose: '항산화',
    ingredients: ['비타민E', '비타민C', '셀레늄', '루테인'],
    nrcBasis: 'NRC 2006 산화 스트레스 지표',
    description: '활성 산소로 인한 세포 손상을 억제하는 항산화 성분들입니다.',
  },
];

const DISCLOSURE_INFO = [
  {
    level: '완전 공개',
    color: '#15B36B',
    bg: '#ECFDF5',
    border: '#86EFAC',
    count: '7/7',
    description: '조단백·조지방·조섬유·조회분·수분·칼슘·인 모두 표기',
    trustImpact: '신뢰도 최상 (점수 그대로 반영)',
  },
  {
    level: '부분 공개',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    count: '3~6/7',
    description: '일부 기준 영양소만 표기된 경우',
    trustImpact: '신뢰도 중간 (판단 한계 명시)',
  },
  {
    level: '미공개',
    color: '#F04452',
    bg: '#FFF1F2',
    border: '#FECDD3',
    count: '0~2/7',
    description: '영양소 표기가 거의 없는 경우',
    trustImpact: '신뢰도 하락 (ETF 등급 강등)',
  },
];

const ETF_GRADES = [
  {
    grade: 'C1',
    color: '#15B36B',
    bg: '#ECFDF5',
    label: '최고 신뢰',
    description: '공식 인증 + 완전 공개 + A/A+ 원료 등급',
  },
  {
    grade: 'C2',
    color: '#3182F6',
    bg: '#EFF6FF',
    label: '양호 신뢰',
    description: '부분 공개 이상 + B+/A 원료 등급',
  },
  {
    grade: 'C3',
    color: '#F59E0B',
    bg: '#FFFBEB',
    label: '제한 신뢰',
    description: '일부 정보 공개 / 원료 정보 제한적',
  },
  {
    grade: 'D',
    color: '#F04452',
    bg: '#FFF1F2',
    label: '신뢰 낮음',
    description: '위험 성분 포함 또는 영양 정보 미공개',
  },
];

export default function KnowledgeNutrients() {
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: '48px' }}>
      <Helmet>
        <title>기능성 성분 분류 기준 | 베로로</title>
        <meta name="description" content="베로로의 영양소/기능성 성분 분류 기준 — NRC 2006 기반 건강 목적 태깅과 공개 수준 평가" />
      </Helmet>

      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '20px', padding: '4px 0' }}
      >
        <ArrowLeft size={20} /> 돌아가기
      </button>

      <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginBottom: '6px', letterSpacing: '-0.02em' }}>
        기능성 성분 분류 기준
      </h1>
      <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600, marginBottom: '8px', lineHeight: 1.6 }}>
        베로로는 성분명 자체가 아니라 <strong>"이 성분이 어떤 건강 목적에 쓰이는가"</strong>를 기준으로 라벨링합니다.
      </p>
      <p style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, marginBottom: '28px', lineHeight: 1.5, padding: '10px 14px', background: '#F8FAFC', borderRadius: '12px' }}>
        기준: NRC(미국 국립연구위원회) 2006 표준 — 17개 기준 영양소 · 22개 건강 조건별 규칙
      </p>

      {/* 건강 목적별 분류 */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>건강 목적별 기능성 성분</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {HEALTH_PURPOSES.map(hp => {
            const style = PURPOSE_STYLE[hp.purpose as keyof typeof PURPOSE_STYLE] ?? { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB', emoji: '•' };
            return (
              <div
                key={hp.purpose}
                style={{
                  padding: '16px 18px',
                  borderRadius: '16px',
                  background: style.bg,
                  border: `1.5px solid ${style.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{style.emoji}</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: style.text }}>{hp.purpose}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {hp.ingredients.map(ing => (
                    <span
                      key={ing}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '99px',
                        background: 'rgba(255,255,255,0.8)',
                        border: `1px solid ${style.border}`,
                        fontSize: '12px',
                        fontWeight: 700,
                        color: style.text,
                      }}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#475569', fontWeight: 600, lineHeight: 1.5, marginBottom: '4px' }}>{hp.description}</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{hp.nrcBasis}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 영양 공개 수준 */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>영양 공개 수준 평가</h2>
        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '14px' }}>
          공개 여부 자체가 신뢰도 점수에 반영됩니다. 미공개 영양소는 "판단 신뢰도 하락"으로 처리됩니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DISCLOSURE_INFO.map(d => (
            <div
              key={d.level}
              style={{
                padding: '16px 18px',
                borderRadius: '14px',
                background: d.bg,
                border: `1.5px solid ${d.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: d.color }}>{d.level}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: d.color }}>{d.count}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#374151', fontWeight: 600, marginBottom: '4px' }}>{d.description}</p>
              <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>→ {d.trustImpact}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, marginTop: '10px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '10px' }}>
          7가지 기준 영양소: 조단백질 · 조지방 · 조섬유 · 조회분 · 수분 · 칼슘 · 인
        </p>
      </section>

      {/* 공개 정보 신뢰도 ETF */}
      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>공개 정보 신뢰도 ETF</h2>
        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '14px' }}>
          원료 품질, 영양 공개 수준, 공식 인증 여부를 종합한 "판단 가능성" 등급입니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {ETF_GRADES.map(g => (
            <div
              key={g.grade}
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: g.bg,
                border: `1.5px solid ${g.color}33`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 900, color: g.color, marginBottom: '4px' }}>{g.grade}등급</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>{g.label}</div>
              <p style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>{g.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
