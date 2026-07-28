# Phase 2 Alias Resolver Combined Review Artifact — 2026-07-28

## Purpose

This document combines the Phase 2 alias resolver score diff harness, affected product/ingredient report harness, and behavior-change readiness gate into a single non-runtime review artifact fixture.

This PR does not enable runtime behavior, does not change scores, and does not approve canonical alias scoring. It only records the review packet shape that a future behavior-changing PR must provide before it can be considered.

## Scope

Allowed:

- combine the non-runtime score diff summary from PR #43
- combine the non-runtime affected product/ingredient summary from PR #44
- reference the readiness checklist from PR #45
- document a single review artifact fixture shape
- keep runtime `score.ts` on `phase2AliasResolver: false`
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

## Review Packet Sources

A future behavior-changing PR must provide a review packet compatible with all of these sources:

| source | required role |
|---|---|
| `docs/phase2-alias-resolver-score-diff-harness-2026-07-28.md` | before/after score diff format and score-delta proof |
| `docs/phase2-alias-resolver-affected-report-harness-2026-07-28.md` | affected product/ingredient report format |
| `docs/phase2-alias-resolver-behavior-change-readiness-gate-2026-07-28.md` | pre-merge acceptance criteria and owner approval gate |

## Combined Fixed-Fixture Summary

This is fixed test-fixture output, not production database statistics.

### Score Diff Summary

| metric | value |
|---|---:|
| products sampled | 2 |
| score diff rows | 8 |
| score changed rows | 0 |
| score changed products | 0 |
| maximum positive score delta | 0 |
| maximum negative score delta | 0 |
| raw labels preserved | 8 |
| review required rows | 5 |

### Affected Product/Ingredient Summary

| metric | value |
|---|---:|
| affected products sampled | 4 |
| affected ingredient rows | 16 |
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

## Combined Review Artifact Shape

A future behavior-changing PR must include a combined artifact with these sections:

1. Executive summary
2. Feature flag scope
3. Before/after score diff table
4. Affected product/ingredient table
5. Product-by-product score delta review
6. A/B upgrade review
7. D/F downgrade review
8. Matched sidecar candidate review
9. Unmatched fallback review
10. Blocked fallback review
11. Ambiguous fallback review
12. Unknown/review-only safety proof
13. Raw-label and mutation guard proof
14. Display verdict review
15. Ranking review
16. Disable strategy
17. Rollback strategy
18. Exact owner approval text

## Minimum Combined Acceptance Criteria

A future behavior-changing PR is not ready for merge unless the combined artifact proves all of these:

- flag scope is explicit
- flag-off path remains behavior-preserving
- every score delta is visible product-by-product
- every score increase is justified
- every score decrease is justified
- every A/B upgrade is explicitly listed
- every D/F downgrade is explicitly listed
- blocked rows preserve raw labels, require review, and have no positive score effect
- ambiguous rows preserve raw labels, require manual review, and have no positive score effect
- unmatched rows preserve raw labels and existing behavior
- unknown or review-only rows never become safe-by-default
- raw labels are not replaced unless explicitly approved
- product/ingredient objects are not mutated unless explicitly approved
- display verdict changes are listed or proven stable
- ranking changes are listed or proven stable
- disable strategy is documented
- rollback strategy is documented
- owner approval text is present and matches the exact behavior-changing scope

## Runtime Guard

`src/utils/score.ts` must remain on:

```ts
flags: { phase2AliasResolver: false }
```

The combined artifact test also asserts that `score.ts` does not contain:

```ts
phase2AliasResolver: true
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

The next step may be a behavior-changing runtime proposal, but it must not be merged until the combined review artifact is filled with the actual proposed diff, affected report, fallback proof, disable strategy, rollback plan, and explicit owner approval.
