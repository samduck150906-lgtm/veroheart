# Phase 2-2 Canonical Mapping Policy Review

This policy review follows PR #17's production dry-run result:

- `legacy_ingredient_count = 539`
- `product_ingredient_link_count = 4265`
- `broken_or_empty_product_ingredient_links = 0`
- `normalized_key_candidate_group_count = 24`
- `manual_review_candidate_count = 50`
- `dangerous_substring_pair_count = 487`
- `risk_or_allergen_review_count = 148`
- `DRYRUN_ASSESSMENT = DRYRUN_REVIEW_REQUIRED`

The next step is mapping policy review, not data migration. This document defines review rules for deciding whether legacy ingredient names can become canonical ingredients, aliases, risk rules, or allergen mappings in a later phase.

No database write is authorized by this document.

## A. Review-Approved Alias Candidates

The following cases may be treated as review-approved alias candidates after human approval. They must not be applied automatically in this phase.

| Pattern | Examples | Policy |
| --- | --- | --- |
| Spacing differences | `비타민 E` / `비타민E` | Candidate for one canonical ingredient with aliases after review. |
| Hyphen differences | `오메가 3 지방산` / `오메가-3 지방산` | Candidate for one canonical ingredient with aliases after review. |
| Simple spelling instability | `건조 비트 펄프` / `건조 비트펄프` / `건조비트펄프` | Candidate for one canonical ingredient with aliases after review. |

These are review-approved alias candidates only. A later migration may use them only if the reviewer records an explicit decision.

## B. Likely Separate Canonical Ingredients

The following cases are likely to require separate canonical ingredients or manual review. They should not be merged just because one name contains another.

| Pattern | Examples | Policy |
| --- | --- | --- |
| Raw ingredient versus processed form | `감자` vs `감자 전분` | Usually separate canonical ingredients or manual review. |
| Raw ingredient versus powder, protein, or extract | `계란` vs `계란 분말`, `건조 닭고기` vs `건조 닭고기 단백질` | Usually separate canonical ingredients unless evidence and policy say otherwise. |
| Element or nutrient versus compound | `구리` vs `황산구리` | Usually separate canonical ingredients. |
| Part, form, or processing difference | `건조 비트` vs `건조 비트 펄프` | Manual review required. |
| Meaning-changing modifiers | origin, organic, freeze-dried, hydrolyzed, extracted, fermented, concentrate | Manual review required because the modifier may affect risk, allergen, or nutrition semantics. |

## C. Substring-Only Matching Is Prohibited

PR #17 found `dangerous_substring_pair_count = 487`. Because substring-risk pairs are common, substring-only automatic matching is prohibited.

Substring matching may be used only as a review flag. It must not create canonical mappings, aliases, risk rules, or allergen mappings by itself.

Actual alias promotion is allowed only from:

- exact normalized-key matches that pass human review;
- aliases explicitly approved in the decision template;
- evidence-backed policy decisions recorded before migration.

## D. Risk And Allergen Policy

Legacy `risk_level=caution` and `risk_level=danger` values must not be promoted directly into active canonical rules.

Until evidence and source links are attached, risk rules must remain `draft` or review-only. A later migration must not create active canonical risk rules from legacy risk labels alone.

Allergen mapping must distinguish base ingredients from derived ingredients. For example, the following must not be handled as one automatic rule:

- `닭고기`
- `닭 지방`
- `닭고기 단백질`
- `가수분해 닭고기`

Allergen candidates need a confidence policy before migration. Suggested confidence values:

- `confirmed`: directly supported by reviewed evidence or authoritative source.
- `derived`: derived ingredient relationship is known and accepted by policy.
- `manual_review`: candidate detected, but reviewer has not approved automatic mapping.

Risk and allergen candidates from the 148 dry-run findings should be reviewed before any canonical rule or allergen group receives active status.

## Review Output

Every candidate group must produce one decision row using `docs/phase2-canonical-mapping-decision-template.md`.

Allowed decisions are:

- `APPROVE_ALIAS`
- `SEPARATE_CANONICAL`
- `MANUAL_REVIEW`
- `REJECT_MAPPING`
- `NEEDS_EVIDENCE`

Completion of this review does not itself migrate data. It only prepares the policy inputs for a later sandbox rehearsal and migration design.
