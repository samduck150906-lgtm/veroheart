# Phase 2-2.5 Canonical Mapping Decisions Draft

## Status

This document is a decision draft. It is not a migration file.

This document does not authorize database writes. It does not authorize canonical table inserts, updates, deletes, upserts, or merges.

Rows marked `APPROVE_ALIAS` are still not migration candidates while `review_status` is `todo` or `reviewing`. They are draft review rows only.

Before any actual migration, the project still requires sandbox rehearsal, backup/PITR confirmation, and explicit approval.

No operating Supabase SQL execution is required or authorized by this document.

Allowed `proposed_decision` values in this draft are `APPROVE_ALIAS`, `SEPARATE_CANONICAL`, `MANUAL_REVIEW`, `REJECT_MAPPING`, and `NEEDS_EVIDENCE`.

Allowed `review_status` values are `todo`, `reviewing`, `approved`, and `blocked`.

## Dry-Run Summary

This draft is based on the Phase 2 production dry-run and Phase 2-2 policy review kit.

| Metric | Value |
| --- | ---: |
| `legacy_ingredient_count` | 539 |
| `product_ingredient_link_count` | 4265 |
| `broken_or_empty_product_ingredient_links` | 0 |
| `normalized_key_candidate_group_count` | 24 |
| `manual_review_candidate_count` | 50 |
| `dangerous_substring_pair_count` | 487 |
| `risk_or_allergen_review_count` | 148 |
| `DRYRUN_ASSESSMENT` | `DRYRUN_REVIEW_REQUIRED` |

The dry-run has no link-integrity block, but it is not migration-ready. The next step is human decision review, not data migration.

## Normalized-Key Candidate Decision Draft

These 24 normalized-key candidate groups are initial decision rows. Most are spacing, hyphen, or simple notation variants, so the starting `proposed_decision` is `APPROVE_ALIAS`.

This is not approval. Every row starts as `review_status=todo`; no row may be migrated until a reviewer changes it to `approved` and the acceptance criteria are satisfied.

