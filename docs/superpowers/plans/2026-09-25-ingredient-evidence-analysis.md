# Ingredient Evidence and Deterministic Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every observed label ingredient into a traceable canonical match or visible unknown, grow an evidence-backed ingredient registry, and prevent partial data from being presented as completely safe.

**Architecture:** Extend the existing non-destructive canonical ingredient schema instead of replacing legacy tables. Preserve ordered raw label items, resolve only normalized exact names and reviewed aliases, and queue every unknown/ambiguous term. A versioned deterministic engine records readiness and evidence; new aliases/rules trigger bounded re-analysis.

**Tech Stack:** TypeScript, Vitest, Supabase/PostgreSQL, existing canonical ingredient tables and Phase 2 alias resolver, Netlify/Supabase background operations

**Spec:** `docs/superpowers/specs/2026-09-25-community-product-scan-catalog-design.md`

## Global Constraints

- OCR and language models may not set risk, allergen, health benefit, or score.
- Exact canonical names and reviewed aliases are the only automatic safety matches.
- Preserve ingredient label order and raw text.
- Distinguish source family, anatomical part, and processing form.
- Unknown ingredients remain public as raw terms and force `partial` analysis.
- `partial`, `unavailable`, and `blocked` results may not claim complete safety.
- Danger/toxicity rules override aggregate scores.
- Use printed nutrition values only; dry-matter conversion requires moisture.
- Facts and citations may be stored; proprietary source definitions may not be copied wholesale.

## Review Focus

- `닭고기`, `닭고기분`, `닭지방`, and `가수분해 닭단백질` share a family but remain distinct canonicals; Task 1 tests this.
- Parenthetical processing information is preserved in raw text even when a base candidate is extracted; Task 3 tests this.
- An alias collision returns `ambiguous` and cannot silently select the first row; Task 3 tests this.
- One unknown item among twenty known items still prevents a complete-safe verdict; Task 4 tests this.
- Re-analysis after alias activation is bounded, idempotent, and cannot change results for unaffected products; Task 6 tests this.

---

### Task 1: Extend canonical ingredients with source and processing dimensions

**Files:**
- Create: `supabase/migrations/20260925140000_ingredient_source_dimensions.sql`
- Create: `src/lib/ingredientSourceMigration.test.ts`
- Modify: `src/lib/canonicalIngredientTypes.ts`
- Create: `src/lib/ingredientIdentity.ts`
- Create: `src/lib/ingredientIdentity.test.ts`

**Interfaces:**
- Consumes: existing `canonical_ingredients` and aliases.
- Produces: source-family/part/form dimensions and `buildIngredientIdentityKey`.

- [ ] **Step 1: Write failing migration tests**

Assert additive columns `source_family`, `source_species`, `source_part`, `processing_form`, and `identity_key`; an index on family; a unique active identity-key constraint; no mutation of legacy `ingredients`; and RLS remains enabled.

- [ ] **Step 2: Write failing identity tests**

```ts
expect(buildIngredientIdentityKey({ family: '닭', part: '육', process: 'raw' }))
  .not.toBe(buildIngredientIdentityKey({ family: '닭', part: '육', process: 'meal' }));
expect(buildIngredientIdentityKey({ family: '닭', part: '지방', process: 'rendered' }))
  .not.toBe(buildIngredientIdentityKey({ family: '닭', part: '단백질', process: 'hydrolyzed' }));
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npx vitest run src/lib/ingredientSourceMigration.test.ts src/lib/ingredientIdentity.test.ts`  
Expected: FAIL because the migration/module is absent.

- [ ] **Step 4: Implement normalized ingredient dimensions**

```ts
export type IngredientProcessingForm = 'raw' | 'fresh' | 'dried' | 'meal' | 'oil' | 'fat' | 'hydrolyzed' | 'extract' | 'fermented' | 'unknown';

export function buildIngredientIdentityKey(input: {
  family: string; part?: string | null; process?: IngredientProcessingForm | null;
}): string {
  return [input.family, input.part ?? '', input.process ?? 'unknown']
    .map(normalizeIngredientName)
    .join('|');
}
```

Keep `canonical_name_ko` as the public label. Dimensions describe identity and must not be generated from fuzzy matching.

- [ ] **Step 5: Run focused tests and commit**

