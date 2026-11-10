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

## Completed SELECT-only release preflight (2026-11-10)

Operating metadata has 68 ledger rows, matching repository versions/names. The
original statements were fetched through the existing authenticated CLI SELECT
path into private storage. Every historical bundle file was byte-compared with
CLI2.118.0's official fetch rendering (`statements.join(";\n") + ";\n"`), including
original CRLF. Statement-array fingerprints and rendered file hashes are separate
contracts; no authored historical SQL is rewritten to claim identical originals.
Seven unrelated local-only versions are excluded, not repaired or marked applied.

The existing official CLI2.118.0 was recovered from another previously verified
local cache. Archive SHA256 and com.supabase.cli signature match. Its normal
login already accesses the target project. No install, credential extraction or
security bypass was needed. The initial sandbox telemetry-write denial was
resolved through the normal execution permission path.

A fresh normal link, migration list and **actual linked dry-run** completed with
only `20261110100000_ingredient_label_comparison_evidence.sql` planned, exit0,
no seeds, roles or include-all request. The 68 historical versions and the frozen
candidate make a69-file isolated release bundle. This is not an apply. Candidate
objects/version are still absent; pre/post-dry-run ledger, source row fingerprints,
policies, grants, views and related function fingerprints are unchanged.

Backup API metadata, not mere PHYSICAL UI presence, reports latest backup
2026-11-09T21:30:10.726Z **COMPLETED**, PHYSICAL; observed2026-11-10T03:54:19Z.
PITR is disabled. Dashboard restore is an available recovery procedure, not a
restore test or an automatic rollback. Recheck latest success immediately before
any separately approved application.

Current admin-write is v15 ACTIVE, verify_jwt=false. Its five downloaded modules
match current main after provider-unbundle formatting/type erasure normalization,
not byte-for-byte archive identity. The desired seven source files are pinned to
this PR and an exact private hash manifest; normal internal admin authentication
is preserved. Existing reserved service-role key is present; optional session
secret is absent and existing service-key fallback remains unchanged. No secret
value or source download is added to Git.

## Pilot and consumer stop conditions

Current public cohort277 has partial266/unavailable11; structurally reviewable
current labels0. No real pilot product is selected. This is not an assertion that
there are no products or all personalized recommendations return zero.

Before a pilot, collect one exact product/flavour/weight/package/revision source
packet, current whole label and stable ordered items with active resolved matches,
no omitted/unreviewed/conflicting item, and a reviewer who can inspect the retained
original. Existing editor legacy ingredient saves do not by themselves repair
current-label item matching. Source capture/match correction needs its own normal
reviewed path/approval; neither direct service RPC nor ready/count backfill is a
substitute. This foundation approval panel only records a reviewable saved state.

After separately authorized DB → admin-write → foundation/admin hosting, require
at least1 genuine pilot with approved evidence, exactly1 corresponding audit,
verified sanitized public receipt matching the displayed inputs, and no private
fields. Same-state retry must add neither evidence nor audit. Conflict/permission
rejection must add neither; audit-failure and source-mutation tests run in the
existing disposable harness, not by injecting operating failures or editing live
products for a smoke test. Do not retry uncertain approvals before reading state.

Keep122 withheld while no genuine pilot exists, reader/schema/auth is unavailable,
any intended ready product has missing/error/stale/blocked proof, or the explicitly
accepted ready/withheld cohort is unknown. Snapshot277 is a denominator for that
publication predicate, not the whole catalog or every profile. After pilot, check
all intended ready products (including null-status fallback eligibility), not
stored ready alone, and require lookup errors/omissions0 for the release cohort.

After a separately authorized single apply, compare ledger (one new row only),
source table structural/data fingerprints excluding new private objects, all
existing grants/policies/functions, new RPC privileges and sanitized public
absence states. Do not approve live evidence as a deployment smoke test. On an
uncertain result inspect ledger/objects before any retry. On failure stop: no
automatic rollback, history repair, policy deletion or source-data change.
