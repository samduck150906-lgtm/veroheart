# Chicken Allergen Family Guard — 2026-08-17

## Purpose

This guard answers a critical product question:

If a user says their pet has a chicken allergy, the system should not recommend chicken-family ingredients simply because the label is not ordinary chicken meat.

Canonical identity may stay separate, but allergy review must remain family-aware.

## Current Runtime Finding

The current runtime allergy matcher checks whether the user allergy text appears in ingredient name, English name, or purpose after normalization.

That means a direct label may match, but source-family variants are not guaranteed to match consistently.

Examples of risky gaps:

- named meal labels may not match a simple chicken allergy input
- organ labels should not become ordinary meat, but should still be allergy-reviewed
- fat labels should not become ordinary meat, but should still be allergy-reviewed
- generic poultry/byproduct labels should remain review-only and should not become named safe meat

## Required Meaning Split

A future implementation must keep these axes separate:

| axis | purpose |
|---|---|
| canonical identity | exact ingredient concept |
| source family | animal/source family |
| allergen family | allergy family to evaluate |
| part/form | meat, meal, fat, organ, cartilage, byproduct, unknown |
| scoring readiness | whether this may affect score yet |

## Guard Rule

A chicken-family allergy should review all chicken-family forms, including named meat, named meal, fat, and organ-like rows.

That does not mean all of those rows share one canonical ingredient.

## Byproduct Boundary

Generic poultry or animal byproduct rows should not be silently recommended as named chicken meat.

They may need an allergy or caution review, but they need separate canonical/source review before scoring use.

## Not Approved

This guard does not approve:

- runtime allergy matcher changes
- score changes
- UI changes
- product recommendation changes
- canonical alias scoring
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is a dictionary candidate patch plan that separates:

1. fresh meat alias additions
2. named meal alias additions
3. source/allergen-only review additions
4. deferred or rejected adjacent terms

Any runtime allergy-family implementation must include before/after allergy-hit and score diff reports first.
