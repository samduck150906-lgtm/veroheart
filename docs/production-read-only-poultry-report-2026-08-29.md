# Production read-only poultry report — 2026-08-29

## Purpose

This composition layer accepts the JSON result copied from the approved SELECT-only Supabase export and runs the existing repository pipeline in one call:

`joined export JSON → physical rows → adapter rows → current-policy signal matrix → impact summary`

It does not add another allergy matcher, scoring formula, or report policy. Each derived result still comes from the already-merged runtime matcher and score helpers through the signal matrix.

## Accepted input

The parser accepts either:

- a copied JSON row array, or
- an API-style `{ "data": [...] }` envelope.

Every row must preserve the physical aliases emitted by `supabase/tests/manual/production_read_only_poultry_impact_export.sql`. Malformed rows are rejected with their array index; the parser does not invent missing product identities or coerce invalid production values.

## Output

The composed report keeps all three review layers:

- joined-export counts and data integrity signals,
- the product × four-profile current-policy signal matrix,
- the compact per-profile affected-product summary and readiness warnings.

## Safety boundary

This code only consumes already-exported JSON in memory. It does not execute SQL, initialize a Supabase client, access production by itself, write any row, modify matcher/scoring/runtime behavior, authorize a production change, run a migration, or alter environment/deployment configuration.

The real production JSON remains a separate input and review checkpoint.
