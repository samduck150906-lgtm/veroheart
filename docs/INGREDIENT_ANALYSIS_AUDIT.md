# 베로로(Veroheart) 성분 분석·판정 시스템 감사 보고서

> 작성일: 2026-06-23
> 범위: 성분 데이터 구조 / 판정·점수 로직 / 성분 표기 정규화 / 제품-판정 독립성
> 방법: 실제 소스 코드 및 데이터 파일 확인 (추정 배제). 본 감사 과정에서 코드는 수정하지 않음.

---

## 핵심 결론 먼저

이 프로젝트에는 **단일한 분석 시스템이 없다.** 서로 동기화되지 않은 **4개의 병렬 분석 서브시스템**이 공존하며, 같은 화면(특히 `src/pages/Detail.tsx`)에서 서로 다른 점수·판정이 동시에 계산된다.

| # | 서브시스템 | 위치 | 실제 사용처 | 방식 |
|---|---|---|---|---|
| ① | **중앙 성분 DB** | Supabase `ingredients` 테이블 (`real_ingredients_data.sql`) | 카탈로그 제품 성분 | 성분 row에 risk_level 저장 |
| ② | **TS 규칙 엔진** | `src/analysis/` (사전+규칙+엔진) | 리포트 텍스트·품질 패널·스캐너 | 정규화+별칭+선언적 규칙 |
| ③ | **카탈로그 점수기** | `src/utils/score.ts` | **화면 헤드라인 적합도 %** (Home/Search/Ranking/Detail/카드) | 저장된 riskLevel + 부분문자열 |
| ④ | **엣지 함수** | `supabase/functions/analyze-ingredients/index.ts` | 텍스트 붙여넣기 스캐너 | 자체 하드코딩 사전 + 부분문자열 |

추가로 **죽은 코드**:
- `src/utils/compatibilityScorer.ts` (7버킷 v2 점수기, 어디서도 import 안 됨)
- `src/utils/petFoodScorer.ts` (`PetFoodScorer` 클래스, 테스트에서만 사용)

이 4개는 **같은 성분에 대해 별칭·정규화·위험도·미등록 처리 방식이 모두 다르다.**

---

## 1. 현재 성분 관련 데이터 구조

### (a) 중앙 성분 DB — 존재함 (Supabase)

- 테이블: `ingredients` (`real_ingredients_data.sql:2`, 약 70종 시드)
- 필드: `name_ko`(UNIQUE), `name_en`, `risk_level`('safe'|'caution'|'danger'), `description`, `caution_conditions`(배열), `allergy_triggers`(배열)
- 제품과의 관계: `product_ingredients` 조인 테이블로 다대다 연결 (`src/lib/supabaseRowTypes.ts:99`)
- **별칭(alias) 컬럼 없음**, **종(개/고양이)별 판정 컬럼 없음**, **분류(category) 없음**

```sql
('닭고기', 'Chicken', 'safe', '대중적인 가금류 단백질원입니다.', '{}', '{"chicken"}'),
-- '닭 지방' / '건조 닭고기' → 시드에 별도 행 없음
```

위험도는 **성분 단위로 중앙 저장**되며, 제품마다 직접 저장하지 않고 공통 DB row를 조회한다(`mapIngredientFromJoin`, `src/lib/supabaseRowTypes.ts:65`). 이 점은 양호하다.

### (b) TS 성분 사전 — 별도로 또 존재함 (코드 내 하드코딩)

- 파일: `src/analysis/ingredientDictionary.ts` (약 50종, TypeScript 배열 리터럴)
- 필드(타입 `DictionaryIngredient`, `src/analysis/types.ts:51`): `id`, `canonicalKo/En`, `aliases[]`, `category`, `animalSource`, `allergenTags[]`, `nutritionTags[]`, `riskTags[]`, `defaultSeverity`, `explanation`

```ts
{ id:'chicken', canonicalKo:'닭고기', aliases:['닭','계육','치킨','닭가슴살','생닭고기',...],
  category:'animal_protein', allergenTags:['chicken','poultry'], defaultSeverity:'safe' }
{ id:'chicken_fat', canonicalKo:'닭지방', aliases:['닭 지방','chicken fat'],
  category:'animal_fat', allergenTags:['chicken','poultry'] }
```

(a)의 DB와 (b)의 코드 사전은 **서로 다른 카탈로그이며 동기화되지 않는다.** DB에는 별칭이 없고, 코드 사전에는 70종 중 일부만 있다.

### (c) 엣지 함수 내부 사전 — 또 별도 (하드코딩)

