import { useState } from 'react';
import type { Product, UserPetProfile } from '../types';
import {
  getDisplayGrade,
  getSafetyCounts,
  GRADE_META,
  type DisplayGradeInfo,
} from '../utils/productGrade';
import { getRecommendationBreakdown } from '../utils/score';

interface GradeBadgeProps {
  product: Product;
  profile?: UserPetProfile | null;
  /** 맞춤 궁합 등급으로 표시할지 (false면 성분 안전도 기준) */
  withProfile?: boolean;
  size?: 'sm' | 'md';
  /** 탭 시 "왜 이 등급인가" 근거 시트 노출 */
  interactive?: boolean;
}

const SIZES = {
  sm: { font: 11, pad: '2px 7px', radius: 6 },
  md: { font: 12, pad: '3px 9px', radius: 7 },
};

export default function GradeBadge({
  product,
  profile,
  withProfile = false,
  size = 'sm',
  interactive = true,
}: GradeBadgeProps) {
  const [open, setOpen] = useState(false);
  const info = getDisplayGrade(product, profile, withProfile);
  const meta = GRADE_META[info.grade];
  const s = SIZES[size];

  return (
    <>
      <span
        role={interactive ? 'button' : undefined}
        onClick={
          interactive
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(true);
              }
            : undefined
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          background: meta.bg,
          color: meta.color,
          fontWeight: 800,
          fontSize: s.font,
          borderRadius: s.radius,
          padding: s.pad,
          lineHeight: 1.2,
          cursor: interactive ? 'pointer' : 'default',
          whiteSpace: 'nowrap',
        }}
      >
        {info.label}
        {interactive && (
          <span style={{ fontSize: s.font - 1, opacity: 0.7, fontWeight: 700 }}>ⓘ</span>
        )}
      </span>

      {open && (
        <GradeRationaleSheet
          product={product}
          profile={profile}
          withProfile={withProfile}
          info={info}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface SheetProps {
  product: Product;
  profile?: UserPetProfile | null;
  withProfile: boolean;
  info: DisplayGradeInfo;
  onClose: () => void;
}

function GradeRationaleSheet({ product, profile, withProfile, info, onClose }: SheetProps) {
  const meta = GRADE_META[info.grade];
  const counts = getSafetyCounts(product);
  const breakdown =
    info.basis === 'compatibility' && profile
      ? getRecommendationBreakdown(product, profile)
      : null;

  const hasGA = Boolean(
    product.guaranteedAnalysis?.crudeProtein != null && product.guaranteedAnalysis?.crudeFat != null,
  );

  const basisTitle =
    info.basis === 'compatibility'
      ? `${profile?.name ?? '우리 아이'} 맞춤 궁합 기준`
      : info.basis === 'safety'
        ? '성분 안전도 기준'
        : '아직 분석 전이에요';

  const reasonRows: { text: string; tone: 'good' | 'bad' | 'neutral' }[] = [];

  if (info.basis === 'pending') {
    reasonRows.push({
      text: '아직 성분 분석이 완료되지 않았어요. 분석이 끝나면 등급을 알려드릴게요.',
      tone: 'neutral',
    });
  } else {
    // 성분 안전도 (모든 등급 공통 근거)
    if (counts.danger > 0) {
      reasonRows.push({ text: `위험 성분 ${counts.danger}개 포함`, tone: 'bad' });
    } else if (counts.caution > 0) {
      reasonRows.push({ text: `주의 성분 ${counts.caution}개 포함`, tone: 'neutral' });
    } else {
      reasonRows.push({ text: '위험·주의 성분이 거의 없음', tone: 'good' });
    }

    // 알러지 (프로필 기반)
    if (breakdown && breakdown.allergyHits.length > 0) {
      reasonRows.push({ text: `회피 성분 ${breakdown.allergyHits.join(', ')} 포함`, tone: 'bad' });
    } else if (breakdown && profile?.allergies?.length) {
      reasonRows.push({ text: '등록한 알러지 성분 없음', tone: 'good' });
    }

    // 건강 고민 연관 (프로필 기반)
    if (breakdown && breakdown.matchedConcerns.length > 0) {
      reasonRows.push({
        text: `${breakdown.matchedConcerns.join(', ')} 고민과 연관된 성분 포함`,
        tone: 'good',
      });
    }

    // AAFCO 영양 기준
    if (hasGA && breakdown) {
      reasonRows.push({
        text:
          breakdown.nutrition >= 8
            ? 'AAFCO 영양 기준 충족'
            : breakdown.nutrition >= 5
              ? 'AAFCO 영양 기준 일부 충족'
              : 'AAFCO 영양 기준 미달 항목 있음',
        tone: breakdown.nutrition >= 8 ? 'good' : breakdown.nutrition >= 5 ? 'neutral' : 'bad',
      });
    } else if (hasGA) {
      reasonRows.push({ text: 'AAFCO 영양 기준(단백질·지방) 정보 제공', tone: 'neutral' });
    }

    // 검수 상태
    if (product.verificationStatus === 'verified') {
      reasonRows.push({ text: '운영 검수 완료된 데이터', tone: 'good' });
    }
  }

  const toneColor = (tone: 'good' | 'bad' | 'neutral') =>
    tone === 'good' ? 'var(--safe)' : tone === 'bad' ? 'var(--danger)' : 'var(--ink-faint)';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: '22px 22px 0 0',
          padding: '8px 20px 28px',
          maxHeight: '82vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 99,
            background: 'var(--hairline-strong)',
            margin: '8px auto 18px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 40,
              height: 40,
              padding: '0 10px',
              borderRadius: 12,
              background: meta.bg,
              color: meta.color,
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            {info.basis === 'pending' ? '분석 중' : meta.letter}
          </span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {info.basis === 'pending' ? '분석 중' : `${info.label}`}
              {info.score != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-faint)', marginLeft: 6 }}>
                  궁합 {info.score}점
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-faint)', marginTop: 1 }}>
              {basisTitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {reasonRows.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '11px 13px',
                borderRadius: 12,
                background: 'var(--fill)',
              }}
            >
              <span style={{ color: toneColor(r.tone), fontWeight: 900, fontSize: 13, lineHeight: 1.5 }}>
                {r.tone === 'good' ? '✓' : r.tone === 'bad' ? '!' : '·'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                {r.text}
              </span>
            </div>
          ))}
        </div>

        {info.basis === 'safety' && (
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 500, lineHeight: 1.6, marginTop: 14 }}>
            반려동물을 등록하면 알러지·나이·체중을 반영한 <b>맞춤 궁합 등급</b>으로 더 정확하게 볼 수 있어요.
          </p>
        )}

        <p style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 500, lineHeight: 1.6, marginTop: 12 }}>
          등급은 성분 정보(위험·주의 성분, AAFCO 영양 기준 등)를 바탕으로 한 참고용 지표예요. 수의학적 진단이나 처방을 대신하지 않아요.
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '15px',
            borderRadius: 14,
            background: 'var(--brand)',
            color: 'var(--ink-on-brand)',
            border: 'none',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}
