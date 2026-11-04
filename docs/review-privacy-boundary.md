# Conditional raw-review read boundary

## Operational evidence status

No current operational reviews policies/RLS/ACL/view definition were obtained.
The Chrome extension inventory worked, but documented tab control failed; repeated
connection attempts were stopped. Do not describe the conditional reproduction
as an operational data leak. Earlier64-version ledger evidence lacked the pending
account-privacy migration, which is a reason to inspect effects, not proof they
are absent. No actual review contents/user identifiers were queried to test exposure.

Run `scripts/sql/review-privacy-metadata-select.sql` in a NEW query in the normally
authenticated, operator-verified Dashboard project. It returns one JSON result:
RLS and table/column SELECT/INSERT/UPDATE/DELETE capabilities, all reviews policies,
known owner/unconditional condition flags, view security/columns/literal-redacted
SQL and hashes, existing administrator function privileges and relevant ledger.
No row data, user identities, secrets or function bodies. Policy hashes/flags are
not complete logical proofs; unknown definitions need private schema review.
A role privilege alone is not effective row access: both grants and RLS apply.

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
migration. It tests legacy permissive and existing owner-policy baselines; public
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

1. Obtain current metadata. Decide whether raw access can bypass the public view:
   grants + all permissive/restrictive policies + role membership/RLS + view contract.
   If owners are already isolated, this hardening may be redundant defense-in-depth;
   do not call it a confirmed production defect. If public text is a real product
   requirement, resolve that separately instead of hiding it under this proposal.
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
#116/#117 stay separate; #118 remains integration-only. Real hosted policy and
related deployment/history facts remain unverified until the metadata is supplied.
