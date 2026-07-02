# 코드 검증·디버깅 보고서 (VeRoRo / veroheart)

작성일: 2026-07-02
브랜치: `claude/code-validation-debugging-xggn5b`
대상: `src/` 웹 앱(React 19 + TypeScript + Vite) 및 주변 서브프로젝트

---

## 1. 요약 (TL;DR)

| 항목 | 시작 상태 | 종료 상태 |
|------|-----------|-----------|
| 타입체크 `tsc -b` | ✅ 통과 | ✅ 통과 |
| 테스트 `vitest` | ✅ 52/52 | ✅ 52/52 |
| 프로덕션 빌드 `vite build` | ✅ 성공 | ✅ 성공 |
| ESLint (`npm run lint`) | 117 errors | **0 errors** ✅ |
| `@ts-nocheck` (src/) | 15개 파일 | **0** |
| 브라우저 스모크(헤드리스 Chromium) | — | **전 라우트 렌더 확인** ✅ |

**핵심 결과**
- 라이브(실제 배포되는) 앱에서 **실제 런타임 크래시 버그 1건**을 찾아 수정했습니다. (`Detail` 페이지의 조건부 Hook 호출)
- **끊어져 있던 네비게이션 5건 복구**: 랭킹/로그인/브랜드/이벤트/성향퀴즈 페이지가 완성돼 있었으나 라우트가 없어
  하단 내비 "랭킹" 탭·로그인 버튼 등 링크가 깨져 있던 것을 라우팅 연결로 수정(4.e).
- **법적 페이지 이중 서빙 버그 수정(§8)**: `/terms`·`/privacy`·`/refund`가 접근 경로에 따라 서로 다른 문서를
  보여주던 것을, 정적 HTML을 삭제해 React 정본으로 일원화.
- 라이브 코드의 린트 오류를 전부 정리하고, 저장소 전체 `npm run lint`을 **0 errors**로 만들었습니다.
- **헤드리스 브라우저 스모크 테스트**로 전 라우트가 런타임 에러 없이 렌더됨을 확인(§8).
- **가장 큰 구조적 문제 발견**: `src/` 파일의 상당수가 라우팅/임포트되지 않는 **dead/미연결 파일**이며, 그 중 15개는 `// @ts-nocheck` 로 **수십 개의 실제 컴파일 에러를 숨기고** 있었습니다. 이 파일들은 배포 번들에 포함되지 않기 때문에 지금까지 빌드가 통과했습니다.

---

## 2. 검증 방법

`tsc -b`(타입) · `vitest`(테스트) · `vite build`(빌드) · `eslint`(정적분석)을 기준선으로 잡고,
`src/App.tsx`의 라우팅과 import 그래프를 추적해 **라이브 파일 vs 고아 파일**을 구분한 뒤 파일별로 순차 점검했습니다.

라이브 진입점: `main.tsx → App.tsx`
라우팅되는 페이지: `Home, Search, Auth, Profile, Comparison, Cart, Detail, Terms, Privacy, Refund`
관리자: `AdminAuthGuard → AdminLayout → {AdminDashboard, AdminProducts, AdminIngredients, AdminSettings}`

---

## 3. 수정한 실제 버그 (라이브 코드)

### 3.1 🔴 [심각] `Detail.tsx` — 조건부 Hook 호출 (런타임 크래시 위험)
`useState(selectedIngredient)` 가 두 개의 조기 `return`(로딩 중 / 제품 없음) **뒤에** 선언되어 있었습니다.
React의 Rules of Hooks 위반으로, 제품이 로드된 렌더와 로드 안 된 렌더 간 Hook 호출 순서가 달라져
`Rendered fewer hooks than expected` 오류로 페이지가 깨질 수 있었습니다.
→ Hook 선언을 다른 Hook들과 함께 컴포넌트 상단으로 이동, `any` 타입도 제거.

### 3.2 🟠 [중간] `AdminAuthGuard.tsx` — 마운트 이펙트 + 로딩 깜빡임
`useEffect`에서 선언 이전의 `checkAuth`를 참조(변수 접근 순서 경고)하고, 세션 확인이 동기 작업임에도
`isLoading` 로딩 화면을 잠깐 노출했습니다.
→ `useState`의 lazy initializer로 세션스토리지를 마운트 시 **동기 검증**하도록 변경. 불필요한 이펙트·로딩 화면 제거.

