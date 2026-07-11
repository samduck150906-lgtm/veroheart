# Phase 2-3 Alias Sandbox Rehearsal Runbook

This kit is sandbox-only. Do not run it on production.

Production project ref `nlutpmjloryqdomgbqrr` is explicitly forbidden for these SQL files. Use a disposable or dedicated sandbox Supabase project only.

This PR is not production migration approval. It only prepares a manual rehearsal for the 14 approved low-risk alias candidates from PR #20.

## Scope

Included:

- 14 approved low-risk alias candidate groups.
- Sandbox-only canonical ingredient rows.
- Sandbox-only canonical alias rows.
- Sandbox-only `analysis_engine_versions` marker.
- Verify and rollback scripts.

Excluded:

- Operating production Supabase access.
- Production SQL execution.
- Runtime, scoring, or Edge Function changes.
- Risk rules.
- Allergen mappings.
- Product label sets or product label items.
- Animal/allergen/additive/risk candidates outside the approved 14.

## Execution Order

1. Confirm the sandbox project ref.
   - Stop if the project ref is `nlutpmjloryqdomgbqrr`.
   - Do not set the rehearsal confirmation setting in production.
2. Confirm Phase 1 canonical schema exists in the sandbox.
   - Required tables include `canonical_ingredients`, `canonical_ingredient_aliases`, and `analysis_engine_versions`.
3. In the same SQL session where you will run rehearsal or rollback, set the sandbox-only confirmation after checking the project ref:

   ```sql
   SET app.phase2_alias_sandbox_rehearsal_confirm = 'SANDBOX_ONLY_CONFIRMED_NOT_PRODUCTION';
   ```

   Never run this `SET` command in production project `nlutpmjloryqdomgbqrr`.
4. Run:

   ```text
   supabase/tests/manual/phase2_alias_sandbox_rehearsal.sql
   ```

5. Run:

   ```text
   supabase/tests/manual/phase2_alias_sandbox_verify.sql
   ```

6. Save the result table as CSV or text.
7. If the sandbox needs cleanup, keep the same sandbox-confirmed SQL session or repeat step 3 in a new sandbox session, then run:

   ```text
   supabase/tests/manual/phase2_alias_sandbox_rollback.sql
   ```

8. Optionally rerun verify after rollback to confirm the sandbox state.

## Expected Rehearsal Result

- Expected canonical count: 14.
- Expected alias count: 30.
- Excluded candidate count: 10.
- Final rehearsal assessment should be `SANDBOX_REHEARSAL_READY_FOR_VERIFY` when counts match.

## Expected Verify Result

Final verify assessment should be `SANDBOX_REHEARSAL_VERIFIED`.

If the verify result is `SANDBOX_REHEARSAL_FAILED`, stop and inspect the failing rows. Do not use the rehearsal results as migration input.

## Rollback Notes

Rollback is marker-based. It removes rows marked as `phase2_low_risk_alias_rehearsal` and leaves unmarked existing sandbox rows alone.

The rehearsal SQL does not attach aliases to unmarked preexisting canonical rows. If a sandbox already has matching canonical rows without the rehearsal marker, rehearsal should return `SANDBOX_REHEARSAL_REVIEW_REQUIRED` and stop before alias insertion.

If rollback sees unmarked existing rows, it leaves those rows untouched by design.

## Production Gate

Before any future production migration:

- Create a separate PR.
- Confirm backup/PITR.
- Record explicit approval.
- Review sandbox rehearsal output.
- Keep runtime/scoring/Edge Function changes separate unless explicitly approved.

Merging this PR does not approve production migration.