Run: `npx vitest run src/lib/ingredientSourceMigration.test.ts src/lib/ingredientIdentity.test.ts src/lib/canonicalIngredientMigration.test.ts`  
Expected: all tests pass.

```bash
git add supabase/migrations/20260925140000_ingredient_source_dimensions.sql src/lib/ingredientSourceMigration.test.ts src/lib/canonicalIngredientTypes.ts src/lib/ingredientIdentity.ts src/lib/ingredientIdentity.test.ts
git commit -m "feat: model ingredient source dimensions"
```

### Task 2: Build a source registry and complete observed-ingredient seed

**Files:**
- Create: `data/ingredient-source-registry.json`
- Create: `scripts/build-canonical-ingredient-seed.mjs`
- Create: `scripts/build-canonical-ingredient-seed.test.mjs`
- Create: `data/canonical-ingredient-seed.schema.json`
- Create: `docs/ingredient-source-policy.md`

**Interfaces:**
- Consumes: public-read legacy ingredients, observed label terms, and approved primary-source registry.
- Produces: a deterministic JSON seed containing every currently observed ingredient as `active`, `draft`, or `needs_review`, with citations and collision report.

- [ ] **Step 1: Define and test the registry schema**

Registry entries require `id`, `organization`, `title`, `url`, `sourceType`, `jurisdiction`, `accessedAt`, and `allowedUses`. Seed entries require canonical names, normalized key, dimensions, aliases, evidence source IDs, status, and legacy ID where applicable. Reject duplicate source IDs, duplicate normalized aliases, source-less active rows, and arbitrary retailer evidence for risk claims.

- [ ] **Step 2: Add the approved primary sources**

Add exact registry entries for FDA Animal Food Ingredients, FDA Animal Food Labeling, AAFCO ingredient-list guidance, EU Regulation 68/2013 feed-material catalogue, the applicable MAFRA pet-food labeling material, Merck Veterinary Manual food allergy, and Cornell Small Animal Toxins. Mark retailer pages `discovery_only` if present; do not use them as evidence.

- [ ] **Step 3: Write the seed builder tests**

Use fixtures containing legacy rows, duplicate punctuation/spacing forms, an alias collision, and an unseen label term. Assert every input term appears exactly once in output or review queue; active rows have evidence; collisions never choose a winner; output order and checksum are deterministic; and no source text longer than the allowed claim-summary limit is copied.

- [ ] **Step 4: Run the seed-builder test and verify RED**

Run: `node --test scripts/build-canonical-ingredient-seed.test.mjs`  
Expected: FAIL because the builder is absent.

- [ ] **Step 5: Implement the read-only seed builder**

The builder merges exact normalized names, attaches legacy IDs, and emits three files under a temporary output directory: `canonical-seed.json`, `review-queue.json`, and `seed-report.json`. It never writes Supabase. A legacy ingredient without approved evidence becomes `draft`, not implicitly safe. Every observed unmatched label is included in `review-queue.json` with occurrence count and affected product IDs.

- [ ] **Step 6: Run against fixtures and production public reads**

Run: `node --test scripts/build-canonical-ingredient-seed.test.mjs`  
Run: `node scripts/build-canonical-ingredient-seed.mjs --output .artifacts/ingredient-seed-2026-09-25`  
Expected: every publicly readable legacy/observed term is accounted for; no writes; report includes exact counts and collisions.

- [ ] **Step 7: Write the source policy and commit**

Document source precedence, citation fields, licensing checks, claim-summary limits, reviewed activation, and why general web pages cannot set safety.

```bash
git add data/ingredient-source-registry.json data/canonical-ingredient-seed.schema.json scripts/build-canonical-ingredient-seed.mjs scripts/build-canonical-ingredient-seed.test.mjs docs/ingredient-source-policy.md
git commit -m "feat: build evidence-backed ingredient seed"
```

### Task 3: Preserve structured label items and resolve exact canonical matches

**Files:**
- Create: `src/analysis/labelIngredientParser.ts`
- Create: `src/analysis/labelIngredientParser.test.ts`
- Create: `src/analysis/canonicalIngredientMatcher.ts`
- Create: `src/analysis/canonicalIngredientMatcher.test.ts`
- Modify: `src/utils/productLabelParse.ts`
- Modify: `src/utils/productLabelParse.test.ts`
- Create: `supabase/migrations/20260925150000_label_item_ingestion.sql`
- Create: `src/lib/labelItemIngestionMigration.test.ts`

