# Health-Concern Production Shadow Input Audit

## Boundary

This audit covers one copied, local-only Supabase joined-row JSON export. The source file remains outside the repository and is not committed. No Supabase client, credentials, SQL, production service, database write, migration, environment setting, or deployment setting is used.

The accepted structural columns are `product_id`, `product_name`, `main_category`, `target_pet_type`, `ingredient_id`, `sort_order`, `ingredient_name_ko`, `ingredient_name_en`, and `ingredient_risk_level`. Product ID and product name are required non-empty strings. Other fields are nullable but must retain their declared primitive type. A malformed row fails with its exact zero-based row index.

## Provenance And Integrity

- Input filename: `붙여넣은 텍스트 (1)(2).txt`
- Input size: 1,868,544 bytes
- SHA-256: `8feea2baadeec067d4c0e04f82e402ce7358c5cf9627de40507667c3c1a3dc19`
- JSON shape: array
- Joined rows: 4,410

The file was read directly from its mounted local path and was not copied into the repository.

## Aggregate Contract Audit

- Distinct product IDs: 458
- Distinct product names: 431
- Distinct ingredient IDs: 539
- Distinct product-ingredient links: 4,265
- Rows without an ingredient link: 145
- Linked rows missing a Korean ingredient name: 0
- Linked rows missing an English ingredient name: 0
- Structurally invalid required or nullable columns: 0
- Exact duplicate rows: 0
- Product IDs with conflicting name/category/species metadata: 0
- Ingredient IDs with conflicting name/risk metadata: 0
- Product-ingredient links with conflicting sort positions: 0
- Product names shared by more than one product ID: 26

Repeated product IDs across joined rows represent ingredient joins and are not treated as duplicate products when their metadata is identical. A display name shared by multiple IDs is reported as a name-level ambiguity but does not merge the IDs.

## Supplied Evidence

Valid target species are present only as `dog` or `cat`: 265 dog products and 193 cat products. Categories are supplied as `food` (244 products), `snack` (194), `간식` (10), and `사료` (10). These values are preserved exactly; no category normalization is authorized by this audit.

Ingredient IDs, Korean and English names, order, and supplied risk levels are available for 4,265 links. The 145 products represented by rows without ingredient links must remain explicitly missing-ingredient-data cases.

The export contains no health-concern tags, formulation, guaranteed analysis, calories, or ingredient-purpose columns. Those fields must remain absent. Their absence is **insufficient evidence**, not evidence that any product is unsuitable. No nutrition value, purpose, tag, suitability, or product property may be inferred from names or categories.

## Adapter Contract

The later local-only adapter must group by product ID deterministically, preserve supplied metadata and ingredient order, keep missing ingredient arrays distinguishable from empty arrays, reject or report metadata conflicts without choosing a winner, and omit unsupported or invalid species values. Required `Product` display-only fields may use inert placeholders such as empty strings or zero counts only where the type requires them; placeholders must never become health evidence.

The adapter may feed its products only to `buildHealthConcernScoreShadowReport()`. It cannot be imported by runtime or UI modules, cannot change scoring or ranking, and cannot authorize candidate behavior. No runtime activation is authorized.
