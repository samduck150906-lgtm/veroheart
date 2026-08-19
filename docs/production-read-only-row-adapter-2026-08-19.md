# Production Read-Only Row Adapter — 2026-08-19

## Purpose

This document defines how production read-only rows can be shaped into the existing animal ingredient impact diff harness.

This does not connect to Supabase and does not execute SQL.

It only defines the pure adapter contract for rows that have already been read by an explicitly approved read-only reporting step.

## Input rows

The adapter accepts four read-only row groups:

- products
- product ingredient join rows
- ingredient rows
- computed signal rows

Computed signal rows contain already-calculated evidence such as allergy hits, score, display score, and ranking position. The adapter does not recompute score logic and does not mutate product ingredients.

## Output rows

The adapter emits `AnimalIngredientImpactSnapshotRow` rows:

- product id
- product name
- ordered ingredient names
- allergy hits
- score
- display score
- optional ranking position

These rows can be passed to the animal ingredient impact diff harness as either baseline or candidate snapshots.

## Missing joins

Missing signals and missing ingredient joins are summarized, not guessed.

- A missing signal becomes an empty allergy-hit list and 0 score fields in the snapshot row.
- A product-ingredient row pointing at a missing ingredient is counted in the summary.
- Missing ingredient names are not invented.

## Safety

- no Supabase access
- no SQL
- no migration
- no insert/update/upsert/delete
- no RPC mutation
- no env/deploy change
- no product ingredient mutation
- no UI or score logic change

## Next step

The next safe step is a dry fixture that feeds adapter output into the impact diff harness and harness gate.

A real production read requires a separate explicit read-only execution step and must still avoid writes, migrations, env changes, and deploys.