### 3.3 코드 정리 (라이브 파일, 동작 불변)
- `lib/supabase.ts`: 사용되지 않는 중복 `mapProduct`(any 기반, `mapProductFromSupabaseRow`로 대체됨) 제거.
- `store/useStore.ts`: 리얼타임 채널 타입을 `any` → `RealtimeChannel`.
- `AdminIngredients / AdminProducts / Search`: 표준사료 데이터·`catch` 절의 `any` 제거(타입 지정), 미사용 `TextAreaField` 제거.
- `Detail.tsx`: 죽은 `VetBadge` / `getVetComment` 및 미사용 import/변수 제거.
- `ThemeProvider.tsx`: provider와 co-locate된 `useTheme` 훅에 fast-refresh 규칙 주석 처리(런타임 영향 없음).

> 위 수정 후 타입체크·테스트(52)·빌드 모두 green. 커밋: `fix: resolve React hooks bug and clean up live app lint`.

---

## 4. 🔴 미배포 Dead Code — 조치 완료

**사용자 결정: "깨진 파일 삭제 + 필수만 연결".** 아래대로 처리했습니다.

### 4.a 삭제한 깨진 파일 (15개, `@ts-nocheck`로 컴파일 에러 은닉)
`pages/`: `ScanResult, AnalysisResult, Scanner, Community, CommunityPost, IngredientDictionary,
Membership, PetProfile, KnowledgeIngredients, KnowledgeNutrients`
`components/`: `ScannerScreen, FeedingGuideCalculator, AnalysisSummaryHeader, IngredientList, PetProfileForm`
→ 전부 라우팅/임포트되지 않아 **배포 앱에 영향 없음**. 삭제 후 타입체크·테스트(52)·빌드 모두 green.

### 4.b 라우팅에 연결한 필수 파일 (3개)
- `ErrorBoundary` → `main.tsx`에서 `<App/>`을 감싸도록 연결(전역 에러 화면, 흰 화면 방지).
- `NotFound` → Layout 그룹에 `path="*"` 404 라우트로 연결.
- `AuthCallback` → `/auth/callback` 라우트로 연결(`Auth.tsx`의 OAuth 리다이렉트 주석과 일치. 단, 현재
  `signInWithKakao`는 스텁이므로 실제 OAuth 구현 시 바로 동작하도록 대비).

### 4.c 참고 — 삭제 당시 은닉돼 있던 실제 컴파일 에러 (기록용)
아래는 삭제된 파일들이 `@ts-nocheck` 아래 숨기고 있던 문제로, 향후 유사 파일 작성 시 참고.

| 파일 | 숨겨진 주요 문제 |
|------|------------------|
| `pages/ScanResult.tsx` | **`useState`/`useEffect`를 import하지 않음** → 렌더 즉시 크래시. `hasPetProfile` 중복 선언. |
| `pages/AnalysisResult.tsx` | `recharts` 미설치, `gradeFromScore` 미존재, `selectedProduct` 미정의, 변수 다중 재선언(머지 사고 흔적), 미존재 컴포넌트 참조. |
| `pages/Scanner.tsx` | 미존재 모듈 `../components/ImageCropScreen`, `../analysis/ocr`, `getProductByBarcode` import. |
| `pages/CommunityPost.tsx` | `getCommunityPost` 등 존재하지 않는 supabase export 8종 import. |
| `pages/Community.tsx` | `Post`, `INITIAL_POSTS` 미정의. |
| `pages/IngredientDictionary.tsx` | `INGREDIENT_DICTIONARY`, `Helmet`, `X`, `createPortal` 미정의/미import. |
| `pages/Membership.tsx` | 스토어에 없는 `membershipTier` 참조. |
| `components/ScannerScreen.tsx` | 스토어에 없는 `scannerMode`/`setScannerMode` 참조. |
| `components/FeedingGuideCalculator.tsx` | 미존재 타입 `ActivityLevel`/`BodyCondition`, 프로필에 없는 `weight`/`activityLevel`/`isNeutered`/`bodyCondition`. |
| `components/AnalysisSummaryHeader.tsx` | `score`의 미존재 export `CompatibilityGrade`. |
| `components/IngredientList.tsx`, `components/PetProfileForm.tsx`, `pages/PetProfile.tsx`, `pages/KnowledgeIngredients.tsx`, `pages/KnowledgeNutrients.tsx` | `@ts-nocheck` 하 기타 오류. |

### 4.d 추가 삭제한 dead 고아 (lint 잔존 유발 3개)
lint를 완전히 없애기 위해, 어디서도 쓰이지 않던 다음 고아 파일도 삭제:
`pages/admin/AdminSponsors.tsx`, `components/AnimatedNumber.tsx`, `utils/useCountUp.ts`
(뒤 두 개는 서로만 참조하던 죽은 애니메이션 유틸).

