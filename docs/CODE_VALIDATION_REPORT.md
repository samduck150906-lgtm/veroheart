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
| ESLint 총 오류 | 117 errors | **89 errors** |
| ESLint (src/ 라이브 코드) | 다수 | **0** (BottomSheet 애니메이션 패턴 1건 의도적 잔존) |

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

## 4. 🔴 미배포 Dead Code (사용자 결정 필요)

아래 파일들은 **어디서도 라우팅/임포트되지 않아 배포 번들에 포함되지 않습니다.** 그럼에도 `// @ts-nocheck`가
붙어 있어 다음과 같은 **실제 컴파일 에러가 숨겨져** 있었습니다. (즉, 지금 그대로 라우팅에 연결하면 즉시 깨집니다.)

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

그 외 **라우팅되지 않는 고아 파일**(문법은 정상이나 미사용): `pages/Test.tsx`, `pages/Login.tsx`,
`pages/Ranking.tsx`, `pages/Brand.tsx`, `pages/NotFound.tsx`, `pages/AuthCallback.tsx`, `pages/ViralEvent.tsx`,
`pages/admin/AdminSponsors.tsx`, `components/{ErrorBoundary,DesktopBanner,AnalysisBadges,AnimatedNumber,ProductImageSlider}.tsx`,
`analysis/{scoringPipeline,adapter}.ts`, `utils/{fishboneData,petFoodScorer,useCountUp}.ts`,
`types/analysisSchemaV2.ts`, `theme/tokens.ts`, `lib/canonicalIngredientTypes.ts` 등.

> ⚠️ 주목: `NotFound`, `AuthCallback`, `ErrorBoundary` 같이 **원래 앱에 연결되어 있어야 자연스러운** 파일도
> 라우팅에서 빠져 있습니다. (예: 404 라우트, OAuth 콜백 라우트, 에러 경계가 App에 미연결)

### 권장 처리 방향 (택1)
1. **삭제** — 지금 배포에 무의미하고 대부분 깨져 있는 파일 정리(가장 깔끔, 되돌리기 쉬움: git).
2. **복구/연결** — 살릴 파일을 선별해 `@ts-nocheck` 제거 후 타입 에러를 실제로 고치고 라우팅에 연결(기능 작업).
3. **유지** — 현 상태 그대로 두고 보고서로만 남김.

이 결정은 제품 의도가 필요해 임의로 진행하지 않았습니다. 특히 `NotFound`/`AuthCallback`/`ErrorBoundary`는
**연결을 권장**합니다.

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
1. **Dead code 처리 방향 결정**(4장) — 특히 `NotFound`/`AuthCallback`/`ErrorBoundary` 연결.
2. 번들 크기: 메인 청크 655KB(gzip 187KB) — 라우트 단위 `React.lazy` 코드 스플리팅 권장.
3. `eslint.config.js`에 `landing/`·`react-native-theme/` `ignores` 추가를 검토(서브프로젝트를 웹앱 lint에서 분리).
4. `@ts-nocheck` 재발 방지: 살릴 파일은 타입을 실제로 고치고, 아니면 삭제.
