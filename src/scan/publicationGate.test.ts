import { describe, expect, it } from 'vitest';

import { evaluatePublicationGate } from './publicationGate';
import type { PublicationGateInput } from './types';

function validInput(overrides: Partial<PublicationGateInput> = {}): PublicationGateInput {
  return {
    authenticated: true,
    scannedBarcode: '8801234567893',
    printedBarcode: '8801234567893',
    duplicateResolution: 'none',
    photoPaths: {
      front: ['user/submission/front/image.webp'],
      ingredient: ['user/submission/ingredient/image.webp'],
      nutrition: ['user/submission/nutrition/image.webp'],
    },
    confirmed: {
      name: '오리지널 독',
      brand: '베로로',
      manufacturer: null,
      species: 'dog',
      productType: 'food',
      ingredients: ['연어', '쌀'],
      guaranteedComponents: [{ name: '조단백질', value: 24, unit: '%' }],
      registeredComponents: [],
    },
    ...overrides,
  };
}

describe('evaluatePublicationGate', () => {
  it.each(['food', 'treat'] as const)('accepts a complete %s label', (productType) => {
    const input = validInput({
      confirmed: { ...validInput().confirmed, productType },
    });

    expect(evaluatePublicationGate(input)).toEqual({ ok: true });
  });

  it('accepts a supplement with registered active components instead of ordinary ingredients', () => {
    const input = validInput({
      confirmed: {
        ...validInput().confirmed,
        productType: 'supplement',
        ingredients: [],
        guaranteedComponents: [],
        registeredComponents: [{ name: 'EPA+DHA', value: 300, unit: 'mg' }],
      },
    });

    expect(evaluatePublicationGate(input)).toEqual({ ok: true });
  });

  it('requires authentication before evaluating label data', () => {
    expect(evaluatePublicationGate(validInput({ authenticated: false }))).toEqual({
      ok: false,
      code: 'auth_required',
      fields: [],
    });
  });

  it('requires all three evidence categories', () => {
    const input = validInput({
      photoPaths: { ...validInput().photoPaths, ingredient: [] },
    });

    expect(evaluatePublicationGate(input)).toEqual({
      ok: false,
      code: 'missing_photo',
      fields: ['ingredient'],
    });
  });

  it('requires name, brand or manufacturer, species, and product type', () => {
    const input = validInput({
      confirmed: {
        ...validInput().confirmed,
        name: ' ',
        brand: null,
        manufacturer: null,
        species: null,
        productType: null,
      },
    });

    expect(evaluatePublicationGate(input)).toEqual({
      ok: false,
      code: 'missing_identity',
      fields: ['name', 'brandOrManufacturer', 'species', 'productType'],
    });
  });

  it('requires ordered ingredients for food and treats', () => {
    const input = validInput({
      confirmed: { ...validInput().confirmed, ingredients: [] },
    });

    expect(evaluatePublicationGate(input)).toEqual({
      ok: false,
      code: 'missing_ingredients',
      fields: ['ingredients'],
    });
  });

  it('requires registered components for supplements', () => {
    const input = validInput({
      confirmed: {
        ...validInput().confirmed,
        productType: 'supplement',
        ingredients: [],
        guaranteedComponents: [],
        registeredComponents: [],
      },
    });

    expect(evaluatePublicationGate(input)).toEqual({
      ok: false,
      code: 'missing_registration',
      fields: ['registeredComponents'],
    });
  });

  it('rejects invalid and conflicting barcodes', () => {
    expect(evaluatePublicationGate(validInput({ scannedBarcode: '123' }))).toEqual({
      ok: false,
      code: 'invalid_barcode',
      fields: ['scannedBarcode'],
    });
    expect(evaluatePublicationGate(validInput({ printedBarcode: '8801234567886' }))).toEqual({
      ok: false,
      code: 'barcode_conflict',
      fields: ['scannedBarcode', 'printedBarcode'],
    });
  });

  it('blocks ambiguous duplicate resolution', () => {
    expect(evaluatePublicationGate(validInput({ duplicateResolution: 'ambiguous' }))).toEqual({
      ok: false,
      code: 'ambiguous_duplicate',
      fields: ['duplicateResolution'],
    });
  });
});
