# 내부 분석 기록 (ANALYSIS)

MELIQ MVP 제안 첨부용 「유사 프로젝트 구축 사례」 작성을 위한 실제 코드 조사 기록.
외부 제출용이 아니라 내부 검증 기록이다. 모든 판단에는 파일 경로 근거를 남긴다.

- 조사일: 2026-09-12
- 조사 대상 커밋
  - `samduck150906-lgtm/samduck` — `cac4b12` (shallow clone, 3,970 files)
  - `samduck150906-lgtm/veroheart` — `2aad5fc` (branch `claude/meliq-portfolio-analysis-j9mu7p`)
  - `samduck150906-lgtm/acare` — `8a96f40` (shallow clone)
- 매핑(고정): `samduck` = 학우너 · `veroheart` = VeRoRo · `acare` = 세탁 서비스 앱

> **주의 — 동명 저장소**
> 계정에는 `hakwooner`, `hakwooner_owner`, `hakwooner_stud`, `hakwooner-docs` 저장소가 따로 존재한다.
> 지시에 따라 학우너는 **`samduck` 저장소만** 분석했다. 다른 저장소는 열지 않았다.

---

## 0. 조사 방법

1. README가 아니라 소스·스키마·마이그레이션·라우트 정의를 직접 확인했다.
2. 실행 가능한 웹 타깃은 빌드 후 실제 브라우저(Playwright + Chromium)로 띄워 캡처했다.
3. Flutter 앱(학우너 사용자앱, 세탁 주문앱)은 **컨테이너에 Flutter/Dart SDK가 없어 실행하지 못했다.** 코드 분석으로만 판단했다.
4. 운영 DB에는 **어떤 읽기·쓰기도 하지 않았다.** 실행은 전부 로컬 + 저장소 자체의 목/픽스처 데이터로 했다.

---

## 1. samduck = 학우너 (Hakwooner)

### 1.1 구성 — 단일 저장소 안의 4개 배포 단위

| 단위 | 스택 | 경로 | 규모 |
|---|---|---|---|
| 사용자 앱 | Flutter (Dart) | `lib/` | Dart 398개 파일 |
| REST API | Express + TypeScript | `api/src/` | 라우트 모듈 33개 |
| 원장 ERP | Next.js 14 (App Router) | `owner-erp/` | 페이지 126개 · API 라우트 300개 |
| 운영자/랜딩 | Vite · Next.js | `sites/operator`, `sites/app` | — |

`pubspec.yaml:2` — `description: 학우너 - 학원 검색 & AI 맞춤 추천 플랫폼`

### 1.2 데이터베이스

- Supabase/PostgreSQL 마이그레이션 **310개** (`supabase/migrations/*.sql`)
- `CREATE TABLE` 기준 고유 테이블 **222개**
- `ENABLE ROW LEVEL SECURITY` **237회**, `CREATE POLICY` **459회**
- 역할 문자열: `super_admin`, `admin`, `owner`, `staff`, `teacher`, `student`, `parent`, `operator`
  - `supabase/migrations/20260401060000_migrate_role_to_array.sql` — 단수 role → 배열 `roles text[]`
  - `supabase/migrations/20260606140000_add_super_admin_role_to_users_check.sql`
  - `supabase/migrations/20260519010000_staff_role_rls.sql`

### 1.3 추천 엔진 — **실제로 존재함**

MELIQ의 Recommendation Module / Fit Score / Why it fits 와 직접 대응되는 구현이 있다.