- `supabase/functions/analyze-ingredients/index.ts:41~88`: `TOXIC_INGREDIENTS`, `CAUTION_PRESERVATIVES`, `CAUTION_GRAINS`, `BENEFICIAL_INGREDIENTS`를 자체 배열로 또 정의.

**요약:** 독립된 성분 DB는 **있으나 3중으로 중복**되어 있고, 별칭·분류·종별 판정은 (b) 코드 사전에만 존재한다.

---

## 2. 판정 기준 및 점수 계산 구조

### 화면 헤드라인 "적합도 %" — `src/utils/score.ts`

`Detail.tsx:93`, `Home/Search/Ranking/ProductCard` 등 거의 모든 카탈로그 화면이 이 함수를 사용한다.

- `getRecommendationBreakdown()` (`score.ts:86`): 7개 버킷 가중합
  - safety(35) − dangerCount×10 − cautionCount×4 − allergyHits×18 … (`score.ts:93`)
  - concern(25), socialProof(20, 리뷰/평점), value(10, 가격), petFit(10, 종/연령), verification(10, 검수상태), nutrition(10, AAFCO DMB)
- **위험도 판정 근거**: `ingredient.riskLevel` — 즉 **중앙 DB 성분 row에 저장된 값**을 그대로 카운트. 규칙 엔진을 쓰지 않음.
- **안전 하드캡**: 알러지 적중 시 ≤55점, danger 성분 시 ≤69점 (`score.ts:5,200`)
- **개/고양이 분리**: `minProtein/minFat`을 종별로 분기 (`score.ts:151`) — 있음
- 판정 방식: **전부 코드 안의 if문·상수 가중치(하드코딩)**. 별도 규칙 DB 없음.

### 리포트 텍스트·하이라이트 — TS 규칙 엔진

`Detail.tsx:122` `generateAnalysisReport` → `src/utils/analysis.ts:47` → `analyzeProduct`(`src/analysis/ruleEngine.ts:188`)

- 판정 = **선언적 규칙 배열** `ALL_RULES`(`src/analysis/rules.ts`), 각 규칙에 `severity/scoreDelta/evidenceLevel/ruleId`
- 알러지: `allergenTags`와 `pet.allergies` 태그 교집합 → −30점 (`ruleEngine.ts:234`)
- 주석에 "추후 DB(analysis_rules) 시드로 옮긴다"고 명시(`rules.ts:5`) → **현재는 코드 배열**

### 품질/ETF 패널 — `Detail.tsx:34` `runScoringPipeline`(`src/analysis/scoringPipeline.ts`)

- 또 다른 점수 체계(`ingredientScore`, `rawMaterialGrade`, `etfGrade`)

### 결론 카드 — `Detail.tsx:123` `buildProductConclusion`(`src/utils/productConclusion.ts`)

- 또 다른 알러지 부분문자열 검사로 결론 톤 결정

### 데이터 흐름 (카탈로그 제품 기준)

```
Supabase products + product_ingredients + ingredients(중앙 risk_level)
  → mapProductFromSupabaseRow (riskLevel 매핑)
  → Detail.tsx 에서 동시에 4개 호출:
     ├ score.ts (헤드라인 %, 하드캡)             ← 저장된 riskLevel + 부분문자열 알러지
     ├ generateAnalysisReport (리포트/하이라이트)  ← TS 규칙 엔진 + 별칭/정규화
     ├ runScoringPipeline (품질·ETF 패널)         ← TS 사전 기반 품질 평가
     └ buildProductConclusion (결론 카드)         ← 부분문자열 알러지
```

→ **한 화면에서 서로 다른 판정 로직 4개가 병렬로 도는 것**이 핵심 문제다.

### 기타 판정 관련 사항

- **생성형 자유 판정 여부**: 없음. 모든 위험/안전 판정과 점수는 규칙 엔진(`ruleEngine.ts`)이 계산하며, 설명 문구도 이 출력에서 규칙적으로 파생된다. AI/LLM은 사용하지 않는다.
- **정보 없는 성분 처리(불일치)**:
  - 규칙 엔진: 미매칭 → `unknowns`로 분류, 투명도 −5점, 스캐너 경로에서 검수 큐에 기록 → **판단 보류**
  - `score.ts`: 미등록은 위험도 없으므로 사실상 **안전(safeCount에 기여)**
  - 엣지 함수 텍스트 모드: 미매칭을 명시적으로 `risk:"safe"` 처리(`analyze-ingredients/index.ts:434`) → **안전**

