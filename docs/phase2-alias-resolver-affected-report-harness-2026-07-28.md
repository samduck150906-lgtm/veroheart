# Phase 2 Alias Resolver Non-Runtime Affected Product/Ingredient Report Harness — 2026-07-28

## Purpose

This document records a non-runtime affected product/ingredient report harness for a future Phase 2 alias resolver behavior-changing PR.

This PR does not enable the runtime feature flag and does not change scores. It adds a fixed-fixture report shape so a future behavior-changing PR can identify candidate product and ingredient impact before it is reviewed.

## Scope

Allowed:

- build a fixed-fixture affected product/ingredient report in tests
- use a test-only isolated `phase2AliasResolver: true` adapter call
- keep runtime `score.ts` on `phase2AliasResolver: false`
- identify matched canonical candidates as sidecar-only affected rows
- identify unmatched, blocked, and ambiguous rows as review-required rows
- prove raw runtime labels remain unchanged
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

The test harness produces affected ingredient rows with these fields:

| column | meaning |
|---|---|
| product id | stable fixture product id |
| product name | fixture product display name |
| raw ingredient label | original ingredient label |
| resolver status | `matched`, `unmatched`, `blocked`, or `ambiguous` |
| canonical candidate | matched canonical candidate or null |
| affected kind | `canonical_candidate` or `review_required` |
| review required | whether the row needs review before behavior changes |
| runtime output label | label that would remain visible in the current harness |
| score impact allowed | always false in this safety harness |

## Fixed Fixture Summary

This is fixed test-fixture output, not production database statistics.

| metric | value |
|---|---:|
| products sampled | 4 |
| ingredient rows | 16 |
| matched rows | 7 |
| unmatched rows | 4 |
| blocked rows | 4 |
| ambiguous rows | 1 |
| review required rows | 9 |
| products with matched candidates | 4 |
| products with review-required rows | 4 |
| products with blocked rows | 3 |
| products with ambiguous rows | 1 |
| raw labels preserved | 16 |
| runtime changed rows | 0 |
| score impact allowed rows | 0 |

## Product-Level Fixture Summary

| product id | rows | matched | unmatched | blocked | ambiguous | review required |
|---|---:|---:|---:|---:|---:|---:|
| `fixture-balanced` | 4 | 2 | 1 | 1 | 0 | 2 |
| `fixture-fiber` | 4 | 2 | 1 | 0 | 1 | 2 |
| `fixture-preserved` | 4 | 1 | 1 | 2 | 0 | 3 |
| `fixture-botanical` | 4 | 2 | 1 | 1 | 0 | 2 |

## Representative Rows

| product id | raw label | status | canonical candidate | affected kind | review required | score impact allowed |
|---|---|---|---|---|---|---|
| `fixture-balanced` | `비타민 E` | `matched` | `비타민e` | `canonical_candidate` | no | no |
| `fixture-balanced` | `닭고기 분말` | `unmatched` | null | `review_required` | yes | no |
| `fixture-balanced` | `소르빈산 칼륨` | `blocked` | null | `review_required` | yes | no |
| `fixture-fiber` | `맥주효모` | `ambiguous` | null | `review_required` | yes | no |
| `fixture-preserved` | `향미증진제` | `blocked` | null | `review_required` | yes | no |
| `fixture-botanical` | `녹차 추출물` | `matched` | `녹차추출물` | `canonical_candidate` | no | no |
| `fixture-botanical` | `닭 지방` | `blocked` | null | `review_required` | yes | no |

## Required Interpretation

- This harness identifies affected candidates only; it does not enable behavior.
- `matched` rows are canonical candidate sidecar metadata only.
- `unmatched` rows preserve raw labels and existing behavior.
- `blocked` rows preserve raw labels, require review, and must not create positive score effects.
- `ambiguous` rows preserve raw labels, require manual review, and must not create positive score effects.
- Unknown or review-only results must not become safe-by-default.
- No affected row is allowed to change score in this harness.

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

`src/lib/phase2AliasResolverAffectedReportHarness.test.ts` covers:

- runtime scoring flag remains disabled
- test-only candidate path can generate affected product/ingredient rows
- product-level and row-level fixture counts are stable
- matched rows are sidecar-only canonical candidates
- unmatched, blocked, and ambiguous rows require review
- raw labels are preserved
- runtime output labels are unchanged
- no row allows score impact in this harness
- product and ingredient references are not mutated

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

The next safe step can be a non-runtime behavior-change readiness checklist that combines the score diff harness and affected report harness into one pre-merge gate.

A future behavior-changing PR must include before/after score diffs, affected product/ingredient examples, blocked and ambiguous handling, fallback/disable strategy, rollback plan, and explicit owner approval before merge.
