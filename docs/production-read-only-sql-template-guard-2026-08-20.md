# Production Read-Only SQL Template Guard — 2026-08-20

## Purpose

This guard defines non-executable SELECT-shaped structures for future production read-only reporting.

It intentionally does not store executable SQL strings.

It does not run SQL.

It does not access Supabase.

It does not approve use inside app runtime.

The goal is to keep future read-only reports compatible with the row adapter and impact dry-run harness before any real production read happens.

## Template Scope

The guard covers four adapter inputs:

| dataset | adapter target | required columns |
|---|---|---|
| products | ProductionReadOnlyProductRow | id, name |
| ingredients | ProductionReadOnlyIngredientRow | id, nameKo |
| product_ingredients | ProductionReadOnlyProductIngredientRow | productId, ingredientId, position |
| computed_signals | ProductionReadOnlySignalRow | productId, allergyHits, score, displayScore |

The structures may include optional column names needed for richer reports, such as category, targetPetType, nameEn, riskLevel, and rankingPosition.

## Guard Rules

A shape is valid only when all are true:

- it has selected columns
- it includes the required adapter columns for its dataset
- it contains none of the forbidden mutation or schema-changing terms in its structured fields
- it has the expected limit placeholder
- it is explicitly marked non-executable
- it is not approved for app runtime
- it is not approved for mutation

## Forbidden Terms

The guard rejects shapes containing mutation or schema-changing operation names, including:

- insert
- update
- upsert
- delete
- truncate
- alter table
- create table
- drop table
- create index
- drop index
- grant
- revoke
- security definer
- perform
- call

## Safety Boundary

This PR is helper/test/docs only.

It does not:

- store executable SQL text
- execute SQL
- connect to Supabase
- change score logic
- change UI
- enable a runtime flag
- change env, secrets, URLs, tokens, or deploy settings
- write or migrate production data

## Next Step

The next safe step is a sampled report packet fixture that takes the guarded shapes, fixture selected rows, the row adapter, and the impact dry-run helper and produces one combined non-runtime evidence packet.

Actual production read execution remains outside this PR and should be separately reviewed before use.
