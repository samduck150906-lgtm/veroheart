import { describe, expect, it } from 'vitest';

import {
  buildExtractionRequest,
  ExtractionValidationError,
  validateExtractedProductLabel,
} from '../../netlify/functions/_shared/extractionSchema';

function validExtraction() {
  return {
    identity: {
      name: '오리지널 독',
      brand: '베로로',
      manufacturer: '베로로 제조',
      species: 'dog',
      productType: 'food',
      variantName: '연어',
      netWeightText: '2 kg',
    },
    labelPanels: {
      ingredientText: '연어, 쌀',
      nutritionText: '조단백질 24% 이상',
      registrationText: null,
    },
    ingredients: [
      { position: 1, name: '연어' },
      { position: 2, name: '쌀' },
    ],
    guaranteedComponents: [
      { name: '조단백질', value: 24, unit: '%', qualifier: 'min' },
    ],
    registeredComponents: [],
    fieldConfidence: {
      identity: 0.95,
      labelPanels: 0.9,
      ingredients: 0.88,
      components: 0.82,
      printedBarcode: 0.99,
    },
    printedBarcode: '0036000291452',
  };
}

describe('extraction schema', () => {
  it('accepts only the owned label-fact shape', () => {
    expect(validateExtractedProductLabel(validExtraction())).toEqual(validExtraction());
  });

  it('rejects extra safety, allergy, risk, or score fields', () => {
    expect(() => validateExtractedProductLabel({
      ...validExtraction(),
      allergyRisk: 'safe',
    })).toThrow(ExtractionValidationError);
  });

  it('rejects overlong strings and out-of-range percentages', () => {
    const overlong = validExtraction();
    overlong.identity.name = '가'.repeat(501);
    expect(() => validateExtractedProductLabel(overlong)).toThrow(ExtractionValidationError);

    const invalidPercent = validExtraction();
    invalidPercent.guaranteedComponents[0].value = 101;
    expect(() => validateExtractedProductLabel(invalidPercent)).toThrow(ExtractionValidationError);
  });

  it('rejects reordered or empty ingredient entries', () => {
    const reordered = validExtraction();
    reordered.ingredients[1].position = 3;
    expect(() => validateExtractedProductLabel(reordered)).toThrow(ExtractionValidationError);

    const empty = validExtraction();
    empty.ingredients[0].name = ' ';
    expect(() => validateExtractedProductLabel(empty)).toThrow(ExtractionValidationError);
  });

  it('uses Gemini 2.5 Flash with JSON output and treats package text as untrusted data', () => {
    const request = buildExtractionRequest(['https://signed.example/front.webp']);
    expect(request.model).toBe('gemini-2.5-flash');
    expect(request.config.responseMimeType).toBe('application/json');
    expect(JSON.stringify(request)).toContain('신뢰할 수 없는 데이터');
    expect(JSON.stringify(request)).toContain('위험도');
    expect(JSON.stringify(request)).toContain('https://signed.example/front.webp');
  });
});
