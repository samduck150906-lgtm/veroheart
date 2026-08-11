# Phase 2 Alias Resolver Isolated Adapter Prototype — 2026-07-28

## Purpose

This document records the isolated product adapter prototype for Phase 2 alias resolver wiring.

The adapter is not imported by runtime/scoring app surfaces. It proves that a future adapter can exist behind the disabled feature flag without mutating products, changing ingredient labels, changing scores, or touching production data.

## Scope

- Adds `resolveProductWithPhase2AliasAdapter` as an isolated helper.
- Adds unit tests for disabled default behavior and candidate-only enabled behavior.
- No runtime/scoring app surface integration.
- No feature flag enabled in production.
- No Supabase execution.
- No SQL changes.
- No migrations.
- No `.env`, secrets, credentials, URLs, or access tokens.

## Disabled Behavior

When the feature flag is absent or false:

- the original `Product` object is returned by reference
- the original `ingredients` array is preserved
- `changed` is `false`
- no resolver results are produced
- no score input can change

## Explicitly Enabled Test Behavior

When tests pass `phase2AliasResolver: true`, the adapter may produce sidecar resolutions.

Even then:

- the original product is returned by reference
- raw ingredient labels remain unchanged
- `changed` remains `false`
- `matched` returns a candidate only in sidecar metadata
- `unmatched` stays raw-label-first
- `blocked` stays review-only
- no final score is changed

## Not Approved

This prototype does not approve:

- importing the adapter into app runtime/scoring surfaces
- enabling the feature flag in production
- changing score calculations
- replacing product ingredients in runtime
- creating product label rows
- Supabase production write/apply/rollback
- migrations
- automatic canonical safety scoring

## Next Step

The next safe PR may add tests that compare scoring outputs before and after the adapter with the flag off. Actual runtime integration, feature flag enablement, score changes, or production data work still require explicit owner approval.