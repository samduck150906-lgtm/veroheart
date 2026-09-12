# FACT CHECK

MELIQ 제안 자료(`MELIQ_SIMILAR_PROJECTS.md` / `.html`, `MELIQ_CASE_STUDY_SUMMARY.md`, `MELIQ_EMAIL_CASES.md`)에 들어간
모든 주요 주장의 실제 코드 근거. 근거를 찾지 못한 문장은 최종 자료에서 삭제했다(§4).

- 검증일: 2026-09-12
- 커밋: `samduck` `cac4b12` · `veroheart` `2aad5fc` · `acare` `8a96f40`
- 상태: **확인** / **부분확인** / **제외**

---

## 1. 학우너 (samduck)

| 제안자료 표현 | 실제 근거 파일 | 상태 |
|---|---|---|
| Flutter 사용자 앱, Dart 소스 398개 파일 | `lib/**/*.dart` (파일 수 집계) | 확인 |
| REST API `/api/v1` 라우트 모듈 33개 | `api/src/routes/index.ts` (import·`app.use` 33건), `api/src/routes/*.routes.ts` | 확인 |
| Next.js 14 ERP 화면 126개 · 서버 API 라우트 300개 | `owner-erp/app/**/page.tsx` 126개, `owner-erp/app/**/route.ts` 300개 | 확인 |
| 테이블 222개 / 마이그레이션 310개 | `supabase/migrations/*.sql` 310개, `CREATE TABLE` 고유명 222개 | 확인 |
| RLS 적용 237회 · 정책 459건 | `ENABLE ROW LEVEL SECURITY` 237회, `CREATE POLICY` 459회 (`supabase/migrations/*.sql`) | 확인 |
| 8개 역할 (super_admin·admin·owner·staff·teacher·student·parent·operator) | `supabase/migrations/20260401060000_migrate_role_to_array.sql`, `20260606140000_add_super_admin_role_to_users_check.sql`, `20260519010000_staff_role_rls.sql` | 확인 |
| Bearer 토큰 검증 + `users.roles text[]` 매핑 | `api/src/middleware/auth.middleware.ts` (`authMiddleware`, `toRoles`) | 확인 |
| 역할 가드 미들웨어 | `api/src/middleware/auth.middleware.ts` (`requireRole('admin','super_admin')`, `requireRole(...OWNER_ROLES)`), `api/src/middleware/operator.middleware.ts` | 확인 |
| Kakao·Apple 소셜 로그인 (SHA-256 nonce) | `pubspec.yaml` (`kakao_flutter_sdk_user`, `sign_in_with_apple`, `crypto` — 주석에 `signInWithIdToken('apple')` 명시) | 확인 |
| **가중치 기반 추천 엔진 (6개 축)** | `api/src/services/recommendation.service.ts:154` `WEIGHTS = { distance .25, subjectMatch .25, goalFit .20, classTypeFit .10, budgetFit .10, reviewScore .10 }` | 확인 |
| **태그 유사도 매칭 (Jaccard·코사인)** | 같은 파일 `:785 calcJaccardSimilarity`, `api/src/lib/vector-scoring.ts` (`tagsToVector`/`cosineSimilarity`/`tagCosineScore`) | 확인 |
| **0~100 정규화 점수 + 사용자 라벨** | 같은 파일 `:138 matchScore`, `:139 matchLabel` ("우리 아이와 XX% 일치") | 확인 |
| **추천 사유 문장 자동 생성 (Why it fits)** | 같은 파일 `:1074 generateReason`, `:1018 generateTagReason` | 확인 |
| **항목별 점수 분해 반환** | 같은 파일 `:81 interface ScoreBreakdown`, `:329 calculateScores` | 확인 |
| **리뷰 80% 검증 임계값 (Data Confidence)** | 같은 파일 `:914 calcReviewTagBonus`, `:164 TAG_WEIGHTS.reviewTagBonus` | 확인 |
| 추천 결과 저장 테이블 | `supabase/migrations/20250306200001_add_tag_system_and_profiles.sql` — `ai_recommendations(score, reason, matched_tags, expires_at)` | 확인 |
| 추천 API 노출 | `api/src/routes/index.ts:63` `/api/v1/recommendations`, `api/src/routes/recommendation.routes.ts` | 확인 |
| 추천 로직 테스트 보유 | `api/src/lib/vector-scoring.test.ts`, `api/src/services/matching.service.test.ts` | 확인 |
| ERP 세션·보안 헤더·플랜 접근제어 | `owner-erp/middleware.ts` (`@supabase/ssr`, `applySecurityHeaders`, `hasFullErpAccess`) | 확인 |
| Toss Billing 결제·구독 | `owner-erp/.env.example` (`TOSS_BILLING_*`), `lib/features/payment/presentation/widgets/payment_checkout_webview.dart`, 테이블 `payments`/`subscriptions`/`billing_schedules`/`user_billing_keys` | 확인 |
| 에스크로·세금계산서 | 테이블 `escrow_transactions`, `escrow_settlements`, `tax_invoices`; `api/src/routes/escrow.routes.ts` | 확인 |
| Firebase Analytics | `lib/services/analytics_service.dart`, `pubspec.yaml` (`firebase_analytics`) | 확인 |
| 운영자 대시보드 스냅샷 | 테이블 `operator_dashboard_snapshot`, `operator_mau_snapshot`, `platform_events` | 확인 |
| 상담 칸반 | `supabase/migrations/20260717050000_inquiries_kanban_status_fix.sql`, `owner-erp/app/dashboard/inquiries/page.tsx` | 확인 |
| 알림톡·SMS·수신거부 | `owner-erp/package.json` (`solapi`), 테이블 `alimtalk_templates`, `message_opt_outs`, `notification_dispatch_log` | 확인 |
| 배포: Netlify · Railway · Docker | `netlify.toml`, `owner-erp/netlify.toml`, `api/railway.json`, `Dockerfile` | 확인 |
| 서비스 URL `hakwooner.kr` / `owner.hakwooner.kr` | `owner-erp/.env.example`, `netlify.toml`, `owner-erp/netlify.toml` | 확인 |
| 테스트 보유 (Flutter 82 · API 45 · ERP 43) | `test/**/*_test.dart` 82, `api/src/**/*.test.ts` 45, `owner-erp/**/*.test.ts*` 43 | 확인 |
| 스크린샷이 합성 픽스처 데이터임 | `owner-erp/lib/preview/constants.ts` (`PREVIEW_ACADEMY_ID` 예약 UUID, `PREVIEW_OWNER_EMAIL='preview@hakwooner.kr'`), `lib/preview/fixtures.ts`, `lib/preview/fake-client.ts` | 확인 |
| 캡처 화면에서 연락처가 마스킹됨 | 실행 화면 실측 (`010-****-3340` 형태) | 확인 |

