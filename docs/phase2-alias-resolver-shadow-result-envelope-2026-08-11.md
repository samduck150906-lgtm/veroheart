# Phase 2 Alias Resolver Shadow Result Envelope — 2026-08-11

## Purpose

This document records the non-visible shadow-mode result envelope for Phase 2 alias resolver sidecar reporting.

The envelope combines product identity, adapter reason, run metadata, sidecar metadata rows, and a row summary. It does not change app-visible output.

## Scope

Allowed:

- add `src/lib/phase2AliasResolverShadowResult.ts`
- wrap existing sidecar metadata rows into a stable result envelope
- keep score impact, runtime mutation, and visible label replacement flags false
- support disabled and test-candidate shadow result shapes
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

## Envelope Shape

Each shadow result envelope contains:

| field | meaning |
|---|---|
| `productId` | original product id |
| `productName` | original product name |
| `adapterReason` | adapter branch reason |
| `changed` | always false |
| `metadata.runMode` | `disabled` or `test_candidate_shadow` |
| `metadata.resolverEnabled` | whether adapter candidate branch ran |
| `metadata.source` | `phase2_alias_resolver_adapter_sidecar` |
| `metadata.scoreImpactAllowed` | always false |
| `metadata.runtimeMutationAllowed` | always false |
| `metadata.visibleLabelReplacementAllowed` | always false |
| `rows` | shadow metadata rows from PR #51 |
| `summary` | row counts from PR #51 |

## Covered Branches

| adapter branch | envelope result |
|---|---|
| disabled | no rows, `runMode=disabled`, all safety toggles false |
| test candidate shadow | sidecar rows + summary, all safety toggles false |

## Fixed Fixture Summary

The test candidate fixture includes four ingredient rows.

| metric | value |
|---|---:|
| total rows | 4 |
| matched rows | 1 |
| unmatched rows | 1 |
| blocked rows | 1 |
| ambiguous rows | 1 |
| review required rows | 3 |
| sidecar only rows | 1 |
| score impact allowed rows | 0 |
| runtime mutation allowed rows | 0 |
| visible label replacement allowed rows | 0 |

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

The next non-visible step can build a shadow report from one or more envelopes. It must remain app-invisible, sidecar-only, and score-neutral.
