# Catalog and Search Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every raw product title while adding clean product identity fields, ranked catalog search, concise public display, and crawlable product metadata.

**Architecture:** Additive Supabase columns and evidence tables keep legacy reads working while `display_name` and aliases become the public/search surface. Pure TypeScript identity and cleanup functions produce reviewable candidates; a database RPC performs indexed ranking. Netlify metadata endpoints expose the same known facts as the SPA without crawler-only content.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Vitest 5, Supabase/PostgreSQL with `pg_trgm`, Netlify Functions and Edge Functions

**Spec:** `docs/superpowers/specs/2026-09-25-community-product-scan-catalog-design.md`

## Global Constraints

- Keep existing product IDs and `/product/:id` URLs valid.
- Never overwrite or delete a source title; preserve it as an observation or alias.
- Never use retailer source labels such as `쿠팡검색` as public brands.
- Fuzzy similarity may rank candidates but may not merge products.
- UI copy must be concise and factual.
- Use test-driven development and commit each task independently.
- Production backfill must run as a report-only dry run before any write.

## Review Focus

- A 12-digit UPC and its zero-padded 13-digit representation resolve to one key; Task 1 tests this.
- Two products with the same name but different package size do not share a canonical key; Task 1 tests this.
- A noisy title containing a real flavor and life-stage keeps those identity fields; Task 3 tests this.
- Search terms containing PostgREST wildcard/control characters cannot alter the query; Task 4 tests server-side normalization.
- Product metadata fails open to the SPA when Supabase or the edge function is unavailable; Task 6 tests bypass behavior.

---

### Task 1: Product identity primitives and additive catalog schema

**Files:**
- Create: `src/lib/productIdentity.ts`
- Create: `src/lib/productIdentity.test.ts`
- Create: `supabase/migrations/20260925100000_community_catalog_foundation.sql`
- Create: `src/lib/communityCatalogMigration.test.ts`

**Interfaces:**
- Consumes: raw barcode and product identity fields.
- Produces: `normalizeBarcode(value): string | null`, `normalizeIdentityText(value): string`, `buildCanonicalProductKey(input): string | null`, and additive catalog tables/columns.

- [ ] **Step 1: Write failing identity tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildCanonicalProductKey, normalizeBarcode } from './productIdentity';

