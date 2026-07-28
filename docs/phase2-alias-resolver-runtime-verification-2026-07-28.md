# Phase 2 Alias Resolver Runtime Verification — 2026-07-28

## Purpose

This document records the post-merge verification/audit step after PR #38 added the Phase 2 alias resolver adapter pass-through to the runtime scoring path.

This PR does not enable the resolver and does not change scores. It adds guard tests and documentation to keep the #38 integration disabled and behavior-preserving.

## Scope

Allowed:

- add verification tests for the flag-off scoring path
- statically guard that `score.ts` keeps `phase2AliasResolver: false`
- verify product and ingredient references remain unchanged
- verify score, breakdown, display verdict, and ranking order remain stable
- document the post-#38 runtime verification state

Not allowed:

- enabling `phase2AliasResolver`
- adding `phase2AliasResolver: true` to the scoring runtime path
- changing score calculations
- replacing or mutating product ingredients
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows
- approving canonical alias safety scoring

## Verified Runtime Boundary

`src/utils/score.ts` exposes:

```ts
getPhase2AliasResolverScoringProduct(product)
```

The function is expected to call the isolated adapter with:

```ts
flags: { phase2AliasResolver: false }
```

Because the flag remains false, the score path receives the original `Product` object and the original `ingredients` array.

## Test Coverage

`src/utils/scorePhase2AliasRuntimeVerification.test.ts` covers:

- `score.ts` contains the disabled flag marker
- `score.ts` does not contain a runtime `phase2AliasResolver: true` marker
- scoring product reference is unchanged
- ingredient array reference is unchanged
- ingredient labels are unchanged
- compatibility score remains stable
- recommendation/compatibility breakdowns remain stable
- public display verdict remains stable
- ranking order remains stable

## Current Safety State

After this verification PR, the project still has these safety properties:

- feature flag is off
- no canonical alias is used to alter final score
- no product ingredient label is replaced
- no production database operation is involved
- no SQL/migration/env/secrets changes are involved
- app surfaces do not enable canonical alias scoring

## Not Approved By This PR

This PR does not approve:

- turning the flag on
- changing scores
- mutating ingredients
- using canonical aliases as safety decisions
- running production DB writes
- creating product label rows

## Next Step

The next step can be a flag-on candidate design/sample-diff PR, but it must not be merged as a behavior-changing runtime PR without explicit owner approval.

A future flag-on PR must show before/after score diffs, affected products/ingredients, blocked and ambiguous handling, and rollback/disable strategy before any user-visible behavior changes are accepted.
