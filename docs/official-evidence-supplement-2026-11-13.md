# Official evidence supplement, 2026-11-13

The reviewed manifest adds 428 explicit nutrient measurements to 83 existing products: Royal Canin 73, Hill's 6, Bonacibo 2, Inaba 1 and Wealtz 1. Eleven product composition labels contain 227 ordered raw ingredient items. Every imported label item has a captured manufacturer document and retains its original wording. This is evidence enrichment, not automatic safety approval.

## Identity and measurement boundaries

- Royal Canin international evidence requires the same root formula ID, species and an identical package GTIN on both Korean and international manufacturer pages. Recommendations do not establish identity. Korean manufacturer nutrition images were separately inspected where the HTML omitted the analysis.
- Hill's US ingredient panels require an identical root package UPC on the Korean and US pages. Country and source remain explicit. US dry-matter measurements remain dry matter; they do not enter as-fed percentage profiles. The redirected k/d Early Support page failed the package check and is excluded.
- Inaba SC-71 uses the Korean manufacturer's 56 g package JAN. Its Korean maximum ash value is 2.0%; the Japanese 1.7% value is not substituted. A retailer's multipack barcode is not inferred from the individual package.
- Liquid labels use g/100mL. Milk powder uses g/100g on an `as_sold` basis. Neither implies density, prepared-liquid composition or an ordinary as-fed percentage profile.
- A nutrition profile is a projection, not a second manufacturer document. Identical generated copies are suppressed even when the profile inherited a different regional source URL. Independent documents and conflicting values remain available.
- Preferred aliases resolve exact whole ingredient names ahead of duplicate generated translations. Processing, species and plant/animal parts are retained. An unknown processed ingredient is not collapsed into its generic source ingredient. Existing risk classifications are not broadened.

## Original record preservation

Ten individually attributable application seed/manual test records are added to the existing separate archive. The migration checks exact identity, hidden state and absent manufacturer source, then preserves original product fields and associated evidence. It does not delete the records or declare their missing information complete. The earlier 973 archived records remain preserved.

The hosted transaction rehearsal produced 759 active records, 983 archived originals, 499 active records still needing information and 18 public records needing information. Of the original 586 remaining records, 77 become complete, 10 are separately archived, and 499 remain. The 227 new raw items are all source-confirmed; 133 have exact canonical identities and 94 retain unresolved traits. Neither unresolved traits nor missing package evidence is fabricated to reach zero.

## Reproducible application

`data/enrichment/official-supplement-2026-11-13.json` records exact source URLs, retrieval times, document hashes, regional identity checks, original measurements and ordered labels. The SQL generator attaches a separately captured read-only product inventory; the inventory must include product rows with `nutrition`, `barcodes` and `current_labels` (including nested `items`) under `rows[0].inventory.products`.

```powershell
node scripts/build-product-evidence-supplement-sql.mjs `
  --manifest data/enrichment/official-supplement-2026-11-13.json `
  --snapshot <read-only-inventory.json> `
  --out <apply.sql> --rehearsal <rollback-rehearsal.sql>
```

The generator refuses missing/archived identities, unsafe source URLs and invalid measurement projections. The generated transaction checks exact product, nutrition and current-label snapshots, rejects repeat application and conflicting barcode ownership, records before/after audit rows, and preserves visibility and verification status.

Apply the volume/powder and attributable archive migrations first. Apply the evidence supplement before the preferred-alias migration: alias reconciliation can update derived product analysis and invalidate an earlier full-product snapshot. Rehearse the complete sequence with `ROLLBACK` before applying it with `COMMIT`. Register only these new migration versions; do not replay unrelated historical gaps.

## Validation

The full PostgreSQL bootstrap contract covers volume versus mass, powder versus prepared liquid, source-pair integrity, deletion restoring missing status, publication preservation, profile attribution, exact preferred aliases and processing separation. Parser tests cover root package identity, regional exclusions, prefix percentages, decimal commas, duplicate/ambiguous panels and dry matter. React tests cover independent evidence and generated-copy suppression. Release CI additionally checks web, native builds, SQL/RLS, layout and dependencies.

The two Notion cards require further work while 499 records lack required evidence. Actual iPhone/Galaxy camera validation requires a connected physical device; build and fixture checks do not establish that result. Do not move these cards to Done on the strength of this supplement alone.
