# Anatomical Heart Runtime Impact Verification

## Boundary

This local-only aggregate audit verifies the narrow legacy runtime correction that prevents animal-heart ingredient identity from acting as heart-health benefit evidence. It does not replace the legacy concern score with the canonical evaluator, change scoring weights or thresholds, change missing-evidence policy, or authorize canonical health-score activation.

An anatomical organ name identifies an ingredient source part. It is not evidence that a product supports heart health. Removing the false match does not prove that any product is unsuitable.

## Copied Input

- Filename: `붙여넣은 텍스트 (1)(2).txt`
- Size: 1,868,544 bytes
- SHA-256: `8feea2baadeec067d4c0e04f82e402ce7358c5cf9627de40507667c3c1a3dc19`
- Joined rows: 4,410
- Adapted products: 458
- Product/profile rows compared: 4,122

The raw JSON and product-level comparison remain outside the repository.

## Method

The after state uses the corrected runtime `getRecommendationBreakdown()` path. For a row classified as a pure anatomical-heart collision, the before state is reconstructed on a cloned product by supplying the same selected concern as inert matching tag evidence, which reproduces the previous concern match while leaving ingredients and every non-concern input unchanged. Non-collision rows use identical before and after inputs.

All nine canonical concerns are compared in species-aware dog and cat cohorts. Ordering uses the existing total-score descending order and product-ID tie-break. The committed impact helper returns aggregate counts only and does not mutate its inputs.

## Aggregate Before And After

- Affected product/profile rows: 4
- Affected concern: `heart` (4 rows)
- Legacy concern fit: `20 -> 5` (4 rows)
- Total-score delta, after minus before: `-15` (4 rows)
- Display-score delta, after minus before: `-15` (4 rows)
- Grade changes: 4
- Matched-concern reasons removed: 4
- Existing neutral no-direct-match reasons added: 4
- Every affected row confirmed as an anatomical-heart collision: yes
- Other concerns changed: 0

The four affected rows are the same confirmed animal-heart lexical collision class identified by PR #105. The corrected `5` concern-fit value is the existing neutral legacy result for no direct match, not a new penalty.

## Ordering

- Species/concern cohorts compared: 18
- Cohorts with an ordering change: 1
- Products whose position changed: 27

Only four products received score changes. The remaining position changes are deterministic rank ripple within the affected heart cohort; no unrelated concern cohort changed.

## Component Invariance

Each component below had zero changed rows:

- Ingredient safety and general health suitability
- Allergy hits and allergy penalty
- Poultry/allergy cautions and caution penalty
- Preference level and preference penalty
- Species mismatch
- Danger and caution ingredient counts

Invariant violations: 0.

## Interpretation

This correction removes a confirmed runtime false positive while preserving legitimate matching health tags, explicit ingredient-purpose evidence, and independent non-anatomical name evidence. It does not make a medical claim, does not infer suitability from missing evidence, and does not resolve the separate missing-evidence policy question. No canonical health-concern score is activated by this change.
