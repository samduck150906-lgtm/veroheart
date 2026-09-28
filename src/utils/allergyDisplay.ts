import type { AllergyRelationshipMatch } from '../analysis/allergyFamilyMatcher';

export type AllergyDisplayLevel = 'hard' | 'caution' | 'none' | 'unknown';
export type AllergyDisplayUnknownReason =
  | 'missing_ingredients'
  | 'missing_profile'
  | 'partial_ingredients'
  | 'conflicting_ingredients';

export interface AllergyDisplayNotice {
  badge: string;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface AllergyDisplayInput {
  allergyHits: string[];
  allergyCautions: AllergyRelationshipMatch[];
}

export interface AllergyDisplayState {
  level: AllergyDisplayLevel;
  shortText: string;
  summaryText: string;
  unknownReason?: AllergyDisplayUnknownReason;
  notice?: AllergyDisplayNotice;
}

export interface AllergyDisplayOptions {
  /** False means the product has no ingredient rows, so absence cannot be established. */
  hasIngredientData?: boolean;
  /** False means there is no saved allergy selection to compare against. */
  hasAllergyProfile?: boolean;
  analysisStatus?: 'unavailable' | 'partial' | 'ready' | 'blocked';
  unknownIngredientTerms?: string[];
}

function cautionShortText(matches: AllergyRelationshipMatch[]): string {
  if (matches.some((match) => match.kind === 'strong_caution')) return '가금류 출처 확인';
  if (matches.some((match) => match.kind === 'cross_caution')) return '관련 가금류 주의';
  if (matches.some((match) => match.kind === 'hydrolysis_caution')) return '가수분해 원료 주의';
  if (matches.some((match) => match.kind === 'processing_caution')) return '가금류 지방 주의';
  return '알레르기 관련 원료 주의';
}

export function buildAllergyDisplayState(
  input: AllergyDisplayInput,
  petName = '우리 아이',
  options: AllergyDisplayOptions = {},
): AllergyDisplayState {
  if (input.allergyHits.length > 0) {
    return {
      level: 'hard',
      shortText: input.allergyHits.join(', '),
      summaryText: `${petName}의 회피 성분 ${input.allergyHits.join('·')} 포함`,
    };
  }

  if (input.allergyCautions.length > 0) {
    return {
      level: 'caution',
      shortText: cautionShortText(input.allergyCautions),
      summaryText: `${petName}의 선택 알레르기와 직접 일치하는 원료는 확인되지 않았지만, 다른 가금류 관련 원료가 있어 성분표와 급여 반응 확인 필요`,
    };
  }

  if (options.hasIngredientData === false || options.analysisStatus === 'unavailable') {
    return {
      level: 'unknown',
      shortText: '원료 정보 부족',
      summaryText: '원료 정보가 부족해 등록 알레르기와의 일치 여부를 확인할 수 없음',
      unknownReason: 'missing_ingredients',
      notice: {
        badge: '원료 데이터 준비 중',
        title: '아직 등록된 원료 정보가 없어요',
        description: `제품의 전성분 정보가 준비되면 ${petName}의 알레르기와 비교해 알려드릴게요.`,
      },
    };
  }

  if (options.hasAllergyProfile === false) {
    return {
      level: 'unknown',
      shortText: '프로필 미등록',
      summaryText: '프로필에 비교할 알레르기가 등록되지 않음',
      unknownReason: 'missing_profile',
      notice: {
        badge: '맞춤 분석 준비',
        title: '알레르기 프로필을 채워주세요',
        description: '피해야 할 원료를 등록하면 이 제품의 전성분과 바로 비교해 드려요.',
        actionLabel: '알레르기 등록하기',
      },
    };
  }

  if (options.analysisStatus === 'partial') {
    const examples = (options.unknownIngredientTerms ?? []).slice(0, 3);
    return {
      level: 'unknown',
      shortText: '부분 분석',
      summaryText: '확인되지 않은 원료가 있어 알레르기 부분 분석만 제공됨',
      unknownReason: 'partial_ingredients',
      notice: {
        badge: '부분 분석',
        title: '확인되지 않은 원료가 있어 부분 분석만 제공해요',
        description: examples.length > 0
          ? `아직 확인되지 않은 원료: ${examples.join(', ')}`
          : '확인된 원료의 주의 항목은 표시했지만, 제품 전체가 안전하다고 판단할 수는 없어요.',
      },
    };
  }

  if (options.analysisStatus === 'blocked') {
    return {
      level: 'unknown',
      shortText: '확인 필요',
      summaryText: '원료 정보가 서로 달라 알레르기 분석을 완료하지 못함',
      unknownReason: 'conflicting_ingredients',
      notice: {
        badge: '정보 확인 중',
        title: '원료 정보가 서로 달라 확인이 필요해요',
        description: '서로 다른 표기를 검토한 뒤 분석 결과를 다시 제공할게요.',
      },
    };
  }

  return {
    level: 'none',
    shortText: '직접 일치 미확인',
    summaryText: '현재 등록된 원료 정보에서 프로필 알레르기와 직접 일치하는 성분은 확인되지 않음',
  };
}
