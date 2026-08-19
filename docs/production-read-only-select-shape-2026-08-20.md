# Production Read-Only SELECT Shape — 2026-08-20

## Purpose

This document defines the row shapes needed to feed production-like read-only data into the impact dry-run harness.

This PR does not execute Supabase queries and does not approve production writes.

## Datasets

| dataset | required columns | optional columns | adapter target |
|---|---|---|---|
| products | id, name | category, targetPetType | ProductionReadOnlyProductRow |
| ingredients | id, nameKo | nameEn, riskLevel | ProductionReadOnlyIngredientRow |
| product_ingredients | productId, ingredientId, position | none | ProductionReadOnlyProductIngredientRow |
| computed_signals | productId, allergyHits, score, displayScore | rankingPosition | ProductionReadOnlySignalRow |

## Intended Flow

1. read product rows
2. read ingredient rows
3. read product-to-ingredient rows
4. compute or provide before/after signal rows
5. adapt rows with `buildProductionReadOnlySnapshotReport`
6. compare snapshots with `buildProductionReadOnlyImpactDryRun`

## Safety Boundary

Allowed:

- SELECT-shaped row planning
- test fixture rows
- read-only adapter compatibility checks
- docs and tests

Not allowed:

- Supabase execution
- SQL execution from the app runtime
- insert, update, upsert, delete, truncate
- table or index creation/deletion
- migrations
- env, secret, URL, token, or deploy changes
- product ingredient mutation

## Review Boundary

A future PR that actually reads production data must still prove it is read-only. A future PR that writes production data, changes app-visible output, changes score policy, or deploys code must stop for owner approval.
