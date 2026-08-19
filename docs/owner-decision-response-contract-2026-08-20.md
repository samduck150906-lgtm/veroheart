# Owner Decision Response Contract — 2026-08-20

## Purpose

This contract records an owner decision after an owner-attention brief has surfaced a real review item.

It deliberately does not apply the decision to runtime, UI, scoring, production data, SQL, env, deploy, or flags.

## Supported Decisions

- `approved`
- `rejected`
- `needs_revision`

## Decision Semantics

### approved

Allowed only for an `approval_required` entry.

The next action is `prepare_separate_change_pr`.

Approval is therefore permission to prepare the behavior-changing change separately, not permission to auto-apply or auto-merge it.

### rejected

The next action is `stop_proposal`.

### needs_revision

The next action is `revise_evidence_and_resubmit`.

## Non-Approva​ble States

A blocked semantic safety issue cannot be approved.

An operational safety violation cannot be approved.

A packet that was not surfaced in the owner-attention brief cannot receive an owner decision through this contract.

This keeps safe packets silent and prevents a decision record from bypassing the evidence gate.

## Effect Policy

Every decision response explicitly keeps these effects disabled:

- runtime changes
- UI changes
- score changes
- production writes
- SQL execution
- env or deploy changes
- runtime flag enablement
- automatic merge of behavior-changing code

## Safety Boundary

This PR is helper/test/docs only.

It does not access Supabase, execute SQL, mutate production data, change the app, or deploy anything.

## Next Safe Step

The next safe harness step is to add a decision-to-change-plan adapter that turns an accepted `approved` response into a non-executable implementation plan and expected diff checklist. The actual behavior-changing implementation remains a separate owner-visible gate.
