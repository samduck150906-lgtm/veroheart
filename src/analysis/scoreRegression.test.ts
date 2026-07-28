/**
 * 사용자 분석 결과 회귀 잠금(golden) 테스트.
 *
 * 관리자 콘솔 작업(2026-07-28)은 사용자 점수·판정을 바꾸지 않아야 한다.
 * 아래 기대값은 관리자 기능 추가 이전 구현에서 산출한 값이며,
 * 다음이 바뀌면 이 테스트가 깨진다.
 *   - 100점 배분 (성분 안전 50 / 건강 적합 30 / 고민 적합 20)
 *   - 종 불일치 0점 · 알레르기 9점 이하 · 위험 성분 69점 이하 하드캡
 *   - AAFCO 판정, Modified Atwater 열량, 건물기준 환산, Ca:P 계산
 *   - 1일 권장 급여량(RER/DER)
 *
 * 의도한 정책 변경이 아니라면 이 값을 고치지 말 것.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import type { GuaranteedAnalysis } from './types';
import {
  calculateCompatibilityScore,
  getRecommendationBreakdown,
  resolveDisplayVerdict,
} from '../utils/score';
import { analyzeFeed } from './feedAnalysis';
import { runScoringPipeline } from './scoringPipeline';

const ing = (nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient => ({
  id: nameKo,
  nameKo,
  nameEn: '',
  purpose: '',
  riskLevel,
});

const GA: GuaranteedAnalysis = {
  crudeProtein: 30,
  crudeFat: 16,
  crudeFiber: 4,
  crudeAsh: 7,
  moisture: 10,
  calcium: 1.2,
  phosphorus: 1.0,
};

const CLEAN_PRODUCT: Product = {
  id: 'prod-1',
  brand: '베로로',
  name: '테스트 어덜트 사료',
  category: 'food',
  mainCategory: '사료',
  targetPetType: 'dog',
  targetLifeStage: ['adult'],
  healthConcerns: ['피부'],
  hasRiskFactors: [],
  imageUrl: '',
  reviewsCount: 10,
  averageRating: 4.2,
  ingredients: [ing('닭고기'), ing('현미'), ing('연어오일'), ing('비트펄프'), ing('타우린')],
  guaranteedAnalysis: GA,
};

const DANGER_PRODUCT: Product = {
  ...CLEAN_PRODUCT,
  id: 'prod-2',
  ingredients: [ing('닭고기'), ing('BHA', 'danger')],
};

const DOG: UserPetProfile = {
  id: 'pet-1',
  name: '초코',
  species: 'Dog',
  age: 3,
  weightKg: 5,
  breed: '말티즈',
  healthConcerns: ['피부'],
  allergies: [],
};
const CAT: UserPetProfile = { ...DOG, id: 'pet-2', name: '나비', species: 'Cat' };
const ALLERGIC_DOG: UserPetProfile = { ...DOG, id: 'pet-3', allergies: ['닭고기'] };

function verdictFor(product: Product, profile: UserPetProfile) {
  const raw = calculateCompatibilityScore(product, profile);
  const breakdown = getRecommendationBreakdown(product, profile);
  const dangerCount = product.ingredients.filter((i) => i.riskLevel === 'danger').length;
  return {
    raw,
    breakdown,
    verdict: resolveDisplayVerdict(raw, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount,
    }),
  };
}

describe('적합도 점수 회귀 (golden)', () => {
  it('건강한 강아지 × 문제 없는 사료 — 100점 A', () => {
    const { raw, breakdown, verdict } = verdictFor(CLEAN_PRODUCT, DOG);
    expect(raw).toBe(100);
    expect(breakdown.baseScore).toBe(100);
    expect(breakdown.ingredientSafety).toBe(50);
    expect(breakdown.healthSuitability).toBe(30);
    expect(breakdown.concernFit).toBe(20);
    expect(verdict).toEqual({ score: 100, grade: 'A', capReason: null });
  });

  it('배분 비율은 50 / 30 / 20 을 넘지 않는다', () => {
    const { breakdown } = verdictFor(CLEAN_PRODUCT, DOG);
    expect(breakdown.ingredientSafety).toBeLessThanOrEqual(50);
    expect(breakdown.healthSuitability).toBeLessThanOrEqual(30);
    expect(breakdown.concernFit).toBeLessThanOrEqual(20);
    expect(breakdown.baseScore).toBe(
      breakdown.ingredientSafety + breakdown.healthSuitability + breakdown.concernFit,
    );
  });

  it('종 불일치 — 원점수 0, 표시 0점 F', () => {
    const { raw, breakdown, verdict } = verdictFor(CLEAN_PRODUCT, CAT);
    expect(breakdown.speciesMismatch).toBe(true);
    expect(raw).toBe(0);
    expect(verdict.score).toBe(0);
    expect(verdict.grade).toBe('F');
  });

  it('알레르기 성분 포함 — 표시 점수 9점 이하로 하드캡', () => {
    const { raw, breakdown, verdict } = verdictFor(CLEAN_PRODUCT, ALLERGIC_DOG);
    expect(breakdown.allergyHits.length).toBeGreaterThan(0);
    expect(breakdown.allergyPenalty).toBe(90);
    expect(raw).toBe(10);
    expect(verdict.score).toBe(9);
    expect(verdict.grade).toBe('F');
    expect(verdict.capReason).toBe('allergy');
  });

  it('위험 성분 포함 — 69점을 넘지 않는다', () => {
    const { raw, breakdown, verdict } = verdictFor(DANGER_PRODUCT, DOG);
    expect(raw).toBe(66);
    expect(breakdown.ingredientSafety).toBe(25);
    expect(verdict.score).toBeLessThanOrEqual(69);
    expect(verdict.score).toBe(66);
    expect(verdict.grade).toBe('C');
  });

  it('하드캡 우선순위: 종 > 알레르기 > 위험 성분', () => {
    expect(resolveDisplayVerdict(100, { speciesMismatch: true, allergyHits: 2, dangerCount: 3 })).toEqual({
      score: 0,
      grade: 'F',
      capReason: 'species',
    });
    expect(resolveDisplayVerdict(100, { allergyHits: 1, dangerCount: 3 })).toEqual({
      score: 9,
      grade: 'F',
      capReason: 'allergy',
    });
    expect(resolveDisplayVerdict(100, { dangerCount: 1 })).toEqual({
      score: 69,
      grade: 'C',
      capReason: 'danger',
    });
  });
});

describe('영양 계산 회귀 (golden)', () => {
  it('열량·건물기준·Ca:P·AAFCO 값이 고정되어 있다', () => {
    const analysis = analyzeFeed(CLEAN_PRODUCT, DOG);
    expect(analysis.calories?.per100g).toBe(357); // Modified Atwater
    expect(analysis.calories?.perKg).toBe(3565);
    expect(analysis.macrosDMB?.protein).toBe(33.3); // 건물기준 환산
    expect(analysis.caP.ratio).toBe(1.2);
    expect(analysis.aafco.passed).toBe(true);
    expect(analysis.score).toBe(96);
    expect(analysis.grade).toBe('A+');
  });

  it('1일 권장 급여량(RER/DER)이 고정되어 있다', () => {
    const analysis = analyzeFeed(CLEAN_PRODUCT, DOG);
    expect(analysis.feeding?.derKcal).toBe(374);
    expect(analysis.feeding?.gramsPerDay).toBe(105);
  });

  it('위험 성분이 있으면 사료 품질 점수가 낮아진다', () => {
    const analysis = analyzeFeed(DANGER_PRODUCT, DOG);
    expect(analysis.score).toBe(70);
    expect(analysis.grade).toBe('B');
  });
});

describe('성분 파이프라인 회귀 (golden)', () => {
  it('원료 등급·ETF·공개 수준이 고정되어 있다', () => {
    const pipeline = runScoringPipeline(CLEAN_PRODUCT);
    expect(pipeline.ingredientScore).toBe(5);
    expect(pipeline.rawMaterialGrade).toBe('A+');
    expect(pipeline.etfGrade).toBe('C2');
    expect(pipeline.nutritionDisclosureLevel).toBe('완전 공개');
  });
});

describe('Phase 2 관찰 플래그는 분석 결과를 바꾸지 않는다', () => {
  const ENV_KEY = 'VITE_ENABLE_PHASE2_ALIAS_OBSERVATION';
  const originalEnv = import.meta.env[ENV_KEY];

  afterEach(() => {
    import.meta.env[ENV_KEY] = originalEnv;
    vi.restoreAllMocks();
  });

  function snapshot() {
    const results = [CLEAN_PRODUCT, DANGER_PRODUCT].flatMap((product) =>
      [DOG, CAT, ALLERGIC_DOG].map((profile) => {
        const { raw, verdict } = verdictFor(product, profile);
        const feed = analyzeFeed(product, profile);
        return {
          raw,
          verdict,
          feedScore: feed.score,
          feedGrade: feed.grade,
          kcal: feed.calories?.per100g ?? null,
          caP: feed.caP.ratio,
          grams: feed.feeding?.gramsPerDay ?? null,
        };
      }),
    );
    return JSON.stringify(results);
  }

  it('OFF 와 ON 의 최종 점수·판정이 완전히 같다', () => {
    import.meta.env[ENV_KEY] = 'false';
    const off = snapshot();

    import.meta.env[ENV_KEY] = 'true';
    const on = snapshot();

    expect(on).toBe(off);
  });
});
