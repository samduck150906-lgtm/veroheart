# Fresh Meat Tenderloin Normalization — 2026-08-17

## Purpose

This patch handles a narrow real data gap found during the animal-family audit: fresh named meat cut labels can appear with a tenderloin-style wording suffix.

The patch keeps the original veterinary-nutrition principle:

- canonical identity remains separate from source family
- source/allergen family can be shared across forms
- fresh meat, meal, fat, organ, cartilage, and byproduct must not collapse into one meaning

## Runtime Change

`normalizeIngredientName` now removes the Korean fresh-meat cut suffix `정육` before exact dictionary comparison.

This allows labels like fresh named animal meat cuts to resolve to existing fresh meat canonicals when the base animal source is already a dictionary alias.

Examples covered by test:

- chicken fresh meat cut label -> `chicken`
- beef fresh meat cut label -> `beef`
- duck fresh meat cut label -> `duck`

## Guardrails

This patch deliberately does not map:

- meal/powder labels to fresh meat
- organ labels to fresh meat
- fat labels to fresh meat
- cartilage labels to fresh meat
- byproduct labels to fresh meat

Existing processed meal labels still resolve to the processed-meal canonical.

## Medical/Nutrition Basis

The change follows the project rule approved for this stage:

- named fresh meat cut wording can be normalized into the named fresh meat source
- forms and parts with different nutritional or allergy implications should stay separate
- source-family allergy review must not be confused with canonical identity
- byproducts/organs are not automatically bad, but vague or generic animal material should not receive ordinary meat treatment

## Not Changed

This patch does not change:

- product data
- Supabase rows
- SQL or migrations
- env/secrets/deploy settings
- UI copy
- runtime feature flags

## Required Follow-Up

Before broader dictionary patches or allergy-family runtime logic, the project still needs before/after reports for:

- allergy-hit changes
- score changes
- display verdict changes
- affected products and ingredients
