# Phase 2 Alias Resolver Shadow Report Builder — 2026-08-11

## Purpose

This document records the non-visible shadow report builder for Phase 2 alias resolver sidecar reporting.

The report combines one or more shadow result envelopes into an internal summary. It remains app-invisible, score-neutral, non-mutating, and not eligible for visible label replacement.

## Scope

Allowed:

- add `src/lib/phase2AliasResolverShadowReport.ts`
- summarize one or more shadow result envelopes
- keep score impact, runtime mutation, visible label replacement, and changed product counters at zero
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

## Report Shape

Each shadow report contains:

| field | meaning |
|---|---|
| `reportKind` | `phase2_alias_resolver_shadow_report` |
| `visibility` | `non_visible_internal_report` |
| `scoreImpactAllowed` | always false |
| `runtimeMutationAllowed` | always false |
| `visibleLabelReplacementAllowed` | always false |
| `envelopes` | list of shadow result envelopes from PR #52 |
| `summary` | aggregate row/product counters |

## Fixed Fixture Summary

The multi-product fixture covers one disabled product and two test-candidate shadow products.

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

The next non-visible step can add score/display/ranking invariance tests around shadow reports. It must remain app-invisible and must not change score calculations or visible output.
