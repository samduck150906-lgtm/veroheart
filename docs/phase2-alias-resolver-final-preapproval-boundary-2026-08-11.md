# Phase 2 Alias Resolver Final Pre-Approval Boundary — 2026-08-11

## Purpose

This document marks the end of the non-visible preparation track for Phase 2 alias resolver work before any app-visible behavior change.

The project now has helper, fixture, dry-run, runtime-off, shadow metadata, shadow report, invariance, review packet, execution wrapper, and app-surface guard coverage. The next step after this boundary may affect app-visible output and therefore requires explicit owner approval.

## Completed Non-Visible Track

| PR range | purpose | app-visible change |
|---|---|---:|
| #29–#32 | resolver contract, helper, fixture, code dry-run | no |
| #33–#39 | disabled flag contract, flag-off runtime integration, verification | no |
| #40–#46 | candidate diff, affected report, readiness/review artifacts | no |
| #47–#51 | autonomy boundary, disabled accessor, test seam, adapter coverage, shadow metadata | no |
| #52–#57 | shadow envelope, report, invariance, review packet, execution wrapper, app-surface guard | no |

## Current Safety State

The current merged state intentionally keeps:

- runtime feature flag disabled
- no user-visible alias resolver output
- no score calculation change
- no product-card score change
- no detail-page score or grade change
- no analysis text change
- no warning text change
- no ranking/sorting change
- no ingredient label replacement
- no runtime ingredient mutation
- no Supabase reads/writes
- no SQL or migration changes
- no `.env`, secrets, credentials, URLs, tokens, or deploy configuration changes

## Existing Guard Rails

The safe track now includes these guard rails:

1. Exact-normalized resolver helper only.
2. Runtime flag accessor remains disabled by default.
3. Test-only override seam is not runtime enablement.
4. Adapter remains sidecar-only and returns original product objects.
5. Shadow metadata rows are score-neutral and non-mutating.
6. Shadow report counters keep score impact, runtime mutation, visible label replacement, and changed products at zero.
7. Shadow report generation has score/display/ranking/raw-label invariance tests.
8. App-surface guard prevents shadow imports into visible UI, analysis, verdict, score, and ranking surfaces.

## Stop Boundary

After this PR, the next meaningful product step is no longer just preparation. It would likely involve one of these app-visible or deploy-risk categories:

- enabling a feature flag beyond test-only or disabled-by-default paths
- importing shadow or resolver output into app-visible surfaces
- changing product-card score, badge, label, or ranking
- changing detail-page score, grade, explanation, or warning copy
- using canonical alias matches in score calculation
- replacing or normalizing raw ingredient labels shown to users
- reading live env/config/deploy settings to control resolver behavior
- running Supabase reads/writes, SQL, migrations, or production scripts

Any of those requires explicit owner approval before work starts.

## Required Owner Approval For Next App-Visible PR

Use this approval shape before the next behavior-changing PR:

```text
App-visible Phase 2 alias resolver change 승인.
허용 범위: [정확히 허용할 화면/점수/문구/정렬/flag/env 범위 기입]
금지 범위: 운영 DB write, migration, env/secrets 변경, deploy 변경은 별도 승인 전 금지.
필수 조건: before/after score diff, affected product/ingredient report, rollback/disable strategy 포함.
```

## Next PR Candidate

The next PR should be opened only after owner approval and should be narrow. Recommended first app-visible candidate:

1. Keep runtime feature flag default disabled.
2. Add a single explicit opt-in app-visible experiment path, still not enabled for users by default.
3. Include before/after score, display, ranking, label, warning, and explanation diffs.
4. Include affected product/ingredient report.
5. Include rollback and emergency disable instructions.
6. Avoid Supabase writes, migrations, env/secrets, and deploy changes unless separately approved.

## Not Approved By This PR

This PR does not approve:

- app-visible output changes
- runtime flag enablement
- canonical alias scoring
- score calculation changes
- visible label replacement
- recommendation/ranking changes
- Supabase production operations
- SQL changes
- migrations
- env/secrets/deploy changes
- product label row creation
