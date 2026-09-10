# Health-concern neutral-policy copied-data shadow impact

Status: aggregate, local copied-data analysis only. No runtime conclusion or activation is authorized.

## Verified input

- Copied export size: 1,868,544 bytes
- SHA-256: `8feea2baadeec067d4c0e04f82e402ce7358c5cf9627de40507667c3c1a3dc19`
- Joined rows: 4,410
- Adapted products: 458
- Product/profile matrix rows: 4,122
- Confidence: 0 sufficient, 565 partial, 3,557 insufficient

The raw JSON, absolute local path, and product-level output are not committed.

## Evidence states observed

| Policy disposition | Rows | Factor |
| --- | ---: | ---: |
| Missing evidence, neutral | 2,752 | 25% |
| Comparison not applicable, neutral | 805 | 25% |
| Ingredient name only, quantity unknown, neutral | 565 | 25% |
| Partial quantitative | 0 | variant-dependent |

All 4,122 rows computed successfully. No unrecognized-input block, contract-mismatch block, or invariant violation occurred.

## Comparison with current runtime

Both policy variants produced the same result on this export:

- Concern-fit distribution: 5 points for all 4,122 rows
- Total-score changes: 0
- Display-score changes: 0
- Grade changes: 0
- Comparable cohorts: 18
- Cohorts with ordering changes: 0
- Products with changed position: 0

This is expected: the current runtime already uses a five-point floor when a selected concern has no direct legacy match. The candidate policy makes the same numeric outcome explicit while attaching a structured evidence state that does not claim suitability.

## Comparison with the first evaluator-sum candidate

The first shadow candidate summed evaluator contributions directly and assigned zero points to missing or not-applicable evidence. Relative to that non-runtime candidate, both neutral variants:

- add 5 points to 3,557 insufficient-confidence rows;
- leave 565 ingredient-only partial rows unchanged;
- change 541 hypothetical grades.

These are corrections to an experimental shadow candidate, not production score changes. They confirm that zero contribution would have converted unavailable information into a large hidden suitability penalty.

## Variant decision remains open

The export contains no `partial_quantitative` rows because no audited quantitative threshold is currently enabled for judgment. Therefore it cannot distinguish:

- conservative 25% neutral treatment; and
- limited 50% credit for partial quantitative evidence.

The copied-data result supports the shared missing-evidence neutral rule but does not justify choosing the partial-quantitative factor. A later decision requires audited active thresholds plus dedicated fixtures or newly available compatible data. Until then, the conservative factor is safer as a review default but is not activated by this PR.

## Interpretation boundary

- Missing evidence remains insufficient evidence, not positive evidence.
- A five-point neutral result must be paired with explicit “판단하기 어려워요” wording, not “적합해요”.
- Informational checks cannot earn or remove points.
- Only sufficient, active, comparable contradictory evidence may score below neutral.
- No treatment, prevention, cure, therapeutic-suitability, or guaranteed-improvement claim is permitted.
- Runtime score, ranking, display verdict, UI, allergy/poultry logic, data stores, database, migrations, environment, and deployment remain unchanged.
