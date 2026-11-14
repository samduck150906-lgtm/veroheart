import type { Ingredient, UserPetProfile } from '../types';
import { allergyCautionMatches, allergyIngredientNames } from './allergyFamilyMatcher';

/** One verdict for cards and both detail sheets; source/processing metadata is
 * retained in rawLabelText and assessed by the shared allergy relationship rules. */
export function assessIngredient(ingredient: Ingredient, profile?: UserPetProfile | null) {
  if (profile?.allergies.some(allergy => allergyIngredientNames([ingredient],allergy).length > 0)) {
    return { kind: 'allergy' as const, label: '알레르기', message: `${profile.name}의 등록한 회피 성분과 직접 일치합니다. 제품 포장의 성분표를 확인해 주세요.` };
  }
  if (profile && allergyCautionMatches([ingredient],profile.allergies).length > 0) {
    return { kind: 'caution' as const, label: '알레르기 관련 주의', message: `${profile.name}의 알레르기와 관련된 원료입니다. 직접 일치와는 구분되며 원료의 출처·가공 형태·정제도와 과거 급여 반응을 확인해 주세요.` };
  }
  if (ingredient.riskLevel === 'danger') return { kind: 'danger' as const, label: '주의 필요', message: '원료 정보에 위험 요인이 등록되어 있습니다. 설명과 제품 내 함량을 확인하고 급여 전 수의사와 상담해 주세요.' };
  if (ingredient.riskLevel === 'caution') return { kind: 'caution' as const, label: '주의', message: '급여량·건강 상태·원료 규격에 따라 주의가 필요한 원료입니다. 아래 설명과 제품 표시를 함께 확인해 주세요.' };
  if (ingredient.riskLevel === 'safe') return { kind: 'general' as const, label: '일반 원료', message: '원료 정보상 특별한 주의 사항은 확인되지 않았습니다. 배합량과 개별 반려동물에 대한 급여 적합성을 보장하는 의미는 아닙니다.' };
  return { kind: 'unknown' as const, label: '정보 부족', message: '이 원료의 특성을 판정할 근거가 부족합니다. 안전하다고 가정하거나 점수에 반영하지 않습니다.' };
}