---

## 3. 같은 성분의 다른 표기 처리

**정규화 함수 존재 — 단 규칙 엔진 경로에만 적용된다.** `src/analysis/normalize.ts:14`

- 소문자화, NFKC, 괄호/대괄호 제거, "가루/파우더"→"분말", 일부 기호·쉼표 제거, 공백 제거.
- 별칭 인덱스: `ingredientDictionary.ts:681` `aliasIndex`(정규화된 alias→canonical 맵). 매칭은 ① 완전일치 → ② 부분포함(가장 긴 키 우선) (`findIngredientByName`, `:699`).

### "닭" 표기 추적 결과 (규칙 엔진 기준)

| 입력 표기 | 정규화 결과 | 규칙 엔진 매칭 | 비고 |
|---|---|---|---|
| 닭 | 닭 | chicken(닭고기) | alias 직접 |
| 닭고기 | 닭고기 | chicken | canonical |
| 계육 | 계육 | chicken | alias |
| 신선 닭고기 | 신선닭고기 | chicken | 부분포함("닭고기") |
| 건조 닭고기 | 건조닭고기 | chicken | 부분포함 |
| 탈수 닭고기 | 탈수닭고기 | chicken | 부분포함 |
| 닭고기 분말 | 닭고기분말 | **chicken_meal(계육분)** | 별도 항목·동일 알러지태그 |
| 닭 육분 | 닭육분 | **animal_byproduct(부산물, watch)** | ⚠ '육분'이 generic으로 매칭 → 닭 알러지태그 소실 |
| 닭 단백질 | 닭단백질 | **미매칭(unknown)** | ⚠ |
| 닭 육수 | 닭육수 | **미매칭(unknown)** | ⚠ |
| 닭 지방 | 닭지방 | **chicken_fat(닭지방)** | ✅ 지방 구분 성공 |

- **단백질 vs 지방 구분**: 규칙 엔진은 `chicken`/`chicken_fat`를 별도 항목으로 구분한다(✅). 단 둘 다 allergenTags가 `chicken,poultry`라 알러지 판정은 동일.
- **취약점(규칙 엔진)**: "닭 육분/닭 단백질/닭 육수"는 닭으로 정규화되지 못하고 generic 또는 unknown 처리 → **닭 알러지 누락 위험**.

### 그러나 화면 헤드라인(`score.ts`)·엣지 함수는 정규화·별칭을 쓰지 않는다

단순 `.includes()` 부분문자열만 사용한다.

- `score.ts:71` `nameKo.includes(allergy)` — 알러지='닭'이면 닭고기·닭지방·닭육수 **모두 적중(과탐 방향)**.
- 단어 겹침 오탐 위험:
  - **포도 vs 포도씨유**: 알러지='포도'면 `'포도씨유'.includes('포도')` = **true → 오탐** (`score.ts`·`productConclusion.ts` 부분문자열 경로). 규칙 엔진은 grape/포도씨유가 별도라 상대적으로 안전.
  - **우유 vs 유산균**: `'유산균'.includes('우유')` = false → 이 조합은 오탐 안 남.
- **띄어쓰기/괄호/영문/대소문자/쉼표**: 규칙 엔진(normalize)만 정상 처리. `score.ts`·엣지·DB는 `trim().toLowerCase()` 수준이라 괄호·내부 공백·쉼표 변형에 취약.
- **미인식 성분 기록**: 테이블 `unmatched_ingredients` + RPC `log_unmatched_ingredient` 존재(`supabase/migrations/20260611150000_unmatched_ingredients_queue.sql`). 단 호출은 **스캐너 경로(`src/components/Analyzer.tsx:296`)에서만** 발생하고, 카탈로그 분석 경로에서는 기록되지 않음.

---

## 4. 제품 DB와 판정 시스템의 독립성

이상적 구조 `제품 입력 → 원재료 추출 → 표준 성분 정규화 → 공통 판정 → 결과`가 **부분적으로만** 구현돼 있다.

- 제품에 **점수·판정을 직접 저장하지 않음** → 런타임 계산(✅ 분리됨). `analysis_reports`는 캐시/기록용.
- 그러나 **카탈로그 헤드라인 점수의 위험 근거가 "성분 row의 저장된 risk_level"**이다. "표준 성분으로 정규화"하는 공통 단계가 카탈로그 경로엔 없다(부분문자열 알러지뿐).
- 제품-성분 연결은 `product_ingredients`로 분리(✅), 하지만 어느 ingredient row와 연결할지는 **수동(관리자 `src/pages/admin/AdminIngredients.tsx`/`AdminProducts.tsx`)**.
- **판정 규칙이 둘로 갈림**: 정규화·별칭 기반 공통 규칙(규칙 엔진)은 리포트 텍스트에만, 실제 화면 점수는 다른 하드코딩 로직.

