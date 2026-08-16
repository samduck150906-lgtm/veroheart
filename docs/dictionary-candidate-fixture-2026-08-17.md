# Dictionary Candidate Fixture — 2026-08-17

## Purpose

This fixture exercises the candidate patch buckets without changing the live dictionary, scoring, UI, runtime imports, Supabase, or product data.

It is a dry, non-runtime step before any dictionary mutation.

## Fixture Buckets

The fixture covers:

| bucket | meaning | canonical target allowed? | runtime allowed? |
|---|---|---:|---:|
| fresh meat alias | direct wording gap for existing meat canonical | yes | no |
| named meal alias | direct wording gap for existing meal canonical | yes | no |
| source/allergen review | related source family but not direct canonical alias | no | no |
| deferred adjacent | unknown or too broad to map safely | no | no |

## Guardrails

Every row keeps:

- score change disabled
- visible change disabled
- runtime import disabled
- product mutation disabled by implication

## Why This Matters

The app should not solve inconsistent ingredient labels by flattening every related animal term into one ingredient.

The fixture keeps direct alias work separate from allergy-family review and deferred adjacent terms.

## Not Approved

This fixture does not approve:

- dictionary mutation
- score changes
- allergy matcher changes
- UI changes
- runtime feature flag enablement
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is a score/display invariance gate for the future dictionary patch.

Only after that should a real dictionary alias patch be proposed, and that patch may require explicit approval if it can change visible analysis, quality labels, allergy hits, or scores.
