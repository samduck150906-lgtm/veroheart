import { describe, expect, it } from 'vitest';
import { buildAllergyDisplayState } from './allergyDisplay';
import type { AllergyRelationshipMatch } from '../analysis/allergyFamilyMatcher';

function caution(kind: AllergyRelationshipMatch['kind'], ingredientName: string): AllergyRelationshipMatch {
  return {
    allergy: '닭',
    ingredientName,
    kind,
    allergySource: 'chicken',
    ingredientSource: kind === 'cross_caution' ? 'duck' : 'chicken',
  };
}

describe('allergy display state', () => {
  it('keeps hard allergy copy explicit', () => {
    expect(buildAllergyDisplayState({ allergyHits: ['닭'], allergyCautions: [] }, '보리')).toEqual({
      level: 'hard',
      shortText: '닭',
      summaryText: '보리의 회피 성분 닭 포함',
    });
  });

  it('shows cross-poultry caution instead of no-allergy copy', () => {
    const state = buildAllergyDisplayState(
      { allergyHits: [], allergyCautions: [caution('cross_caution', '오리고기')] },
      '보리',
    );
    expect(state.level).toBe('caution');
    expect(state.shortText).toBe('관련 가금류 주의');
    expect(state.summaryText).toContain('알레르기와 관련된 원료');
  });

  it('uses kind-specific caution labels for uncertainty and processing forms', () => {
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [caution('strong_caution', '가금류부산물')] }).shortText).toBe('가금류 출처 확인');
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [caution('hydrolysis_caution', '가수분해 닭 단백질')] }).shortText).toBe('가수분해 원료 주의');
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [caution('processing_caution', '닭지방')] }).shortText).toBe('가금류 지방 주의');
  });

  it('only says none when hard hits and cautions are both absent', () => {
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [] }, '보리')).toEqual({
      level: 'none',
      shortText: '해당 없음',
      summaryText: '등록된 알레르기 성분 없음',
    });
  });
});
