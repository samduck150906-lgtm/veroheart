# Phase 2 Canonical Mapping Dry-Run Results

## Execution

- Date: 2026-07-08
- Supabase project ref: `nlutpmjloryqdomgbqrr`
- SQL file: `supabase/tests/manual/phase2_canonical_mapping_dryrun.sql`
- Final assessment: `DRYRUN_REVIEW_REQUIRED`

This was a read-only dry-run. The SQL returned a result table only.

No operating database writes were performed:

- No canonical ingredient inserts or updates
- No alias inserts or updates
- No product label set or label item inserts
- No migration
- No runtime, scoring, or Edge Function change

## Result Summary

| Metric | Value | Interpretation |
| --- | ---: | --- |
| `legacy_ingredient_count` | 539 | Total legacy ingredient rows in `public.ingredients`. |
| `product_ingredient_link_count` | 4,265 | Total legacy product-to-ingredient links. |
| `product_ingredients_with_ingredient_id` | 4,265 | Every link row has an `ingredient_id`. |
| `broken_or_empty_product_ingredient_links` | 0 | Link integrity passed. There is no link-integrity block. |
| `normalized_key_candidate_group_count` | 24 | Candidate duplicate or alias groups require human review. |
| `manual_review_candidate_count` | 50 | Legacy ingredient rows in normalized-key candidate groups. |
| `dangerous_substring_pair_count` | 487 | Substring-only automatic matching is unsafe and prohibited. |
| `risk_or_allergen_review_count` | 148 | Risk and allergen candidates require policy review. |
| `DRYRUN_ASSESSMENT` | `DRYRUN_REVIEW_REQUIRED` | Do not migrate data automatically. Proceed to mapping policy review. |

## Interpretation

`broken_or_empty_product_ingredient_links = 0`, so the legacy `product_ingredients` link integrity check passed. There is no integrity block from missing products, missing ingredients, or empty `ingredient_id` values.

The result is still not migration-ready. The dry-run found normalized-key candidates, substring-risk candidates, and risk/allergen candidates. These findings mean the next step must be canonical mapping policy review, not data migration.

## Normalized Key Candidates

The dry-run found 24 normalized-key candidate groups containing 50 legacy ingredient rows. A human reviewer must decide whether each group is a true alias group, a spelling variation, or distinct ingredients that should remain separate.

Representative examples:

| Candidate group | Review question |
| --- | --- |
| 건조 비트 펄프 / 건조 비트펄프 / 건조비트펄프 | Confirm whether spacing variants should map to one canonical ingredient. |
| 오메가 3 지방산 / 오메가-3 지방산 / 오메가3 지방산 | Confirm canonical spelling and alias policy. |
| 비타민 E / 비타민E | Confirm spacing alias policy. |
| 닭 지방 / 닭지방 | Confirm spacing alias policy. |
| 소르빈산 칼륨 / 소르빈산칼륨 | Confirm spacing alias policy. |

## Substring Risk

The dry-run found 487 substring-risk pairs. This is high enough that substring-only automatic matching is explicitly prohibited for Phase 2 canonical mapping.

Representative examples:

| Unsafe substring pair | Risk |
| --- | --- |
| 감자 -> 감자 전분 | A base ingredient and derived ingredient may require different canonical treatment. |
| 계란 -> 계란 분말 | Form-specific ingredients should not be merged by substring alone. |
| 건조 닭고기 -> 건조 닭고기 단백질 | Protein/extract/form variants may not be equivalent. |
| 구리 -> 황산구리 | Mineral compound names must be reviewed as distinct candidates. |
| 건조 비트 -> 건조 비트 펄프 | Ingredient part/form differences require human review. |

Policy implication: exact normalized-key matching and reviewed alias tables may be used as inputs, but substring-only matching must not create canonical mappings automatically.

## Risk And Allergen Review

The dry-run found 148 risk/allergen review candidates. These rows need review before they are connected to canonical risk rules or allergen groups.

Required review decisions:

- Which legacy risk labels should carry forward into canonical rules
- Which ingredients map to allergen groups
- Which derived ingredients require separate treatment from base ingredients
- Which candidates require evidence before becoming active rules

## Next Step

The next step is mapping policy review.

Do not proceed directly to canonical data migration. Before any future insert/update migration is proposed, reviewers should:

1. Export and archive the dry-run result table.
2. Review the 24 normalized-key candidate groups.
3. Mark substring-risk pairs as manual-review-only unless an explicit alias rule is approved.
4. Review the 148 risk/allergen candidates with canonical risk rule and allergen group policy.
5. Define the mapping acceptance criteria for any later migration PR.

This result supports moving to policy review only. It does not authorize data writes.
