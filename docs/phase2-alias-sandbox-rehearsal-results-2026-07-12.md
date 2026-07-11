# Phase 2-3 Alias Sandbox Rehearsal Results - 2026-07-12

## Scope

- Sandbox-only rehearsal for the 14 approved low-risk alias candidates.
- No production migration.
- No runtime/scoring/Edge Function changes.
- No risk rules.
- No allergen mappings.
- No product label sets/items.
- No review queue inserts.
- No manual alias completion.
- Rollback performed after successful verification.

## Source SQL

- Fixed SQL source: PR #22 merged commit `04b494b3b81cb1bbefebeb6463b9a62ca42cf8c1`.
- Files used:
  - `supabase/tests/manual/phase2_alias_sandbox_rehearsal.sql`
  - `supabase/tests/manual/phase2_alias_sandbox_verify.sql`
  - `supabase/tests/manual/phase2_alias_sandbox_rollback.sql`
- SQL files required:

  ```sql
  current_setting('app.phase2_alias_sandbox_rehearsal_confirm', true)
  =
  'SANDBOX_ONLY_CONFIRMED_NOT_PRODUCTION'
  ```

- SQL files did not set this confirmation internally.

## Preconditions

- Phase 1 sandbox schema existed.
- Required canonical tables existed:
  - `canonical_ingredients`
  - `canonical_ingredient_aliases`
  - `analysis_engine_versions`
- Previous partial PR #21 rehearsal state had been rolled back.
- Sandbox, not production, was used.
- Production project ref `nlutpmjloryqdomgbqrr` remained forbidden.

## Rehearsal Result

```text
section: phase2_alias_sandbox_rehearsal
severity: PASS
expected_canonical_count: 14
inserted_or_available_canonical_count: 14
expected_alias_count: 30
inserted_or_available_alias_count: 30
preexisting_unmarked_canonical_count: 0
excluded_candidate_count: 10
final_assessment: SANDBOX_REHEARSAL_READY_FOR_VERIFY
```

## Verify Result

```text
section: phase2_alias_sandbox_verify
severity: PASS
expected_canonical_count: 14
canonical_found_count: 14
expected_alias_count: 30
alias_found_count: 30
excluded_found_count: 0
preexisting_unmarked_canonical_count: 0
forbidden_related_row_count: 0
final_assessment: SANDBOX_REHEARSAL_VERIFIED
```

Note: Supabase displayed `forbidden_related_row_count` as the string `"0"`; it was interpreted as numeric zero.

## Rollback Result

```text
section: phase2_alias_sandbox_rollback
severity: PASS
deleted_alias_count: 30
deleted_canonical_count: 14
deleted_marker_count: 1
remaining_marked_canonical_count: 0
final_assessment: SANDBOX_REHEARSAL_ROLLED_BACK
```

## Conclusion

- Sandbox rehearsal passed.
- Verification passed.
- Rollback passed.
- Sandbox rehearsal rows were cleaned up.
- This supports planning a future production migration PR, but does not approve or execute production migration.

## Production Gate

Before any production migration:

- Create a separate PR.
- Use reviewed production SQL only.
- Confirm backup/PITR.
- Confirm exact production project ref.
- Record explicit human approval.
- Run no runtime/scoring changes in the same PR unless explicitly approved.
- Keep rollback and verification steps documented.
- Do not proceed from this result document alone.
