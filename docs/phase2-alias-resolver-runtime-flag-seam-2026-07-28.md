# Phase 2 Alias Resolver Runtime Flag Seam — 2026-07-28

## Purpose

This document records a non-visible internal test seam for the Phase 2 alias resolver runtime flag.

The runtime default remains disabled. The seam only lets tests exercise candidate on/off logic without reading live env, config, secrets, browser storage, or deploy-time settings.

## Scope

Allowed:

- add a pure `resolvePhase2AliasResolverRuntimeFlag()` helper
- keep `isPhase2AliasResolverRuntimeEnabled()` returning the default disabled value
- allow `testOverride` only as a test-owned input to the pure helper
- keep `score.ts` free of `phase2AliasResolver: true`
- keep app-visible output unchanged

Not allowed:

- enabling the runtime feature flag
- reading `process.env`, `import.meta.env`, `localStorage`, `sessionStorage`, or cookies
- changing app-visible scores, labels, cards, detail pages, analysis text, warnings, badges, or ranking
- changing score calculations
- mutating product ingredients
- replacing raw labels with canonical aliases
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Runtime Behavior

Runtime access remains:

```ts
export function isPhase2AliasResolverRuntimeEnabled(): boolean {
  return resolvePhase2AliasResolverRuntimeFlag();
}
```

Because no override is passed, runtime remains disabled.

## Test-Only Seam

Tests may call:

```ts
resolvePhase2AliasResolverRuntimeFlag({ testOverride: true })
```

This is not runtime enablement. It is only a pure unit-test seam so later tests can verify candidate branches without making app-visible behavior reachable.

## Invariance Requirements

`src/lib/phase2AliasResolverRuntimeFlagSeam.test.ts` verifies:

- runtime accessor remains disabled by default
- empty input returns `false`
- test override can evaluate `true` only in the pure helper
- runtime accessor still returns `false` after test override checks
- no env/config/browser storage reads are introduced
- `score.ts` does not contain `phase2AliasResolver: true`

## Not Approved By This PR

This PR does not approve:

- app-visible output changes
- runtime flag enablement
- canonical alias scoring
- score calculation changes
- Supabase production operations
- migrations
- product label row creation

## Next Step

The next non-visible step can add test-only branch coverage for adapter behavior using this seam, while keeping runtime default disabled and app-visible output unchanged.