### 4.e 🔴 [중요] 라우트 누락으로 끊겨 있던 페이지 5개 → 연결(실제 네비게이션 버그 수정)
"미사용 고아"로 분류했던 페이지 상당수가 실제로는 **완성돼 있으나 라우트만 등록 안 된** 페이지였고,
라이브 UI가 이미 그 경로로 링크하고 있어 **클릭 시 깨져(빈 화면/404)** 있었습니다. 해당 링크가 존재하므로
삭제가 아니라 **라우팅 연결**로 처리했습니다.

| 페이지 | 연결한 라우트 | 이미 존재하던(깨져 있던) 링크 |
|--------|---------------|-------------------------------|
| `Ranking` | `/ranking` | 하단 내비 **"랭킹" 탭**, `Home` CTA 3곳, `Layout` 타이틀맵 |
| `Login` | `/login` | `Profile`·`Detail`(2)·`Cart` 로그인 버튼, `Layout` 푸터 숨김 대상 |
| `Brand` | `/brand/:brandName` | `Home`·`Detail`의 브랜드 링크 |
| `ViralEvent` | `/event/viral` | `Analyzer` 공유 URL·버튼 |
| `Test`(성향 퀴즈) | `/event/personality-quiz` | `Home` 퀴즈 진입, `ViralEvent` 공유 대상 |

→ 연결 후 라이브 네비게이션 경로 전수 대조 결과 **끊긴 링크 0건**. 타입체크·테스트(52)·빌드·lint 모두 green.

### 4.f 남겨둔 "미사용" 컴포넌트/유틸 (삭제하지 않음)
페이지와 달리 라우트로 연결되지 않고, 어디에도 import되지 않은 파일들. lint 오류 없음, 번들에도 미포함
(tree-shaken). "만들어 두고 아직 안 붙인" WIP일 수 있어 임의 삭제하지 않고 유지:
`components/{DesktopBanner,AnalysisBadges,ProductImageSlider,FishboneDiagram}.tsx`,
`analysis/{scoringPipeline,adapter}.ts`, `utils/{fishboneData,petFoodScorer}.ts`,
`types/analysisSchemaV2.ts`, `lib/canonicalIngredientTypes.ts`.
필요 시 별도 요청으로 삭제 가능.
(`theme/tokens.ts`는 `Button`/`ThemeProvider`가 사용 → 유지 확정.)

---

## 5. 주변 서브프로젝트 — 웹앱 lint 범위에서 제외 처리

루트 `eslint.config.js`는 Vite 웹앱(`src/`)용이므로, 별도 툴체인/런타임을 쓰는 아래 디렉터리를
`globalIgnores`로 제외했습니다(브라우저 globals로 잘못 린트되던 오류 44건 제거). 각자 자체 lint가 필요하면
개별 설정 권장.

| 위치 | 성격 |
|------|------|
| `landing/` | 자체 `.eslintrc.json`을 가진 별도 Next.js 앱 |
| `react-native-theme/` | React Native 소스(브라우저 globals와 무관) |
| `scripts/` | Node 데이터 임포트 스크립트 |
| `supabase/functions/` | Deno 엣지 함수 |
| `android/`, `ios/` | 네이티브 빌드 산출물 |

---

## 6. 라이브 코드 lint 예외 처리

- `components/BottomSheet.tsx:16` `react-hooks/set-state-in-effect` —
  바텀시트 enter/exit 트랜지션을 위한 의도된 `setIsRendered(true)` 패턴(실제 버그 아님).
  해당 라인에 사유를 명시한 `eslint-disable-next-line` 주석을 달아 처리. → **lint 0**.

---

## 7. 권장 후속 조치
1. ✅ (완료) 깨진 dead 파일 18개 삭제, 필수 3개(`ErrorBoundary`/`NotFound`/`AuthCallback`) 연결.
2. ✅ (완료) 라우트 누락으로 끊긴 페이지 5개(`Ranking`/`Login`/`Brand`/`ViralEvent`/`Test`) 연결 → 네비게이션 복구.
3. ✅ (완료) 루트 eslint를 웹앱 범위로 분리 → `npm run lint` **0 errors**.
4. 남은 "미사용" 컴포넌트/유틸(4.f) 정리 여부 결정 — WIP일 수 있어 유지 중.
5. ✅ (완료) `/auth`(Auth)·`/login`(Login) 인증 페이지 이원화 → `Login` 정본으로 통합(§9).
6. `Home`의 `/event/personality-quiz` 외에 추가 미구현 경로 없음(전수 대조 완료).
7. ✅ (완료) 법적 페이지 이중 서빙 제거 → React 정본으로 일원화(§8).
8. 번들 크기: 메인 청크 655KB(gzip 187KB) — 라우트 단위 `React.lazy` 코드 스플리팅 권장.
9. 서브프로젝트(`landing/`, `react-native-theme/`, `supabase/functions/`)는 각자 자체 lint 설정 권장.
10. OAuth 실제 구현: `Auth.tsx`의 `signInWithKakao`는 현재 no-op 스텁 → 실제 `supabase.auth.signInWithOAuth` 연결 필요.

