# Three-column recovery: release preparation, not deployment approval

## Evidence and bounds

Normal Dashboard SELECT results supplied by the operator on 2026-11-03 show all
three source columns absent, the queried original migration versions absent from
the ledger, the import function absent and both manufacturer indexes absent.
These are operator-supplied observations, not an agent-operated Dashboard query.
The full ledger and full hosted public projection remain **unverified**. Do not
infer all other schema objects match or that the old URL aggregate proves there
were no source records in other tables.

## Exact proposed change

Candidate: `supabase/migration_drafts/20261103120000_restore_product_source_contract.sql`.
SHA-256: `9b615b361e653145f12d83221a47edb775c0797b847de49fed18b03997a38f4b`.

Only add missing products.catalog_source_url TEXT NULL/no default,
catalog_source_note TEXT NULL/no default, and requires_veterinary_guidance BOOLEAN
NOT NULL DEFAULT FALSE. Existing compatible values are preserved; incompatible
type/null/default/generated definitions abort. No product import or UPDATE, search
function, index, RLS, grant, historical migration or fake history repair. New
columns are excluded when comparing old product values. Check the new columns
separately: URL/note NULL and boolean FALSE are expected initially, not discovered
source/clinical facts. FALSE never establishes no need for veterinary advice.

This file deliberately has **no outer BEGIN/COMMIT**. The pinned CLI2.118.0
executor owns the schema+ledger transaction. Its official source treats authored
transaction boundaries sequentially and records history afterward, so blindly
using the older standalone transaction draft would not prove schema/history
atomicity. The old draft stays unchanged for its existing local regressions;
the CLI form has a new hash. Local tests inject ledger failure in the CLI-shaped
transaction and prove no columns survive; success commits schema+ledger together.
This is a local model, not an executed CLI/hosted transaction.

Pinned official references:
- https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/migration-apply.ts
- https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/db-push-core.ts
- https://supabase.com/docs/reference/cli/introduction

## Applied-history-only release directory

The normal checkout includes pending original migrations. Do not run its db push
to deploy the emergency columns, do not use include-all or repair, and do not mark
the originals applied. Build a separate offline release directory containing:

1. Actual repository files for **every version present in the full remote ledger**.
   Names must match. No blank placeholders, fetched overwrites or fabricated ledger.
2. Exactly the fresh recovery file above, after the latest remote version.
3. Minimal config with seeds disabled, no env/roles/vault/Edge Functions files.
4. A private manifest of selected file hashes, excluded pending files and evidence
   fingerprint. Ledger membership alone does not establish historical SQL equality;
   inspect statement fingerprints/name anomalies before approving.

`scripts/source-recovery-preflight.mjs` emits one SELECT-only JSON result for full
ledger/version/name/statement hashes, all eight actual product projection trees
and ratings-view columns, FK/hint presence/ambiguity, public read/execute privileges,
search function hash, publication policy hashes and RLS metadata. No operational
rows, default values, function bodies, auth headers or connection strings returned.
It does not execute public search RPC or claim PostgREST relationship-cache health.
Database project identity must be checked in Dashboard, not inferred from a JSON
assertion. Save its single result privately; the operator adds project_ref only
after that UI check. Do not publish this operational result.

```sh
node scripts/source-recovery-preflight.mjs > /private/path/preflight.sql
node scripts/prepare-source-recovery-release.mjs \
  --evidence /private/path/confirmed-preflight.json \
  --output /private/path/new-source-recovery-release \
  --version 20261103120000 --project-ref '<confirmed-project-ref>'
```

The builder never connects or spawns a CLI. It rejects stale evidence, unexpected
columns/denials (except the three missing columns), missing/ambiguous FK, missing
search access, incomplete projection evidence, duplicate versions, missing remote
files, mismatched names, reused/old recovery timestamp or existing output. It copies
actual historical bytes and records all exclusions. No release for current
production has been generated: complete hosted evidence is still unavailable.

