# Production Read-Only Impact Dry-Run — 2026-08-20

## Purpose

This dry-run connects the production-shaped read-only row adapter to the animal ingredient impact diff harness.

It proves the intended loop can run without Supabase access:

1. read-only shaped rows
2. snapshot adapter
3. before/after impact diff
4. harness gate decision

## What This Adds

- `src/lib/productionReadOnlyImpactDryRun.ts`
- `src/lib/productionReadOnlyImpactDryRun.test.ts`

The helper accepts two row packets:

- `beforeRows`
- `afterRows`

Each packet has production-shaped product, product-ingredient, ingredient, and signal rows.

The helper returns:

- before snapshot adapter report
- after snapshot adapter report
- animal ingredient impact diff report
- joined summary
- dry-run safety flags

## Fixture Scenario

The test fixture compares two products:

| product | before | after |
|---|---|---|
| chicken meal fixture | no allergy hit, score 80, display 80 | chicken allergy hit, score 0, display 0 |
| unknown byproduct fixture | no allergy hit, score 70, display 70 | unchanged |

The fixture intentionally causes behavior-impacting diff rows so the shared harness gate returns `approval_required`.

## Safety Boundaries

This PR does not:

- connect to Supabase
- execute SQL
- run a migration
- mutate production rows
- change runtime score logic
- change allergy matcher logic
- change UI
- change env or deploy settings

## Next Step

The next safe step is a read-only SQL shape document or local script scaffold that describes the exact SELECT outputs needed to feed this dry-run.

That still must not execute production SQL or change env values.
