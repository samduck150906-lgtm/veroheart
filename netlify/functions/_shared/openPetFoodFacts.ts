import { normalizeBarcode } from '../../../src/lib/productIdentity';

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'quantity',
  'image_front_url',
  'ingredients_text',
  'nutriments',
  'categories_tags',
].join(',');

export const OPEN_PET_FOOD_FACTS_TIMEOUT_MS = 5_000;

export class ExternalLookupError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'ExternalLookupError';
    this.code = code;
  }
}

export type OpenPetFoodFactsObservation =
  | { found: false; sourceUrl: string }
  | {
      found: true;
      sourceUrl: string;
      barcode: string;
      name: string | null;
      brands: string | null;
      quantity: string | null;
      imageFrontUrl: string | null;
      ingredientsText: string | null;
      nutriments: Record<string, number | string | null>;
      categories: string[];
    };

interface LookupOptions {
  fetchImpl?: typeof fetch;
}

function limitedString(value: unknown, max = 2_000): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function safeNutriments(value: unknown): Record<string, number | string | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const safe: Record<string, number | string | null> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[a-z0-9_-]{1,80}$/i.test(key) || /(?:risk|score|grade|nova)/i.test(key)) continue;
    if (typeof raw === 'number' && Number.isFinite(raw)) safe[key] = raw;
    else if (typeof raw === 'string') safe[key] = raw.slice(0, 100);
    else if (raw === null) safe[key] = null;
  }
  return safe;
}

export async function lookupOpenPetFoodFacts(
  rawBarcode: string,
  options: LookupOptions = {},
): Promise<OpenPetFoodFactsObservation> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode) throw new ExternalLookupError('invalid_barcode');
  const sourceUrl = `https://world.openpetfoodfacts.org/product/${barcode}`;
  const url = new URL(`https://world.openpetfoodfacts.org/api/v3/product/${barcode}`);
  url.searchParams.set('fields', FIELDS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPEN_PET_FOOD_FACTS_TIMEOUT_MS);

  try {
    const response = await (options.fetchImpl ?? fetch)(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'VeroHeart/1.0 (community product label lookup)',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new ExternalLookupError('external_unavailable');

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ExternalLookupError('external_invalid_response');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ExternalLookupError('external_invalid_response');
    }
    const root = payload as Record<string, unknown>;
    if (root.status === 0) return { found: false, sourceUrl };
    if (root.status !== 1 || !root.product || typeof root.product !== 'object') {
      throw new ExternalLookupError('external_invalid_response');
    }
    const product = root.product as Record<string, unknown>;
    const categories = Array.isArray(product.categories_tags)
      ? product.categories_tags
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 50)
        .map((item) => item.slice(0, 100))
      : [];
    return {
      found: true,
      sourceUrl,
      barcode,
      name: limitedString(product.product_name, 500),
      brands: limitedString(product.brands, 500),
      quantity: limitedString(product.quantity, 100),
      imageFrontUrl: limitedString(product.image_front_url, 2_000),
      ingredientsText: limitedString(product.ingredients_text, 10_000),
      nutriments: safeNutriments(product.nutriments),
      categories,
    };
  } catch (error) {
    if (error instanceof ExternalLookupError) throw error;
    if (controller.signal.aborted) throw new ExternalLookupError('external_timeout');
    throw new ExternalLookupError('external_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}
