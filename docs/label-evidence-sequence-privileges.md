# Label evidence identity sequence: unapplied follow-up

Operating foundation migration20261110100000 was successfully recorded once with
its frozen hash15cc29d8…; existing data/security fingerprints remain unchanged and
no evidence/approval rows exist. Do not edit/reapply that file. Edge deployment,
PR123 merge and consumer release were stopped at the extra sequence ACL gate.

Operating metadata confirms existing Supabase defaults grant `rwU` on new public
sequences to anon/authenticated/service_role. The foundation revokes table/function
access but omitted its generated identity sequence. The new sequence therefore
inherits direct USAGE/SELECT/UPDATE privileges, including SQL-role `setval` ability.
This is not evidence of an actual hosted anonymous HTTP exploit or a data leak:
no operating setval/nextval was called, and no public built-in wrapper was found.
Default-ACL metadata and disposable SQL-role reproduction are separate evidence.

The unapplied forward draft20261111150000 revokes all application/PUBLIC privileges
on this one exact identity sequence. It does not change global default ACLs, any
source/product/matching data, existing policy/table/function grants, evidence/audit
rows, sequence value or ownership. Normal owner-definer approval retains sequence
access, including state dedup and atomic audit. Missing/renamed target fails closed.
The draft is outside automatic migrations; original execution approval does not
apply. Separate review, promotion, exact hash/ledger/preflight and operating
approval are required. No automatic rollback or weakening of RLS is provided.

PGlite tests model actual platform sequence defaults, show old anon SQL-role
setval while table access is denied, deny application roles after the draft, and
preserve service RPC approval/audit/public field bounds. Existing real PG/official
CLI harness adds a fresh default-ACL fixture and tests the forward draft's apply,
normal owner-definer approval, and ledger-failure rollback of REVOKE. Those are
loopback synthetic tests, not operating HTTP or an operating permission change.
No new dependency or audit threshold change is made.

This follow-up is stacked on PR123 so its unique diff is the draft/tests/docs only.
PR123's approved HEAD and applied migration remain untouched. Until separately
approved sequence isolation and authenticated compatibility checks succeed, do
not deploy the Edge function or merge123/122. PR122 remains Draft and still also
requires genuine complete-label review/matching evidence before activation.
