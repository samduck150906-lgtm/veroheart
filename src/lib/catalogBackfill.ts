import { buildCanonicalProductKey } from './productIdentity.ts';
import { isSourceLabelBrand } from '../utils/productDisplay.ts';
import { suggestProductNameCleanup } from '../utils/productNameCleanup.ts';

export interface LegacyCatalogProduct {
  id: string;
  name: string | null;
  brand_name: string | null;
  manufacturer_name?: string | null;
  manufacturer?: string | null;
  variant_name?: string | null;
  net_weight_text?: string | null;
  pet_type?: string | null;
  target_pet_type?: string | null;
  category?: string | null;
}

export interface CatalogBackfillCandidate {
  productId: string;
  rawAlias: string;
  displayName: string;
  brandName: string;
  canonicalProductKey: string | null;
  slug: string;
  reasons: string[];
  needsReview: boolean;
}

export function slugifyProductName(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/g, '');
}

export function buildCatalogBackfillCandidate(
  product: LegacyCatalogProduct,
): CatalogBackfillCandidate {
  const rawAlias = String(product.name ?? '').trim();
  const originalBrand = String(product.brand_name ?? '').trim();
  const cleanup = suggestProductNameCleanup({
    name: rawAlias,
    brandName: originalBrand,
  });
  const displayName = cleanup.name.trim();
  const brandName = cleanup.brandName.trim();
  const slug = slugifyProductName(displayName);
  const brandUncertain = !brandName || isSourceLabelBrand(brandName);
  const reasons = [...cleanup.reasons];

  if (brandUncertain) reasons.push('공개 브랜드를 안전하게 추출하지 못함');
  if (!displayName) reasons.push('공개 제품명이 비어 있음');
  if (!slug) reasons.push('검색 URL 슬러그를 만들 수 없음');

  return {
    productId: String(product.id ?? '').trim(),
    rawAlias,
    displayName,
    brandName,
    canonicalProductKey: buildCanonicalProductKey({
      manufacturer: product.manufacturer_name ?? product.manufacturer,
      brand: brandUncertain ? null : brandName,
      displayName,
      variant: product.variant_name,
      netWeight: product.net_weight_text,
      targetPetType: product.target_pet_type ?? product.pet_type ?? product.category,
    }),
    slug,
    reasons,
    needsReview: cleanup.needsReview || brandUncertain || !displayName || !slug,
  };
}
