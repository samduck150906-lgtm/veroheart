# Read-Only Evidence Packet Export Fixture — 2026-08-20

## Purpose

This fixture exports the read-only evidence packet into a stable review artifact shape.

It is meant for humans and future agents to review the same evidence without needing to rerun database reads, SQL, Supabase calls, or app runtime logic.

## What the Artifact Contains

The export fixture includes:

- packet metadata
- source and execution state
- template guard summary
- dry-run impact summary
- harness gate decision
- required owner approval reasons
- blocked reasons
- safety checklist

## Fixture Scenario

The fixture compares three product-shaped rows:

1. a chicken meal row that becomes a chicken-allergy hit
2. an unknown animal byproduct row that remains unchanged
3. an egg white row that becomes an egg-allergy hit

The artifact is expected to report:

- allergy-hit changes: 2 products
- score changes: 2 products
- display changes: 2 products
- ranking changes: 3 products
- gate decision: approval_required

## Safety Boundary

This PR is helper/test/docs only.

It does not:

- execute SQL
- connect to Supabase
- mutate production rows
- change score logic
- change UI
- enable runtime flags
- change env, secrets, URLs, tokens, or deploy settings
- approve app runtime use
- approve production writes

## Next Step

The next safe step is an evidence packet index that can collect multiple fixtures or future read-only result packets and summarize which ones are safe, approval_required, or blocked.

Actual production read execution remains outside this fixture and still requires explicit review before use.
