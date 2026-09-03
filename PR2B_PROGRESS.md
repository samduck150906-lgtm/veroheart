# PR2B Progress

## Objective

Harden the canonical health-concern evaluator against missing, partial, inapplicable, and weak evidence without changing runtime score, recommendation behavior, allergy behavior, UI, user-facing copy, data, migrations, environment, or deployment configuration.

## Repository State

- Remote main at task start: `afa18338c8ba6229ea4e37bae131943399f074c0`
- Working branch: `codex/pr2b-evaluator-correctness`
- Current HEAD: `afa18338c8ba6229ea4e37bae131943399f074c0`
- Latest remote branch SHA: `7679b1bab1dd016b1e1bad09ee27ffbda2a81f18`
- Protected reference branch: `codex/pr3-concern-score-integration` at `71e355d7e9253c44be0bdb18a72cee914831cffd`; must remain untouched

## Repository Instructions

- No applicable repository `AGENTS.md` exists in this repository.
- Preserve unrelated work and continuously compare against `origin/main`.
- Do not modify production data, migrations, secrets, environment, deployment, public scoring, recommendation, allergy, UI, or copy behavior.
- Use checkpoint commits beginning with `fix(health):`, targeted tests, `git diff --check`, and remote SHA verification.
- Do not merge this PR.

## Files Inspected

- User continuation brief
- Repository status, worktree list, remote branches, and commits through `afa1833`
- `src/health/concerns.ts` and direct tests
- `src/health/evaluator.ts` and direct tests
- `src/types/index.ts`, `src/analysis/types.ts`, nutrition helpers, adapters, score integration call sites, Search/Profile concern lists, and canonical contract documentation

## Files Changed

- `PR2B_PROGRESS.md` (temporary branch-only recovery record)
- `src/health/evaluator.correctness.test.ts` (expected-failure and passing characterization coverage only)
- `src/health/concerns.ts` (quantitative input provenance contract)
- `src/health/evaluator.ts` (safe declared-value parsing and calculation provenance)
- `src/health/concerns.ts` and `src/health/evaluator.ts` (rule applicability metadata and conservative aggregation)

## Checkpoints

- Completed: repository setup; Checkpoint 1 at `564565c`; Checkpoint 2 at `7679b1b`; Checkpoint 3 applicability and aggregation implementation/validation
- Current: Checkpoint 3 - commit, push, and verify remote SHA
- Remaining: Checkpoints 4 through 6 implementation, validation, cleanup, push, and PR creation

## Decisions

- Use `/private/tmp/veroro-pr2b` as an isolated worktree so existing user changes and the PR3 backup worktree remain untouched.
- The two commits after `9978b37` are admin-auth-only and do not invalidate the evaluator baseline.
- Existing risks confirmed: unsafe null/blank numeric coercion; default 10% moisture; no species/life-stage/product-type/form applicability; pass-plus-unknown aggregation as supported; canonical label replacing original input; evidence ingredients present in concern aliases; substring tag overmatching; combined renal/urinary evidence without an internal domain distinction; weak threshold provenance.
- Checkpoint 1 uses Vitest `it.fails` for desired behavior that current production code does not yet satisfy, keeping the test command green while making each defect executable and visible.
- No active dog-only evaluator threshold exists on main. The required unrelated-species invariant will be covered through the generic applicability implementation in Checkpoint 3 rather than inventing a production dog threshold.
- Checkpoint 2 rejects unsafe coercion and inequality-qualified declarations for comparison. Missing moisture remains unavailable; no estimated moisture fallback is retained.
- Checkpoint 3 uses explicit profile species, profile life stage, product target species, and product category applicability. Product names are not used to infer complete-food status.
- Pass plus unknown becomes `possible` with `partial_quantitative`, partial confidence, and no quantitative score contribution. Confirmed failure takes precedence; all-non-applicable checks produce `not_applicable`.

## Commands And Results

- `find .. -name AGENTS.md -not -path '*/node_modules/*'`: no applicable repository instructions found.
- `git status --short --branch`: primary worktree has unrelated user changes; preserved without modification.
- `git ls-remote --heads origin ...`: main `afa1833`; PR3 backup `71e355d`; no remote PR2B branch.
- Explicit fetch of `origin/main`: succeeded.
- `git worktree add -b codex/pr2b-evaluator-correctness /private/tmp/veroro-pr2b origin/main`: succeeded.
- Bundled `pnpm install --ignore-scripts`: succeeded; generated untracked pnpm metadata was removed and is not part of the checkpoint.
- `vitest run src/health/concerns.test.ts src/health/evaluator.test.ts src/health/evaluator.correctness.test.ts`: 3 files, 72 tests passed (expected-failure characterizations included).
- `git diff --check`: passed.
- Checkpoint 1 commit/push: `564565c`; local and remote SHA matched.
- Checkpoint 2 preflight fetch: `origin/main` remains `afa1833`; no incoming commits.
- Checkpoint 2 targeted tests: 3 files, 74 tests passed.
- Checkpoint 2 TypeScript `tsc -b --pretty false`: passed.
- Checkpoint 2 `git diff --check`: passed.
- Checkpoint 2 commit/push: `7679b1b`; local and remote SHA matched.
- Checkpoint 3 preflight fetch: `origin/main` remains `afa1833`; no incoming commits.
- Checkpoint 3 targeted tests: 3 files, 79 tests passed.
- Checkpoint 3 TypeScript `tsc -b --pretty false`: passed.
- Checkpoint 3 `git diff --check`: passed.

## Known Failures

- Repository-wide lint previously had 17 pre-existing React hook errors; current baseline has not yet been rerun.

## Exact Next Action

Commit Checkpoint 3 as `fix(health): enforce applicability and conservative aggregation`, push it, and verify the remote SHA.
