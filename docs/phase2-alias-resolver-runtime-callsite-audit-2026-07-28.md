# Phase 2 Alias Resolver Runtime Call-Site Audit — 2026-07-28

## Purpose

This document identifies the safest future call-site for Phase 2 alias resolver wiring.

This PR does not wire the resolver into runtime/scoring. It only audits likely integration points and records the minimum future approach.

## Current Runtime/Scoring Flow

### `src/utils/score.ts`

`getRecommendationBreakdown(product, profile)` is the central personalized scoring function.

It currently derives:

- raw ingredient list: `product.ingredients ?? []`
- allergy hits
- matched concerns
- danger/caution counts
- species mismatch
- feed quality via `analyzeFeed(product, profile)`
- final score via ingredient safety, health suitability, concern fit, allergy penalty, preference penalty, and species mismatch

`calculateCompatibilityScore(product, profile)` returns `getRecommendationBreakdown(product, profile).total`.

`rankProductsForProfile` also ranks by `getRecommendationBreakdown(product, profile).total`.

### `src/pages/AnalysisResult.tsx`

`AnalysisResult` consumes `calculateCompatibilityScore`, `getRecommendationBreakdown`, and `resolveDisplayVerdict`.

It should not be the first resolver integration point because it is a UI/detail surface. Adding alias resolution here would risk inconsistent behavior across product cards, ranking, search, and other analysis surfaces.

### `src/components/ProductCard.tsx`

`ProductCard` now uses `resolveProductDisplayVerdict(product, profile).score` for public display consistency.

It should not run alias resolution directly. Cards should consume already-resolved scoring/display results, not mutate ingredient labels locally.

## Recommended Future Minimal Call-Site

The safest future integration point is an isolated adapter immediately before score analysis consumes product ingredients.

Recommended future shape:

```text
raw Product
  → disabled feature flag guard
  → candidate-only alias resolver adapter
  → score/analyzeFeed input copy
  → existing getRecommendationBreakdown flow
```

The adapter must return a copied product-like object or a separate resolved ingredient view. It must not mutate the original product.

## Required Disabled-Flag Behavior

Before any runtime/scoring integration can be merged:

- The flag must remain disabled by default.
- Disabled output must be byte/shape-equivalent to the current scoring input.
- No score may change while disabled.
- Product cards, detail pages, ranking, and search must behave the same while disabled.
- No Supabase data may be read or written by the adapter.
- No product label rows may be created.
- `matched` may only annotate a candidate while disabled.
- `unmatched`, `ambiguous`, and `blocked` must preserve raw labels.

## Explicit Non-Call-Sites

Do not first integrate the resolver in:

- `ProductCard` display code
- `AnalysisResult` UI rendering code
- search sorting UI
- comparison UI
- Edge Functions
- Supabase SQL/migrations
- product data loading code

Those locations are consumers. Resolver behavior belongs in a dedicated adapter layer before scoring/analysis input, guarded by the disabled flag.

## Future PR Requirements

A future wiring PR must include tests proving:

- default flag off
- disabled score unchanged
- disabled display score unchanged
- disabled ranking order unchanged
- raw labels preserved for `unmatched`
- raw labels preserved for `ambiguous`
- raw labels preserved for `blocked`
- `matched` candidate does not affect score while disabled
- no app surface imports resolver helper directly

## Not Approved By This Audit

This audit does not approve:

- enabling the feature flag
- changing score calculations
- replacing product ingredients in runtime
- creating canonical product label rows
- Supabase production write/apply/rollback
- migrations
- Edge Function behavior changes
- automatic canonical safety scoring

## Next Step

The next safe PR may add an isolated adapter prototype behind the disabled flag with tests proving no behavior change while the flag is off.

Turning the flag on, changing scores, mutating product ingredients, or touching production data requires explicit owner approval.