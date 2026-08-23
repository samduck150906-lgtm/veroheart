# Production read-only poultry impact summary — 2026-08-23

## Purpose

This reporting layer turns the product × synthetic-profile signal matrix into a compact review packet a human can inspect after a real read-only production export is supplied.

For each fixed profile (`닭`, `오리`, `칠면조`, `가금류`) it reports:

- number of products evaluated,
- scoreable vs data-incomplete products,
- HARD products,
- caution-only products,
- scoreable products with no poultry signal,
- average and maximum caution penalty,
- an affected-product review list with HARD items first, then caution items ordered by penalty.

## Data-quality gate

The report does not call incomplete source data “safe” or “unaffected.” It sets `reportReady=false` and emits warnings when the matrix finds:

- products with no ingredient links,
- product-ingredient links whose ingredient row is missing,
- invalid/missing `risk_level`,
- any resulting matrix row whose score cannot be computed.

This is a report-readiness gate only. `reportReady=true` does not authorize a runtime, production, or policy change.

## Empty exports

Even an empty export preserves four distinct profile sections. This avoids accidentally collapsing the report to a default chicken profile when there are no rows.

## Safety boundary

This layer consumes an already-built in-memory matrix. It does not execute SQL, read Supabase directly, write data, modify matcher/scoring policy, change UI, alter ranking behavior, run a migration, or change environment/deployment configuration.

After this merge, the repository-side read-only pipeline is complete enough to accept a real export:

`SELECT-only export → physical-column map → joined-row parser → current-policy signal matrix → review summary`.
