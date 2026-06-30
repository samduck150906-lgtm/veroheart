import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, HelpCircle, XCircle, Zap } from 'lucide-react';
import type { Product, UserPetProfile } from '../types';
import { calculateBreedScore } from '../analysis/breedScorer';
import type { BreedConditionResult, BreedRuleResult, RuleStatus, ConditionStatus } from '../analysis/breedScorer';

interface Props {
  product: Product;
  profile: UserPetProfile;
}

const CONDITION_META: Record<string, { emoji: string; label: string; accentColor: string; bgColor: string }> = {
  '관절': { emoji: '🦴', label: '관절', accentColor: '#3B82F6', bgColor: '#EFF6FF' },
  '심장': { emoji: '❤️', label: '심장', accentColor: '#F04452', bgColor: '#FFF1F2' },
  '체중관리': { emoji: '⚖️', label: '체중관리', accentColor: '#8B5CF6', bgColor: '#F5F3FF' },
  '피부': { emoji: '✨', label: '피부·코트', accentColor: '#F59E0B', bgColor: '#FFFBEB' },
};

function ruleStatusIcon(status: RuleStatus) {
  if (status === 'pass') return <CheckCircle size={15} color="#16A34A" />;
  if (status === 'fail') return <XCircle size={15} color="#DC2626" />;
  return <HelpCircle size={15} color="#8B95A1" />;
}

function conditionStatusBadge(status: ConditionStatus) {
  const map: Record<ConditionStatus, { label: string; bg: string; color: string }> = {
    pass:       { label: '통과', bg: '#DCFCE7', color: '#166534' },
    fail:       { label: '감점', bg: '#FEE2E2', color: '#991B1B' },
    partial:    { label: '부분 충돌', bg: '#FEF3C7', color: '#92400E' },
    unknown:    { label: '확인 불가', bg: '#F2F4F6', color: '#4B5563' },
    bonus_only: { label: '보조 확인', bg: '#FEF9C3', color: '#713F12' },
  };
  const m = map[status];
  return (
    <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11.5px', fontWeight: 700, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function RuleRow({ rule }: { rule: BreedRuleResult }) {
  const confidenceLabel = rule.confidence === 'high' ? '고신뢰' : rule.confidence === 'medium' ? '중신뢰' : '저신뢰';
  const confidenceColor = rule.confidence === 'high' ? '#6366F1' : rule.confidence === 'medium' ? '#F59E0B' : '#8B95A1';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {ruleStatusIcon(rule.status)}
        <div>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1F2937' }}>{rule.label}</span>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: confidenceColor, marginLeft: '6px', padding: '1px 5px', background: `${confidenceColor}18`, borderRadius: '4px' }}>
            {confidenceLabel}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: rule.status === 'pass' ? '#16A34A' : rule.status === 'fail' ? '#DC2626' : '#6B7684' }}>
          {rule.actualDisplay}
        </div>
        <div style={{ fontSize: '11px', color: '#8B95A1', fontWeight: 500 }}>
          기준 {rule.thresholdDisplay}
        </div>
      </div>
    </div>
  );
}

