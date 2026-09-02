import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function source(relativeUrl: string): string {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

describe('poultry allergy surface consistency guard', () => {
  it('routes comparison allergy copy through the shared HARD/caution/none/unknown display state', () => {
    const comparison = source('../pages/Comparison.tsx');

    expect(comparison).toContain('buildAllergyDisplayState');
    // 비교 결과 문구는 우세/동점 판정으로 옮겨졌지만, 알레르기 안내는 여전히
    // 공유 표시 상태(none/unknown/caution/hard)를 그대로 따라야 한다.
    expect(comparison).toContain("level === 'caution'");
    expect(comparison).toContain("level === 'unknown'");
    expect(comparison).toContain('hasIngredientData: (product.ingredients?.length ?? 0) > 0');
    // 근거 없는 우승자를 만들지 않는다 — 예전의 점수 최댓값 reduce 로 되돌아가지 않게 한다.
    expect(comparison).toContain('resolveComparisonVerdict');
    expect(comparison).not.toContain('columns.reduce((a, b) => (b.score > a.score ? b : a))');
    expect(comparison).not.toContain(
      "breakdown.allergyHits.length > 0 ? breakdown.allergyHits.join(', ') : '해당 없음'",
    );
  });

  it('does not let the detail page call a caution-only product allergy-free', () => {
    const detail = source('../pages/Detail.tsx');

    expect(detail).toContain('buildAllergyDisplayState');
    expect(detail).toContain("allergyDisplay.level === 'caution'");
    expect(detail).toContain("allergyDisplay.level === 'unknown'");
    expect(detail).toContain('hasIngredientData');
    expect(detail).toContain("value: '원료 정보 부족'");
    expect(detail).toContain('위험 성분 포함 여부를 판정할 수 없어요');
    expect(detail).toContain('allergyDisplay.summaryText');
    expect(detail).not.toContain(
      "breakdown.allergyHits.length ? `, ${profile.name}의 회피 성분 ${breakdown.allergyHits.join('·')} 포함` : ', 등록된 알레르기 성분 없음'",
    );
  });

  it('requires both HARD hits and cautions to be absent before AnalysisResult shows allergy-free copy', () => {
    const analysisResult = source('../pages/AnalysisResult.tsx');

    expect(analysisResult).toContain("breakdown?.allergyHits.length === 0");
    expect(analysisResult).toContain("(breakdown?.allergyCautions.length ?? 0) === 0");
    expect(analysisResult).toContain('ingredients.length > 0');
    expect(analysisResult).toContain("'알레르기 성분 미포함'");
    expect(analysisResult).toContain("'주의·위험 성분 없음'");
  });

  it('keeps feed-analysis quality score objective while surfacing profile caution copy', () => {
    const feedAnalysis = source('../analysis/feedAnalysis.ts');

    expect(feedAnalysis).toContain('allergyCautionMatches(ingredients, profile.allergies)');
    expect(feedAnalysis).toContain('allergyCautions.length > 0');
    expect(feedAnalysis).toContain('알레르기와 관련된 원료가 있어 급여 전 확인이 필요해요');
    expect(feedAnalysis).not.toContain('score -= allergyCaution');
    expect(feedAnalysis).not.toContain('score += allergyCaution');
  });
});
