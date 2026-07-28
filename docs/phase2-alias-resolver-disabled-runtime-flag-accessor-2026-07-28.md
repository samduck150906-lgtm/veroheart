# Phase 2 Alias Resolver Disabled Runtime Flag Accessor — 2026-07-28

## Purpose

This document records a non-visible internal refactor for the Phase 2 alias resolver runtime path.

The PR extracts the hard-coded disabled `phase2AliasResolver` flag into a small internal accessor that still returns `false`.

## Scope

Allowed:

- add `src/lib/phase2AliasResolverRuntimeFlag.ts`
- update `src/utils/score.ts` to call `isPhase2AliasResolverRuntimeEnabled()`
- keep the accessor returning `false`
- prove score, breakdown, display verdict, ranking, raw labels, and product references remain stable

Not allowed:

- returning `true` from the accessor
- reading env/config/secrets
- enabling canonical alias scoring
- changing app-visible scores
- changing app-visible labels, cards, detail pages, analysis text, warnings, badges, or ranking
- mutating product ingredients
- replacing raw labels with canonical aliases
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Runtime Behavior

`src/lib/phase2AliasResolverRuntimeFlag.ts` contains:

```ts
export function isPhase2AliasResolverRuntimeEnabled(): boolean {
  return false;
}
```

`src/utils/score.ts` now calls:

```ts
flags: { phase2AliasResolver: isPhase2AliasResolverRuntimeEnabled() }
```

Because the accessor returns `false`, the adapter still returns the original product object to scoring.

## Invariance Requirements

`src/lib/phase2AliasResolverRuntimeFlag.test.ts` verifies:

- the runtime accessor returns `false`
- the accessor does not read `process.env`, `import.meta.env`, or `localStorage`
- `score.ts` does not contain `phase2AliasResolver: true`
- `getPhase2AliasResolverScoringProduct(product)` returns the same product reference
- ingredient array references remain the same
- raw labels remain the same
- score and breakdown totals remain aligned
- display verdict remains derived from the same breakdown
- ranking remains stable for the fixture

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

The next non-visible step can introduce a test-only configuration seam around the disabled accessor, but it must still default to `false` and must not read live env/config unless a separate owner-approved app-visible or deploy-risk PR is opened.