**Interfaces:**
- Consumes: raw confirmed label text and active canonical/alias rows.
- Produces: ordered `ParsedIngredientLabelItem[]` and exact match outcomes.

- [ ] **Step 1: Write failing parser tests**

```ts
expect(parseIngredientLabelItems('닭고기(생) 20%, 닭고기분, 가수분해 닭단백질')).toEqual([
  { order: 1, rawText: '닭고기(생) 20%', baseText: '닭고기', amountText: '20%', percentage: 20 },
  { order: 2, rawText: '닭고기분', baseText: '닭고기분', amountText: null, percentage: null },
  { order: 3, rawText: '가수분해 닭단백질', baseText: '가수분해 닭단백질', amountText: null, percentage: null },
]);
```

Also test nested source notes, newlines, English commas inside parentheses, duplicate labels at different positions, and more than 100 items returning a bounded parse error.

- [ ] **Step 2: Write failing matcher tests**

Assert spacing/punctuation aliases match; `닭고기` does not match `닭고기분말`; an alias owned by two canonical rows returns `ambiguous`; unknown raw text is preserved; and output order matches input.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npx vitest run src/analysis/labelIngredientParser.test.ts src/analysis/canonicalIngredientMatcher.test.ts`  
Expected: FAIL because modules are absent.

- [ ] **Step 4: Implement structured parsing and matching**

Return raw text, extracted base text, amount text, percentage, and parser metadata. Use a multimap from normalized key to canonical IDs; zero candidates = `unmatched`, one = `matched`, more than one = `ambiguous`. Do not deduplicate repeated label positions in the label-set table.

- [ ] **Step 5: Add one idempotent ingestion RPC**

The service-role-only RPC accepts product ID, source reference, raw label text, and JSON items; marks the prior current label set false; inserts one current set and ordered items; and upserts unmatched/ambiguous terms into the canonical review queue. A request ID uniqueness key makes retries safe.

- [ ] **Step 6: Run focused tests and commit**

Run: `npx vitest run src/analysis/labelIngredientParser.test.ts src/analysis/canonicalIngredientMatcher.test.ts src/utils/productLabelParse.test.ts src/lib/labelItemIngestionMigration.test.ts`  
Expected: all tests pass.

```bash
git add src/analysis/labelIngredientParser.ts src/analysis/labelIngredientParser.test.ts src/analysis/canonicalIngredientMatcher.ts src/analysis/canonicalIngredientMatcher.test.ts src/utils/productLabelParse.ts src/utils/productLabelParse.test.ts supabase/migrations/20260925150000_label_item_ingestion.sql src/lib/labelItemIngestionMigration.test.ts
git commit -m "feat: preserve and match ordered label ingredients"
```

### Task 4: Compute analysis readiness and block false-safe conclusions

**Files:**
- Create: `src/analysis/analysisReadiness.ts`
- Create: `src/analysis/analysisReadiness.test.ts`
- Modify: `src/analysis/types.ts`
- Modify: `src/analysis/feedAnalysis.ts`
- Modify: `src/analysis/feedAnalysis.test.ts`
- Modify: `src/analysis/ruleEngine.ts`
- Modify: `src/analysis/ruleEngine.test.ts`
- Modify: `src/utils/allergyDisplay.ts`
- Modify: `src/utils/allergyDisplay.test.ts`
- Modify: `src/pages/Detail.tsx`

**Interfaces:**
- Consumes: label item match statuses and deterministic analysis output.
- Produces: `AnalysisReadiness` and verdict-copy guard.

- [ ] **Step 1: Write failing readiness tests**

```ts
expect(getAnalysisReadiness([])).toEqual({ status: 'unavailable', unknownCount: 0, ambiguousCount: 0 });
expect(getAnalysisReadiness([{ matchStatus: 'matched' }, { matchStatus: 'unmatched' }]).status).toBe('partial');
expect(getAnalysisReadiness([{ matchStatus: 'matched' }]).status).toBe('ready');
```

Add a regression test proving a partial product with no triggered known risks does not produce `안전`, `문제없음`, or equivalent complete-safe copy.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run src/analysis/analysisReadiness.test.ts src/utils/allergyDisplay.test.ts`  
Expected: FAIL because readiness is not wired.

