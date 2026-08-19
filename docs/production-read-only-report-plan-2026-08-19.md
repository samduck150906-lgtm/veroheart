# Production Read-Only Report Plan — 2026-08-19

## Purpose

This document defines the next evidence-gathering step for Veroheart ingredient database normalization and scoring review.

The goal is to prepare a production read-only report shape before any production write, migration, env change, deployment, UI change, or broad score-policy change.

This is a harness plan only. It does not execute a Supabase query and does not authorize production mutation.

## Allowed Read-Only Inputs

The report plan may read or sample these datasets in a future approved read-only run:

| dataset | allowed operations | purpose |
|---|---|---|
| products | select, count, sample | Product ids, names, categories, target pet type, and product metadata for affected-product reports. |
| product_ingredients | select, count, sample | Product-to-ingredient rows for ingredient label coverage. |
| ingredients | select, count, sample | Legacy ingredient names, risk levels, and source labels. |
| canonical_ingredients | select, count | Canonical source-family and part/form coverage. |
| canonical_ingredient_aliases | select, count | Alias coverage without inserting aliases. |
| canonical_ingredient_allergen_map | select, count | Allergen-family coverage for animal sources and adjacent parts. |
| canonical_ingredient_review_queue | select, count | Existing review-only rows and unresolved gaps. |

## Expected Artifacts

A future read-only report should emit these artifacts:

1. ingredient_label_coverage
2. canonical_alias_coverage
3. animal_family_allergy_impact
4. score_display_impact
5. review_queue_gap_summary

These artifacts should feed the existing multi-agent harness:

- data-auditor checks coverage and gaps
- nutrition-policy checks source, part, and form boundaries
- allergy-safety checks false positives and false negatives
- scoring-regression checks score, display, and ranking deltas
- product-impact explains affected products and ingredient rows
- review-gate returns safe, approval_required, or blocked

## Explicitly Forbidden By This Plan

This plan does not allow:

- insert
- update
- upsert
- delete
- truncate
- merge
- RPC mutation
- migration
- seed apply
- rollback execution
- env, secret, token, URL, or deploy change
- product ingredient mutation
- UI text or layout change
- runtime flag enablement

## Gate Behavior

Because this PR only adds a read-only report plan and pure tests, it remains safe.

A future run that reads production data but changes no product surface can remain a report-only track.

A future PR that changes allergy hits, scores, display verdicts, ranking, product ingredient data, UI, Supabase writes, SQL migrations, env/deploy, or runtime flags must be routed through approval_required by the harness gate.

A future PR is blocked if it treats unknown ingredients as safe, collapses meat/meal/fat/organ/cartilage/byproduct into ordinary meat without review, or treats an unknown animal byproduct as a named animal source.

## Next Step

The next safe step is a local or fixture-backed report adapter that can transform read-only rows into the already merged animal ingredient impact diff harness shape.

Actual production read access should still remain read-only and report-only. Production writes, migrations, deploys, and runtime flag enablement remain outside this plan.
