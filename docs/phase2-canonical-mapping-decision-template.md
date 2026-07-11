# Phase 2-2 Canonical Mapping Decision Template

Use this template to review candidates from the Phase 2 canonical mapping dry-run. This is a decision worksheet only; it is not a migration file and must not be used to write directly to canonical tables.

## Decision Values

`proposed_decision` must be one of:

- `APPROVE_ALIAS`
- `SEPARATE_CANONICAL`
- `MANUAL_REVIEW`
- `REJECT_MAPPING`
- `NEEDS_EVIDENCE`

`review_status` must be one of:

- `todo`
- `reviewing`
- `approved`
- `blocked`

## Review Table

| review_id | source_section | legacy_names | normalized_key | proposed_decision | canonical_name_ko | alias_names | separate_canonical_reason | risk_policy | allergen_policy | evidence_required | review_status | reviewer_notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MAP-0001 | normalized_key_candidates | 비타민 E / 비타민E | 비타민e | APPROVE_ALIAS | 비타민 E | 비타민E |  | draft only until source reviewed | not applicable | source for canonical spelling | todo | spacing variant candidate |
| MAP-0002 | substring_risk_examples | 감자 / 감자 전분 |  | SEPARATE_CANONICAL | 감자 |  | processed form changes meaning | review separately | review separately | evidence for derived form handling | todo | substring-only matching prohibited |
| MAP-0003 | risk_review_examples | 닭고기 / 닭 지방 / 닭고기 단백질 / 가수분해 닭고기 |  | MANUAL_REVIEW |  |  | derived ingredients may differ | no active rule without evidence | confidence needed: confirmed / derived / manual_review | allergen/risk source required | todo | base and derived ingredient policy needed |

## Column Guide

| Column | Description |
| --- | --- |
| `review_id` | Stable review identifier, for example `MAP-0001`. |
| `source_section` | Dry-run result section, such as `normalized_key_candidates`, `substring_risk_examples`, or `risk_review_examples`. |
| `legacy_names` | Legacy ingredient names under review. |
| `normalized_key` | Normalized key when available. |
| `proposed_decision` | One of the allowed decision values. |
| `canonical_name_ko` | Proposed Korean canonical ingredient name, if applicable. |
| `alias_names` | Names that should become aliases if approved. |
| `separate_canonical_reason` | Required when choosing `SEPARATE_CANONICAL`. |
| `risk_policy` | Draft/review/active policy for risk rules. Active requires evidence and later approval. |
| `allergen_policy` | Allergen mapping decision and confidence policy. |
| `evidence_required` | Evidence or source requirement before migration. |
| `review_status` | One of the allowed status values. |
| `reviewer_notes` | Free-form reviewer notes. |

## Review Rules

- Use `APPROVE_ALIAS` only when names are semantically equivalent and reviewer-approved.
- Use `SEPARATE_CANONICAL` when processing, compound, form, part, or modifier changes meaning.
- Use `MANUAL_REVIEW` when the candidate cannot be decided from the dry-run result alone.
- Use `REJECT_MAPPING` for false positives.
- Use `NEEDS_EVIDENCE` when risk, allergen, or canonical naming needs a source before approval.

No row in this template authorizes direct database writes.