### 학우너 — 제외한 주장

| 검토했으나 제외 | 이유 |
|---|---|
| "전국 7만 학원 데이터 보유" | `pubspec.yaml:2` 설명 문구에만 존재. 실제 데이터 규모를 코드·스키마로 확인 불가 |
| 사용자 수·MAU·매출·학원 고객사 수 | 코드·문서 어디에도 없음 |
| 모바일 앱 실행 화면 캡처 | Flutter SDK 부재로 실행 불가 |

---

## 2. VeRoRo (veroheart)

| 제안자료 표현 | 실제 근거 파일 | 상태 |
|---|---|---|
| React 19 + TypeScript + Vite 8 | `package.json` (`react ^19.2.4`, `vite ^8.0.1`, `typescript ~5.9.3`) | 확인 |
| 사용자 라우트 (홈·탐색·스캔·분석·상세·비교·브랜드·프로필) | `src/App.tsx:130-157` | 확인 |
| 관리자 콘솔 10개 화면 | `src/App.tsx:160-172` (`/admin` 하위 index·products·ingredients·unmatched-ingredients·users·diary·waitlist·settings·data-quality + 404) | 확인 |
| 테이블 45개 / 마이그레이션 37개 / RLS 정책 95건 | `supabase/migrations/*.sql` 37개, `CREATE TABLE` 고유명 45개, `CREATE POLICY` 95회, `ENABLE ROW LEVEL SECURITY` 61회 | 확인 |
| 제품·원재료 정규화 스키마 | 테이블 `products`, `ingredients`, `product_ingredients`, `ingredient_synonyms`, `ingredient_allergen_map`, `nutritional_profiles`, `canonical_ingredients` | 확인 |
| **룰 기반 분석 파이프라인** | `src/analysis/scoringPipeline.ts` (`runScoringPipeline` — 원재료 품질·기능성·영양공개수준·위험성분·ETF 신뢰등급·품종질환) | 확인 |
| **적합도 점수 + 감점 사유 반환** | `src/utils/score.ts:220 getRecommendationBreakdown` → `RecommendationBreakdown { allergyPenalty, allergyCautionPenalty, preferencePenalty, reasons[] }` | 확인 |
| **감점 사유 문장화 (Why it fits / What to watch)** | `src/utils/score.ts:295-312` ("관련 가금류 교차반응 주의(...) · N점 감점" 등) | 확인 |
| **A~F 등급 · 판정 문구 환산** | `src/utils/score.ts:21 gradeFromScore`, `:45 resolveDisplayVerdict` | 확인 |
| 점수 UI 연결 | `src/components/AnalysisBadges.tsx`, `src/components/AnalysisSummaryHeader.tsx`, `src/components/pdp/gradeMeta.ts` | 확인 |
| 원재료 사전 · 알레르기 계열 매칭 · 질환 규칙 | `src/analysis/ingredientDictionary.ts` (47KB), `allergyFamilyMatcher.ts` (12KB), `diseaseRules.ts` (18KB), `breedDiseaseEngine.ts`, `src/health/evaluator.ts` (31KB) | 확인 |
| **Risk Filter (위험 성분 등급)** | `src/analysis/scoringPipeline.ts` (`riskLevel === 'danger'` 집계, `dangerIngredients`), 마이그레이션 `20260911103000_sync_product_risk_factors.sql` (`products.has_risk_factors`) | 확인 |
| **Data Confidence (검수 상태·정보 완성도)** | `supabase/migrations/20260409093000_add_product_verification_and_affiliate_fields.sql` (`verification_status CHECK IN ('pending','reviewed','verified')`), 관리자 화면 '정보완성도 %' 실측 | 확인 |
| 프로필 미등록 시 그대로 표기 | 실행 화면 실측 (분석 결과 화면 '알레르기 — 프로필 미등록') | 확인 |
| 결과 저장 / History | 테이블 `analysis_results(score, grade, penalties, bonuses, warnings)`, `analysis_reports(analysis_json)`, `recent_views`, `comparisons`, `favorites` | 확인 |
| 규칙 버전 관리 | 테이블 `analysis_rules`, `analysis_engine_versions`, `canonical_analysis_rules`, `canonical_analysis_rule_evidence` | 확인 |
| 회귀·결정성 테스트 | `src/analysis/determinism.test.ts`, `scoreRegression.test.ts`, `ruleEngine.test.ts` (전체 테스트 파일 163개) | 확인 |
| 관리자 인증이 사용자 인증과 분리 | `src/lib/adminSession.ts` (HMAC 서명 세션, `sessionStorage`, TTL 8시간), `src/pages/admin/AdminAuthGuard.tsx` (`verifyAdmin` 재검증) | 확인 |
| 관리자 쓰기는 Edge Function만 경유 | `src/lib/supabase.ts:34 adminWrite` (주석: "관리자 쓰기를 anon 클라이언트로 직접 하지 말 것"), `supabase/functions/admin-write/` | 확인 |
| Edge Function 4종 | `supabase/functions/` — `admin-auth`, `admin-write`, `personalized-score`, `waitlist-signup` | 확인 |
| 관리자 등록 → 앱 노출 제어 | `supabase/migrations/20260911090000_add_product_visibility.sql` (`products.is_visible`), `src/lib/adminApi.ts:597 setProductVisibility`, 사용자 조회 시 `.eq('is_visible', true)` (`src/lib/supabase.ts:219`) | 확인 |
| 미매칭 성분 큐 / 제품 보강 큐 | 테이블 `unmatched_ingredients`, `product_enrichment_queue`, `canonical_ingredient_review_queue`; `src/pages/admin/AdminUnmatched.tsx` | 확인 |
| 관리자 감사 로그 | 테이블 `admin_audit_log` (`20260728140000_admin_console_operations.sql`) | 확인 |
| Capacitor iOS/Android 패키징 | `capacitor.config.ts` (`appId: com.veroro.app`), `android/`, `ios/` | 확인 |
| 모바일 우선 반응형 | `src/styles/*.css` 미디어쿼리 (`max-width: 399px`, `540px`, `min-width: 420px`, `640px`) | 확인 |
| 관리자 도메인 경계 분리 | `netlify.toml` (공개 도메인의 `/admin` → 404), `netlify/edge-functions/admin-domain-boundary.ts` | 확인 |
| 서비스 URL `veroro-app.netlify.app` | `netlify.toml` | 확인 |
| 제휴 링크 필드 보유 (클릭 집계는 없음) | `supabase/migrations/20260411120000_add_coupang_link_to_products.sql` (`coupang_product_id`) — 클릭 이벤트 테이블 없음 | 부분확인 |
| Backend/API 비교표 `△` | 전용 API 서버 없음. Supabase + Edge Function 4종으로 구성 | 확인 |
| Role/Permission 비교표 `△` | 사용자/관리자 2계층만. 세분 역할 테이블·매트릭스 없음 | 확인 |
| Workflow/Status 비교표 `△` | 검수 상태·보강 큐는 있으나 상태 전이표·상태 머신은 없음 | 확인 |

