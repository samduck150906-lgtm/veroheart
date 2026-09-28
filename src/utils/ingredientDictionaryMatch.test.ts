import { describe, expect, it } from 'vitest';
import { matchIngredientNames, normalizeIngredientName } from './ingredientDictionaryMatch';

const dictionary = [
  { id: '1', nameKo: '닭고기', nameEn: 'Chicken', aliases: ['치킨'] },
  { id: '2', nameKo: '현미', nameEn: 'Brown rice', aliases: [] },
  { id: '3', nameKo: '닭고기분말', nameEn: 'Chicken meal', aliases: null },
  { id: '4', nameKo: '연어유', nameEn: null, aliases: ['새먼오일'] },
];

describe('원재료 이름 사전 대조', () => {
  it('정식 명칭·영문명·별칭으로 찾는다', () => {
    const { matched, unmatched } = matchIngredientNames(['현미', 'Chicken', '새먼오일'], dictionary);
    expect(matched.map((m) => m.entry.id)).toEqual(['2', '1', '4']);
    expect(unmatched).toEqual([]);
  });

  it('표기 흔들림은 흡수하되 다른 원료는 구분한다', () => {
    const { matched, unmatched } = matchIngredientNames(['닭 고기', '닭고기분말'], dictionary);
    expect(matched.map((m) => m.entry.id)).toEqual(['1', '3']);
    expect(unmatched).toEqual([]);
  });

  it('사전에 없으면 추측하지 않고 그대로 돌려준다', () => {
    const { matched, unmatched } = matchIngredientNames(['닭가슴살', '타피오카'], dictionary);
    expect(matched).toEqual([]);
    expect(unmatched).toEqual(['닭가슴살', '타피오카']);
  });

  it('라벨 순서를 지키고 같은 성분은 한 번만 잇는다', () => {
    const { matched } = matchIngredientNames(['현미', '닭고기', '닭 고기'], dictionary);
    expect(matched.map((m) => m.entry.nameKo)).toEqual(['현미', '닭고기']);
  });

  it('라벨에 적혀 있던 표기를 함께 돌려준다', () => {
    const { matched } = matchIngredientNames(['치킨'], dictionary);
    expect(matched[0]).toMatchObject({ name: '치킨' });
    expect(matched[0].entry.nameKo).toBe('닭고기');
  });

  it('표준형은 공백·가운뎃점·대소문자를 지운다', () => {
    expect(normalizeIngredientName(' 닭 고기 ')).toBe('닭고기');
    expect(normalizeIngredientName('Brown Rice')).toBe('brownrice');
    expect(normalizeIngredientName('비타민·E')).toBe('비타민e');
  });
});
