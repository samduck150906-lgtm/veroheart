import { ValidationError, requireText, optionalText } from './validation.ts';

export function supportReason(value: unknown): string {
  return requireText(value, '정정·처리 사유', 500);
}

function numberOrNull(
  value: unknown,
  label: string,
  max: number,
  integer = false,
): number | null {
  if (value === null || value === '') return null;
  const n =
    typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : NaN;
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    n > max ||
    (integer && !Number.isInteger(n))
  ) {
    throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  }
  return n;
}

function choice(value: unknown, values: string[], label: string): string {
  if (typeof value !== 'string' || !values.includes(value))
    throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  return value;
}

function textList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
  return [...new Set(value.map((v) => requireText(v, label, 100)))];
}

export function normalizePetCorrection(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: requireText(raw.name, '반려동물 이름', 100),
    pet_type: choice(raw.pet_type, ['dog', 'cat'], '대상 종'),
    age_group: choice(raw.age_group, ['baby', 'adult', 'senior'], '연령대'),
    breed: optionalText(raw.breed, '품종', 100),
    weight: numberOrNull(raw.weight, '몸무게', 200),
    allergies: textList(raw.allergies, '알레르기'),
    conditions: textList(raw.conditions, '건강 고민'),
  };
}

export function normalizeDiaryCorrection(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const date = requireText(raw.feeding_date, '급여일', 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new ValidationError('급여일이 올바르지 않습니다.');
  }
  const time = optionalText(raw.feeding_time, '급여 시각', 8);
  if (time && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time))
    throw new ValidationError('급여 시각이 올바르지 않습니다.');
  return {
    feeding_date: date,
    feeding_time: time,
    meal_period: raw.meal_period
      ? choice(
          raw.meal_period,
          ['morning', 'lunch', 'dinner', 'snack', 'other'],
          '시간대',
        )
      : null,
    amount: numberOrNull(raw.amount, '급여량', 100000),
    unit: raw.unit
      ? choice(raw.unit, ['g', 'ml', '개', '정', '캡슐', '포', '스푼'], '단위')
      : null,
    preference_level: numberOrNull(raw.preference_level, '기호도', 5, true),
    memo: optionalText(raw.memo, '메모', 2000),
    reaction_note: optionalText(raw.reaction_note, '특이사항', 2000),
  };
}
