import { describe, expect, it } from 'vitest';
import {
  IngredientLabelParseError,
  MAX_LABEL_INGREDIENT_ITEMS,
  parseIngredientLabelItems,
} from './labelIngredientParser';

describe('parseIngredientLabelItems', () => {
  it('preserves order and raw processing/amount text', () => {
    expect(parseIngredientLabelItems('닭고기(생) 20%, 닭고기분, 가수분해 닭단백질')).toEqual([
      {
        order: 1,
        rawText: '닭고기(생) 20%',
        baseText: '닭고기',
        amountText: '20%',
        percentage: 20,
        parserMetadata: { parentheticalText: ['생'] },
      },
      {
        order: 2,
        rawText: '닭고기분',
        baseText: '닭고기분',
        amountText: null,
        percentage: null,
        parserMetadata: { parentheticalText: [] },
      },
      {
        order: 3,
        rawText: '가수분해 닭단백질',
        baseText: '가수분해 닭단백질',
        amountText: null,
        percentage: null,
        parserMetadata: { parentheticalText: [] },
      },
    ]);
  });

  it('does not split commas inside source notes and accepts line-separated bullets', () => {
    const parsed = parseIngredientLabelItems('- 어분(연어, 대구 원료) 12%\n- 현미\n3) 비트펄프');
    expect(parsed.map((item) => item.rawText)).toEqual([
      '어분(연어, 대구 원료) 12%', '현미', '비트펄프',
    ]);
    expect(parsed[0]).toMatchObject({
      baseText: '어분', amountText: '12%', percentage: 12,
      parserMetadata: { parentheticalText: ['연어, 대구 원료'] },
    });
  });

  it('preserves nested source notes without leaking them into the base name', () => {
    const [item] = parseIngredientLabelItems('어분(생선(연어, 대구), 새우) 10%');
    expect(item).toMatchObject({
      rawText: '어분(생선(연어, 대구), 새우) 10%',
      baseText: '어분',
      parserMetadata: { parentheticalText: ['생선(연어, 대구), 새우'] },
    });
  });

  it('preserves duplicate ingredients at different label positions', () => {
    const parsed = parseIngredientLabelItems('닭고기, 현미, 닭고기');
    expect(parsed.map((item) => [item.order, item.baseText])).toEqual([
      [1, '닭고기'], [2, '현미'], [3, '닭고기'],
    ]);
  });

  it('returns a bounded error above 100 items', () => {
    const text = Array.from({ length: MAX_LABEL_INGREDIENT_ITEMS + 1 }, (_, i) => `원료${i}`).join(',');
    expect(() => parseIngredientLabelItems(text)).toThrow(IngredientLabelParseError);
    try {
      parseIngredientLabelItems(text);
    } catch (error) {
      expect(error).toMatchObject({ code: 'too_many_items', itemCount: 101 });
    }
  });
});
