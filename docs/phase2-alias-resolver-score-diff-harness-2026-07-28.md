# Phase 2 Alias Resolver Non-Runtime Score Diff Harness — 2026-07-28

## Purpose

This document records a non-runtime score diff harness for a future Phase 2 alias resolver behavior-changing PR.

This PR does not enable the runtime feature flag and does not change scores. It adds a fixed-fixture before/after report shape so a future behavior-changing PR has a required diff format before it can be reviewed.

## Scope

Allowed:

- build a fixed-fixture before/after score diff report in tests
- use a test-only isolated `phase2AliasResolver: true` adapter call
- keep runtime `score.ts` on `phase2AliasResolver: false`
- keep candidate matches sidecar-only
- prove score, grade, and raw labels remain unchanged in the current harness
- keep this PR docs/test-only

Not allowed:

- enabling the runtime feature flag
- adding `phase2AliasResolver: true` to `score.ts`
- changing score calculations
- mutating product ingredients
- replacing raw labels with canonical aliases
- using canonical aliases as safety decisions
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Harness Shape

The test harness produces rows with the required future diff columns:

| column | meaning |
|---|---|
| product id | stable fixture product id |
| product name | fixture product display name |
| raw ingredient label | original ingredient label |
| resolver status | `matched`, `unmatched`, `blocked`, or `ambiguous` |
| canonical candidate | matched canonical candidate or null |
| score before | current score before candidate adapter output |
| score after | score after candidate adapter output |
| score delta | after minus before |
| grade before | current display grade |
| grade after | post-candidate display grade |
| runtime output label | label used by runtime after adapter output |
| review required | whether row needs review before behavior changes |
| safety note | why the row is safe or review-only |

## Fixed Fixture Summary

This is fixed test-fixture output, not production database statistics.

| metric | value |
|---|---:|
| products sampled | 2 |
| rows | 8 |
| matched | 3 |
| unmatched | 2 |
| blocked | 2 |
| ambiguous | 1 |
| score changed rows | 0 |
| score changed products | 0 |
| maximum positive score delta | 0 |
| maximum negative score delta | 0 |
| raw labels preserved | 8 |
| review required rows | 5 |

## Example Rows

| product id | raw label | status | canonical candidate | score delta | grade changed | runtime output label | review required |
|---|---|---|---|---:|---|---|---|
| `fixture-balanced` | `비타민 E` | `matched` | `비타민e` | 0 | no | `비타민 E` | no |
| `fixture-balanced` | `오메가-3 지방산` | `matched` | `오메가3지방산` | 0 | no | `오메가-3 지방산` | no |
| `fixture-balanced` | `닭고기 분말` | `unmatched` | null | 0 | no | `닭고기 분말` | yes |
| `fixture-balanced` | `소르빈산 칼륨` | `blocked` | null | 0 | no | `소르빈산 칼륨` | yes |
| `fixture-balanced` | `맥주효모` | `ambiguous` | null | 0 | no | `맥주효모` | yes |
| `fixture-secondary` | `혼합 토코페롤` | `matched` | `혼합토코페롤` | 0 | no | `혼합 토코페롤` | no |
| `fixture-secondary` | `정제수` | `unmatched` | null | 0 | no | `정제수` | yes |
| `fixture-secondary` | `향미증진제` | `blocked` | null | 0 | no | `향미증진제` | yes |

## Required Interpretation

- This harness is a report-shape guard, not runtime enablement.
- `matched` rows remain sidecar-only in this PR.
- `unmatched` rows preserve raw labels and existing behavior.
- `blocked` rows preserve raw labels, require review, and must not create positive score effects.
- `ambiguous` rows preserve raw labels, require manual review, and must not create positive score effects.
- Unknown or review-only results must not become safe-by-default.

## Runtime Guard

`src/utils/score.ts` must remain on:

```ts
flags: { phase2AliasResolver: false }
```

The test also asserts that `score.ts` does not contain:

```ts
phase2AliasResolver: true
```

## Test Coverage

`src/lib/phase2AliasResolverScoreDiffHarness.test.ts` covers:

- runtime scoring flag remains disabled
- test-only candidate path can generate before/after score rows
- mandatory diff row shape exists
- score deltas are zero in the current sidecar-only harness
- display grades remain stable
- runtime output labels remain raw labels
- matched rows stay sidecar-only
- unmatched, blocked, and ambiguous rows require review

## Not Approved By This PR

This PR does not approve:

- turning the runtime flag on
- changing scores
- mutating ingredients
- replacing raw labels in runtime
- using canonical aliases as safety decisions
- Supabase production operations
- migrations
- product label row creation

## Next Step

The next safe step can be a non-runtime affected-product/ingredient report harness with a larger fixed fixture set.

A future behavior-changing PR must include before/after score diffs, affected product/ingredient examples, blocked and ambiguous handling, fallback/disable strategy, rollback plan, and explicit owner approval before merge.
