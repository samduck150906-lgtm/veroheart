# Phase 2 Alias Resolver Shadow Invariance — 2026-08-11

## Purpose

This document records non-visible invariance tests around Phase 2 alias resolver shadow reports.

The shadow report can be built for fixture products, but app-visible score, breakdown, display verdict, ranking, and raw labels must remain unchanged.

## Scope

Allowed:

- add test-only shadow report invariance coverage
- compare score, breakdown, display verdict, ranking, and raw labels before and after shadow report creation
- keep shadow report counters score-neutral and non-mutating
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

## Invariance Checks

`src/lib/phase2AliasResolverShadowInvariance.test.ts` verifies:

- score before report creation equals score after report creation
- breakdown before report creation equals breakdown after report creation
- display verdict before report creation equals display verdict after report creation
- raw ingredient labels remain unchanged
- ranking order remains unchanged
- shadow report remains `non_visible_internal_report`
- changed product count remains `0`
- score impact allowed rows remain `0`
- runtime mutation allowed rows remain `0`
- visible label replacement allowed rows remain `0`

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

The next non-visible step can define a shadow report review packet that combines summaries, invariance proof, and approval gates. It must remain app-invisible and must not change score calculations or visible output.
