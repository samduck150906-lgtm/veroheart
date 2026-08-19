# Read-Only Evidence Packet Index Fixture — 2026-08-20

## Purpose

This fixture groups multiple read-only evidence packets into a single review index.

The index exists to reduce owner interruption. Safe packets stay out of the owner-attention queue, while approval-required and blocked packets are surfaced explicitly.

## Index Queues

The index maintains five queues:

- safe packet ids
- approval-required packet ids
- blocked packet ids
- owner-attention packet ids
- operational-safety-violation packet ids

Owner attention is required only when a packet is approval-required, blocked, or violates the read-only operational safety contract.

## Fixture Cases

The routing fixture contains three packet states:

1. `fixture-safe-no-visible-diff`
   - gate: safe
   - owner attention: no

2. `fixture-visible-allergy-score-diff`
   - gate: approval_required
   - owner attention: yes
   - preserves approval reasons for allergy-hit, score, display verdict, and ranking changes

3. `fixture-unsafe-semantic-collapse`
   - gate: blocked
   - owner attention: yes
   - represents the semantic rule that generic or unknown animal byproduct must not be collapsed into a named ordinary meat source

These three packets are routing fixtures. They test index/gate behavior and are not production evidence.

## Operational Safety

A semantic block is distinct from an operational safety violation.

A packet can be blocked because its proposed meaning is unsafe while the evidence artifact itself remains fully read-only and non-operational.

This PR does not:

- access Supabase
- execute SQL
- mutate production rows
- change score runtime logic
- change UI
- change env or deploy settings
- approve app runtime use
- approve production writes

## Harness Meaning

The intended review flow is now:

`evidence packets -> index -> safe queue OR owner-attention queue`

This lets safe harness work continue without repeatedly interrupting the owner while preserving a hard stop for visible behavior changes, semantic safety blocks, and operational mutations.

## Next Step

The next safe step is an owner-attention review summary fixture that converts only the indexed approval-required and blocked entries into a compact review brief. That brief should omit safe packets by default and preserve the exact approval or blocked reason for each surfaced item.