| 구현 | 근거 |
|---|---|
| 가중치 기반 스코어링 | `api/src/services/recommendation.service.ts:154` `WEIGHTS = { distance .25, subjectMatch .25, goalFit .20, classTypeFit .10, budgetFit .10, reviewScore .10 }` |
| 태그 매칭 가중치(합 1.0) | 같은 파일 `:164` `TAG_WEIGHTS = { tagSimilarity .40, instructorBonus .10, reviewTagBonus .10, ownerTagBonus .10, distance .15, reviewScore .15 }` |
| 항목별 점수 함수 | `:347 calcDistanceScore` `:360 calcSubjectScore` `:379 calcGoalScore` `:399 calcClassTypeScore` `:420 calcBudgetScore` `:461 calcReviewScore` |
| 유사도 계산 | `:785 calcJaccardSimilarity` · `api/src/lib/vector-scoring.ts` (원-핫 벡터 + 코사인 유사도) |
| 점수 분해(breakdown) 반환 | `:81 interface ScoreBreakdown` — distance/subjectMatch/goalFit/classTypeFit/budgetFit/reviewScore |
| 추천 사유 문장 생성 | `:1074 generateReason` · `:1018 generateTagReason` — "…거리로 매우 가까워요", "학습 목표에 딱 맞는 커리큘럼을 제공해요" 등 |
| 정규화 점수 + 라벨 | `:138 matchScore` (0~100) · `:139 matchLabel` ("우리 아이와 XX% 일치") |
| 근거 신뢰도 가중 | `:914 calcReviewTagBonus` — 리뷰 80% 이상 검증된 태그만 보너스 |
| 후보 상한 | `:174 MAX_CANDIDATES = 200` |
| 저장 테이블 | `supabase/migrations/20250306200001_add_tag_system_and_profiles.sql` — `ai_recommendations(score, reason, matched_tags, expires_at)` |
| 테스트 | `api/src/lib/vector-scoring.test.ts` · `api/src/services/matching.service.test.ts` |
| API 노출 | `api/src/routes/index.ts:63` `/api/v1/recommendations` |

### 1.4 인증 · 권한

- `api/src/middleware/auth.middleware.ts` — Bearer 토큰 → Supabase 검증 → `users.roles(text[])` 매핑
- 역할 가드: `requireRole('admin','super_admin')`, `requireRole(...OWNER_ROLES)`
- `api/src/middleware/operator.middleware.ts` — 운영자 전용 게이트
- 소셜 로그인: Kakao (`kakao_flutter_sdk_user`), Apple (`sign_in_with_apple` + `signInWithIdToken('apple')` + SHA-256 nonce)
- ERP 세션: `owner-erp/middleware.ts` — `@supabase/ssr` 쿠키 세션 + 보안 헤더(HSTS/X-Frame-Options/Permissions-Policy) + 플랜 기반 접근 제어(`lib/subscription/plan-access`)

### 1.5 결제 · 구독

- Toss Billing: `owner-erp/.env.example` 의 `NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY` / `TOSS_BILLING_SECRET_KEY` / `TOSS_BILLING_WEBHOOK_SECRET`
- 앱 결제: `lib/features/payment/presentation/widgets/payment_checkout_webview.dart`
- 테이블: `payments`, `subscriptions`, `subscription_invoices`, `subscription_plans`, `billing_schedules`, `billing_webhook_log`, `user_billing_keys`, `escrow_transactions`, `escrow_settlements`, `tax_invoices`

### 1.6 운영 · 분석

- `lib/services/analytics_service.dart` + `firebase_analytics` (pubspec)
- 운영 테이블: `operator_dashboard_snapshot`, `operator_mau_snapshot`, `platform_events`, `admin_logs`, `operator_audit_logs`, `activity_logs`, `dashboard_stats_cache`
- 배포: `netlify.toml`(랜딩) · `owner-erp/netlify.toml` · `api/railway.json` · `Dockerfile`
- 서비스 URL(설정 파일 확인): `hakwooner.kr`, `owner.hakwooner.kr`, `admin.hakwooner.kr`, `api.hakwooner.kr`

### 1.7 둘러보기(preview) 모드 — 캡처에 사용

`owner-erp/lib/preview/` 에 로그인 없이 ERP 전체를 읽기 전용으로 탐색하는 모드가 구현돼 있다.

- `constants.ts` — `PREVIEW_USER_ID`/`PREVIEW_ACADEMY_ID`는 실제와 겹치지 않는 **예약 합성 UUID**
- `fake-client.ts`(14 KB) + `fixtures.ts`(34 KB) — 읽기는 픽스처, 쓰기는 차단
- 실제 로그인 세션이 있으면 preview로 강등되지 않음("real user wins")

→ **학우너 스크린샷은 전부 이 모드에서 촬영했다. 실데이터·실회원 정보가 아니다.**