describe('product identity', () => {
  it('normalizes UPC-A to the same GTIN-13 representation', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
    expect(normalizeBarcode('0036000291452')).toBe('0036000291452');
  });

  it('rejects an invalid check digit', () => {
    expect(normalizeBarcode('0036000291453')).toBeNull();
  });

  it('keeps package size in the fallback key', () => {
    const base = { manufacturer: 'A', brand: 'B', displayName: '연어 사료', variant: '성견', targetPetType: 'dog' };
    expect(buildCanonicalProductKey({ ...base, netWeight: '1kg' }))
      .not.toBe(buildCanonicalProductKey({ ...base, netWeight: '3kg' }));
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/productIdentity.test.ts`  
Expected: FAIL because `productIdentity.ts` does not exist.

- [ ] **Step 3: Implement identity primitives**

```ts
export interface CanonicalProductIdentityInput {
  manufacturer?: string | null;
  brand?: string | null;
  displayName?: string | null;
  variant?: string | null;
  netWeight?: string | null;
  targetPetType?: string | null;
}

export function normalizeIdentityText(value: string | null | undefined): string {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s·・,.'"`_\-/()[\]{}]/g, '');
}

function validCheckDigit(value: string): boolean {
  const digits = [...value].map(Number);
  const check = digits.pop();
  if (check === undefined) return false;
  const sum = digits.reduce((total, digit, index) => total + digit * ((digits.length - index) % 2 === 1 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function normalizeBarcode(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 12 ? `0${digits}` : digits;
  if (![8, 13, 14].includes(normalized.length) || !validCheckDigit(normalized)) return null;
  return normalized;
}

export function buildCanonicalProductKey(input: CanonicalProductIdentityInput): string | null {
  const parts = [input.manufacturer, input.brand, input.displayName, input.variant, input.netWeight, input.targetPetType]
    .map(normalizeIdentityText);
  return parts[2] && (parts[0] || parts[1]) ? parts.join('|') : null;
}
```

- [ ] **Step 4: Add migration-contract tests**

Assert that the migration adds `display_name`, `normalized_name`, `variant_name`, `net_weight_text`, `normalized_brand_name`, `canonical_product_key`, `slug`, `catalog_source`, `analysis_status`, and `last_observed_at`; creates `product_aliases` and `product_observations`; enables RLS; exposes only searchable aliases publicly; and does not update/delete existing rows.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npx vitest run src/lib/productIdentity.test.ts src/lib/communityCatalogMigration.test.ts`  
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/productIdentity.ts src/lib/productIdentity.test.ts src/lib/communityCatalogMigration.test.ts supabase/migrations/20260925100000_community_catalog_foundation.sql
git commit -m "feat: add catalog identity foundation"
```

### Task 2: Map clean catalog fields through every product query

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/supabaseRowTypes.ts`
- Modify: `src/lib/supabaseRowTypes.test.ts`
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/productSelectColumns.test.ts`

**Interfaces:**
- Consumes: new nullable database columns from Task 1.
- Produces: `Product.displayName`, `variantName`, `netWeightText`, `slug`, `catalogSource`, and `analysisStatus` with legacy fallbacks.

- [ ] **Step 1: Write a failing row-mapping test**

Add a row whose `name` is a noisy retailer title and whose `display_name` is `오리지널 독`; assert `mapped.name` keeps the raw title and `mapped.displayName` is clean. Assert database status `reviewed` maps without being downgraded to `pending`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/supabaseRowTypes.test.ts`  
Expected: FAIL because the new fields and `reviewed` union member are absent.

- [ ] **Step 3: Extend product types and mapper**

```ts
export type ProductVerificationStatus = 'pending' | 'reviewed' | 'verified';
export type ProductAnalysisStatus = 'unavailable' | 'partial' | 'ready' | 'blocked';

// Add to Product:
displayName?: string;
variantName?: string;
netWeightText?: string;
slug?: string;
catalogSource?: 'legacy' | 'community_scan' | 'external' | 'admin';
analysisStatus?: ProductAnalysisStatus;
verificationStatus?: ProductVerificationStatus;
```

Map `display_name ?? undefined` without replacing `name`, and accept only the exact status union values.

- [ ] **Step 4: Add the columns to all product select lists**

Add this exact sequence after `name` in list, detail, barcode, search, recent-view, and recommendation queries:

```text
display_name, variant_name, net_weight_text, slug, catalog_source, analysis_status
```

Update `productSelectColumns.test.ts` so a future query cannot silently omit them.

- [ ] **Step 5: Run focused and dependent tests**

Run: `npx vitest run src/lib/supabaseRowTypes.test.ts src/lib/productSelectColumns.test.ts src/utils/productDisplay.test.ts`  
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/supabaseRowTypes.ts src/lib/supabaseRowTypes.test.ts src/lib/supabase.ts src/lib/productSelectColumns.test.ts
git commit -m "feat: expose clean catalog fields"
```

### Task 3: Produce non-destructive clean-name backfill candidates

**Files:**
- Modify: `src/utils/productNameCleanup.ts`
- Modify: `src/utils/productNameCleanup.test.ts`
- Create: `src/lib/catalogBackfill.ts`
- Create: `src/lib/catalogBackfill.test.ts`
- Create: `scripts/dry-run-catalog-backfill.mjs`

**Interfaces:**
- Consumes: legacy `id`, `name`, `brand_name`, and optional manufacturer/category fields.
- Produces: `buildCatalogBackfillCandidate(product)` with raw alias, display name, brand candidate, canonical key, slug candidate, reasons, and `needsReview`.

- [ ] **Step 1: Add failing cleanup tests for identity-bearing tokens**

Test that `연어`, `전연령`, `피부`, `3kg`, and `참치맛` survive cleanup while `로켓배송`, `무료배송`, seller bundle counts, and fake brand `쿠팡검색` do not become public fields.

- [ ] **Step 2: Run tests and verify RED for the backfill API**

Run: `npx vitest run src/utils/productNameCleanup.test.ts src/lib/catalogBackfill.test.ts`  
Expected: FAIL because `catalogBackfill.ts` is absent.

- [ ] **Step 3: Implement the candidate builder**

```ts
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
  return value.normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
```

Use `suggestProductNameCleanup` and `buildCanonicalProductKey`; return review-required when brand extraction is uncertain or the slug/display name is empty.

- [ ] **Step 4: Implement a read-only dry-run script**

The script must issue GET requests only, print aggregate counts and at most 25 redacted before/after examples, report canonical-key collisions, and exit non-zero if any existing ID would be lost. It must never print Supabase keys and must reject a `--write` argument.

- [ ] **Step 5: Run tests and a fixture-backed dry run**

Run: `npx vitest run src/utils/productNameCleanup.test.ts src/lib/catalogBackfill.test.ts`  
Run: `node scripts/dry-run-catalog-backfill.mjs --fixture src/lib/fixtures/catalog-backfill.json`  
Expected: tests pass; script reports candidates without mutations.

- [ ] **Step 6: Commit**

```bash
git add src/utils/productNameCleanup.ts src/utils/productNameCleanup.test.ts src/lib/catalogBackfill.ts src/lib/catalogBackfill.test.ts src/lib/fixtures/catalog-backfill.json scripts/dry-run-catalog-backfill.mjs
git commit -m "feat: add catalog cleanup dry run"
```

### Task 4: Replace client-composed search with a ranked database RPC

**Files:**
- Create: `supabase/migrations/20260925110000_ranked_catalog_search.sql`
- Create: `src/lib/catalogSearchMigration.test.ts`
- Modify: `src/lib/supabase.ts`
- Modify: `src/pages/Search.tsx`
- Modify: `src/utils/searchSuggestions.ts`
- Modify: `src/utils/searchSuggestions.test.ts`

**Interfaces:**
- Consumes: `search_catalog_products(p_query, p_category, p_pet_type, p_limit, p_offset)`.
- Produces: ranked compact rows which are hydrated through the existing mapper.

- [ ] **Step 1: Write failing SQL contract tests**

Assert the RPC normalizes query text, assigns descending weights for barcode/name/brand/alias/ingredient/trigram, filters `is_visible = true`, escapes web-search input by using parameters, caps the limit at 100, and returns a stable secondary order by product ID.

- [ ] **Step 2: Run the migration test and verify RED**

Run: `npx vitest run src/lib/catalogSearchMigration.test.ts`  
Expected: FAIL because the migration is absent.

- [ ] **Step 3: Implement indexed search SQL**

Create generated/search-maintained normalized columns and GIN indexes. The RPC must use `websearch_to_tsquery('simple', p_query)` for token search and parameterized comparisons for barcode and trigram ranking. Alias rows participate only when `is_searchable = true`.

- [ ] **Step 4: Switch `searchProducts` to the RPC**

Call the RPC first, return `[]` for a blank query only when no filters exist, fetch full product rows by the ranked IDs, and restore RPC order with an ID-to-rank map. Keep the legacy query behind a single temporary fallback used only when PostgREST reports that the RPC is missing.

- [ ] **Step 5: Test hostile and mixed queries**

Add tests for `%`, `_`, commas, quotes, a full barcode, `오리젠 퍼피`, an ingredient-only term, and a typo. Assert no raw PostgREST `.or()` string is built from user input.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/lib/catalogSearchMigration.test.ts src/utils/searchSuggestions.test.ts src/lib/postgrestPattern.test.ts`  
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260925110000_ranked_catalog_search.sql src/lib/catalogSearchMigration.test.ts src/lib/supabase.ts src/pages/Search.tsx src/utils/searchSuggestions.ts src/utils/searchSuggestions.test.ts
git commit -m "feat: add ranked catalog search"
```

### Task 5: Show concise catalog identity and verification state

**Files:**
- Modify: `src/utils/productDisplay.ts`
- Modify: `src/utils/productDisplay.test.ts`
- Create: `src/components/ProductVerificationBadge.tsx`
- Create: `src/components/ProductVerificationBadge.test.tsx`
- Modify: `src/components/ProductCard.tsx`
- Create: `src/components/ProductCard.test.tsx`
- Modify: `src/components/ProductRow.tsx`
- Modify: `src/pages/Detail.tsx`
- Modify: `src/pages/Comparison.tsx`

**Interfaces:**
- Consumes: clean fields from Task 2.
- Produces: `getProductDisplayParts(product)` and a shared factual verification badge.

- [ ] **Step 1: Write failing display tests**

```ts
expect(getProductDisplayParts({
  brand: '오리젠', name: '쿠팡 원문', displayName: '오리지널 독',
  variantName: '닭고기 · 성견', netWeightText: '2kg', catalogSource: 'community_scan',
})).toEqual({ brand: '오리젠', name: '오리지널 독', meta: '닭고기 · 성견 · 2kg' });
```

Render the badge and assert pending community products say exactly `사용자 스캔 · 검증 전`; verified products say `정보 확인 완료`; source-label brands render no brand line.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run src/utils/productDisplay.test.ts src/components/ProductVerificationBadge.test.tsx`  
Expected: FAIL because the shared APIs are absent.

- [ ] **Step 3: Implement shared display parts and badge**

Prefer `displayName`; join only non-empty variant and weight with ` · `. Keep analysis state messaging separate from verification state.

- [ ] **Step 4: Replace duplicated card/row/detail display markup**

Use the shared parts in all listed components. Limit cards to brand, two-line name, one-line meta, and one verification badge. Do not add explanatory marketing copy.

- [ ] **Step 5: Run component and page tests**

Run: `npx vitest run src/utils/productDisplay.test.ts src/components/ProductVerificationBadge.test.tsx src/components/ProductCard.test.tsx src/pages/helmetTitle.test.ts`  
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/productDisplay.ts src/utils/productDisplay.test.ts src/components/ProductVerificationBadge.tsx src/components/ProductVerificationBadge.test.tsx src/components/ProductCard.tsx src/components/ProductRow.tsx src/pages/Detail.tsx src/pages/Comparison.tsx
git commit -m "feat: show clean catalog identity"
```

### Task 6: Add stable product URLs, metadata, and sitemap

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Detail.tsx`
- Create: `netlify/functions/product-sitemap.ts`
- Create: `netlify/functions/product-sitemap.test.ts`
- Create: `netlify/edge-functions/product-metadata.ts`
- Create: `netlify/edge-functions/product-metadata.test.ts`
- Modify: `netlify.toml`

**Interfaces:**
- Consumes: public product ID, slug, display name, brand, image, verification state.
- Produces: `/product/:id/:slug`, `/sitemap-products.xml`, and identical product metadata for users and crawlers.

- [ ] **Step 1: Write failing URL and metadata tests**

Assert both `/product/:id` and `/product/:id/:slug` render `Detail`; the canonical URL includes ID and slug; unknown/private products are absent from sitemap; XML escapes `&`, `<`, and quotes; edge failures return `context.next()` unchanged.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run netlify/functions/product-sitemap.test.ts netlify/edge-functions/product-metadata.test.ts`  
Expected: FAIL because the functions are absent.

- [ ] **Step 3: Implement the sitemap function**

Use modern Netlify default export plus `config.path = '/sitemap-products.xml'`. Fetch only `id,slug,last_observed_at` where `is_visible=true`, emit UTF-8 XML, and return `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.

- [ ] **Step 4: Implement edge metadata injection**

Match `/product/:id` and `/product/:id/:slug`, fetch the compact public product row, call `context.next()`, and replace only the existing title/description/canonical/JSON-LD placeholders. On timeout, missing row, non-HTML response, or exception, return the untouched response.

- [ ] **Step 5: Update SPA routing and Helmet canonical metadata**

Keep the old route and add `product/:id/:slug`. Generate the same title, description, canonical URL, and known-facts-only Product JSON-LD as the edge layer.

- [ ] **Step 6: Run focused tests and build**

Run: `npx vitest run netlify/functions/product-sitemap.test.ts netlify/edge-functions/product-metadata.test.ts src/pages/helmetTitle.test.ts`  
Run: `npm run build`  
Expected: all tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/pages/Detail.tsx netlify/functions/product-sitemap.ts netlify/functions/product-sitemap.test.ts netlify/edge-functions/product-metadata.ts netlify/edge-functions/product-metadata.test.ts netlify.toml
git commit -m "feat: publish product metadata and sitemap"
```

### Task 7: Verify catalog foundation and produce the reviewed dry-run artifact

**Files:**
- Create: `docs/catalog-backfill-dry-run-2026-09-25.md`
- Create: `scripts/apply-catalog-backfill.mjs`
- Create: `scripts/apply-catalog-backfill.test.mjs`

**Interfaces:**
- Consumes: completed Tasks 1-6 and production read-only credentials.
- Produces: a reviewed report; no production writes.

- [ ] **Step 1: Run the production dry run in read-only mode**

Run: `node scripts/dry-run-catalog-backfill.mjs` with public Supabase read credentials.  
Expected: counts for changed names, brand candidates, review-required rows, empty results, slug collisions, and canonical-key collisions; zero write requests.

- [ ] **Step 2: Record the artifact**

Write the exact run timestamp, commit SHA, aggregate results, collision groups, and up to 25 representative before/after examples. Redact credentials and contributor data.

- [ ] **Step 3: Write and test the guarded apply script**

The script accepts only the dry-run JSON artifact plus `--confirm` set to that file's lowercase SHA-256. It updates empty clean catalog columns and inserts the legacy raw title as a searchable alias in one product-sized transaction. It skips `needsReview=true`, canonical-key collisions, non-empty existing clean fields, and rows changed after the artifact timestamp. It writes an append-only result journal and never changes `products.name`.

Run: `node --test scripts/apply-catalog-backfill.test.mjs`  
Expected: fixture tests prove checksum mismatch, stale row, collision, and pre-existing clean fields are skipped; raw names remain unchanged.

- [ ] **Step 4: Apply deterministic rows and re-run the dry run**

Run in PowerShell: `$artifactHash=(Get-FileHash -Algorithm SHA256 '.artifacts/catalog-backfill.json').Hash.ToLower(); node scripts/apply-catalog-backfill.mjs --artifact .artifacts/catalog-backfill.json --confirm $artifactHash`  
Run: `node scripts/dry-run-catalog-backfill.mjs`  
Expected: only previously approved deterministic rows change; second dry run reports those rows as already clean and preserves every source title.

- [ ] **Step 5: Run full verification**

Run: `npm test -- --run`  
Run: `npm run lint`  
Run: `npm run build`  
Run: `git diff --check`  
Expected: 0 failed tests, lint exit 0, build exit 0, diff check exit 0.

- [ ] **Step 6: Commit**

```bash
git add docs/catalog-backfill-dry-run-2026-09-25.md scripts/apply-catalog-backfill.mjs scripts/apply-catalog-backfill.test.mjs
git commit -m "docs: record catalog cleanup dry run"
```
