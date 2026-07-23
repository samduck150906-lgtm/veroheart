# Phase 2 Alias Resolver Integration Contract

## Purpose

This document defines the safety contract for a future Phase 2 alias resolver integration.

It follows the completed Phase 2 low-risk alias production seed, resolver dry-run kit, and dry-run result documentation.

This document is intentionally design-only. It does not change runtime behavior, scoring, production data, Supabase SQL, migrations, Edge Functions, environment variables, or secrets.

## Current Verified State

- Phase 2 low-risk alias production seed: verified in production.
- Seeded canonical ingredients: 14.
- Seeded aliases: 30.
- Excluded candidate rows inserted: 0.
- Forbidden related rows: 0.
- Production result documentation: PR #25.
- Alias resolver dry-run kit: PR #26.
- Alias resolver dry-run result documentation: PR #27.
- Dry-run final assessment: `DRY_RUN_READY`.
- Dry-run exact alias match count: 66.
- Dry-run matched legacy ingredient count: 30.
- Dry-run unmatched legacy ingredient count: 509.
- Dangerous/excluded collision count: 0.
- Ambiguous mapping count: 0.

## Non-Goals

The next resolver integration must not be treated as a scoring rollout by default.

Out of scope for the first implementation PR:

- Changing ingredient risk levels.
- Changing product scores.
- Changing allergy logic.
- Creating or modifying production rows.
- Creating or modifying `product_ingredient_label_sets` or `product_ingredient_label_items` in production.
- Automatically accepting unmatched legacy ingredients.
- Inferring semantic matches.
- Fuzzy matching.
- Substring-only matching.
- Connecting dangerous or excluded terms to low-risk aliases.
- Enabling runtime/scoring behavior without a separate reviewed switch.

## Resolver Contract

A future resolver helper may classify one input ingredient label into one of these statuses:

- `matched`: exactly one seeded canonical alias matches by exact normalized key.
- `ambiguous`: more than one seeded canonical candidate matches the same normalized key.
- `unmatched`: no seeded canonical alias matches.
- `blocked`: the normalized key collides with an explicitly excluded/dangerous term.

The resolver must be deterministic.

The resolver must never default an unknown input to safe.

The resolver must never convert `unmatched`, `ambiguous`, or `blocked` into a scoring-safe result.

## Normalization Contract

The first integration should use the same conservative normalization style as the dry-run:

- lowercase text;
- remove whitespace;
- remove common punctuation;
- compare exact normalized keys only.

Allowed comparison:

```text
normalized_input === normalized_alias
```

Disallowed comparison:

```text
normalized_input includes normalized_alias
normalized_alias includes normalized_input
LIKE '%...%'
ILIKE '%...%'
fuzzy score above threshold
semantic similarity
```

## Seed Scope Contract

The first runtime resolver must only read aliases connected to the verified Phase 2 low-risk seed marker.

Required canonical filters:

```text
canonical_ingredients.category = 'phase2_low_risk_alias_seed_2026_07_12'
canonical_ingredients.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
canonical_ingredients.status = 'draft'
```

Required alias filters:

```text
canonical_ingredient_aliases.language_code = 'ko'
canonical_ingredient_aliases.alias_type = 'label'
```

The resolver must not read unrelated canonical ingredients until a later reviewed phase explicitly expands the scope.

## Excluded/Dangerous Guard Contract

The following terms must remain explicit blockers or review-only in the first integration:

- 닭간
- 닭간분말
- 닭연골
- 닭지방
- 동물성지방
- 소르빈산칼륨
- 증점다당류
- 천연색소
- 프로필렌글리콜
- 향미증진제

The dry-run result recorded collision count 0 for these terms against the seeded aliases/canonical keys, but runtime code must still guard against accidental future expansion.

## Runtime Integration Boundary

The first code PR should add a resolver helper and tests without changing production scoring behavior.

Allowed in the first code PR:

- A pure resolver helper.
- Unit tests for exact normalized matching.
- Unit tests for ambiguous and blocked statuses.
- Fixture data representing the 14 canonical / 30 alias seed.
- Documentation updates explaining the resolver remains disabled or read-only.

Not allowed in the first code PR without separate approval:

- Importing the resolver into live product scoring.
- Changing displayed product scores.
- Changing ingredient risk verdicts.
- Writing resolved canonical IDs into production tables.
- Enabling an Edge Function behavior change.
- Adding migrations.
- Adding production apply/rollback SQL.
- Adding secrets or environment variables.

## Feature Flag / Disable Strategy

Before any runtime path uses the resolver, there must be an explicit disable strategy.

Acceptable approaches:

- A compile-time disabled integration path for tests only.
- A feature flag defaulting to off.
- A read-only logging path that does not affect user-visible scoring.

Not acceptable:

- Resolver automatically affects scoring after merge.
- Resolver enabled by default with no fast disable path.
- Resolver behavior tied to undocumented environment values.

## Test Requirements For The First Code PR

The first implementation PR must include tests for:

- exact normalized match succeeds for seeded aliases;
- whitespace and punctuation variants normalize to the same key;
- unmatched inputs stay `unmatched`;
- dangerous/excluded terms return `blocked` or remain review-only;
- ambiguous duplicate aliases return `ambiguous`;
- no substring-only matching;
- no semantic inference;
- no unknown-to-safe fallback;
- no runtime/scoring import if the PR claims to be helper-only.

## Review Gates Before Scoring Integration

Before canonical alias resolution can influence scoring or product analysis, a later PR must separately prove:

1. Resolver unit tests pass.
2. No dangerous/excluded collision exists.
3. Ambiguous mapping count remains 0 or has a reviewed handling path.
4. Unknown/unmatched values go to review/unmatched, not safe.
5. Runtime behavior can be disabled quickly.
6. User-facing score changes are documented with before/after examples.
7. Rollback or disable procedure is documented.
8. The change is explicitly approved as a runtime/scoring integration.

## Recommended Next PR Sequence

### PR #29: Helper-only resolver implementation

Add a pure TypeScript resolver helper and unit tests.

Expected scope:

- No Supabase execution.
- No migrations.
- No SQL writes.
- No runtime/scoring import.
- No user-visible app behavior change.
- Feature path disabled or helper-only.

### PR #30: Resolver integration dry-run in code

Use representative fixtures or non-production examples to show before/after resolver outputs.

Expected scope:

- No production writes.
- No scoring changes.
- No app-facing behavior change.
- Review-only output.

### Later PR: Runtime/scoring integration

Only after the helper and dry-run are reviewed, a separate PR may propose controlled runtime integration.

This later PR must include explicit risk review, tests, disable strategy, and approval before merge.

## Final Boundary

This contract authorizes planning and helper-only implementation work.

It does not authorize production writes, migrations, scoring changes, app behavior changes, Edge Function changes, or enabling canonical alias resolution in the live scoring path.
