# Veroheart Multi-Agent Harness Contract — 2026-08-19

## Purpose

This contract turns the Veroheart database normalization and scoring review work into an agent-readable, repeatable loop.

The goal is not to add a UI badge or to let an agent silently change production data.

The goal is to make every hypothesis about ingredient data, allergy safety, score logic, and product impact produce the same kind of evidence before a merge decision.

## Harness Engineering Principles Applied

The repository should contain the working memory needed by future agents.

Agents should receive a map, not a giant instruction blob.

Important product rules must be encoded as tests or structured reports, not only prose.

Each change should move through a small loop:

1. hypothesis
2. candidate change
3. fixture or data sample
4. agent review outputs
5. score, display, allergy, and affected-product diffs
6. review gate decision
7. merge, stop, or rollback plan

## Agent Roles

| agent | responsibility | required output |
|---|---|---|
| data-auditor | Checks ingredient dictionary, aliases, canonical ids, source families, and duplicate or missing labels. | coverage report, gap list, collision list |
| nutrition-policy | Checks whether part/form handling matches feed suitability logic. | policy verdict, caution boundary, unsupported assumptions |
| allergy-safety | Checks source-family allergy avoidance across meat, meal, fat, organ, fish oil, egg, and byproduct variants. | allergy-hit diff, false-positive guard, false-negative guard |
| scoring-regression | Checks compatibility score, display verdict, cap reason, grade, and ranking deltas. | before/after score diff, display diff, ranking diff |
| product-impact | Explains affected products and ingredient rows. | product id, ingredient, old signal, new signal, reason |
| review-gate | Decides whether the PR can merge automatically or needs owner approval. | safe, approval_required, or blocked |

## Shared Input Shape

A harness run should be understandable from a small packet:

- hypothesis id
- hypothesis statement
- target layer: dictionary, parser, allergy, scoring, display, database, UI, or deployment
- fixture products or sampled product ids
- profile assumptions
- expected positive cases
- expected negative cases
- expected unchanged surfaces

## Shared Output Shape

Every agent output should be summarized into a single review packet:

- status: pass, warn, fail, or not_applicable
- evidence rows
- changed surfaces
- known limits
- next action

## Automatic Safe Track

A PR can remain on the automatic safe track only when all are true:

- no Supabase write
- no SQL or migration
- no env, secret, URL, or deploy change
- no feature flag enablement
- no UI text or layout change
- no product ingredient mutation
- no silent score, display, allergy-hit, or ranking change
- tests or reports explicitly cover the changed behavior

## Approval Required Track

Owner approval is required when any are true:

- runtime allergy matcher changes can affect product scores or recommendations
- score formula, cap, grade, or ranking changes
- visible product card, detail page, analysis copy, warning copy, label, badge, or sorting changes
- production database write, migration, rollback, seed, or cleanup
- env, deploy, secret, token, project URL, or feature flag enablement

## Blocked Track

A PR is blocked when it:

- collapses meat, meal, fat, organ, cartilage, or byproduct into one ordinary meat canonical without review
- treats unknown animal byproduct as a named source such as chicken
- treats unknown ingredients as safe by default
- changes production data without a reviewed rollback path
- changes scoring without score and affected-product diffs

## Current Domain Invariants

- canonical identity, source family, allergen family, part/form, and scoring readiness are separate axes
- meat and meal can share allergen family but keep different canonical identities
- organ, fat, cartilage, and generic byproduct are not ordinary meat aliases
- source-family allergy protection may affect score and recommendation, but only with diff evidence
- unknown remains unknown or review-only, never safe by default

## First Loop Candidates

1. animal ingredient affected-product report
2. source-family allergy score diff over representative fixtures
3. canonical dictionary coverage report for beef, pork, duck, lamb, turkey, fish, and egg
4. production-read-only report plan for Supabase data

## Not Approved By This Contract

This contract does not approve production writes, migrations, env changes, deployment, UI changes, or broad scoring-policy rewrites.
