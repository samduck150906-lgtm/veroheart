# Phase 2 Alias Resolver Dry-Run Results - 2026-07-23

## Scope

- Documentation-only record of the Phase 2 alias resolver dry-run result.
- Source dry-run kit: PR #26
- PR #26 merge commit: `858d7969870f7f522d15dc6a8e60c4e53f6dfe6c`
- SQL run by operator: `supabase/tests/manual/phase2_alias_resolver_dry_run.sql`
- SQL type: read-only SELECT/CTE dry-run.
- No apply/write/rollback SQL was run.
- No production data was changed by this documentation update.
- No runtime/scoring/Edge Function behavior is approved or changed by this result.

## Seed Summary

```text
section: seed_summary
canonical_seed_count: 14
alias_seed_count: 30
final_assessment: DRY_RUN_READY
```

## Dry-Run Assessment

```text
section: dry_run_assessment
severity: PASS
metric_name: DRY_RUN_ASSESSMENT
metric_value: DRY_RUN_READY
alias_seed_count: 30
canonical_seed_count: 14
ambiguous_mapping_count: 0
exact_alias_match_count: 66
matched_legacy_ingredient_count: 30
unmatched_legacy_ingredient_count: 509
dangerous_or_excluded_collision_count: 0
```

## Collision And Ambiguity Checks

```text
dangerous_or_excluded_collision_count: 0
ambiguous_mapping_count: 0
```

## Interpretation

- The dry-run found exact normalized matches for seeded low-risk aliases.
- No dangerous/excluded candidate collided with the seeded aliases or canonical keys.
- No ambiguous exact normalized mapping was detected.
- Unmatched legacy ingredient rows remain review-only and must not be inferred semantically.
- The result does not approve runtime/scoring integration.
- The result does not change production data.
- The result does not create product label rows.
- The result should be used only as review input for a future resolver integration PR.

## Review-Only Unmatched Examples

The following terms correctly remained unmatched and must stay review-only unless a later reviewed policy explicitly handles them:

- 닭고기
- 닭고기 분말
- 닭지방
- 닭 지방
- 동물성 지방
- 소르빈산 칼륨
- 소르빈산칼륨
- 닭간
- 향미증진제

## Follow-Up Boundary

- A future resolver integration PR must separately define runtime behavior, safety checks, tests, and rollback or disable strategy.
- This result document alone must not be used to connect canonical aliases to scoring or product analysis.
- Any future runtime/scoring integration remains unapproved until explicitly reviewed.
