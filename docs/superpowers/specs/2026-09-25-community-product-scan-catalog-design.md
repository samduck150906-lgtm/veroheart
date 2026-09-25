# Community Product Scan, Catalog, and Ingredient Analysis Design

**Date:** 2026-09-25  
**Status:** Approved  
**Scope:** Food, treats, and supplements for dogs and cats

## 1. Problem

VERORO currently treats barcode scanning as a lookup shortcut. `src/pages/Scan.tsx`
checks loaded products, checks `products.barcode`, and otherwise forwards the barcode
to search. It does not create a product, capture a label, run OCR, or preserve evidence.

The production audit run on 2026-09-25 found:

- 439 public products
- 134 products without linked ingredients (30.5%)
- 435 products without nutrition data (99.1%)
- 439 products without a barcode (100%)
- 439 products in `pending` verification state

Existing product names also contain retailer listing text. The UI performs a limited,
display-only cleanup in `src/utils/productDisplay.ts`, but the searchable database value
remains the noisy source title. Retailer source labels such as `쿠팡검색` and `쿠팡상품`
were also stored as brands.

The ingredient system has a safer canonical model and exact alias matching, but its
runtime dictionary is not complete enough to support arbitrary newly scanned products.
Unknown ingredients must remain unknown rather than being guessed into a safety result.

## 2. Goals

1. An existing barcode opens the matching catalog product.
2. An unknown barcode can become a public community product after a three-photo label
   capture and a minimum automated quality gate.
3. Repeated scans enrich one product instead of creating duplicates.
4. Raw source text and images remain traceable while public names stay concise.
5. Product search works across clean names, brands, aliases, barcodes, variants, and
   ingredient names.
6. New public products have stable, crawlable URLs and product metadata.
7. OCR extracts text only. Deterministic, versioned rules perform allergy and risk analysis.
8. Unknown or ambiguous ingredients never produce a complete-safe conclusion.
9. The ingredient knowledge base grows continuously from official sources and observed
   unmatched label terms.

## 3. Non-goals

- Diagnosing a food allergy or veterinary condition
- Inferring an ingredient or nutrient that is not printed on a label or official source
- Treating a retailer description as authoritative safety evidence
- Automatically merging products on fuzzy-name similarity alone
- Claiming that a finite, permanently complete list of every possible ingredient exists
- Publishing the contributor's identity or private raw scan files

## 4. Chosen Architecture

Use a hybrid pipeline:

```text
barcode scan
  -> local catalog lookup
  -> Open Pet Food Facts lookup
  -> if still missing: front + ingredient + nutrition/registration photos
  -> private direct upload to Supabase Storage
  -> Netlify background extraction job
  -> user confirmation of extracted fields
  -> deterministic identity and duplicate resolution
  -> minimum quality gate
  -> public community product with an unverified badge
  -> deterministic ingredient matching and analysis
```

Open Pet Food Facts is a supplementary discovery source, not a source of truth. Any field
imported from it records its provenance and confidence. Missing or contradictory fields
fall back to label capture.

`gemini-2.5-flash` through Netlify AI Gateway is the initial extraction adapter because it
supports image input through the existing Netlify deployment without placing a provider
key in the browser. The adapter is isolated behind an interface so the model can be changed
without changing scan, catalog, or analysis contracts.

The model returns JSON conforming to an application-owned schema. It may transcribe and
segment text, but it may not assign risk, allergens, health benefits, or a final product
score.

Netlify function payload limits make direct multi-image submission unsuitable. The client
re-encodes images, uploads them directly to private Supabase Storage, and sends only scan
and object identifiers to the background function.

## 5. Product Identity and Deduplication

Identity is resolved in this order:

1. Valid normalized GTIN/EAN/UPC exact match
2. Manufacturer product code exact match, when present and source-verified
3. Exact canonical key built from normalized manufacturer, brand, display name, variant,
   net weight, and target species
4. Otherwise `needs_review`; do not auto-merge

Barcode normalization validates supported length and check digit, then uses a single
stored representation. Raw scanned text remains on the observation.

Fuzzy name similarity may rank review candidates but never performs a merge. Multiple
observations attach to the selected product so later scans can confirm or challenge a field.

## 6. Data Model

### 6.1 Additions to `products`

- `display_name text`: concise public name
- `normalized_name text`: deterministic search and identity key component
- `variant_name text`: flavor, protein, life-stage, or functional variant
- `net_weight_text text`: label-preserving package size
- `normalized_brand_name text`
- `canonical_product_key text`
- `slug text`: stable public URL segment
- `catalog_source text`: `legacy`, `community_scan`, `external`, or `admin`
- `analysis_status text`: `unavailable`, `partial`, `ready`, or `blocked`
- `last_observed_at timestamptz`

