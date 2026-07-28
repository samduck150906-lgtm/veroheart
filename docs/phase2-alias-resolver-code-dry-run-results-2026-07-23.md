# Phase 2 Alias Resolver Code Dry-Run Results — 2026-07-23

## Purpose

This document records a code-level dry-run fixture for the Phase 2 low-risk alias resolver helper.

This is not a Supabase run and does not read production data. It is a deterministic TypeScript fixture that verifies the helper contract before any runtime/scoring integration.

## Scope

- Helper/test/docs only.
- No Supabase execution.
- No production operation.
- No SQL files added or modified.
- No migrations.
- No `.env`, secrets, credentials, URLs, or access tokens.
- No runtime/scoring import or live integration.
- Does not approve runtime/scoring canonical alias integration.

## Fixture Inputs

The fixture includes representative Phase 2 low-risk canonical groups:

- 건조비트펄프
- 오메가3지방산
- 감자전분
- 건조맥주효모
- 녹차추출물
- 맥주효모
- 비타민e
- 비트펄프
- 오메가6지방산
- 코코넛오일
- 타피오카전분
- 토마토박
- 프락토올리고당
- 혼합토코페롤

It also includes review-only blocked examples from the previously excluded candidate set:

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

## Dry-Run Result

The fixture runs 24 labels through `resolvePhase2Alias`.

| status | count |
|---|---:|
| matched | 14 |
| unmatched | 5 |
| ambiguous | 0 |
| blocked | 5 |
| total | 24 |

## Matched Examples

The following labels resolve by exact normalized key equality only:

- 건조 비트 펄프 → 건조비트펄프
- 오메가-3 지방산 → 오메가3지방산
- 감자 전분 → 감자전분
- 건조 맥주 효모 → 건조맥주효모
- 녹차 추출물 → 녹차추출물
- 맥주 효모 → 맥주효모
- 비타민 E → 비타민e
- 비트펄프 → 비트펄프
- 오메가6지방산 → 오메가6지방산
- 코코넛오일 → 코코넛오일
- 타피오카 전분 → 타피오카전분
- 토마토 박 → 토마토박
- 프락토 올리고당 → 프락토올리고당
- 혼합토코페롤 → 혼합토코페롤

## Unmatched Review-Only Examples

These labels remain unmatched and must not be inferred semantically:

- 닭고기
- 닭고기 분말
- 로즈마리 추출물
- 타우린
- 현미

## Blocked Review-Only Examples

These labels are blocked before match resolution:

- 닭간
- 닭 지방
- 동물성 지방
- 소르빈산 칼륨
- 향미증진제

Blocked status means the term must remain review-only and cannot silently resolve into a low-risk alias/canonical candidate.

## Safety Interpretation

This fixture confirms that the helper can classify representative labels as `matched`, `unmatched`, or `blocked` without substring matching, fuzzy matching, or semantic inference.

The fixture also keeps `ambiguous` at 0 for the documented sample while unit tests still cover ambiguity behavior with a synthetic conflicting alias.

## Not Approved By This Result

This result does not approve:

- runtime/scoring integration
- product label row creation
- Supabase write/apply/rollback
- production DB changes
- automatic safety scoring based on canonical alias resolution

## Next Step

After this PR, the next safe step is a contract/audit PR that documents how the helper would be wired behind a disabled feature flag. Runtime/scoring integration should remain off until reviewed separately.