### 1.8 테스트

Flutter 82 · API 45 · ERP 43 (`*_test.dart` / `*.test.ts*` 파일 수)

---

## 2. veroheart = VeRoRo

### 2.1 구성

- React 19 + TypeScript + Vite 8, `react-router-dom` 7, `zustand` (`package.json`)
- Supabase(Postgres + Auth + Edge Functions) 백엔드
- Capacitor로 iOS/Android 패키징 (`capacitor.config.ts` — `appId: com.veroro.app`)
- Netlify 배포 (`netlify.toml`) + Edge Function 도메인 경계(`netlify/edge-functions/admin-domain-boundary.ts`)

### 2.2 라우트

- 사용자: `/`, `/search`, `/scan`, `/analysis`, `/product/:id`, `/comparison`, `/brand/:brandName`, `/profile`, `/login`, `/event/*` (`src/App.tsx:130-157`)
- 관리자(보호됨): `/admin` 하위 **10개** — dashboard, products, ingredients, unmatched-ingredients, users, diary, waitlist, settings, data-quality (`src/App.tsx:160-172`)

### 2.3 데이터베이스

- 마이그레이션 37개 (`supabase/migrations/`), 고유 테이블 **45개**
- `ENABLE ROW LEVEL SECURITY` 61회 · `CREATE POLICY` 95회
- MELIQ 대응 테이블
  - 규칙 엔진: `analysis_rules`, `analysis_engine_versions`, `canonical_analysis_rules`, `canonical_analysis_rule_evidence`
  - 결과 저장/이력: `analysis_results(score, grade, penalties, bonuses, warnings)`, `analysis_reports(analysis_json)`, `recent_views`, `comparisons`, `favorites`
  - 적합도: `compatibility_results`, `pet_allergy_profile`
  - 제품 DB: `products`, `product_ingredients`, `ingredients`, `canonical_ingredients`, `ingredient_synonyms`, `ingredient_allergen_map`, `nutritional_profiles`
  - 데이터 품질: `unmatched_ingredients`, `product_enrichment_queue`, `canonical_ingredient_review_queue`, `product_data_sources`
  - 운영: `admin_audit_log`, `app_settings`, `launch_waitlist`

### 2.4 룰 기반 분석 엔진 (클라이언트, 실제 동작 경로)

`src/analysis/` · `src/health/` · `src/utils/score.ts`

| 구현 | 근거 |
|---|---|
| 적합도 점수 + 사유 | `src/utils/score.ts:220 getRecommendationBreakdown(product, profile)` → `RecommendationBreakdown { allergyPenalty, allergyCautionPenalty, preferencePenalty, reasons[] }` |
| 감점 사유 문장 | `src/utils/score.ts:295-312` — "관련 가금류 교차반응 주의(...) · N점 감점" 등 |
| 등급 산출 | `src/utils/score.ts:21 gradeFromScore` · `:45 resolveDisplayVerdict` |
| 파이프라인 | `src/analysis/scoringPipeline.ts runScoringPipeline()` — 원재료 품질·기능성·영양공개수준·위험성분·ETF 신뢰등급·품종질환 |
| 원재료 사전 | `src/analysis/ingredientDictionary.ts` (47 KB) |
| 알레르기 계열 매칭 | `src/analysis/allergyFamilyMatcher.ts` (12 KB) |
| 질환 규칙 | `src/analysis/diseaseRules.ts` (18 KB) · `breedDiseaseEngine.ts` |
| 건강 우려 평가 | `src/health/evaluator.ts` (31 KB) |
| 회귀/결정성 테스트 | `src/analysis/determinism.test.ts` · `scoreRegression.test.ts` · `ruleEngine.test.ts` |

**서버측 점수 함수는 미연결.** `supabase/functions/personalized-score/index.ts` 헤더 주석이 직접 명시한다:
> "이 함수는 앱·랜딩 어디에서도 호출하지 않는다. 적합도 점수는 전적으로 클라이언트에서 계산해 화면에 쓴다."
→ 제안서에 "서버 추천 서비스 운영 중"이라고 쓰면 **거짓**. 기준 구현으로만 존재.

