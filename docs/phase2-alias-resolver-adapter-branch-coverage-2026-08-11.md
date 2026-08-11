# Phase 2 Alias Resolver Adapter Branch Coverage — 2026-08-11

## Purpose

This document records test-only branch coverage for the Phase 2 alias resolver product adapter.

The runtime default remains disabled. This PR does not change app-visible scores, labels, cards, detail pages, analysis copy, warnings, badges, or ranking.

## Scope

Allowed:

- add test-only branch coverage for the product adapter
- verify the flag-off branch returns the original product with no resolutions
- verify omitted flags behave the same as disabled flags
- verify the test-only flag-on candidate branch creates sidecar resolutions only
- verify matched, unmatched, blocked, and ambiguous statuses are represented
- verify raw ingredient labels and product references remain unchanged

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

## Covered Branches

`src/lib/phase2AliasResolverProductAdapterBranchCoverage.test.ts` covers:

| branch | expected result |
|---|---|
| flag off | original product returned, no resolutions, reason `feature_flag_disabled` |
| flags omitted | same as disabled |
| flag on with empty ingredients | original product returned, no resolutions, reason `no_ingredients_no_runtime_change` |
| flag on with fixture ingredients | sidecar resolutions created, product unchanged |

## Candidate Status Coverage

The test-only candidate branch verifies representative resolver statuses:

| raw label | expected status | runtime mutation |
|---|---|---|
| `비타민 E` | `matched` | none |
| `닭고기 분말` | `unmatched` | none |
| `소르빈산 칼륨` | `blocked` | none |
| `맥주효모` | `ambiguous` | none |

## Runtime Safety

The adapter remains sidecar-only. Even when a test passes `flags: { phase2AliasResolver: true }`, the adapter returns the original product object and keeps `changed: false`.

This does not turn on the runtime flag. It only proves the candidate branch behavior is safe to inspect in unit tests.

## Not Approved By This PR

This PR does not approve:

- app-visible output changes
- runtime feature flag enablement
- canonical alias scoring
- score calculation changes
- Supabase production operations
- migrations
- product label row creation

## Next Step

The next non-visible step can define a resolver metadata shape for shadow-mode reports. It must remain sidecar-only and must not change app-visible output.
