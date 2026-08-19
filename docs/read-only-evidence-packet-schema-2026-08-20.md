# Read-Only Evidence Packet Schema — 2026-08-20

## Purpose

This document defines the final evidence packet shape for the Veroheart production read-only reporting harness.

The packet is meant to distinguish:

- fixture-generated evidence
- production read-only evidence attached later
- behavior-impacting output that requires owner approval
- blocked output
- operationally unsafe output

This PR does not attach real production data.

## Packet Inputs

A packet combines:

1. template guard output
2. read-only impact dry-run output
3. source metadata
4. execution state metadata
5. gate decision metadata
6. operational safety flags

## Source Types

| source | meaning |
|---|---|
| fixture | generated from fixture rows only |
| production_read_only | generated from production read-only rows attached outside app runtime |

## Execution States

| executionState | meaning |
|---|---|
| not_executed | no row evidence has been attached |
| fixture_generated | fixture evidence was generated |
| read_only_result_attached | read-only result rows were attached to the packet |

## Required Summary Fields

The packet summary includes:

- validTemplateShapes
- invalidTemplateShapes
- productsCompared
- allergyHitChangedProducts
- scoreChangedProducts
- displayChangedProducts
- rankingChangedProducts
- missingJoinOrSignalWarnings
- gateDecision
- requiresOwnerApproval
- blocked

## Approval Boundary

The packet does not hide behavior-changing output.

If allergy hit, score, display verdict, or ranking changes are reported by the harness gate, the packet summary must expose `gateDecision: approval_required` and `requiresOwnerApproval: true`.

Blocked output must expose `blocked: true`.

## Safety Boundary

The packet explicitly keeps these false:

- executesSql
- usesSupabaseClient
- mutatesProductionRows
- changesRuntimeScoreLogic
- changesUi
- changesEnvOrDeploy
- appRuntimeApproved
- productionWriteApproved

The packet provenance also keeps these false:

- productionWriteDerived
- sqlExecutionIncluded
- appRuntimeIncluded

## Not Approved

This schema does not approve:

- SQL execution
- Supabase client access
- production writes
- migrations
- runtime score changes
- UI changes
- env, secret, URL, token, or deploy changes
- app runtime usage

## Next Step

The next safe step is a packet export fixture that serializes the evidence packet into a stable JSON-like review artifact shape for humans and future agents.

Actual production read attachment remains a separate checkpoint because it uses real production data, even if read-only.