### 2.5 인증 · 권한

- 사용자: Supabase Auth — `signInWithPassword`, `signInWithOAuth`, Kakao (`src/lib/kakaoAuth.ts`)
- 관리자: **별도 인증 체계**
  - `src/lib/adminSession.ts` — 서버 발급 HMAC 서명 세션, `sessionStorage`만 사용, TTL 8시간, 만료 자가 정리
  - `src/pages/admin/AdminAuthGuard.tsx` — 새로고침 시에도 서버에 재검증(`verifyAdmin`)
  - 관리자 쓰기는 anon 클라이언트 금지 → `admin-write` Edge Function(service_role)만 경유 (`src/lib/supabase.ts:34`)
- Edge Functions: `admin-auth`, `admin-write`, `personalized-score`, `waitlist-signup`

### 2.6 제휴(affiliate)

- `products.coupang_product_id` (`supabase/migrations/20260411120000_add_coupang_link_to_products.sql`)
- `products.verification_status` / `verified_at` / `manufacturer_name` (`20260409093000_add_product_verification_and_affiliate_fields.sql`)
- **클릭 트래킹 테이블·이벤트는 없음.** → "Affiliate Click Tracking 구축 경험" 주장 불가.

### 2.7 분석(Analytics)

`gtag` / GA / PostHog / Amplitude / Mixpanel / Firebase **전부 미검출**(`package.json`, `index.html`, `src/`). → 비교표 `—`.

### 2.8 테스트

`src/` 하위 테스트 파일 **163개**. 특히 마이그레이션·정책 변경을 섀도우 실행으로 검증하는 하네스가 다수(`src/lib/phase2AliasResolver*`, `healthConcernScoreShadow*`, `productionReadOnly*`).

### 2.9 서비스 URL

`netlify.toml` 및 docs — `https://veroro-app.netlify.app`(사용자), `https://veroro-admin.netlify.app`(관리자, 도메인 경계로 `/admin` 분리)

---

## 3. acare = 세탁 서비스 앱

### 3.1 구성

| 단위 | 스택 | 경로 |
|---|---|---|
| 거래처 주문 앱 | Flutter (Android·iOS) | `lib/` — 화면 11개 |
| 관리자 웹 | React 19 + Vite 6 + react-router 8 | `admin-web/` — 화면 12개 |
| API 서버 | Express 5 + node-postgres + zod + jsonwebtoken | `server/src/` |
| 공용 계약 | OpenAPI + enum JSON | `contracts/` — `openapi.yaml` 2,133줄 |

`pubspec.yaml:2` — `에이케어 거래처 전용 세탁 주문 앱 (Android · iOS)`

### 3.2 데이터베이스

- SQL 마이그레이션 **24개** (`server/migrations/001_init.sql` … `024_cancellation_rejected_constraints.sql`)
- 테이블 29개. 주요: `orders`, `order_items`, `order_status_history`, `order_quotes`, `order_cancellations`, `order_sequences`, `deposit_ledger`, `client_balances`, `client_accounts`, `client_prices`, `charges`, `payment_reconciliations`, `payment_webhook_events`, `admins`, `admin_sessions`, `admin_login_logs`, `login_attempts`, `audit_logs`, `configuration_changes`, `delivery_policies`, `delivery_route_versions`, `delivery_holidays`, `print_batches`, `export_logs`, `products`, `service_status`, `global_settings`

### 3.3 상태 머신 · 이력

- `server/src/lib/orderStatus.ts:22` — `ORDER_STATUSES = ['PAYMENT_PENDING','CONFIRMED','DELIVERED','CANCELLED','PAYMENT_FAILED']`
- `:74` — `FULFILLMENT_STAGES = ['RECEIVED','WASHING','SHIPPING','DONE']` (접수 → 세탁 → 배송 → 완료)
- `:149` 전이표 — `PAYMENT_PENDING → CONFIRMED|PAYMENT_FAILED`, `CONFIRMED → DELIVERED|CANCELLED`, `DELIVERED → CONFIRMED`(되돌리기)
- `:106 DEPRECATED_STATUS_ALIASES` — 구버전 값 호환 매핑
- `server/src/services/orderTransition.ts` — **모든 상태 변경이 이 파일 한 곳을 지난다.**
  순서: 행 잠금(`FOR UPDATE`) → 소유권 확인 → `version` 확인(낙관적 동시성) → 허용 전이 확인 → 업무조건 확인 → 예치금 계정 잠금·원장 처리 → 상태 변경·이력 기록 → commit
