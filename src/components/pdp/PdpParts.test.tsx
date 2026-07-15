import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShieldCheck } from 'lucide-react';
import {
  ScoreGauge,
  GlanceGrid,
  FitForPetCard,
  IngredientCard,
  StickyCtaBar,
  StickyScoreBar,
  VerdictCard,
  PdpSkeleton,
  AltProductCarousel,
  NutritionCard,
  ReviewSummaryCard,
  FaqAccordion,
  EmptyState,
  ErrorState,
  OfflineBanner,
  type GlanceTileData,
  type AltCardData,
  type RadarAxis,
  type QaItem,
} from './PdpParts';

/** 재설계된 PDP 파트가 예시 데이터로 올바른 콘텐츠를 렌더하는지 검증. */
describe('PDP redesign parts', () => {
  it('ScoreGauge: 점수→등급/라벨/한줄이 렌더된다', () => {
    const html = renderToStaticMarkup(<ScoreGauge score={92} oneLiner="단백질 품질이 우수합니다." />);
    expect(html).toContain('A+');
    expect(html).toContain('매우 안전');
    expect(html).toContain('단백질 품질이 우수합니다.');
    expect(html).toContain('안전점수');
  });

  it('gradeFromScore 밴드: 60점→C/확인 필요, 40점→F/비추천', () => {
    expect(renderToStaticMarkup(<ScoreGauge score={62} />)).toContain('확인 필요');
    expect(renderToStaticMarkup(<ScoreGauge score={40} />)).toContain('비추천');
  });

  it('GlanceGrid: 각 타일의 라벨/값이 렌더된다', () => {
    const tiles: GlanceTileData[] = [
      { icon: <ShieldCheck size={18} />, label: '안전도', value: '위험 성분 없음', tone: 'excellent' },
      { icon: <ShieldCheck size={18} />, label: '알레르기', value: '해당 없음', tone: 'excellent' },
    ];
    const html = renderToStaticMarkup(<GlanceGrid tiles={tiles} />);
    expect(html).toContain('안전도');
    expect(html).toContain('위험 성분 없음');
    expect(html).toContain('해당 없음');
  });

  it('FitForPetCard: 이름/퍼센트/칩/근거가 렌더된다', () => {
    const html = renderToStaticMarkup(
      <FitForPetCard petName="로니" percent={95} chips={['말티즈', '4살']} reasons={['위험/주의 성분이 거의 없음']} />
    );
    // 숫자는 count-up(초기 0→목표)으로 애니메이션되므로 정적 콘텐츠로 검증
    expect(html).toContain('로니');
    expect(html).toContain('적합도');
    expect(html).toContain('말티즈');
    expect(html).toContain('4살');
    expect(html).toContain('위험/주의 성분이 거의 없음');
  });

  it('IngredientCard: 위험 성분은 위험 배지, 안전 성분은 안전 배지(이중 부호화)', () => {
    const danger = renderToStaticMarkup(
      <IngredientCard ing={{ nameKo: 'BHA', purpose: '합성 산화방지제', riskLevel: 'danger' }} onOpen={() => {}} />
    );
    expect(danger).toContain('BHA');
    expect(danger).toContain('위험');

    const safe = renderToStaticMarkup(
      <IngredientCard ing={{ nameKo: '닭고기', purpose: '동물성 단백질', riskLevel: 'safe' }} onOpen={() => {}} />
    );
    expect(safe).toContain('닭고기');
    expect(safe).toContain('안전');

    const allergy = renderToStaticMarkup(
      <IngredientCard ing={{ nameKo: '닭', riskLevel: 'safe', isAllergy: true }} onOpen={() => {}} />
    );
    expect(allergy).toContain('알레르기');
  });

  it('StickyCtaBar: 직행 링크가 없으면 "구매"가 아니라 장바구니 담기로 표시(오인 방지)', () => {
    const html = renderToStaticMarkup(
      <StickyCtaBar price={29900} isFav={false} isComparing={false} onFav={() => {}} onCompare={() => {}} onBuy={() => {}} />
    );
    expect(html).toContain('29,900원 · 장바구니 담기');
    expect(html).not.toContain('구매하기');
  });

  it('StickyCtaBar: 검증된 직행 링크가 있으면 외부 링크 + 전달된 구매 문구를 노출한다', () => {
    const html = renderToStaticMarkup(
      <StickyCtaBar
        price={29900} isFav={false} isComparing={false}
        onFav={() => {}} onCompare={() => {}} onBuy={() => {}}
        buyHref="https://coupa.ng/abcd" buyLabel="최저가 보러가기"
      />
    );
    expect(html).toContain('href="https://coupa.ng/abcd"');
    expect(html).toContain('29,900원 · 최저가 보러가기');
    expect(html).toContain('target="_blank"');
  });

  it('StickyScoreBar: 점수/등급/제품명이 렌더된다', () => {
    const html = renderToStaticMarkup(<StickyScoreBar score={92} name="미니 인도어 어덜트" visible progress={40} />);
    expect(html).toContain('92');
    expect(html).toContain('A+');
    expect(html).toContain('미니 인도어 어덜트');
  });

  it('VerdictCard: 최대 3줄의 종합 의견을 렌더한다', () => {
    const html = renderToStaticMarkup(
      <VerdictCard lines={[
        { icon: <ShieldCheck size={16} />, text: '안전성: 위험 성분 없음 — 매우 안전' },
        { icon: <ShieldCheck size={16} />, text: '성분 구성: 안전 성분 12개' },
        { icon: <ShieldCheck size={16} />, text: '결론: 로니 적합도 95% — 추천합니다.' },
      ]} />
    );
    expect(html).toContain('종합 의견');
    expect(html).toContain('매우 안전');
    expect(html).toContain('추천합니다.');
  });

  it('PdpSkeleton: 크래시 없이 스켈레톤 플레이스홀더를 렌더한다', () => {
    const html = renderToStaticMarkup(<PdpSkeleton />);
    expect(html).toContain('pdp-skel');
  });

  it('AltProductCarousel: 유형 태그·점수·가격이 카드에 렌더된다', () => {
    const items: AltCardData[] = [
      { id: 'a1', brand: '오리젠', name: '오리지널', imageUrl: 'x', score: 96, deltaScore: 8, price: 26900, deltaPrice: -3000, tag: '더 건강해요', tagTone: 'excellent' },
      { id: 'a2', brand: '나우', name: '스몰브리드', imageUrl: 'x', score: 82, deltaScore: 0, price: 19900, deltaPrice: -10000, tag: '더 저렴해요', tagTone: 'good' },
    ];
    const html = renderToStaticMarkup(<AltProductCarousel items={items} onOpen={() => {}} />);
    expect(html).toContain('더 건강해요');
    expect(html).toContain('더 저렴해요');
    expect(html).toContain('96점');
    expect(html).toContain('26,900원');
    // 빈 배열이면 렌더하지 않음
    expect(renderToStaticMarkup(<AltProductCarousel items={[]} onOpen={() => {}} />)).toBe('');
  });

  it('NutritionCard: 도넛 구성비%와 레이더 축 라벨이 렌더된다', () => {
    const radar: RadarAxis[] = [
      { label: '단백질', value: 80 }, { label: '지방', value: 60 }, { label: '탄수화물', value: 50 },
      { label: '식이섬유', value: 40 }, { label: '수분', value: 70 },
    ];
    const html = renderToStaticMarkup(
      <NutritionCard data={{ protein: 32, fat: 16, carb: 40, fiber: 4, moisture: 8 }} radar={radar} />
    );
    expect(html).toContain('영양 밸런스');
    expect(html).toContain('단백질');
    expect(html).toContain('%'); // 구성비 퍼센트
    expect(html).toContain('영양 균형'); // 레이더 섹션
  });

  it('ReviewSummaryCard: 평균 별점·분포·태그·요약이 렌더된다 (리뷰 0이면 숨김)', () => {
    const html = renderToStaticMarkup(
      <ReviewSummaryCard ratings={[5, 5, 4, 3, 5]} topTags={['기호성 좋아요 3']} summary="후기 5개 요약 · 평균 4.4점" />
    );
    expect(html).toContain('4.4'); // 평균
    expect(html).toContain('5개'); // 총 개수
    expect(html).toContain('기호성 좋아요 3');
    expect(html).toContain('후기 5개 요약');
    expect(renderToStaticMarkup(<ReviewSummaryCard ratings={[]} topTags={[]} />)).toBe('');
  });

  it('FaqAccordion: 첫 항목이 열린 채로 질문/답변을 렌더한다', () => {
    const items: QaItem[] = [
      { q: '보관은 어떻게 하나요?', a: '밀폐용기에 담아 서늘한 곳에 보관하세요.' },
      { q: '급여량은?', a: '체중 기준으로 계산해요.' },
    ];
    const html = renderToStaticMarkup(<FaqAccordion items={items} />);
    expect(html).toContain('자주 묻는 질문');
    expect(html).toContain('보관은 어떻게 하나요?');
    expect(html).toContain('밀폐용기'); // 첫 항목 기본 열림
    expect(renderToStaticMarkup(<FaqAccordion items={[]} />)).toBe('');
  });

  it('EmptyState: 제목/설명/액션을 렌더한다', () => {
    const html = renderToStaticMarkup(<EmptyState emoji="🔍" title="제품을 찾을 수 없어요" desc="삭제된 제품일 수 있어요." actionLabel="홈으로" onAction={() => {}} />);
    expect(html).toContain('제품을 찾을 수 없어요');
    expect(html).toContain('삭제된 제품일 수 있어요.');
    expect(html).toContain('홈으로');
  });

  it('ErrorState: 기본 문구와 재시도 버튼을 렌더한다', () => {
    const html = renderToStaticMarkup(<ErrorState onRetry={() => {}} />);
    expect(html).toContain('정보를 불러오지 못했어요');
    expect(html).toContain('다시 시도');
    expect(html).toContain('role="alert"');
  });

  it('OfflineBanner: 오프라인 안내 문구를 담는다', () => {
    const html = renderToStaticMarkup(<OfflineBanner online={false} />);
    expect(html).toContain('오프라인');
    expect(html).toContain('저장된 정보를 표시 중');
  });
});
