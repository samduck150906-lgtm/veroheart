/** Product input limits, not diagnostic definitions of a healthy weight. */
export const PET_WEIGHT_LIMIT_KG = { Dog: 150, Cat: 30 } as const;

export function petWeightError(species: 'Dog' | 'Cat', value: unknown): string | null {
  if (value == null || value === '') return null;
  const max = PET_WEIGHT_LIMIT_KG[species];
  const text = String(value).trim();
  const weight = Number(text);
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(weight) && weight > 0 && weight <= max
    ? null : `몸무게는 0보다 크고 ${max}kg 이하인 숫자로 입력해 주세요. 단위가 kg인지 확인해 주세요.`;
}

export function hasSupportedPetWeight(species: 'Dog' | 'Cat', value: unknown): boolean {
  return value != null && value !== '' && petWeightError(species, value) === null;
}
