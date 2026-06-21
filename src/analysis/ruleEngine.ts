/**
 * 통합 규칙 엔진 — 베로로 분석의 단일 "판단" 계층(brain).
 *
 *   토큰화된 성분 → 사전 매칭 → 규칙 적용 → 개인화 필터 → 점수/등급/섹션
 *
 * LLM은 여기서 어떤 판단도 하지 않는다. 이 함수의 출력(사실)을 받아
 * 마지막에 쉬운 말로 "설명"만 생성하는 역할이다.
 */
import type {
  AnalysisRule,
  Finding,
  Grade,
  MatchedIngredient,
  PetProfile,
  ProductForAnalysis,
  RuleCondition,
  RuleEngineResult,
  ScoreBreakdown,
  Species,
} from './types';
import { findIngredientByName } from './ingredientDictionary';
import { ALL_RULES } from './rules';
import { normalizeIngredientName } from './normalize';

const DISCLAIMER =
  '이 분석은 제품 라벨 기반 참고 정보이며, 질병·치료 목적의 급여 판단은 수의사 상담이 필요합니다.';

// 건강 고민 태그 동의어 맵 (제품 태그 → 펫 disease 태그 매칭)
const HEALTH_CONCERN_ALIASES: Record<string, string[]> = {
  '관절': ['관절', 'joint', 'arthritis'],
  '피부': ['피부', 'skin', 'allergy', '알레르기'],
  '소화': ['소화', 'digestion', 'stomach'],
  '비만': ['비만', 'obesity', '체중', 'weight'],
  '신장': ['신장', 'kidney', 'renal'],
  '심장': ['심장', 'heart', 'cardiac'],
  '면역': ['면역', 'immune', 'immunity'],
  '구강': ['구강', 'dental', 'teeth'],
};

const PET_LIFE_STAGE_LABEL: Record<string, string> = {
  puppy_kitten: '자견·자묘',
  adult: '성견·성묘',
  senior: '노령견·노령묘',
  all_life_stages: '전 연령',
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** 문자열 성분 배열을 MatchedIngredient[]로 변환(파서 미연동 시 폴백) */
export function matchIngredients(names: string[]): MatchedIngredient[] {
  return names.map((raw, idx) => {
    const ingredient = findIngredientByName(raw);
    return {
      originalName: raw,
      position: idx + 1,
      percent: null,
      percentBasis: null,
      ingredient,
      confidence: ingredient ? 0.9 : 0.2,
    };
  });
}

/** 규칙의 종(species) 적용 가능 여부 */
function speciesApplies(rule: AnalysisRule, petSpecies: 'dog' | 'cat'): boolean {
  if (!rule.species || rule.species === 'both') return true;
  return rule.species === petSpecies;
}

/** 조건이 매칭되면 관련 성분명들을 반환, 아니면 null */
function evaluateCondition(
  cond: RuleCondition,
  matched: MatchedIngredient[],
): string[] | null {
  const present = matched.filter((m) => m.ingredient);

  if (cond.hasIngredient) {
    const target = normalizeIngredientName(cond.hasIngredient);
    const hits = present.filter(
      (m) =>
        normalizeIngredientName(m.ingredient!.canonicalKo) === target ||
        m.ingredient!.aliases.some((a) => normalizeIngredientName(a) === target),
    );
    return hits.length ? hits.map((m) => m.ingredient!.canonicalKo) : null;
  }

  if (cond.hasAnyIngredient) {
    const targets = cond.hasAnyIngredient.map(normalizeIngredientName);
    const hits = present.filter((m) =>
      targets.includes(normalizeIngredientName(m.ingredient!.canonicalKo)),
    );
    return hits.length ? Array.from(new Set(hits.map((m) => m.ingredient!.canonicalKo))) : null;
  }

  if (cond.firstIngredientCategory) {
    const first = matched[0];
    if (first?.ingredient?.category === cond.firstIngredientCategory) {
      return [first.ingredient.canonicalKo];
    }
    return null;
  }

  // hasCategory / hasRiskTag (둘 다 지정 시 AND)
  if (cond.hasCategory || cond.hasRiskTag) {
    const hits = present.filter((m) => {
      const ing = m.ingredient!;
      const catOk = cond.hasCategory ? ing.category === cond.hasCategory : true;
      const tagOk = cond.hasRiskTag ? ing.riskTags.includes(cond.hasRiskTag) : true;
      return catOk && tagOk;
    });
    return hits.length ? Array.from(new Set(hits.map((m) => m.ingredient!.canonicalKo))) : null;
  }

  return null;
}

/** 투명도 평가 */
function analyzeTransparency(matched: MatchedIngredient[]): {
  score: number;
  notes: string[];
} {
  let score = 80;
  const notes: string[] = [];

  const unknownCount = matched.filter((m) => !m.ingredient).length;
  if (unknownCount > 0) {
    score -= Math.min(20, unknownCount * 5);
    notes.push(`일부 원료명(${unknownCount}개)이 표준 성분 사전과 매칭되지 않았어요.`);
  }

  const vague = matched.filter(
    (m) => m.ingredient && m.ingredient.riskTags.includes('controversial') && m.ingredient.category === 'processed_protein',
  );
  if (vague.length) {
    score -= 15;
    notes.push('동물성 원료의 출처가 구체적이지 않은 표현이 있어요.');
  }

  const first = matched[0];
  if (first?.ingredient?.category === 'animal_protein') {
    score += 10;
    notes.push('첫 번째 원료가 명확한 동물성 단백질이에요.');
  }

  return { score: clamp(score), notes };
}

function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return '주의';
}

