# Animal Source / Part / Allergen Contract — 2026-08-16

## Purpose

This contract prevents the canonical ingredient layer from flattening every label from the same animal into one meaning.

The original data issue was inconsistent labels. The fix is not to collapse everything. The fix is to separate several axes:

1. canonical identity: the exact ingredient concept
2. source family: the animal or source family
3. allergen family: the allergy family to evaluate
4. part or form: fresh meat, meal, fat, organ, cartilage, byproduct, unknown
5. scoring readiness: whether the mapping may affect scoring yet

## Core Rule

Same animal source does not mean same canonical ingredient.

Fresh meat, processed meal, fat, organ, cartilage, and generic byproduct can share a source family or allergen family, but they must not automatically share canonical identity or score meaning.

## Current Example

Chicken has two legitimate canonical concepts today:

| concept | canonical id | source family | allergen family | form |
|---|---|---|---|---|
| fresh named meat | `chicken` | `chicken` | `chicken` | fresh meat |
| named meal | `chicken_meal` | `chicken` | `chicken` | processed meal |

They may both trigger chicken-family allergy review, but they should remain separate canonical concepts.

## Review-Only Forms

These forms require separate review before any scoring use:

- fat
- organ
- cartilage
- generic animal byproduct
- generic poultry byproduct
- unknown animal material

Those labels may eventually carry a source or allergen family, but this contract does not approve treating them as ordinary meat.

## Scoring Boundary

This PR does not change scoring.

Before any scoring use, a future PR must include:

- before/after score diff
- affected product/ingredient report
- allergy hit diff
- downgrade/upgrade review
- rollback and emergency disable strategy

## Not Approved

This contract does not approve:

- app-visible changes
- canonical alias scoring
- allergy score changes
- runtime feature flag enablement
- product ingredient mutation
- visible label replacement
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is a non-runtime diff report fixture that shows how animal labels would be classified across canonical identity, source family, allergen family, part/form, and scoring readiness.