---

## 5. 새 제품 추가 시뮬레이션

**제품:** 테스트 닭고기 사료 / 강아지 / 원재료: 건조 닭고기·현미·닭 지방·비트펄프·연어오일 / 프로필: 닭 알러지

이 제품의 결과는 **어느 경로로 보느냐에 따라 달라진다.**

### 경로 ③ 카탈로그 헤드라인(`score.ts`) — 사용자가 실제로 보는 % 점수

1. **추가 작업**: `products` insert + `nutritional_profiles` insert + `product_ingredients`로 성분 5종을 `ingredients` 행에 연결.
   - 중앙 DB에 '닭고기'·'연어오일'·'현미'는 존재(`real_ingredients_data.sql`). **'건조 닭고기'·'닭 지방'·'비트펄프'는 별도 행 없음** → 관리자가 기존 '닭고기' 행에 연결하거나 **새 ingredient 행을 데이터로 추가**(코드 수정 아님).
2. **인식 표준 성분**: 연결한 ingredient 행 그대로(닭고기/현미/연어오일 등).
3. **알러지 충돌**: `'건조 닭고기'.includes('닭')`·`'닭 지방'.includes('닭')` = true → **충돌 감지됨**. 단 '닭' 부분문자열이라 과탐 방향.
4. **최종 판정/점수**: 알러지 적중 → 하드캡 55점 → 등급 **C 이하**. (danger 성분 없음)
5. **판정 이유**: `reasons`에 "회피 성분 닭 포함" 등 문자열.
6. **코드 수정 필요?** → **불필요**(성분/제품 모두 데이터). 단 '비트펄프'를 새로 인식시키려면 ingredient 행 추가(데이터).

### 경로 ② 리포트(규칙 엔진, 같은 Detail 화면에 함께 표시)

- 정규화: 건조 닭고기→**chicken**, 현미→brown_rice, 닭 지방→**chicken_fat**, 비트펄프→**unknown(미매칭)**, 연어오일→salmon_oil.
- 알러지 '닭' → `toAllergenTags('닭')` → chicken → `['chicken','poultry']`. chicken·chicken_fat 모두 태그 겹침 → **개인화 알러지 경고 2건, 각 −30점**.
- **인식 못 하는 성분**: 비트펄프 → `unknowns`, 투명도 감점. (스캐너 경로가 아니므로 검수 큐 기록은 안 됨)
- 가점: 제1원료 동물성 단백질 +10, 연어오일 오메가-3 +3, 종 일치 +5.
- **코드 수정 필요?** → 제품 추가 자체는 불필요. '비트펄프'를 인식시키려면 `ingredientDictionary.ts` 배열에 항목 추가 = **소스 파일 편집**(데이터 형태지만 코드 파일).

### 두 경로의 불일치 (핵심)

- '닭 지방'을 경로 ②는 **chicken_fat(지방)**으로 정확히 분류하지만, 경로 ③은 그냥 **'닭' 부분문자열 적중**으로 처리.
- 비트펄프를 경로 ②는 unknown→투명도 감점, 경로 ③/엣지는 사실상 **안전** 처리.
- **두 사전(DB 행 ↔ TS 배열)이 동기화되지 않아**, "성분 추가"가 한쪽에만 반영될 수 있다.

---

## 6. 최종 진단

