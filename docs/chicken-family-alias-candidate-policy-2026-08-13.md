# Chicken-Family Alias Candidate Policy — 2026-08-13

## Purpose

This policy follows the original canonicalization goal: inconsistent ingredient labels should resolve into stable ingredient meaning without flattening different ingredient types into one bucket.

The next data work should not be a cosmetic UI badge. It should be a controlled alias candidate review.

## Canonical Buckets

Use three buckets:

| bucket | target canonical id | source family | scoring-ready |
|---|---|---|---:|
| fresh named chicken meat | `chicken` | `chicken` | no |
| processed named chicken meal | `chicken_meal` | `chicken` | no |
| adjacent review-only terms | none yet | `chicken_or_poultry` | no |

## Key Rule

Fresh meat and processed meal may share the same source/allergen family, but they must remain separate canonical concepts.

This prevents the system from treating every chicken-family label as the same ingredient.

## Review-Only Boundary

Adjacent terms such as fat, organ, cartilage, and generic poultry/byproduct labels should not silently collapse into either fresh meat or processed meal.

They may eventually carry a source/allergen family, but they need separate review before canonical mapping or scoring use.

## Not Approved

This policy does not approve:

- scoring use
- app-visible changes
- runtime feature flag enablement
- product ingredient mutation
- visible label replacement
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is a source/allergen separation contract that makes this explicit:

- canonical identity answers “what exact ingredient concept is this?”
- source family answers “what animal/source family is this related to?”
- allergen family answers “what allergy family should this trigger?”

Those three should not be forced into one field.
