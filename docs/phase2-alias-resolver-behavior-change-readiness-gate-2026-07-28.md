# Phase 2 Alias Resolver Behavior-Change Readiness Gate — 2026-07-28

## Purpose

This document defines the pre-merge readiness gate for any future Phase 2 alias resolver behavior-changing PR.

This PR does not enable runtime behavior, does not change scores, and does not approve canonical alias scoring. It turns the previous proposal, score diff harness, and affected report harness into a single review checklist that must be satisfied before a behavior-changing PR can be considered.

## Scope

Allowed:

- document the behavior-change readiness checklist
- require the non-runtime score diff harness from PR #43
- require the non-runtime affected product/ingredient report harness from PR #44
- require blocked, ambiguous, and unmatched fallback proof
- require disable and rollback strategy proof
- require explicit owner approval language for any future behavior-changing merge
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

## Required Inputs Before Behavior Change

A future behavior-changing PR is not merge-ready unless it includes all of the following:

| gate | required proof |
|---|---|
| score diff report | before/after rows with score before, score after, score delta, grade before, grade after, review required, and safety note |
| affected report | affected products and ingredient rows split by matched, unmatched, blocked, and ambiguous |
| score-change review | every score increase and decrease is listed with justification |
| A/B upgrade review | every product upgraded to A/B is explicitly listed |
| D/F downgrade review | every product downgraded to D/F is explicitly listed |
| blocked fallback | blocked rows preserve raw labels, require review, and have no positive score effect |
| ambiguous fallback | ambiguous rows preserve raw labels, require manual review, and have no positive score effect |
| unmatched fallback | unmatched rows preserve raw labels and existing behavior |
| unknown handling | unknown or review-only results never become safe-by-default |
| mutation guard | raw labels and product ingredient references are not mutated without explicit approval |
| display/ranking review | display verdict and ranking changes are either stable or explicitly reviewed |
| disable strategy | feature can be disabled and flag-off invariance is proven |
| rollback strategy | rollback path is documented before merge |
| owner approval | exact owner approval text is present before merge |

## Required Score Diff Gate

The future behavior-changing PR must include a report compatible with:

- `src/lib/phase2AliasResolverScoreDiffHarness.test.ts`
- `docs/phase2-alias-resolver-score-diff-harness-2026-07-28.md`

The report must include, at minimum:

- product id
- product name
- raw ingredient label
- resolver status
- canonical candidate
- score before
- score after
- score delta
- grade before
- grade after
- runtime output label
- review required
- safety note

A behavior-changing PR must not hide score deltas in aggregate-only metrics. Product-by-product rows are required.

## Required Affected Product/Ingredient Gate

The future behavior-changing PR must include a report compatible with:

- `src/lib/phase2AliasResolverAffectedReportHarness.test.ts`
- `docs/phase2-alias-resolver-affected-report-harness-2026-07-28.md`

The report must distinguish:

- matched sidecar candidates
- unmatched labels
- blocked labels
- ambiguous labels
- products with matched candidates
- products with review-required rows
- products with blocked rows
- products with ambiguous rows
- rows where runtime labels would change
- rows where score impact would be allowed

## Minimum Safe Acceptance Criteria

A future behavior-changing PR must satisfy all of these before merge:

1. `phase2AliasResolver` scope is explicit.
2. Flag-off path remains behavior-preserving.
3. Before/after score diff is present.
4. Affected product/ingredient report is present.
5. No blocked or ambiguous row creates a positive score effect.
6. No unknown or review-only row becomes safe-by-default.
7. Raw labels are not replaced unless explicitly approved.
8. Product/ingredient objects are not mutated unless explicitly approved.
9. Display verdict changes are listed.
10. Ranking changes are listed.
11. Disable strategy is documented.
12. Rollback strategy is documented.
13. Owner approval text is present and matches the actual behavior-changing scope.

## Explicit Owner Approval Gate

A future behavior-changing PR must not be merged until the owner explicitly approves the exact scope.

Required approval template:

```text
PR #[number] Phase 2 alias resolver behavior change 승인. feature flag [OFF/ON 범위], 점수 영향 diff 확인, affected report 확인, blocked/ambiguous fallback 확인, rollback/disable 전략 확인 후 진행 승인.
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

The next safe step can be a non-runtime PR that combines the score diff harness and affected report harness into a single generated review artifact fixture.

A future behavior-changing runtime PR still requires the reports, fallback handling, disable strategy, rollback plan, and explicit owner approval before merge.
