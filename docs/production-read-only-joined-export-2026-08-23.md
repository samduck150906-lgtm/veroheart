# Production read-only joined export — 2026-08-23

## Purpose

This packet turns the physical production schema boundary into one reproducible, SELECT-only export shape that can be copied from Supabase and analyzed offline by the existing Veroheart harness.

The export intentionally joins only:

- `public.products`
- `public.product_ingredients`
- `public.ingredients`

It does not query pets, users, reviews, settings, analysis reports, or any private/user-scoped table.

## Selected source fields

The export returns product identity, product category/species target, ingredient link/order, and ingredient name/risk fields. The TypeScript parser then deduplicates the denormalized rows and maps them through the physical-column contract introduced in PR #92.

A product with no linked ingredient still appears because the query uses `LEFT JOIN`. That lets the report distinguish “product exists but ingredient data is missing” from “product was not exported.”

## Derived signals stay outside SQL

The query does not calculate allergy hits, caution classes, score, display score, or ranking in SQL. Those are policy/runtime-derived values and are deliberately computed by the repository analysis code after export.

That keeps the database as source data and prevents the read-only query from becoming a second scoring implementation.

## Guardrails

`productionReadOnlyJoinedExport.test.ts` strips comments from the SQL text and requires the executable body to:

1. start with `SELECT`,
2. contain only one statement,
3. contain none of the guarded mutation/DDL/transaction keywords,
4. reference only the expected public source tables/columns.

The parser is pure and imports no Supabase client. Nothing in this PR executes the SQL or changes production rows.

## Next safe step

Use the adapter rows to build profile-specific derived signals for a fixed synthetic allergy profile matrix (`닭`, `오리`, `칠면조`, `가금류`) and feed those snapshots into the existing impact-diff harness. Actual production export execution remains separate from this repository-only preparation.