Keep `products.name` during migration as the legacy source title. UI and search read
`coalesce(display_name, name)` until the backfill is complete.

Existing `is_visible` controls catalog visibility. Existing `verification_status` remains
the review lifecycle:

- `pending`: community or imported, not human-reviewed
- `reviewed`: reviewed but not source-verified end to end
- `verified`: official/label evidence reviewed end to end

### 6.2 `product_aliases`

Stores retailer titles, previous names, English names, manufacturer aliases, and confirmed
OCR variants. Fields include product, alias text, normalized alias, language, alias type,
source observation, and public-search eligibility.

### 6.3 `product_scan_submissions`

Stores the user-owned workflow state:

- contributor ID, barcode, state, and timestamps
- storage object paths for front, ingredient, and nutrition/registration images
- OCR/extraction output and per-field confidence
- user-confirmed structured values
- resolved product ID and duplicate-resolution reason
- processing error code safe to show to the contributor

The state machine is:

```text
draft -> uploaded -> processing -> needs_confirmation -> submitted
      -> failed                    -> cancelled
submitted -> published | needs_review | rejected
```

Only the contributor and service-role processing code can read the submission. The public
catalog reads the derived product, aliases, label text, and verification state instead.

### 6.4 `product_observations`

Stores immutable field-level evidence from a user label, manufacturer page, official
distributor, Open Pet Food Facts, retailer discovery, or admin import. An observation has:

- product ID and optional scan submission ID
- source type, source URL/title, and retrieval time
- raw name/brand/barcode and raw label text
- extracted structured JSON and per-field confidence
- observed package/version identifiers
- current/superseded state

The existing `product_data_sources` table remains the curated source summary. Accepted
observations populate or update it; raw observations are never overwritten.

### 6.5 Images

Raw scan images remain in a private bucket. Browser-side canvas re-encoding strips EXIF.
Only an explicitly selected, cropped product-front image is copied to a public product image
location. Contributor IDs and raw object paths are never exposed in public product queries.

## 7. Minimum Publication Gate

An unknown product becomes public as `사용자 스캔 · 검증 전` only when:

- the user is authenticated and within rate limits
- the barcode is valid, or the product is explicitly recorded as having no supported barcode
- all three required photo categories are present; additional panels are allowed
- front image produces a non-empty brand or manufacturer and product name
- product type and target species are confirmed by the user
- food/treat products contain a non-empty ingredient list
- supplement products contain ingredients and a registration/active-component panel
- the user confirms the OCR-extracted fields before submission
- automatic identity resolution does not produce an ambiguous duplicate

Failed gates preserve a private draft and give a short corrective message. They do not
create a public empty product.

Publication and analysis are separate. A published product can have `analysis_status` set
to `unavailable` or `partial`.

## 8. OCR and Extraction Contract

The extraction request contains signed, short-lived image URLs and requests only:

- raw visible text by image/panel
- brand, manufacturer, product name, and variant candidates
- barcode printed on the package, if visible
- target species, product type, life stage, flavor, and net weight as printed
- ingredient list preserving label order and punctuation
- guaranteed/registered analysis values, units, and qualifier (`min`, `max`, or exact)
- model confidence for transcription fields

The server validates the JSON schema, field lengths, numeric ranges, and barcode agreement.
The existing deterministic label parser remains a second parser and consistency check.
Disagreement sends the submission to confirmation or review; it is not silently resolved.

The background job is idempotent on submission ID. Retried invocations may reuse stored
extraction output and cannot create a second product.

## 9. Product Name Normalization

Never destroy a source title. Store it as an observation and searchable alias, then produce
a separate public display name.

Normalization removes only fields known to be commerce noise:

- delivery, discount, coupon, gift, official-shop, and seller claims
- bundle count that is not the package's own net content
- source labels such as `쿠팡검색` used as a fake brand
- duplicate leading brand when the brand is already displayed separately

Normalization preserves identity-bearing text:

- line/series, protein or flavor, life stage, health formulation, texture/form
- package net weight and unit
- dog/cat applicability where it distinguishes variants

Automatic cleanup produces a candidate. High-confidence deterministic results can be
published; ambiguous brand extraction or variant separation goes to review. The public UI
uses four concise lines at most: brand, display name, variant/size, verification badge.

## 10. Search and Public Discovery

