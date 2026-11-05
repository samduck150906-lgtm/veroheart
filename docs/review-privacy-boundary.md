# Raw-review read boundary: metadata-confirmed repair proposal

## Operational metadata confirms a raw-read boundary gap

Operator-supplied SELECT evidence was observed at **2026-11-06 01:24:50 KST**
(2026-11-05T16:24:50.616433Z). Its private original is preserved outside Git.
No operational review content, author identifiers or raw review rows were read.
This is a confirmed database authorization gap, **not proof of actual access,
exfiltration, nonempty legacy text, affected row counts or HTTP endpoint reachability**.

The decision combines all reported layers, rather than inferring access merely
from a policy name or a missing ledger version:

- reviews RLS enabled, FORCE RLS false; no restrictive SELECT/ALL policy reported.
- anon/authenticated have table SELECT and effective SELECT on every raw column,
  including user_id/content/is_hidden. UPDATE is denied. INSERT/DELETE privileges
  alone do not imply those operations are unrestricted: their RLS still applies.
- The only SELECT policy is PERMISSIVE TO PUBLIC USING(true). Thus both public
  client roles can pass the raw table read checks for other authors/hidden products;
  the public view's projection and row predicates are not applied to raw reads.
- product_ratings remains the intentional public five-field representation, with
  security_barrier=true, owner execution (not security_invoker), the same owner as
  reviews, and a non-superuser BYPASSRLS owner. It excludes hidden reviews/products,
  checks publication status and the optional verified-only gate. Redacted status
  literals alone are not proof of their original values; its definition fingerprint
  matches the repository-derived local view, including those original literals.
- The three reported service-only admin/aggregate functions match local generated
  definition fingerprints; anon/authenticated cannot execute them. This does not
  attest to all production schema definitions or original migration statements.

**Decision: the draft is needed; it is not just redundant defense-in-depth.**
It adds one restrictive owner SELECT condition without changing the public view,
existing write policies/grants or verified-admin service access. Original
account_privacy_release is not shown in the relevant ledger subset; do not mark
it applied or deploy it wholesale. Individual effective metadata is the evidence.

The production-shaped synthetic fixture matches all reported policy names/roles/
commands/condition fingerprints, table/column privileges, RLS flags, view security/
owner execution and view/function fingerprints. It supplies the view owner's
products SELECT dependency locally; that dependency's effective grants were not
included in the operator query and are not claimed independently verified.
Fixture service grants reproduce observed effective permissions, not an assumption
that the two imported migration files alone create every production grant.
It reproduces raw content/author/hidden-product access for anonymous and user B
using only synthetic A/B rows, then reruns owner/public/admin/write/aggregate checks
against the unchanged deployment SQL. No real user content was needed.

The metadata query at `scripts/sql/review-privacy-metadata-select.sql` remains a
single SELECT-only JSON query for deployment-time drift checks. It returns policy/
RLS/ACL/view metadata, not review rows, user identities or function bodies.

## Existing product contract, not a new global text policy

The current normal client `src/lib/supabase.ts:getReviews` selects exactly id,
product_id,rating,created_at,is_mine from product_ratings. createReview accepts only
integer stars1–5 and an empty content; deleteReview filters id+authenticated author.
There is no current user UPDATE API. Main's existing
20261026160000_account_privacy_release explicitly describes legacy text as
available only to its author/admin. Main20261104110000 keeps this stars projection,
filters moderated reviews and preserves service-only audited moderation.

Those are the current implementation's boundaries, not a claim that all possible
future review text must be private. If public text is intended/deployed, document
its opt-in/publication/moderation rules and an allowlisted public representation
first. This draft fails closed on a changed public field contract rather than
silently removing intended public content. Stars/time/current-user is_mine remain
public under existing product-publication and moderation conditions; raw user_id,
legacy content and back-office fields are not a replacement public API.

## Minimal conditional SQL

`supabase/migration_drafts/review_raw_read_boundary.sql` stays outside automatic
migration execution. It serializes on reviews, verifies the existing five-column
public view/owner execution model and adds one RESTRICTIVE SELECT policy for
anon/authenticated: auth.uid()=user_id. Existing reviews RLS must already be enabled;
otherwise abort for a separate per-operation review. Never toggle or FORCE RLS.
No existing permissive policy is dropped/replaced; no GRANT/REVOKE, content/data
rewrite, public view/trigger/function change or INSERT/UPDATE/DELETE policy change.
An existing different same-name guard aborts instead of being silently overwritten.

Permissive policies OR together. The additional restrictive condition ANDs with
that OR: other people's raw rows remain hidden even if a permissive SELECT/ALL
policy allows them. It does not grant authors new columns/operations: all prior
privileges and permissive checks still apply. With no permissible read policy,
owners remain denied as before; do not fabricate grants to make the test pass.
This is SELECT hardening, not protection from arbitrary future INSERT permissive
policies or privileged service credential misuse.

Existing authors keep their raw rows, including their own moderated/hidden-product
legacy records, as allowed before. Anonymous clients get no raw row under a null
UID. A public projection remains owner-privileged, intentionally exposes only its
existing safe fields and retains hidden-product/strict-gate/moderation filtering.
A security_invoker view, unknown fields/types or incompatible ownership/FORCE RLS
requires separate review and aborts. The draft does not alter view ownership,
expand the caller's grants, or certify an unrecognized view's row predicates.

Normal administrators authenticate through admin-write before a server-held
service-role client reads reviews or calls admin_support_correct. That role's
BYPASSRLS/admin privileges are preserved. An authenticated client claiming to be
an admin is not a service-role bypass. Tests do not add such a client privilege.
Current owner UPDATE remains denied; rating corrections/aggregate triggers and
service-only moderation continue as defined by existing SQL.

