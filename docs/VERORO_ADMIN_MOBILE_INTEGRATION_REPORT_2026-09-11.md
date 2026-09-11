# VERORO Admin ↔ Mobile Integration Completion Report

작성일: 2026-09-11 (KST)

이 문서는 이번 변경분의 완료 범위와 아직 운영 반영되지 않은 범위를 구분한다. 운영 DB에는 쓰기 권한이 없어 기존 데이터를 변경하지 않았으며, 검증하지 못한 제품 정보를 추측해 입력하지 않았다.

## 1. 작업 전 Baseline

읽기 전용 anon REST 감사 시각: `2026-09-11T02:11:49.233Z`

```text
Products: 458
Verified: 0
No Ingredients: 145
No Nutrition: 455
No Barcode: 458
External Images (Coupang): 43
Duplicate Candidates: 26 groups
Review Mismatches: 2
Risk Mismatches: 15
Public users readable by anon: 10 rows / HTTP 200
is_visible schema available: false
Initial product payload: 1,098,285 bytes / 458 products + nested ingredients
```

## 2. 작업 후 결과

### 코드 및 마이그레이션 적용 후 보장되는 목표

```text
Initial mobile rows: maximum 50
Initial mobile nested ingredient rows: 0
Review mismatch after migration: 0 (trigger + full backfill)
Risk mismatch after migration: 0 (link/ingredient trigger + full backfill)
Public user table-wide anon read: removed
Admin credentials stored in browser: no (signed session only after new Edge deploy)
```

### 현재 운영 DB 재측정

마이그레이션과 Supabase Edge Function은 원격 프로젝트 권한 부재로 아직 적용하지 못했다. 따라서 DB 지표는 작업 전과 동일하다. `verified=0` 상태에서 모바일을 `verified only`로 바꾸지 않았고, 145개 제품을 삭제·숨김 처리하지 않았다.

## 3. 해결한 Critical

- C-1 리뷰 집계: 완료(신규 migration). INSERT/UPDATE/DELETE trigger와 기존 전체 backfill.
- C-2 위험성분 단일 원본: 완료(신규 migration + 관리자 수기입력 제거). `product_ingredients JOIN ingredients`를 파생 캐시의 유일한 원본으로 사용.
- C-3 앱 설정 fail-close: 완료. 설정 조회 실패 시 바이럴 이벤트 비노출.
- C-4 도메인 경계: 완료. 공개 앱 도메인의 `/admin`, `/admin/*`는 Netlify 404.
- C-5 누락 제품 운영: 완료(스키마/API/관리자 화면). 누락 제품을 삭제하지 않고 보완 큐에 백필.

## 4. 해결한 High

- H-1 초기 모바일 제품 요청을 50개 서버 페이지로 제한하고 원재료 중첩 제거.
- H-2 건강고민 coverage가 70% 미만이면 무결과 필터를 비활성화.
- H-3 대시보드에 검수완료/원재료·영양·바코드 누락/전체 품질 보완 대상 KPI 추가.
- H-4 제품 목록에 실제 필드 기반 정보완성도 표시.
- H-5 출처 URL, 유형, 신뢰도, 확인 필드, 원재료 원문, 검수 메모를 보존하는 제품 데이터 보완 화면 추가.
- H-6 관리자 제품 저장에서 `has_risk_factors` 수기 쓰기 제거.

## 5. Medium / Security

- 공개 사용자 전체 읽기 정책 제거.
- anon은 리뷰 작성자에 한해 `id`, `nickname`, `avatar_url`만 읽도록 축소.
- 두 공개 뷰를 `security_invoker=true`로 전환.
- `handle_new_user`, `admin_replace_product_ingredients`의 search path 고정 및 공개 실행권한 회수.
- 관리자 로그인은 새 Edge Function 배포 후 HMAC 서명 8시간 세션을 발급. 아이디/비밀번호의 Base64 표현을 브라우저에 저장하지 않음.
- 프런트/Edge 순차 배포 중 관리자 로그인이 끊기지 않도록 구버전 action 호환 경로 유지.

## 6. 관리자 기능

```text
Products: 완료 (기존 CRUD/검색/페이지/노출 + 정보완성도)
Ingredients: 완료 (기존 CRUD/검색/정렬/필터/사용제품)
Product Ingredients: 완료 (기존 검색/추가/삭제/순서/원자적 저장)
Data Quality: 완료 (신규 큐/필터/출처/원문/상태/메모)
Rules: 부분완료 (기존 Phase 2 shadow/회귀 장치 유지, 실제 활성화 안 함)
Users: 완료 (Auth 원본 페이지 조회 및 실제 로그인 ID 표시)
Diary: 완료 (기존 서버 페이지 조회)
Settings: 완료 (기존 저장 검증 + 모바일 30초 동기화 + fail-close)
Unmatched: 완료 (기존 검수 workflow)
Reviews admin list: 미완료
```

