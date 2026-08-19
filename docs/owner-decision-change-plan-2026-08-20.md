# Owner Decision Change Plan — 2026-08-20

## Purpose

This adapter converts an accepted owner approval into a non-executable implementation-preparation plan.

It does not apply the behavior change.

The plan exists to make the next implementation PR mechanically reviewable before any runtime, UI, score, ranking, database, env, deploy, or flag effect occurs.

## Eligibility

A change plan is eligible only when all are true:

- the owner decision response was accepted
- the decision is `approved`
- the response next action is `prepare_separate_change_pr`
- the packet is present in the owner-attention brief
- the attention kind is `approval_required`

Rejected, revision-needed, blocked, operationally unsafe, missing, or otherwise invalid decisions do not produce an eligible plan.

## Plan Contents

An eligible plan records:

- expected changed surfaces
- required evidence
- required tests
- forbidden operational actions
- authorization boundaries

For allergy/score/display/ranking changes the plan requests regression coverage and before/after affected-product evidence.

Unknown or generic animal sources remain protected by the semantic guard and must not become named ordinary meat sources.

## Authorization Boundary

Owner approval authorizes only preparation of a separate change PR.

It does not authorize:

- runtime application
- production database writes
- migration or rollback execution
- env, secret, URL, or token changes
- deploy
- runtime flag enablement
- automatic merge of behavior-changing code

## Safety Boundary

This PR is helper/test/docs only.

It does not access Supabase, execute SQL, mutate production rows, change score logic, change UI, change env/deploy, or enable a runtime flag.

## Next Safe Step

The next safe step is to bind the change plan to a required implementation evidence checklist so any future behavior-changing PR must carry the expected diff, regression tests, and affected-product report before it can reach owner review.
