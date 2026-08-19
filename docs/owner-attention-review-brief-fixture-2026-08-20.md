# Owner Attention Review Brief Fixture — 2026-08-20

## Purpose

This fixture compresses the read-only evidence packet index into the smallest human-review surface needed for owner decisions.

Safe packets stay silent.

Only packets that are approval-required, blocked, or operationally unsafe are included.

## Inputs

The brief consumes `ReadOnlyEvidencePacketIndex` from the existing evidence packet index harness.

Each attention entry keeps:

- packet id
- source and execution state
- attention kind
- operational safety status
- changed-surface counts
- approval reasons
- blocked reasons
- one explicit owner action

## Attention Kinds

### approval_required

Used for user-visible behavior impact such as allergy hit, score, display verdict, or ranking changes.

Owner action: review the proposed user-visible behavior impact before merge.

### blocked

Used for semantic safety violations that must not merge, such as collapsing generic or unknown animal byproduct into a named ordinary meat source.

Owner action: do not merge until the semantic issue is resolved.

### operational_safety_violation

Used when the packet crosses a write/runtime/deploy safety boundary even if its semantic gate is otherwise safe.

Owner action: stop and inspect the operational boundary before proceeding.

## Silent Safe Track

A truly no-diff safe packet is omitted from the owner attention brief entirely.

This is intentional: the owner should not need to inspect routine helper/test/docs work that does not affect visible behavior or operational state.

## Safety Boundary

This PR is helper/test/docs only.

It does not:

- access Supabase
- execute SQL
- mutate production rows
- change runtime score logic
- change UI or copy
- enable a runtime flag
- change env, secrets, URLs, tokens, or deploy settings
- approve production writes

## Next Safe Step

The next safe harness step is an owner-decision response contract that turns a reviewed brief into a structured `approved / rejected / needs_revision` decision record without applying any runtime, database, env, deploy, or UI change.