## Commands for an approved operator, NOT executed

Use only the previously verified exact CLI2.118.0 binary. It is not available in
the present environment; no reinstall/download/security workaround is authorized.
Confirm version/help and existing normal authentication before execution. Do not
print/save passwords, access tokens, database URLs or environment contents.

```sh
"$SUPABASE_BIN" --workdir "$RELEASE_DIR" link --project-ref "$PROJECT_REF"
"$SUPABASE_BIN" --workdir "$RELEASE_DIR" migration list --linked
"$SUPABASE_BIN" --workdir "$RELEASE_DIR" db push --linked --dry-run --skip-vault
# ONLY after separate deployment approval and exact one-file plan:
"$SUPABASE_BIN" --workdir "$RELEASE_DIR" db push --linked --skip-vault
```

No yes/include-all/include-roles/include-seed flags, extra files, env overrides,
functions deploy or config push. skip-vault also prevents implicit configured
vault writes in the pinned CLI. Existing authentication/link caches are not copied
from other workspaces. Dry-run must name **only** the recovery file and no seeds,
roles, vault effects or history error. Zero candidates, extra candidates, unknown
flags/version, changed project/HEAD/hash/ledger or other repair suggestion: STOP.
No linked dry-run has been executed in this session.

## Before/after and failure behavior

Before approval: confirm backup completed timestamp/restore access/PITR, exact
project, fresh evidence, current HEAD/hash and one-file plan. Record products count
and old-column row fingerprints excluding all three new fields, observation/audit
counts, RLS/ACL and existing constraints/index hashes. Keep results private. Do not
interpret row count alone as proof values did not change.

DDL requests ACCESS EXCLUSIVE on products, with lock_timeout5s. Waiting aborts at
timeout; once acquired it can briefly block reads/writes. Local per-transaction
definition checks and URL preflight failures roll back. The CLI history insertion
must share that transaction; no claim of actual hosted atomicity before deployment.
After success no automatic DROP, repair or rollback: existing clients require these
columns and future source values could be destroyed. Stop on uncertainty and use
a separately reviewed forward correction; backup restore has wider data-loss costs.

After an approved change: exactly one newly executed recovery version; all old
ledger rows unchanged. Exact three definitions; new NULL/NULL/FALSE defaults checked
separately; old product values, RLS/ACL, existing indexes/constraints preserved.
PostgreSQL18 may add the boolean NOT NULL constraint: compare old constraints as a
preserved subset. Concurrent legitimate writes can change row/audit fingerprints;
investigate instead of attributing all differences to this DDL. Do not simulate a
zero-change claim while traffic is uncontrolled.

Finally run anonymous list/detail reads using genuinely publicly eligible rows;
retain hidden/pending exclusion and verify actual Supabase relationships/cache.
Then PR116's missing/partial/basic nutrition and warning screens390/1280. Local
schema compilation and synthetic browser checks do not replace these hosted gates.

## Original migrations after emergency recovery

Original120000 uses ADD COLUMN IF NOT EXISTS, so compatible pre-added columns are
not duplicated; it still installs its unique index and import RPC/grants.190000
installs the second index and replaces that RPC.170000 changes search evidence
selection/ranking. These omitted effects are intentional deferrals, not completed
migrations. On a later normal checkout they remain pending/out-of-order and require
their own reviewed deployment plan. Do not mark them applied; do not assume a normal
whole-repository db push is now clean. Check duplicate canonical keys before a
later unique-index deployment. Search/import functionality is not repaired here.

The release file must eventually be preserved in the repository's tracked history
under the same approved version/hash after deployment approval; until then it stays
in migration_drafts. Do not merge a migration into an automatic apply path now.
Current execution blockers: full hosted evidence/mapping, verified CLI/auth/link,
backup verification and exact-only dry-run. The unchanged audit failure and Draft
owner PR state remain separate app-release blockers.
