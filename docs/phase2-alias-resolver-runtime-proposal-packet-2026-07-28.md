# Phase 2 Alias Resolver Runtime Proposal Packet — 2026-07-28

## Purpose

This document records a non-UI-visible runtime proposal packet for the next Phase 2 alias resolver step.

This PR does not change app-visible scores, labels, sorting, cards, detail pages, analysis text, or warnings. It also does not enable the runtime feature flag, does not change score calculations, and does not approve canonical alias scoring. It only defines the exact proposal packet that a future implementation PR must follow.

## Updated Autonomy Boundary

The owner expanded the working boundary:

```text
이제 좀 승인 없이 진행하는 범위를 확대해도 좋을 것 같아. 진짜 어플 화면에서 보이는 무언게 바뀔만큼 치명적인 작업만 나한테 확인받고 그 외의 것은 너가 나한테 묻지말고 멈추지말고 쭉 진행해
```

Interpretation for this project:

Allowed without stopping:

- docs, tests, helpers, fixtures, and internal refactors
- runtime wiring that remains flag-off and behavior-preserving
- non-visible internal proposal packets and harnesses
- code that does not change app-visible score, label, sorting, card, detail, analysis, or warning output

Still requires explicit owner approval before merge:

- app-visible score changes
- app-visible label, card, detail-page, analysis-copy, warning, badge, or ranking changes
- turning a feature flag on when it changes user-facing output
- production database writes, rollback, or migration execution
- env, secret, deploy, URL, or token changes

## Scope

Allowed in this PR:

- define the future runtime proposal packet
- keep runtime `score.ts` on `phase2AliasResolver: false`
- require the combined review artifact from PR #46 before any app-visible behavior change
- define the first implementation candidate boundaries
- keep this PR docs/test-only

Not allowed in this PR:

- enabling the runtime feature flag
- adding `phase2AliasResolver: true` to `score.ts`
- changing score calculations
- changing app-visible labels, cards, detail pages, analysis text, warnings, badges, or ranking
- mutating product ingredients
- replacing raw labels with canonical aliases
- using canonical aliases as safety decisions
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Required Runtime Proposal Packet

A future implementation PR that still claims to be non-visible must include all of these sections:

| section | requirement |
|---|---|
| implementation summary | exact files/functions changed |
| visibility claim | proof that app-visible output remains unchanged |
| feature flag scope | whether the flag remains hard-coded off, config-off, or test-only on |
| score diff summary | compatible with the PR #43 score diff harness |
| affected report summary | compatible with the PR #44 affected report harness |
| readiness gate status | compatible with the PR #45 readiness gate |
| combined review packet | compatible with the PR #46 combined artifact |
| blocked fallback | blocked rows preserve raw labels and create no positive score effect |
| ambiguous fallback | ambiguous rows preserve raw labels and create no positive score effect |
| unmatched fallback | unmatched rows preserve raw labels and existing behavior |
| mutation proof | product and ingredient references are not mutated unless explicitly approved |
| display proof | score, grade, visible labels, analysis text, and warnings are unchanged unless explicitly approved |
| ranking proof | ranking is unchanged unless explicitly approved |
| disable path | flag-off path remains behavior-preserving |
| rollback plan | one-step code revert or flag disable path exists |

## First Implementation Candidate Boundary

The next internal implementation PR may add runtime-adjacent code only if it remains non-visible.

Allowed candidate:

- extract the currently hard-coded `phase2AliasResolver: false` configuration into a small internal function
- keep that function returning `false`
- add tests proving score, grade, display verdict, ranking, raw labels, and product references remain unchanged
- do not load env/config/secrets
- do not enable canonical alias scoring

Not allowed without explicit owner approval:

- making the internal flag return `true`
- reading a live env flag that could accidentally turn on in production
- changing score inputs
- changing output labels
- changing visible UI text or badges
- changing ranking or sorting

## App-Visible Change Gate

Any PR must stop for owner approval if it changes any of these visible outputs:

- product card score
- product card badge or pet-type/tag presentation
- product card ranking/sorting order
- detail-page score or grade
- analysis report text
- warning text
- raw ingredient labels shown to users
- recommendation reasons shown to users

Required approval language for such a PR:

```text
PR #[number] 앱 화면 영향 있는 Phase 2 alias resolver 변경 승인. 변경되는 점수/라벨/문구/정렬 diff 확인했고, rollback/disable 전략 확인 후 진행 승인.
```

## Runtime Guard

`src/utils/score.ts` must remain on:

```ts
flags: { phase2AliasResolver: false }
```

The proposal test also asserts that `score.ts` does not contain:

```ts
phase2AliasResolver: true
```

## Not Approved By This PR

This PR does not approve:

- turning the runtime flag on
- changing app-visible output
- changing scores
- mutating ingredients
- replacing raw labels in runtime
- using canonical aliases as safety decisions
- Supabase production operations
- migrations
- product label row creation

## Next Step

The next safe step can be an internal flag accessor extraction that still returns `false` and proves app-visible output remains unchanged.

A future app-visible behavior change still requires a filled combined review artifact with actual proposed diffs, fallback proof, disable strategy, rollback plan, and explicit owner approval.