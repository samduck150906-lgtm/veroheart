import type { AllergyRelationshipMatch } from '../analysis/allergyFamilyMatcher';

export type AllergyDisplayLevel = 'hard' | 'caution' | 'none' | 'unknown';

export interface AllergyDisplayInput {
  allergyHits: string[];
  allergyCautions: AllergyRelationshipMatch[];
}

export interface AllergyDisplayState {
  level: AllergyDisplayLevel;
  shortText: string;
  summaryText: string;
}

export interface AllergyDisplayOptions {
  /** False means the product has no ingredient rows, so absence cannot be established. */
  hasIngredientData?: boolean;
  /** False means there is no saved allergy selection to compare against. */
  hasAllergyProfile?: boolean;
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

  if (options.hasIngredientData === false) {
    return {
      level: 'unknown',
      shortText: '원료 정보 부족',
      summaryText: '원료 정보가 부족해 등록 알레르기와의 일치 여부를 확인할 수 없음',
    };
  }

  if (options.hasAllergyProfile === false) {
    return {
      level: 'unknown',
      shortText: '프로필 미등록',
      summaryText: '프로필에 비교할 알레르기가 등록되지 않음',
    };
  }

  return {
    level: 'none',
    shortText: '직접 일치 미확인',
    summaryText: '현재 등록된 원료 정보에서 프로필 알레르기와 직접 일치하는 성분은 확인되지 않음',
  };
}
