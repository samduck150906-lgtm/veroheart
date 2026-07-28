# Phase 2 Alias Resolver Disabled Feature Flag Contract — 2026-07-28

## Purpose

This document defines the required contract before the Phase 2 alias resolver helper can be wired near runtime/scoring code.

This PR does not wire the helper into runtime, scoring, product analysis, Edge Functions, Supabase, or production data. It only documents the disabled-feature-flag contract and adds static tests that guard the contract text.

## Current State

Completed before this contract:

- PR #29 documented the alias resolver integration contract.
- PR #31 added the helper-only resolver implementation.
- PR #32 added deterministic code dry-run fixtures and results.

The helper can classify labels as:

- `matched`
- `unmatched`
- `ambiguous`
- `blocked`

The helper contract remains exact normalized key equality only. It must not use substring matching, fuzzy matching, or semantic inference.

## Hard Safety Boundaries

The next implementation PR may prepare wiring only when all of the following remain true:

- The feature flag default is disabled/off.
- The flag cannot be enabled by default in production.
- No `.env`, secrets, credentials, URLs, or tokens are added or changed.
- No Supabase write/apply/rollback is executed.
- No migrations are added or modified.
- No SQL files are added or modified.
- No Edge Function behavior is changed.
- No runtime/scoring behavior is changed while the flag is off.
- No product label rows are created.
- No canonical alias result is allowed to silently change the final score while the flag is off.

## Required Flag Semantics

A future wiring PR must define a flag with these semantics:

```text
phase2AliasResolver: disabled by default
```

When disabled:

- Existing runtime/scoring behavior must remain unchanged.
- Existing ingredient labels must flow through the current path.
- The alias resolver may be imported only in an isolated, non-executed or explicitly disabled code path.
- Any helper invocation must be guarded by the flag before it can affect user-visible output.
- Tests must prove disabled behavior is unchanged.

When enabled in a later reviewed PR:

- `matched` may provide a canonical candidate for review/scoring input.
- `unmatched` must preserve the raw ingredient label and continue existing behavior.
- `ambiguous` must preserve the raw ingredient label and surface review-needed status, not auto-select.
- `blocked` must preserve the raw ingredient label and surface review-only status, not auto-resolve.

## Resolver Status Handling Contract

| resolver status | allowed behavior before runtime approval |
|---|---|
| `matched` | May be recorded as a candidate in dry-run or disabled-flag output only. |
| `unmatched` | Must keep raw label. No semantic inference. |
| `ambiguous` | Must keep raw label and require review. No automatic canonical choice. |
| `blocked` | Must keep raw label and require review. No low-risk canonical assignment. |

## Failure And Fallback Contract

A future wiring PR must fail safe:

- Missing alias seed data must fall back to raw labels.
- Invalid/empty labels must remain unmatched.
- Resolver exceptions must not break product analysis screens.
- Resolver failures must not raise product scores.
- Unknown results must be review-only, not safe-by-default.

## Minimum Tests Required For A Future Wiring PR

Before any wiring PR can be merged, tests must prove:

- The flag is disabled by default.
- Disabled flag output matches the current behavior.
- No scoring change happens while disabled.
- `matched` does not affect final score while disabled.
- `unmatched` keeps raw labels.
- `ambiguous` keeps raw labels and review-needed semantics.
- `blocked` keeps raw labels and review-only semantics.
- No substring, fuzzy, or semantic inference path is introduced.

## Not Approved By This Contract

This contract does not approve:

- enabling the feature flag
- runtime/scoring integration in production
- Supabase production write/apply/rollback
- migrations
- product label row creation
- automatic canonical safety scoring
- replacing ingredient safety decisions with alias matches

## Next Step

The next safe PR may add disabled-by-default wiring scaffolding and tests, but the flag must remain off and user-visible behavior must remain unchanged.

Turning the flag on, changing scores, running migrations, or touching production data requires explicit owner approval.