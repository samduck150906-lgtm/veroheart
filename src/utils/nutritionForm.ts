/**
 * 관리자 등록성분 입력 폼 ↔ nutritional_profiles 저장값 변환.
 *
 * 화면에서 분리해 둔 이유는, 여기서 값을 어떻게 다루느냐가 곧 사용자에게 보이는
 * 숫자가 되기 때문이다. "칼슘 0%" 같은 값이 한 번 들어가면 화면은 그걸 제조사가
 * 신고한 값으로 읽는다. 그래서 테스트가 붙는 곳에 둔다.
 */

/** nutritional_profiles 의 등록성분 7가지 — 사료 표시기준의 의무 표기 항목과 같다. */
export const NUTRITION_KEYS = [
  'crude_protein',
  'crude_fat',
  'crude_fiber',
  'crude_ash',
  'moisture',
  'calcium',
  'phosphorus',
] as const;

export type NutritionKey = (typeof NUTRITION_KEYS)[number];

/** 입력 폼 — 값은 문자열로 다루고 저장할 때 숫자로 바꾼다. */
export type NutritionForm = Record<NutritionKey, string>;

export const EMPTY_NUTRITION: NutritionForm = {
  crude_protein: '',
  crude_fat: '',
  crude_fiber: '',
  crude_ash: '',
  moisture: '',
  calcium: '',
  phosphorus: '',
};

export const NUTRITION_FIELDS: { key: NutritionKey; label: string }[] = [
  { key: 'crude_protein', label: '조단백질 (%)' },
  { key: 'crude_fat', label: '조지방 (%)' },
  { key: 'crude_fiber', label: '조섬유 (%)' },
  { key: 'crude_ash', label: '조회분 (%)' },
  { key: 'moisture', label: '수분 (%)' },
  { key: 'calcium', label: '칼슘 (%)' },
  { key: 'phosphorus', label: '인 (%)' },
];

/**
 * 저장할 값으로 바꾼다. 비워 둔 칸은 null 이다 — 0 이 아니다.
 *
 * 예전에는 빈 칸을 0 으로 보냈다. 그러면 조단백질만 알고 칼슘은 모르는 제품이
 * "칼슘 0%" 로 저장되고, 화면은 그걸 제조사 신고값으로 읽는다. 모르는 것은
 * 모른다고 두는 편이 낫다(마이그레이션 20260903120000 이 NULL 을 허용해 둔 이유다).
 *
 * 하나도 채우지 않았으면 null 을 돌려준다 — 빈 행을 만들지 않는다.
 */
export function buildNutritionPayload(form: NutritionForm): Record<NutritionKey, number | null> | null {
  const parsed = {} as Record<NutritionKey, number | null>;
  let hasAny = false;

  for (const key of NUTRITION_KEYS) {
    const raw = (form[key] ?? '').trim();
    if (!raw) {
      parsed[key] = null;
      continue;
    }
    const value = Number.parseFloat(raw);
    // 숫자로 읽히지 않으면 값이 없는 것으로 본다. 0 으로 바꾸면 오히려 틀린 값이 된다.
    if (!Number.isFinite(value)) {
      parsed[key] = null;
      continue;
    }
    parsed[key] = value;
    hasAny = true;
  }

  return hasAny ? parsed : null;
}

/** 저장된 값을 폼으로 되돌린다. 없는 값은 빈 칸이다 — 0 으로 보이면 안 된다. */
export function toNutritionForm(row: Partial<Record<NutritionKey, number | null>> | null): NutritionForm {
  const form = { ...EMPTY_NUTRITION };
  if (!row) return form;
  for (const key of NUTRITION_KEYS) {
    const value = row[key];
    form[key] = value == null ? '' : String(value);
  }
  return form;
}
