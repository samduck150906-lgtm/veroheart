# Phase 2 Alias Resolver Broader Sample Diff Report — 2026-07-28

## Purpose

This document records a broader fixed-fixture sample diff after the Phase 2 alias resolver flag-on candidate design PR.

This PR does not enable runtime behavior. It estimates candidate outcomes in a controlled test fixture so a future behavior-changing PR can be reviewed with clearer expectations.

## Scope

Allowed:

- run a test-only isolated sample with `phase2AliasResolver: true`
- keep runtime `score.ts` on `phase2AliasResolver: false`
- broaden the sample fixture beyond the minimal PR #40 candidate rows
- document matched, unmatched, blocked, and ambiguous outcomes
- prove raw runtime labels remain unchanged
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

## Fixture Summary

This is fixed test-fixture output, not production database statistics.

| metric | value |
|---|---:|
| fixture labels | 24 |
| matched | 12 |
| unmatched | 6 |
| blocked | 5 |
| ambiguous | 1 |
| review required | 12 |
| raw labels preserved | 24 |

## Matched Candidate Examples

These labels produce sidecar canonical candidates in the broader fixture:

| raw label | canonical candidate |
|---|---|
| `비타민 E` | `비타민e` |
| `오메가-3 지방산` | `오메가3지방산` |
| `오메가 6 지방산` | `오메가6지방산` |
| `건조 비트 펄프` | `건조비트펄프` |
| `감자 전분` | `감자전분` |
| `건조 맥주 효모` | `건조맥주효모` |
| `녹차 추출물` | `녹차추출물` |
| `코코넛 오일` | `코코넛오일` |
| `타피오카 전분` | `타피오카전분` |
| `토마토 박` | `토마토박` |
| `프락토 올리고당` | `프락토올리고당` |
| `혼합 토코페롤` | `혼합토코페롤` |

## Review-Only Examples

Unmatched examples remain review-only:

- `닭고기 분말`
- `로즈마리 추출물`
- `타우린`
- `현미`
- `고구마`
- `정제수`

Blocked examples remain review-only and must not be inferred as safe:

- `닭 지방`
- `소르빈산 칼륨`
- `향미증진제`
- `프로필렌 글리콜`
- `닭간`

Synthetic ambiguous example:

- `맥주효모` can resolve to more than one canonical candidate in the fixture and must require manual review.

## Required Interpretation

- `matched` is still sidecar metadata only.
- `matched` does not replace runtime labels in this PR.
- `unmatched` preserves raw labels and existing behavior.
- `blocked` preserves raw labels and review-only semantics.
- `ambiguous` preserves raw labels and requires manual review.
- Unknown or review-only results must not become safe-by-default.

## Runtime Guard

`src/utils/score.ts` must remain on:

```ts
flags: { phase2AliasResolver: false }
```

The broader sample-diff test also asserts that `score.ts` does not contain:

```ts
phase2AliasResolver: true
```

## Test Coverage

`src/lib/phase2AliasResolverBroaderSampleDiff.test.ts` covers:

- runtime scoring flag remains disabled
- broader fixture can produce candidate outcomes in a test-only adapter call
- fixture summary counts are stable
- raw runtime labels are preserved for every fixture row
- matched rows stay sidecar-only
- unmatched, blocked, and ambiguous rows require review
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

The next step may be a behavior-change proposal for a carefully limited flag-on path, but it must not be merged as runtime behavior without explicit owner approval.

A future behavior-changing PR must include before/after score diffs, affected product/ingredient examples, blocked and ambiguous handling, fallback/disable strategy, and explicit owner approval before merge.
