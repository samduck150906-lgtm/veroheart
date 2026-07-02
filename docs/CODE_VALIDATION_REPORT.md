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
| ESLint 총 오류 | 117 errors | **47 errors** (모두 별도 서브프로젝트 or dead orphan) |
| ESLint (src/ 라이브 코드) | 다수 | **0** (BottomSheet 애니메이션 패턴 1건 의도적 잔존) |
| `@ts-nocheck` (src/) | 15개 파일 | **0** |

**핵심 결과**
- 라이브(실제 배포되는) 앱에서 **실제 런타임 크래시 버그 1건**을 찾아 수정했습니다. (`Detail` 페이지의 조건부 Hook 호출)
- 라이브 코드의 린트 오류를 전부 정리했습니다(안전한 수정만).
- **가장 큰 구조적 문제 발견**: `src/` 파일의 상당수가 라우팅/임포트되지 않는 **dead code(고아 파일)** 이며, 그 중 15개는 `// @ts-nocheck` 로 **수십 개의 실제 컴파일 에러를 숨기고** 있었습니다. 이 파일들은 배포 번들에 포함되지 않기 때문에 지금까지 빌드가 통과했습니다.

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

### 4.d 남겨둔 "정상이지만 미사용" 고아 파일 (삭제하지 않음)
문법·타입은 정상이나 아직 어디에도 연결되지 않은 파일들입니다. 깨진 파일이 아니므로 이번 범위(깨진 파일만
삭제)에서 제외했습니다. 필요 시 별도 요청으로 정리 가능:
`pages/{Test,Login,Ranking,Brand,ViralEvent}.tsx`, `pages/admin/AdminSponsors.tsx`,
`components/{DesktopBanner,AnalysisBadges,AnimatedNumber,ProductImageSlider}.tsx`,
`analysis/{scoringPipeline,adapter}.ts`, `utils/{fishboneData,petFoodScorer,useCountUp}.ts`,
`types/analysisSchemaV2.ts`, `theme/tokens.ts`, `lib/canonicalIngredientTypes.ts` 등.
(이 중 `AdminSponsors.tsx`, `utils/useCountUp.ts`는 dead지만 lint `set-state-in-effect` 1건씩 잔존.)

---

## 5. 주변 서브프로젝트 (웹 앱 빌드와 별개)

이들은 `tsc -b`(=`src`만) 대상이 아니어서 배포 앱에 영향은 없으나 lint 오류가 있습니다.

| 위치 | lint errors | 성격 |
|------|-------------|------|
| `react-native-theme/` | 20 | 별도 React Native 테마 소스(미사용 import 다수) |
| `landing/` | 6 | 별도 Next.js 랜딩(triple-slash, only-export-components 등) |
| `scripts/` | 5 | 데이터 임포트 스크립트(`any`, 미사용 var) |
| `supabase/functions/` | 5 | Deno 엣지 함수(`any`, `prefer-const`) |

---

## 6. 남은 라이브 코드 lint (의도적 잔존)

- `components/BottomSheet.tsx:16` `react-hooks/set-state-in-effect` —
  바텀시트 "열기 애니메이션"을 위한 `setIsRendered(true)` 패턴. 규칙이 경고하지만 **실제 버그 아님**이며,
  수정 시 등장 애니메이션이 깨질 위험이 있어 그대로 두었습니다.

---

## 7. 권장 후속 조치
1. ✅ (완료) 깨진 dead 파일 15개 삭제, 필수 3개(`ErrorBoundary`/`NotFound`/`AuthCallback`) 연결.
2. 남은 "정상 미사용" 고아 파일(4.d) 정리 여부 결정 — 원하면 별도 요청 시 삭제.
3. 번들 크기: 메인 청크 655KB(gzip 187KB) — 라우트 단위 `React.lazy` 코드 스플리팅 권장.
4. `eslint.config.js`에 `landing/`·`react-native-theme/` `ignores` 추가 검토(서브프로젝트를 웹앱 lint에서 분리).
5. `@ts-nocheck` 재발 방지: 살릴 파일은 타입을 실제로 고치고, 아니면 삭제.
6. OAuth 실제 구현: `Auth.tsx`의 `signInWithKakao`는 현재 no-op 스텁 → 실제 `supabase.auth.signInWithOAuth` 연결 필요.