/** 완전사료/간식에 따라 가중치를 달리해 종합 점수를 만든다. */
function combineScore(
  breakdown: ScoreBreakdown,
  productType: ProductForAnalysis['productType'],
): number {
  const { safety, nutritionFit, ingredientQuality, transparency, feedingGuide } = breakdown;
  if (productType === 'treat' || productType === 'supplement') {
    return clamp(
      safety * 0.45 +
        ingredientQuality * 0.3 +
        transparency * 0.15 +
        (feedingGuide ?? 70) * 0.1,
    );
  }
  // complete_food / unknown 기본
  return clamp(
    safety * 0.35 + nutritionFit * 0.35 + ingredientQuality * 0.2 + transparency * 0.1,
  );
}

const SECTION_TITLE: Record<'good' | 'warn', string> = {
  good: '좋은 점',
  warn: '주의할 점',
};

/**
 * 메인 분석 함수.
 * matchedIngredients가 없으면 문자열 배열(rawNames)에서 매칭한다.
 */
export function analyzeProduct(
  product: ProductForAnalysis,
  pet?: PetProfile,
  rawNames?: string[],
): RuleEngineResult {
  const matched: MatchedIngredient[] =
    product.matchedIngredients ?? (rawNames ? matchIngredients(rawNames) : []);

  const petSpecies: 'dog' | 'cat' =
    pet?.species ?? (product.species === 'cat' ? 'cat' : 'dog');

  // ── 점수 기준선 ──
  let safety = 100;
  const nutritionFit = 70;
  let ingredientQuality = 70;
  const feedingGuide = 70;

  const positives: Finding[] = [];
  const warnings: Finding[] = [];

  // ── 규칙 적용 ──
  for (const rule of ALL_RULES) {
    if (!speciesApplies(rule, petSpecies)) continue;
    const hitIngredients = evaluateCondition(rule.condition, matched);
    if (!hitIngredients) continue;

    const finding: Finding = {
      ruleId: rule.id,
      level: rule.severity,
      title: rule.title,
      message: rule.messageTemplate,
      ingredients: hitIngredients,
      scoreDelta: rule.scoreDelta,
      evidenceLevel: rule.evidenceLevel,
    };

    if (rule.severity === 'good') {
      positives.push(finding);
      ingredientQuality += rule.scoreDelta;
    } else {
      warnings.push(finding);
      safety += rule.scoreDelta;
    }
  }

  // ── 개인화: 등록 알레르기와 겹치는 성분 ──
  if (pet?.allergies?.length) {
    for (const m of matched) {
      if (!m.ingredient) continue;
      const overlap = m.ingredient.allergenTags.filter((t) => pet.allergies.includes(t));
      if (overlap.length) {
        const f: Finding = {
          ruleId: `PERSONAL_ALLERGY_${m.ingredient.id}`,
          level: 'caution',
          title: `${m.ingredient.canonicalKo} 알레르기 주의`,
          message: `등록된 알레르기 정보(${overlap.join(', ')})와 겹치는 성분이에요. ${m.ingredient.canonicalKo}에 반응한 적이 있다면 피하는 것이 좋아요.`,
          ingredients: [m.ingredient.canonicalKo],
          scoreDelta: -30,
          evidenceLevel: 'internal_policy',
        };
        warnings.push(f);
        safety -= 30;
      }
    }
  }

  // ── 건강 고민 매칭 보너스: 제품 기능성 태그 ↔ 펫 건강 고민 ──
  if (pet && product.healthConcerns?.length && pet.diseases?.length) {
    const matchedConcerns = product.healthConcerns.filter((tag) =>
      pet.diseases!.some((d) =>
        d.includes(tag) || tag.includes(d) ||
        HEALTH_CONCERN_ALIASES[tag]?.includes(d)
      )
    );
    if (matchedConcerns.length) {
      const bonus = Math.min(matchedConcerns.length * 5, 20);
      ingredientQuality = clamp(ingredientQuality + bonus);
      positives.push({
        ruleId: 'HEALTH_CONCERN_MATCH',
        level: 'good',
        title: '건강 고민 맞춤 제품',
        message: `${matchedConcerns.join(', ')} 관련 기능성 성분이 포함된 제품이에요.`,
        ingredients: [],
        scoreDelta: bonus,
        evidenceLevel: 'internal_policy',
      });
    }
  }

  // ── 연령(라이프스테이지) 적합성 ──
  if (pet?.lifeStage && product.lifeStage && product.lifeStage !== 'unknown') {
    const isAllStages = product.lifeStage === 'all_life_stages';
    const isMatch = isAllStages || product.lifeStage === pet.lifeStage;
    if (isMatch) {
      ingredientQuality = clamp(ingredientQuality + 8);
      positives.push({
        ruleId: 'LIFE_STAGE_MATCH',
        level: 'good',
        title: '연령 적합 제품',
        message: isAllStages
          ? '모든 연령에 적합한 제품이에요.'
          : `${PET_LIFE_STAGE_LABEL[pet.lifeStage]} 전용으로 설계된 제품이에요.`,
        ingredients: [],
        scoreDelta: 8,
        evidenceLevel: 'nutrition_guideline',
      });
    } else {
      safety = clamp(safety - 5);
      warnings.push({
        ruleId: 'LIFE_STAGE_MISMATCH',
        level: 'watch',
        title: '연령 부적합 가능성',
        message: `이 제품은 ${PET_LIFE_STAGE_LABEL[product.lifeStage]} 전용이에요. 우리 아이의 연령과 다를 수 있어요.`,
        ingredients: [],
        scoreDelta: -5,
        evidenceLevel: 'nutrition_guideline',
      });
    }
  }

  // ── 종(Species) 적합성 ──
  if (product.species !== 'both' && product.species !== petSpecies) {
    safety = clamp(safety - 15);
    warnings.push({
      ruleId: 'SPECIES_MISMATCH',
      level: 'caution',
      title: '다른 종 전용 제품',
      message: `이 제품은 ${product.species === 'cat' ? '고양이' : '강아지'} 전용이에요. 다른 종에게 급여하면 영양 불균형이 생길 수 있어요.`,
      ingredients: [],
      scoreDelta: -15,
      evidenceLevel: 'veterinary',
    });
  } else if (product.species === petSpecies) {
    ingredientQuality = clamp(ingredientQuality + 5);
  }

  // ── 투명도 ──
  const transparency = analyzeTransparency(matched);

  const breakdown: ScoreBreakdown = {
    safety: clamp(safety),
    nutritionFit: clamp(nutritionFit),
    ingredientQuality: clamp(ingredientQuality),
    transparency: transparency.score,
    feedingGuide,
  };

  const finalScore = Math.round(combineScore(breakdown, product.productType));
  const grade = scoreToGrade(finalScore);
  const unknowns = matched.filter((m) => !m.ingredient).map((m) => m.originalName);

  // ── 섹션 구성 ──
  const goodItems = positives.map((f) => ({
    label: f.title,
    level: f.level,
    description: f.message,
  }));
  const warnItems = warnings
    .slice()
    .sort((a, b) => a.scoreDelta - b.scoreDelta) // 더 큰 감점이 위로
    .map((f) => ({ label: f.title, level: f.level, description: f.message }));

  const sections = [];
  if (goodItems.length) sections.push({ title: SECTION_TITLE.good, items: goodItems });
  if (warnItems.length) sections.push({ title: SECTION_TITLE.warn, items: warnItems });

  // ── 요약(설명 생성기 이전의 규칙 기반 한 줄) ──
  const hasDanger = warnings.some((w) => w.level === 'danger');
  let summary: string;
  if (hasDanger) {
    summary = '위험할 수 있는 성분이 발견됐어요. 급여 전 반드시 확인이 필요합니다.';
  } else if (grade === 'A+' || grade === 'A') {
    summary = '전반적으로 안심하고 급여할 수 있는 구성이에요.';
  } else if (grade === '주의') {
    summary = '급여 전 전문가 상담이 권장되는 제품이에요.';
  } else {
    summary = '무난하지만 일부 주의 성분이 있어요. 우리 아이 상태에 맞는지 확인해보세요.';
  }

  return {
    productId: product.id,
    score: finalScore,
    grade,
    breakdown,
    summary,
    matchedIngredients: matched,
    positives,
    warnings,
    unknowns,
    transparencyNotes: transparency.notes,
    sections,
    disclaimer: DISCLAIMER,
  };
}

export type { RuleEngineResult, Finding, ScoreBreakdown, Grade, Species };
