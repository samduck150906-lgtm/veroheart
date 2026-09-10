# Health-concern missing-evidence neutral policy candidate

Status: policy-only, shadow-only, not authorized for runtime or UI activation.

## Problem

The canonical evaluator correctly distinguishes missing, partial, applicable, and contradictory evidence. The first score shadow summed the evaluator's current `scoringContribution`, however, so a selected concern with missing evidence received zero of the 20-point concern component. This converts lack of product data into a suitability penalty even though the judgment contract states that confidence must not be hidden as a numeric suitability penalty.

## Candidate invariant

Missing evidence is not positive evidence and is not negative evidence. For one or more recognized selected concerns, the neutral concern-fit point is 5/20 (25% of each equal concern share). Only sufficient, active, comparable contradictory evidence may reduce a concern below that neutral point. No selection retains 20/20 so a user who did not request concern matching is not penalized, but this must never be described as health-suitability evidence.

| Evaluator state | Factor | Meaning for later user copy |
| --- | ---: | --- |
| `unknown / missing / insufficient` | 25% | Insufficient public information; neutral, not suitable or unsuitable |
| `not_applicable / insufficient` | 25% | Comparison rule does not apply; neutral |
| tag only | 25% | Tag recorded but not substantiated; neutral |
| ingredient only, amount unknown | 25% | Relevant name present but quantity/suitability unknown; neutral |
| tag + ingredient, amount unknown | 50% | Limited positive evidence; no quantitative or therapeutic claim |
| partial quantitative | 25% or 50% | Owner decision remains open; compare both variants in shadow |
| validated quantitative, all active checks pass | 100% | Supported only within the exact audited comparison scope |
| sufficient active contradictory check | 0% | The only state allowed below neutral; advise checking before feeding |

## Two bounded variants

- `conservative_partial_quantitative`: partial quantitative evidence stays at the 25% neutral point until all required active evidence is available.
- `limited_partial_quantitative_credit`: partial quantitative evidence receives 50% limited credit while remaining explicitly partial.

The variants differ only for `partial_quantitative`. They must be reported separately, and this PR must not select or activate either variant.

## Multiple concerns and rounding

Twenty points are divided across unique canonical evaluator results. Contributions are allocated in integer hundredths with deterministic largest-remainder allocation. Therefore three neutral concerns produce `1.67 + 1.67 + 1.66 = 5.00`, not a hidden rounding increase or decrease.

## Blocking rules

- Any unrecognized selected profile input blocks candidate scoring.
- A selected input with no evaluator result blocks candidate scoring.
- An evaluator status/evidence/confidence combination outside the audited truth table blocks candidate scoring.
- Informational thresholds cannot create support, contradiction, a bonus, or a penalty.

## Communication constraints

- `unknown`: say that the currently public information is insufficient to judge fit.
- `partial`: state exactly which evidence is present and which required evidence is unavailable.
- `supported`: describe only the audited comparison; never imply treatment, prevention, cure, therapeutic suitability, or guaranteed improvement.
- `contradictory`: say that the comparable value is outside the reviewed criterion and needs confirmation before feeding; do not invent a feeding ban.
- No numeric total or grade may independently generate reassuring health language.

## Protected surfaces

This candidate is a pure sidecar. Runtime score, ranking, display verdict, UI copy, allergy/poultry logic, stores, database, migrations, environment, and deployment remain unchanged. Production activation requires a separate owner-approved PR after copied-data impact review.
