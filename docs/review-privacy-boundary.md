# Review read boundary: corrected CLI transaction contract

## Operating status and authorization

The previously approved56e969a2 migration was attempted once on2026-11-06 and failed
25P01 at top-level LOCK TABLE. Immediate metadata showed65 ledger rows/statements,
no new version/policy and unchanged RLS/ACL/view/functions. No retry or rollback.
Its exact bytes and failure evidence are retained privately and in Git8f7964e.
The old assumption that the CLI gives LOCK an explicit transaction block was wrong;
the old unit tests' external BEGIN hid that difference. Earlier dry-run proved the
migration list, not executable SQL or transaction semantics.

The underlying authorization gap remains: RLS enabled + effective raw-column
SELECT grants + sole permissive PUBLIC USING(true). The stars-only public view
cannot constrain direct raw-table reads. No real review text/author rows were
queried, and actual exfiltration/counts/HTTP exploitation are not claimed. Existing
public stars/author management/service-only admin semantics are the release
contract, not a new blanket decision about future public review text.

**The new hash has NO operating execution approval.** Draft/unmerged; no operating
DB/CLI call, migration/repair, deployment or merge is part of this correction.

## Official2.118.0 source path

The actual official release binary, not a mock runner, is used in the isolated
PostgreSQL CI tests. Relevant pinned sources:

- [push.handler.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/db/push/push.handler.ts): db push resolves linked/local/db-url targets then calls the shared dbPushCore.
- [db-push-core.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/db-push-core.ts): reads history, identifies pending files, then applies them; dry-run does not execute the candidate.
- [sql-split.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/sql-split.ts) and [migration-file.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/migration-file.ts): dollar-quoted DO bodies stay one statement; transaction=false is a separate mode.
- [migration-apply.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/migration-apply.ts): normal compatible statements and the final parameterized history INSERT are one execBatch; authored BEGIN/COMMIT instead chooses executeSequentially, inserting history AFTER file statements finish.
- [db-connection.sql-pg.layer.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/db-connection.sql-pg.layer.ts): PgBatchQuery sends Parse/Bind/Execute for each operation and one final Sync. execBatch owns a pooled backend connection; this is not an authored explicit BEGIN block.
- [migration-history.ts](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/migration-history.ts): normal history INSERT is version/name/statements, appended by the runner; no manual ledger mutation is in this migration.

Source comments alone are insufficient. The integration job verifies actual server
transaction IDs, backend IDs, failure rollback and stored statement count. It also
proves the naive authored BEGIN/COMMIT counterexample: policy can commit before a
failing ledger INSERT. Do not use that workaround or merely remove LOCK.

## Corrected single-statement candidate

File: `supabase/migrations/20261106090000_restrict_raw_review_reads.sql`.

SHA-256: `80d8f31dc699ac0fdeb3690785eadc31da7b220b476e05d2a9ba89df79529c82`.

The one dollar-quoted DO encloses set_config(lock_timeout,5s,true), LOCK, definition
checks and the same restrictive policy creation. There is no top-level SET LOCAL,
LOCK, BEGIN/COMMIT, transaction=false directive, nontransactional command, manual
ledger INSERT, application function, grant expansion, data rewrite or public-view
change. The PL/pgSQL block BEGIN is a block delimiter, not transaction control.
DO's statement context accepts LOCK; the CLI's normal batch must still include its
ledger INSERT before the final Sync. The actual-runner tests establish whether
policy and ledger share one transaction, rather than assuming it.

Policy: restrictive SELECT to anon/authenticated, auth.uid()=user_id. Existing RLS
must be enabled. Equivalent same-name policy is idempotent; changed policy/view
contract fails closed. Existing permissive SELECT/ALL policies do not override the
restrictive read condition. Owner writes, public five-field stars and normal
verified Edge -> service-role moderation/audit/aggregate access are preserved.

## Real CLI/PostgreSQL tests and limits

`node scripts/test-review-privacy-cli.mjs` requires a disposable loopback trust-auth
PostgreSQL service and the verified official2.118.0 CLI. It refuses external hosts,
non-postgres login, embedded credentials or a non-postgres maintenance database.
It creates only review_privacy_cli_* databases, sets up fixtures on separate psql
connections, and cleans up only those databases. No outer BEGIN wraps candidate
execution. No operating project refs/credentials, account data or secrets.

