# Copied-Data Health-Concern Shadow Impact Report

## Boundary

This is a **shadow analysis** of one copied, local-only production JSON export. It reports hypothetical candidate results and does not change production behavior. **No runtime activation is authorized.** No Supabase client, credentials, SQL, database write, migration, environment setting, deployment setting, runtime scoring, runtime ranking, UI, allergy logic, or poultry logic was used or changed.

## Provenance

- Filename: `붙여넣은 텍스트 (1)(2).txt`
- Size: 1,868,544 bytes
- SHA-256: `8feea2baadeec067d4c0e04f82e402ce7358c5cf9627de40507667c3c1a3dc19`
- Analyzed at: `2026-09-05 (Asia/Seoul)`
- Input shape: copied Supabase joined-row JSON array
- Joined rows received: 4,410
- Distinct product IDs: 458
- Distinct product names: 431

The raw JSON and product-level matrix remain outside the repository.

## Input And Adaptation

- Distinct ingredient IDs: 539
- Distinct product-ingredient links: 4,265
- Rows without ingredient links: 145
- Linked rows missing ingredient names: 0
- Exact duplicate rows: 0
- Product metadata conflict IDs: 0
- Ingredient metadata conflict IDs: 0
- Conflicting product-ingredient links: 0
- Structurally rejected rows: 0
- Successfully adapted products: 458
- Rejected/conflicted products: 0
- Products retaining a missing ingredient array: 145
- Product names shared across multiple IDs: 26

Repeated product IDs in joined rows represent ingredient links and were grouped only when product metadata was identical. Shared display names never caused product IDs to merge.

### Products By Supplied Target Species

- `cat`: 193
- `dog`: 265

### Products By Supplied Category

- `food`: 244
- `snack`: 194
- `간식`: 10
- `사료`: 10

Category values are reported exactly as supplied and were not normalized or interpreted.

## Shadow Findings

- Canonical concern definitions evaluated: 9
- Species-aware profile variants: 18
- Ranking cohorts: 18
- Matrix rows: 4,122
- Computed hypothetical candidate rows: 4,122
- Blocked-unrecognized rows: 0
- Rows with insufficient evidence: 3,557
- Rows whose quantitative evidence is entirely informational: 1,832
- Confidence: 0 sufficient, 565 partial, 3,557 insufficient
- Maximum hypothetical increase: none
- Maximum hypothetical decrease: -20
- Hypothetical grade changes: 545
- Products with a hypothetical ordering change in at least one cohort: 443
- Ranking cohorts containing a hypothetical ordering change: 17
- Invariant violations: 0

“Computed” means only that the canonical synthetic concern input was recognized and a hypothetical candidate result could be calculated. It does not mean evidence was sufficient or that a product was suitable.

### Concern Status Counts

| Concern | Possible | Unknown | Not applicable |
| --- | ---: | ---: | ---: |
| `digestive` | 9 | 245 | 204 |
| `eye` | 160 | 298 | 0 |
| `heart` | 37 | 228 | 193 |
| `immune` | 197 | 261 | 0 |
| `joint` | 27 | 431 | 0 |
| `oral` | 2 | 456 | 0 |
| `renal_urinary` | 21 | 233 | 204 |
| `skin_coat` | 111 | 347 | 0 |
| `weight` | 1 | 253 | 204 |

No concern produced a confirmed status under this export. `unknown` and `not_applicable` are not interpreted as unsuitable.

### Legacy Concern-Fit Distribution

- `5`: 4,118
- `20`: 4

### Hypothetical Candidate Concern-Fit Distribution

- `0`: 3,557
- `5`: 565

### Hypothetical Total-Score Delta Distribution

- `-20`: 4
- `-5`: 3,553
- `0`: 565

### Hypothetical Grade Comparison

- Changed: 545
- Unchanged: 3,577
- Not comparable: 0

## Evidence Limitations

The export supplies none of the health-tag, formulation, guaranteed-analysis, calorie, or ingredient-purpose evidence fields. All 458 adapted products therefore retain empty or missing health tags, and 145 products retain missing ingredient arrays.

No matrix row reached sufficient confidence. Ingredient-name matches can support only the limited evidence encoded by the existing canonical evaluator; ingredient quantities are unavailable. Informational quantitative checks do not contribute points. Missing nutrition, purpose, tags, or ingredient links are **insufficient evidence**, not evidence that a product is unsuitable. No absent value was inferred from product names, categories, or other fields.

The computed values are hypothetical candidate results for comparison only. They are not a new score, recommendation, medical conclusion, or production behavior. No runtime activation is authorized.

## Validation

- Focused input, adapter, health evaluator/shadow, scoring, display/ranking, allergy, and poultry tests: 24 files, 232 tests passed
- Full Vitest suite: 141 files, 899 tests passed
- TypeScript project build: passed
- Production Vite build: passed; 1,988 modules transformed
- Targeted ESLint for all new source and test files: passed
- Repository-wide ESLint: the same 17 pre-existing React Hook errors outside this PR; no new-file errors
- `git diff --check`: passed
- Static surface guard: runtime, UI, stores, Supabase/network, SQL, and environment imports/usages absent
