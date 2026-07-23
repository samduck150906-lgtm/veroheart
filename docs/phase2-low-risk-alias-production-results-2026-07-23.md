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

## Post-Apply Preflight

```json
[
  {
    "section": "phase2_alias_production_preflight",
    "severity": "PASS",
    "analysis_marker_exact_count": 1,
    "analysis_marker_conflict_count": 0,
    "expected_canonical_count": 14,
    "existing_marker_owned_canonical_count": 14,
    "marker_owned_canonical_mismatch_count": 0,
    "preexisting_unmarked_canonical_count": 0,
    "expected_alias_count": 30,
    "existing_marker_owned_alias_count": 30,
    "marker_owned_alias_mismatch_count": 0,
    "preexisting_alias_conflict_count": 0,
    "forbidden_related_row_count": "0",
    "final_assessment": "PRODUCTION_PREFLIGHT_READY"
  }
]
```

Conclusion:
- The production marker exists exactly once.
- 14 marker-owned canonical rows exist.
- 30 marker-owned alias rows exist.
- No canonical mismatch.
- No alias mismatch.
- No preexisting unmarked canonical conflict.
- No preexisting alias conflict.
- No forbidden related rows.
- Apply was not re-run.

## Verify After Apply

```json
[
  {
    "section": "phase2_alias_production_verify",
    "severity": "PASS",
    "analysis_marker_exact_count": 1,
    "analysis_marker_conflict_count": 0,
    "expected_canonical_count": 14,
    "canonical_found_count": 14,
    "marker_owned_canonical_mismatch_count": 0,
    "expected_alias_count": 30,
    "alias_found_count": 30,
    "marker_owned_alias_mismatch_count": 0,
    "excluded_found_count": 0,
    "preexisting_unmarked_canonical_count": 0,
    "forbidden_related_row_count": "0",
    "final_assessment": "PRODUCTION_ALIAS_SEED_VERIFIED"
  }
]
```

Conclusion:
- Production seed was verified successfully.
- 14 canonical rows verified.
- 30 alias rows verified.
- Excluded candidates were not inserted.
- No risk/allergen/evidence/product-label/review-queue side effects were detected by verify.
- Runtime/scoring behavior remains unchanged.

## Rollback

- Rollback was not run.
- Rollback was not needed because verify passed.
- The rollback SQL remains available from PR #24 only for explicitly approved recovery scenarios.

## Final Assessment

```text
Phase 2 low-risk alias production preflight: PASS
Phase 2 low-risk alias production apply: completed, with SQL Editor temp relation error noted
Phase 2 low-risk alias post-apply preflight: PASS
Phase 2 low-risk alias production verify: PASS
Production canonical seed rows: 14
Production alias seed rows: 30
Excluded candidates inserted: 0
Forbidden related rows: 0
Rollback: not run
Final assessment: PRODUCTION_ALIAS_SEED_VERIFIED
```

## Follow-Up Note

- Future manual SQLs should avoid relying on session-scoped temporary tables in Supabase SQL Editor if execution/session behavior is ambiguous.
- Prefer CTE-only read SQL for verification and consider a future hardening PR for write SQL ergonomics if needed.
- No urgent rollback is indicated because post-apply preflight and verify both passed.

## Execution Notes

- This document records operator-provided production execution context, the provided pre-apply preflight result, the provided apply error, the provided post-apply preflight result, and the provided verify result.
- This documentation PR did not run Supabase, did not execute SQL, and did not inspect production data.
- This documentation PR does not create a migration, rollback PR, SQL file, or application behavior change.
- This documentation PR does not include secrets, credentials, URLs, access tokens, or `.env` values.

## Production Boundaries

- PR #24 added production candidate SQL/runbook/test only.
- This result document does not authorize additional production writes.
- This result document does not authorize rollback execution.
- Any future production change must use a separate reviewed PR, explicit approval, backup/PITR confirmation, and documented verification steps.