The production subcommand is db push --linked --workdir BUNDLE. Local tests invoke
the same db push executor with --db-url LOOPBACK in place of --linked; no fake
Management API, production profile or extracted token. Linux official release
archive SHA256 is pinned to its release digest. There is no system installation,
security change, runtime dependency or live Supabase project connection.

Scenarios, results recorded in CI artifacts/PR body:

1. Normal candidate: exactly one policy/ledger row, one stored split statement;
   DDL event trigger and ledger BEFORE/AFTER triggers record one backend/transaction
   ID and5s local timeout. Existing row/ACL/view/old-policy fingerprints unchanged.
2. Success rerun: no policy/ledger/event change.
3. Before-policy DDL failure: neither policy nor ledger survives.
4. After-policy DDL failure: neither policy nor ledger survives.
5. Ledger BEFORE INSERT failure: policy and ledger both rolled back.
6. Ledger AFTER INSERT failure: policy and inserted ledger both rolled back.
7. Competing backend ACCESS EXCLUSIVE lock:55P03 after actual wait, neither object
   survives; lock holder is a separate connection, never an enclosing test wrapper.
8. Rejected authored COMMIT variant: demonstrates committed policy + missing ledger
   under ledger failure, so this is a rejected local-only counterexample.
9. Rejected top-level LOCK variant: reproduces25P01 through the actual CLI.

Event/ledger failure injection is local only; the candidate bytes are unchanged in
scenarios1–7. Real operating definition is separately reproduced by32 PGlite role
regressions, now running the single DO without external BEGIN. Bootstrap with
existing guards remains a compatibility test, not pristine historical replay.

This is PostgreSQL17.6 and the official Linux2.118.0 binary. Actual Mac arm64
linked authentication, hosted Supavisor/pooler and network-loss-at-commit behavior
are NOT exercised by the local db-url job. Sources show the shared migration/batch
executor; that does not certify every hosted intermediary. A disconnect/ambiguous
result always requires read-only policy+ledger inspection before any retry.
Timeout5s bounds lock acquisition, not total lock duration. Nontransactional
sequences, external effects and arbitrary other migrations are outside this
policy+ledger guarantee. Do not generalize one candidate's evidence to every file.

## New release approval, not inherited from the failed hash

The old private65+1 bundle and old application approval remain frozen and blocked.
The corrected bundle is prepared separately/offline from those65 exact remote
statement files plus the new candidate. The seven unrelated old pending migrations
remain in the repository and are excluded from this one-policy release. Do not
execute them or mark them applied. No operating dry-run/apply is run for this new
hash in the correction task; the old dry-run is NOT new-hash evidence.

Before a separately approved attempt: recheck current project, complete ledger and
statements, policy/RLS/ACL/view/function fingerprints, latest COMPLETED backup and
PITR state, and every corrected bundle hash. Confirm the failed version is still
absent. If the version/policy has changed, stop; no silent content replacement or
repair. Link the corrected bundle through normal CLI authentication, not copied
.temp/session values. Require actual linked dry-run to show only the candidate
and empty seed/role arrays, with no history error/include-all requirement.

Then, ONLY with new explicit approval for the new hash, the command remains:

```sh
"$SUPABASE_BIN" db push --linked --workdir "$CORRECTED_RELEASE_BUNDLE"
```

Do not add authored BEGIN/COMMIT, manually record history, or change CLI versions
without repeating the actual-runner contract. After application require one new
ledger row, old65 rows/statements unchanged, exact restrictive SELECT policy,
unchanged old policies/grants/public view/admin functions and intended public
HTTP behavior. Owner HTTP requires a real normal-user session; no admin token or
service-role substitution and no other user's raw review text.

On SQL/ledger/lock failure inspect real state, do not automatically retry/drop the
policy/disable RLS/repair/restore. On connection loss do not infer success/failure
from the process code. A physical restore can lose later changes and is not an
automatic rollback. The last preparation's backup/PITR snapshot is historical,
not a new deployment-time backup attestation.

#116/#117 verification and audit investigation are not repeated. #115 stays paused,
#118 validation-only. Preserve staged4, private failure/approval evidence and
completed whitespace records; never publish operating ledger SQL or product data.
