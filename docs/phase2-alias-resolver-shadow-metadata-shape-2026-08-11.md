# Phase 2 Alias Resolver Shadow Metadata Shape — 2026-08-11

## Purpose

This document records the non-visible metadata shape for Phase 2 alias resolver shadow-mode reports.

The metadata is sidecar-only. It does not replace raw labels, does not mutate product ingredients, does not change scores, and does not approve canonical alias scoring.

## Scope

Allowed:

- add `src/lib/phase2AliasResolverShadowMetadata.ts`
- map adapter sidecar decisions into a stable metadata row shape
- summarize matched, unmatched, blocked, and ambiguous rows
- keep every row score-neutral and non-mutating
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

## Row Shape

Each shadow metadata row contains:

| field | meaning |
|---|---|
| `ingredientId` | original ingredient id |
| `rawNameKo` | original Korean ingredient label |
| `status` | `matched`, `unmatched`, `blocked`, or `ambiguous` |
| `canonicalCandidate` | matched canonical candidate, otherwise null |
| `canonicalCandidateId` | matched canonical id, otherwise null |
| `aliasId` | matched alias id, otherwise null |
| `reviewState` | `sidecar_only` for matched, `review_required` otherwise |
| `scoreImpactAllowed` | always false |
| `runtimeMutationAllowed` | always false |
| `visibleLabelReplacementAllowed` | always false |
| `reason` | stable reason string for audit/reporting |

## Review Rules

| status | review state | score impact | runtime mutation | visible label replacement |
|---|---|---:|---:|---:|
| matched | sidecar only | false | false | false |
| unmatched | review required | false | false | false |
| blocked | review required | false | false | false |
| ambiguous | review required | false | false | false |

## Fixed Fixture Summary

The test fixture includes one representative row for each status.

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

The next non-visible step can define a shadow-mode result envelope that includes product id, run metadata, and these sidecar rows. It must remain app-invisible and score-neutral.
