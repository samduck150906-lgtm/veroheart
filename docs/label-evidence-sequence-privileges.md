# Label evidence identity sequence privileges and release order

## Confirmed boundary

Operating foundation migration `20261110100000` was applied once with frozen hash
`15cc29d8a7524e8d1778afafb61b036b5b756a23c33e0e10c2dbc0be4b8e6a83`.
Do not edit, rename or rerun it. Edge deployment and PR123 merge stopped at the
additional sequence ACL gate. The current Edge function remains v15.

Catalog dependencies identify `public.ingredient_label_comparisons_sequence_seq`
as the sole internal identity dependency of `ingredient_label_comparisons.sequence`:
GENERATED ALWAYS, bigint, increment/start/min/cache1, maximum bigint, no cycle.
Sequence, table and SECURITY DEFINER approval function have the same postgres owner.
Direct SELECT/USAGE/UPDATE grants exist for anon/authenticated/service_role; there
is no PUBLIC grant and these roles have no inherited membership paths in the
observed metadata. Existing Supabase default sequence ACLs caused the grants.
The private table and RPC boundaries are separate and remain enforced.

This enables SQL-role sequence reads/mutation in disposable reproduction; it is
not proof of a hosted anonymous HTTP route, RLS bypass or private-text disclosure.
No operating nextval/setval request was made. No public wrapper was found.

The service_role needs EXECUTE on the approval RPC, not direct sequence access:
the definer owner performs its identity INSERT and atomic audit. Revoking all
application sequence grants preserves this path and the owner's privileges.

## Formal forward migration

`supabase/migrations/20261111150000_restrict_label_evidence_sequence.sql`

SHA-256: `75d1ad886dcef2c5f6a8136b53d8d149c47361ad0cbc578f84367c65552ef9d9`.
The earlier draft hash is superseded: the formal file adds fail-closed catalog
checks and a postcondition rejecting surviving inherited access. No old approval
applies to this changed file. It remains unapplied pending separate authorization.

The single DO statement validates name, relation kinds, internal identity
attachment, column type/nullability, sequence parameters and common owner/definer.
It then revokes PUBLIC/anon/authenticated/service_role privileges on this sequence
only. Unexpected surviving effective privileges raise an error and roll back.
It does not change global defaults, another sequence, sequence value/owner,
product/label/matching data, table/function grants, policies, views or evidence.
The transaction-local lock timeout is3s. No external BEGIN/COMMIT, manual ledger
record, repair or include-all is allowed. The official CLI records the DO and
ledger in one transaction; ledger failure must roll back the revoke as tested.
On an ambiguous response inspect metadata/ledger first; no automatic retry/rollback.

## Verification scope

Ten PGlite role/definition tests cover inherited and PUBLIC access, renamed and
same-name unattached targets, settings drift, unrelated sequence/default ACL
preservation, owner-definer approval/dedup/audit and public field bounds.
The guarded full repository bootstrap now models platform sequence defaults and
asserts the final effective ACL, alongside publication and review boundaries.
This is guard-included bootstrap, not unmodified historical replay.

The actual PostgreSQL17/CLI2.118.0 harness separates fresh foundation installation
from a synthetic69-row prior ledger upgrade. It checks69→70, prior ledger bytes,
sequence-value preservation, no-op rerun, service-role definer approval, ledger
failure rollback and a concurrent ACL lock timeout. Synthetic prior ledger rows
are not a replay of operating SQL. Loopback trust authentication and SQL-role
checks are not hosted HTTP authentication or an operating approval test.

## Safe DB and Git order

1. Keep123 and122 Draft while preparing this fix. PR125 stays stacked on123;
   its main diff must not be merged alone before the foundation is in main.
2. After separate fixed-file authorization, apply only125's forward migration
   from a private bundle containing69 exact remote statement renders plus this
   candidate. The seven unrelated pending repository migrations remain excluded.
   Verify70rows, only the new ledger entry, application sequence privileges all
   false, owner-definer/RPC bounds and source/security fingerprints preserved.
3. Deploy only the frozen123 admin-write bundle; verify the new ACTIVE version,
   source correspondence, 401/401 and authenticated verifyAdmin success. The old
   v15 functions are preserved;123 adds only the two label-review routes and their
   modules. Do not claim source archive byte identity after provider unbundling.
4. Recheck and squash123 at its unchanged approved HEAD. DB dependencies already
   exist, then automatic app/admin hosting may expose the normal review UI.
5. Immediately integrate actual squash main into125, switch base to main, inspect
   only the ACL migration/tests/docs diff and revalidate affected checks. Merge125
   only under its own explicit approval. This preserves fresh replay ordering:
   the base foundation precedes the ACL hardening. Do not close/drop the applied
   migration if the repository merge is delayed; keep an applied-state handoff.
6. Only after actual123/125 history is in main, clean122's stacked base using that
   main, remove duplicate foundation diff, preserve consumer gates and keep Draft.
   Launch122 requires genuine reviewed pilot/coverage acceptance; no ready fallback.

A brief interval with deployed DB history ahead of Git is intentional and tracked;
merging125 alone first would break fresh replay and is prohibited. No migration
runs automatically from the current hosting workflow. Failure after DB apply stops
later stages; preserve applied history and do not automatically revert permissions.

## Pilot requirements and stop conditions

The two previously inspected Royal Canin rows still lack exact local package size,
barcode/revision and full Korean back-label proof;33/36 current items are unreviewed.
Do not repeat generic product-family searches or fill fields from a similar page.
Collect front/back/all ingredient panels plus barcode, net weight/count, market
label and lot/revision/date evidence for the exact package. Normal current-label
capture/matching preparation is distinct from the legacy ingredient editor; the
existing editor's RPC writes product_ingredients, not current label-item matching.
This is a missing workflow, not a proven broken save action. Approval cannot create
or guess matches; no directSQL/backfill/forced-reviewed workaround is permitted.
