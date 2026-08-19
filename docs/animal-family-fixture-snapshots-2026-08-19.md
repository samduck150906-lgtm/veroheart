# Animal Family Fixture Snapshots — 2026-08-19

## Purpose

This document adds representative animal-family fixture snapshots to the Veroheart harness track.

The goal is to keep checking the original normalization problem across animal sources, not only chicken.

The fixture set covers:

- chicken
- beef
- pork
- duck
- lamb
- turkey
- fish
- egg

It also includes adjacent forms:

- fresh named meat
- named meal
- named organ
- named fat
- fish-source oil
- egg part
- poultry byproduct review
- unknown animal byproduct negative guard

## Harness role

The helper builds two snapshots:

1. baseline snapshot: approximate pre-family-aware text-only behavior
2. candidate snapshot: current runtime matcher behavior

The snapshots are passed to the animal ingredient impact diff harness.

The output reports:

- allergy-hit deltas
- score deltas
- display-score deltas
- ranking-position deltas
- harness gate decision

## Expected result

Behavior-changing rows should not be treated as automatically safe.

When allergy hits, scores, display verdicts, or ranking positions change, the shared harness gate should return `approval_required`.

## Safety

This PR does not change product data, scoring code, allergy matcher code, UI, Supabase, SQL, migrations, env, deploy, or runtime flags.

It adds fixture snapshots and tests only.

## Next loop

The next safe step is a production-read-only report plan that maps real Supabase product ingredient rows into this snapshot shape.

That step should still avoid writes, migrations, env changes, and deployment.
