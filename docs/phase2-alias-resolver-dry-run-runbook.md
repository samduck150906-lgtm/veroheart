# Phase 2 Alias Resolver Dry-Run Runbook

## Purpose

This runbook explains how to run the Phase 2 alias resolver dry-run SQL:

`supabase/tests/manual/phase2_alias_resolver_dry_run.sql`

This is read-only inspection tooling. It does not modify production data, does not create canonical/product label rows, does not change app runtime/scoring, and does not approve runtime/scoring integration.

Run this only after PR #25 production result documentation has been reviewed. PR #25 recorded `PRODUCTION_ALIAS_SEED_VERIFIED` for the Phase 2 low-risk alias production seed:

- pre-apply preflight PASS
- apply completed, with SQL Editor 42P01 temp relation error noted
- post-apply preflight PASS
- verify PASS
- 14 canonical seed rows
- 30 alias seed rows
- excluded candidates inserted: 0
- forbidden related rows: 0
- rollback not run
- final assessment: `PRODUCTION_ALIAS_SEED_VERIFIED`

## What It Inspects

The dry-run checks how already-seeded Phase 2 low-risk canonical aliases match legacy `ingredients` and `product_ingredients` data.

It uses exact normalized matching only:

- lowercases text
- removes whitespace and common punctuation
- compares exact normalized keys
- does not use substring-only matching
- does not infer semantic matches
- does not map excluded candidates

Ambiguous matches are review-only. They are not accepted mappings.

## Expected Sections

The SQL returns a single result table with these sections:

- `seed_summary`
- `legacy_ingredient_exact_alias_matches`
- `legacy_ingredient_unmatched_sample`
- `dangerous_or_excluded_collision_check`
- `ambiguous_many_to_one_or_one_to_many_check`
- `dry_run_assessment`

## Interpreting The Assessment

- `DRY_RUN_READY`: the resolver candidate mapping looks structurally safe for the seeded aliases only.
- `DRY_RUN_REVIEW_REQUIRED`: manual review is needed before runtime/scoring integration.
- `DRY_RUN_BLOCKED`: do not proceed to runtime/scoring integration.

`PASS` does not approve connecting aliases to scoring. It only means this read-only resolver inspection did not find structural blockers for the already-seeded low-risk alias set.

## Operator Procedure

1. Confirm this PR is merged.
2. Open `supabase/tests/manual/phase2_alias_resolver_dry_run.sql`.
3. Confirm the SQL contains only SELECT/CTE read-only logic.
4. Run it in the intended Supabase SQL Editor.
5. Save the complete output.
6. Do not run any apply/write SQL.
7. Paste the dry-run output into the next review/documentation step.

## Stop Conditions

Stop and do not proceed to runtime/scoring integration if any of these occur:

- dangerous/excluded collision count > 0
- ambiguous mapping count > 0
- seed count is not exactly 14 canonical and 30 aliases
- missing legacy tables or columns
- SQL Editor error
- unexpected product ingredient fanout

## Notes And Assumptions

- Legacy ingredient names are read from `public.ingredients.name_ko` and `public.ingredients.name_en`.
- Product usage counts are read from `public.product_ingredients.ingredient_id`.
- The dry-run does not depend on product row contents and does not dump product data.
- If a future schema changes these table or column names, treat SQL Editor errors as a stop condition and update the runbook before rerunning.

## Safety Boundaries

- read-only
- no production write
- no runtime/scoring changes
- no Edge Function changes
- no migrations
- no write/apply/rollback SQL
- no `.env`, secrets, credentials, URLs, or access tokens
