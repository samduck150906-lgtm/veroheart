# Hypothesis Validation Runner — 2026-08-19

## Purpose

This runner is the first executable piece of the Veroheart multi-agent harness.

It converts a hypothesis plus agent review outputs into a deterministic gate decision.

## Loop

1. Define a hypothesis.
2. Run or record each agent review.
3. Collect changed surfaces.
4. Check semantic safety shortcuts.
5. Return one decision: `safe`, `approval_required`, or `blocked`.

## Required Agents

The runner requires the same six agent roles defined in the contract:

- data-auditor
- nutrition-policy
- allergy-safety
- scoring-regression
- product-impact
- review-gate

A missing agent review prevents a `safe` decision.

## Approval Surfaces

The runner requires owner approval when any of these surfaces change:

- score
- display verdict
- allergy hit
- ranking
- UI copy
- product ingredient data
- Supabase write
- SQL migration
- env/deploy
- runtime flag

## Blocked Semantic Shortcuts

The runner blocks changes that:

- collapse part/form distinctions into ordinary meat
- treat unknown as safe
- treat unknown animal byproduct as a named source

## Current Scope

This is a pure helper and test harness.

It does not import Supabase, mutate product data, enable runtime flags, change UI copy, or change score logic.

## Next Step

Use this runner to wrap a fixture-based animal ingredient impact report.

That report can become the standard artifact for future database reads and scoring reviews.
