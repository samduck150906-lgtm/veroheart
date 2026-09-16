import { describe, expect, it } from 'vitest';
import {
  NO_ALLERGY_LABEL,
  addAllergen,
  isNoAllergySelected,
  removeAllergen,
  selectNoAllergy,
} from './allergyPicker';

/**
 * '없음'과 다른 항목을 동시에 고를 수 없어야 한다. 규칙으로 막는 대신 빈 목록을
 * '없음'으로 읽어 구조적으로 불가능하게 했다 — 이 테스트가 그 성질을 고정한다.
 */
describe('알레르기 없음 선택', () => {
  it('아무것도 고르지 않은 상태가 없음이다', () => {
    expect(isNoAllergySelected([])).toBe(true);
    expect(isNoAllergySelected(['닭고기'])).toBe(false);
  });

  it('없음을 고르면 고른 항목이 모두 비워진다', () => {
    expect(selectNoAllergy()).toEqual([]);
    expect(isNoAllergySelected(selectNoAllergy())).toBe(true);
  });

  it('항목을 추가하면 더 이상 없음이 아니다', () => {
    const next = addAllergen(selectNoAllergy(), '닭고기');
    expect(next).toEqual(['닭고기']);
    expect(isNoAllergySelected(next)).toBe(false);
  });

  it('마지막 항목을 빼면 다시 없음이 된다', () => {
    expect(isNoAllergySelected(removeAllergen(['닭고기'], '닭고기'))).toBe(true);
  });

  it("'없음' 이라는 이름 자체는 회피 성분으로 넣지 않는다", () => {
    // 목록에 섞이면 분석 엔진이 어느 제품에도 안 걸리는 성분으로 들고 다닌다.
    expect(addAllergen([], NO_ALLERGY_LABEL)).toEqual([]);
    expect(addAllergen(['닭고기'], NO_ALLERGY_LABEL)).toEqual(['닭고기']);
  });

  it('같은 성분을 표기만 다르게 두 번 넣지 않는다', () => {
    expect(addAllergen(['닭고기'], ' 닭고기 ')).toEqual(['닭고기']);
    expect(addAllergen(['닭 고기'], '닭고기')).toEqual(['닭 고기']);
  });

  it('빈 문자열은 무시한다', () => {
    expect(addAllergen(['닭고기'], '   ')).toEqual(['닭고기']);
  });

  it('없는 항목을 빼도 목록이 망가지지 않는다', () => {
    expect(removeAllergen(['닭고기'], '소고기')).toEqual(['닭고기']);
  });
});
