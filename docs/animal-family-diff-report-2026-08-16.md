# Animal Family Non-Runtime Diff Report — 2026-08-16

## Purpose

This report fixture shows how animal ingredient labels should be reviewed across separate meaning axes before any score, allergy, UI, database, or runtime behavior changes.

It follows the original goal: unify inconsistent data into stable meaning without flattening distinct ingredient types.

## Fixture Summary

The current non-runtime fixture has:

| metric | value |
|---|---:|
| total rows | 5 |
| canonical rows | 2 |
| allergen-family rows | 5 |
| review-only rows | 3 |
| score-delta-allowed rows | 0 |
| visible-change-allowed rows | 0 |

## Interpretation

The fixture proves the intended separation:

- fresh named meat and named meal can share source/allergen family
- fresh named meat and named meal remain separate canonical concepts
- fat, organ, and byproduct-like rows can carry allergy family context without becoming score-ready
- no row is approved to change scores
- no row is approved to change app-visible output

## Why This Matters

A simple alias merge would be dangerous.

For example, a source-family match can help allergy review, but it must not automatically turn an organ, fat, cartilage, or generic byproduct label into ordinary meat.

## Not Approved

This report does not approve:

- score changes
- allergy score changes
- visible label replacement
- UI changes
- runtime feature flag enablement
- product ingredient mutation
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is an implementation plan for dictionary candidate patches.

That plan should list exact candidate additions separately by:

1. fresh meat alias additions
2. named meal alias additions
3. source/allergen-only review additions
4. explicitly rejected or deferred adjacent terms

Any real dictionary mutation should remain non-runtime first and include tests showing score/display invariance.
