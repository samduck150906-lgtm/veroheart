# Whole-label review foundation (not consumer activation)

This dependency PR adds the authenticated admin review panel/actions, atomic
private evidence/audit storage and sanitized public status RPC as an unapplied forward migration candidate.
It does not change public product SELECTs, analysis eligibility, scores or ranking.
Existing parser code is moved to a shared module byte-for-byte and re-exported;
no tokenization/matching algorithm is changed.

A reviewer must inspect the entire exact package/source, acknowledge every item,
and provide new identity/coverage/source observations. Existing admin session
verification supplies the actor. Edge checks the current revision and the
existing ordered parser contract. The service-only RPC independently rereads
under bounded SHARE locks, checks revision/all reviewed IDs/matching state,
stores the current snapshot and audit atomically, and deduplicates that state.
No old ready/count/match rate is converted into approval. A checksum proves
snapshot equality, not human review truth. External images are not archived by
this panel: the source reference must identify independently retained evidence.

Private raw snapshots, source observations and reviewer identity have no direct
application grants. Public output is allowlisted state/version/product/label plus
verified-only public analysis binding. Explicit existing publication conditions
exclude hidden/unrecognized/verified-only-disallowed products. Public status is
as of its statement snapshot, not continuous live certification. Changes to raw,
item identities/matching/resolved definitions or product revision invalidate it.
Table-wide SHARE locks can briefly block source writers (3s lock timeout); no
automatic retry. Immutable history has no cascading product foreign key.

## Independently safe rollout and consumer dependency

This foundation can be reviewed/merged separately from PR122: it does not activate
the consumer gate or remove existing scores/recommendations. It adds no automatic Supabase deployment, seed or approval operation. The
formal migration file must not be included in an operating push before separate approval. If server/SQL is absent,
the new admin panel reports unavailable and cannot write; other editor operations
are unchanged. Existing unproven-ready scoring remains a known pre-existing risk.

Separately approve the frozen forward migration and validate target schema;
apply storage/RPC before deploying new admin-write actions. Then use normal admin
review to create a real pilot. Run the prepared aggregate-only rollout SELECT
(after foundation exists) and review withheld counts. Only then approve PR122
consumer rollout. Never deploy PR122 frontend first or relax its evidence check
for compatibility. Both PRs stay Draft/unmerged in this task, with aggregate-only operating SELECT preflight and no operating writes or deployment.

The service harness executes real authentication/router/parser/SQL and public
receipt with only SDK/Deno boundary and minimal synthetic schema substituted.
PGlite role checks and existing **guard-included bootstrap** plus the candidate are
not unmodified historical replay, real multi-connection concurrency, operating
schema verification or hosted HTTP. CI results and existing audit failure remain
separate; no prior audit exception applies.

A product without one captured current label cannot be approved by this panel.
It explicitly requires raw-source/item capture first; old legacy ingredient links
are not a substitute. Existing service-only ingestion/reanalysis SQL is not a
new administrator capture/matching UI. Enriching legacy products without a usable
current label is a later data-collection unit, not automatic evidence creation.

## Revision integrity and deployment candidate

`20261110100000_ingredient_label_comparison_evidence.sql` is the sole new forward
migration candidate. No historical migration is modified or marked applied.
A private generation counter and transaction-local triggers on products, current
label sets/items and resolved ingredient definitions invalidate evidence even if
a value changes and later returns to its original value (ABA). All ordinary SQL
writers participate, including existing service paths. Non-current label and
unrelated product updates conservatively invalidate evidence too. No history is
cascade-deleted. Approval SHARE locks conflict with ordinary source table writes;
timeout/deadlock fails closed, with no automatic retry.

The migration is one DO statement with a transaction-local 3-second lock timeout,
no explicit COMMIT and no product backfill. Trigger DDL takes write-conflicting
table locks; schedule a short quiet window. Existing CLI/PostgreSQL CI runs the
exact candidate with official CLI 2.118.0 and checks DDL/ledger transaction IDs,
DDL and ledger failure rollback, timeout, re-execution, two-connection races and
ABA invalidation. This is disposable PostgreSQL, not operating linked execution.

PR122 is stacked on this foundation for a consumer-only diff. After PR123 squash
merge, integrate the actual main and switch PR122's base to main; recheck its
unique diff rather than merging a validation-only branch. Old frontend + new
foundation remains old scoring behavior: it does not consume the proof gate.
New frontend + missing foundation fails closed as unavailable, not absent.
Release storage/RPC → admin-write → real pilot review → consumer only after
aggregate impact review. The known old-client risk persists during the transition;
no browser switch or ready-count fallback bypasses the gate.

## Frozen candidate and remaining operating gate

Candidate SHA-256: `15cc29d8a7524e8d1778afafb61b036b5b756a23c33e0e10c2dbc0be4b8e6a83`.
Expected changes: private revision counters/triggers, immutable comparison history,
private snapshot/validation helpers, two service-only admin RPCs and one sanitized
public reader. No source/product writes, historical migration changes or seeds.
Existing anonymous/authenticated source permissions are not broadened.

Aggregate operating metadata found 68 ledger versions, all present locally with
matching version/name, but seven unrelated local versions are absent remotely.
The candidate is the eighth local-only version. Version/name parity is not SQL
body equality. Their SQL must not be run, repaired or silently marked applied as
part of this release. The original approved Mac CLI path is absent; no replacement
was installed. Therefore an **operating linked dry-run has not run**, and no
remote-history bundle is represented as verified. The successful disposable CLI
run is not a substitute for that release gate.

Before operating approval: use an existing authorized verified CLI/connection,
compare remote ledger originals with the bundle, list migrations, and require
`supabase db push --linked --dry-run` to list only the frozen candidate with no
seeds/roles. Stop on any drift, other migration or include-all request. Recheck
the latest completed backup and the target project immediately before approval.
The Dashboard showed a PHYSICAL backup dated 2026-11-08 21:29:59 UTC with Restore
action; literal COMPLETED status was not displayed. PITR is not enabled.

After a separately authorized single apply, compare ledger (one new row only),
source table structural/data fingerprints excluding new private objects, all
existing grants/policies/functions, new RPC privileges and sanitized public
absence states. Do not approve live evidence as a deployment smoke test. On an
uncertain result inspect ledger/objects before any retry. On failure stop: no
automatic rollback, history repair, policy deletion or source-data change.