### VeRoRo — 제외한 주장

| 검토했으나 제외 | 이유 |
|---|---|
| **"서버측 개인화 점수 API 운영"** | `supabase/functions/personalized-score/index.ts` 헤더 주석이 직접 명시: *"이 함수는 앱·랜딩 어디에서도 호출하지 않는다. 적합도 점수는 전적으로 클라이언트에서 계산해 화면에 쓴다."* → 기준 구현으로만 존재. 자료에는 클라이언트 룰 엔진으로만 기술 |
| **"Affiliate Click Tracking 구축"** | 링크 필드(`coupang_product_id`)만 존재. 클릭 집계 테이블·이벤트·API 없음 → 자료에 "신규 구현 범위"로 명시 |
| **"Analytics 연동"** | `gtag`/GA/PostHog/Amplitude/Mixpanel/Firebase 전부 미검출(`package.json`, `index.html`, `src/`) → 비교표 `—` |
| 사용자 수·다운로드 수·매출 | 코드·문서에 없음 |
| 커머스(장바구니·주문) 기능 | `orders`/`cart_items` 테이블은 있으나 `/cart` 라우트가 `/`로 리다이렉트(`src/App.tsx:144`) → 운영 기능으로 기술하지 않음 |

---

## 3. 세탁 서비스 앱 (acare)

