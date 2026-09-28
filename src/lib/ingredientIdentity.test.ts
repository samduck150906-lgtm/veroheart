import { describe, expect, it } from 'vitest';

import { buildIngredientIdentityKey } from './ingredientIdentity';

describe('buildIngredientIdentityKey', () => {
  it('keeps source part and processing form as separate identity dimensions', () => {
    expect(buildIngredientIdentityKey({ family: '닭', part: '육', process: 'raw' }))
      .not.toBe(buildIngredientIdentityKey({ family: '닭', part: '육', process: 'meal' }));
    expect(buildIngredientIdentityKey({ family: '닭', part: '지방', process: 'fat' }))
      .not.toBe(buildIngredientIdentityKey({ family: '닭', part: '단백질', process: 'hydrolyzed' }));
  });

  it('normalizes spacing and punctuation but never guesses omitted dimensions', () => {
    expect(buildIngredientIdentityKey({ family: ' 닭 ', part: '육', process: 'fresh' }))
      .toBe(buildIngredientIdentityKey({ family: '닭', part: '육 ', process: 'fresh' }));
    expect(buildIngredientIdentityKey({ family: '닭' })).toBe('닭||unknown');
  });

  it('rejects an empty source family', () => {
    expect(() => buildIngredientIdentityKey({ family: '  ' })).toThrow('ingredient_family_required');
  });
});
