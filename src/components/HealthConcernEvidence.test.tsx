import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HealthConcernEvidence } from './HealthConcernEvidence';
import type { HealthConcernPresentation } from '../health/concernPresentation';

const presentation: HealthConcernPresentation = {
  status: 'available',
  items: [
    { concernId: 'joint', label: '관절', state: 'insufficient_neutral', title: '관절: 판단할 정보가 부족해요', summary: '적합하다는 뜻은 아니에요.', scoreEffect: '정보 부족으로 중립 반영', confidence: 'insufficient' },
    { concernId: 'heart', label: '심장', state: 'limited_evidence', title: '심장: 제한적인 근거가 있어요', summary: '확인된 범위만 반영했어요.', scoreEffect: '제한 근거 25% 반영', confidence: 'partial' },
    { concernId: 'skin', label: '피부', state: 'supported_evidence', title: '피부: 관련 수치 근거가 확인됐어요', summary: '효과를 보장하지 않아요.', scoreEffect: '확인된 근거 반영', confidence: 'sufficient' },
    { concernId: 'kidney', label: '신장', state: 'contradiction_caution', title: '신장: 등록 수치와 기준이 맞지 않아요', summary: '제품 정보를 확인해 주세요.', scoreEffect: '충돌 근거로 0점 반영', confidence: 'sufficient' },
    { concernId: null, label: '저장값', state: 'legacy_review', title: '건강 고민 정보를 확인해 주세요', summary: '기존 점수를 유지했어요.', scoreEffect: '기존 점수 유지', confidence: 'unknown' },
  ],
};

describe('HealthConcernEvidence', () => {
  it('renders every evidence state and multiple concerns with visible score effects', () => {
    const html = renderToStaticMarkup(<HealthConcernEvidence presentation={presentation} />);
    expect(html).toContain('관절: 판단할 정보가 부족해요');
    expect(html).toContain('심장: 제한적인 근거가 있어요');
    expect(html).toContain('피부: 관련 수치 근거가 확인됐어요');
    expect(html).toContain('신장: 등록 수치와 기준이 맞지 않아요');
    expect(html).toContain('건강 고민 정보를 확인해 주세요');
    expect(html).toContain('점수 반영:');
  });

  it('renders nothing when no health concern is selected', () => {
    expect(renderToStaticMarkup(
      <HealthConcernEvidence presentation={{ status: 'not_selected', items: [] }} />,
    )).toBe('');
  });
});