| 제안자료 표현 | 실제 근거 파일 | 상태 |
|---|---|---|
| 거래처 전용 Flutter 주문 앱, 화면 11개 | `pubspec.yaml:2` ("에이케어 거래처 전용 세탁 주문 앱"), `lib/screens/` 11개 | 확인 |
| 관리자 웹 12개 화면 | `admin-web/src/App.tsx` (login + dashboard·orders·orders/:id·vendors·ledger·pg·products·delivery·print·stats·settings) | 확인 |
| Express 5 API 서버 | `server/package.json` (`express ^5.2.1`, `pg`, `zod`, `jsonwebtoken`) | 확인 |
| 테이블 29개 / 마이그레이션 24단계 | `server/migrations/001_init.sql` … `024_cancellation_rejected_constraints.sql`, `CREATE TABLE` 29개 | 확인 |
| OpenAPI 공용 계약 2,133줄 | `contracts/openapi.yaml` (2,133줄), `contracts/enums/*.json` 6종, `contracts/schemas/` | 확인 |
| **주문 상태 5종** | `server/src/lib/orderStatus.ts:22` `ORDER_STATUSES = ['PAYMENT_PENDING','CONFIRMED','DELIVERED','CANCELLED','PAYMENT_FAILED']` | 확인 |
| **이행 단계 4종 (접수·세탁·배송·완료)** | 같은 파일 `:74` `FULFILLMENT_STAGES = ['RECEIVED','WASHING','SHIPPING','DONE']`, `:85 FULFILLMENT_STAGE_LABEL` | 확인 |
| **허용 전이표** | 같은 파일 `:149` (`PAYMENT_PENDING → CONFIRMED\|PAYMENT_FAILED`, `CONFIRMED → DELIVERED\|CANCELLED`, `DELIVERED → CONFIRMED`) | 확인 |
| **모든 상태 변경이 단일 통로 경유** | `server/src/services/orderTransition.ts` 헤더 주석 + 구현 (행 잠금 `FOR UPDATE` → 소유권 → version → 전이 → 업무조건 → 예치금 원장 → 상태·이력 → commit) | 확인 |
| 낙관적 동시성 (version) | `server/migrations/004_order_version.sql`, `orderTransition.ts` (`OrderLockRow.version`) | 확인 |
| 멱등성 키 | `server/migrations/005_charge_idempotency.sql`, `orders.cancel_idempotency_key` | 확인 |
| **역할 6종 × 권한 31종 매트릭스** | `server/src/auth/permissions.ts` (`ROLES` 6개, `PERMISSIONS` 31개, `MATRIX`) | 확인 |
| 서버가 권한 판정 정본 | 같은 파일 주석 ("권한 판정의 진실은 언제나 서버다"), `admin-web/src/App.tsx` 주석 ("실제 차단은 언제나 서버가 한다") | 확인 |
| 알 수 없는 역할은 거부 | `server/src/auth/permissions.ts` `permissionsOf()` — `isRoleCode` 아니면 빈 배열 | 확인 |
| **대량 반출 권한 분리** | 같은 파일 — `vendor.export`, `order.export`, `ledger.export`, `payment.export`, `stats.export`, `print.export` (주석에 분리 이유 명시) | 확인 |
| 프런트 권한 가드 | `admin-web/src/components/RequirePermission.tsx`, `src/components/ui/Can.tsx`, `src/App.tsx` 라우트별 `permission` 지정 | 확인 |
| 세션 토큰 해시 저장 · 상수시간 비교 | `server/src/auth/sessionStore.ts` (`randomBytes(32)`, `createHash('sha256')`, `timingSafeEqual`) | 확인 |
| IP·계정 단위 로그인 제한과 잠금 | `server/src/auth/loginPolicy.ts`, 테이블 `login_attempts`, `admin_login_logs` | 확인 |
| "5회 실패 시 10분 제한 / 30분 유휴 자동 로그아웃" | 로그인 화면 실측 문구 + `server/src/auth/loginPolicy.ts` | 확인 |
| 주문 상태 이력 | 테이블 `order_status_history` (`server/migrations/`) | 확인 |
| 감사 로그·설정 변경 이력·반출 로그 | 테이블 `audit_logs`, `configuration_changes`, `export_logs`; `server/src/services/auditService.ts` | 확인 |
| 예치금 원장 (거래유형별) | 테이블 `deposit_ledger`, `client_balances`; `server/src/services/ledgerService.ts`, `depositService.ts`; `contracts/enums/ledger-entry-type.json` | 확인 |
| Toss PG 연동 · 웹훅 · 대사 | `server/src/services/pg/toss.ts`, `adapter.ts`, `provider.ts`, `reconciliationService.ts`; 테이블 `payment_reconciliations`, `payment_webhook_events`, `charges` | 확인 |
| 배송 동선 정렬 · 거래처별 마감 시각 | 테이블 `delivery_policies`, `delivery_route_versions`, `delivery_holidays`; `server/src/services/deliveryPolicyService.ts`; 권한 `order.sort` | 확인 |
| 기간별 통계 · 엑셀 반출 | `server/src/services/statisticsService.ts`, `exportService.ts`, `reportFilters.ts` | 확인 |
| 통계와 목록 요약이 같은 숫자 | `server/src/services/statisticsService.ts` 헤더 주석 ("목록 요약과 같은 숫자가 나온다") + `reportFilters.ts` 공유 | 확인 |
| 5개 폭 반응형 자동 검사 (768·1024·1054·1280·1440) | `admin-web/e2e/responsive-smoke.mjs` (`VIEWPORTS`, 검사 8종, 실패 시 종료코드 2) | 확인 |
| 상품·단가시트 CRUD | `admin-web/src/pages/ProductsPage.tsx`, `server/src/services/productService.ts`, 테이블 `products`, `client_prices` | 확인 |
| 배포: Netlify · Railway · Docker Compose | `netlify.toml`, `docker-compose.staging.yml`, `docs/release/` | 확인 |
| 테스트 (관리자 38 · 서버 35 · Flutter 46) | `admin-web/src/**/*.test.ts*` 38, `server/**/*.test.ts` 35, `test/`·`integration_test/` 46 | 확인 |