| review_id | source_section | legacy_names | normalized_key | proposed_decision | canonical_name_ko | alias_names | separate_canonical_reason | risk_policy | allergen_policy | evidence_required | review_status | reviewer_notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MAP-DRAFT-001 | normalized_key_candidates | 건조 비트 펄프 / 건조 비트펄프 / 건조비트펄프 | 건조비트펄프 | APPROVE_ALIAS | 건조 비트 펄프 | 건조 비트펄프 / 건조비트펄프 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-002 | normalized_key_candidates | 오메가 3 지방산 / 오메가-3 지방산 / 오메가3 지방산 | 오메가3지방산 | APPROVE_ALIAS | 오메가 3 지방산 | 오메가-3 지방산 / 오메가3 지방산 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | hyphen and spacing variant candidate; not approved |
| MAP-DRAFT-003 | normalized_key_candidates | 감자 전분 / 감자전분 | 감자전분 | APPROVE_ALIAS | 감자 전분 | 감자전분 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-004 | normalized_key_candidates | 건조 맥주 효모 / 건조 맥주효모 | 건조맥주효모 | APPROVE_ALIAS | 건조 맥주 효모 | 건조 맥주효모 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-005 | normalized_key_candidates | 녹차 추출물 / 녹차추출물 | 녹차추출물 | APPROVE_ALIAS | 녹차 추출물 | 녹차추출물 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-006 | normalized_key_candidates | 닭 간 / 닭간 | 닭간 | APPROVE_ALIAS | 닭 간 | 닭간 |  | draft only until source reviewed | manual_review if allergen-linked | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-007 | normalized_key_candidates | 닭 간 분말 / 닭간 분말 | 닭간분말 | APPROVE_ALIAS | 닭 간 분말 | 닭간 분말 |  | draft only until source reviewed | manual_review if allergen-linked | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-008 | normalized_key_candidates | 닭 연골 / 닭연골 | 닭연골 | APPROVE_ALIAS | 닭 연골 | 닭연골 |  | draft only until source reviewed | manual_review if allergen-linked | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-009 | normalized_key_candidates | 닭 지방 / 닭지방 | 닭지방 | APPROVE_ALIAS | 닭 지방 | 닭지방 |  | draft only until source reviewed | manual_review if allergen-linked | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-010 | normalized_key_candidates | 동물성 지방 / 동물성지방 | 동물성지방 | APPROVE_ALIAS | 동물성 지방 | 동물성지방 |  | draft only until source reviewed | manual_review | canonical spelling/source review | todo | broad animal-derived term; not approved |
| MAP-DRAFT-011 | normalized_key_candidates | 맥주 효모 / 맥주효모 | 맥주효모 | APPROVE_ALIAS | 맥주 효모 | 맥주효모 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-012 | normalized_key_candidates | 비타민 E / 비타민E | 비타민e | APPROVE_ALIAS | 비타민 E | 비타민E |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-013 | normalized_key_candidates | 비트 펄프 / 비트펄프 | 비트펄프 | APPROVE_ALIAS | 비트 펄프 | 비트펄프 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-014 | normalized_key_candidates | 소르빈산 칼륨 / 소르빈산칼륨 | 소르빈산칼륨 | APPROVE_ALIAS | 소르빈산 칼륨 | 소르빈산칼륨 |  | NEEDS_EVIDENCE before active risk rule | not applicable | canonical spelling/source review | todo | preservative-related candidate; not approved |
| MAP-DRAFT-015 | normalized_key_candidates | 오메가 6 지방산 / 오메가-6 지방산 | 오메가6지방산 | APPROVE_ALIAS | 오메가 6 지방산 | 오메가-6 지방산 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | hyphen and spacing variant candidate; not approved |
| MAP-DRAFT-016 | normalized_key_candidates | 증점 다당류 / 증점다당류 | 증점다당류 | APPROVE_ALIAS | 증점 다당류 | 증점다당류 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | additive category candidate; not approved |
| MAP-DRAFT-017 | normalized_key_candidates | 천연 색소 / 천연색소 | 천연색소 | APPROVE_ALIAS | 천연 색소 | 천연색소 |  | NEEDS_EVIDENCE before active risk rule | not applicable | canonical spelling/source review | todo | colorant category candidate; not approved |
| MAP-DRAFT-018 | normalized_key_candidates | 코코넛 오일 / 코코넛오일 | 코코넛오일 | APPROVE_ALIAS | 코코넛 오일 | 코코넛오일 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-019 | normalized_key_candidates | 타피오카 전분 / 타피오카전분 | 타피오카전분 | APPROVE_ALIAS | 타피오카 전분 | 타피오카전분 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-020 | normalized_key_candidates | 토마토 박 / 토마토박 | 토마토박 | APPROVE_ALIAS | 토마토 박 | 토마토박 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |
| MAP-DRAFT-021 | normalized_key_candidates | 프락토-올리고당 / 프락토올리고당 | 프락토올리고당 | APPROVE_ALIAS | 프락토올리고당 | 프락토-올리고당 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | hyphen variant candidate; not approved |
| MAP-DRAFT-022 | normalized_key_candidates | 프로필렌 글리콜 / 프로필렌글리콜 | 프로필렌글리콜 | APPROVE_ALIAS | 프로필렌 글리콜 | 프로필렌글리콜 |  | NEEDS_EVIDENCE before active risk rule | not applicable | canonical spelling/source review | todo | additive-related candidate; not approved |
| MAP-DRAFT-023 | normalized_key_candidates | 향미 증진제 / 향미증진제 | 향미증진제 | APPROVE_ALIAS | 향미 증진제 | 향미증진제 |  | NEEDS_EVIDENCE before active risk rule | not applicable | canonical spelling/source review | todo | additive category candidate; not approved |
| MAP-DRAFT-024 | normalized_key_candidates | 혼합 토코페롤 / 혼합토코페롤 | 혼합토코페롤 | APPROVE_ALIAS | 혼합 토코페롤 | 혼합토코페롤 |  | draft only until source reviewed | not applicable | canonical spelling/source review | todo | spacing variant candidate; not approved |

## Substring-Risk Global Decision

The 487 substring-risk pairs are not individually mapped in this draft. They receive a global decision:

