import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function source(relativeUrl: string): string {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

describe('poultry allergy surface consistency guard', () => {


  it('does not let the detail page call a caution-only product allergy-free', () => {
    const detail = source('../pages/Detail.tsx');

    expect(detail).toContain('buildAllergyDisplayState');
    expect(detail).toContain("allergyDisplay.level === 'caution'");
    expect(detail).toContain("allergyDisplay.level === 'unknown'");
    expect(detail).toContain('hasIngredientData');
    expect(detail).toContain('value: describeIngredientAvailability(product).label');
    expect(detail).toContain('describeIngredientAvailability(product).detail');
    expect(detail).toContain('allergyDisplay.summaryText');
    expect(detail).not.toContain(
      "breakdown.allergyHits.length ? `, ${profile.name}의 회피 성분 ${breakdown.allergyHits.join('·')} 포함` : ', 등록된 알레르기 성분 없음'",
    );
  });

  it('routes AnalysisResult through bounded shared allergy display copy', () => {
    const analysisResult = source('../pages/AnalysisResult.tsx');

    expect(analysisResult).toContain('buildAllergyDisplayState');
    expect(analysisResult).toContain('hasAllergyProfile');
    expect(analysisResult).toContain("allergyDisplay?.level === 'none'");
    expect(analysisResult).not.toContain('알레르기 성분 미포함');
    expect(analysisResult).not.toContain('주의·위험 성분 없음');
  });

  it('keeps feed-analysis quality score objective while surfacing profile caution copy', () => {
    const feedAnalysis = source('../analysis/feedAnalysis.ts');

    expect(feedAnalysis).toContain('allergyCautionMatches(ingredients, profile.allergies)');
    expect(feedAnalysis).toContain('allergyCautions.length > 0');
    expect(feedAnalysis).toContain('알레르기와 관련된 원료가 있어 급여 전 확인이 필요합니다');
    expect(feedAnalysis).not.toContain('score -= allergyCaution');
    expect(feedAnalysis).not.toContain('score += allergyCaution');
  });
});