- 멱등성: `orders.cancel_idempotency_key`, `005_charge_idempotency.sql`

### 3.4 역할 · 권한 (RBAC)

`server/src/auth/permissions.ts` — 서버가 정본, 프런트는 UX 캐시.

- 역할 **6개**: `SUPER_ADMIN`(최고관리자), `ORDER_MANAGER`(주문관리자), `PRODUCT_MANAGER`(상품관리자), `DELIVERY_STAFF`(배송담당자), `SETTLEMENT_MANAGER`(정산담당자), `VIEWER`(조회전용)
- 권한 **31개**: `dashboard.read`, `order.read/status/cancel/cancel.restore/status.revert/sort/bulk_deliver/export`, `vendor.read/write/export`, `ledger.read/export`, `payment.read/export/resync`, `product.read/write`, `delivery.read/write`, `print.read/export`, `stats.read/export`, `settings.read/write`, `audit.read`, `admin.manage`
- 역할 매트릭스 `MATRIX` 한 곳에서만 결정. 알 수 없는 역할은 **빈 배열(거부)**.
- 개인정보 대량 반출은 조회 권한과 분리(`vendor.export`, `order.export`)
- 프런트 가드: `admin-web/src/components/RequirePermission.tsx`, `ui/Can.tsx`, `App.tsx` 각 라우트

### 3.5 인증 보안

- `server/src/auth/sessionStore.ts` — 세션 토큰 `randomBytes(32)`, 저장은 **SHA-256 해시**, 비교는 `timingSafeEqual`
- `server/src/auth/loginPolicy.ts` — IP 단위 제한 + 계정 단위 잠금, 실패 응답은 계정 존재 여부와 무관하게 동일
- 화면 안내(로그인 페이지 실측): "비밀번호 5회 연속 오류 시 10분간 접속 제한", "30분간 활동 없으면 자동 로그아웃"

### 3.6 정산 · 결제

- `deposit_ledger` 기반 예치금 원장, `ledgerService.ts`, `depositService.ts`
- PG 연동: `server/src/services/pg/toss.ts`, `adapter.ts`, `provider.ts`
- 대사: `reconciliationService.ts`, `payment_reconciliations`, `payment_webhook_events`
- 통계: `statisticsService.ts` — "목록 요약과 같은 숫자가 나온다"를 설계 원칙으로 명시

### 3.7 반응형

`admin-web/e2e/responsive-smoke.mjs` — 실제 브라우저로 768/1024/1054/1280/1440 5개 폭에서 8가지 항목(문서 가로 밀림, 조작요소 이탈, 카드 접힘, 접근 불가 콘텐츠, 누를 수 없는 버튼, 표 내부 스크롤, 화면별 CTA 도달, 상태 필터 5종)을 측정. 브라우저를 못 띄우면 PASS가 아니라 종료코드 2(UNVERIFIED).

### 3.8 테스트

관리자 웹 38 · 서버 35 · Flutter 46.

### 3.9 URL

저장소 문서에 `acareadmin.netlify.app`, `acare-production.up.railway.app` 언급. 다만 **거래처 전용 비공개 시스템**이라 제안서 공개 URL로는 넣지 않는다(`netlify.toml`의 예시 값은 `example.com` 플레이스홀더).

---

## 4. 실행 결과

| 대상 | 설치 | 빌드 | 실행 | 캡처 |
|---|---|---|---|---|
| veroheart (Vite) | ✅ | ✅ `built in 1.15s` | ✅ :5190 | ✅ 7장 |
| acare `admin-web` (Vite) | ✅ | ✅ `built in 2.32s` | ✅ :5181/:5182 | ✅ 6장 |
| samduck `owner-erp` (Next 14) | ✅ | ✅ 전 라우트 프리렌더 | ✅ :3100 | ✅ 6장 |
| samduck 사용자앱 (Flutter) | — | — | ❌ Flutter SDK 없음 | ❌ |
| acare 주문앱 (Flutter) | — | — | ❌ Flutter SDK 없음 | ❌ |
| samduck `api` (Express) | — | — | ❌ 미실행 (Supabase 자격증명 필요) | ❌ |
| acare `server` (Express) | — | — | ❌ 미실행 (PostgreSQL 필요) | ❌ |

