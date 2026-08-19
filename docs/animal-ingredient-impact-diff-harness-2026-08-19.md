# Animal Ingredient Impact Diff Harness — 2026-08-19

## Purpose

This harness standardizes the affected-product report for animal ingredient, allergy-family, and scoring changes.

It compares baseline rows with candidate rows and reports:

- allergy-hit changes
- score changes
- display-score changes
- ranking-position changes
- unchanged unknown byproduct rows
- the shared multi-agent gate decision

## Why This Exists

Ingredient changes can look small but affect recommendations.

For example, making chicken-family allergies catch a named meal label can lower a product score and move it down in ranking for a chicken-allergic pet.

That is desirable when medically appropriate, but it must be visible as a diff.

## Report Shape

Each row includes:

- product id
- product name
- ingredient names
- allergy hits before and after
- score before and after
- display score before and after
- ranking position before and after
- per-row change booleans

The summary counts changed products by surface.

## Gate Behavior

If allergy-hit, score, display, or ranking changes are present, the report routes to `approval_required`.

If no protected surfaces change and all agent reviews are present, the report may be `safe`.

Unsafe semantic shortcuts remain blocked by the shared harness runner.

## Current Scope

This is a pure helper/test/docs harness.

It does not read or write Supabase, mutate products, change UI copy, enable feature flags, or change score logic.

## Next Step

The next safe step is to connect this harness to representative fixture snapshots for animal families.

A production-read report can come later, but production writes remain outside this scope.
