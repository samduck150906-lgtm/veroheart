# Phase 2 Alias Resolver Shadow Execution Wrapper — 2026-08-11

## Purpose

This document records the non-visible shadow execution wrapper for Phase 2 alias resolver reporting.

The wrapper can build an internal shadow report for a list of products. It is not wired into app screens and does not change score, display verdict, ranking, raw labels, or product data.

## Scope

Allowed:

- add `src/lib/phase2AliasResolverShadowExecution.ts`
- build internal shadow reports from products, aliases, optional canonicals, and blocked terms
- keep candidate execution disabled unless tests pass `testCandidateEnabled: true`
- keep all report counters score-neutral and non-mutating
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

## Wrapper Behavior

`buildPhase2AliasResolverShadowExecutionReport()` accepts:

| field | meaning |
|---|---|
| `products` | product fixtures or future read-only product inputs |
| `aliases` | alias seed inputs |
| `canonicals` | optional canonical seed inputs |
| `blockedTerms` | review-only blocked terms |
| `testCandidateEnabled` | test-only candidate switch, default disabled |

When `testCandidateEnabled` is omitted, the adapter is disabled and produces no rows. When tests set it to true, the wrapper produces an internal sidecar report while preserving raw labels and keeping all score/mutation/visible replacement counters at zero.

## Fixed Fixture Summary

| metric | value |
|---|---:|
| products | 3 |
| total rows | 6 |
| matched rows | 2 |
| unmatched rows | 2 |
| blocked rows | 1 |
| ambiguous rows | 1 |
| review required rows | 4 |
| sidecar only rows | 2 |
| score impact allowed rows | 0 |
| runtime mutation allowed rows | 0 |
| visible label replacement allowed rows | 0 |
| changed products | 0 |

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

The next non-visible step can add a static app-surface guard that fails if shadow execution is imported into UI/card/detail/analysis surfaces before explicit approval.