## Synthetic PostgreSQL verification and limits

`npm run test:review-privacy` uses existing PGlite (actual PostgreSQL SQL/RLS engine)
with A/B/anon/service-role, existing aggregate SQL and current actual admin-support
migration. It tests legacy permissive, existing owner-policy and observed operational-metadata baselines; public
stars/field allowlist; hidden-product and moderated review exclusion; own raw text;
extra permissive SELECT/ALL policies; INSERT RETURNING/owner delete; wrong-author
writes; denied UPDATE; service moderation/audit/conflict/unhide; real aggregate
updates; idempotency; metadata redaction; and fail-closed view/policy drift.

`test:bootstrap` additionally applies and rolls back the draft against the
existing guard-included complete repository bootstrap, preserving rows, ACL,
public view and administrator function definitions. This is not pristine historic
replay, current operational parity, actual JWT/HTTP authentication, separate
backend sessions or multi-connection stress. SQL claims are synthetic. No hosted
raw review rows/credentials/accounts were used. Current code/normal-admin unit
regressions and build run through existing Linux CI; contents:read, no operational
secrets/DB/deployment steps. The known audit gate remains unchanged.

## Approval and tracked deployment plan — not performed

1. The supplied metadata establishes necessity at its observation time. Immediately
   before any approved release, repeat only metadata preflight to detect drift:
   grants + all permissive/restrictive policies + RLS + view contract. If the raw
   boundary has since been fixed, do not add a redundant policy. If intentional
   public text or an incompatible view is newly present, stop rather than hide it.
2. Check normal owner/star CRUD, service-only admin/audit, public view definition
   and backup/restore access before any deployment approval. Preserve original
   review data and all public/moderation/strict-product gates.
3. After separate approval only: promote exact reviewed SQL to a fresh tracked
   migration later than the actual remote maximum, using an audited exact-only
   release plan. Pending originals are not marked applied. No include-all, repair,
   manual ledger INSERT or untracked SQL Editor DDL. CLI must own the transaction
   and normal ledger insert; this draft has no authored outer BEGIN/COMMIT.
4. Record product/review row and existing ACL/view/trigger/function fingerprints,
   role-access probes on synthetic nonproduction data and policy metadata. Apply
   under lock_timeout5s; ACCESS EXCLUSIVE can block reads/writes once acquired.
   Any precondition/lock/SQL/ledger failure must roll back the CLI transaction.
   Then verify policy/definitions/row fingerprints and normal public/owner/admin
   behavior without fetching another user's raw operational contents.
5. No automatic rollback. Removing the restrictive policy could reopen private
   reads; disabled RLS is not a rollback. Any reversal needs explicit security
   review/approval. This PR performs no deployment, history repair or merge.

The current new main already includes other admin/catalog/account changes. This
PR does not deploy any of those pending migrations to obtain its prerequisites.
#116/#117 stay separate; #118 remains integration-only. Reported operational RLS/ACL/view/admin-function metadata now establishes the
read gap at the supplied timestamp. Current full ledger/remote migration statement
identity, hosted HTTP access, real row contents/counts and later drift are not
verified by this evidence. #116/#117 validation is unchanged and not repeated.


## Frozen deployment candidate and remaining release gates

- Exact file: `supabase/migration_drafts/review_raw_read_boundary.sql`.
- SHA-256: `30cc1af3adcdc8e9b53547ca40afc8e48ca8d69a662aaeeb01ebaafcd929271f`.
- Effect: CREATE one restrictive SELECT policy `reviews_owner_read_required` for
  anon/authenticated, `auth.uid() = user_id`. No table/view/function/ACL/data change.
- Same-name equivalent policy: no replacement or duplicate; different definition:
  exception. Disabled RLS/incompatible public view/SQL error aborts the transaction.
- ACCESS EXCLUSIVE lock on reviews; 5s lock wait timeout. Reads/writes may block
  while held. Do not hold this transaction open for manual inspection. No duration
  guarantee from the single-connection tests and no lock-contention test claim.
- Local candidate SQL is unchanged from the already tested draft: no new grant,
  ownership, RLS enable/force, view rewrite or unrelated write restriction was added.

Only after separate release approval: capture fresh metadata + full remote version/
name ledger (not review rows), latest completed backup/restore capability and
current application/PR heads. Assign a fresh version above the actual remote max;
copy these exact bytes to a tracked migration in an isolated release branch and
verify the hash. Reconcile the full remote statement manifest through a reviewed
normal release bundle; do not run pending originals, repair history or add
include-all. Do not infer SQL equality from version/name equality. If a normal
linked dry-run cannot show **only the approved new policy file**, stop before apply.
No release bundle, version promotion, linked dry-run or operational command has
been performed by this PR update.

The approved CLI must atomically own migration SQL plus its normal history entry.
No SQL Editor DDL, manual ledger INSERT, fake applied status or nested transaction.
Fresh preflight must still confirm RLS + view owner/field contract. After the
approved commit, verify one new ledger entry, one exact restrictive policy,
unchanged old policy/ACL/view/function fingerprints and no DML in the deployed
file; repeat synthetic role regressions on that exact file. Verify public view
queryability with existing normal clients and metadata, not another user's raw
review text. Counts alone must not be presented as proof of value preservation.
No app/Edge Function deployment or #116/#117/#115 merge is required for this SQL
boundary change. Their separate release/audit decisions are not bypassed.

If lock/guard/schema/history checks fail, stop with the transaction rolled back;
no automatic rerun, broad recovery migration or rollback. Dropping the restrictive
policy restores the known exposure and requires an explicit security decision.
Normal public star fields remain available; UI/public HTTP behavior is not newly
certified by local PostgreSQL role tests. Audit failures stay visible and unchanged.
