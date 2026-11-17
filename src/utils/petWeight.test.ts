import { describe, expect, it } from 'vitest';
import { hasSupportedPetWeight, petWeightError } from './petWeight';

describe('pet weight input policy', () => {
  it.each(['999', '-1', '0', 'NaN', 'Infinity', '1kg', '1e2'])('rejects malformed or unsupported input %s', value => {
    expect(petWeightError('Dog', value)).toBeTruthy();
    expect(hasSupportedPetWeight('Dog', value)).toBe(false);
  });
  it('allows optional omission, decimals and inclusive input limits', () => {
    expect(petWeightError('Cat', undefined)).toBeNull();
    expect(hasSupportedPetWeight('Cat', undefined)).toBe(false);
    for (const value of ['.25', '6.', 6.8, 30]) expect(hasSupportedPetWeight('Cat', value)).toBe(true);
    expect(hasSupportedPetWeight('Cat', 30.01)).toBe(false);
    expect(hasSupportedPetWeight('Dog', 150)).toBe(true);
    expect(hasSupportedPetWeight('Dog', 150.01)).toBe(false);
  });
});
