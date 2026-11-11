# Whole-label review evidence and analysis eligibility

Stored `ready` and matching all supplied ingredients cannot prove that the full
original package label was transcribed. The original synthetic omitted-item
reproduction remains covered; no operating incidence/count is claimed.

## Connected path in this draft

1. Existing authenticated admin-write session -> `getIngredientLabelReview` ->
   service-only RPC reads the current product/label/items and resolved ingredient
   definitions. The server computes a revision from that complete snapshot.
2. The existing product editor includes an explicit review panel. It shows the
   saved product identity, source, whole raw label and every ordered item. The
   reviewer must actually inspect a retained package/official source, describe
   taste/weight/package/revision correspondence and whole-label coverage, and
   confirm every item. Unsaved product-editor values are not approved.
3. `approveIngredientLabelReview` uses the existing auth gate, not a submitted
   reviewer identity. It rereads the server bundle, compares its revision and
   compares every ordered token with the **existing ingestion parser**. A missing
   token, unsupported segmentation or partial/ambiguous match cannot be approved.
   Duplicate names and nested compounds remain valid. This is not count-only
   completeness or a new comma splitter. Existing parser limitations remain;
   a label needing different segmentation must be corrected/reviewed, not forced.
4. The service-only approval RPC locks the involved source tables in a bounded
   short transaction, recomputes the current snapshot/revision, requires the exact
   reviewed item IDs and observation, and writes immutable evidence plus existing
   admin audit in one transaction. Audit failure leaves neither. No product,
   raw-label, matching or analysis_status value is changed. Unique product/revision
   returns already_reviewed without another audit for the same state. This is
   state-based deduplication, not permanent request-ID deduplication.
5. The public batch RPC rechecks the current snapshot against the latest approved
   revision. It explicitly repeats the existing publication predicate: visible,
   recognized review status and the optional verified-only setting. Hidden or
   disallowed IDs produce no result, not an assertion that no evidence exists.
6. Public product detail/barcode/search/brand/saved-ID reads attach these receipts.
   Lightweight initial cards deliberately remain not_requested. The shared product
   gate checks a receipt against the exact public analysis input. Analysis entry
   rereads public receipts; failed proof reads are not an empty recommendation set.

A revision/hash comparison proves consistency, **not review truthfulness**. An
administrator can still make an erroneous source/package comparison. No machine
claim establishes that a photographed line was transcribed correctly or that a
manufacturer source corresponds to this SKU. Authentic reviewer judgement and
retained exact-package evidence are mandatory. No historical rows are promoted
from ready/count/match rate.

## Evidence state is separate from ingredient registration

| State | Meaning / behavior |
| --- | --- |
| not_requested | No evidence lookup was attempted; withhold, do not say unreviewed/absent |
| unavailable | Reader/schema not deployed; withhold with dependency notice |
| error | Network/RPC failure, malformed/duplicate/omitted result; withhold, retry read |
| absent | Successful public receipt explicitly reports no recorded approval |
| stale | Recorded approval no longer matches current product/label/items/definitions |
| blocked | Current evidence has unresolved/conflicting structure/matches |
| verified | Server comparison is current AND receipt binds the displayed public inputs; existing analysis readiness still required |
| projection mismatch | Product and receipt came from different/incomplete inputs; withhold and reread, not a conclusion about review truth |

A successfully loaded empty ingredient list, an unloaded projection, a registered
but unassessed list and a failed proof lookup remain different facts. Known risk,
allergy, species, veterinary, nutrient/disease-failure warnings are retained while
unsupported scores/positive suitability are withheld. Numeric scores, rank
formula, nutrition thresholds and risk/matching/allergy rules do not change.

## Privacy, privileges and concurrency

The SQL is owned by foundation PR123 as the unapplied forward candidate
`20261110100000_ingredient_label_comparison_evidence.sql`. The
private evidence table has RLS and no anon/authenticated/service direct grants.
Only owner-privileged RPCs write; anon/authenticated cannot approve or read raw
review bundles. Actor comes from existing server authentication. Public output
contains product/current-label IDs, opaque revision, state, and (only if verified)
a binding array of fields already in the public analysis input. It excludes the
whole raw label, retained source, observation notes and reviewer/audit identity.
Unknown response fields are not interpreted as proof. Source references are not
fetched or rendered as executable HTML by the review panel.

