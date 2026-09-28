export interface CanonicalProductIdentityInput {
  manufacturer?: string | null;
  brand?: string | null;
  displayName?: string | null;
  variant?: string | null;
  netWeight?: string | null;
  targetPetType?: string | null;
}

export function normalizeIdentityText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s·・,.'"`_\-/()[\]{}]/g, '');
}

function hasValidCheckDigit(value: string): boolean {
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  if (checkDigit === undefined) return false;

  const sum = digits.reduce(
    (total, digit, index) => total + digit * ((digits.length - index) % 2 === 1 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function normalizeBarcode(value: string): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  const normalized = digits.length === 12 ? `0${digits}` : digits;
  if (![8, 13, 14].includes(normalized.length)) return null;
  return hasValidCheckDigit(normalized) ? normalized : null;
}

export function buildCanonicalProductKey(input: CanonicalProductIdentityInput): string | null {
  const parts = [
    input.manufacturer,
    input.brand,
    input.displayName,
    input.variant,
    input.netWeight,
    input.targetPetType,
  ].map(normalizeIdentityText);

  return parts[2] && (parts[0] || parts[1]) ? parts.join('|') : null;
}
