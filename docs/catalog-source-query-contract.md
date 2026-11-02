# Product source schema and query failure contract

## Confirmed failure and provenance

Read-only diagnosis on 2026-11-03 KST compared production commit
`62ce98350add75752e5a8da53901f47a36d7b50c` and nutrition PR116 Preview commit
`09b47c0d467941006637799d8830c835bbff7972`. Both used the same public project,
identical search RPC body/result IDs and identical follow-up public product query.
The RPC returned200; the products SELECT returned400:

```json
{"code":"42703","details":null,"hint":null,"message":"column products.catalog_source_url does not exist"}
```

Both origins were allowed by their CORS response. Other public tables returned200.
This is a missing schema dependency, not evidence of missing nutrition, an empty
catalog, wrong-project connection or an authentication/CORS failure.
An identity-only query preserving ID/visibility/review predicates returned zero
rows for one RPC result. That normal exclusion is distinct from the schema error;
RPC results alone never authorize displaying a product. An individual Preview
detail navigation timed out and was not retried.

`deef596ae6bfd268347a44d8b6e032b4f3a03d03` introduced product-level
`catalog_source_url TEXT`, `catalog_source_note TEXT` and
`requires_veterinary_guidance BOOLEAN NOT NULL DEFAULT FALSE` through
`20261026120000_official_catalog_import.sql`. Later
`0352b38be736bc0479e3cfe9d817c5d296009c7e` updated the current query projection.
They are intentional products fields, not misspelled product_observations fields.
The former is a product-level manufacturer reference/caveat; product_observations
holds individual retrieval evidence. Substituting an arbitrary observation would
change the contract. Removing the veterinary flag would weaken feeding and
recommendation guards. No new source URL or source text is inferred here.

Hosted absence of `catalog_source_url` is proven by the captured HTTP error.
Hosted ledger status, the other two columns and the mechanism that caused drift
are **not** proven. No Dashboard SELECT was executed in this work: this session
has no connected authenticated Dashboard control/SQL tool; fresh anonymous
headless Chrome is not an authenticated Dashboard session. Private HTTP evidence
is kept outside Git. No operational rows or credentials are included here.

## Affected paths

| Path | Dependency / behavior |
| --- | --- |
| Startup list | getProductsPage projects all three metadata fields; errors must be visible on home |
| Search / recommendations | searchProductsPage projects all three; failures already reject, recommendations already expose error |
| Detail / analysis | getProductDetail projects all three; this fix rejects query/schema errors instead of returning null |
| Recent views / saved IDs / barcode / brand / diary product search | Product projections include these fields; visibility/review restrictions remain unchanged |
| Admin products | Existing authenticated admin-products-read uses list/names/facts allowlists and full/edit views. The first three do not require these columns; full/edit use their existing projection. No new service-role route, public grant or administrator action is added |

SupabaseProductRow is a handwritten wire type; there is no generated hosted-schema
type check here. Optional TS properties and permissive JS fixtures do not verify
hosted columns. Mapping now distinguishes source projection `not_loaded`, explicit
`absent`, valid HTTPS `available`, and `invalid`; these are retrieval/presence
states, **not** approval or identity-verification states. SQL NULL/blank source
does not become fabricated text. Numeric zero remains a measurement.

## Minimal repair choice: C, draft only

`supabase/migration_drafts/restore_product_source_contract.sql` is a narrowly
scoped forward-repair **draft** outside the automatically executed directory.
It conditionally restores the three originally declared columns, preserves
existing explicit source/veterinary values, and rejects incompatible existing
type/nullability/default definitions. It does not import products, create import
functions, alter RLS/grants, repair the ledger or rewrite historical migrations.
If the original migration is actually pending, deploying that migration and its
dependencies may be preferable to promoting this draft; resolve ledger evidence
first. Do not apply both blindly.

The legacy boolean default is preserved for schema compatibility, **not** an
assertion that old products do not require veterinary advice. Before enabling a
repaired release, review existing veterinary products/observations and explicit
flags through the normal administrator process. This PR does not do that review
or mutate product values. A real rollout may require a separately approved data
review; the draft alone cannot prove clinical completeness.

### Required read-only deployment preflight (new Dashboard query only)

```sql
WITH expected(column_name) AS (
  VALUES ('catalog_source_url'), ('catalog_source_note'), ('requires_veterinary_guidance')
)
SELECT e.column_name, c.column_name IS NOT NULL AS present,
       c.data_type, c.is_nullable, c.column_default
FROM expected e LEFT JOIN information_schema.columns c
  ON c.table_schema='public' AND c.table_name='products' AND c.column_name=e.column_name
ORDER BY e.column_name;

SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version IN ('20261026120000','20261026170000','20261026190000') ORDER BY version;
```

Review all missing/incorrect definitions before deciding a rollout. If a ledger
row claims applied but objects differ, review the drift and use a new approved
forward version; do not mark missing schema applied or modify old SQL. Promotion
requires a fresh timestamp after the actual current ledger, backup/restore review,
and an explicit deployment approval. No db push/repair/deployment is performed by
this PR. Do not weaken publication filters, silently remove source columns, or
ship service-role credentials to make the page render.

After an approved rollout: verify each column, public list/detail HTTP200 for a
publicly eligible product, ordinary exclusion for hidden/pending products, then
the dependent PR116 no/partial/full nutrition screens at390px/1280px. Keep source
absence, query failure and insufficient nutrition as separate states.

## Error handling and validation

Only PGRST116 with explicit zero-row details is product absence; duplicate rows,
unknown PGRST116, missing columns and permission errors remain errors. Detail and
analysis show query failure; home exposes startup catalog failure. Brand and
diary product search no longer silently convert errors to empty results. Existing
request ordering and public visibility/review predicates remain intact.

The focused PGlite test first reproduces42703 against a drift fixture, then applies
only the draft locally and checks columns, preserved old fields/evidence, RLS,
grants, unchanged mock ledger, idempotency and incompatible-drift rejection.
Bootstrap additionally compiles all8 public product projection trees (58 table
checks) under owner and anon and checks each real FK/hint. This can reveal another
bad column/join in the repository schema, but is not a hosted-schema attestation
or a PostgREST HTTP relationship-resolution test. Existing bootstrap guards are
retained: describe this as **guard-included bootstrap**, not pristine historical
replay or full Supabase HTTP verification.

The previous bootstrap already applied the migration that creates these fields,
so it could not detect a separately deployed production database missing them.
The old select-column test also omitted all three metadata fields. Both limits
are now explicit; local tests do not replace the hosted read-only preflight.
CI uses existing Linux checks, no operational secrets/DB connection and no added
deployment workflow. Existing npm audit failures stay visible and unchanged.

PR116 and purchase PR115 are separate. This draft does not normalize the hosted
Preview until separately approved schema reconciliation; no integration Preview
is claimed and no nutrition code, scoring or ranking is changed here.
