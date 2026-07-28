# Phase 2 Alias Resolver Flag-On Behavior Change Proposal — 2026-07-28

## Purpose

This document defines the required proposal, safety gates, and diff requirements for a future Phase 2 alias resolver flag-on behavior-changing PR.

This PR does not enable the runtime feature flag and does not change scores. It only defines what a future behavior-changing PR must prove before it can be reviewed.

## Owner Approval

The owner approved this proposal-only step with these conditions:

```text
PR #42 flag-on behavior change proposal 진행 승인. 실제 feature flag ON, 점수 변경, 운영 DB 작업 없이 제안서/안전 조건/필수 diff 요구사항만 작성해줘.
```

## Scope

Allowed in this PR:

- document a future flag-on behavior-change proposal
- define mandatory before/after score diff requirements
- define mandatory affected product/ingredient reporting requirements
- define blocked and ambiguous fallback requirements
- define disable and rollback strategy requirements
- define owner approval gates for any future behavior-changing PR
- keep this PR docs/test-only

Not allowed in this PR:

- enabling the runtime feature flag
- adding `phase2AliasResolver: true` to `score.ts`
- changing scores
- mutating product ingredients
- replacing raw labels with canonical aliases
- using canonical aliases as safety decisions
- adding Supabase reads or writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Proposed Future Behavior

A future behavior-changing PR may propose using Phase 2 alias resolver results as a sidecar canonical candidate in the scoring path.

The first behavior-changing version must be conservative:

- `matched` may attach a canonical candidate but must not silently lower safety risk.
- `unmatched` must preserve existing behavior and require review visibility.
- `blocked` must preserve existing behavior, require review, and must never be treated as safe.
- `ambiguous` must preserve existing behavior and require manual review.
- Unknown or review-only results must remain insufficient/review-only, not safe-by-default.

## Mandatory Before/After Score Diff

A future behavior-changing PR must include a before/after report for representative products.

Required columns:

| column | requirement |
|---|---|
| product id | stable product identifier |
| product name | product display name |
| raw ingredient label | original label used before resolver |
| resolver status | `matched`, `unmatched`, `blocked`, or `ambiguous` |
| canonical candidate | canonical candidate name or null |
| score before | score from current runtime behavior |
| score after | proposed score after candidate behavior |
| score delta | after minus before |
| grade before | display grade before |
| grade after | display grade after |
| reason change | added/removed score reason text |
| review required | yes/no |
| safety note | reason the change is safe or still review-only |

Required aggregate metrics:

| metric | requirement |
|---|---|
| total products sampled | count of products in report |
| products with score change | count and percentage |
| maximum positive score delta | must be reviewed product-by-product |
| maximum negative score delta | must be reviewed product-by-product |
| products upgraded to A/B | must be listed explicitly |
| products downgraded to D/F | must be listed explicitly |
| blocked rows | must remain review-only |
| ambiguous rows | must remain review-only |
| unmatched rows | must preserve existing behavior |

## Mandatory Affected Product/Ingredient Report

A future behavior-changing PR must include a report that estimates affected products and ingredients before enabling any runtime behavior.

The report must distinguish:

- matched sidecar candidates
- unmatched labels
- blocked labels
- ambiguous labels
- labels that would change score inputs
- labels that would change display reasons
- labels that would change displayed score or grade

The report must not use production writes. Any production read, if needed later, requires a separate explicit owner approval and a read-only runbook.

## Scoring Safety Requirements

A future behavior-changing PR must prove these constraints:

- Canonical aliases do not override `riskLevel` without reviewed evidence.
- Canonical aliases do not turn unknown ingredients into safe ingredients.
- Canonical aliases do not suppress allergy, danger, or caution signals.
- Blocked and ambiguous results do not contribute positive score changes.
- Matched results can only improve naming consistency unless a separate reviewed rule explains a score change.
- Any score increase caused by a canonical candidate must be listed and justified.
- Any score decrease caused by a canonical candidate must be listed and justified.

## Blocked and Ambiguous Fallback

Required fallback behavior:

| resolver status | fallback behavior |
|---|---|
| matched | attach candidate sidecar only unless explicitly approved for scoring |
| unmatched | preserve raw label and existing score behavior |
| blocked | preserve raw label, review required, no positive score effect |
| ambiguous | preserve raw label, review required, no positive score effect |

Blocked and ambiguous rows must never replace ingredient labels and must never become safe-by-default.

## Disable Strategy

A future behavior-changing PR must include an immediate disable path:

- feature flag can be turned off without a deploy if config-based, or reverted with one small code PR if code-based
- flag-off path returns the original product object
- flag-off path preserves existing score, breakdown, display verdict, and ranking behavior
- tests must prove flag-off invariance after any flag-on candidate code is introduced

## Rollback Strategy

A future behavior-changing PR must include a rollback plan before merge.

Minimum rollback plan:

1. Turn off the feature flag.
2. Verify `phase2AliasResolver: false` is active in runtime scoring.
3. Verify scores return to the pre-change baseline.
4. Revert the behavior-changing PR if the disable path is insufficient.
5. Do not run database rollback unless a separately approved production data write occurred.

## Required Tests For Future Behavior-Changing PR

A future behavior-changing PR must add tests for:

- runtime flag off invariance
- runtime flag on candidate behavior
- matched sidecar behavior
- unmatched fallback
- blocked fallback
- ambiguous fallback
- no ingredient mutation
- no raw label replacement without explicit approval
- no positive score change from blocked or ambiguous rows
- before/after score diff generation
- display verdict stability or explicitly reviewed display changes
- ranking stability or explicitly reviewed ranking changes

## Owner Approval Gate

A future behavior-changing PR must not be merged until the owner explicitly approves the exact behavior-changing scope.

Required approval language should include:

```text
PR #[number] Phase 2 alias resolver behavior change 승인. feature flag [OFF/ON 범위], 점수 영향 diff 확인, blocked/ambiguous fallback 확인, rollback/disable 전략 확인 후 진행 승인.
```

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

The next safe step is to create a non-runtime diff generator or report harness that can produce the mandatory before/after score diff from fixed fixtures.

A future behavior-changing PR must include the required reports, fallback handling, disable strategy, rollback plan, and explicit owner approval before merge.