Create a database RPC that returns ranked product IDs and compact result fields. Ranking is:

1. exact barcode
2. exact normalized display name
3. exact brand plus product tokens
4. aliases, previous names, and English names
5. ingredient name or verified ingredient alias
6. trigram typo similarity

All query terms must match at least one indexed field. Search must not fetch every product
and rank in the browser.

Indexes include:

- unique partial barcode index
- unique/partial canonical product key where confidence permits
- GIN trigram indexes for display name, brand, and aliases
- GIN full-text vector for weighted product/brand/variant/alias tokens
- indexes for verification, visibility, product type, species, and updated time

Public discovery includes:

- stable `/product/:id/:slug` canonical URLs
- product-specific title and concise description
- Product JSON-LD with only known facts
- a dynamically generated product sitemap
- a Netlify Edge Function that injects the same metadata for every requester while passing
  through the SPA body; it must not present crawler-only content

## 11. Ingredient Knowledge Base

The canonical ingredient model already present in the repository becomes authoritative.
Each ingredient stores canonical Korean and English names, exact aliases, category, source
organism/family, part, processing form, status, and evidence.

Examples such as chicken meat, chicken meal, chicken fat, and hydrolyzed chicken protein
remain distinct canonical ingredients while sharing a chicken source family.

Source priority is:

1. Korean regulations and official feed labeling material
2. FDA/AAFCO and EU official feed-material sources
3. official manufacturer labels
4. veterinary textbooks, university guidance, and peer-reviewed literature
5. retailer data for discovery only, never for a safety claim

The project stores facts and citations, not copied proprietary definitions. Licensing and
attribution are checked before bulk-importing any external catalog.

### 11.1 Continuous unmatched workflow

Every unmatched label term is preserved in `canonical_ingredient_review_queue` with its
normalized form, occurrence count, affected products, and source label. A research worker
may suggest official-source candidates, but activation requires deterministic equality or
reviewed resolution.

Activating a canonical ingredient or alias triggers re-analysis of affected products. No
substring or fuzzy candidate becomes an automatic safety match.

## 12. Analysis Semantics

Ingredient matching absorbs only spacing, common punctuation, case, and explicitly approved
aliases. Original order is preserved because first-ingredient rules depend on it.

Analysis states:

- `ready`: label confirmed and every safety-relevant label item resolved
- `partial`: at least one known item can be analyzed, but an unmatched/ambiguous item remains
- `unavailable`: no usable ingredient list
- `blocked`: contradictory evidence or an invalid label capture requires review

Known risks are shown even in a partial analysis. A partial or unavailable analysis never
shows a complete-safe message.

Allergy comparison uses reviewed source-family relationships and relationship type:
`contains`, `derived_from`, `may_contain`, or `cross_contact`. Processing form remains visible
and may affect the rule only when supported by evidence.

Danger/toxicity rules override aggregate scores. Guaranteed analysis uses only printed
values. Dry-matter conversion runs only when moisture is present. Each result records the
analysis engine version and the evidence references used by the triggered rules.

The UI describes label-based exposure potential. It does not diagnose an allergy.

## 13. Security, Privacy, and Abuse Controls

- Existing product lookup remains anonymous.
- New public contributions require an authenticated user.
- Netlify functions verify the Supabase access token server-side.
- Service-role and AI Gateway credentials never enter the client bundle.
- Direct uploads use scoped, expiring upload authorization.
- Per-user and per-IP rate limits protect AI and storage spend.
- File type, decoded image dimensions, and byte limits are checked before processing.
- Raw images are private and deleted on a documented retention schedule after evidence needs
  are satisfied; public derived label text and selected front image remain.
- Malicious OCR text is treated as untrusted data and cannot alter prompts, SQL, HTML, or rules.
- Public text is escaped and URLs are allowlisted by scheme.
- Contributor identity is never present in public catalog payloads.

## 14. Failure Handling

- External lookup timeout: continue to photo capture.
- OCR timeout/retry: keep submission in processing and retry idempotently.
- Invalid extraction schema: mark `failed_extraction`, keep images, offer retry.
- Barcode conflict: block automatic publication and enqueue review.
- Ambiguous duplicate: show candidates to admin; do not create or merge automatically.
- Ingredient parser disagreement: preserve both outputs and request confirmation/review.
- Unknown ingredient: publish raw term, mark analysis partial, enqueue research.
- AI Gateway unavailable: submission remains recoverable; no empty product is published.

## 15. Existing Catalog Backfill

Backfill is non-destructive and resumable:

