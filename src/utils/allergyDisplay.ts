import type { AllergyRelationshipMatch } from '../analysis/allergyFamilyMatcher';

export type AllergyDisplayLevel = 'hard' | 'caution' | 'none';

export interface AllergyDisplayInput {
  allergyHits: string[];
  allergyCautions: AllergyRelationshipMatch[];
}

export interface AllergyDisplayState {
  level: AllergyDisplayLevel;
  shortText: string;
  summaryText: string;
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
      summaryText: `${petName}의 알레르기와 관련된 원료가 있어 급여 전 확인 필요`,
    };
  }

  return {
    level: 'none',
    shortText: '해당 없음',
    summaryText: '등록된 알레르기 성분 없음',
  };
}
