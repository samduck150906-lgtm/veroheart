# PR2B Progress

## Objective

Harden the canonical health-concern evaluator against missing, partial, inapplicable, and weak evidence without changing runtime score, recommendation behavior, allergy behavior, UI, user-facing copy, data, migrations, environment, or deployment configuration.

## Repository State

- Remote main at task start: `afa18338c8ba6229ea4e37bae131943399f074c0`
- Working branch: `codex/pr2b-evaluator-correctness`
- Current HEAD: `afa18338c8ba6229ea4e37bae131943399f074c0`
- Latest remote branch SHA: `fa734f7dcf707cdc6e3ec3a28c48f07508945e00`
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
- `docs/HEALTH_CONCERN_JUDGMENT_CONTRACT.md` (threshold provenance audit and deactivation contract)

## Checkpoints

- Completed: repository setup; Checkpoint 1 at `564565c`; Checkpoint 2 at `7679b1b`; Checkpoint 3 at `fa734f7`; Checkpoint 4 at `302ed12`; Checkpoint 5 provenance/deactivation implementation and validation
- Current: Checkpoint 5 - commit, push, and verify remote SHA
- Remaining: Checkpoint 6 rebase, full validation, cleanup, final push, and PR creation

## Decisions

- Use `/private/tmp/veroro-pr2b` as an isolated worktree so existing user changes and the PR3 backup worktree remain untouched.
- The two commits after `9978b37` are admin-auth-only and do not invalidate the evaluator baseline.
- Existing risks confirmed: unsafe null/blank numeric coercion; default 10% moisture; no species/life-stage/product-type/form applicability; pass-plus-unknown aggregation as supported; canonical label replacing original input; evidence ingredients present in concern aliases; substring tag overmatching; combined renal/urinary evidence without an internal domain distinction; weak threshold provenance.
- Checkpoint 1 uses Vitest `it.fails` for desired behavior that current production code does not yet satisfy, keeping the test command green while making each defect executable and visible.
- No active dog-only evaluator threshold exists on main. The required unrelated-species invariant will be covered through the generic applicability implementation in Checkpoint 3 rather than inventing a production dog threshold.
- Checkpoint 2 rejects unsafe coercion and inequality-qualified declarations for comparison. Missing moisture remains unavailable; no estimated moisture fallback is retained.
- Checkpoint 3 uses explicit profile species, profile life stage, product target species, and product category applicability. Product names are not used to infer complete-food status.
- Pass plus unknown becomes `possible` with `partial_quantitative`, partial confidence, and no quantitative score contribution. Confirmed failure takes precedence; all-non-applicable checks produce `not_applicable`.
- Checkpoint 4 preserves the first exact user-entered label for each canonical concern and exposes unknown inputs through `evaluateHealthConcernsDetailed()` while retaining the existing array-returning API.
- Product-tag matching now resolves exact canonical aliases rather than substrings. Glucosamine/chondroitin remain ingredient evidence only, not profile concern aliases.
- The combined public renal/urinary ID remains stable, with internal `renal` and `lower_urinary` evidence domains. Renal phosphorus cannot support a lower-urinary selection or fully support the combined selection by itself.
- Profile uses all nine canonical options. Search still owns a six-item local list and omits immune, eye, and oral; this deferred UI mismatch is documented but intentionally not changed in PR2B.
- Checkpoint 5 disables every retained quantitative rule from judgment. Informational pass/fail calculations cannot produce `supported`, `not_supported`, confidence, caution reasons, missing-required fields, or points.
- The digestive 3-6% DMB range remains an internal exploratory heuristic only. The fixed weight 12% fat and 28% protein cutoffs are no longer attributed to WSAVA. The renal 500 mg/1000 kcal cutoff remains unverified and cannot represent generic urinary suitability.
- FEDIAF 2025 Table III-4b page 19 verifies distinct adult complete-cat-food values at MER 75: dry 330 mg/1000 kcal and canned 670 mg/1000 kcal. Both remain disabled because the repository taurine field has no verified unit/provenance.

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
- Checkpoint 3 commit/push: `fa734f7`; local and remote SHA matched.
- Checkpoint 4 preflight fetch: `origin/main` remains `afa1833`; no incoming commits.
- Checkpoint 4 targeted tests: 4 files, 90 tests passed.
- Checkpoint 4 TypeScript `tsc -b --pretty false`: passed.
- Checkpoint 4 targeted ESLint: passed after removing two dead imports/bindings exposed by the refactor.
- Checkpoint 4 `git diff --check`: passed.
- Checkpoint 4 commit/push: `302ed12`; local and remote SHA matched.
- Checkpoint 5 preflight fetch: `origin/main` remains `afa1833`; no incoming commits.
- Official sources inspected: FEDIAF 2025 PDF from the FEDIAF guideline page; WSAVA Global Nutrition Committee guideline/toolkit page and linked 2011 assessment guideline. The prior Merck URL resolves to a 404 and no exact primary source for the universal renal cutoff was verified, so that rule was disabled.
- Checkpoint 5 targeted tests: 4 files, 91 tests passed.
- Checkpoint 5 TypeScript `tsc -b --pretty false`: passed.
- Checkpoint 5 targeted ESLint: passed.
- Checkpoint 5 `git diff --check`: passed.
- Copy scope review: existing evaluator message strings were preserved; no UI or dedicated user-facing copy module was changed.

## Known Failures

- Repository-wide lint previously had 17 pre-existing React hook errors; current baseline has not yet been rerun.

## Exact Next Action

Commit Checkpoint 5 as `fix(health): make threshold provenance explicit and conservative`, push it, and verify the remote SHA.
