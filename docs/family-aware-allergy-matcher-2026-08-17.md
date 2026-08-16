# Family-Aware Allergy Matcher — 2026-08-17

## Purpose

This change closes the gap where a user allergy could match direct label text but miss related source-family labels.

The original data goal still applies:

- do not collapse every animal part into one canonical ingredient
- do treat source-family allergy as a feeding safety concern
- do not recommend a chicken-family ingredient to a pet with a chicken allergy simply because the label says meal, organ, fat, or poultry byproduct instead of ordinary chicken meat

## Changed Behavior

The scoring allergy matcher now uses a shared family-aware helper.

It still supports the old direct text behavior, but it also checks:

1. exact dictionary matches
2. dictionary allergen tags
3. conservative source-family rules

## Chicken Allergy Example

A profile allergy label such as `닭` now maps to both:

- `chicken`
- `poultry`

That means these labels are reviewed as allergy hits:

- ordinary chicken meat
- chicken meal / chicken powder style labels
- chicken organ style labels
- chicken fat style labels
- generic poultry byproduct style labels

## Boundary

This does not turn organ, fat, cartilage, or byproduct into ordinary meat.

Those labels can trigger allergy review while still remaining separate from fresh named meat.

Unknown generic animal byproduct is not silently treated as named chicken.

## Score / Display Impact

This is intentionally runtime-impacting for allergy protection.

If a product now has a source-family allergy hit, the existing allergy penalty and display protection apply.

The PR test fixture confirms:

- chicken meal is detected for a `닭` allergy
- allergy penalty is applied
- display score remains within allergy-protected range
- feed analysis summary also reports the allergy concern

## Operational Boundary

This change does not include:

- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes
- runtime feature flag enablement
- UI copy rewrite
- product ingredient mutation

## Follow-up

A broader production data report can be run later to list real products newly affected by source-family allergy matching.