### 세탁앱 — 제외한 주장

| 검토했으나 제외 | 이유 |
|---|---|
| 공개 서비스 URL | `netlify.toml`은 `example.com` 플레이스홀더. 저장소 문서에 내부 주소(`acareadmin.netlify.app`, `acare-production.up.railway.app`)가 있으나 거래처 전용 비공개 시스템이라 대외 제안서에 넣지 않음 |
| 거래처 수·주문량·매출 | 코드·문서에 없음 |
| 추천·개인화 기능 | 해당 구현 없음. 비교표·본문 모두 `—` 처리 |
| Feedback(리뷰) 기능 | 해당 구현 없음 |
| 모바일 주문 앱 실행 화면 | Flutter SDK 부재로 실행 불가. 모바일 캡처는 관리자 웹을 390px 폭에서 촬영한 것이며 본문에 그렇게 명시 |

---

## 4. 자료 전반에 적용한 원칙

| 원칙 | 적용 결과 |
|---|---|
| 코드에 없는 기능은 쓰지 않는다 | §1~3 '제외한 주장' 표에 13건 기록 |
| 성과·사용자 수·매출·고객사 규모는 확인 안 되면 쓰지 않는다 | 3개 프로젝트 모두 해당 수치 전면 제외 |
| 추천 알고리즘이 없으면 추천 경험이라 하지 않는다 | 세탁앱은 추천 `—`로 명시. 학우너·VeRoRo는 **실제 구현이 확인되어** 기재 (근거: `recommendation.service.ts`, `scoringPipeline.ts`/`score.ts`) |
| `.env` 값·API Key·Secret·Token·DB Password 미출력 | 본 자료 및 캡처 어디에도 없음. `.env.example`은 **키 이름만** 확인 |
| Production DB 무변경 | 운영 DB에 접속하지 않음. 실행은 전부 로컬 + 저장소 자체 픽스처/목/시드 |
| 개인정보 미노출 | 캡처는 전부 합성 픽스처. 학우너 화면은 제품이 연락처를 자체 마스킹(`010-****-3340`) |
| 저장소 오염 방지 | 산출물은 `meliq-portfolio/`에만 생성. 작업 후 `git status`로 3개 저장소 clean 확인(`veroheart`의 `package-lock.json`은 `git checkout`으로 복원). 생성한 `.env.local` 2개는 모두 `.gitignore` 대상 |

