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

## Execution Notes

- This document records operator-provided production execution context and the provided pre-apply preflight result.
- This documentation PR did not run Supabase, did not execute SQL, and did not inspect production data.
- This documentation PR does not create a migration, rollback PR, SQL file, or application behavior change.
- This documentation PR does not include secrets, credentials, URLs, access tokens, or `.env` values.

## Production Boundaries

- PR #24 added production candidate SQL/runbook/test only.
- This result document does not authorize additional production writes.
- This result document does not authorize rollback execution.
- Any future production change must use a separate reviewed PR, explicit approval, backup/PITR confirmation, and documented verification steps.
