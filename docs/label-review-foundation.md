# Whole-label review foundation (not consumer activation)

This dependency PR adds the authenticated admin review panel/actions, atomic
private evidence/audit storage and sanitized public status RPC as a SQL **draft**.
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
the consumer gate or remove existing scores/recommendations. It adds no automatic
migration, seed, Supabase deployment or approval operation. If server/SQL is absent,
the new admin panel reports unavailable and cannot write; other editor operations
are unchanged. Existing unproven-ready scoring remains a known pre-existing risk.

Separately approve/promote a frozen forward migration and validate target schema;
apply storage/RPC before deploying new admin-write actions. Then use normal admin
review to create a real pilot. Run the prepared aggregate-only rollout SELECT
(after foundation exists) and review withheld counts. Only then approve PR122
consumer rollout. Never deploy PR122 frontend first or relax its evidence check
for compatibility. Both PRs stay Draft/unmerged in this task, with no operating
DB/API access or deployment.

The service harness executes real authentication/router/parser/SQL and public
receipt with only SDK/Deno boundary and minimal synthetic schema substituted.
PGlite role checks and existing **guard-included bootstrap** plus SQL draft are
not unmodified historical replay, real multi-connection concurrency, operating
schema verification or hosted HTTP. CI results and existing audit failure remain
separate; no prior audit exception applies.

A product without one captured current label cannot be approved by this panel.
It explicitly requires raw-source/item capture first; old legacy ingredient links
are not a substitute. Existing service-only ingestion/reanalysis SQL is not a
new administrator capture/matching UI. Enriching legacy products without a usable
current label is a later data-collection unit, not automatic evidence creation.
