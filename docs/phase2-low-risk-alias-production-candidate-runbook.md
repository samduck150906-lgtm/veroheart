# Phase 2 Low-Risk Alias Production Candidate Runbook

This PR prepares reviewable production candidate SQL only. Merging this PR does not approve production execution.

Do not run `apply` or `rollback` until explicit human approval is recorded.

## Scope

- 14 approved low-risk canonical ingredient groups.
- 30 approved Korean aliases.
- Canonical and alias seed only.
- No production migration file.
- No runtime/scoring/Edge Function changes.
- No risk rules.
- No allergen mappings.
- No ingredient evidence.
- No product label sets/items.
- No review queue rows.

## Production Marker

The candidate SQL uses this marker:

- `canonical_ingredients.category = 'phase2_low_risk_alias_seed_2026_07_12'`
- `canonical_ingredients.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'`
- `canonical_ingredients.status = 'draft'`

The `analysis_engine_versions` marker is:

- `version = 'phase2-low-risk-alias-seed-2026-07-12'`
- `status = 'draft'`
- `description = 'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'`
- `ruleset_checksum = 'phase2-low-risk-alias-seed-2026-07-12'`

## Required Confirmation

Before any approved production apply or rollback, confirm in the Supabase UI that the project ref is exactly `nlutpmjloryqdomgbqrr`.

Only after the production project ref, backup/PITR, and explicit approval are confirmed, set both values in the same SQL session:

```sql
SET app.phase2_alias_production_project_ref_confirm = 'nlutpmjloryqdomgbqrr';
SET app.phase2_alias_production_migration_confirm = 'PRODUCTION_ALIAS_MIGRATION_EXPLICITLY_APPROVED';
```

The SQL files do not set these values internally.

## Execution Order

1. Run `supabase/tests/manual/phase2_alias_production_preflight.sql`.
2. Stop unless preflight returns `PRODUCTION_PREFLIGHT_READY`.
3. Record explicit human approval.
4. Confirm backup/PITR.
5. Confirm production project ref `nlutpmjloryqdomgbqrr` in Supabase UI.
6. Set both confirmation settings in the same SQL session.
7. Run `supabase/tests/manual/phase2_alias_production_apply_candidate.sql`.
8. Stop unless apply returns `PRODUCTION_ALIAS_SEED_READY_FOR_VERIFY`.
9. Run `supabase/tests/manual/phase2_alias_production_verify_candidate.sql`.
10. Save all result output.
11. Run `supabase/tests/manual/phase2_alias_production_rollback_candidate.sql` only if rollback is needed and still explicitly approved.

## Expected PASS Output

Preflight should return:

```text
section: phase2_alias_production_preflight
severity: PASS
analysis_marker_exact_count: 0 or 1
analysis_marker_conflict_count: 0
expected_canonical_count: 14
existing_marker_owned_canonical_count: 0 or 14
marker_owned_canonical_mismatch_count: 0
preexisting_unmarked_canonical_count: 0
expected_alias_count: 30
existing_marker_owned_alias_count: 0 or 30
marker_owned_alias_mismatch_count: 0
preexisting_alias_conflict_count: 0
forbidden_related_row_count: 0
final_assessment: PRODUCTION_PREFLIGHT_READY
```

Apply should return:

```text
section: phase2_alias_production_apply
severity: PASS
analysis_marker_exact_count: 1
analysis_marker_conflict_count: 0
expected_canonical_count: 14
inserted_or_available_canonical_count: 14
marker_owned_canonical_mismatch_count: 0
expected_alias_count: 30
inserted_or_available_alias_count: 30
marker_owned_alias_mismatch_count: 0
preexisting_unmarked_canonical_count: 0
preexisting_alias_conflict_count: 0
final_assessment: PRODUCTION_ALIAS_SEED_READY_FOR_VERIFY
```

Verify should return:

```text
section: phase2_alias_production_verify
severity: PASS
analysis_marker_exact_count: 1
analysis_marker_conflict_count: 0
expected_canonical_count: 14
canonical_found_count: 14
marker_owned_canonical_mismatch_count: 0
expected_alias_count: 30
alias_found_count: 30
marker_owned_alias_mismatch_count: 0
final_assessment: PRODUCTION_ALIAS_SEED_VERIFIED
```

Rollback, if explicitly approved and needed, should return:

```text
section: phase2_alias_production_rollback
severity: PASS
analysis_marker_conflict_count: 0
non_seed_marker_owned_alias_count: 0
remaining_marker_owned_canonical_count: 0
final_assessment: PRODUCTION_ALIAS_SEED_ROLLED_BACK
```

## Stop Conditions

Stop immediately if any of these occur:

- Any result has `severity = BLOCK`.
- Any count differs from the expected count.
- Any unmarked canonical conflict exists.
- Any alias conflict exists.
- Any analysis marker conflict exists.
- Any marker-owned canonical mismatch exists.
- Any marker-owned alias mismatch exists.
- Any non-seed marker-owned alias exists during rollback.
- Any forbidden related row exists.
- Any output suggests runtime/scoring behavior would change.

Runtime/scoring remains unchanged by this candidate SQL.