function ConditionCard({ result }: { result: BreedConditionResult }) {
  const [open, setOpen] = useState(result.status === 'fail' || result.status === 'partial');
  const meta = CONDITION_META[result.condition] ?? { emoji: '•', label: result.condition, accentColor: '#6B7684', bgColor: '#F9FAFB' };

  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1.5px solid ${meta.accentColor}22`, marginBottom: '10px' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: meta.bgColor, border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{meta.emoji}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#111827' }}>{meta.label}</div>
            <div style={{ fontSize: '11.5px', color: '#6B7684', fontWeight: 500, marginTop: '1px' }}>{result.note}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {conditionStatusBadge(result.status)}
          {open ? <ChevronUp size={16} color="#8B95A1" /> : <ChevronDown size={16} color="#8B95A1" />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '12px 16px', background: '#FFFFFF' }}>
          {result.status === 'bonus_only' ? (
            <div>
              <p style={{ fontSize: '12.5px', color: '#6B7684', fontWeight: 500, marginBottom: '8px', lineHeight: 1.6 }}>
                정량 컷오프 없이 오메가3·비타민A·E 성분 존재 여부를 보조 후보로만 확인합니다.
              </p>
              {result.skinBonusIngredients && result.skinBonusIngredients.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.skinBonusIngredients.map((kw) => (
                    <span key={kw} style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#FEF9C3', color: '#713F12' }}>
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: '#8B95A1', fontWeight: 500 }}>보조 성분 미확인</p>
              )}
            </div>
          ) : result.ruleResults.length > 0 ? (
            <div>
              {result.ruleResults.map((rule) => (
                <RuleRow key={rule.ruleId} rule={rule} />
              ))}
              {result.status === 'unknown' && (
                <p style={{ fontSize: '11.5px', color: '#8B95A1', fontWeight: 500, marginTop: '10px', lineHeight: 1.6, padding: '8px', background: '#F9FAFB', borderRadius: '8px' }}>
                  미공개 데이터는 직접 감점 없이 가점 박탈로 처리됩니다. 심장 취약 견종일수록 영양 공개도가 낮은 제품이 불리합니다.
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function BreedNutritionPanel({ product, profile }: Props) {
  const result = calculateBreedScore(product, profile);
  if (!result) return null;

  const netPositive = result.netScore > 0;
  const netNeutral = result.netScore === 0;

  return (
    <div
      style={{
        borderRadius: '22px',
        border: '1.5px solid #E5E8EB',
        background: '#FAFAFA',
        marginBottom: '24px',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '18px 20px 14px',
          background: 'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            🐕 {result.breed} 맞춤 영양 분석
          </div>
          <div
            style={{
              padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 800,
              background: netPositive ? '#22C55E' : netNeutral ? '#6B7684' : '#F04452',
              color: '#fff',
            }}
          >
            {netPositive ? `+${result.netScore}점` : `${result.netScore}점`}
          </div>
        </div>
        {result.prescription && (
          <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
            기본 처방: {result.prescription}
          </p>
        )}
      </div>

      {/* 질환별 카드 */}
      <div style={{ padding: '16px 16px 6px' }}>
        {result.conditionResults.map((cr) => (
          <ConditionCard key={cr.condition} result={cr} />
        ))}
      </div>

      {/* 충돌 감지 */}
      {result.conflictNote && (
        <div
          style={{
            margin: '0 16px 12px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#FFFBEB',
            border: '1.5px solid #FDE68A',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
              규칙 충돌 감지
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#92400E', lineHeight: 1.6, fontWeight: 500 }}>
              {result.conflictNote}
            </p>
          </div>
        </div>
      )}

      {/* 활동량 보정 */}
      {result.activityModifier && (
        <div
          style={{
            margin: '0 16px 16px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#EFF6FF',
            border: '1.5px solid #BFDBFE',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <Zap size={15} color="#2563EB" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E40AF', marginBottom: '4px' }}>
              활동량 보정
              <span style={{
                marginLeft: '6px', padding: '1px 7px', borderRadius: '4px', fontSize: '10.5px',
                background: result.activityLevel === 'high' ? '#DCFCE7' : result.activityLevel === 'low' ? '#FEE2E2' : '#F2F4F6',
                color: result.activityLevel === 'high' ? '#166534' : result.activityLevel === 'low' ? '#991B1B' : '#4B5563',
              }}>
                {result.activityLevel === 'high' ? '고활동' : result.activityLevel === 'low' ? '저활동' : '보통'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#1E40AF', lineHeight: 1.6, fontWeight: 500 }}>
              {result.activityModifier}
            </p>
          </div>
        </div>
      )}

      {/* 푸터 안내 */}
      <div style={{ padding: '0 16px 14px' }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#8B95A1', fontWeight: 500, lineHeight: 1.5 }}>
          견종 기반 영양 규칙 엔진이 1000kcal 기준으로 환산한 결과입니다.
          미공개 항목은 직접 감점 없이 가점 박탈로 처리됩니다.
        </p>
      </div>
    </div>
  );
}