## 7. 실제 데이터 보완

```text
원재료 보완 제품 수: 0
영양정보 보완 제품 수: 0
열량 보완 제품 수: 0
바코드 보완 제품 수: 0
이미지 이관 제품 수: 0
외부 조사 제품 수: 2
안전한 자동 반영: 0
variant 식별 필요: 2
```

제품명만으로 정확한 variant를 확정할 수 없거나 공식/국내 유통 수치가 충돌하여 자동 DB 입력하지 않았다. 상세 결과는 `data/enrichment/research-2026-09-11.json`에 기록했다.

## 8. 외부 Source

- 제조사 공식: NOW FRESH, INABA Petfood.
- 국내 교차검증: 가격비교 상품의 제조사/용량/보장성분 표기.
- NOW FRESH 후보는 제조사 현재 조지방 17%와 국내 2kg 표기 13%가 충돌하여 `needs_variant`.
- “이나바 챠오츄르”는 맛/연령/총합영양식 여부가 없는 시리즈명이라 서로 다른 공식 variant 중 하나를 선택하지 않음.

## 9. 제품명 정제

```text
정제 후보: 운영 감사 스크립트로 추출 가능
자동 정제: 0
수동 검토 필요: 쿠팡검색 브랜드 및 용량/수량/판매 문구 포함 제품
중복 후보: 26 groups
```

대량 자동 변경은 variant·용량을 잘못 병합할 위험이 있어 수행하지 않았다.

## 10. DB Migration

- `20260911110000_sync_product_review_aggregates.sql`: 리뷰 trigger/backfill.
- `20260911111000_sync_product_risk_factors.sql`: 위험성분 파생 캐시 trigger/backfill.
- `20260911112000_tighten_public_profiles_and_definers.sql`: RLS/뷰/함수 보안.
- `20260911113000_product_enrichment_workflow.sql`: 출처 및 보완 큐, 누락 백필, 자동 갱신 trigger.

## 11. Edge Functions

`admin-write`에 다음 action을 추가했다.

```text
createAdminSession
listEnrichmentQueue
saveProductSource
updateEnrichmentStatus
```

대시보드 품질 지표 계산, HMAC 서명 세션, 입력 URL/enum 검증, 감사 로그도 포함한다.

## 12. Security

코드/마이그레이션 완료. 운영 반영은 Supabase migration 및 `admin-write` 배포가 필요하다. service role은 클라이언트나 로그에 노출하지 않았다.

## 13. 성능

작업 전 실측:

```text
payload: 1,098,285 bytes
rows: 458 products + 4,265 product ingredient links
```

작업 후 코드:

```text
rows: maximum 50 products
nested ingredient rows: 0
reference light-query payload: 34,665 bytes (same production dataset, 50 rows)
```

34,665 bytes는 신규 번들의 운영 배포 후 실측값이 아니라, 동일 운영 DB에 이번 경량 컬럼/50행 형태로 질의한 기준값이다.

## 14. Tests

```text
vitest: 1,046 / 1,046 passed (163 files)
tsc: passed through npm run build
eslint: 0 errors
vite production build: passed
Supabase local SQL execution: not run (Docker/Deno unavailable)
```

## 15. Browser QA

운영 REST 읽기 감사와 공식 사이트 조사는 수행했다. 로그인 후 쓰기, DB trigger, 신규 데이터 품질 화면의 운영 브라우저 QA는 migration/Edge Function 미배포 상태라 성공으로 보고하지 않는다.

## 16. Remaining Issues

- 운영 Supabase에 신규 migration 4개 적용.
- `admin-write` Edge Function 배포 후 관리자 새 세션 발급 확인.
- 운영 DB에 아직 없는 `is_visible` migration 포함 기존 미적용 migration 적용.
- 정확한 라벨로 variant를 확정하면서 145개 제품을 큐 순서대로 보완.
- 영양 455개, 바코드 458개, 외부 이미지 43개 보완/이관.
- 데이터 확보 후 검수 제품을 늘린 다음에만 `verified only` 공개 정책 활성화.
- 리뷰 관리자 목록 및 분석 룰 관리자 CRUD/preview 완성.
- 운영 배포 후 관리자→모바일 쓰기 E2E와 DB integrity 재감사.