- [ ] **Step 3: Implement readiness and engine metadata**

```ts
export interface AnalysisReadiness {
  status: 'unavailable' | 'partial' | 'ready' | 'blocked';
  unknownCount: number;
  ambiguousCount: number;
  reasonCodes: string[];
}
```

Known danger/warning findings remain visible in partial mode. Overall safe/compatible labels require `ready`. Persist the engine version and label-set ID on the result.

- [ ] **Step 4: Implement concise UI states**

- unavailable: `등록된 원료 정보가 없어요`
- partial: `확인되지 않은 원료가 있어 부분 분석만 제공해요`
- blocked: `원료 정보가 서로 달라 확인이 필요해요`

List raw unknown terms and omit any complete-safe badge in non-ready states.

- [ ] **Step 5: Run focused tests and commit**

Run: `npx vitest run src/analysis/analysisReadiness.test.ts src/analysis/feedAnalysis.test.ts src/analysis/ruleEngine.test.ts src/utils/allergyDisplay.test.ts`  
Expected: all tests pass.

```bash
git add src/analysis/analysisReadiness.ts src/analysis/analysisReadiness.test.ts src/analysis/types.ts src/analysis/feedAnalysis.ts src/analysis/feedAnalysis.test.ts src/analysis/ruleEngine.ts src/analysis/ruleEngine.test.ts src/utils/allergyDisplay.ts src/utils/allergyDisplay.test.ts src/pages/Detail.tsx
git commit -m "fix: prevent safe verdicts for partial labels"
```

### Task 5: Use reviewed source-family relationships for allergy comparison

**Files:**
- Create: `src/analysis/allergenRelationships.ts`
- Create: `src/analysis/allergenRelationships.test.ts`
- Modify: `src/analysis/allergyFamilyMatcher.ts`
- Create: `src/analysis/allergyFamilyMatcher.test.ts`
- Create: `supabase/migrations/20260925160000_allergen_family_relationships.sql`
- Create: `src/lib/allergenFamilyMigration.test.ts`

**Interfaces:**
- Consumes: canonical ingredient, reviewed allergen relationship, pet allergy source family.
- Produces: evidence-bearing `contains`, `derived_from`, `may_contain`, or `cross_contact` findings.

- [ ] **Step 1: Write failing relationship tests**

Test direct chicken meat as `contains`; chicken meal as reviewed `derived_from`; chicken fat remains unknown unless a reviewed map exists; hydrolyzed chicken retains its processing form and follows its own reviewed rule; unreviewed family-name similarity produces no definitive match.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run src/analysis/allergenRelationships.test.ts src/analysis/allergyFamilyMatcher.test.ts`  
Expected: FAIL because reviewed family resolution is absent.

- [ ] **Step 3: Add source-family allergen mapping schema**

Create a reviewed relationship table with source family, allergen ID, relationship type, processing-form condition, species scope, evidence source ID, review actor/date, and active flag. Revoke client writes; allow public read of active reviewed rows only.

- [ ] **Step 4: Implement relationship resolution**

Return findings with canonical ingredient ID/name, raw label text, relationship type, processing form, confidence, and evidence source. The algorithm may use only active reviewed rows.

- [ ] **Step 5: Run focused tests and commit**

Run: `npx vitest run src/analysis/allergenRelationships.test.ts src/analysis/allergyFamilyMatcher.test.ts src/lib/allergenFamilyMigration.test.ts`  
Expected: all tests pass.

```bash
git add src/analysis/allergenRelationships.ts src/analysis/allergenRelationships.test.ts src/analysis/allergyFamilyMatcher.ts src/analysis/allergyFamilyMatcher.test.ts supabase/migrations/20260925160000_allergen_family_relationships.sql src/lib/allergenFamilyMigration.test.ts
git commit -m "feat: compare reviewed allergen families"
```

### Task 6: Re-analyze only affected products after ingredient review

**Files:**
- Create: `src/analysis/reanalysisScope.ts`
- Create: `src/analysis/reanalysisScope.test.ts`
- Create: `supabase/migrations/20260925170000_ingredient_reanalysis_queue.sql`
- Create: `src/lib/reanalysisMigration.test.ts`
- Create: `netlify/functions/reanalyze-products.ts`
- Create: `netlify/functions/reanalyze-products.test.ts`
- Modify: `supabase/functions/admin-ingredient-review/index.ts`

**Interfaces:**
- Consumes: activated alias/canonical/rule IDs.
- Produces: deduplicated affected product IDs and idempotent versioned analysis refresh.

- [ ] **Step 1: Write failing scope tests**

Assert alias activation selects products whose current label items have the normalized term; a rule change selects products linked to that canonical ID; duplicate triggers yield one product; unaffected products are absent; and a queue retry keeps the same target engine version.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run src/analysis/reanalysisScope.test.ts src/lib/reanalysisMigration.test.ts netlify/functions/reanalyze-products.test.ts`  
Expected: FAIL because queue/worker are absent.

