import type { Product, UserPetProfile, GuaranteedAnalysis } from '../types';
import {
  BREED_CONDITION_MAP,
  BREED_PRESCRIPTION,
  CONDITION_RULES,
  SKIN_BONUS_KEYWORDS,
  type NutritionRule,
  type ConfidenceLevel,
} from './breedRules';

export type RuleStatus = 'pass' | 'fail' | 'unknown';
export type ConditionStatus = 'pass' | 'fail' | 'partial' | 'unknown' | 'bonus_only';
export type ActivityLevel = 'high' | 'medium' | 'low';

export interface BreedRuleResult {
  ruleId: string;
  label: string;
  thresholdDisplay: string;
  actualDisplay: string;
  /** null = 미공개 또는 칼로리 정보 부족 */
  actualValue: number | null;
  status: RuleStatus;
  confidence: ConfidenceLevel;
  bonusPoints: number;
  penaltyPoints: number;
}

export interface BreedConditionResult {
  condition: string;
  status: ConditionStatus;
  ruleResults: BreedRuleResult[];
  score: number;
  note: string;
  /** 피부 질환 전용: 발견된 보조 성분 목록 */
  skinBonusIngredients?: string[];
}

export interface BreedScoreResult {
  breed: string;
  prescription: string;
  activeConditions: string[];
  conditionResults: BreedConditionResult[];
  /** 전체 가감점 합산 */
  netScore: number;
  /** 충돌 규칙 설명 (관절 vs 체중관리 등) */
  conflictNote?: string;
  activityLevel: ActivityLevel;
  /** 활동량에 따른 충돌 중재 멘트 */
  activityModifier?: string;
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────────

function resolveBreedKey(breed: string): string | null {
  // 정확 일치 우선, 그 다음 부분 일치
  if (BREED_CONDITION_MAP[breed]) return breed;
  const partial = Object.keys(BREED_CONDITION_MAP).find(
    (k) => breed.includes(k) || k.includes(breed)
  );
  return partial ?? null;
}

function getActivityLevel(profile: UserPetProfile): ActivityLevel {
  const p = (profile.personality ?? '').toLowerCase();
  if (p.includes('활발') || p.includes('에너지') || p.includes('⚡') || p.includes('활동')) return 'high';
  if (p.includes('조용') || p.includes('점잖') || p.includes('침착') || p.includes('느긋')) return 'low';
  return 'medium';
}

function getRaw(ga: GuaranteedAnalysis, key: string): number | null {
  const v = (ga as Record<string, unknown>)[key];
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * 저장 값을 규칙 비교 단위로 환산한다.
 * percent_direct → 그대로 반환
 * mg_per_kg      → rawMgKg / (kcalKg / 1000)
 * percent_to_mg_kg → rawPercent * 10_000 / (kcalKg / 1000)
 *   (1% = 10g/kg = 10_000mg/kg)
 */
function toComparable(rawValue: number, rule: NutritionRule, kcalKg?: number): number | null {
  if (rule.storedAs === 'percent_direct') return rawValue;
  if (!kcalKg || kcalKg <= 0) return null;
  const factor = kcalKg / 1000;
  if (rule.storedAs === 'mg_per_kg') return rawValue / factor;
  if (rule.storedAs === 'percent_to_mg_kg') return (rawValue * 10_000) / factor;
  return null;
}

function fmt(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(1)}%`;
  return `${Math.round(value).toLocaleString()}${unit}`;
}

// ─── 공개 API ──────────────────────────────────────────────────

/**
 * 견종 기반 영양 규칙을 제품에 적용해 점수 결과를 반환한다.
 * 프로필에 breed 없거나 매핑되지 않은 견종이면 null.
 */
export function calculateBreedScore(
  product: Product,
  profile: UserPetProfile
): BreedScoreResult | null {
  if (!profile.breed) return null;
  const breedKey = resolveBreedKey(profile.breed);
  if (!breedKey) return null;

  const conditions = BREED_CONDITION_MAP[breedKey];
  const ga: GuaranteedAnalysis = product.guaranteedAnalysis ?? {};
  const kcalKg = ga.caloriesKcalKg;
  const activityLevel = getActivityLevel(profile);

  const conditionResults: BreedConditionResult[] = conditions.map((condition) => {
    const rules = CONDITION_RULES[condition] ?? [];

    // 피부: 정량 규칙 없음 — 성분 키워드 보조 가점만
    if (rules.length === 0) {
      const found = SKIN_BONUS_KEYWORDS.filter((kw) =>
        product.ingredients.some(
          (ing) =>
            ing.nameKo.toLowerCase().includes(kw.toLowerCase()) ||
            (ing.nameEn ?? '').toLowerCase().includes(kw.toLowerCase())
        ) ||
        (product.healthConcerns ?? []).some((hc) =>
          hc.toLowerCase().includes(kw.toLowerCase())
        )
      );
      const deduped = [...new Set(found)];
      return {
        condition,
        status: 'bonus_only',
        ruleResults: [],
        score: Math.min(5, deduped.length * 2),
        note: '정량 기준 없음 — 오메가3·비타민A·E를 보조 후보로 확인합니다.',
        skinBonusIngredients: deduped,
      };
    }

    // 정량 규칙 평가
    const ruleResults: BreedRuleResult[] = rules.map((rule) => {
      const rawValue = getRaw(ga, rule.nutrientKey);
      const thresholdDisplay = `${rule.direction === 'min' ? '≥' : '≤'}${rule.threshold}${rule.displayUnit}`;

      if (rawValue === null) {
        return {
          ruleId: rule.id,
          label: rule.label,
          thresholdDisplay,
          actualDisplay: '미공개',
          actualValue: null,
          status: 'unknown',
          confidence: rule.confidence,
          bonusPoints: 0,
          penaltyPoints: 0,
        };
      }

      const comparable = toComparable(rawValue, rule, kcalKg);
      if (comparable === null) {
        return {
          ruleId: rule.id,
          label: rule.label,
          thresholdDisplay,
          actualDisplay: '칼로리 미공개',
          actualValue: null,
          status: 'unknown',
          confidence: rule.confidence,
          bonusPoints: 0,
          penaltyPoints: 0,
        };
      }

      const passes = rule.direction === 'min' ? comparable >= rule.threshold : comparable <= rule.threshold;
      const high = rule.confidence === 'high';

      return {
        ruleId: rule.id,
        label: rule.label,
        thresholdDisplay,
        actualDisplay: fmt(comparable, rule.displayUnit),
        actualValue: comparable,
        status: passes ? 'pass' : 'fail',
        confidence: rule.confidence,
        bonusPoints: passes ? (high ? 8 : 5) : 0,
        penaltyPoints: passes ? 0 : (high ? 6 : 3),
      };
    });

    const passCount = ruleResults.filter((r) => r.status === 'pass').length;
    const failCount = ruleResults.filter((r) => r.status === 'fail').length;
    const unknownCount = ruleResults.filter((r) => r.status === 'unknown').length;
    const total = ruleResults.length;

    let status: ConditionStatus;
    if (unknownCount === total) status = 'unknown';
    else if (failCount === 0 && unknownCount === 0) status = 'pass';
    else if (passCount === 0 && unknownCount === 0) status = 'fail';
    else status = 'partial';

    const bonus = ruleResults.reduce((s, r) => s + r.bonusPoints, 0);
    const penalty = ruleResults.reduce((s, r) => s + r.penaltyPoints, 0);

    const noteMap: Record<ConditionStatus, string> = {
      pass: '모든 기준 충족 — 가점',
      fail: '기준 미달 — 감점',
      partial: '일부 기준 충족 — 혼합 결과',
      unknown: '미공개 데이터 — 가점 박탈(직접 감점 없음)',
      bonus_only: '',
    };

    return {
      condition,
      status,
      ruleResults,
      score: bonus - penalty,
      note: noteMap[status],
    };
  });

  // ─── 충돌 감지: 관절(오메가 선호) vs 체중관리(저지방) ──────────
  const jointRes = conditionResults.find((r) => r.condition === '관절');
  const weightRes = conditionResults.find((r) => r.condition === '체중관리');
  let conflictNote: string | undefined;
  let activityModifier: string | undefined;

  if (jointRes && weightRes) {
    const fatRule = weightRes.ruleResults.find((r) => r.ruleId === 'fat');
    const epaDhaRule = jointRes.ruleResults.find((r) => r.ruleId === 'epa_dha');
    const hasConflict = fatRule?.status === 'fail' && epaDhaRule?.status !== 'fail';

    if (hasConflict) {
      conflictNote =
        '관절(오메가·고지방 선호)과 체중관리(저지방 선호)가 지방 함량을 두고 상반된 신호를 보냅니다. ' +
        '엔진은 더 엄격한 축 또는 활동량 보정으로 중재합니다.';

      if (activityLevel === 'high') {
        activityModifier =
          '활동량이 높아 에너지 소모가 크므로, 지방 함량의 체중관리 감점이 완화됩니다.';
      } else if (activityLevel === 'low') {
        activityModifier =
          '활동량이 낮거나 중성화된 경우, 지방 함량이 비만 리스크로 더 크게 감점됩니다.';
      } else {
        activityModifier =
          '활동량에 따라 지방 감점 비중이 달라집니다. 중성화 여부와 산책 빈도를 확인하세요.';
      }
    }
  }

  const prescription =
    BREED_PRESCRIPTION[breedKey] ??
    Object.entries(BREED_PRESCRIPTION).find(([k]) => profile.breed!.includes(k))?.[1] ??
    '';

  return {
    breed: profile.breed,
    prescription,
    activeConditions: conditions,
    conditionResults,
    netScore: conditionResults.reduce((s, r) => s + r.score, 0),
    conflictNote,
    activityLevel,
    activityModifier,
  };
}
