# QA repairs, 2026-11-09

Pending products are excluded from every public product query, metadata and the
sitemap. A new forward migration restores the same boundary in PostgreSQL and the
public ratings projection without rewriting visibility intent or review status.
The verified-only setting remains an additional restriction on reviewed products.

The retired comparison screen, verdict helper, store state and their dedicated
tests are removed. The old URL still redirects to search. Favorites and active
ingredient/nutrition safeguards retain their tests. Home categories have an
explicit heading, icons and a link to all products. Marketplace package weight
and quantity are displayed as metadata rather than product names; original names
and formula identifiers remain intact.

## Source data review

291 manufacturer URLs were fetched on 2026-11-09. The review manifest retains
277 identified products, including 106 new identities and 171 existing rows.
Fourteen conflicting or ambiguous identities are deferred. Fresh source facts
and page hashes are in `data/enrichment/qa-source-review-2026-11-09.json`.
This is a source review, not a claim that domestic packaging or feeding safety
has been verified.

100 reviewed records have explicitly observed as-fed percentages. 88 have only
manufacturer dry-matter tables; those tables remain separate from guaranteed
analysis and score inputs. Missing measurements are not replaced with zero.
Explicit kcal/kg is divided by ten for kcal/100g; no default energy is invented.
265 records have a raw ingredient list. Unmatched terms retain their raw text
and order rather than acquiring invented risk ratings.

`prepare-reviewed-catalog.mjs` reads downloaded manufacturer HTML and a bounded
product/observation snapshot; it does not connect to production. The SQL builder
requires the reviewed manifest's SHA-256. Generated writes reject stale row
snapshots and conflicting source identities, preserve hidden product intent,
retain source observations and label history, and set only specifically reviewed
pending records to reviewed. They never mark a product verified.

Before any operating write, retain the affected product, nutrition, label and
observation snapshot. First execute the complete generated transaction with
ROLLBACK against the intended hosted schema. Apply the reviewed data and the
forward publication migration together after this rehearsal. Do not push the
other historical pending migrations as part of this repair.

## Validation

The full application checks cover lint, 1,831 unit tests, 14 catalog tests,
complete SQL bootstrap, publication/scan/account/catalog/RLS contracts, app/server
types and production build. The catalog transaction regression verifies hidden
intent, numeric zero, dry-matter isolation, stale snapshot rejection and public
review restrictions using PostgreSQL. A hosted dry run completed and rolled back
before publication.

The existing CI audit also requires the typescript-estree subtree to use patched
minimatch 11.0.5. This override is scoped to that subtree; application runtime
packages and other minimatch users are unchanged. Lint and audit are rerun after
a clean install.

Real iPhone/Galaxy optical recognition, and operating signup/recovery/upload/
account-deletion flows, still need dedicated devices or test accounts. Passing
code and SQL checks does not certify those scenarios.

## Barcode and enrichment repair

Manufacturer-declared package GTINs are normalized and checksum validated. The
review found 119 codes for 88 products, with no cross-product conflicts.
`product_barcodes` retains source URL and observation provenance for every code;
public access inherits the product's publication policy. Primary codes and
package aliases are checked together, with conflicts and network errors kept
distinct from an unknown product. An unknown GTIN still requires actual package
photos for registration: a barcode cannot supply ingredients or nutrition.

The enrichment queue now reads current raw labels, measured protein and fat,
manufacturer dry-matter evidence, validated package aliases, and product images.
Dry-matter evidence remains separate from as-fed measurements. All nutrient
updates and label, barcode, and observation edits refresh the queue, and deleted
evidence reopens completed rows. Empty rows leave the default supplementation
list and remain accessible by explicit status. Publication filters honor review
status as well as the visibility flag.

The final hosted transaction reduced public supplementation targets
from 277 to 197 (80 complete). Remaining fields overlap: 189 lack a source-confirmed
GTIN, 135 lack adequate nutrition evidence, and 12 lack ingredients. Product
gallery extraction recovered all 27 missing images. These are
real source gaps; removing them from the list or inventing values would not
complete the data. Pending records remain private and are still available to
administrators for source review.

At the user's request, a QA administrator can be provisioned with server-only
`TEMP_ADMIN_ID` (`qa-` prefix), `TEMP_ADMIN_CREDENTIAL_SHA256` (hash of the encoded
login credential), and `TEMP_ADMIN_EXPIRES_AT` (Unix seconds, at most one hour).
The normal login endpoint validates all three and caps the signed session at the
same deadline. No client signup or new permanent administrator is introduced.
Remove these settings when the inspection ends. Credentials never belong in git,
screenshots, reports, or browser persistent storage.
