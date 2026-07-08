# Phase 2-2 Canonical Mapping Acceptance Criteria

These criteria must be satisfied before any future PR proposes canonical mapping data migration.

Phase 2-2 completion means policy decisions are ready for sandbox rehearsal. It does not mean production migration is approved.

## Required Review Completion

- All 24 normalized-key candidate groups have a recorded decision row.
- All 50 manual-review candidate rows from normalized-key groups are accounted for.
- Every decision row uses one of:
  - `APPROVE_ALIAS`
  - `SEPARATE_CANONICAL`
  - `MANUAL_REVIEW`
  - `REJECT_MAPPING`
  - `NEEDS_EVIDENCE`
- Every decision row has `review_status` set to one of:
  - `todo`
  - `reviewing`
  - `approved`
  - `blocked`
- No candidate with `todo`, `reviewing`, or `blocked` status is included in a migration plan.

## Substring Risk Criteria

- All 487 substring-risk pairs are covered by the substring-only automatic matching prohibition.
- Substring-only matching must not create canonical ingredients, aliases, risk rules, or allergen mappings.
- Representative risky substring cases are classified as separate canonical ingredients or manual review:
  - `감자` -> `감자 전분`
  - `계란` -> `계란 분말`
  - `건조 닭고기` -> `건조 닭고기 단백질`
  - `구리` -> `황산구리`
  - `건조 비트` -> `건조 비트 펄프`
- Substring detection may be used only as a review flag.

## Risk And Allergen Criteria

- The 148 risk/allergen candidates have a documented handling policy.
- Legacy `risk_level=caution` and `risk_level=danger` are not promoted directly to active canonical rules.
- Risk rules without evidence remain draft or review-only.
- Allergen mappings distinguish base ingredients from derived ingredients.
- Allergen confidence policy is defined before migration, for example:
  - `confirmed`
  - `derived`
  - `manual_review`
- Evidence/source requirements are recorded for any candidate that affects risk, allergen grouping, or active rule behavior.

## Evidence Criteria

- No risk rule without evidence is promoted to active.
- No allergen mapping requiring evidence is treated as confirmed without source review.
- Every `NEEDS_EVIDENCE` decision lists the required source type or review path.

## Migration Readiness Criteria

Before any future migration PR:

- A complete decision table exists and is reviewed.
- Sandbox rehearsal is required before production migration.
- Sandbox rehearsal must include dry-run input data, expected insert/update counts, rollback rehearsal, and verification queries.
- Production backup and PITR availability must be confirmed before operating migration.
- Separate human approval is required before production application.
- The future migration PR must separate review-approved alias inserts, separate canonical inserts, risk rule drafts, and allergen mappings.
- The future migration PR must not change runtime scoring behavior unless a separate product decision explicitly approves it.

## Stop Conditions

Do not proceed to migration if any of the following are true:

- Any normalized-key group lacks a decision.
- Any representative substring-risk case lacks classification.
- Any risk/allergen candidate lacks policy coverage.
- Any active risk rule would be created without evidence.
- Sandbox rehearsal has not been completed.
- Backup/PITR has not been confirmed.
- Production approval has not been recorded.
