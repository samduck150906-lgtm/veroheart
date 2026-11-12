# Label evidence identity sequence privileges and release order

## Confirmed boundary

Operating foundation migration `20261110100000` was applied once with frozen hash
`15cc29d8a7524e8d1778afafb61b036b5b756a23c33e0e10c2dbc0be4b8e6a83`.
Do not edit, rename or rerun it. The separately approved sequence follow-up was
applied once on2026-11-12KST, ledger69→70, with no old data/security changes.
admin-writev16 ACTIVE source matches the approved seven files exactly;401/401
passed and normal verifyAdmin200/ok/actor presence was user-confirmed. PR123
merged as34d2d43c5f27a22838a72c6abb253c05e33a23a5; app/admin publish that SHA.
Landing skipped its unchanged directory; no new landing build is claimed.

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
applies to this changed file. A new explicit approval covered the exact formal
hash; it is now operating-applied and immutable. Do not reapply or rename it.

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

## Applied state and safe repository order

DB125 postchecks confirm application SELECT/USAGE/UPDATE all false, unchanged
sequence/table/definer ownership and RPC permissions, one new ledger row only,
all old source/security/other-sequence/default-ACL fingerprints preserved and
zero evidence/approval-audit records. No operating nextval/setval/approval test.
The operator reserved-key session fallback is unchanged; no secret setting changed.

PR123's actual squash main has exactly the approved foundation tree. This PR's
unique four commits were replayed onto that actual main, with the old approved
HEAD retained locally. The applied SQL filename/version/body hash are identical.
No duplicate foundation diff remains. This PR stays Draft and needs a separate
new-fixed-HEAD repository merge approval; its DB migration must not be rerun.
The temporary DB-ahead-of-main interval is tracked until this PR is merged.

The preparation model found ordinary merge-main would create add/add conflicts;
replaying only unique commits avoids that. Do not merge old foundation history
back in. PR122 should remain stacked on this follow-up while its applied migration
is not yet in main, keeping consumer-only diff inspectable. After actual125 merge,
replay only122's unique consumer patch onto actual main and inspect/validate it.
122 stays Draft until genuine reviewed pilot/coverage acceptance. No ready fallback.

The last pre-rebase125 layout run was CANCELLED during Playwright dependency
installation after logged Ubuntu DNS errors, before browser tests. The earlier
single manual retry failed at the same external dependency boundary. No pass or
waiver is claimed; new-head CI records its own result without repeated manual
retries. Functional checks are separate from this unrelated layout environment.
No migration, Edge function or production deployment is run by this repository
follow-up update. Never revert operating permissions automatically on CI failure.

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
