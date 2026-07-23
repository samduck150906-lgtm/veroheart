# Phase 2 Low-Risk Alias Production Results

## Scope

- Production execution result for Phase 2 low-risk canonical ingredient alias seed.
- Source PR: #24
- Source merge commit: `1bec87bd1c902e4477d3c4beb7d02763b44a8bb2`
- Production project ref confirmed by operator: `nlutpmjloryqdomgbqrr`
- Backup/PITR confirmed by operator.
- Explicit human approval recorded before apply:

  ```text
  운영 PR #24 apply 실행 승인. production ref nlutpmjloryqdomgbqrr 확인했고 backup/PITR 확인함.
  ```

- Seed scope:
  - 14 canonical ingredient rows
  - 30 Korean alias rows
  - `analysis_engine_versions` marker
- No risk rules.
- No allergen mappings.
- No ingredient evidence.
- No product label sets/items.
- No review queue rows.
- No runtime/scoring/Edge Function changes.

## Preflight Before Apply

```json
[
  {
    "section": "phase2_alias_production_preflight",
    "severity": "PASS",
    "analysis_marker_exact_count": 0,
    "analysis_marker_conflict_count": 0,
    "expected_canonical_count": 14,
    "existing_marker_owned_canonical_count": 0,
    "marker_owned_canonical_mismatch_count": 0,
    "preexisting_unmarked_canonical_count": 0,
    "expected_alias_count": 30,
    "existing_marker_owned_alias_count": 0,
    "marker_owned_alias_mismatch_count": 0,
    "preexisting_alias_conflict_count": 0,
    "forbidden_related_row_count": "0",
    "final_assessment": "PRODUCTION_PREFLIGHT_READY"
  }
]
```

## Apply Execution

- Apply was explicitly approved by the operator.
- The production ref and backup/PITR were confirmed before apply.
- The guarded apply SQL from PR #24 was used.
- The SQL included production confirmation settings in the same SQL session.
- The SQL Editor returned this error after execution:

  ```text
  ERROR: 42P01: relation "phase2_alias_production_approved_canonical_candidates" does not exist
  ```

## Post-Apply Preflight Result

- The post-apply preflight output was not included in the operator-provided data available to this documentation update.
- This documentation PR did not run Supabase, did not execute SQL, and did not query production to fill in missing values.
- Any post-apply preflight table should be recorded from the operator's saved SQL Editor output in a follow-up documentation update.

## Verify Result

- The production verify output was not included in the operator-provided data available to this documentation update.
- This documentation PR did not run the verify SQL and does not infer verification status from the apply error.
- Production verification should be treated as not documented here until the operator-provided verify result is recorded.

## Rollback Status

- No rollback PR was created by this documentation update.
- No rollback SQL was run by this documentation update.
- The rollback execution status was not included in the operator-provided data available to this documentation update.
- Rollback status should be recorded only from explicit operator-provided rollback output.

## Final Assessment

- The initial production preflight before apply passed with `PRODUCTION_PREFLIGHT_READY`.
- The apply attempt returned PostgreSQL error `42P01` for missing relation `phase2_alias_production_approved_canonical_candidates`.
- Because post-apply preflight, verify, and rollback outputs were not provided to this documentation update, this document does not mark the production seed as verified.
- Current documented assessment: `PRODUCTION_APPLY_ERROR_REQUIRES_REVIEW`.

## Follow-Up Note

- Review why the guarded apply SQL referenced `phase2_alias_production_approved_canonical_candidates` outside its available statement scope.
- Do not run additional production SQL from this result document alone.
- Any fix, retry, verification, or rollback plan must use a separate reviewed PR or an explicitly approved operator procedure.
- Preserve saved SQL Editor outputs for post-apply preflight, verify, and rollback if they were run separately.

## Execution Notes

- This document records operator-provided production execution context, the provided pre-apply preflight result, and the provided apply error.
- This documentation PR did not run Supabase, did not execute SQL, and did not inspect production data.
- This documentation PR does not create a migration, rollback PR, SQL file, or application behavior change.
- This documentation PR does not include secrets, credentials, URLs, access tokens, or `.env` values.

## Production Boundaries

- PR #24 added production candidate SQL/runbook/test only.
- This result document does not authorize additional production writes.
- This result document does not authorize rollback execution.
- Any future production change must use a separate reviewed PR, explicit approval, backup/PITR confirmation, and documented verification steps.
