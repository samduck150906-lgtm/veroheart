import { normalizeBarcode } from '../lib/productIdentity';
import type {
  ProductSpecies,
  ProductType,
  PublicationGateInput,
  PublicationGateResult,
  ScanPhotoCategory,
} from './types';

const PHOTO_CATEGORIES: ScanPhotoCategory[] = ['front', 'ingredient', 'nutrition'];
const SPECIES: ProductSpecies[] = ['dog', 'cat', 'all'];
const PRODUCT_TYPES: ProductType[] = ['food', 'treat', 'supplement'];

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function evaluatePublicationGate(input: PublicationGateInput): PublicationGateResult {
  if (!input.authenticated) return { ok: false, code: 'auth_required', fields: [] };

  const scannedBarcode = hasText(input.scannedBarcode)
    ? normalizeBarcode(input.scannedBarcode ?? '')
    : null;
  const printedBarcode = hasText(input.printedBarcode)
    ? normalizeBarcode(input.printedBarcode ?? '')
    : null;
  const invalidBarcodeFields = [
    hasText(input.scannedBarcode) && !scannedBarcode ? 'scannedBarcode' : null,
    hasText(input.printedBarcode) && !printedBarcode ? 'printedBarcode' : null,
  ].filter((field): field is string => Boolean(field));
  if (invalidBarcodeFields.length > 0) {
    return { ok: false, code: 'invalid_barcode', fields: invalidBarcodeFields };
  }
  if (scannedBarcode && printedBarcode && scannedBarcode !== printedBarcode) {
    return {
      ok: false,
      code: 'barcode_conflict',
      fields: ['scannedBarcode', 'printedBarcode'],
    };
  }

  const missingPhotos = PHOTO_CATEGORIES.filter(
    (category) => !input.photoPaths[category]?.some(hasText),
  );
  if (missingPhotos.length > 0) {
    return { ok: false, code: 'missing_photo', fields: missingPhotos };
  }

  const { confirmed } = input;
  const missingIdentity = [
    !hasText(confirmed.name) ? 'name' : null,
    !hasText(confirmed.brand) && !hasText(confirmed.manufacturer) ? 'brandOrManufacturer' : null,
    !confirmed.species || !SPECIES.includes(confirmed.species) ? 'species' : null,
    !confirmed.productType || !PRODUCT_TYPES.includes(confirmed.productType) ? 'productType' : null,
  ].filter((field): field is string => Boolean(field));
  if (missingIdentity.length > 0) {
    return { ok: false, code: 'missing_identity', fields: missingIdentity };
  }

  if (
    (confirmed.productType === 'food' || confirmed.productType === 'treat') &&
    !confirmed.ingredients.some(hasText)
  ) {
    return { ok: false, code: 'missing_ingredients', fields: ['ingredients'] };
  }
  if (
    confirmed.productType === 'supplement' &&
    !confirmed.registeredComponents.some((component) => hasText(component.name))
  ) {
    return {
      ok: false,
      code: 'missing_registration',
      fields: ['registeredComponents'],
    };
  }
  if (input.duplicateResolution === 'ambiguous') {
    return {
      ok: false,
      code: 'ambiguous_duplicate',
      fields: ['duplicateResolution'],
    };
  }

  return { ok: true };
}