- [ ] **Step 3: Implement queue schema and admin enqueue**

Use unique `(product_id, engine_version_id)` rows with status `pending`, `processing`, `completed`, or `failed`; attempt count; lease expiry; stable error code; and timestamps. Admin resolution enqueues affected products in the same transaction.

- [ ] **Step 4: Implement bounded background worker**

Claim at most 100 rows with `FOR UPDATE SKIP LOCKED`, run deterministic analysis, persist versioned result, update `products.analysis_status`, and mark each row. The worker is safe to invoke repeatedly and never calls AI.

- [ ] **Step 5: Run focused tests and commit**

Run: `npx vitest run src/analysis/reanalysisScope.test.ts src/lib/reanalysisMigration.test.ts netlify/functions/reanalyze-products.test.ts`  
Expected: all tests pass.

```bash
git add src/analysis/reanalysisScope.ts src/analysis/reanalysisScope.test.ts supabase/migrations/20260925170000_ingredient_reanalysis_queue.sql src/lib/reanalysisMigration.test.ts netlify/functions/reanalyze-products.ts netlify/functions/reanalyze-products.test.ts supabase/functions/admin-ingredient-review/index.ts
git commit -m "feat: reanalyze affected ingredient products"
```

### Task 7: Expose ingredient evidence and research queues to operations

**Files:**
- Modify: `src/pages/admin/AdminIngredients.tsx`
- Modify: `src/pages/admin/AdminIngredients.test.tsx`
- Modify: `supabase/functions/admin-ingredient-review/index.ts`
- Create: `scripts/audit-ingredient-coverage.mjs`
- Create: `docs/ingredient-coverage-2026-09-25.md`

**Interfaces:**
- Consumes: seed report, unmatched queue, evidence, aliases, and re-analysis state.
- Produces: review UI and a coverage artifact accounting for every observed term.

- [ ] **Step 1: Write failing admin tests**

Assert the queue sorts by occurrence count; shows affected-product count and raw examples; displays candidate evidence links; prevents activation without evidence; requires a resolution note; detects alias collision before save; and shows re-analysis count after resolution.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/pages/admin/AdminIngredients.test.tsx`  
Expected: FAIL for missing evidence/re-analysis behavior.

- [ ] **Step 3: Implement review controls**

Keep source claims concise. Open citations in a new safe-origin tab. Activation writes canonical/alias/evidence/review audit and enqueue changes atomically. Rejection preserves the raw term and reason.

- [ ] **Step 4: Implement the read-only coverage audit**

Report total observed unique terms, matched/ambiguous/unmatched counts, product coverage, active rows with no evidence, alias collisions, rules with no evidence, and top unresolved terms. Exit non-zero when any active safety rule lacks evidence or an alias collision exists.

- [ ] **Step 5: Run production read audit and record artifact**

Run: `node scripts/audit-ingredient-coverage.mjs` with public/admin read credentials appropriate to the environment. Record timestamp, commit, counts, collisions, and source registry checksum. Do not print keys or member data.

- [ ] **Step 6: Run full verification**

Run: `npm test -- --run`  
Run: `npm run lint`  
Run: `npm run build`  
Run: `git diff --check`  
Expected: zero failures and exit 0 for every command.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminIngredients.tsx src/pages/admin/AdminIngredients.test.tsx supabase/functions/admin-ingredient-review/index.ts scripts/audit-ingredient-coverage.mjs docs/ingredient-coverage-2026-09-25.md
git commit -m "feat: operate ingredient evidence coverage"
```
