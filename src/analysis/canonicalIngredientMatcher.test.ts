import { describe, expect, it } from 'vitest';
import { matchCanonicalIngredients } from './canonicalIngredientMatcher';
import { parseIngredientLabelItems } from './labelIngredientParser';

const canonicals = [
  { id: 'chicken-meat', canonicalName: '닭고기', aliases: ['닭 고기', 'Chicken-meat', '공통별칭'] },
  { id: 'chicken-meal', canonicalName: '닭고기분말', aliases: ['치킨 밀', '공통별칭'] },
];

describe('matchCanonicalIngredients', () => {
  it('matches only normalized exact canonical names and reviewed aliases', () => {
    const matches = matchCanonicalIngredients(
      parseIngredientLabelItems('닭. 고기, Chicken-meat, 닭고기분말'),
      canonicals,
    );
    expect(matches.map((match) => match.canonicalIngredientId)).toEqual([
      'chicken-meat', 'chicken-meat', 'chicken-meal',
    ]);
  });

  it('does not fuzzy-match a longer ingredient name', () => {
    const [match] = matchCanonicalIngredients(parseIngredientLabelItems('닭고기분'), [canonicals[0]]);
    expect(match).toMatchObject({
      rawText: '닭고기분', matchStatus: 'unmatched', canonicalIngredientId: null,
    });
  });

  it('returns every collision candidate instead of selecting the first', () => {
    const [match] = matchCanonicalIngredients(parseIngredientLabelItems('공통 별칭'), canonicals);
    expect(match).toMatchObject({
      matchStatus: 'ambiguous',
      canonicalIngredientId: null,
      candidateCanonicalIds: ['chicken-meal', 'chicken-meat'],
    });
  });

  it('preserves source item order and unknown raw text', () => {
    const matches = matchCanonicalIngredients(parseIngredientLabelItems('현미, 모르는 원료(분말), 현미'), []);
    expect(matches.map((match) => [match.order, match.rawText, match.matchStatus])).toEqual([
      [1, '현미', 'unmatched'],
      [2, '모르는 원료(분말)', 'unmatched'],
      [3, '현미', 'unmatched'],
    ]);
  });
});