Private snapshots cover product identity/revision, whole raw label/source, label
revision, ordered item identity/raw/matching/metadata and resolved definitions.
This conservatively invalidates approval after changes including definition
metadata/product updated_at. Approval holds short table-wide SHARE locks on five
source tables (3-second lock timeout); this blocks concurrent legacy writes until
transaction end. Failures are surfaced; the client never automatically retries.
Public reads use one stable statement snapshot, not continuous real-time approval.
An already open screen cannot detect arbitrary external changes without rereading.
Receipt and product cross-request differences are withheld. No claim of full
multi-connection/Supabase HTTP concurrency verification is made by PGlite tests.
Immutable history intentionally has no cascading foreign keys. Orphan history
cannot authorize a missing/nonpublic product.

## Compatibility and release order — no frontend-only release

This PR is not independently deployable as a frontend-only change. This work issues no evidence for existing operating data; the dated preflight counts below are measured, while post-foundation proof coverage
is not yet measurable. Shipping the consumer first must fail closed with
unavailable/absent notices, not silently reuse ready. It can remove all existing
score-qualified recommendations. That is a **release stop**, not the intended
rollout or a reason to bypass the gate.

Required separately approved order:

1. Validate and separately approve the frozen forward candidate against the actual target schema,
   forward-only migration only after approval. Apply storage/RPCs first; no ready
   backfill. Existing application reads remain unchanged by this foundation.
2. Deploy authenticated admin-write review actions, then the minimal review panel.
   The foundation/admin changes can be staged before consumer activation: they
   do not alter existing scores or product values; no review is created implicitly.
3. Create a small genuine review pilot through normal authentication. Verify fresh
   public receipts, permissions, audit atomicity and invalidation on a test system.
4. Run the prepared **aggregate-only SELECT**, after foundation deployment, and
   explicitly accept the eligible/withheld counts for the release scope. Do not
   launch if the reader is unavailable/erroring, zero intended ready products have
   valid evidence, or unapproved loss exceeds the acknowledged scope. Existing
   unproven-ready behavior remains a known risk until this staged release.
5. Release the consumer only with those prerequisites; validate actual public
   HTTP and UI, not just SQL/functions/HTML200. No deploy/merge is approved here.

The prepared query is `docs/sql/label-evidence-rollout-counts.sql`; not executed.
Historical private snapshots do not establish current operating impact. Fixtures
compare unchanged numeric outputs and changed display/recommendation eligibility.
Where historical snapshots omit raw/joined label evidence, per-product score and
recommendation deltas cannot be computed honestly; that limitation is retained.

## Validation scope

The synthetic flow executes actual auth/router/parser/RPC SQL/public mapper,
reader and product gate. Only Deno serve/SDK transport and minimal schema are
replaced; network is forbidden. SQL role tests cover private access, approvals,
public publication/field limits and atomic evidence/audit failure. Existing full
bootstrap is also run with the legacy guard plus the candidate: this is **guard-included
bootstrap**, not unmodified historical replay, operating schema inspection or
hosted Supabase HTTP. Chromium uses synthetic data and fallback fonts; it is not
real iOS. Current CI results and remaining audit failure are recorded in PR122.

## Independent foundation PR and consumer dependency

PR123 (`feat/label-review-foundation`) owns storage, authenticated review and the
public receipt. PR122 is stacked on that branch; only the consumer diff belongs
to this PR. After PR123 actually lands, integrate its real main and switch base
to main before approving consumer release. Both remain Draft and unmerged.

Actual main/current synthetic mapper+verdict comparison preserves numerical
90/0/0 for safe, known risk/allergy and species-mismatch controls respectively.
Without a queried current proof their score display is withheld; a valid bound
receipt restores display and the safe control's score-qualified recommendation.
Historical private metadata-only snapshots cannot supply those joined inputs;
per-product/live impact counts remain unmeasured. No operating approval or product write was made; aggregate-only SELECT ran.

Product binding also includes target species/life stage, product category and formulation. A synthetic cross-read species change reproduced an old ready result and now withholds it; SQL independently invalidates classification edits even if updated_at is unchanged.

