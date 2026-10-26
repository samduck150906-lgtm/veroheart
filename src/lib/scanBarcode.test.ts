import { describe, expect, it } from 'vitest';
import { normalizeScannedBarcode } from './scanBarcode';

describe('scanned retail barcode identity', () => {
  it('expands an explicitly detected UPC-E into its equivalent EAN-13', () => {
    expect(normalizeScannedBarcode({ rawValue: '04252614', format: 'upc_e' })).toBe('0042100005264');
  });

  it.each([
    ['01234505', '0012000003455'],
    ['01234523', '0012200003453'],
    ['01234531', '0012300000451'],
    ['01234543', '0012340000053'],
    ['01234558', '0012345000058'],
  ])('expands UPC-E %s using its compression rule', (rawValue, expected) => {
    expect(normalizeScannedBarcode({ rawValue, format: 'upc_e' })).toBe(expected);
  });

  it('preserves EAN-8 and normalizes UPC-A without guessing the symbology', () => {
    expect(normalizeScannedBarcode({ rawValue: '96385074', format: 'ean_8' })).toBe('96385074');
    expect(normalizeScannedBarcode({ rawValue: '036000291452', format: 'upc_a' })).toBe('0036000291452');
    expect(normalizeScannedBarcode({ rawValue: '04252614' })).toBeNull();
  });

  it('rejects text containing a valid number and invalid UPC-E check digits', () => {
    expect(normalizeScannedBarcode({ rawValue: 'LOT-036000291452', format: 'code_128' })).toBeNull();
    expect(normalizeScannedBarcode({ rawValue: 'https://example.test/036000291452', format: 'qr_code' })).toBeNull();
    expect(normalizeScannedBarcode({ rawValue: '04252615', format: 'upc_e' })).toBeNull();
  });
});
