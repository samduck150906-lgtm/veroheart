# Dictionary Candidate Patch Plan — 2026-08-17

## Purpose

This plan returns to the original canonicalization goal: inconsistent ingredient labels should resolve into stable meaning without unsafe collapse.

The immediate goal is not a UI badge and not a scoring change.

The goal is to prepare a safe dictionary patch by separating candidate rows into the right buckets first.

## Candidate Buckets

| bucket | target canonical | source family | allergen family | score change | visible change |
|---|---|---|---|---:|---:|
| fresh meat alias | existing named meat canonical | same source | same allergen | no | no |
| named meal alias | existing or future named meal canonical | same source | same allergen | no | no |
| source/allergen review | none yet | source only | allergy review only | no | no |
| deferred adjacent | none | none or unknown | none or review-only | no | no |

## Chicken Example

The chicken family already has two stable dictionary concepts:

- fresh named meat: `chicken`
- named meal: `chicken_meal`

Future candidates should preserve this split.

A fresh-meat wording gap can become a candidate alias for `chicken`.

A meal/powder wording gap can become a candidate alias for `chicken_meal`.

Fat, organ, cartilage, and generic byproduct terms should not be silently added to either bucket.

They need source/allergen review first.

## Other Animal Families

The same review pattern must apply to beef, pork, duck, lamb, turkey, salmon, tuna, whitefish, and egg.

Not every family currently has separate named meal canonicals.

That gap should be handled deliberately, not by pushing every meal-like label into ordinary meat.

## Allergy Guard

If a user has a source-family allergy, related forms may need allergy review even when canonical identity remains separate.

This is especially important for:

- named meat
- named meal
- fat
- organ
- cartilage
- generic poultry or animal byproduct

However, allergy-family review does not approve scoring or recommendation changes by itself.

## Required Before Runtime Use

Before any runtime use, a future PR must include:

- before/after allergy-hit diff
- before/after score diff
- affected product/ingredient report
- downgrade/upgrade review
- fallback for unknown and review-only forms
- emergency disable or rollback strategy

## Not Approved

This plan does not approve:

- dictionary mutation
- score changes
- allergy matcher changes
- UI changes
- runtime feature flag enablement
- product ingredient mutation
- visible label replacement
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is a non-runtime candidate fixture that exercises these buckets without importing the fixture into scoring, UI, runtime, or Supabase paths.
