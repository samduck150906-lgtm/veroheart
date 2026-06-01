import { describe, expect, it } from 'vitest';
import { isValidCoupangLink, normalizeCoupangLink } from './coupangLink';

describe('isValidCoupangLink', () => {
  it('allows empty', () => {
    expect(isValidCoupangLink('')).toBe(true);
  });
  it('rejects non-https', () => {
    expect(isValidCoupangLink('http://www.coupang.com/foo')).toBe(false);
  });
  it('accepts coupa.ng', () => {
    expect(isValidCoupangLink('https://coupa.ng/abc')).toBe(true);
  });
  it('accepts coupang.com', () => {
    expect(isValidCoupangLink('https://www.coupang.com/vp/products/123')).toBe(true);
  });
});

describe('normalizeCoupangLink', () => {
  it('trims', () => {
    expect(normalizeCoupangLink('  https://coupa.ng/x  ')).toBe('https://coupa.ng/x');
  });
});
