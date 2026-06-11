import { describe, expect, it } from 'vitest';
import { buildAnalysisResponse } from './analysisResponse';

describe('buildAnalysisResponse (스캐너 매퍼)', () => {
  it('위험 성분이 있으면 contains_toxic + risk_level danger', () => {
    const res = buildAnalysisResponse({
      ingredientText: '원료명: 닭고기, 쌀, 자일리톨',
      animal: 'dog',
      productType: 'snack',
    });
    expect(res.contains_toxic).toBe(true);
    expect(res.risk_level).toBe('danger');
    expect(res.toxic_ingredients?.some((t) => t.name.includes('자일리톨'))).toBe(true);
    const xyl = res.ingredient_analysis.find((i) => i.name.includes('자일리톨'));
    expect(xyl?.risk).toBe('danger');
  });

  it('안전한 사료는 safe 위주, 등록성분량으로 칼로리 계산', () => {
    const res = buildAnalysisResponse({
      ingredientText:
        '원료명: 닭고기, 현미, 연어오일, 혼합토코페롤\n등록성분량: 조단백질 26% 이상, 조지방 12% 이상, 수분 10% 이하',
      animal: 'dog',
      productType: 'food',
    });
    expect(res.contains_toxic).toBe(false);
    expect(res.scores.final).toBeGreaterThan(0);
    expect(res.estimated_calories_kcal_kg).toBeGreaterThan(0);
    expect(res.ingredient_analysis[0].name).toBe('닭고기');
  });

  it('사전에 없는 원료는 unknown 카테고리로 표시', () => {
    const res = buildAnalysisResponse({
      ingredientText: '닭고기, 정체불명원료abc',
      animal: 'cat',
      productType: 'food',
    });
    const unknown = res.ingredient_analysis.find((i) => i.name.includes('정체불명'));
    expect(unknown?.category).toBe('unknown');
  });
});