---

## 8. 런타임 검증(헤드리스 브라우저 스모크) + 법적 페이지 이중화 수정

### 8.a 전 라우트 스모크 테스트
프로덕션 빌드를 `vite preview`로 서빙하고 헤드리스 Chromium(Playwright)으로 전 라우트를 로드해
콘솔/페이지 런타임 에러와 렌더 여부를 확인했습니다.
- **새로 연결한 5개 페이지(`/ranking`,`/login`,`/brand/:brandName`,`/event/viral`,`/event/personality-quiz`)
  전부 런타임 에러 0으로 정상 렌더** — 라우팅 수정이 실제 브라우저에서 동작함을 확인.
- `/product/:id`(미존재 id), 404 catch-all, `/admin` 인증 게이트도 정상.
- (참고) 이 샌드박스는 Supabase 호스트가 불통이라 SPA 부팅에 수 초가 걸리며, `/cart`는 비로그인 시
  `/login`으로 리다이렉트되는 정상 동작임.

### 8.b 🔴 [버그] 법적 페이지가 접근 경로에 따라 다른 문서를 노출 → 수정
- **증상**: `/terms`·`/privacy`·`/refund`에 대해 **React 컴포넌트**(`src/pages/*`)와
  **정적 HTML**(`public/*.html`)이 둘 다 존재. Netlify/preview는 정적 파일을 SPA fallback보다 먼저
  서빙하므로:
  - Footer의 `<Link to="/terms">`(클라이언트 라우팅) → **React 최신본**(약관 13개 조항)
  - `/terms` 직접 접속·새로고침·검색 크롤러 → **정적 구버전 HTML**(8개 조항)
  → 같은 URL이 **서로 다른 법적 문서**를 노출(내용 실제 상이).
- **수정**: 사용자 결정에 따라 정적 `public/{terms,privacy,refund}.html` 삭제 →
  모든 접근 경로가 React 정본으로 통일. 브라우저로 `/terms`가 React 13개-조항 본문(시행일 2026-04-12)을
  렌더함을 재확인.
- (`public/fishbone-*.html`은 법적 문서가 아니며 이번 범위 밖이라 유지.)

---

## 9. 인증 페이지 통합 (Auth → Login 일원화)

- **문제**: 인증 페이지가 둘 존재 — `/auth`(`Auth.tsx`, 간단형)와 `/login`(`Login.tsx`, 완성형).
  진입점마다 달라 UX 불일치(EntryGate·Profile은 `/auth`, Detail·Cart는 `/login`). 게다가 `Auth.tsx`의
  "카카오로 계속하기" 버튼은 `signInWithKakao` no-op 스텁 + `finally` 부재로 **클릭 시 "카카오 로그인 중..."
  에서 영구 멈추는 깨진 버튼**이었음.
- **수정(사용자 결정)**: 더 완성도 높은 `Login`을 정본으로 통합.
  - `Auth.tsx` 삭제.
  - `/auth` 라우트는 `<Navigate to="/login" replace/>`로 리다이렉트(구 링크·북마크 호환).
  - `/auth`로 이동하던 코드 3곳(`EntryGate`, `Profile`, `AuthCallback`) → `/login`으로 변경.
- **검증**: 브라우저에서 `/auth` 접속 시 `/login`으로 리다이렉트되고 로그인 화면이 렌더됨을 확인(에러 0).
- (참고) 깨져 있던 카카오 스텁 버튼은 통합 과정에서 제거됨. 실제 카카오 로그인이 필요하면 §7-10의
  OAuth 구현으로 `Login`에 정상 소셜 버튼을 추가하는 것을 권장. `lib/supabase`의
  `signUpWithEmail`/`signInWithEmail`은 이제 미사용이나(Login은 `supabase.auth` 직접 호출) export로 남겨둠.
