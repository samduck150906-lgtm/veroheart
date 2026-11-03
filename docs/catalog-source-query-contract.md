# Public product query errors after hosted recovery

## Current baseline and retained change

Main98301b3 (including875ea600's20261103140000 migration) restores the three
source metadata fields and changes the optional publication gate. Operator Dashboard
metadata reports all56 inspected fields readable and eight FK/hints unambiguous.
The old missing-column diagnosis was valid on the previous deployment; it is not
an instruction to repeat recovery. Metadata fingerprints and version/name parity
are not proof of remote SQL text equality, actual REST reads or complete schema parity.

This PR now retains only error/data-presence handling and regression coverage:
- explicit zero-row detail means unavailable; schema/permission/ambiguous results
  throw a safe query error rather than implying absent products;
- startup/search/detail/analysis/brand/diary and later recommendation-page failures
  do not publish empty/partial results as a complete success;
- independently failed reviews remain unavailable while loaded product evidence
  remains visible; failed brand statistics are not fake zero counts;
- source not_loaded/absent/available/invalid remain distinct; canonical HTTPS
  syntax is not identity, disclosure authority, label approval or clinical proof;
- projection/FK assertions use the actual SQL contracts under owner/anon and
  guard-included full bootstrap. No score/ranking/publication policy changes.

Latest-main image normalization and pending/reviewed/verified policy are preserved
when integrating. The only textual merge conflict was two independent row-mapper
imports; both source URL and image validators remain. No other worker's code was
reverted. PR116 nutrition presentation and PR115 purchase work stay separate.

## Retired recovery tools — never apply

The old standalone and CLI-form recovery proposals are superseded. The candidate
20261103120000_restore_product_source_contract.sql (final SHA256
9b615b361e653145f12d83221a47edb775c0797b847de49fed18b03997a38f4b) is redundant
and older than the observed remote20261103140000 version. Do not apply, retimestamp,
repair history or use include-all to force it. No release bundle/dry-run for it was
performed. All deployable recovery drafts and offline release-builder commands
are removed from this PR's current tree. The old SQL body survives only under
scripts/fixtures/catalog-source-drift-repair.sql as a synthetic regression fixture,
explicitly forbidden for deployment. Local tests use it to reproduce historical
42703, preserve old data/objects/grants, and reject incompatible drift. It is not
an operational rollout plan. No automatic migrations or published policies change.

## Policy/privacy review limits

Current gate intentionally permits visible pending/reviewed/verified products when
verified-only is off; enabling it permits verified only. Hidden/unknown/null states
remain excluded in the local current-schema contract. Trash normally stores a private
snapshot and physically deletes products. A failed legacy delete can leave a live
row plus a trash snapshot; this existing non-atomic path must not be mistaken for
an independent public trash filter. Development sample status is not a separate
policy predicate: historical50rows were hidden, not positively certified never
visible. Do not classify every internal-source row as a sample or silently hide it.

The public ratings view has a five-field allowlist and repeats product publication
predicates despite owner privileges. Raw reviews privacy is a separate dependency:
20261026160000_account_privacy_release drops the legacy public-read policy, but that
version is absent from the supplied hosted ledger. This alone does NOT prove its
schema effects absent: inspect actual reviews policies/ACL and view definition
before asserting hosted privacy. Current full bootstrap includes the pending
privacy migration, so passing that bootstrap cannot certify the supplied remote
ledger's raw-review boundary. Never retrieve review free text or identities merely
to test exposure. Metadata-only read-only diagnostics are appropriate.

No production data/authentication/settings/schema/history/functions/production
deployment or merge is performed. Existing audit15 remains visible and unchanged.
