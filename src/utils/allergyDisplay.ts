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

  if (options.hasIngredientData === true && options.analysisStatus === 'unavailable') {
    return { level: 'unknown', shortText: '원료 상세 확인 필요', summaryText: '전성분은 등록되었지만 원료별 분석이 준비되지 않아 알레르기 일치 여부를 모두 확인하지 못함',
      unknownReason: 'partial_ingredients', notice: { badge: '원료 상세 확인 필요', title: '전성분은 등록되어 있습니다', description: '원료별 특성을 모두 확인하지 못해 알레르기 일치 여부를 단정하지 않았습니다. 아래 원료 목록을 확인해 주세요.' } };
  }
  if ((options.hasIngredientData === false || options.analysisStatus === 'unavailable') &&
      !options.unknownIngredientTerms?.length && options.analysisStatus !== 'partial' && options.analysisStatus !== 'blocked') {
    return {
      level: 'unknown',
      shortText: '원료 정보 부족',
      summaryText: '원료 정보가 부족해 등록 알레르기와의 일치 여부를 확인할 수 없음',
      unknownReason: 'missing_ingredients',
      notice: {
        badge: '원료 데이터 준비 중',
        title: '아직 등록된 원료 정보가 없습니다',
        description: `제품의 전성분 정보가 준비되면 ${petName}의 알레르기와 비교해 알려드립니다.`,
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
        title: '알레르기 프로필을 채워 주세요',
        description: '피해야 할 원료를 등록하면 이 제품의 전성분과 바로 비교해 드립니다.',
        actionLabel: '알레르기 등록하기',
      },
    };
  }

  if (options.analysisStatus === 'partial' || (options.unknownIngredientTerms?.length ?? 0) > 0 && options.analysisStatus !== 'blocked') {
    const examples = (options.unknownIngredientTerms ?? []).slice(0, 3);
    return {
      level: 'unknown',
      shortText: '부분 분석',
      summaryText: '확인되지 않은 원료가 있어 알레르기 부분 분석만 제공됨',
      unknownReason: 'partial_ingredients',
      notice: {
        badge: '부분 분석',
        title: '확인되지 않은 원료가 있어 부분 분석만 제공합니다',
        description: examples.length > 0
          ? `아직 확인되지 않은 원료: ${examples.join(', ')}`
          : '확인된 원료의 주의 항목은 표시했지만, 제품 전체가 안전하다고 판단할 수는 없습니다.',
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
        title: '원료 정보가 서로 달라 확인이 필요합니다',
        description: '서로 다른 표기를 검토한 뒤 분석 결과를 다시 제공합니다.',
      },
    };
  }

  return {
    level: 'none',
    shortText: '직접 일치 미확인',
    summaryText: '현재 등록된 원료 정보에서 프로필 알레르기와 직접 일치하는 성분은 확인되지 않음',
  };
}