---

## 5. 캡처 화면의 데이터 출처 (전 19장)

| 폴더 | 장수 | 데이터 출처 | 개인정보 |
|---|---|---|---|
| `screenshots/hakwooner/` | 6 | 제품 내장 둘러보기(preview) 모드 — `owner-erp/lib/preview/fixtures.ts` 합성 픽스처, 쓰기 차단 | 없음 (합성 + 제품 자체 마스킹) |
| `screenshots/veroro/` | 7 | 저장소 시드 SQL(`real_products_data.sql`, `real_ingredients_data.sql`)에서 추출한 제품 5종·원재료 20종을 로컬 스텁으로 주입 | 없음 (제품 공개 정보) |
| `screenshots/acare/` | 6 | 4장은 저장소 내장 개발용 목(MSW, `admin-web/src/mocks/`), 2장(주문관리)은 정본 계약 `AdminOrderListItem`(`admin-web/src/api/types.ts:156`) 모양의 로컬 스텁 | 없음 (가상 거래처명) |

> 세탁앱 주문관리 2장에 내장 목을 쓰지 못한 이유는 `ANALYSIS.md` §4.3 참조
> (내장 목이 클라이언트의 정본 계약보다 뒤처져 `orderListView.ts:62`에서 런타임 오류 발생 — 실제 결함이며 사용자 확인 필요).
> 렌더링은 모든 경우에 앱 자신의 코드이며, 데이터만 로컬에서 주입했다.
