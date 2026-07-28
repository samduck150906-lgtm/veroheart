# Phase 2 Alias Resolver Flag-On Candidate Design / Sample Diff — 2026-07-28

## Purpose

This document records a design-only/sample-diff step for a future Phase 2 alias resolver flag-on path.

This PR does not enable the runtime feature flag and does not change scores. It only defines what a safe flag-on candidate diff must show before any behavior-changing PR can be considered.

## Owner Approval

The owner approved this step with these conditions:

```text
PR #40 flag-on candidate design/sample-diff 진행 승인. 실제 feature flag ON, 점수 변경, 운영 DB 작업 없이 샘플 diff와 안전 설계만 진행해줘.
```

## Scope

Allowed:

- run a test-only isolated sample with `phase2AliasResolver: true`
- keep runtime `score.ts` on `phase2AliasResolver: false`
- document candidate outcomes for `matched`, `unmatched`, `blocked`, and `ambiguous`
- prove sample candidates remain sidecar metadata only
- prove raw runtime labels remain unchanged in the sample
- keep this PR docs/test-only

Not allowed:

- enabling the runtime feature flag
- adding `phase2AliasResolver: true` to `score.ts`
- changing scores
- mutating product ingredients
- replacing raw labels with canonical aliases
- using canonical aliases as safety decisions
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Candidate Diff Shape

A future flag-on candidate review must present rows like:

| raw label | resolver status | canonical candidate | runtime output label | review required |
|---|---|---|---|---|
| `비타민 E` | `matched` | `비타민e` | `비타민 E` | no |
| `오메가-3 지방산` | `matched` | `오메가3지방산` | `오메가-3 지방산` | no |
| `닭고기 분말` | `unmatched` | null | `닭고기 분말` | yes |
| `소르빈산 칼륨` | `blocked` | null | `소르빈산 칼륨` | yes |
| `맥주효모` | `ambiguous` | null | `맥주효모` | yes |

The candidate diff is sidecar-only. It must not replace labels, mutate products, or change final scores.

## Required Interpretation

- `matched` may become a canonical candidate only after a reviewed behavior-changing PR.
- `unmatched` must preserve raw labels and existing behavior.
- `blocked` must preserve raw labels and review-only semantics.
- `ambiguous` must preserve raw labels and require manual review.
- Unknown results must remain review-only, not safe-by-default.

## Runtime Guard

`src/utils/score.ts` must remain on:

```ts
flags: { phase2AliasResolver: false }
```

The sample-diff test must also assert that `score.ts` does not contain:

```ts
phase2AliasResolver: true
```

## Test Coverage

`src/lib/phase2AliasResolverFlagOnCandidateDiff.test.ts` covers:

- runtime scoring flag remains disabled
- sample-only adapter can produce candidate outcomes
- `matched`, `unmatched`, `blocked`, and `ambiguous` cases are represented
- runtime output labels remain raw labels
- candidates remain sidecar metadata only
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

The next safe step is a broader sample-diff report or fixture set that estimates how many products/ingredients would be affected by a future flag-on path, still without enabling runtime behavior.

A future behavior-changing PR must include before/after score diffs, affected products/ingredients, blocked and ambiguous handling, fallback/disable strategy, and explicit owner approval before merge.
