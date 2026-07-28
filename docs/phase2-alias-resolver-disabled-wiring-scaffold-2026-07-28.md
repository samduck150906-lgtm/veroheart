# Phase 2 Alias Resolver Disabled Wiring Scaffold — 2026-07-28

## Purpose

This document records the disabled-by-default wiring scaffold for the Phase 2 alias resolver helper.

The scaffold prepares an isolated helper that can evaluate alias candidates only when explicitly enabled by an in-memory flag. It is not connected to product analysis, runtime scoring, Edge Functions, Supabase, migrations, or production data.

## Scope

- Adds a helper-only feature flag wrapper.
- Adds unit tests proving the default disabled path preserves raw labels.
- Adds candidate-only behavior for explicitly enabled test calls.
- No runtime/scoring import from app surfaces.
- No feature flag enabled in production.
- No Supabase execution.
- No SQL changes.
- No migrations.
- No `.env`, secrets, credentials, URLs, or access tokens.

## Disabled Default

The default flag is:

```text
phase2AliasResolver: false
```

When no flag is provided, the wrapper returns:

```text
status: disabled
outputLabel: raw input label
changed: false
canonicalCandidate: null
resolverResult: null
```

This proves the scaffold can exist without changing user-visible behavior.

## Candidate-Only Enabled Behavior

When a test explicitly passes `phase2AliasResolver: true`, the wrapper may call the helper and return a candidate result.

Even when enabled in tests:

- `outputLabel` remains the raw input label.
- `changed` remains `false`.
- `matched` returns a `canonicalCandidate` for review only.
- `unmatched` returns no candidate.
- `ambiguous` returns no candidate and remains review-only.
- `blocked` returns no candidate and remains review-only.

## Not Approved

This scaffold does not approve:

- turning the flag on in production
- connecting the wrapper to runtime/scoring surfaces
- changing final score calculation
- creating product label rows
- adding or running migrations
- Supabase write/apply/rollback
- automatic canonical safety scoring

## Next Step

The next safe PR may add an audit that searches current runtime/scoring entry points and identifies the exact minimal call site for a future flag-off integration.

Actual runtime/scoring integration, score changes, production data changes, or enabling the flag require explicit owner approval.