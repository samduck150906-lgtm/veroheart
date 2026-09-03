import { describe, expect, it } from 'vitest';
import {
  buildNutritionPayload,
  EMPTY_NUTRITION,
  toNutritionForm,
  type NutritionForm,
} from './nutritionForm';

const form = (partial: Partial<NutritionForm>): NutritionForm => ({ ...EMPTY_NUTRITION, ...partial });

describe('관리자 등록성분 입력', () => {
  it('비워 둔 칸은 0 이 아니라 null 로 저장한다', () => {
    // 조단백질·조지방만 아는 제품. 예전에는 나머지가 0 으로 들어가서
    // 화면이 "칼슘 0%" 를 제조사 신고값으로 읽었다.
    const payload = buildNutritionPayload(form({ crude_protein: '28', crude_fat: '16' }));
    expect(payload).toEqual({
      crude_protein: 28,
      crude_fat: 16,
      crude_fiber: null,
      crude_ash: null,
      moisture: null,
      calcium: null,
      phosphorus: null,
    });
  });

  it('사람이 직접 넣은 0 은 0 으로 저장한다', () => {
    // 비운 것과 0 을 적은 것은 다르다. 후자는 제조사가 0 이라고 신고한 것이다.
    const payload = buildNutritionPayload(form({ crude_protein: '28', calcium: '0' }));
    expect(payload?.calcium).toBe(0);
  });

  it('한 칸도 채우지 않으면 아무것도 저장하지 않는다', () => {
    expect(buildNutritionPayload(EMPTY_NUTRITION)).toBeNull();
  });

  it('공백만 넣은 칸은 빈 칸으로 본다', () => {
    expect(buildNutritionPayload(form({ crude_protein: '   ' }))).toBeNull();
  });

  it('숫자로 읽히지 않는 값은 0 으로 바꾸지 않는다', () => {
    const payload = buildNutritionPayload(form({ crude_protein: '28', crude_fat: '미표시' }));
    expect(payload?.crude_fat).toBeNull();
  });

  it('소수점을 그대로 지킨다', () => {
    expect(buildNutritionPayload(form({ crude_protein: '28.5' }))?.crude_protein).toBe(28.5);
  });

  it('저장된 값을 폼으로 되돌릴 때 모르는 값은 빈 칸이다', () => {
    // null 을 '0' 으로 되돌리면, 열어 보기만 해도 0 이 저장된다.
    expect(toNutritionForm({ crude_protein: 28, calcium: null })).toEqual(
      form({ crude_protein: '28' }),
    );
  });

  it('저장된 0 은 폼에서도 0 으로 보인다', () => {
    expect(toNutritionForm({ calcium: 0 }).calcium).toBe('0');
  });

  it('영양정보가 없는 제품은 전부 빈 칸이다', () => {
    expect(toNutritionForm(null)).toEqual(EMPTY_NUTRITION);
  });
});