| review_id | source_section | legacy_names | normalized_key | proposed_decision | canonical_name_ko | alias_names | separate_canonical_reason | risk_policy | allergen_policy | evidence_required | review_status | reviewer_notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MAP-DRAFT-SUBSTRING-GLOBAL | substring_risk_examples | 487 substring-risk pairs |  | MANUAL_REVIEW |  |  | substring-only matching is unsafe | no active rule from substring alone | no allergen mapping from substring alone | reviewer classification required | blocked | substring detection is a review flag only |

Substring-only automatic matching is prohibited. Substring detection may be used only as a review flag.

Representative substring-risk cases:

| Case | Draft classification | Reason |
| --- | --- | --- |
| 감자 -> 감자 전분 | SEPARATE_CANONICAL | Raw ingredient versus processed starch. |
| 계란 -> 계란 분말 | SEPARATE_CANONICAL | Raw ingredient versus powder form. |
| 건조 닭고기 -> 건조 닭고기 단백질 | MANUAL_REVIEW | Protein/form variant needs policy review. |
| 구리 -> 황산구리 | SEPARATE_CANONICAL | Element/nutrient versus compound. |
| 건조 비트 -> 건조 비트 펄프 | MANUAL_REVIEW | Part/form/processing difference. |

## Risk/Allergen Policy Decision Draft

The 148 risk/allergen candidates are not individually mapped in this draft. They are grouped into policy category decisions.

| review_id | source_section | legacy_names | normalized_key | proposed_decision | canonical_name_ko | alias_names | separate_canonical_reason | risk_policy | allergen_policy | evidence_required | review_status | reviewer_notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MAP-DRAFT-RISK-DANGER | risk_review_examples | legacy `risk_level=danger` candidates |  | NEEDS_EVIDENCE |  |  |  | active rule prohibited; draft/review-only until evidence | review separately | source/evidence required before active rule | blocked | legacy danger is not enough for active canonical rule |
| MAP-DRAFT-RISK-CAUTION | risk_review_examples | legacy `risk_level=caution` candidates |  | NEEDS_EVIDENCE |  |  |  | active rule prohibited; draft/review-only until evidence | review separately | source/evidence required before active rule | blocked | legacy caution is not enough for active canonical rule |
| MAP-DRAFT-ALLERGEN-BASE-PROTEIN | risk_review_examples | base animal protein allergen candidates |  | MANUAL_REVIEW |  |  |  | no active rule without evidence | confidence policy required | allergen source and confidence policy required | todo | base proteins need reviewer-approved allergen policy |
| MAP-DRAFT-ALLERGEN-DERIVED | risk_review_examples | derived animal ingredients |  | MANUAL_REVIEW |  |  | derived ingredient may differ from base ingredient | no active rule without evidence | do not automatically equate with base ingredient | derived relationship evidence required | todo | do not auto-treat derived ingredients as base ingredients |
| MAP-DRAFT-ADDITIVES | risk_review_examples | additives / preservatives / colorants |  | NEEDS_EVIDENCE |  |  |  | active rule prohibited until source/evidence review | usually not allergen mapping | source/evidence required before active status | blocked | additive policy must be evidence-backed |
| MAP-DRAFT-GRAIN-LEGUME | risk_review_examples | grain / legume candidates |  | MANUAL_REVIEW |  |  |  | risk and nutrition policy must be separated | allergen/risk distinction required | source/evidence required where risk is claimed | todo | distinguish allergen, intolerance, nutrition, and formulation risks |

## Acceptance Gate

This draft does not complete the acceptance criteria.

Only rows changed by a human reviewer to `review_status=approved` may become sandbox rehearsal candidates.

Rows with `review_status=todo`, `review_status=reviewing`, or `review_status=blocked` are not migration candidates.

Before migration:

1. Every normalized-key candidate row must have a reviewer decision.
2. Substring-risk policy must remain manual-review-only unless an explicit approved alias row exists.
3. Risk/allergen policy categories must have evidence and confidence decisions.
4. Sandbox rehearsal must be completed.
5. Backup/PITR must be confirmed.
6. Explicit approval must be recorded.

This document is a draft review artifact only. It does not authorize production migration.