1. Copy every existing `products.name` and source label into an observation/alias.
2. Produce `display_name`, real brand candidate, variant, and package-size candidates.
3. Hide source-label brands from public fields without deleting their provenance.
4. Apply deterministic cleanup automatically; enqueue ambiguous candidates.
5. Backfill search vectors and slugs.
6. Import existing label ingredient order into canonical label sets.
7. Queue the 134 products missing ingredients and 435 missing nutrition data.
8. Keep current product IDs and URLs valid throughout migration.

The backfill runs first as a report-only dry run with before/after examples, duplicate
candidates, and collision counts. Production writes require an explicit reviewed artifact.

## 16. Observability and Operations

Track:

- scans started, completed, failed, and abandoned by stage
- external lookup hit rate
- OCR latency, retry rate, schema failure rate, and cost
- user correction rate per extracted field
- products published, merged, or sent to review
- unmatched ingredient rate and top unresolved terms
- analysis status distribution
- search zero-result and reformulation rates
- duplicate and barcode-conflict counts

Admin views need queues for scan failures, duplicate resolution, name cleanup, unmatched
ingredients, and evidence review. Every administrative mutation records actor, before/after,
reason, and timestamp.

## 17. Rollout

1. Schema and pure normalization/identity functions behind flags
2. Existing catalog name/search backfill dry run
3. Search RPC and clean display fields with legacy fallback
4. Authenticated scan submission and private image upload
5. Extraction worker in shadow mode; compare OCR output with manual labels
6. User confirmation UI and review queues
7. Public community products with analysis disabled
8. Partial/ready deterministic analysis
9. SEO metadata and sitemap
10. Incremental official-source ingredient enrichment and re-analysis

Rollback disables new submissions and returns reads to legacy fields. Observations and raw
evidence remain intact; no rollback deletes user submissions or product history.

## 18. Test Strategy

Use test-driven development for every implementation slice.

Unit tests cover:

- barcode validation and normalization
- product-name cleanup and canonical key construction
- duplicate-resolution decisions
- scan state transitions and publication gate
- extraction schema validation
- label parsing, exact alias matching, and unknown preservation
- analysis state and the rule that partial results cannot claim complete safety
- search token normalization and ranking

Database tests cover constraints, RLS, idempotency, visibility, indexes, and search RPC
ranking. Function tests cover auth, rate limits, storage-path authorization, retry safety,
malformed model output, and external API failure.

End-to-end tests cover:

- existing barcode to product
- unknown barcode through three-photo submission and public pending product
- repeat scan merging into the same product
- user correction before publication
- OCR failure and retry
- unmatched ingredient producing a partial result
- profile allergy matching only against reviewed relationships
- clean product display/search despite a noisy retailer source title
- public product metadata and sitemap inclusion

## 19. Acceptance Criteria

- No public product created without passing the agreed minimum gate.
- Every public community product shows `사용자 스캔 · 검증 전` until reviewed.
- Repeated exact barcodes cannot create duplicate products.
- Raw source title, OCR text, and provenance remain retrievable by authorized operations.
- Cards and detail pages never use retailer source labels as brands.
- Internal search finds a product by barcode, clean name, brand, alias, and ingredient.
- New public products receive stable canonical URLs and sitemap entries.
- OCR/AI output cannot directly set safety, allergy, or risk results.
- An unknown ingredient remains visible and forces `partial` analysis.
- No partial or unavailable analysis displays a complete-safe conclusion.
- Existing product IDs remain valid through the migration.

## 20. Primary References

- FDA, Animal Food Ingredients: https://www.fda.gov/animal-veterinary/animal-foods-feeds/animal-food-ingredients
- FDA, Animal Food Labeling: https://www.fda.gov/animal-veterinary/animal-foods-feeds/animal-food-labeling-and-pet-food-claims
- AAFCO, What's in the Ingredients List: https://www.aafco.org/consumers/understanding-pet-food/whats-in-the-ingredients-list/
- EU Catalogue of Feed Materials: https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32013R0068
- Merck Veterinary Manual, Cutaneous Food Allergy: https://www.merckvetmanual.com/integumentary-system/food-allergy/cutaneous-food-allergy-in-animals
- Cornell, Small Animal Toxins: https://www.vet.cornell.edu/hospitals/pharmacy/consumer-clinical-care-guidelines-animals/small-animal-toxins
- Open Food Facts, barcode scanning: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-barcodes/
- Google Gemini image understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- Netlify AI Gateway: https://docs.netlify.com/build/ai-gateway/overview/
- Netlify Background Functions: https://docs.netlify.com/build/functions/background-functions/