Legacy ingredient links alone are not a captured label. With no single current
label, the review panel explicitly requires source/raw/item capture and exposes
no approval. The existing service-only ingestion/reanalysis SQL is not a new
normal-admin capture UI in this unit. A source-capture/matching workflow for such
legacy products still requires a separately reviewed data-collection unit; this
PR does not manufacture raw labels from names or promote their old ready flag.

## Current main and stacked ownership (2026-11-10)

PR122 is based on PR123's foundation branch. Its unique diff is consumer behavior,
not a second storage implementation or migration. Main124's reviewed/verified
publication gate and package barcode lookup remain authoritative. Main removed
the comparison route; no removed comparison feature is restored for this gate.
After PR123 squash merge, integrate actual main and change PR122's base to main,
then check its unique diff again.

Operating aggregate SELECT at 2026-11-09T18:52:05Z found 277 public products: 266
partial, 11 unavailable; current main readiness candidates 0, new proof table
absent. These are a dated aggregate, not operating proof of successful analysis
or predicted per-user recommendation counts. Old frontend + foundation retains
the old scoring contract until the consumer releases. New frontend + missing DB
reader returns unavailable and withholds, never treats it as absent ingredients.

Receipts certify a read snapshot. No realtime push invalidation is claimed;
foreground/visibility refresh and analysis entry reread server data. Product
identity/ingredient binding rejects mismatched cached projection. No persisted
client-ready flag or browser-controlled activation bypass is provided.

Cache refresh immediately withdraws old loaded receipts from list, selected and
recent products while rereading, retaining known ingredient warnings. A failed
refresh cannot retain the previous verified positive verdict. An idle screen has
no push subscription to arbitrary external edits: server truth is checked again
at the next read/foreground/analysis entry, not continuously certified.

## Release decision packet (2026-11-10, SELECT/dry-run only)

The existing verified CLI/login was recovered. Remote68 statements were retained
privately and byte-rendered into a69-file bundle with the frozen candidate only.
Actual linked dry-run exits0, listing exactly that candidate, no seeds/roles or
include-all. Pre/post dry-run ledger/source/security fingerprints match. No apply
or review issuance happened. Foundation documentation owns backup, source and
command details; duplicated storage SQL is not reintroduced here.

The public277 count uses is_visible=true, reviewed/verified and the current
optional verified-only setting. Every row is explicitly partial266 or unavailable11.
Main readiness cannot resolve either stored state to ready, even when ingredients
exist. Therefore0 is the full-product readiness-gate count in that dated cohort,
not catalog size, all-user recommendation count, nutritional suitability or proof
that nothing can be browsed. NULL/invalid stored states could fall back to ready
with known inputs/no unknowns; the revised post-foundation aggregate counts this
case rather than only stored ready. Multiple-current ambiguity requires separate
review and stops treating that aggregate as an exact main comparison.

Current structurally reviewable public labels0 means no real pilot is selected.
Do not promote partial/unreviewed items, invent a source or approve old ready flags
to satisfy a rollout number. Prepare one exact-package retained-source packet,
complete saved ordered terms/active matches and normal reviewer access first.
Legacy ingredient-list editing is not a current-label matching workflow. Any
missing normal capture/matching path is a separate preparation dependency.

Consumer release requires: at least1 genuine pilot with one atomic evidence/audit
record and matching sanitized public receipt; public HTTP/read UI confirmation;
lookup errors/missing receipts0 in the explicitly accepted release cohort; current
valid proof for every intended ready product; explicit acceptance of all other
withheld states and retained warnings. Stale/blocked/missing proof on intended
ready products, unknown coverage, no eligible pilot or dependency/auth failure
keeps this Draft withheld. Numerical score/ranking formulas stay unchanged.

After123 squash merge, fetch actual main, merge it into122 without force-push,
switch base to main and inspect the three-dot unique diff. Keep only consumer
changes; foundation/migration/runtime bytes must match main. If duplication from
squashed ancestry remains, prepare a fresh main-based branch and replay only the
reviewed consumer patch, retaining this history until reviewed. Do not merge a
validation branch or discard another author's changes to make a clean diff.
No123 audit exception is inherited; current root/landing audit0 is measured in CI.