| 점검 항목 | 현재 상태 | 근거 파일/함수 | 문제점 | 개선 필요 |
|---|---|---|---|---|
| 독립된 성분 DB | **부분적** | `ingredients` 테이블(`real_ingredients_data.sql`) + `ingredientDictionary.ts` + 엣지 자체사전 | 3중 중복·비동기, DB엔 별칭/분류/종별 없음 | **높음** |
| 독립된 판정 DB | **없음** | `rules.ts`(코드 배열), `score.ts`(if/상수), 엣지 하드코딩 | 규칙이 코드에 분산, DB화 미완(주석만 존재) | **높음** |
| 성분 별칭 정규화 | **부분적** | `normalize.ts`+`aliasIndex`(엔진만) / `score.ts`·엣지는 `.includes()` | 화면 점수 경로엔 정규화 없음, 일부 변형 누락 | **높음** |
| 단백질·지방 파생 구분 | **부분적** | 엔진 `chicken` vs `chicken_fat` | score.ts는 '닭' 부분문자열로 동일 취급 | 중간 |
| 개/고양이 기준 분리 | **있음** | `score.ts:151`, `ruleEngine.ts:67`, `rules.ts` species | (양호) | 낮음 |
| 알러지 프로필 연동 | **있음(부분)** | `score.ts:66` 하드캡, `ruleEngine.ts:234` 태그, 엣지 productId 모드 | 경로별 방식 상이(부분문자열 과탐 vs 태그) | 중간 |
| 미등록 성분 처리 | **기타(불일치)** | 엔진=판단보류/검수큐, score.ts=사실상 안전, 엣지=명시적 safe | 경로마다 다름 | **높음** |
| 제품과 판정 로직 분리 | **부분적** | 런타임 계산(점수 미저장) / 단 위험근거는 성분 row risk_level | 정규화 공통단계 부재, 규칙 이원화 | 중간 |
| 새 제품 무코드 추가 | **부분적** | DB 경로=데이터만 가능 / 엔진 인식은 `ingredientDictionary.ts` 편집 | 두 사전 비동기, 새 성분 인식이 코드 파일 의존 | 중간 |
| 판정 출처 추적 | **부분적** | 엔진 `evidenceLevel`+`ruleId`(`rules.ts`) / score.ts·엣지는 문자열 reason | 통합 추적 없음, 화면 점수는 근거 추적 약함 | 중간 |

## 구조 평가: B

> **B — 일부 확장 가능하지만 코드 수정이나 수동 작업이 필요한 구조.**

근거 요약:

- 제품은 점수를 저장하지 않고 런타임 계산하며, Supabase에 중앙 성분 테이블과 제품-성분 조인이 있어 **새 제품은 대체로 데이터 추가만으로 등록 가능**하다(C는 아님).
- 그러나 ⑴ **정규화·별칭·판정이 4개 서브시스템에 분산·중복**되고 서로 동기화되지 않으며, ⑵ 사용자가 보는 **헤드라인 점수 경로(`score.ts`)가 별칭/정규화 없이 부분문자열 매칭**이라 포도씨유 같은 오탐과 '닭 지방' 오분류가 발생하고, ⑶ **미등록 성분 처리가 경로마다 다르며**, ⑷ 새 성분을 인식시키려면 일부 경로에서 코드 파일(`ingredientDictionary.ts`) 편집이 필요하기 때문에 A에 도달하지 못한다.

가장 시급한 개선은 **4개 서브시스템을 하나의 정규화+별칭+규칙(가능하면 DB 기반) 파이프라인으로 통합**하고, 화면 헤드라인 점수도 그 공통 파이프라인을 쓰도록 일원화하는 것이다.

---

## 확인 불가 항목 (추정하지 않음)

- 운영 Supabase에 실제로 적재된 `ingredients`/`product_ingredients`의 **현재 행 수·내용**: 리포지토리의 시드 SQL만 확인했고 실 DB는 조회하지 않음.
- `analyze-ingredients`·`personalized-score` 엣지 함수의 **실제 배포/호출 빈도**: 코드상 `Analyzer.tsx`(스캐너)에서만 호출 확인, 운영 트래픽은 확인 불가.

---

## 부록: 통합 설계 방향 (요약)

상세 설계는 별도 논의. 핵심 방향만 기록한다.

1. **성분 마스터 확장**: `ingredients`에 `category / nutrition_tags / species_risk(jsonb) / evidence_level` 컬럼 추가.
2. **별칭 테이블 신설**: `ingredient_aliases(ingredient_id, alias_norm UNIQUE, raw_alias)` — 코드 사전의 별칭을 데이터로 이관.
3. **규칙 테이블 신설**: `analysis_rules` — `rules.ts`의 `AnalysisRule` 배열을 DB 시드로 이관(타입은 `src/analysis/types.ts:138` 재사용).
4. **단일 엔진**: `src/analysis/`를 정식 엔진으로 승격, `score.ts`·엣지·결론 카드가 모두 이 엔진을 호출. 알러지 판정은 부분문자열 → `allergy_triggers` 태그 매칭으로 교체(포도씨유 오탐 제거).
5. **미등록 처리 통일**: 전 경로 "판단 보류" + `log_unmatched_ingredient` 호출, 관리자 검수 큐로 사전 자동 성장.
6. **죽은 코드 정리**: `compatibilityScorer.ts`, `petFoodScorer.ts` 제거.

이행 후 기대 등급: **A 도달 가능**.
