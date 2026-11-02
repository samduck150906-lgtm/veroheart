import { normalizeBarcode } from './productIdentity';

export interface ScannedBarcode {
  rawValue: string;
  format?: string;
}

export function normalizeScannedBarcode(code: ScannedBarcode): string | null {
  const digits = code.rawValue.trim();
  if (!/^\d+$/.test(digits)) return null;
  if (code.format !== 'upc_e') return normalizeBarcode(digits);
  if (!/^[01]\d{7}$/.test(digits)) return null;

  // UPC-E has a compressed payload. Its checksum applies to the expanded UPC-A,
  // not to an EAN-8 with the same printed digits.
  const payload = digits.slice(1, 7);
  const last = payload[5];
  const expanded = last <= '2'
    ? `${payload.slice(0, 2)}${last}0000${payload.slice(2, 5)}`
    : last === '3'
      ? `${payload.slice(0, 3)}00000${payload.slice(3, 5)}`
      : last === '4'
        ? `${payload.slice(0, 4)}00000${payload[4]}`
        : `${payload.slice(0, 5)}0000${last}`;
  return normalizeBarcode(`${digits[0]}${expanded}${digits[7]}`);
}
