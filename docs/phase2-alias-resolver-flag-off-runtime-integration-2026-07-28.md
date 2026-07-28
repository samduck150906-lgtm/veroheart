# Phase 2 Alias Resolver Flag-Off Runtime Integration — 2026-07-28

## Purpose

This document records the first runtime/scoring integration point for the Phase 2 alias resolver work.

The integration is intentionally flag-off. It prepares the scoring path to pass through an alias resolver adapter while preserving current behavior.

## Owner Approval

The owner approved this step with these conditions:

```text
PR #38 flag-off runtime integration 진행 승인. feature flag는 OFF 유지, 점수 변경 없음, Supabase/SQL/migration/env 변경 없음 조건으로 진행해줘.
```

## Scope

This PR may touch runtime/scoring code only to add a disabled adapter pass-through.

Allowed:

- add a score-path integration function
- call the isolated product adapter with `phase2AliasResolver: false`
- keep aliases/canonicals/blocked terms empty in the runtime pass-through
- prove the adapter returns the original product reference
- add tests for score-path behavior while disabled

Not allowed:

- enabling the feature flag
- changing scores
- replacing ingredient labels
- mutating products or ingredients
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows
- approving canonical alias safety scoring

## Implementation

`src/utils/score.ts` now exposes:

```ts
getPhase2AliasResolverScoringProduct(product)
```

The function calls `resolveProductWithPhase2AliasAdapter` with:

```ts
flags: { phase2AliasResolver: false }
```

Because the flag is disabled, the adapter returns the original product object and no resolver result affects scoring.

`getRecommendationBreakdown(product, profile)` now reads from `scoringProduct`, which is currently the same object as `product`.

## Safety Properties

The runtime path keeps these properties:

- feature flag remains off
- original product reference is preserved
- original ingredients array reference is preserved
- no alias candidate is used in scoring
- no score calculation is changed
- no UI component imports resolver helpers directly
- no Supabase, SQL, migration, or env changes are involved

## Test Coverage

`src/utils/scorePhase2AliasRuntimeIntegration.test.ts` covers:

- scoring integration adapter returns the original product reference
- ingredient array reference remains unchanged
- public score calls still flow through the same score total
- compatibility breakdown aliases remain equal to recommendation breakdowns
- ranking still sorts by score output while the flag remains off

## Not Approved By This PR

This PR does not approve:

- turning the flag on
- using canonical aliases to change score inputs
- product label row creation
- Supabase production operation
- migration execution
- automatic canonical safety scoring

## Next Step

The next step is to observe/review this flag-off runtime integration and run the relevant test suite in CI/local tooling.

Any PR that enables the flag, changes scores, mutates ingredients, or touches production data requires explicit owner approval.