### 4.1 실행에 필요한데 없었던 것

- **Flutter / Dart SDK** — 컨테이너에 미설치. 두 모바일 앱 실행 불가.
- **PostgreSQL 인스턴스** — acare `server/` 구동에 필요(`server/.env.example`).
- **Supabase 자격증명** — samduck `api/`(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), veroheart(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  값을 추측하지 않았고, 운영 인스턴스에 접속하지 않았다.

### 4.2 각 화면을 어떤 데이터로 띄웠는가

| 프로젝트 | 방식 | 데이터 출처 |
|---|---|---|
| 학우너 | 제품에 내장된 **둘러보기(preview) 모드** (`?preview=1`) | `owner-erp/lib/preview/fixtures.ts` — 합성 픽스처. 쓰기 차단. |
| 세탁앱 (통계·상품·원장·배송) | 저장소 내장 **개발용 목 서버**(MSW, `VITE_ENABLE_MSW=true`) | `admin-web/src/mocks/fixtures.ts` — 저장소 자체 목 데이터 |
| 세탁앱 (주문관리 2장) | Playwright 네트워크 스텁 | 아래 4.3 참조 |
| VeRoRo | Playwright 네트워크 스텁(PostgREST 응답 모사) | 저장소의 `real_products_data.sql` / `real_ingredients_data.sql` 시드에서 추출한 제품 5종·원재료 20종 |

`.env.local` 파일 2개를 만들었으나 두 저장소 모두 `.gitignore` 대상이며, 커밋에 포함되지 않는다.
작업 후 `git status`로 두 저장소가 깨끗함을 확인했다(veroheart의 `package-lock.json`은 `git checkout`으로 되돌림).

### 4.3 발견한 실제 결함 — acare 개발용 목이 클라이언트와 어긋나 있다

세탁앱 관리자 웹의 주문관리 화면을 내장 MSW 목으로 띄우면 **런타임 오류로 목록이 통째로 죽는다.**

```
TypeError: Cannot read properties of undefined (reading 'includes')
    at toOrderRow (src/api/orderListView.ts:62)
```

- 원인: 클라이언트는 서버 정본 계약(`orderNo`, `businessId`, `shopName`, `bundleQuantity`, `deliveryDate`, `routePosition`, `supplyAmount`)으로 옮겨갔는데, `admin-web/src/mocks/handlers.ts`/`db.ts` 는 아직 화면 쪽 옛 이름(`no`, `vendorId`, `vendorName`, `bundles`, `dueDate`, `seq`, `amount.supply`)을 반환한다.
- `src/api/orderListView.ts:21-27` 주석이 바로 이 유형의 사고를 기록해 두고 있다("주문이 한 건이라도 있으면 실제 서버에서 터져 주문관리 화면이 통째로 죽었다"). 이번에는 반대 방향(목이 뒤처짐)으로 같은 어긋남이 남아 있다.
- 운영 코드가 아니라 **개발용 목만의 문제**이며, 목에 주문이 0건일 때는 드러나지 않는다.
- 이 때문에 주문관리 2장(`01-order-management.png`, `06-mobile-orders.png`)은 MSW 대신 **정본 계약(`AdminOrderListItem`, `src/api/types.ts:156`) 모양 그대로** 응답을 만들어 Playwright에서 주입해 촬영했다. 렌더링은 전부 앱 자신의 코드다.

→ 사용자가 직접 확인할 것: `admin-web/src/mocks/` 를 정본 계약에 맞춰 갱신하면 내장 목만으로 주문 화면을 볼 수 있다.

---

## 5. MELIQ 요구사항 ↔ 확인된 구축 경험

| MELIQ 요구 | 학우너 | VeRoRo | 세탁앱 |
|---|---|---|---|
| 회원가입/로그인/사용자 데이터 | ● Supabase Auth + Kakao/Apple, `users.roles[]` | ● Supabase Auth + Kakao, `pets`/`pet_allergy_profile` | ● 자체 세션(SHA-256 해시·잠금정책) |
| Mobile-first UI | ● Flutter 앱 | ● 모바일 우선 웹 + Capacitor | ● Flutter 앱 + 반응형 관리자 웹 |
| 사용자 입력 기반 판정 | ● 태그·설문·예산·위치 | ● 반려동물 프로필·알레르기 | △ 주문 입력(판정 아님) |
| Product DB | ● `academy_programs`/`course_options` | ● `products`+`ingredients` 정규화 | ● `products`+`client_prices` |
| 외부 API | ● Kakao·Naver Place·지오코딩 | — | ● Toss PG |
| 규칙 기반 추천 모듈 | ● `recommendation.service.ts` 가중치 엔진 | ● `scoringPipeline`/`score.ts` 룰 엔진 | — |
| Risk Filter | △ 예산·거리 필터 | ● `risk_level` danger/caution + `has_risk_factors` | — |
| Fit Score | ● `matchScore` 0~100 + `matchLabel` | ● 적합도 % + 등급 A~F | — |
| Data Confidence | ● 리뷰 80% 검증 태그 보너스 | ● `verification_status`, 정보완성도 %, "프로필 미등록" 표기 | ● 통계 정합성 원칙 |
| Why it fits / What to watch | ● `generateReason`/`generateTagReason` | ● `reasons[]` 감점 사유 | — |
| 결과 저장 / History | ● `ai_recommendations` | ● `analysis_results`/`analysis_reports`/`recent_views` | ● `order_status_history` |
| Affiliate Click Tracking | — | △ 링크 필드만(`coupang_product_id`), 클릭 집계 없음 | — |
| Feedback | ● `reviews`+구조화 응답 | ● `reviews` | △ 없음 |
| Analytics | ● Firebase Analytics + 운영 스냅샷 | — | ● `statisticsService` |
| Admin Dashboard | ● ERP 126화면 | ● 관리자 10화면 | ● 관리자 12화면 |
| Product CRUD | ● 수업상품·요금 | ● 제품/원재료 CRUD | ● 상품·단가시트 |
| Auth / Role / Permission | ● 8역할 + RLS 459정책 | △ 관리자/사용자 2계층 | ● 6역할 × 31권한 매트릭스 |
| Backend / API | ● Express 33라우트 + Next 300라우트 | △ Supabase + Edge Function 4종 | ● Express 5 + OpenAPI 2,133줄 |
| 관계형 DB | ● 222테이블/310마이그레이션 | ● 45테이블/37마이그레이션 | ● 29테이블/24마이그레이션 |
| 사용자↔관리자 데이터 연결 | ● 앱 노출 제어·상담 칸반 | ● 관리자 등록→앱 노출(`is_visible`) | ● 앱 주문→관리자 처리→상태 반영 |

범례: ● 확인 · △ 부분 확인 · — 확인 안 됨

---

## 6. 제안서에서 의도적으로 제외한 주장

| 쓰지 않은 문장 | 이유 |
|---|---|
| 사용자 수·MAU·매출·고객사 수 | 코드/문서에서 확인 불가 |
| "VeRoRo 서버측 추천 API 운영" | `personalized-score`는 미연결(코드 주석이 명시) |
| "제휴 클릭 트래킹 구축" | 링크 필드만 있고 클릭 집계 테이블·이벤트 없음 |
| "VeRoRo Analytics 연동" | 어떤 분석 SDK도 미검출 |
| "세탁앱 다국어/추천" | 해당 구현 없음 |
| "학우너 전국 7만 학원 데이터 보유" | `pubspec.yaml` 설명 문구일 뿐, 데이터 규모를 코드로 확인 불가 |
| 모바일 앱 실행 화면 | Flutter SDK 부재로 실행·캡처하지 못함 |
| 스크린샷을 "운영 데이터"라고 표기 | 전부 픽스처/목/로컬 시드 |
