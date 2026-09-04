# Health-Concern Score Shadow Report

## Purpose And Boundary

This sidecar compares the current legacy health-concern score with a hypothetical score derived from the canonical evaluator merged in PR #103. Nothing imports the sidecar from runtime score, verdict, ranking, analysis, store, API, or UI code. The report cannot replace runtime behavior and does not authorize score or UI activation.

The historical `codex/pr3-concern-score-integration` branch was not reused. Its explicit delta, deterministic fixture, and read-only report ideas were retained, while its runtime `concernFit` replacement, `RecommendationBreakdown` changes, AnalysisResult wiring, displayed result changes, and score-regression updates were rejected.

## Comparison Formula

For every product/profile row, the legacy side is the unchanged `getRecommendationBreakdown()` result and its existing display cap. The candidate concern fit is:

- no selected concern: 20 neutral points, explicitly not evidence of suitability
- all selected inputs recognized: the evaluator contribution sum bounded to `0..20`
- any unrecognized selected input: blocked, with candidate concern/base/total/display/grade/deltas all `null`

The hypothetical candidate base substitutes only that concern fit into the unchanged baseline ingredient-safety and general-health components. The candidate total then applies the exact baseline species mismatch, HARD allergy penalty, poultry/allergy caution penalty, and preference penalty. The existing display resolver applies the same allergy/species/danger caps. This is deliberately duplicated in the sidecar because extracting runtime score logic is outside this PR; exhaustive equality invariants guard the duplication.

Missing evidence can produce zero candidate concern points but remains `unknown`/`insufficient`, not confirmed failure. Quantitative checks with `judgmentEnabled: false` remain informational and cannot add support, penalties, confidence, or points.

## Matrix And Ranking

The report evaluates nine canonical single-concern profiles for every product: 피부·모질, 관절, 소화기, 비만·다이어트, 신장·비뇨기, 심장, 면역, 눈, and 구강. A cat-targeted product uses a synthetic cat profile; dog, all-species, or missing targets deterministically use a dog profile. This prevents synthetic species mismatch from hiding concern-score differences.

Caller-provided profiles are also accepted unchanged. Candidate ranking excludes blocked rows. Rank deltas compare only products eligible on both sides, use product ID as the deterministic score-tie breaker, and label blocked products `not_comparable` rather than calling their removal a genuine rank change. Runtime ranking is never called with candidate scores or replaced.

## Safety Invariants

The report records violations for baseline safety-signal differences, input mutation, out-of-range candidate concern/total scores, candidate scores on unrecognized-input rows, or points attributable only to disabled informational thresholds. It retains baseline species mismatch, allergy hits and cautions, allergy and poultry penalties, preference penalty, ingredient safety, general health suitability, danger/caution counts, and visible reasons.

A missing ingredient array is recorded as a data-quality issue and evaluated through a shallow, non-mutating empty-array view inside the sidecar. Runtime code is not changed.

## Fixture Evidence

The in-repository fixture is representative test data only. It contains 3 synthetic products and 14 logical profile definitions, producing 42 rows:

- 36 computed rows and 6 blocked-unrecognized rows
- 33 rows with insufficient evidence
- 15 rows whose quantitative evidence is entirely informational
- candidate total-score deltas from -10 to +5
- 1 hypothetical grade change and 0 hypothetical ordering changes
- 1 product with a missing ingredient array and empty health tags
- 0 invariant violations

These figures do not represent production and support no production-impact conclusion. The report engine is ready, but actual impact remains pending a separate copied, read-only JSON export.

## Future Read-Only Input

A future local analysis can parse a copied JSON export into `Product[]` and optionally `UserPetProfile[]`, then pass them directly to `buildHealthConcernScoreShadowReport(products, profiles)`. That run must occur in a separate task with no Supabase client, credentials, network query, database write, or migration. Its input provenance, row count, and adapter assumptions must be recorded alongside the output.

Search still owns a local six-item concern list while Profile and the canonical taxonomy expose nine concerns; this unresolved UI taxonomy mismatch is intentionally unchanged here.

After a real read-only impact report is reviewed, the owner must decide whether the candidate concern policy, unknown-input blocking behavior, and observed score/grade/ranking changes are acceptable. Any runtime activation, recommendation change, or UI/copy migration requires a separate explicitly approved PR.

## Validation

The final branch validation ran 199 focused shadow/evaluator/score/display/ranking/allergy/poultry tests and the complete 883-test repository suite successfully. TypeScript, the production Vite build, targeted ESLint, and `git diff --check` passed. Repository-wide ESLint still reports 17 pre-existing React hook errors in files outside this PR; no shadow file fails lint.

The final path audit contains only this document and sidecar implementation/tests under `src/lib/`. Runtime score and `RecommendationBreakdown`, display verdict, ranking, analysis, UI, stores, allergy/poultry logic, Supabase, SQL/migrations, environment, and deployment files are unchanged. Static import guards confirm no runtime or UI surface imports the shadow modules.
