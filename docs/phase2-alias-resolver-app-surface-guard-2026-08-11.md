# Phase 2 Alias Resolver App Surface Guard — 2026-08-11

## Purpose

This document records the static guard that keeps Phase 2 alias resolver shadow reporting modules out of app-visible UI and scoring surfaces.

The guard is a test-only safety rail. It does not change app behavior.

## Scope

Allowed:

- add a static import guard test
- check app-visible surfaces for shadow reporting imports
- keep `score.ts` free of `phase2AliasResolver: true`
- keep app-visible output unchanged

Not allowed:

- enabling the runtime feature flag
- changing score calculations
- changing app-visible scores, labels, cards, detail pages, analysis text, warnings, badges, or ranking
- mutating product ingredients
- replacing raw labels with canonical aliases
- using canonical aliases as safety decisions
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Guarded Surfaces

The static guard checks these files when present:

| file | reason |
|---|---|
| `src/components/ProductCard.tsx` | product card visible score/badge surface |
| `src/components/AnalysisResult.tsx` | detail/result visible score and analysis surface |
| `src/utils/analysis.ts` | analysis report generation |
| `src/utils/productConclusion.ts` | conclusion/warning copy |
| `src/utils/displayVerdict.ts` | visible grade/score cap output |
| `src/utils/score.ts` | scoring and ranking source |

## Forbidden Shadow Imports

The app-visible surfaces must not import:

- `phase2AliasResolverShadowExecution`
- `phase2AliasResolverShadowReport`
- `phase2AliasResolverShadowResult`
- `phase2AliasResolverShadowMetadata`

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

The next non-visible step can add a final pre-approval summary for the Phase 2 alias resolver shadow pipeline. Any actual app-visible integration must stop for owner approval.
