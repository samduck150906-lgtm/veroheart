import type { Product, UserPetProfile } from '../types';
import { getCompatibilityBreakdown } from './score';
import { analyzeProduct } from '../analysis/ruleEngine';
import {
  toPetProfile,
  toProductForAnalysis,
  toIngredientNames,
} from '../analysis/adapter';
import type { Finding, Grade } from '../analysis/types';

export interface AnalysisReport {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[];
  detailedAnalysis: string;
}

function mapGrade(grade: Grade, hasDanger: boolean): AnalysisReport['grade'] {
  if (hasDanger) return 'Poor';
  if (grade === 'A+' || grade === 'A') return 'Excellent';
  if (grade === 'B+' || grade === 'B') return 'Good';
  if (grade === 'C') return 'Fair';
  return 'Poor';
}

function findingToHighlight(f: Finding): {
  text: string;
  type: 'positive' | 'negative' | 'caution';
} {
  const type: 'positive' | 'negative' | 'caution' =
    f.level === 'good' ? 'positive' : f.level === 'danger' ? 'caution' : 'negative';
  return { text: f.message, type };
}

/**
 * 제품 분석 리포트 생성.
 *
 * 판단(위험/안전/가점)은 전적으로 규칙 엔진(src/analysis)이 수행한다.
 * 이 함수는 엔진 결과를 화면이 기대하는 AnalysisReport 형태로 변환하고,
 * 리뷰/인기/가격 기반 적합도는 보조 설명에만 활용한다.
 */
export function generateAnalysisReport(
  product: Product,
  profile: UserPetProfile,
): AnalysisReport {
  const engineResult = analyzeProduct(
    toProductForAnalysis(product),
    toPetProfile(profile),
    toIngredientNames(product),
  );

  const hasDanger = engineResult.warnings.some((w) => w.level === 'danger');
  const grade = mapGrade(engineResult.grade, hasDanger);

  // 좋은 점 우선, 그다음 감점 큰 경고 순으로 하이라이트 구성
  const highlights = [
    ...engineResult.positives.map(findingToHighlight),
    ...engineResult.warnings
      .slice()
      .sort((a, b) => a.scoreDelta - b.scoreDelta)
      .map(findingToHighlight),
  ].slice(0, 6);

  // 이름 개인화 요약
  const name = profile.name || '우리 아이';
  let summary = engineResult.summary;
  if (grade === 'Excellent') summary = `${name}에게 안심하고 추천할 수 있는 제품이에요!`;
  else if (hasDanger) summary = `${name}에게 위험할 수 있는 성분이 있어요. 급여 전 꼭 확인이 필요해요.`;

  // 보조 적합도(리뷰/인기/가격)는 설명 문구에만 사용
  const compatibility = getCompatibilityBreakdown(product, profile);
  const dangerCount = engineResult.warnings.filter((w) => w.level === 'danger').length;
  const detailedAnalysis =
    `전체 ${engineResult.matchedIngredients.length}개 성분 중 ` +
    `위험 성분 ${dangerCount}개, 주의 항목 ${engineResult.warnings.length - dangerCount}개가 확인됐어요. ` +
    (engineResult.unknowns.length
      ? `사전에 없는 원료 ${engineResult.unknowns.length}개는 추가 확인이 필요해요. `
      : '') +
    (profile.healthConcerns?.length
      ? `${name}의 건강 고민(${profile.healthConcerns.join(', ')})도 함께 고려했어요. `
      : '') +
    `리뷰·인기·가격을 포함한 보조 적합도는 ${compatibility.total}점이에요.`;

  return {
    score: engineResult.score,
    grade,
    summary,
    highlights,
    detailedAnalysis,
  };
}
