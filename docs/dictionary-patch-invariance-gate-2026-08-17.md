# Dictionary Patch Invariance Gate — 2026-08-17

## Purpose

This gate defines the stop line before a real dictionary alias patch can affect runtime behavior.

A dictionary patch may look small, but it can change analysis output if the dictionary is used by ingredient quality, allergy matching, score calculation, labels, or detail explanations.

## Required Reports Before Runtime Impact

Any future patch that can affect runtime behavior must include:

- before/after score diff
- before/after display verdict diff
- before/after allergy-hit diff
- affected product/ingredient report
- upgrade/downgrade review
- fallback for unknown or review-only rows
- rollback or emergency disable plan

## Silent Changes Are Not Allowed

The following are not allowed silently:

- score changes
- allergy-hit changes
- display verdict changes
- visible label changes
- recommendation/ranking changes
- product ingredient mutation

## Operational Boundary

This gate also does not allow:

- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes
- runtime feature flag enablement

## Owner Approval Boundary

Explicit approval is required before any app-visible change, score-impacting change, allergy-matcher runtime change, or production data change.

## Current Status

The current work remains docs/test-only.

No dictionary mutation has been made yet.

## Next Step

The next possible step is a proposed dictionary patch PR.

That PR must be treated as potentially behavior-impacting until a diff proves otherwise.
