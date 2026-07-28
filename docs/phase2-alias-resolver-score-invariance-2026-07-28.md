# Phase 2 Alias Resolver Score Invariance — 2026-07-28

## Purpose

This document records tests that prove the isolated Phase 2 alias resolver product adapter does not change scoring outputs while the feature flag is off.

## Scope

- Test/docs only.
- No runtime/scoring app surface integration.
- No feature flag enabled.
- No score calculation changes.
- No ingredient mutation.
- No Supabase execution.
- No SQL changes.
- No migrations.
- No `.env`, secrets, credentials, URLs, or access tokens.

## Invariance Covered

The tests compare outputs before and after passing products through the disabled adapter.

Covered outputs:

- `calculateCompatibilityScore`
- `getRecommendationBreakdown`
- `resolveProductDisplayVerdict`
- `rankProductsForProfile` order

The fixture includes representative cases:

- exact low-risk alias candidates
- unmatched animal ingredient labels
- blocked review-only labels
- species mismatch labels

## Expected Result

When the flag is absent or explicitly false:

- adapter `enabled` is `false`
- original product reference is returned
- `changed` is `false`
- resolver resolutions are empty
- compatibility score is unchanged
- recommendation breakdown is unchanged
- public display verdict is unchanged
- ranking order is unchanged

## Not Approved

This result does not approve:

- enabling the feature flag
- importing the adapter into runtime/scoring app surfaces
- changing score calculations
- replacing product ingredients in runtime
- creating product label rows
- Supabase production write/apply/rollback
- migrations
- automatic canonical safety scoring

## Next Step

The next step would be an actual flag-off runtime integration PR. Because that would touch runtime/scoring execution paths, it requires explicit owner approval before proceeding.