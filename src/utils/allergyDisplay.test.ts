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
    expect(state.summaryText).toContain('직접 일치하는 원료는 확인되지 않았지만');
    expect(state.summaryText).toContain('성분표와 급여 반응 확인');
  });

  it('uses kind-specific caution labels for uncertainty and processing forms', () => {
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [caution('strong_caution', '가금류부산물')] }).shortText).toBe('가금류 출처 확인');
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [caution('hydrolysis_caution', '가수분해 닭 단백질')] }).shortText).toBe('가수분해 원료 주의');
    expect(buildAllergyDisplayState({ allergyHits: [], allergyCautions: [caution('processing_caution', '닭지방')] }).shortText).toBe('가금류 지방 주의');
  });

  it('uses bounded no-match copy only with ingredient data and a saved allergy profile', () => {
    expect(buildAllergyDisplayState(
      { allergyHits: [], allergyCautions: [] },
      '보리',
      { hasIngredientData: true, hasAllergyProfile: true },
    )).toEqual({
      level: 'none',
      shortText: '직접 일치 미확인',
      summaryText: '현재 등록된 원료 정보에서 프로필 알레르기와 직접 일치하는 성분은 확인되지 않음',
    });
  });

  it('does not call an empty allergy profile a no-match', () => {
    expect(buildAllergyDisplayState(
      { allergyHits: [], allergyCautions: [] },
      '보리',
      { hasIngredientData: true, hasAllergyProfile: false },
    )).toEqual({
      level: 'unknown',
      shortText: '프로필 미등록',
      summaryText: '프로필에 비교할 알레르기가 등록되지 않음',
    });
  });

  it('does not call missing ingredient data allergy-free', () => {
    expect(
      buildAllergyDisplayState(
        { allergyHits: [], allergyCautions: [] },
        '보리',
        { hasIngredientData: false },
      ),
    ).toEqual({
      level: 'unknown',
      shortText: '원료 정보 부족',
      summaryText: '원료 정보가 부족해 등록 알레르기와의 일치 여부를 확인할 수 없음',
    });
  });

  it('keeps a detected hit stronger than a contradictory missing-data flag', () => {
    expect(
      buildAllergyDisplayState(
        { allergyHits: ['닭'], allergyCautions: [] },
        '보리',
        { hasIngredientData: false },
      ).level,
    ).toBe('hard');
  });
});
